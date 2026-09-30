import { Router } from 'express';
import { 
  SampleProcessing, 
  Sample, 
  SequencingRequest, 
  User, 
  getNextSequence 
} from '../models/index.js';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth.js';
import { recordWorkflowHistory } from '../utils/history.js';

const router = Router();
router.use(authenticateToken);

// GET /api/processing - List processing records with sample info
router.get('/', async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter: any = {};

    if (status) {
      filter.status = status;
    }

    if (search) {
      const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.extraction_method = { $regex: escaped, $options: 'i' };
    }

    const processingList = await SampleProcessing.find(filter)
      .sort({ updated_at: -1, id: -1 })
      .lean();

    const enriched = await Promise.all(
      processingList.map(async (p) => {
        const sample = await Sample.findOne({ id: p.sample_id }).lean();
        let request: any = null;
        if (sample) {
          request = await SequencingRequest.findOne({ id: sample.request_id }).lean();
        }
        let techName: string | undefined;
        if (p.assigned_technician_id) {
          const tech = await User.findOne({ id: p.assigned_technician_id }).select('name').lean();
          techName = tech?.name;
        }

        return {
          ...p,
          sample_code: sample?.sample_code,
          sample_type: sample?.sample_type,
          organism: sample?.organism,
          sample_status: sample?.status,
          request_code: request?.request_code,
          test_type: request?.test_type,
          priority: request?.priority,
          technician_name: techName,
        };
      })
    );

    let finalResults = enriched;
    if (search) {
      const term = String(search).toLowerCase();
      finalResults = enriched.filter(
        (p) =>
          (p.sample_code && p.sample_code.toLowerCase().includes(term)) ||
          (p.request_code && p.request_code.toLowerCase().includes(term)) ||
          (p.extraction_method && p.extraction_method.toLowerCase().includes(term))
      );
    }

    return res.json({ processing: finalResults });
  } catch (error) {
    console.error('Error fetching sample processing from MongoDB:', error);
    return res.status(500).json({ error: 'Failed to retrieve sample processing list.' });
  }
});

// GET /api/processing/:sampleId - Get processing record for a sample
router.get('/:sampleId', async (req, res) => {
  try {
    const sampleId = parseInt(req.params.sampleId, 10);
    const processing = await SampleProcessing.findOne({ sample_id: sampleId }).lean();

    if (!processing) {
      return res.status(404).json({ error: 'Processing record not found for this sample.' });
    }

    const sample = await Sample.findOne({ id: sampleId }).select('sample_code status').lean();
    let techName: string | undefined;
    if (processing.assigned_technician_id) {
      const tech = await User.findOne({ id: processing.assigned_technician_id }).select('name').lean();
      techName = tech?.name;
    }

    return res.json({
      processing: {
        ...processing,
        sample_code: sample?.sample_code,
        sample_status: sample?.status,
        technician_name: techName,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve processing record.' });
  }
});

// POST /api/processing/:sampleId/start - Start processing
router.post('/:sampleId/start', authorizeRoles('ADMIN', 'LAB_TECHNICIAN'), async (req: AuthRequest, res) => {
  try {
    const sampleId = parseInt(req.params.sampleId, 10);
    const { extraction_method, buffer_type, notes } = req.body;

    const sample = await Sample.findOne({ id: sampleId });
    if (!sample) {
      return res.status(404).json({ error: 'Sample not found.' });
    }

    if (sample.status !== 'REGISTERED' && sample.status !== 'PROCESSING') {
      return res.status(400).json({
        error: `Cannot start processing. Current sample status is '${sample.status}'. Only REGISTERED samples can be started.`
      });
    }

    const previousSampleStatus = sample.status;

    let processing = await SampleProcessing.findOne({ sample_id: sampleId });
    if (!processing) {
      const nextProcId = await getNextSequence('sample_processing');
      processing = new SampleProcessing({
        id: nextProcId,
        sample_id: sampleId,
      });
    }

    processing.status = 'PROCESSING';
    processing.start_time = processing.start_time || new Date();
    if (extraction_method) processing.extraction_method = extraction_method;
    else if (!processing.extraction_method) processing.extraction_method = 'Automated Spin-Column / Magnetic Bead';

    if (buffer_type) processing.buffer_type = buffer_type;
    else if (!processing.buffer_type) processing.buffer_type = '10mM Tris-HCl, pH 8.5';

    if (notes) processing.processing_notes = notes;
    processing.assigned_technician_id = req.user!.id;
    processing.updated_at = new Date();
    await processing.save();

    // Update sample status
    sample.status = 'PROCESSING';
    sample.updated_at = new Date();
    await sample.save();

    // Record workflow history
    await recordWorkflowHistory({
      sampleId,
      eventType: 'Processing Started',
      previousStatus: previousSampleStatus,
      newStatus: 'PROCESSING',
      userId: req.user!.id,
      userName: req.user!.name,
      comments: `Extraction started using method: ${extraction_method || processing.extraction_method}.`,
    });

    return res.json({
      message: 'Processing started successfully.',
      processing,
    });
  } catch (error: any) {
    console.error('Error starting processing in MongoDB:', error);
    return res.status(500).json({ error: 'Failed to start sample processing.' });
  }
});

// POST /api/processing/:sampleId/complete - Complete processing
router.post('/:sampleId/complete', authorizeRoles('ADMIN', 'LAB_TECHNICIAN'), async (req: AuthRequest, res) => {
  try {
    const sampleId = parseInt(req.params.sampleId, 10);
    const { concentration_ng_ul, volume_ul, extraction_method, buffer_type, notes } = req.body;

    if (!concentration_ng_ul || !volume_ul) {
      return res.status(400).json({ error: 'Eluate concentration (ng/µL) and volume (µL) are required to complete processing.' });
    }

    const sample = await Sample.findOne({ id: sampleId });
    if (!sample) {
      return res.status(404).json({ error: 'Sample not found.' });
    }

    const previousSampleStatus = sample.status;

    let processing = await SampleProcessing.findOne({ sample_id: sampleId });
    if (!processing) {
      const nextProcId = await getNextSequence('sample_processing');
      processing = new SampleProcessing({
        id: nextProcId,
        sample_id: sampleId,
      });
    }

    processing.status = 'COMPLETED';
    processing.completion_time = new Date();
    processing.concentration_ng_ul = parseFloat(concentration_ng_ul);
    processing.volume_ul = parseFloat(volume_ul);
    if (extraction_method) processing.extraction_method = extraction_method;
    if (buffer_type) processing.buffer_type = buffer_type;
    if (notes) processing.processing_notes = notes;
    processing.updated_at = new Date();
    await processing.save();

    // Update sample status
    sample.status = 'PROCESSING_COMPLETED';
    sample.updated_at = new Date();
    await sample.save();

    // Record workflow history
    await recordWorkflowHistory({
      sampleId,
      eventType: 'Processing Completed',
      previousStatus: previousSampleStatus,
      newStatus: 'PROCESSING_COMPLETED',
      userId: req.user!.id,
      userName: req.user!.name,
      comments: `Sample extraction complete. Concentration: ${concentration_ng_ul} ng/µL, Volume: ${volume_ul} µL. Ready for Quality Check.`,
    });

    return res.json({
      message: 'Processing marked as completed. Sample is ready for Quality Check.',
      processing,
    });
  } catch (error: any) {
    console.error('Error completing processing in MongoDB:', error);
    return res.status(500).json({ error: 'Failed to complete sample processing.' });
  }
});

export default router;
