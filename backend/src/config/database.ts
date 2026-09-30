import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { 
  User, 
  Role, 
  SequencingRequest, 
  Sample, 
  SampleProcessing, 
  QualityCheck, 
  Sequencing, 
  Analysis, 
  Report, 
  WorkflowHistory, 
  Counter 
} from '../models/index.js';

let mongodInstance: MongoMemoryServer | null = null;
let isConnected = false;

export async function connectDb(): Promise<typeof mongoose> {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose;
  }

  const mongoUriEnv = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (mongoUriEnv) {
    console.log(`Connecting to external MongoDB cluster at ${mongoUriEnv.replace(/:\/\/[^@]+@/, '://***:***@')}...`);
    try {
      await mongoose.connect(mongoUriEnv);
      isConnected = true;
      console.log('MongoDB successfully connected via MONGODB_URI.');
      await seedMongoData();
      return mongoose;
    } catch (err) {
      console.error('Failed to connect to provided MONGODB_URI, falling back to embedded MongoDB server:', err);
    }
  }

  // Use embedded MongoDB with persistent storage directory
  try {
    const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'database', 'mongodata');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    console.log('Starting high-performance embedded MongoDB engine...');
    mongodInstance = await MongoMemoryServer.create({
      instance: {
        dbName: 'genomics_workflow',
        dbPath: dataDir,
        storageEngine: 'wiredTiger',
      },
    });

    const uri = mongodInstance.getUri();
    console.log(`MongoDB Server started at ${uri}`);
    await mongoose.connect(uri);
    isConnected = true;
    console.log('MongoDB Mongoose connection established.');
    await seedMongoData();
    return mongoose;
  } catch (error) {
    console.warn('Persistent WiredTiger startup encountered notice, launching memory instance:', error);
    try {
      mongodInstance = await MongoMemoryServer.create({
        instance: { dbName: 'genomics_workflow' }
      });
      const uri = mongodInstance.getUri();
      await mongoose.connect(uri);
      isConnected = true;
      console.log(`In-memory MongoDB ready at ${uri}`);
      await seedMongoData();
      return mongoose;
    } catch (fallbackErr) {
      console.error('Fatal MongoDB Initialization Error:', fallbackErr);
      throw fallbackErr;
    }
  }
}

export async function disconnectDb(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongodInstance) {
    await mongodInstance.stop();
  }
  isConnected = false;
}

export async function getDb(): Promise<typeof mongoose> {
  return connectDb();
}

export async function seedMongoData(): Promise<void> {
  try {
    const rolesCount = await Role.countDocuments();
    if (rolesCount > 0) {
      // Sync Admin user name to Radhika loosu in existing database
      await User.updateMany({ role: 'ADMIN' }, { $set: { name: 'Radhika loosu' } });
      return;
    }

    console.log('Seeding initial MongoDB collections with genomics workflow data...');

    // 1. Roles
    await Role.insertMany([
      { id: 1, name: 'ADMIN', description: 'Full system access, user management, and overall laboratory oversight', created_at: new Date() },
      { id: 2, name: 'LAB_TECHNICIAN', description: 'Sample registration, DNA/RNA extraction, sample processing, and QC verification', created_at: new Date() },
      { id: 3, name: 'BIOINFORMATICS_ANALYST', description: 'Sequencing run execution, secondary/tertiary pipeline analysis, variant calling', created_at: new Date() },
      { id: 4, name: 'REVIEWER', description: 'Genomic report clinical review, diagnostic validation, approval and delivery', created_at: new Date() },
    ]);

    // 2. Users
    const salt = await bcrypt.genSalt(10);
    const adminHash = await bcrypt.hash('Admin@123', salt);
    const techHash = await bcrypt.hash('LabTech@123', salt);
    const analystHash = await bcrypt.hash('BioAnalyst@123', salt);
    const reviewerHash = await bcrypt.hash('Reviewer@123', salt);

    const now = new Date();
    const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

    await User.insertMany([
      { id: 1, name: 'Radhika loosu', email: 'admin@genomics.lab', password_hash: adminHash, role: 'ADMIN', status: 'ACTIVE', created_at: daysAgo(30), updated_at: daysAgo(30) },
      { id: 2, name: 'Marcus Vance (Lab Tech)', email: 'labtech@genomics.lab', password_hash: techHash, role: 'LAB_TECHNICIAN', status: 'ACTIVE', created_at: daysAgo(25), updated_at: daysAgo(25) },
      { id: 3, name: 'Elena Rostova (Bioinformatics)', email: 'bioanalyst@genomics.lab', password_hash: analystHash, role: 'BIOINFORMATICS_ANALYST', status: 'ACTIVE', created_at: daysAgo(20), updated_at: daysAgo(20) },
      { id: 4, name: 'Dr. Aris Thorne (Chief Scientist / Reviewer)', email: 'reviewer@genomics.lab', password_hash: reviewerHash, role: 'REVIEWER', status: 'ACTIVE', created_at: daysAgo(15), updated_at: daysAgo(15) },
    ]);

    // 3. Sequencing Requests
    await SequencingRequest.insertMany([
      { id: 1, request_code: 'REQ-2026-001', requester_name: 'Prof. David Miller', requester_email: 'dmiller@university.edu', institution: 'Institute of Human Genetics', test_type: 'Whole Genome Sequencing (WGS)', priority: 'URGENT', description: 'Trio WGS for rare congenital disorder diagnostic investigation', status: 'COMPLETED', created_by_id: 1, created_at: daysAgo(18), updated_at: daysAgo(7) },
      { id: 2, request_code: 'REQ-2026-002', requester_name: 'Dr. Rachel Chen', requester_email: 'rchen@cancercenter.org', institution: 'Memorial Oncology Research', test_type: 'Targeted Gene Panel (Heme/Solid)', priority: 'HIGH', description: '500-gene oncology somatic variant profiling for targeted immunotherapy', status: 'PROCESSING', created_by_id: 1, created_at: daysAgo(12), updated_at: daysAgo(3) },
      { id: 3, request_code: 'REQ-2026-003', requester_name: 'Dr. Kevin Patel', requester_email: 'kpatel@medcenter.com', institution: 'St. Jude Children Research', test_type: 'Whole Exome Sequencing (WES)', priority: 'STANDARD', description: 'Exome analysis for suspected metabolic cardiomyopathy', status: 'PROCESSING', created_by_id: 1, created_at: daysAgo(8), updated_at: daysAgo(2) },
      { id: 4, request_code: 'REQ-2026-004', requester_name: 'Dr. Amanda Brooks', requester_email: 'abrooks@biotech.io', institution: 'NexGen Therapeutics', test_type: 'RNA-Seq (Transcriptome)', priority: 'STANDARD', description: 'Differential gene expression analysis for breast carcinoma drug response', status: 'PROCESSING', created_by_id: 1, created_at: daysAgo(5), updated_at: daysAgo(1) },
      { id: 5, request_code: 'REQ-2026-005', requester_name: 'Dr. Liam O’Connor', requester_email: 'loconnor@genomics.org', institution: 'Global Microbiome Project', test_type: 'Metagenomics Sequencing', priority: 'LOW', description: 'Shotgun metagenomic profiling of gut microbiome diversity cohort', status: 'PENDING', created_by_id: 1, created_at: daysAgo(2), updated_at: daysAgo(2) },
    ]);

    // 4. Samples
    await Sample.insertMany([
      { id: 1, sample_code: 'SMP-2026-101', request_id: 1, sample_type: 'Whole Blood (EDTA)', organism: 'Homo sapiens', collection_date: daysAgo(18), registration_date: daysAgo(18), assigned_technician_id: 2, status: 'DELIVERED', storage_location: 'Freezer A (-80C) / Rack 2 / Box 4', initial_volume_ul: 500.0, notes: 'Patient proband blood sample for 30x germline WGS', created_at: daysAgo(18), updated_at: daysAgo(7) },
      { id: 2, sample_code: 'SMP-2026-102', request_id: 2, sample_type: 'FFPE Tissue Block', organism: 'Homo sapiens', collection_date: daysAgo(12), registration_date: daysAgo(12), assigned_technician_id: 2, status: 'APPROVED', storage_location: 'Freezer B (-20C) / Rack 1 / Box 12', initial_volume_ul: 250.0, notes: 'Core needle biopsy with >60% neoplastic cellularity', created_at: daysAgo(12), updated_at: daysAgo(3) },
      { id: 3, sample_code: 'SMP-2026-103', request_id: 2, sample_type: 'Bone Marrow Aspirate', organism: 'Homo sapiens', collection_date: daysAgo(10), registration_date: daysAgo(10), assigned_technician_id: 2, status: 'UNDER_REVIEW', storage_location: 'Freezer A (-80C) / Rack 5 / Box 1', initial_volume_ul: 300.0, notes: 'Pre-treatment aspirate, matched somatic control', created_at: daysAgo(10), updated_at: daysAgo(1) },
      { id: 4, sample_code: 'SMP-2026-104', request_id: 3, sample_type: 'Saliva (DNA Genotek)', organism: 'Homo sapiens', collection_date: daysAgo(7), registration_date: daysAgo(7), assigned_technician_id: 2, status: 'ANALYSIS', storage_location: 'Freezer C (-20C) / Rack 3 / Box 9', initial_volume_ul: 1000.0, notes: 'Pediatric saliva collection kit', created_at: daysAgo(7), updated_at: daysAgo(2) },
      { id: 5, sample_code: 'SMP-2026-105', request_id: 4, sample_type: 'Total RNA (Fresh Frozen)', organism: 'Homo sapiens', collection_date: daysAgo(5), registration_date: daysAgo(5), assigned_technician_id: 2, status: 'SEQUENCING', storage_location: 'Ultra-Low Freezer D (-80C) / Box RNA-02', initial_volume_ul: 150.0, notes: 'High integrity tissue snap-frozen in liquid nitrogen', created_at: daysAgo(5), updated_at: daysAgo(1) },
      { id: 6, sample_code: 'SMP-2026-106', request_id: 4, sample_type: 'Cell Pellet (Cultured)', organism: 'Homo sapiens', collection_date: daysAgo(4), registration_date: daysAgo(4), assigned_technician_id: 2, status: 'QC_PASSED', storage_location: 'Freezer A (-80C) / Rack 4 / Box 8', initial_volume_ul: 200.0, notes: 'Drug-treated cell line replicate #2', created_at: daysAgo(4), updated_at: daysAgo(3) },
      { id: 7, sample_code: 'SMP-2026-107', request_id: 3, sample_type: 'Peripheral Blood Mononuclear Cells', organism: 'Homo sapiens', collection_date: daysAgo(3), registration_date: daysAgo(3), assigned_technician_id: 2, status: 'QC_FAILED', storage_location: 'Cold Storage (+4C) / Tray 1', initial_volume_ul: 120.0, notes: 'Sample showed severe protein contamination and degradation', created_at: daysAgo(3), updated_at: daysAgo(2) },
      { id: 8, sample_code: 'SMP-2026-108', request_id: 5, sample_type: 'Fecal Biomass', organism: 'Microbial Consortium', collection_date: daysAgo(1), registration_date: daysAgo(1), assigned_technician_id: 2, status: 'PROCESSING', storage_location: 'Freezer B (-20C) / Rack 8 / Box 14', initial_volume_ul: 400.0, notes: 'Stool sample awaiting bead-beating lysis', created_at: daysAgo(1), updated_at: daysAgo(1) },
    ]);

    // 5. Sample Processing
    await SampleProcessing.insertMany([
      { id: 1, sample_id: 1, assigned_technician_id: 2, extraction_method: 'Magnetic Bead-Based Automated DNA Extraction', buffer_type: '10mM Tris-HCl, pH 8.5', concentration_ng_ul: 68.4, volume_ul: 85.0, start_time: daysAgo(17), completion_time: daysAgo(16), status: 'COMPLETED', processing_notes: 'High yield extracted smoothly. No clumping observed.', created_at: daysAgo(17), updated_at: daysAgo(16) },
      { id: 2, sample_id: 2, assigned_technician_id: 2, extraction_method: 'Column-Based FFPE Deparaffinization & Extraction', buffer_type: 'Low-EDTA TE Buffer', concentration_ng_ul: 45.2, volume_ul: 50.0, start_time: daysAgo(11), completion_time: daysAgo(11), status: 'COMPLETED', processing_notes: 'Deparaffinized with mineral oil heat method. Clear eluate.', created_at: daysAgo(11), updated_at: daysAgo(11) },
      { id: 3, sample_id: 3, assigned_technician_id: 2, extraction_method: 'Ficoll-Paque Gradient + Silica Spin Column', buffer_type: 'TE Buffer pH 8.0', concentration_ng_ul: 52.8, volume_ul: 60.0, start_time: daysAgo(9), completion_time: daysAgo(9), status: 'COMPLETED', processing_notes: 'Bone marrow lysis successful.', created_at: daysAgo(9), updated_at: daysAgo(9) },
      { id: 4, sample_id: 4, assigned_technician_id: 2, extraction_method: 'Automated Saliva Protocol (PrepIT-L2P)', buffer_type: '1x TE Buffer', concentration_ng_ul: 38.5, volume_ul: 90.0, start_time: daysAgo(6), completion_time: daysAgo(6), status: 'COMPLETED', processing_notes: 'Extracted 3.4 ug total genomic DNA.', created_at: daysAgo(6), updated_at: daysAgo(6) },
      { id: 5, sample_id: 5, assigned_technician_id: 2, extraction_method: 'TRIzol Reagent + RNeasy Mini Column', buffer_type: 'Nuclease-Free Water', concentration_ng_ul: 72.1, volume_ul: 40.0, start_time: daysAgo(4), completion_time: daysAgo(4), status: 'COMPLETED', processing_notes: 'High quality total RNA isolated with DNase I digestion.', created_at: daysAgo(4), updated_at: daysAgo(4) },
      { id: 6, sample_id: 6, assigned_technician_id: 2, extraction_method: 'Organic Phenol-Chloroform Lysis', buffer_type: 'Nuclease-Free Water', concentration_ng_ul: 61.0, volume_ul: 50.0, start_time: daysAgo(3), completion_time: daysAgo(3), status: 'COMPLETED', processing_notes: 'Cell pellet extracted successfully.', created_at: daysAgo(3), updated_at: daysAgo(3) },
      { id: 7, sample_id: 7, assigned_technician_id: 2, extraction_method: 'Standard Column DNA Extraction', buffer_type: 'Elution Buffer EB', concentration_ng_ul: 12.3, volume_ul: 30.0, start_time: daysAgo(3), completion_time: daysAgo(2), status: 'COMPLETED', processing_notes: 'Low DNA yield and high turbidity observed.', created_at: daysAgo(3), updated_at: daysAgo(2) },
      { id: 8, sample_id: 8, assigned_technician_id: 2, extraction_method: 'Bead-Beating Mechanical Homogenizer', buffer_type: 'DNA Lysis Buffer', concentration_ng_ul: 28.0, volume_ul: 45.0, start_time: new Date(now.getTime() - 10 * 3600 * 1000), completion_time: undefined, status: 'PROCESSING', processing_notes: 'Mechanical lysis underway at 30 Hz for 5 minutes.', created_at: daysAgo(1), updated_at: daysAgo(1) },
    ]);

    // 6. Quality Checks
    await QualityCheck.insertMany([
      { id: 1, qc_code: 'QC-2026-001', sample_id: 1, checked_by_id: 2, din_rin_score: 8.8, a260_a280_ratio: 1.88, a260_a230_ratio: 2.15, concentration_post_qc: 68.0, qc_result: 'PASSED', failure_reason: null, qc_comments: 'TapeStation gDNA ScreenTape DIN 8.8. Excellent purity and integrity.', qc_date: daysAgo(16), created_at: daysAgo(16), updated_at: daysAgo(16) },
      { id: 2, qc_code: 'QC-2026-002', sample_id: 2, checked_by_id: 2, din_rin_score: 7.4, a260_a280_ratio: 1.84, a260_a230_ratio: 1.95, concentration_post_qc: 44.5, qc_result: 'PASSED', failure_reason: null, qc_comments: 'FFPE DIN score 7.4 passes somatic oncology threshold (>6.0).', qc_date: daysAgo(10), created_at: daysAgo(10), updated_at: daysAgo(10) },
      { id: 3, qc_code: 'QC-2026-003', sample_id: 3, checked_by_id: 2, din_rin_score: 8.2, a260_a280_ratio: 1.86, a260_a230_ratio: 2.08, concentration_post_qc: 52.0, qc_result: 'PASSED', failure_reason: null, qc_comments: 'Marrow DNA meets strict high-throughput criteria.', qc_date: daysAgo(8), created_at: daysAgo(8), updated_at: daysAgo(8) },
      { id: 4, qc_code: 'QC-2026-004', sample_id: 4, checked_by_id: 2, din_rin_score: 8.0, a260_a280_ratio: 1.85, a260_a230_ratio: 2.02, concentration_post_qc: 38.0, qc_result: 'PASSED', failure_reason: null, qc_comments: 'Saliva DNA shows minimal shearing. Ready for WES library prep.', qc_date: daysAgo(5), created_at: daysAgo(5), updated_at: daysAgo(5) },
      { id: 5, qc_code: 'QC-2026-005', sample_id: 5, checked_by_id: 2, din_rin_score: 9.3, a260_a280_ratio: 2.05, a260_a230_ratio: 2.18, concentration_post_qc: 71.5, qc_result: 'PASSED', failure_reason: null, qc_comments: 'Bioanalyzer RNA 6000 Nano RIN = 9.3 with crisp 28S/18S ribosomal peaks.', qc_date: daysAgo(4), created_at: daysAgo(4), updated_at: daysAgo(4) },
      { id: 6, qc_code: 'QC-2026-006', sample_id: 6, checked_by_id: 2, din_rin_score: 8.6, a260_a280_ratio: 2.02, a260_a230_ratio: 2.10, concentration_post_qc: 60.5, qc_result: 'PASSED', failure_reason: null, qc_comments: 'Passed all spectrophotometric and fluorometric metrics.', qc_date: daysAgo(3), created_at: daysAgo(3), updated_at: daysAgo(3) },
      { id: 7, qc_code: 'QC-2026-007', sample_id: 7, checked_by_id: 2, din_rin_score: 3.2, a260_a280_ratio: 1.41, a260_a230_ratio: 0.85, concentration_post_qc: 11.8, qc_result: 'FAILED', failure_reason: 'Severe DNA degradation (DIN 3.2) and excessive salt/solvent contamination (A260/230 < 1.0)', qc_comments: 'Sample failed minimum QC criteria for exome sequencing. Re-extraction or sample recollection requested.', qc_date: daysAgo(2), created_at: daysAgo(2), updated_at: daysAgo(2) },
    ]);

    // 7. Sequencing
    await Sequencing.insertMany([
      { id: 1, sequencing_code: 'SEQ-2026-001', sample_id: 1, instrument_platform: 'Illumina NovaSeq 6000', flowcell_id: 'FC-NV6-884210', run_mode: 'Paired-End NovaSeq S4', read_length: '2x150 bp', target_depth: '30x WGS', assigned_analyst_id: 3, sequencing_status: 'COMPLETED', start_date: daysAgo(15), completion_date: daysAgo(13), yield_gb: 124.5, q30_percent: 92.4, error_rate: 0.18, notes: 'Run finished with optimal cluster density (412 K/mm2).', created_at: daysAgo(15), updated_at: daysAgo(13) },
      { id: 2, sequencing_code: 'SEQ-2026-002', sample_id: 2, instrument_platform: 'Illumina NextSeq 2000', flowcell_id: 'FC-NX2-339182', run_mode: 'Paired-End P3 Flowcell', read_length: '2x100 bp', target_depth: '500x Targeted', assigned_analyst_id: 3, sequencing_status: 'COMPLETED', start_date: daysAgo(9), completion_date: daysAgo(8), yield_gb: 38.2, q30_percent: 94.1, error_rate: 0.12, notes: 'Targeted somatic cancer panel sequenced successfully.', created_at: daysAgo(9), updated_at: daysAgo(8) },
      { id: 3, sequencing_code: 'SEQ-2026-003', sample_id: 3, instrument_platform: 'Illumina NovaSeq X Plus', flowcell_id: 'FC-NVX-109283', run_mode: 'Paired-End 10B Flowcell', read_length: '2x150 bp', target_depth: '100x Exome', assigned_analyst_id: 3, sequencing_status: 'COMPLETED', start_date: daysAgo(7), completion_date: daysAgo(6), yield_gb: 85.0, q30_percent: 93.8, error_rate: 0.14, notes: 'Run met all manufacturer cluster specifications.', created_at: daysAgo(7), updated_at: daysAgo(6) },
      { id: 4, sequencing_code: 'SEQ-2026-004', sample_id: 4, instrument_platform: 'Illumina NovaSeq 6000', flowcell_id: 'FC-NV6-992314', run_mode: 'Paired-End NovaSeq S2', read_length: '2x150 bp', target_depth: '100x Exome', assigned_analyst_id: 3, sequencing_status: 'COMPLETED', start_date: daysAgo(4), completion_date: daysAgo(2), yield_gb: 82.6, q30_percent: 91.8, error_rate: 0.19, notes: 'Exome sequencing completed; demultiplexed FASTQs generated.', created_at: daysAgo(4), updated_at: daysAgo(2) },
      { id: 5, sequencing_code: 'SEQ-2026-005', sample_id: 5, instrument_platform: 'PacBio Sequel IIe (HiFi)', flowcell_id: 'FC-PB-550192', run_mode: 'Circular Consensus Sequencing (CCS)', read_length: 'HiFi Long Reads', target_depth: '30M Reads', assigned_analyst_id: 3, sequencing_status: 'IN_PROGRESS', start_date: daysAgo(1), completion_date: undefined, yield_gb: 18.4, q30_percent: 99.2, error_rate: 0.05, notes: 'Long-read transcriptome sequencing run in progress on Sequel IIe.', created_at: daysAgo(1), updated_at: daysAgo(1) },
    ]);

    // 8. Analysis
    await Analysis.insertMany([
      { id: 1, analysis_code: 'ANA-2026-001', sample_id: 1, assigned_analyst_id: 3, pipeline_name: 'BWA-MEM2 + GATK HaplotypeCaller 4.4 + DeepVariant', reference_genome: 'GRCh38 / hg38', analysis_status: 'COMPLETED', start_date: daysAgo(13), completion_date: daysAgo(11), total_reads: 824500000, mapped_reads_pct: 99.4, mean_coverage: 34.8, variants_called: 4612800, result_summary: 'Identified pathogenic de novo heterozygous frameshift deletion in SCN1A (c.3942delT, p.Phe1314LeufsTer18).', analysis_notes: 'Germline pipeline passed all sensitivity benchmarks. VCF and CRAM archived.', created_at: daysAgo(13), updated_at: daysAgo(11) },
      { id: 2, analysis_code: 'ANA-2026-002', sample_id: 2, assigned_analyst_id: 3, pipeline_name: 'Sentieon Somatic TNscope + Mutect2 + Ensembl VEP', reference_genome: 'GRCh38 / hg38', analysis_status: 'COMPLETED', start_date: daysAgo(8), completion_date: daysAgo(6), total_reads: 380200000, mapped_reads_pct: 98.9, mean_coverage: 584.2, variants_called: 142, result_summary: 'Identified BRAF V600E mutation at 34.2% variant allele fraction (VAF) and TERT promoter C228T at 21.0% VAF.', analysis_notes: 'Clinically actionable Tier I biomarker detected. High oncogenic driver significance.', created_at: daysAgo(8), updated_at: daysAgo(6) },
      { id: 3, analysis_code: 'ANA-2026-003', sample_id: 3, assigned_analyst_id: 3, pipeline_name: 'Dragen Germline + Heme-Onc Somatic Variant Caller', reference_genome: 'GRCh38 / hg38', analysis_status: 'COMPLETED', start_date: daysAgo(6), completion_date: daysAgo(4), total_reads: 520100000, mapped_reads_pct: 99.1, mean_coverage: 412.0, variants_called: 98, result_summary: 'Detected JAK2 V617F mutation (VAF 48.6%) consistent with myeloproliferative neoplasm.', analysis_notes: 'Analysis complete and secondary validation finished. Ready for clinical review.', created_at: daysAgo(6), updated_at: daysAgo(4) },
      { id: 4, analysis_code: 'ANA-2026-004', sample_id: 4, assigned_analyst_id: 3, pipeline_name: 'Nextflow Sarek 3.4 Exome + DeepVariant + ClinVar Annotator', reference_genome: 'GRCh38 / hg38', analysis_status: 'IN_PROGRESS', start_date: daysAgo(2), completion_date: undefined, total_reads: 540000000, mapped_reads_pct: 99.3, mean_coverage: 112.5, variants_called: 38400, result_summary: 'Alignment and duplicate marking completed. Joint variant calling underway.', analysis_notes: 'Exome annotation in progress against dbSNP 156 and ClinVar 2026.', created_at: daysAgo(2), updated_at: daysAgo(2) },
    ]);

    // 9. Reports
    await Report.insertMany([
      {
        id: 1,
        report_code: 'REP-2026-001',
        sample_id: 1,
        request_id: 1,
        analysis_id: 1,
        report_title: 'Clinical Genomic Diagnostic Report - Proband WGS',
        report_summary: 'High-depth whole-genome sequencing of proband blood gDNA revealed a pathogenic frameshift variant in SCN1A associated with Dravet Syndrome.',
        findings_summary: 'SCN1A: c.3942delT (p.Phe1314LeufsTer18) - Pathogenic (ACMG Class 1). Heterozygous. Coverage: 38x.',
        clinical_significance: 'Diagnostic confirmation of severe myoclonic epilepsy in infancy (Dravet Syndrome). SCN1A loss-of-function variants guide sodium channel blocker avoidance and targeted therapy selection.',
        generated_by_id: 3,
        reviewed_by_id: 4,
        approved_by_id: 4,
        report_status: 'DELIVERED',
        reviewer_comments: 'Clinical concordance verified with electroencephalogram findings. Full sign-off provided.',
        generated_date: daysAgo(10),
        review_date: daysAgo(9),
        approval_date: daysAgo(8),
        delivery_date: daysAgo(7),
        delivery_recipient: 'dmiller@university.edu',
        created_at: daysAgo(10),
        updated_at: daysAgo(7),
      },
      {
        id: 2,
        report_code: 'REP-2026-002',
        sample_id: 2,
        request_id: 2,
        analysis_id: 2,
        report_title: 'Comprehensive Molecular Somatic Oncology Profiling',
        report_summary: '500-gene targeted NGS panel identified Tier 1 actionable oncogenic drivers: BRAF V600E and TERT promoter C228T.',
        findings_summary: '1. BRAF c.1799T>A (p.Val600Glu) - VAF 34.2% (Tier I Actionable)\n2. TERT c.-124C>T (C228T) - VAF 21.0% (Tier II Potential Actionability)',
        clinical_significance: 'Patient is a candidate for combined BRAF/MEK inhibitor therapy (e.g. Dabrafenib + Trametinib). High diagnostic and prognostic significance.',
        generated_by_id: 3,
        reviewed_by_id: 4,
        approved_by_id: 4,
        report_status: 'APPROVED',
        reviewer_comments: 'Report verified against histology and IHC staining. Approved for immediate patient medical record integration.',
        generated_date: daysAgo(5),
        review_date: daysAgo(4),
        approval_date: daysAgo(3),
        delivery_date: undefined,
        delivery_recipient: 'rchen@cancercenter.org',
        created_at: daysAgo(5),
        updated_at: daysAgo(3),
      },
      {
        id: 3,
        report_code: 'REP-2026-003',
        sample_id: 3,
        request_id: 2,
        analysis_id: 3,
        report_title: 'Hematologic Myeloid Neoplasm NGS Panel Report',
        report_summary: 'Targeted deep sequencing of bone marrow aspirate demonstrated high-burden JAK2 V617F mutation without concurrent CALR/MPL mutations.',
        findings_summary: 'JAK2 c.1849G>T (p.Val617Phe) - VAF 48.6%. High mutant allele burden.',
        clinical_significance: 'Positive for diagnostic hallmark mutation of polycythemia vera / essential thrombocythemia. Hematology consultation recommended.',
        generated_by_id: 3,
        reviewed_by_id: 4,
        approved_by_id: undefined,
        report_status: 'UNDER_REVIEW',
        reviewer_comments: 'Currently undergoing secondary verification of marrow cellularity metrics.',
        generated_date: daysAgo(3),
        review_date: daysAgo(1),
        approval_date: undefined,
        delivery_date: undefined,
        delivery_recipient: 'rchen@cancercenter.org',
        created_at: daysAgo(3),
        updated_at: daysAgo(1),
      },
    ]);

    // 10. Workflow History
    await WorkflowHistory.insertMany([
      { id: 1, sample_id: 1, event_type: 'Sample Registered', previous_status: null, new_status: 'REGISTERED', user_id: 2, user_name: 'Marcus Vance', comments: 'Sample logged and assigned to Freezer A (-80C)', created_at: daysAgo(18) },
      { id: 2, sample_id: 1, event_type: 'Processing Started', previous_status: 'REGISTERED', new_status: 'PROCESSING', user_id: 2, user_name: 'Marcus Vance', comments: 'DNA extraction initiated using automated magnetic beads', created_at: daysAgo(17) },
      { id: 3, sample_id: 1, event_type: 'Processing Completed', previous_status: 'PROCESSING', new_status: 'PROCESSING_COMPLETED', user_id: 2, user_name: 'Marcus Vance', comments: 'Extraction complete; yield 68.4 ng/uL', created_at: daysAgo(16.5) },
      { id: 4, sample_id: 1, event_type: 'Quality Check Passed', previous_status: 'PROCESSING_COMPLETED', new_status: 'QC_PASSED', user_id: 2, user_name: 'Marcus Vance', comments: 'DIN score 8.8, A260/280: 1.88. Cleared for sequencing', created_at: daysAgo(16) },
      { id: 5, sample_id: 1, event_type: 'Sequencing Started', previous_status: 'QC_PASSED', new_status: 'SEQUENCING', user_id: 3, user_name: 'Elena Rostova', comments: 'Loaded on NovaSeq 6000 S4 flowcell', created_at: daysAgo(15) },
      { id: 6, sample_id: 1, event_type: 'Sequencing Completed', previous_status: 'SEQUENCING', new_status: 'SEQUENCING_COMPLETED', user_id: 3, user_name: 'Elena Rostova', comments: 'Run completed successfully: 124.5 Gb yield, Q30 92.4%', created_at: daysAgo(13) },
      { id: 7, sample_id: 1, event_type: 'Bioinformatics Analysis Started', previous_status: 'SEQUENCING_COMPLETED', new_status: 'ANALYSIS', user_id: 3, user_name: 'Elena Rostova', comments: 'Launched BWA-MEM2 and GATK 4.4 pipeline', created_at: daysAgo(12.9) },
      { id: 8, sample_id: 1, event_type: 'Bioinformatics Analysis Completed', previous_status: 'ANALYSIS', new_status: 'ANALYSIS_COMPLETED', user_id: 3, user_name: 'Elena Rostova', comments: 'Mean coverage 34.8x. Pathogenic SCN1A variant detected', created_at: daysAgo(11) },
      { id: 9, sample_id: 1, event_type: 'Report Generated', previous_status: 'ANALYSIS_COMPLETED', new_status: 'REPORT_GENERATED', user_id: 3, user_name: 'Elena Rostova', comments: 'Generated clinical genomic report draft', created_at: daysAgo(10) },
      { id: 10, sample_id: 1, event_type: 'Report Submitted for Review', previous_status: 'REPORT_GENERATED', new_status: 'UNDER_REVIEW', user_id: 3, user_name: 'Elena Rostova', comments: 'Assigned to Dr. Aris Thorne for clinical review', created_at: daysAgo(9) },
      { id: 11, sample_id: 1, event_type: 'Report Approved', previous_status: 'UNDER_REVIEW', new_status: 'APPROVED', user_id: 4, user_name: 'Dr. Aris Thorne', comments: 'Reviewed and approved ACMG classification and clinical interpretation', created_at: daysAgo(8) },
      { id: 12, sample_id: 1, event_type: 'Report Delivered', previous_status: 'APPROVED', new_status: 'DELIVERED', user_id: 4, user_name: 'Dr. Aris Thorne', comments: 'Delivered electronic report to Prof. David Miller (dmiller@university.edu)', created_at: daysAgo(7) },

      { id: 13, sample_id: 2, event_type: 'Sample Registered', previous_status: null, new_status: 'REGISTERED', user_id: 2, user_name: 'Marcus Vance', comments: 'FFPE tumor tissue block registered', created_at: daysAgo(12) },
      { id: 14, sample_id: 2, event_type: 'Processing Started', previous_status: 'REGISTERED', new_status: 'PROCESSING', user_id: 2, user_name: 'Marcus Vance', comments: 'Deparaffinization and enzymatic proteinase K digestion', created_at: daysAgo(11) },
      { id: 15, sample_id: 2, event_type: 'Processing Completed', previous_status: 'PROCESSING', new_status: 'PROCESSING_COMPLETED', user_id: 2, user_name: 'Marcus Vance', comments: 'Eluted in 50 uL Low-EDTA TE', created_at: daysAgo(10.8) },
      { id: 16, sample_id: 2, event_type: 'Quality Check Passed', previous_status: 'PROCESSING_COMPLETED', new_status: 'QC_PASSED', user_id: 2, user_name: 'Marcus Vance', comments: 'DIN score 7.4. Passed oncology threshold', created_at: daysAgo(10) },
      { id: 17, sample_id: 2, event_type: 'Sequencing Started', previous_status: 'QC_PASSED', new_status: 'SEQUENCING', user_id: 3, user_name: 'Elena Rostova', comments: 'Loaded on NextSeq 2000 P3 cartridge', created_at: daysAgo(9) },
      { id: 18, sample_id: 2, event_type: 'Sequencing Completed', previous_status: 'SEQUENCING', new_status: 'SEQUENCING_COMPLETED', user_id: 3, user_name: 'Elena Rostova', comments: 'Finished with 584x mean target coverage', created_at: daysAgo(8) },
      { id: 19, sample_id: 2, event_type: 'Bioinformatics Analysis Started', previous_status: 'SEQUENCING_COMPLETED', new_status: 'ANALYSIS', user_id: 3, user_name: 'Elena Rostova', comments: 'Running Sentieon TNscope somatic caller', created_at: daysAgo(7.9) },
      { id: 20, sample_id: 2, event_type: 'Bioinformatics Analysis Completed', previous_status: 'ANALYSIS', new_status: 'ANALYSIS_COMPLETED', user_id: 3, user_name: 'Elena Rostova', comments: 'Detected actionable BRAF V600E and TERT C228T', created_at: daysAgo(6) },
      { id: 21, sample_id: 2, event_type: 'Report Generated', previous_status: 'ANALYSIS_COMPLETED', new_status: 'REPORT_GENERATED', user_id: 3, user_name: 'Elena Rostova', comments: 'Somatic molecular diagnostic draft compiled', created_at: daysAgo(5) },
      { id: 22, sample_id: 2, event_type: 'Report Approved', previous_status: 'REPORT_GENERATED', new_status: 'APPROVED', user_id: 4, user_name: 'Dr. Aris Thorne', comments: 'Sign-off complete. Ready for clinician dispatch', created_at: daysAgo(3) },

      { id: 23, sample_id: 7, event_type: 'Sample Registered', previous_status: null, new_status: 'REGISTERED', user_id: 2, user_name: 'Marcus Vance', comments: 'Peripheral blood specimen registered', created_at: daysAgo(3) },
      { id: 24, sample_id: 7, event_type: 'Processing Started', previous_status: 'REGISTERED', new_status: 'PROCESSING', user_id: 2, user_name: 'Marcus Vance', comments: 'Extraction performed via spin column', created_at: daysAgo(2.9) },
      { id: 25, sample_id: 7, event_type: 'Processing Completed', previous_status: 'PROCESSING', new_status: 'PROCESSING_COMPLETED', user_id: 2, user_name: 'Marcus Vance', comments: 'Extraction finished with low observed volume', created_at: daysAgo(2.7) },
      { id: 26, sample_id: 7, event_type: 'Quality Check Failed', previous_status: 'PROCESSING_COMPLETED', new_status: 'QC_FAILED', user_id: 2, user_name: 'Marcus Vance', comments: 'Severe DNA degradation (DIN 3.2, A260/230 0.85). Blocked from sequencing workflow.', created_at: daysAgo(2) },
    ]);

    // 11. Initial Counter Sequences
    await Counter.insertMany([
      { _id: 'roles', seq: 4 },
      { _id: 'users', seq: 4 },
      { _id: 'sequencing_requests', seq: 5 },
      { _id: 'samples', seq: 8 },
      { _id: 'sample_processing', seq: 8 },
      { _id: 'quality_checks', seq: 7 },
      { _id: 'sequencing', seq: 5 },
      { _id: 'analysis', seq: 4 },
      { _id: 'reports', seq: 3 },
      { _id: 'workflow_history', seq: 26 },
    ]);

    console.log('MongoDB successfully seeded with full initial genomics datasets.');
  } catch (error) {
    console.error('Error seeding MongoDB collections:', error);
  }
}
