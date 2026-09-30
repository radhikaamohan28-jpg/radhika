import { Router } from 'express';
import { 
  Sample, 
  SequencingRequest, 
  User, 
  SampleProcessing, 
  QualityCheck, 
  Sequencing, 
  Analysis, 
  Report, 
  WorkflowHistory, 
  getNextSequence 
} from '../models/index.js';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth.js';
import { recordWorkflowHistory } from '../utils/history.js';

const router = Router();
router.use(authenticateToken);

// GET /api/samples - List samples with search and filters
router.get('/', async (req, res) => {
  try {
    const { status, sample_type, request_id, search } = req.query;
    const filter: any = {};

    if (status) {
      filter.status = status;
    }

    if (sample_type) {
      filter.sample_type = sample_type;
    }

    if (request_id) {
      filter.request_id = parseInt(request_id as string, 10);
    }

    if (search) {
      const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { sample_code: { $regex: escaped, $options: 'i' } },
        { sample_type: { $regex: escaped, $options: 'i' } },
        { storage_location: { $regex: escaped, $options: 'i' } },
      ];
    }

    const samples = await Sample.find(filter)
      .sort({ id: -1 })
      .lean();

    // Enrich with associated request and stage statuses
    const enriched = await Promise.all(
      samples.map(async (s) => {
        const [request, technician, qc, seq, ana, rep] = await Promise.all([
          SequencingRequest.findOne({ id: s.request_id }).select('request_code test_type requester_name').lean(),
          s.assigned_technician_id ? User.findOne({ id: s.assigned_technician_id }).select('name').lean() : null,
          QualityCheck.findOne({ sample_id: s.id }).select('qc_result').lean(),
          Sequencing.findOne({ sample_id: s.id }).select('sequencing_status').lean(),
          Analysis.findOne({ sample_id: s.id }).select('analysis_status').lean(),
          Report.findOne({ sample_id: s.id }).select('report_status').lean(),
        ]);

        return {
          ...s,
          request_code: request?.request_code,
          test_type: request?.test_type,
          requester_name: request?.requester_name,
          assigned_technician_name: technician?.name,
          qc_result: qc?.qc_result,
          sequencing_status: seq?.sequencing_status,
          analysis_status: ana?.analysis_status,
          report_status: rep?.report_status,
        };
      })
    );

    // If search was provided, also allow matching on requester_name or request_code
    let finalSamples = enriched;
    if (search) {
      const term = String(search).toLowerCase();
      finalSamples = enriched.filter(
        (s) =>
          s.sample_code.toLowerCase().includes(term) ||
          (s.request_code && s.request_code.toLowerCase().includes(term)) ||
          s.sample_type.toLowerCase().includes(term) ||
          (s.storage_location && s.storage_location.toLowerCase().includes(term)) ||
          (s.requester_name && s.requester_name.toLowerCase().includes(term))
      );
    }

    return res.json({ samples: finalSamples });
  } catch (error: any) {
    console.error('Error fetching samples from MongoDB:', error);
    return res.status(500).json({ error: 'Failed to retrieve samples.' });
  }
});

// GET /api/samples/:id - Full sample details across all stages
router.get('/:id', async (req, res) => {
  try {
    const sampleId = parseInt(req.params.id, 10);
    const sample = await Sample.findOne({ id: sampleId }).lean();

    if (!sample) {
      return res.status(404).json({ error: 'Sample not found.' });
    }

    // Fetch related models concurrently
    const [request, technician, processingDoc, qcDoc, seqDoc, anaDoc, repDoc] = await Promise.all([
      SequencingRequest.findOne({ id: sample.request_id }).lean(),
      sample.assigned_technician_id ? User.findOne({ id: sample.assigned_technician_id }).select('name email').lean() : null,
      SampleProcessing.findOne({ sample_id: sampleId }).lean(),
      QualityCheck.findOne({ sample_id: sampleId }).lean(),
      Sequencing.findOne({ sample_id: sampleId }).lean(),
      Analysis.findOne({ sample_id: sampleId }).lean(),
      Report.findOne({ sample_id: sampleId }).lean(),
    ]);

    const enrichedSample = {
      ...sample,
      request_code: request?.request_code,
      test_type: request?.test_type,
      request_priority: request?.priority,
      requester_name: request?.requester_name,
      requester_email: request?.requester_email,
      institution: request?.institution,
      assigned_technician_name: technician?.name,
      assigned_technician_email: technician?.email,
    };

    // Enrich sub-documents with names
    let enrichedProcessing: any = processingDoc;
    if (processingDoc && processingDoc.assigned_technician_id) {
      const tech = await User.findOne({ id: processingDoc.assigned_technician_id }).select('name').lean();
      enrichedProcessing = { ...processingDoc, technician_name: tech?.name };
    }

    let enrichedQC: any = qcDoc;
    if (qcDoc && qcDoc.checked_by_id) {
      const checker = await User.findOne({ id: qcDoc.checked_by_id }).select('name').lean();
      enrichedQC = { ...qcDoc, checked_by_name: checker?.name };
    }

    let enrichedSequencing: any = seqDoc;
    if (seqDoc && seqDoc.assigned_analyst_id) {
      const analyst = await User.findOne({ id: seqDoc.assigned_analyst_id }).select('name').lean();
      enrichedSequencing = { ...seqDoc, analyst_name: analyst?.name };
    }

    let enrichedAnalysis: any = anaDoc;
    if (anaDoc && anaDoc.assigned_analyst_id) {
      const analyst = await User.findOne({ id: anaDoc.assigned_analyst_id }).select('name').lean();
      enrichedAnalysis = { ...anaDoc, analyst_name: analyst?.name };
    }

    let enrichedReport: any = repDoc;
    if (repDoc) {
      const [gen, rev, app] = await Promise.all([
        repDoc.generated_by_id ? User.findOne({ id: repDoc.generated_by_id }).select('name').lean() : null,
        repDoc.reviewed_by_id ? User.findOne({ id: repDoc.reviewed_by_id }).select('name').lean() : null,
        repDoc.approved_by_id ? User.findOne({ id: repDoc.approved_by_id }).select('name').lean() : null,
      ]);
      enrichedReport = {
        ...repDoc,
        generated_by_name: gen?.name,
        reviewed_by_name: rev?.name,
        approved_by_name: app?.name,
      };
    }

    return res.json({
      sample: enrichedSample,
      processing: enrichedProcessing,
      qc: enrichedQC,
      sequencing: enrichedSequencing,
      analysis: enrichedAnalysis,
      report: enrichedReport,
    });
  } catch (error) {
    console.error('Error fetching sample details from MongoDB:', error);
    return res.status(500).json({ error: 'Failed to retrieve sample details.' });
  }
});

// GET /api/samples/:id/history - Traceability Timeline
router.get('/:id/history', async (req, res) => {
  try {
    const sampleId = parseInt(req.params.id, 10);
    const history = await WorkflowHistory.find({ sample_id: sampleId })
      .sort({ created_at: 1, id: 1 })
      .lean();

    const enrichedHistory = await Promise.all(
      history.map(async (h) => {
        let userEmail: string | undefined;
        let userRole: string | undefined;
        if (h.user_id) {
          const user = await User.findOne({ id: h.user_id }).select('email role').lean();
          userEmail = user?.email;
          userRole = user?.role;
        }
        return {
          ...h,
          user_email: userEmail,
          user_role: userRole,
        };
      })
    );

    return res.json({ history: enrichedHistory });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve workflow traceability history.' });
  }
});

// POST /api/samples - Register a new sample
router.post('/', authorizeRoles('ADMIN', 'LAB_TECHNICIAN'), async (req: AuthRequest, res) => {
  try {
    const {
      request_id,
      sample_type,
      organism,
      collection_date,
      assigned_technician_id,
      storage_location,
      initial_volume_ul,
      notes,
    } = req.body;

    if (!request_id || !sample_type || !collection_date) {
      return res.status(400).json({ error: 'Request ID, sample type, and collection date are required.' });
    }

    // Verify request exists
    const request = await SequencingRequest.findOne({ id: parseInt(request_id, 10) });
    if (!request) {
      return res.status(404).json({ error: 'Associated sequencing request not found.' });
    }

    const year = new Date().getFullYear();
    const count = await Sample.countDocuments();
    const seqNum = String(count + 101).padStart(3, '0');
    const sampleCode = `SMP-${year}-${seqNum}`;
    const nextSampleId = await getNextSequence('samples');

    const technicianId = assigned_technician_id ? parseInt(assigned_technician_id, 10) : req.user!.id;

    const sample = await Sample.create({
      id: nextSampleId,
      sample_code: sampleCode,
      request_id: request.id,
      sample_type: sample_type.trim(),
      organism: organism || 'Homo sapiens',
      collection_date: new Date(collection_date),
      registration_date: new Date(),
      assigned_technician_id: technicianId,
      status: 'REGISTERED',
      storage_location: storage_location || 'Receiving Temp Storage (+4C)',
      initial_volume_ul: initial_volume_ul ? parseFloat(initial_volume_ul) : undefined,
      notes: notes || undefined,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Initialize sample_processing record
    const nextProcId = await getNextSequence('sample_processing');
    await SampleProcessing.findOneAndUpdate(
      { sample_id: sample.id },
      {
        $setOnInsert: {
          id: nextProcId,
          sample_id: sample.id,
          assigned_technician_id: technicianId,
          status: 'PENDING',
          created_at: new Date(),
          updated_at: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    // Update sequencing request status to PROCESSING if it was PENDING
    if (request.status === 'PENDING') {
      request.status = 'PROCESSING';
      request.updated_at = new Date();
      await request.save();
    }

    // Record immutable workflow history
    await recordWorkflowHistory({
      sampleId: sample.id,
      eventType: 'Sample Registered',
      previousStatus: null,
      newStatus: 'REGISTERED',
      userId: req.user!.id,
      userName: req.user!.name,
      comments: `Sample ${sampleCode} registered under request #${request.id}. Initial storage: ${storage_location || 'Receiving'}.`,
    });

    return res.status(201).json({
      message: 'Sample successfully registered.',
      sample,
    });
  } catch (error: any) {
    console.error('Error registering sample in MongoDB:', error);
    return res.status(500).json({ error: 'Failed to register sample.' });
  }
});

// PUT /api/samples/:id - Update sample metadata
router.put('/:id', authorizeRoles('ADMIN', 'LAB_TECHNICIAN'), async (req: AuthRequest, res) => {
  try {
    const sampleId = parseInt(req.params.id, 10);
    const { sample_type, organism, storage_location, initial_volume_ul, notes, assigned_technician_id } = req.body;

    const sample = await Sample.findOne({ id: sampleId });
    if (!sample) {
      return res.status(404).json({ error: 'Sample not found.' });
    }

    if (sample_type) sample.sample_type = sample_type.trim();
    if (organism) sample.organism = organism.trim();
    if (storage_location !== undefined) sample.storage_location = storage_location;
    if (initial_volume_ul !== undefined) sample.initial_volume_ul = parseFloat(initial_volume_ul);
    if (notes !== undefined) sample.notes = notes;
    if (assigned_technician_id !== undefined) sample.assigned_technician_id = parseInt(assigned_technician_id, 10);

    sample.updated_at = new Date();
    await sample.save();

    return res.json({ message: 'Sample updated successfully.', sample });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update sample.' });
  }
});

export default router;
