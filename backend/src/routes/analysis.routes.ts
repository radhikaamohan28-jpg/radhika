import { Router } from 'express';
import { 
  Analysis, 
  Sample, 
  SequencingRequest, 
  Sequencing, 
  User, 
  getNextSequence 
} from '../models/index.js';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth.js';
import { recordWorkflowHistory } from '../utils/history.js';

const router = Router();
router.use(authenticateToken);

// GET /api/analysis - List analysis records
router.get('/', async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter: any = {};

    if (status) {
      filter.analysis_status = status;
    }

    if (search) {
      const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { analysis_code: { $regex: escaped, $options: 'i' } },
        { pipeline_name: { $regex: escaped, $options: 'i' } },
        { result_summary: { $regex: escaped, $options: 'i' } },
      ];
    }

    const analysisList = await Analysis.find(filter)
      .sort({ updated_at: -1, id: -1 })
      .lean();

    const enriched = await Promise.all(
      analysisList.map(async (a) => {
        const sample = await Sample.findOne({ id: a.sample_id }).lean();
        let request: any = null;
        if (sample) {
          request = await SequencingRequest.findOne({ id: sample.request_id }).lean();
        }
        let analystName: string | undefined;
        if (a.assigned_analyst_id) {
          const user = await User.findOne({ id: a.assigned_analyst_id }).select('name').lean();
          analystName = user?.name;
        }

        return {
          ...a,
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
        (a) =>
          a.analysis_code.toLowerCase().includes(term) ||
          (a.sample_code && a.sample_code.toLowerCase().includes(term)) ||
          (a.pipeline_name && a.pipeline_name.toLowerCase().includes(term)) ||
          (a.result_summary && a.result_summary.toLowerCase().includes(term))
      );
    }

    return res.json({ analyses: finalResults });
  } catch (error) {
    console.error('Error fetching analysis list from MongoDB:', error);
    return res.status(500).json({ error: 'Failed to retrieve analysis list.' });
  }
});

// GET /api/analysis/eligible - List samples ready for analysis (sequencing completed)
router.get('/eligible', async (_req, res) => {
  try {
    const eligible = await Sample.find({ status: 'SEQUENCING_COMPLETED' })
      .sort({ id: 1 })
      .lean();

    const enriched = await Promise.all(
      eligible.map(async (s) => {
        const [request, seq] = await Promise.all([
          SequencingRequest.findOne({ id: s.request_id }).select('request_code test_type').lean(),
          Sequencing.findOne({ sample_id: s.id }).select('instrument_platform yield_gb').lean(),
        ]);
        return {
          ...s,
          request_code: request?.request_code,
          test_type: request?.test_type,
          instrument_platform: seq?.instrument_platform,
          yield_gb: seq?.yield_gb,
        };
      })
    );

    return res.json({ eligibleSamples: enriched });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve eligible samples for analysis.' });
  }
});

// POST /api/analysis/:sampleId/start - Start analysis pipeline
router.post('/:sampleId/start', authorizeRoles('ADMIN', 'BIOINFORMATICS_ANALYST'), async (req: AuthRequest, res) => {
  try {
    const sampleId = parseInt(req.params.sampleId, 10);
    const { pipeline_name, reference_genome, notes } = req.body;

    const sample = await Sample.findOne({ id: sampleId });
    if (!sample) {
      return res.status(404).json({ error: 'Sample not found.' });
    }

    if (sample.status !== 'SEQUENCING_COMPLETED' && sample.status !== 'ANALYSIS') {
      return res.status(400).json({
        error: `Cannot start analysis. Current sample status is '${sample.status}'. Sequencing must be completed first.`
      });
    }

    let anaDoc = await Analysis.findOne({ sample_id: sampleId });
    if (!anaDoc) {
      const year = new Date().getFullYear();
      const count = await Analysis.countDocuments();
      const seqNum = String(count + 1).padStart(3, '0');
      const analysisCode = `ANA-${year}-${seqNum}`;
      const nextAnaId = await getNextSequence('analysis');

      anaDoc = new Analysis({
        id: nextAnaId,
        analysis_code: analysisCode,
        sample_id: sampleId,
      });
    }

    anaDoc.assigned_analyst_id = req.user!.id;
    anaDoc.pipeline_name = pipeline_name || 'BWA-MEM2 + GATK HaplotypeCaller 4.4';
    anaDoc.reference_genome = reference_genome || 'GRCh38 / hg38';
    anaDoc.analysis_status = 'IN_PROGRESS';
    anaDoc.start_date = anaDoc.start_date || new Date();
    anaDoc.analysis_notes = notes || undefined;
    anaDoc.updated_at = new Date();
    await anaDoc.save();

    const previousStatus = sample.status;
    sample.status = 'ANALYSIS';
    sample.updated_at = new Date();
    await sample.save();

    await recordWorkflowHistory({
      sampleId,
      eventType: 'Bioinformatics Analysis Started',
      previousStatus,
      newStatus: 'ANALYSIS',
      userId: req.user!.id,
      userName: req.user!.name,
      comments: `Analysis pipeline launched: ${anaDoc.pipeline_name} against reference ${anaDoc.reference_genome}.`,
    });

    return res.status(201).json({
      message: 'Bioinformatics analysis pipeline started.',
      analysis: anaDoc,
    });
  } catch (error: any) {
    console.error('Error starting analysis in MongoDB:', error);
    return res.status(500).json({ error: 'Failed to start bioinformatics analysis.' });
  }
});

// POST /api/analysis/:sampleId/complete - Complete analysis
router.post('/:sampleId/complete', authorizeRoles('ADMIN', 'BIOINFORMATICS_ANALYST'), async (req: AuthRequest, res) => {
  try {
    const sampleId = parseInt(req.params.sampleId, 10);
    const { total_reads, mapped_reads_pct, mean_coverage, variants_called, result_summary, notes } = req.body;

    if (!result_summary || result_summary.trim().length === 0) {
      return res.status(400).json({ error: 'A findings and result summary is required to complete analysis.' });
    }

    const sample = await Sample.findOne({ id: sampleId });
    if (!sample) {
      return res.status(404).json({ error: 'Sample not found.' });
    }

    let anaDoc = await Analysis.findOne({ sample_id: sampleId });
    if (!anaDoc) {
      return res.status(404).json({ error: 'Analysis record not found for this sample.' });
    }

    const previousStatus = sample.status;

    anaDoc.analysis_status = 'COMPLETED';
    anaDoc.completion_date = new Date();
    if (total_reads !== undefined) anaDoc.total_reads = parseInt(total_reads, 10);
    if (mapped_reads_pct !== undefined) anaDoc.mapped_reads_pct = parseFloat(mapped_reads_pct);
    if (mean_coverage !== undefined) anaDoc.mean_coverage = parseFloat(mean_coverage);
    if (variants_called !== undefined) anaDoc.variants_called = parseInt(variants_called, 10);
    anaDoc.result_summary = result_summary.trim();
    if (notes) anaDoc.analysis_notes = notes;
    anaDoc.updated_at = new Date();
    await anaDoc.save();

    sample.status = 'ANALYSIS_COMPLETED';
    sample.updated_at = new Date();
    await sample.save();

    await recordWorkflowHistory({
      sampleId,
      eventType: 'Bioinformatics Analysis Completed',
      previousStatus,
      newStatus: 'ANALYSIS_COMPLETED',
      userId: req.user!.id,
      userName: req.user!.name,
      comments: `Bioinformatics pipeline finished. Coverage: ${mean_coverage || 'N/A'}x, Variants: ${variants_called || 'N/A'}. Ready for report generation.`,
    });

    return res.json({
      message: 'Analysis marked as completed. Sample is ready for report generation.',
      analysis: anaDoc,
    });
  } catch (error: any) {
    console.error('Error completing analysis in MongoDB:', error);
    return res.status(500).json({ error: 'Failed to complete analysis.' });
  }
});

export default router;
