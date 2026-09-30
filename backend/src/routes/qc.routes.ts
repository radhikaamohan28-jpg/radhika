import { Router } from 'express';
import { 
  QualityCheck, 
  Sample, 
  SequencingRequest, 
  User, 
  getNextSequence 
} from '../models/index.js';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth.js';
import { recordWorkflowHistory } from '../utils/history.js';

const router = Router();
router.use(authenticateToken);

// GET /api/qc - List QC records
router.get('/', async (req, res) => {
  try {
    const { result, search } = req.query;
    const filter: any = {};

    if (result) {
      filter.qc_result = result;
    }

    if (search) {
      const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { qc_code: { $regex: escaped, $options: 'i' } },
        { failure_reason: { $regex: escaped, $options: 'i' } },
        { qc_comments: { $regex: escaped, $options: 'i' } },
      ];
    }

    const qcList = await QualityCheck.find(filter)
      .sort({ qc_date: -1, id: -1 })
      .lean();

    const enriched = await Promise.all(
      qcList.map(async (q) => {
        const sample = await Sample.findOne({ id: q.sample_id }).lean();
        let request: any = null;
        if (sample) {
          request = await SequencingRequest.findOne({ id: sample.request_id }).lean();
        }
        let checkerName: string | undefined;
        if (q.checked_by_id) {
          const user = await User.findOne({ id: q.checked_by_id }).select('name').lean();
          checkerName = user?.name;
        }

        return {
          ...q,
          sample_code: sample?.sample_code,
          sample_type: sample?.sample_type,
          sample_status: sample?.status,
          request_code: request?.request_code,
          test_type: request?.test_type,
          priority: request?.priority,
          checked_by_name: checkerName,
        };
      })
    );

    let finalResults = enriched;
    if (search) {
      const term = String(search).toLowerCase();
      finalResults = enriched.filter(
        (q) =>
          q.qc_code.toLowerCase().includes(term) ||
          (q.sample_code && q.sample_code.toLowerCase().includes(term)) ||
          (q.request_code && q.request_code.toLowerCase().includes(term))
      );
    }

    return res.json({ qualityChecks: finalResults });
  } catch (error) {
    console.error('Error fetching QC records from MongoDB:', error);
    return res.status(500).json({ error: 'Failed to retrieve quality check records.' });
  }
});

// GET /api/qc/:sampleId - Get QC record for a sample
router.get('/:sampleId', async (req, res) => {
  try {
    const sampleId = parseInt(req.params.sampleId, 10);
    const qc = await QualityCheck.findOne({ sample_id: sampleId }).lean();

    if (!qc) {
      return res.status(404).json({ error: 'Quality check record not found for this sample.' });
    }

    const sample = await Sample.findOne({ id: sampleId }).select('sample_code status').lean();
    let checkerName: string | undefined;
    if (qc.checked_by_id) {
      const user = await User.findOne({ id: qc.checked_by_id }).select('name').lean();
      checkerName = user?.name;
    }

    return res.json({
      qualityCheck: {
        ...qc,
        sample_code: sample?.sample_code,
        sample_status: sample?.status,
        checked_by_name: checkerName,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve quality check record.' });
  }
});

// POST /api/qc - Record QC for a sample
router.post('/', authorizeRoles('ADMIN', 'LAB_TECHNICIAN'), async (req: AuthRequest, res) => {
  try {
    const {
      sample_id,
      din_rin_score,
      a260_a280_ratio,
      a260_a230_ratio,
      concentration_post_qc,
      qc_result,
      failure_reason,
      qc_comments,
    } = req.body;

    if (!sample_id || !qc_result) {
      return res.status(400).json({ error: 'Sample ID and QC result (PASSED or FAILED) are required.' });
    }

    if (!['PASSED', 'FAILED', 'PENDING_REVIEW'].includes(qc_result)) {
      return res.status(400).json({ error: "QC result must be 'PASSED', 'FAILED', or 'PENDING_REVIEW'." });
    }

    if (qc_result === 'FAILED' && (!failure_reason || failure_reason.trim().length === 0)) {
      return res.status(400).json({ error: 'A clear failure reason is mandatory when marking QC as FAILED.' });
    }

    const sample = await Sample.findOne({ id: parseInt(sample_id, 10) });
    if (!sample) {
      return res.status(404).json({ error: 'Sample not found.' });
    }

    let qcDoc = await QualityCheck.findOne({ sample_id: sample.id });

    if (!qcDoc) {
      const year = new Date().getFullYear();
      const count = await QualityCheck.countDocuments();
      const seqNum = String(count + 1).padStart(3, '0');
      const qcCode = `QC-${year}-${seqNum}`;
      const nextQcId = await getNextSequence('quality_checks');

      qcDoc = new QualityCheck({
        id: nextQcId,
        qc_code: qcCode,
        sample_id: sample.id,
      });
    }

    qcDoc.checked_by_id = req.user!.id;
    qcDoc.din_rin_score = din_rin_score ? parseFloat(din_rin_score) : undefined;
    qcDoc.a260_a280_ratio = a260_a280_ratio ? parseFloat(a260_a280_ratio) : undefined;
    qcDoc.a260_a230_ratio = a260_a230_ratio ? parseFloat(a260_a230_ratio) : undefined;
    qcDoc.concentration_post_qc = concentration_post_qc ? parseFloat(concentration_post_qc) : undefined;
    qcDoc.qc_result = qc_result;
    qcDoc.failure_reason = failure_reason || undefined;
    qcDoc.qc_comments = qc_comments || undefined;
    qcDoc.qc_date = new Date();
    qcDoc.updated_at = new Date();
    await qcDoc.save();

    const previousStatus = sample.status;
    let newSampleStatus = previousStatus;

    if (qc_result === 'PASSED') {
      newSampleStatus = 'QC_PASSED';
    } else if (qc_result === 'FAILED') {
      newSampleStatus = 'QC_FAILED';
    }

    sample.status = newSampleStatus;
    sample.updated_at = new Date();
    await sample.save();

    const eventType = qc_result === 'PASSED' ? 'Quality Check Passed' : (qc_result === 'FAILED' ? 'Quality Check Failed' : 'Quality Check Under Review');
    const eventComments = qc_result === 'PASSED'
      ? `QC Passed. DIN/RIN: ${din_rin_score || 'N/A'}, A260/280: ${a260_a280_ratio || 'N/A'}. Cleared for Sequencing.`
      : `QC Failed. Reason: ${failure_reason}. Sample quarantined from sequencing pipeline.`;

    await recordWorkflowHistory({
      sampleId: sample.id,
      eventType,
      previousStatus,
      newStatus: newSampleStatus,
      userId: req.user!.id,
      userName: req.user!.name,
      comments: eventComments,
    });

    return res.status(201).json({
      message: `Quality Check recorded successfully as ${qc_result}.`,
      qualityCheck: qcDoc,
      sampleStatus: newSampleStatus,
    });
  } catch (error: any) {
    console.error('Error recording QC in MongoDB:', error);
    return res.status(500).json({ error: 'Failed to record quality check information.' });
  }
});

export default router;
