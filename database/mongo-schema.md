# MongoDB Schema Architecture (Genomics Sequencing Workflow)

This document describes the MongoDB collections, documents, indexes, and relationships implemented via Mongoose for the Genomics Sequencing Workflow Management System.

## Database: `genomics_workflow`

### Collections:

1. **`roles`**:
   - `id`: Sequential integer (1..N)
   - `name`: String (`ADMIN`, `LAB_TECHNICIAN`, `BIOINFORMATICS_ANALYST`, `REVIEWER`)
   - `description`: String
   - `created_at`: Date

2. **`users`**:
   - `id`: Sequential integer (1..N)
   - `name`: Full name
   - `email`: Indexed, lowercase unique email address
   - `password_hash`: Bcrypt hashed credential
   - `role`: Role enum reference
   - `status`: `ACTIVE` | `INACTIVE` | `SUSPENDED`
   - `created_at`: Date
   - `updated_at`: Date
   - `last_login`: Date

3. **`sequencing_requests`**:
   - `id`: Sequential integer
   - `request_code`: Unique code (`REQ-YYYY-XXX`)
   - `requester_name`: Principal investigator or clinician
   - `requester_email`: Contact email
   - `institution`: Medical or research center
   - `test_type`: `Whole Genome Sequencing (WGS)`, `Whole Exome Sequencing (WES)`, etc.
   - `priority`: `LOW` | `STANDARD` | `HIGH` | `URGENT`
   - `description`: Clinical notes
   - `status`: `PENDING` | `PROCESSING` | `COMPLETED` | `CANCELLED`
   - `created_by_id`: Numeric User ID reference
   - `created_at` / `updated_at`: Date

4. **`samples`**:
   - `id`: Sequential integer
   - `sample_code`: Unique specimen identifier (`SMP-YYYY-XXX`)
   - `request_id`: Reference to parent `sequencing_requests.id`
   - `sample_type`: E.g. `Whole Blood (EDTA)`, `FFPE Tissue Block`, `Saliva`
   - `organism`: Default `Homo sapiens`
   - `collection_date`: Date
   - `registration_date`: Date
   - `assigned_technician_id`: Reference to `users.id`
   - `status`: Sample lifecycle status (`REGISTERED`, `PROCESSING`, `QC_PASSED`, etc.)
   - `storage_location`: Freezer/rack/box coordinate
   - `initial_volume_ul`: Numeric specimen volume
   - `notes`: Specific handling notes

5. **`sample_processing`**:
   - Extraction method, buffer type, fluorometric concentration (ng/µL), eluate volume (µL), timestamps, notes.

6. **`quality_checks`**:
   - DIN/RIN score (TapeStation/Bioanalyzer), spectrophotometric A260/280 and A260/230 purity ratios, post-QC concentration, result (`PASSED` / `FAILED`), failure reason.

7. **`sequencing`**:
   - Platform (e.g. `Illumina NovaSeq 6000`, `NextSeq 2000`, `PacBio Sequel IIe`), flowcell ID, run mode, read length, target depth, sequencing status, yield (Gb), Q30 score (%), error rate.

8. **`analysis`**:
   - Secondary/tertiary bioinformatics pipeline (e.g. `BWA-MEM2 + GATK HaplotypeCaller 4.4`), reference genome, analysis status, mapped reads percentage, mean coverage depth, variant count, clinical findings summary.

9. **`reports`**:
   - Clinical genomic diagnostic report metadata, title, findings summary, ACMG variant classification, approval/rejection signatures, clinical reviewer sign-off, electronic dispatch.

10. **`workflow_history`**:
    - Immutable audit trail of every status transition and laboratory event.

11. **`counters`**:
    - Atomic sequence counters for integer ID generation across all entities.
