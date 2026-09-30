import { Router } from 'express';
import { 
  Report, 
  Sample, 
  SequencingRequest, 
  Analysis, 
  User, 
  getNextSequence 
} from '../models/index.js';
import { authenticateToken, authorizeRoles, AuthRequest } from '../middleware/auth.js';
import { recordWorkflowHistory } from '../utils/history.js';

const router = Router();
router.use(authenticateToken);

// GET /api/reports - List reports with filters
router.get('/', async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter: any = {};

    if (status) {
      filter.report_status = status;
    }

    if (search) {
      const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { report_code: { $regex: escaped, $options: 'i' } },
        { report_title: { $regex: escaped, $options: 'i' } },
        { report_summary: { $regex: escaped, $options: 'i' } },
      ];
    }

    const reports = await Report.find(filter)
      .sort({ updated_at: -1, id: -1 })
      .lean();

    const enriched = await Promise.all(
      reports.map(async (rep) => {
        const [sample, request, gen, rev, app] = await Promise.all([
          Sample.findOne({ id: rep.sample_id }).select('sample_code sample_type').lean(),
          SequencingRequest.findOne({ id: rep.request_id }).select('request_code test_type requester_name requester_email').lean(),
          rep.generated_by_id ? User.findOne({ id: rep.generated_by_id }).select('name').lean() : null,
          rep.reviewed_by_id ? User.findOne({ id: rep.reviewed_by_id }).select('name').lean() : null,
          rep.approved_by_id ? User.findOne({ id: rep.approved_by_id }).select('name').lean() : null,
        ]);

        return {
          ...rep,
          sample_code: sample?.sample_code,
          sample_type: sample?.sample_type,
          request_code: request?.request_code,
          test_type: request?.test_type,
          requester_name: request?.requester_name,
          requester_email: request?.requester_email,
          generated_by_name: gen?.name,
          reviewed_by_name: rev?.name,
          approved_by_name: app?.name,
        };
      })
    );

    let finalResults = enriched;
    if (search) {
      const term = String(search).toLowerCase();
      finalResults = enriched.filter(
        (r) =>
          r.report_code.toLowerCase().includes(term) ||
          r.report_title.toLowerCase().includes(term) ||
          (r.sample_code && r.sample_code.toLowerCase().includes(term)) ||
          (r.request_code && r.request_code.toLowerCase().includes(term)) ||
          (r.requester_name && r.requester_name.toLowerCase().includes(term))
      );
    }

    return res.json({ reports: finalResults });
  } catch (error) {
    console.error('Error fetching reports from MongoDB:', error);
    return res.status(500).json({ error: 'Failed to retrieve reports.' });
  }
});

// GET /api/reports/:id - Get full report details
router.get('/:id', async (req, res) => {
  try {
    const reportId = parseInt(req.params.id, 10);
    const report = await Report.findOne({ id: reportId }).lean();

    if (!report) {
      return res.status(404).json({ error: 'Report not found.' });
    }

    const [sample, request, analysis, gen, rev, app] = await Promise.all([
      Sample.findOne({ id: report.sample_id }).lean(),
      SequencingRequest.findOne({ id: report.request_id }).lean(),
      report.analysis_id ? Analysis.findOne({ id: report.analysis_id }).lean() : null,
      report.generated_by_id ? User.findOne({ id: report.generated_by_id }).select('name').lean() : null,
      report.reviewed_by_id ? User.findOne({ id: report.reviewed_by_id }).select('name').lean() : null,
      report.approved_by_id ? User.findOne({ id: report.approved_by_id }).select('name').lean() : null,
    ]);

    return res.json({
      report: {
        ...report,
        sample_code: sample?.sample_code,
        sample_type: sample?.sample_type,
        organism: sample?.organism,
        collection_date: sample?.collection_date,
        request_code: request?.request_code,
        test_type: request?.test_type,
        requester_name: request?.requester_name,
        requester_email: request?.requester_email,
        institution: request?.institution,
        priority: request?.priority,
        pipeline_name: analysis?.pipeline_name,
        reference_genome: analysis?.reference_genome,
        mean_coverage: analysis?.mean_coverage,
        variants_called: analysis?.variants_called,
        total_reads: analysis?.total_reads,
        generated_by_name: gen?.name,
        reviewed_by_name: rev?.name,
        approved_by_name: app?.name,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve report details.' });
  }
});

// POST /api/reports - Generate a new report from completed analysis
router.post('/', authorizeRoles('ADMIN', 'BIOINFORMATICS_ANALYST'), async (req: AuthRequest, res) => {
  try {
    const { sample_id, report_title, report_summary, findings_summary, clinical_significance } = req.body;

    if (!sample_id || !report_title) {
      return res.status(400).json({ error: 'Sample ID and report title are required.' });
    }

    const sample = await Sample.findOne({ id: parseInt(sample_id, 10) });
    if (!sample) {
      return res.status(404).json({ error: 'Sample not found.' });
    }

    const analysis = await Analysis.findOne({ sample_id: sample.id });

    const year = new Date().getFullYear();
    const count = await Report.countDocuments();
    const seqNum = String(count + 1).padStart(3, '0');
    const reportCode = `REP-${year}-${seqNum}`;
    const nextReportId = await getNextSequence('reports');

    const previousStatus = sample.status;

    const report = await Report.create({
      id: nextReportId,
      report_code: reportCode,
      sample_id: sample.id,
      request_id: sample.request_id,
      analysis_id: analysis?.id,
      report_title: report_title.trim(),
      report_summary: report_summary ? report_summary.trim() : undefined,
      findings_summary: findings_summary ? findings_summary.trim() : analysis?.result_summary,
      clinical_significance: clinical_significance ? clinical_significance.trim() : undefined,
      generated_by_id: req.user!.id,
      report_status: 'UNDER_REVIEW',
      generated_date: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    });

    sample.status = 'UNDER_REVIEW';
    sample.updated_at = new Date();
    await sample.save();

    await recordWorkflowHistory({
      sampleId: sample.id,
      eventType: 'Report Generated & Submitted for Review',
      previousStatus,
      newStatus: 'UNDER_REVIEW',
      userId: req.user!.id,
      userName: req.user!.name,
      comments: `Report draft ${reportCode} generated: "${report_title}". Submitted to Scientific Reviewer.`,
    });

    return res.status(201).json({
      message: 'Report generated and submitted for scientific review.',
      report,
    });
  } catch (error: any) {
    console.error('Error generating report in MongoDB:', error);
    return res.status(500).json({ error: 'Failed to generate report.' });
  }
});

// POST /api/reports/:id/approve - Reviewer / Scientist approves report
router.post('/:id/approve', authorizeRoles('ADMIN', 'REVIEWER'), async (req: AuthRequest, res) => {
  try {
    const reportId = parseInt(req.params.id, 10);
    const { comments } = req.body;

    const report = await Report.findOne({ id: reportId });
    if (!report) {
      return res.status(404).json({ error: 'Report not found.' });
    }

    const sample = await Sample.findOne({ id: report.sample_id });
    const previousStatus = sample ? sample.status : 'UNDER_REVIEW';

    report.report_status = 'APPROVED';
    report.reviewed_by_id = report.reviewed_by_id || req.user!.id;
    report.approved_by_id = req.user!.id;
    report.approval_date = new Date();
    report.review_date = report.review_date || new Date();
    report.reviewer_comments = comments || 'Clinically validated and approved for final delivery.';
    report.updated_at = new Date();
    await report.save();

    if (sample) {
      sample.status = 'APPROVED';
      sample.updated_at = new Date();
      await sample.save();
    }

    await recordWorkflowHistory({
      sampleId: report.sample_id,
      eventType: 'Report Approved',
      previousStatus,
      newStatus: 'APPROVED',
      userId: req.user!.id,
      userName: req.user!.name,
      comments: comments ? `Report approved: ${comments}` : 'Report approved by Senior Scientist / Reviewer.',
    });

    return res.json({
      message: 'Report approved successfully.',
      report,
    });
  } catch (error: any) {
    console.error('Error approving report in MongoDB:', error);
    return res.status(500).json({ error: 'Failed to approve report.' });
  }
});

// POST /api/reports/:id/reject - Reviewer / Scientist rejects report
router.post('/:id/reject', authorizeRoles('ADMIN', 'REVIEWER'), async (req: AuthRequest, res) => {
  try {
    const reportId = parseInt(req.params.id, 10);
    const { rejection_reason, comments } = req.body;

    if (!rejection_reason || rejection_reason.trim().length === 0) {
      return res.status(400).json({ error: 'A specific rejection reason is mandatory when rejecting a report.' });
    }

    const report = await Report.findOne({ id: reportId });
    if (!report) {
      return res.status(404).json({ error: 'Report not found.' });
    }

    const sample = await Sample.findOne({ id: report.sample_id });
    const previousStatus = sample ? sample.status : 'UNDER_REVIEW';

    report.report_status = 'REJECTED';
    report.reviewed_by_id = req.user!.id;
    report.review_date = new Date();
    report.rejection_reason = rejection_reason.trim();
    if (comments) report.reviewer_comments = comments;
    report.updated_at = new Date();
    await report.save();

    if (sample) {
      sample.status = 'REJECTED';
      sample.updated_at = new Date();
      await sample.save();
    }

    await recordWorkflowHistory({
      sampleId: report.sample_id,
      eventType: 'Report Rejected',
      previousStatus,
      newStatus: 'REJECTED',
      userId: req.user!.id,
      userName: req.user!.name,
      comments: `Report rejected. Reason: ${rejection_reason.trim()}. Sent back for bioinformatic correction.`,
    });

    return res.json({
      message: 'Report marked as rejected with comments.',
      report,
    });
  } catch (error: any) {
    console.error('Error rejecting report in MongoDB:', error);
    return res.status(500).json({ error: 'Failed to reject report.' });
  }
});

// POST /api/reports/:id/deliver - Deliver approved report
router.post('/:id/deliver', authorizeRoles('ADMIN', 'REVIEWER'), async (req: AuthRequest, res) => {
  try {
    const reportId = parseInt(req.params.id, 10);
    const { recipient_email } = req.body;

    const report = await Report.findOne({ id: reportId });
    if (!report) {
      return res.status(404).json({ error: 'Report not found.' });
    }

    if (report.report_status !== 'APPROVED') {
      return res.status(400).json({
        error: `Cannot deliver report. Current status is '${report.report_status}'. Report must be APPROVED before delivery.`
      });
    }

    const request = await SequencingRequest.findOne({ id: report.request_id });
    const deliveryRecipient = recipient_email || request?.requester_email || 'client@genomics.lab';

    report.report_status = 'DELIVERED';
    report.delivery_date = new Date();
    report.delivery_recipient = deliveryRecipient;
    report.updated_at = new Date();
    await report.save();

    const sample = await Sample.findOne({ id: report.sample_id });
    if (sample) {
      sample.status = 'DELIVERED';
      sample.updated_at = new Date();
      await sample.save();
    }

    // Check if all samples for this request are delivered, if so mark request COMPLETED
    const remainingCount = await Sample.countDocuments({
      request_id: report.request_id,
      status: { $nin: ['DELIVERED', 'CANCELLED'] }
    });

    if (remainingCount === 0 && request) {
      request.status = 'COMPLETED';
      request.updated_at = new Date();
      await request.save();
    }

    await recordWorkflowHistory({
      sampleId: report.sample_id,
      eventType: 'Report Delivered',
      previousStatus: 'APPROVED',
      newStatus: 'DELIVERED',
      userId: req.user!.id,
      userName: req.user!.name,
      comments: `Report delivered to authorized recipient: ${deliveryRecipient}. Final workflow stage concluded.`,
    });

    return res.json({
      message: 'Report successfully delivered.',
      report,
    });
  } catch (error: any) {
    console.error('Error delivering report in MongoDB:', error);
    return res.status(500).json({ error: 'Failed to deliver report.' });
  }
});

export default router;
