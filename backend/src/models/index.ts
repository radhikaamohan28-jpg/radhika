import mongoose, { Schema, Model } from 'mongoose';

// ==========================================
// 1. Counter Model (for auto-increment IDs)
// ==========================================
export interface ICounter {
  _id: string;
  seq: number;
}

const counterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export const Counter: Model<ICounter> = mongoose.models.Counter || mongoose.model<ICounter>('Counter', counterSchema);

export async function getNextSequence(sequenceName: string): Promise<number> {
  const counter = await Counter.findOneAndUpdate(
    { _id: sequenceName },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter ? counter.seq : 1;
}

// ==========================================
// 2. Role Model
// ==========================================
export interface IRole {
  id: number;
  name: string;
  description: string;
  created_at: Date;
}

const roleSchema = new Schema<IRole>({
  id: { type: Number, unique: true, index: true },
  name: { type: String, required: true, unique: true, index: true },
  description: { type: String },
  created_at: { type: Date, default: Date.now },
});

export const Role: Model<IRole> = mongoose.models.Role || mongoose.model<IRole>('Role', roleSchema);

// ==========================================
// 3. User Model
// ==========================================
export interface IUser {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: 'ADMIN' | 'LAB_TECHNICIAN' | 'BIOINFORMATICS_ANALYST' | 'REVIEWER';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  created_at: Date;
  updated_at: Date;
  last_login?: Date;
}

const userSchema = new Schema<IUser>({
  id: { type: Number, required: true, unique: true, index: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  password_hash: { type: String, required: true },
  role: { 
    type: String, 
    required: true, 
    enum: ['ADMIN', 'LAB_TECHNICIAN', 'BIOINFORMATICS_ANALYST', 'REVIEWER'],
    index: true 
  },
  status: { 
    type: String, 
    enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'], 
    default: 'ACTIVE',
    index: true
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  last_login: { type: Date },
});

userSchema.pre('save', function () {
  this.updated_at = new Date();
});

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', userSchema);

// ==========================================
// 4. SequencingRequest Model
// ==========================================
export interface ISequencingRequest {
  id: number;
  request_code: string;
  requester_name: string;
  requester_email: string;
  institution?: string;
  test_type: string;
  priority: 'LOW' | 'STANDARD' | 'HIGH' | 'URGENT';
  description?: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
  created_by_id?: number;
  created_at: Date;
  updated_at: Date;
}

const sequencingRequestSchema = new Schema<ISequencingRequest>({
  id: { type: Number, required: true, unique: true, index: true },
  request_code: { type: String, required: true, unique: true, trim: true, index: true },
  requester_name: { type: String, required: true, trim: true },
  requester_email: { type: String, required: true, lowercase: true, trim: true },
  institution: { type: String, trim: true },
  test_type: { type: String, required: true, trim: true },
  priority: { 
    type: String, 
    enum: ['LOW', 'STANDARD', 'HIGH', 'URGENT'], 
    default: 'STANDARD',
    index: true 
  },
  description: { type: String },
  status: { 
    type: String, 
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED'], 
    default: 'PENDING',
    index: true 
  },
  created_by_id: { type: Number, index: true },
  created_at: { type: Date, default: Date.now, index: true },
  updated_at: { type: Date, default: Date.now },
});

sequencingRequestSchema.pre('save', function () {
  this.updated_at = new Date();
});

export const SequencingRequest: Model<ISequencingRequest> = 
  mongoose.models.SequencingRequest || mongoose.model<ISequencingRequest>('SequencingRequest', sequencingRequestSchema);

// ==========================================
// 5. Sample Model
// ==========================================
export interface ISample {
  id: number;
  sample_code: string;
  request_id: number;
  sample_type: string;
  organism: string;
  collection_date: Date;
  registration_date: Date;
  assigned_technician_id?: number;
  status: 
    | 'REGISTERED' 
    | 'PROCESSING' 
    | 'PROCESSING_COMPLETED' 
    | 'QC_PASSED' 
    | 'QC_FAILED' 
    | 'SEQUENCING' 
    | 'SEQUENCING_COMPLETED' 
    | 'ANALYSIS' 
    | 'ANALYSIS_COMPLETED' 
    | 'REPORT_GENERATED' 
    | 'UNDER_REVIEW' 
    | 'APPROVED' 
    | 'REJECTED' 
    | 'DELIVERED' 
    | 'CANCELLED';
  storage_location?: string;
  initial_volume_ul?: number;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

const sampleSchema = new Schema<ISample>({
  id: { type: Number, required: true, unique: true, index: true },
  sample_code: { type: String, required: true, unique: true, trim: true, index: true },
  request_id: { type: Number, required: true, index: true },
  sample_type: { type: String, required: true, trim: true },
  organism: { type: String, default: 'Homo sapiens' },
  collection_date: { type: Date, required: true },
  registration_date: { type: Date, default: Date.now, index: true },
  assigned_technician_id: { type: Number, index: true },
  status: { 
    type: String, 
    required: true, 
    default: 'REGISTERED',
    index: true 
  },
  storage_location: { type: String },
  initial_volume_ul: { type: Number },
  notes: { type: String },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

sampleSchema.pre('save', function () {
  this.updated_at = new Date();
});

export const Sample: Model<ISample> = 
  mongoose.models.Sample || mongoose.model<ISample>('Sample', sampleSchema);

// ==========================================
// 6. SampleProcessing Model
// ==========================================
export interface ISampleProcessing {
  id: number;
  sample_id: number;
  assigned_technician_id?: number;
  extraction_method?: string;
  buffer_type?: string;
  concentration_ng_ul?: number;
  volume_ul?: number;
  start_time?: Date;
  completion_time?: Date;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'ON_HOLD';
  processing_notes?: string;
  created_at: Date;
  updated_at: Date;
}

const sampleProcessingSchema = new Schema<ISampleProcessing>({
  id: { type: Number, required: true, unique: true, index: true },
  sample_id: { type: Number, required: true, unique: true, index: true },
  assigned_technician_id: { type: Number, index: true },
  extraction_method: { type: String },
  buffer_type: { type: String },
  concentration_ng_ul: { type: Number },
  volume_ul: { type: Number },
  start_time: { type: Date },
  completion_time: { type: Date },
  status: { 
    type: String, 
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'ON_HOLD'], 
    default: 'PENDING',
    index: true 
  },
  processing_notes: { type: String },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

sampleProcessingSchema.pre('save', function () {
  this.updated_at = new Date();
});

export const SampleProcessing: Model<ISampleProcessing> = 
  mongoose.models.SampleProcessing || mongoose.model<ISampleProcessing>('SampleProcessing', sampleProcessingSchema);

// ==========================================
// 7. QualityCheck Model
// ==========================================
export interface IQualityCheck {
  id: number;
  qc_code: string;
  sample_id: number;
  checked_by_id?: number;
  din_rin_score?: number;
  a260_a280_ratio?: number;
  a260_a230_ratio?: number;
  concentration_post_qc?: number;
  qc_result: 'PENDING_REVIEW' | 'PASSED' | 'FAILED';
  failure_reason?: string;
  qc_comments?: string;
  qc_date: Date;
  created_at: Date;
  updated_at: Date;
}

const qualityCheckSchema = new Schema<IQualityCheck>({
  id: { type: Number, required: true, unique: true, index: true },
  qc_code: { type: String, required: true, unique: true, trim: true, index: true },
  sample_id: { type: Number, required: true, unique: true, index: true },
  checked_by_id: { type: Number, index: true },
  din_rin_score: { type: Number },
  a260_a280_ratio: { type: Number },
  a260_a230_ratio: { type: Number },
  concentration_post_qc: { type: Number },
  qc_result: { 
    type: String, 
    enum: ['PENDING_REVIEW', 'PASSED', 'FAILED'], 
    default: 'PENDING_REVIEW',
    index: true 
  },
  failure_reason: { type: String },
  qc_comments: { type: String },
  qc_date: { type: Date, default: Date.now, index: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

qualityCheckSchema.pre('save', function () {
  this.updated_at = new Date();
});

export const QualityCheck: Model<IQualityCheck> = 
  mongoose.models.QualityCheck || mongoose.model<IQualityCheck>('QualityCheck', qualityCheckSchema);

// ==========================================
// 8. Sequencing Model
// ==========================================
export interface ISequencing {
  id: number;
  sequencing_code: string;
  sample_id: number;
  instrument_platform: string;
  flowcell_id: string;
  run_mode?: string;
  read_length?: string;
  target_depth?: string;
  assigned_analyst_id?: number;
  sequencing_status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  start_date?: Date;
  completion_date?: Date;
  yield_gb?: number;
  q30_percent?: number;
  error_rate?: number;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

const sequencingSchema = new Schema<ISequencing>({
  id: { type: Number, required: true, unique: true, index: true },
  sequencing_code: { type: String, required: true, unique: true, trim: true, index: true },
  sample_id: { type: Number, required: true, unique: true, index: true },
  instrument_platform: { type: String, required: true },
  flowcell_id: { type: String, required: true },
  run_mode: { type: String },
  read_length: { type: String },
  target_depth: { type: String },
  assigned_analyst_id: { type: Number, index: true },
  sequencing_status: { 
    type: String, 
    enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED'], 
    default: 'PENDING',
    index: true 
  },
  start_date: { type: Date },
  completion_date: { type: Date },
  yield_gb: { type: Number },
  q30_percent: { type: Number },
  error_rate: { type: Number },
  notes: { type: String },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

sequencingSchema.pre('save', function () {
  this.updated_at = new Date();
});

export const Sequencing: Model<ISequencing> = 
  mongoose.models.Sequencing || mongoose.model<ISequencing>('Sequencing', sequencingSchema);

// ==========================================
// 9. Analysis Model
// ==========================================
export interface IAnalysis {
  id: number;
  analysis_code: string;
  sample_id: number;
  assigned_analyst_id?: number;
  pipeline_name?: string;
  reference_genome?: string;
  analysis_status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REQUIRES_REVIEW';
  start_date?: Date;
  completion_date?: Date;
  total_reads?: number;
  mapped_reads_pct?: number;
  mean_coverage?: number;
  variants_called?: number;
  result_summary?: string;
  analysis_notes?: string;
  created_at: Date;
  updated_at: Date;
}

const analysisSchema = new Schema<IAnalysis>({
  id: { type: Number, required: true, unique: true, index: true },
  analysis_code: { type: String, required: true, unique: true, trim: true, index: true },
  sample_id: { type: Number, required: true, unique: true, index: true },
  assigned_analyst_id: { type: Number, index: true },
  pipeline_name: { type: String },
  reference_genome: { type: String, default: 'GRCh38 / hg38' },
  analysis_status: { 
    type: String, 
    enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'REQUIRES_REVIEW'], 
    default: 'PENDING',
    index: true 
  },
  start_date: { type: Date },
  completion_date: { type: Date },
  total_reads: { type: Number },
  mapped_reads_pct: { type: Number },
  mean_coverage: { type: Number },
  variants_called: { type: Number },
  result_summary: { type: String },
  analysis_notes: { type: String },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

analysisSchema.pre('save', function () {
  this.updated_at = new Date();
});

export const Analysis: Model<IAnalysis> = 
  mongoose.models.Analysis || mongoose.model<IAnalysis>('Analysis', analysisSchema);

// ==========================================
// 10. Report Model
// ==========================================
export interface IReport {
  id: number;
  report_code: string;
  sample_id: number;
  request_id: number;
  analysis_id?: number;
  report_title: string;
  report_summary?: string;
  findings_summary?: string;
  clinical_significance?: string;
  generated_by_id?: number;
  reviewed_by_id?: number;
  approved_by_id?: number;
  report_status: 'DRAFT' | 'GENERATED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'DELIVERED';
  rejection_reason?: string;
  reviewer_comments?: string;
  generated_date?: Date;
  review_date?: Date;
  approval_date?: Date;
  delivery_date?: Date;
  delivery_recipient?: string;
  created_at: Date;
  updated_at: Date;
}

const reportSchema = new Schema<IReport>({
  id: { type: Number, required: true, unique: true, index: true },
  report_code: { type: String, required: true, unique: true, trim: true, index: true },
  sample_id: { type: Number, required: true, unique: true, index: true },
  request_id: { type: Number, required: true, index: true },
  analysis_id: { type: Number, index: true },
  report_title: { type: String, required: true, trim: true },
  report_summary: { type: String },
  findings_summary: { type: String },
  clinical_significance: { type: String },
  generated_by_id: { type: Number, index: true },
  reviewed_by_id: { type: Number, index: true },
  approved_by_id: { type: Number, index: true },
  report_status: { 
    type: String, 
    enum: ['DRAFT', 'GENERATED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'DELIVERED'], 
    default: 'DRAFT',
    index: true 
  },
  rejection_reason: { type: String },
  reviewer_comments: { type: String },
  generated_date: { type: Date },
  review_date: { type: Date },
  approval_date: { type: Date },
  delivery_date: { type: Date },
  delivery_recipient: { type: String },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

reportSchema.pre('save', function () {
  this.updated_at = new Date();
});

export const Report: Model<IReport> = 
  mongoose.models.Report || mongoose.model<IReport>('Report', reportSchema);

// ==========================================
// 11. WorkflowHistory Model
// ==========================================
export interface IWorkflowHistory {
  id: number;
  sample_id: number;
  event_type: string;
  previous_status?: string | null;
  new_status: string;
  user_id?: number | null;
  user_name?: string | null;
  comments?: string | null;
  created_at: Date;
}

const workflowHistorySchema = new Schema<IWorkflowHistory>({
  id: { type: Number, required: true, unique: true, index: true },
  sample_id: { type: Number, required: true, index: true },
  event_type: { type: String, required: true },
  previous_status: { type: String, default: null },
  new_status: { type: String, required: true },
  user_id: { type: Number, default: null },
  user_name: { type: String, default: null },
  comments: { type: String, default: null },
  created_at: { type: Date, default: Date.now, index: true },
});

export const WorkflowHistory: Model<IWorkflowHistory> = 
  mongoose.models.WorkflowHistory || mongoose.model<IWorkflowHistory>('WorkflowHistory', workflowHistorySchema);
