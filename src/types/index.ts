export type UserRole = 'ADMIN' | 'LAB_TECHNICIAN' | 'BIOINFORMATICS_ANALYST' | 'REVIEWER';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  created_at?: string;
  updated_at?: string;
  last_login?: string;
}

export type RequestStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
export type RequestPriority = 'URGENT' | 'HIGH' | 'STANDARD' | 'LOW';

export interface SequencingRequest {
  id: number;
  request_code: string;
  requester_name: string;
  requester_email: string;
  institution?: string;
  test_type: string;
  priority: RequestPriority;
  description?: string;
  status: RequestStatus;
  created_by_id?: number;
  created_by_name?: string;
  sample_count?: number;
  created_at: string;
  updated_at: string;
}

export type SampleStatus = 
  | 'REGISTERED' 
  | 'PROCESSING' 
  | 'PROCESSING_COMPLETED' 
  | 'QC_PASSED' 
  | 'QC_FAILED' 
  | 'SEQUENCING' 
  | 'SEQUENCING_COMPLETED' 
  | 'ANALYSIS' 
  | 'ANALYSIS_COMPLETED' 
  | 'UNDER_REVIEW' 
  | 'APPROVED' 
  | 'REJECTED' 
  | 'DELIVERED' 
  | 'CANCELLED';

export interface Sample {
  id: number;
  sample_code: string;
  request_id: number;
  request_code?: string;
  test_type?: string;
  requester_name?: string;
  sample_type: string;
  organism: string;
  collection_date: string;
  registration_date: string;
  assigned_technician_id?: number;
  assigned_technician_name?: string;
  status: SampleStatus;
  storage_location?: string;
  initial_volume_ul?: number;
  notes?: string;
  qc_result?: 'PASSED' | 'FAILED' | 'PENDING_REVIEW';
  sequencing_status?: string;
  analysis_status?: string;
  report_status?: string;
  created_at: string;
  updated_at: string;
}

export interface SampleProcessing {
  id: number;
  sample_id: number;
  sample_code?: string;
  sample_status?: SampleStatus;
  sample_type?: string;
  request_code?: string;
  test_type?: string;
  priority?: RequestPriority;
  assigned_technician_id?: number;
  technician_name?: string;
  extraction_method?: string;
  buffer_type?: string;
  concentration_ng_ul?: number;
  volume_ul?: number;
  start_time?: string;
  completion_time?: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'ON_HOLD';
  processing_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface QualityCheck {
  id: number;
  qc_code: string;
  sample_id: number;
  sample_code?: string;
  sample_status?: SampleStatus;
  sample_type?: string;
  request_code?: string;
  test_type?: string;
  priority?: RequestPriority;
  checked_by_id?: number;
  checked_by_name?: string;
  din_rin_score?: number;
  a260_a280_ratio?: number;
  a260_a230_ratio?: number;
  concentration_post_qc?: number;
  qc_result: 'PENDING_REVIEW' | 'PASSED' | 'FAILED';
  failure_reason?: string;
  qc_comments?: string;
  qc_date: string;
  updated_at: string;
}

export interface SequencingRun {
  id: number;
  sequencing_code: string;
  sample_id: number;
  sample_code?: string;
  sample_status?: SampleStatus;
  sample_type?: string;
  request_code?: string;
  test_type?: string;
  priority?: RequestPriority;
  instrument_platform: string;
  flowcell_id: string;
  run_mode?: string;
  read_length?: string;
  target_depth?: string;
  assigned_analyst_id?: number;
  analyst_name?: string;
  sequencing_status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  start_date?: string;
  completion_date?: string;
  yield_gb?: number;
  q30_percent?: number;
  error_rate?: number;
  notes?: string;
  updated_at: string;
}

export interface AnalysisRun {
  id: number;
  analysis_code: string;
  sample_id: number;
  sample_code?: string;
  sample_status?: SampleStatus;
  sample_type?: string;
  request_code?: string;
  test_type?: string;
  priority?: RequestPriority;
  assigned_analyst_id?: number;
  analyst_name?: string;
  analysis_status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REQUIRES_REVIEW';
  pipeline_name?: string;
  reference_genome?: string;
  start_date?: string;
  completion_date?: string;
  total_reads?: number;
  mapped_reads_pct?: number;
  mean_coverage?: number;
  variants_called?: number;
  result_summary?: string;
  analysis_notes?: string;
  updated_at: string;
}

export type ReportStatus = 'DRAFT' | 'GENERATED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'DELIVERED';

export interface GenomicReport {
  id: number;
  report_code: string;
  sample_id: number;
  sample_code?: string;
  sample_type?: string;
  organism?: string;
  collection_date?: string;
  request_id: number;
  request_code?: string;
  test_type?: string;
  requester_name?: string;
  requester_email?: string;
  institution?: string;
  priority?: RequestPriority;
  analysis_id?: number;
  pipeline_name?: string;
  reference_genome?: string;
  mean_coverage?: number;
  variants_called?: number;
  total_reads?: number;
  report_title: string;
  report_summary?: string;
  findings_summary?: string;
  clinical_significance?: string;
  generated_by_id?: number;
  generated_by_name?: string;
  reviewed_by_id?: number;
  reviewed_by_name?: string;
  approved_by_id?: number;
  approved_by_name?: string;
  report_status: ReportStatus;
  rejection_reason?: string;
  reviewer_comments?: string;
  delivery_recipient?: string;
  generated_date?: string;
  review_date?: string;
  approval_date?: string;
  delivery_date?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowHistoryItem {
  id: number;
  sample_id: number;
  sample_code?: string;
  request_code?: string;
  event_type: string;
  previous_status: string | null;
  new_status: string;
  user_id?: number;
  user_name?: string;
  user_role?: UserRole;
  user_email?: string;
  comments?: string;
  created_at: string;
}

export interface DashboardStats {
  totalRequests: number;
  pendingRequests: number;
  processingRequests: number;
  completedRequests: number;

  totalSamples: number;
  registeredSamples: number;
  samplesProcessing: number;
  qcPassed: number;
  qcFailed: number;
  sequencingInProgress: number;
  sequencingCompleted: number;
  analysisInProgress: number;
  analysisCompleted: number;
  underReviewSamples: number;
  approvedSamples: number;
  deliveredSamples: number;

  totalReports: number;
  reportsAwaitingReview: number;
  reportsApproved: number;
  reportsRejected: number;
  reportsDelivered: number;
}

export interface MonthlyVolumeMetric {
  month: string;              // e.g. "Oct 2025"
  shortMonth: string;         // e.g. "Oct"
  processedVolume: number;    // Samples processed/extracted
  sequencingVolume: number;   // Samples sequenced
  analysisVolume: number;     // Bioinformatics analyzed
  deliveredVolume: number;    // Reports approved/delivered
  avgTurnaroundDays: number;  // Measured average TAT in days
  targetTurnaroundDays: number; // Target SLA threshold (e.g. 7.0 days)
}

export interface StageTurnaroundMetric {
  stage: string;
  avgHours: number;
  targetHours: number;
  color: string;
}

export interface TatSummaryMetrics {
  overallAvgDays: number;
  targetSlaDays: number;
  slaComplianceRate: number;
  momVolumeGrowth: number;
  currentMonthVolume: number;
}

export interface DashboardData {
  stats: DashboardStats;
  statusDistribution: { status: SampleStatus; count: number }[];
  testTypeDistribution: { test_type: string; count: number }[];
  recentActivity: WorkflowHistoryItem[];
  recentRequests: SequencingRequest[];
  actionItems: { title: string; items: any[] }[];
  monthlyMetrics: MonthlyVolumeMetric[];
  stageTurnaroundMetrics: StageTurnaroundMetric[];
  tatSummary: TatSummaryMetrics;
}
