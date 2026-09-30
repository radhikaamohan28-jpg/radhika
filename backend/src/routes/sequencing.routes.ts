import { Router } from 'express';
import { 
  Sequencing, 
  Sample, 
  SequencingRequest, 
  QualityCheck, 
  Analysis, 
  User, 
  getNextSequence 
} from '../models/index.js';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth.js';
import { recordWorkflowHistory } from '../utils/history.js';

const router = Router();
router.use(authenticateToken);

// GET /api/sequencing - List all sequencing runs
router.get('/', async (req, res) => {
  try {
    const { status, platform, search } = req.query;
    const filter: any = {};

    if (status) {
      filter.sequencing_status = status;
    }

    if (platform) {
      filter.instrument_platform = platform;
    }

    if (search) {
      const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { sequencing_code: { $regex: escaped, $options: 'i' } },
        { instrument_platform: { $regex: escaped, $options: 'i' } },
        { flowcell_id: { $regex: escaped, $options: 'i' } },
      ];
    }

    const runs = await Sequencing.find(filter)
      .sort({ updated_at: -1, id: -1 })
      .lean();

    const enriched = await Promise.all(
      runs.map(async (seq) => {
        const sample = await Sample.findOne({ id: seq.sample_id }).lean();
        let request: any = null;
        if (sample) {
          request = await SequencingRequest.findOne({ id: sample.request_id }).lean();
        }
        let analystName: string | undefined;
        if (seq.assigned_analyst_id) {
          const user = await User.findOne({ id: seq.assigned_analyst_id }).select('name').lean();
          analystName = user?.name;
        }

        return {
          ...seq,
          sample_code: sample?.sample_code,
          sample_type: sample?.sample_type,
          sample_status: sample?.status,
          request_code: request?.request_code,
          test_type: request?.test_type,
          priority: request?.priority,
          analyst_name: analystName,
        };
      })
    );

    let finalResults = enriched;
    if (search) {
      const term = String(search).toLowerCase();
      finalResults = enriched.filter(
        (r) =>
          r.sequencing_code.toLowerCase().includes(term) ||
          (r.sample_code && r.sample_code.toLowerCase().includes(term)) ||
          r.instrument_platform.toLowerCase().includes(term) ||
          r.flowcell_id.toLowerCase().includes(term)
      );
    }

    return res.json({ sequencingRuns: finalResults });
  } catch (error) {
    console.error('Error fetching sequencing runs from MongoDB:', error);
    return res.status(500).json({ error: 'Failed to retrieve sequencing runs.' });
  }
});

// GET /api/sequencing/eligible - List samples that passed QC and are eligible for sequencing
router.get('/eligible', async (_req, res) => {
  try {
    const eligibleSamples = await Sample.find({ status: 'QC_PASSED' })
      .sort({ id: 1 })
      .lean();

    const enriched = await Promise.all(
      eligibleSamples.map(async (s) => {
        const [request, qc] = await Promise.all([
          SequencingRequest.findOne({ id: s.request_id }).select('request_code test_type priority').lean(),
          QualityCheck.findOne({ sample_id: s.id }).select('din_rin_score qc_result').lean(),
        ]);
        return {
          ...s,
          request_code: request?.request_code,
          test_type: request?.test_type,
          priority: request?.priority,
          din_rin_score: qc?.din_rin_score,
          qc_result: qc?.qc_result,
        };
      })
    );

    return res.json({ eligibleSamples: enriched });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve eligible samples for sequencing.' });
  }
});

// POST /api/sequencing/:sampleId/start - Start a sequencing run
router.post('/:sampleId/start', authorizeRoles('ADMIN', 'BIOINFORMATICS_ANALYST'), async (req: AuthRequest, res) => {
  try {
    const sampleId = parseInt(req.params.sampleId, 10);
    const { instrument_platform, flowcell_id, run_mode, read_length, target_depth, notes } = req.body;

    const sample = await Sample.findOne({ id: sampleId });
    if (!sample) {
      return res.status(404).json({ error: 'Sample not found.' });
    }

    if (sample.status !== 'QC_PASSED' && sample.status !== 'SEQUENCING') {
      return res.status(400).json({
        error: `Sample is in status '${sample.status}'. Only samples with status 'QC_PASSED' can begin sequencing.`
      });
    }

    const qc = await QualityCheck.findOne({ sample_id: sampleId });
    if (!qc || qc.qc_result !== 'PASSED') {
      return res.status(400).json({
        error: 'Workflow violation: Sample has not passed Quality Control verification.'
      });
    }

    let seqDoc = await Sequencing.findOne({ sample_id: sampleId });
    const year = new Date().getFullYear();

    if (!seqDoc) {
      const count = await Sequencing.countDocuments();
      const seqNum = String(count + 1).padStart(3, '0');
      const seqCode = `SEQ-${year}-${seqNum}`;
      const nextSeqId = await getNextSequence('sequencing');

      seqDoc = new Sequencing({
        id: nextSeqId,
        sequencing_code: seqCode,
        sample_id: sampleId,
      });
    }

    seqDoc.instrument_platform = instrument_platform || 'Illumina NovaSeq 6000';
    seqDoc.flowcell_id = flowcell_id || `FC-${year}-${Math.floor(100000 + Math.random() * 900000)}`;
    seqDoc.run_mode = run_mode || 'Paired-End';
    seqDoc.read_length = read_length || '2x150 bp';
    seqDoc.target_depth = target_depth || '30x';
    seqDoc.assigned_analyst_id = req.user!.id;
    seqDoc.sequencing_status = 'IN_PROGRESS';
    seqDoc.start_date = seqDoc.start_date || new Date();
    seqDoc.notes = notes || undefined;
    seqDoc.updated_at = new Date();
    await seqDoc.save();

    const previousStatus = sample.status;
    sample.status = 'SEQUENCING';
    sample.updated_at = new Date();
    await sample.save();

    await recordWorkflowHistory({
      sampleId,
      eventType: 'Sequencing Started',
      previousStatus,
      newStatus: 'SEQUENCING',
      userId: req.user!.id,
      userName: req.user!.name,
      comments: `Sequencing initiated on platform: ${seqDoc.instrument_platform}. Flowcell ID: ${seqDoc.flowcell_id}.`,
    });

    return res.status(201).json({
      message: 'Sequencing run started successfully.',
      sequencing: seqDoc,
    });
  } catch (error: any) {
    console.error('Error starting sequencing run in MongoDB:', error);
    return res.status(500).json({ error: 'Failed to start sequencing run.' });
  }
});

// POST /api/sequencing/:sampleId/complete - Complete a sequencing run
router.post('/:sampleId/complete', authorizeRoles('ADMIN', 'BIOINFORMATICS_ANALYST'), async (req: AuthRequest, res) => {
  try {
    const sampleId = parseInt(req.params.sampleId, 10);
    const { yield_gb, q30_percent, error_rate, notes } = req.body;

    if (!yield_gb || !q30_percent) {
      return res.status(400).json({ error: 'Sequencing yield (Gb) and Q30 score (%) are required to mark run as completed.' });
    }

    const sample = await Sample.findOne({ id: sampleId });
    if (!sample) {
      return res.status(404).json({ error: 'Sample not found.' });
    }

    let seqDoc = await Sequencing.findOne({ sample_id: sampleId });
    if (!seqDoc) {
      return res.status(404).json({ error: 'Sequencing run not found for this sample.' });
    }

    const previousStatus = sample.status;

    seqDoc.sequencing_status = 'COMPLETED';
    seqDoc.completion_date = new Date();
    seqDoc.yield_gb = parseFloat(yield_gb);
    seqDoc.q30_percent = parseFloat(q30_percent);
    if (error_rate !== undefined) seqDoc.error_rate = parseFloat(error_rate);
    if (notes) seqDoc.notes = notes;
    seqDoc.updated_at = new Date();
    await seqDoc.save();

    sample.status = 'SEQUENCING_COMPLETED';
    sample.updated_at = new Date();
    await sample.save();

    // Pre-initialize analysis record if not exists
    const existingAna = await Analysis.findOne({ sample_id: sampleId });
    if (!existingAna) {
      const year = new Date().getFullYear();
      const nextAnaId = await getNextSequence('analysis');
      await Analysis.create({
        id: nextAnaId,
        analysis_code: `ANA-${year}-${sampleId.toString().padStart(3, '0')}`,
        sample_id: sampleId,
        assigned_analyst_id: req.user!.id,
        analysis_status: 'PENDING',
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    await recordWorkflowHistory({
      sampleId,
      eventType: 'Sequencing Completed',
      previousStatus,
      newStatus: 'SEQUENCING_COMPLETED',
      userId: req.user!.id,
      userName: req.user!.name,
      comments: `Sequencing run completed. Yield: ${yield_gb} Gb, Q30: ${q30_percent}%. High quality raw FASTQ reads generated.`,
    });

    return res.json({
      message: 'Sequencing run completed successfully. Sample is ready for bioinformatics analysis.',
      sequencing: seqDoc,
    });
  } catch (error: any) {
    console.error('Error completing sequencing in MongoDB:', error);
    return res.status(500).json({ error: 'Failed to complete sequencing run.' });
  }
});

export default router;
