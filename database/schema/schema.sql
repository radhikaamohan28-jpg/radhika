-- ====================================================================
-- GENOMICS SEQUENCING WORKFLOW MANAGEMENT SYSTEM
-- PostgreSQL Database Schema
-- Normalized relational schema with foreign keys, constraints, and indexes
-- ====================================================================

-- 1. Roles table
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL REFERENCES roles(name) ON UPDATE CASCADE,
  status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP WITH TIME ZONE
);

-- 3. Sequencing Requests table
CREATE TABLE IF NOT EXISTS sequencing_requests (
  id SERIAL PRIMARY KEY,
  request_code VARCHAR(50) UNIQUE NOT NULL,
  requester_name VARCHAR(150) NOT NULL,
  requester_email VARCHAR(150) NOT NULL,
  institution VARCHAR(200),
  test_type VARCHAR(100) NOT NULL,
  priority VARCHAR(20) DEFAULT 'STANDARD' CHECK (priority IN ('LOW', 'STANDARD', 'HIGH', 'URGENT')),
  description TEXT,
  status VARCHAR(30) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED')),
  created_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Samples table
CREATE TABLE IF NOT EXISTS samples (
  id SERIAL PRIMARY KEY,
  sample_code VARCHAR(50) UNIQUE NOT NULL,
  request_id INTEGER NOT NULL REFERENCES sequencing_requests(id) ON DELETE CASCADE,
  sample_type VARCHAR(100) NOT NULL,
  organism VARCHAR(100) DEFAULT 'Homo sapiens',
  collection_date DATE NOT NULL,
  registration_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  assigned_technician_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(40) DEFAULT 'REGISTERED' CHECK (status IN (
    'REGISTERED',
    'PROCESSING',
    'PROCESSING_COMPLETED',
    'QC_PASSED',
    'QC_FAILED',
    'SEQUENCING',
    'SEQUENCING_COMPLETED',
    'ANALYSIS',
    'ANALYSIS_COMPLETED',
    'REPORT_GENERATED',
    'UNDER_REVIEW',
    'APPROVED',
    'REJECTED',
    'DELIVERED',
    'CANCELLED'
  )),
  storage_location VARCHAR(100),
  initial_volume_ul NUMERIC(10, 2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Sample Processing table
CREATE TABLE IF NOT EXISTS sample_processing (
  id SERIAL PRIMARY KEY,
  sample_id INTEGER NOT NULL UNIQUE REFERENCES samples(id) ON DELETE CASCADE,
  assigned_technician_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  extraction_method VARCHAR(100),
  buffer_type VARCHAR(100),
  concentration_ng_ul NUMERIC(10, 2),
  volume_ul NUMERIC(10, 2),
  start_time TIMESTAMP WITH TIME ZONE,
  completion_time TIMESTAMP WITH TIME ZONE,
  status VARCHAR(30) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'ON_HOLD')),
  processing_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Quality Checks table
CREATE TABLE IF NOT EXISTS quality_checks (
  id SERIAL PRIMARY KEY,
  qc_code VARCHAR(50) UNIQUE NOT NULL,
  sample_id INTEGER NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
  checked_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  din_rin_score NUMERIC(4, 2),
  a260_a280_ratio NUMERIC(4, 2),
  a260_a230_ratio NUMERIC(4, 2),
  concentration_post_qc NUMERIC(10, 2),
  qc_result VARCHAR(30) DEFAULT 'PENDING_REVIEW' CHECK (qc_result IN ('PENDING_REVIEW', 'PASSED', 'FAILED')),
  failure_reason TEXT,
  qc_comments TEXT,
  qc_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Sequencing Management table
CREATE TABLE IF NOT EXISTS sequencing (
  id SERIAL PRIMARY KEY,
  sequencing_code VARCHAR(50) UNIQUE NOT NULL,
  sample_id INTEGER NOT NULL UNIQUE REFERENCES samples(id) ON DELETE CASCADE,
  instrument_platform VARCHAR(100),
  flowcell_id VARCHAR(100),
  run_mode VARCHAR(50),
  read_length VARCHAR(50),
  target_depth VARCHAR(50),
  assigned_analyst_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  sequencing_status VARCHAR(30) DEFAULT 'PENDING' CHECK (sequencing_status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED')),
  start_date TIMESTAMP WITH TIME ZONE,
  completion_date TIMESTAMP WITH TIME ZONE,
  yield_gb NUMERIC(10, 2),
  q30_percent NUMERIC(5, 2),
  error_rate NUMERIC(5, 3),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Bioinformatics Analysis table
CREATE TABLE IF NOT EXISTS analysis (
  id SERIAL PRIMARY KEY,
  analysis_code VARCHAR(50) UNIQUE NOT NULL,
  sample_id INTEGER NOT NULL UNIQUE REFERENCES samples(id) ON DELETE CASCADE,
  assigned_analyst_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  pipeline_name VARCHAR(100),
  reference_genome VARCHAR(50) DEFAULT 'GRCh38 / hg38',
  analysis_status VARCHAR(30) DEFAULT 'PENDING' CHECK (analysis_status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REQUIRES_REVIEW')),
  start_date TIMESTAMP WITH TIME ZONE,
  completion_date TIMESTAMP WITH TIME ZONE,
  total_reads BIGINT,
  mapped_reads_pct NUMERIC(5, 2),
  mean_coverage NUMERIC(8, 2),
  variants_called INTEGER,
  result_summary TEXT,
  analysis_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Reports table
CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  report_code VARCHAR(50) UNIQUE NOT NULL,
  sample_id INTEGER NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
  request_id INTEGER NOT NULL REFERENCES sequencing_requests(id) ON DELETE CASCADE,
  analysis_id INTEGER REFERENCES analysis(id) ON DELETE SET NULL,
  report_title VARCHAR(200) NOT NULL,
  report_summary TEXT,
  findings_summary TEXT,
  clinical_significance TEXT,
  generated_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approved_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  report_status VARCHAR(30) DEFAULT 'DRAFT' CHECK (report_status IN ('DRAFT', 'GENERATED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'DELIVERED')),
  rejection_reason TEXT,
  reviewer_comments TEXT,
  generated_date TIMESTAMP WITH TIME ZONE,
  review_date TIMESTAMP WITH TIME ZONE,
  approval_date TIMESTAMP WITH TIME ZONE,
  delivery_date TIMESTAMP WITH TIME ZONE,
  delivery_recipient VARCHAR(150),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Sample Workflow Traceability / History table
CREATE TABLE IF NOT EXISTS workflow_history (
  id SERIAL PRIMARY KEY,
  sample_id INTEGER NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  previous_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  user_name VARCHAR(150),
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for high-performance querying and joins
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_requests_status ON sequencing_requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_code ON sequencing_requests(request_code);
CREATE INDEX IF NOT EXISTS idx_samples_status ON samples(status);
CREATE INDEX IF NOT EXISTS idx_samples_code ON samples(sample_code);
CREATE INDEX IF NOT EXISTS idx_samples_request_id ON samples(request_id);
CREATE INDEX IF NOT EXISTS idx_sample_processing_sample_id ON sample_processing(sample_id);
CREATE INDEX IF NOT EXISTS idx_quality_checks_sample_id ON quality_checks(sample_id);
CREATE INDEX IF NOT EXISTS idx_sequencing_sample_id ON sequencing(sample_id);
CREATE INDEX IF NOT EXISTS idx_analysis_sample_id ON analysis(sample_id);
CREATE INDEX IF NOT EXISTS idx_reports_sample_id ON reports(sample_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(report_status);
CREATE INDEX IF NOT EXISTS idx_workflow_history_sample_id ON workflow_history(sample_id);
CREATE INDEX IF NOT EXISTS idx_workflow_history_created_at ON workflow_history(created_at);
