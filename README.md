# Genomics Sequencing Workflow Management System (GSWMS)

A production-style full-stack web application for next-generation sequencing (NGS) laboratories. Built for clinical and academic genomics research, GSWMS provides end-to-end sample traceability, role-based laboratory access control (RBAC), multi-stage workflow gating, automated audit logging, quality control metrics (DIN/RIN, Q30), bioinformatics pipeline orchestration, and clinical diagnostic report sign-off.

---

## Architecture Overview

* **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, React Router v6
* **Backend:** Node.js, Express, TypeScript, JWT (JSON Web Tokens), Bcrypt.js password hashing
* **Database:** MongoDB with Mongoose ODM (embedded high-performance MongoDB engine with WiredTiger persistence, or external MongoDB cluster via `MONGODB_URI`)
* **Security & RBAC:** Route-level middleware enforcing role boundaries, Mongoose schema validation, immutable workflow audit logging

---

## Laboratory Roles & Credentials

The system provides 4 specialized roles with tailored dashboard metrics and workflow permissions:

| Role | Default Email | Password | Responsibilities |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@genomics.lab` | `admin123` | Full administrative control, user provisioning, global overrides, all workflow stages |
| **Lab Technician** | `tech@genomics.lab` | `tech123` | Sample intake, DNA/RNA extraction protocols, TapeStation/Bioanalyzer QC validation |
| **Bioinformatics Analyst** | `bioinfo@genomics.lab` | `bioinfo123` | Flowcell setup, sequencing run monitoring, secondary pipeline execution (BWA/GATK), report drafting |
| **Clinical Reviewer** | `reviewer@genomics.lab` | `reviewer123` | Medical review, ACMG variant classification sign-off, diagnostic report approval/rejection |

*Note: For demonstration and presentation convenience, an interactive **Quick Role Switcher** is embedded directly into the top navigation bar, allowing instant switching between profiles with a single click.*

---

## Specimen Lifecycle & Traceability Pipeline

Each biological sample moves through a validated, unidirectional state transition model with immutable audit logging:

```text
[REGISTERED]
     │
     ▼ (Lab Tech starts/finishes extraction protocol)
[PROCESSING] ──► [PROCESSING_COMPLETED]
     │
     ▼ (QC validation: DIN/RIN >= 7.0, A260/A280, concentration)
[QC_PASSED] ◄─── (If criteria fail ──► [QC_FAILED])
     │
     ▼ (Bioinformatics loads flowcell & completes sequencing)
[SEQUENCING_IN_PROGRESS] ──► [SEQUENCING_COMPLETED]
     │
     ▼ (Secondary alignment & GATK variant calling)
[ANALYSIS_IN_PROGRESS] ──► [ANALYSIS_COMPLETED]
     │
     ▼ (Clinical draft generated & pathologist review)
[REPORT_DRAFTED] ──► [REPORT_APPROVED] ──► [COMPLETED]
```

### Traceability Features
* **Sample Detail Inspector:** Full visual progress stepper, specimen metadata, real-time stage metrics, and an immutable chronological audit trail tracking the exact timestamp, actor, previous status, and new status for every event.
* **Stage Gating:** Samples cannot skip workflow stages (e.g., a sample cannot be sequenced unless it has received a `QC_PASSED` result).

---

## Core Modules & Features

1. **Analytical Dashboard:** Real-time metrics breakdown, active pipeline funnel, quick role-specific action lists, and recent activity logs.
2. **Sequencing Requests:** Request intake (Whole Genome Sequencing, Whole Exome, RNA-Seq, Somatic Cancer Panels), turnaround time tracking, priority flags (URGENT, HIGH, NORMAL).
3. **Sample Registry:** Barcode/code generator, specimen type tracking (Whole Blood, Fresh Frozen Tissue, FFPE, Saliva, Bone Marrow), storage conditions (-80°C, LN2).
4. **Extraction & Processing:** Automated protocol selection (QIAamp DNA Mini, Maxwell RSC, MagMAX), yields, and elution volumes.
5. **Quality Control Verification:** DIN/RIN electropherogram metrics, Nanodrop A260/A280 ratios, Qubit concentrations, and pass/fail gatekeeping.
6. **Sequencing Runs:** Instrument allocation (Illumina NovaSeq X Plus, NextSeq 2000, Oxford Nanopore PromethION, PacBio Revio), flowcell barcode logging, yield (Gb), and Q30 score.
7. **Bioinformatics Pipeline:** Reference genome alignment (GRCh38, CHM13-T2T), GATK HaplotypeCaller variant calling, mean target depth, and variant output summaries.
8. **Genomic Reports & Sign-Off:** Clinical diagnostic report generator, medical geneticist review & electronic sign-off, printable CLIA/CAP/ISO-compliant diagnostic reports.
9. **Laboratory User Management:** Administrator console for provisioning staff and managing account permissions.

---

## REST API Reference

### Authentication
* `POST /api/auth/login` - Authenticate staff credentials & obtain JWT
* `GET /api/auth/me` - Validate session & retrieve user role profile
* `POST /api/auth/switch-role` - Instant academic role switcher endpoint

### Workflow APIs
* `GET /api/dashboard` - Aggregated laboratory statistics
* `GET, POST /api/requests` - Query and submit sequencing requests
* `GET, POST /api/samples` - Manage samples and view individual traceability logs
* `POST /api/processing/:sampleId/start` - Initiate extraction protocol
* `POST /api/processing/:sampleId/complete` - Record extraction metrics
* `POST /api/qc` - Record quality control metrics and gatekeep sample
* `POST /api/sequencing/:sampleId/start` - Launch sequencing run
* `POST /api/sequencing/:sampleId/complete` - Record yield and Q30 score
* `POST /api/analysis/:sampleId/start` - Execute bioinformatics pipeline
* `POST /api/analysis/:sampleId/complete` - Finalize variant calling
* `GET, POST /api/reports` - Generate, review, approve, and deliver clinical reports
* `GET, POST, PUT /api/users` - Laboratory personnel administration (Admin only)
