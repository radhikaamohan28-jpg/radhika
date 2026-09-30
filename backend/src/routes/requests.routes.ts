import { Router } from 'express';
import { SequencingRequest, Sample, User, getNextSequence } from '../models/index.js';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

// GET /api/requests - List requests with search and filters
router.get('/', async (req, res) => {
  try {
    const { status, priority, test_type, search } = req.query;
    const filter: any = {};

    if (status) {
      filter.status = status;
    }

    if (priority) {
      filter.priority = priority;
    }

    if (test_type) {
      filter.test_type = test_type;
    }

    if (search) {
      const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { request_code: { $regex: escaped, $options: 'i' } },
        { requester_name: { $regex: escaped, $options: 'i' } },
        { requester_email: { $regex: escaped, $options: 'i' } },
        { test_type: { $regex: escaped, $options: 'i' } },
      ];
    }

    const requests = await SequencingRequest.find(filter)
      .sort({ created_at: -1 })
      .lean();

    // Enrich with creator name and sample count
    const enriched = await Promise.all(
      requests.map(async (r) => {
        let createdByName: string | undefined;
        if (r.created_by_id) {
          const user = await User.findOne({ id: r.created_by_id }).select('name').lean();
          createdByName = user?.name;
        }
        const sampleCount = await Sample.countDocuments({ request_id: r.id });
        return {
          ...r,
          created_by_name: createdByName,
          sample_count: sampleCount,
        };
      })
    );

    return res.json({ requests: enriched });
  } catch (error: any) {
    console.error('Error fetching sequencing requests from MongoDB:', error);
    return res.status(500).json({ error: 'Failed to retrieve sequencing requests.' });
  }
});

// GET /api/requests/:id - Get request details and associated samples
router.get('/:id', async (req, res) => {
  try {
    const requestId = parseInt(req.params.id, 10);
    const request = await SequencingRequest.findOne({ id: requestId }).lean();

    if (!request) {
      return res.status(404).json({ error: 'Sequencing request not found.' });
    }

    let createdByName: string | undefined;
    if (request.created_by_id) {
      const user = await User.findOne({ id: request.created_by_id }).select('name').lean();
      createdByName = user?.name;
    }

    const samples = await Sample.find({ request_id: requestId })
      .sort({ id: 1 })
      .lean();

    const enrichedSamples = await Promise.all(
      samples.map(async (s) => {
        let technicianName: string | undefined;
        if (s.assigned_technician_id) {
          const tech = await User.findOne({ id: s.assigned_technician_id }).select('name').lean();
          technicianName = tech?.name;
        }
        return {
          ...s,
          assigned_technician_name: technicianName,
        };
      })
    );

    return res.json({
      request: {
        ...request,
        created_by_name: createdByName,
      },
      samples: enrichedSamples,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve sequencing request details.' });
  }
});

// POST /api/requests - Create a new sequencing request
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { requester_name, requester_email, institution, test_type, priority, description } = req.body;

    if (!requester_name || !requester_email || !test_type) {
      return res.status(400).json({ error: 'Requester name, email, and test type are required fields.' });
    }

    const year = new Date().getFullYear();
    const count = await SequencingRequest.countDocuments();
    const seqNum = String(count + 1).padStart(3, '0');
    const requestCode = `REQ-${year}-${seqNum}`;
    const nextId = await getNextSequence('sequencing_requests');

    const newRequest = await SequencingRequest.create({
      id: nextId,
      request_code: requestCode,
      requester_name: requester_name.trim(),
      requester_email: requester_email.trim().toLowerCase(),
      institution: institution ? institution.trim() : undefined,
      test_type: test_type.trim(),
      priority: priority || 'STANDARD',
      description: description ? description.trim() : undefined,
      status: 'PENDING',
      created_by_id: req.user!.id,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return res.status(201).json({
      message: 'Sequencing request created successfully.',
      request: newRequest,
    });
  } catch (error: any) {
    console.error('Error creating sequencing request in MongoDB:', error);
    return res.status(500).json({ error: 'Failed to create sequencing request.' });
  }
});

// PUT /api/requests/:id - Edit request details or status
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const requestId = parseInt(req.params.id, 10);
    const { requester_name, requester_email, institution, test_type, priority, description, status } = req.body;

    const request = await SequencingRequest.findOne({ id: requestId });
    if (!request) {
      return res.status(404).json({ error: 'Sequencing request not found.' });
    }

    if (requester_name) request.requester_name = requester_name.trim();
    if (requester_email) request.requester_email = requester_email.trim().toLowerCase();
    if (institution !== undefined) request.institution = institution ? institution.trim() : undefined;
    if (test_type) request.test_type = test_type.trim();
    if (priority) request.priority = priority;
    if (description !== undefined) request.description = description ? description.trim() : undefined;
    if (status) request.status = status;

    request.updated_at = new Date();
    await request.save();

    return res.json({
      message: 'Sequencing request updated successfully.',
      request,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update sequencing request.' });
  }
});

// DELETE /api/requests/:id - Admin only deletion
router.delete('/:id', authorizeRoles('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const requestId = parseInt(req.params.id, 10);
    const deleted = await SequencingRequest.findOneAndDelete({ id: requestId });
    if (!deleted) {
      return res.status(404).json({ error: 'Sequencing request not found.' });
    }
    // Also delete associated samples
    await Sample.deleteMany({ request_id: requestId });
    return res.json({ message: 'Sequencing request deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete sequencing request.' });
  }
});

export default router;
