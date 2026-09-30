import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Sample, 
  SampleProcessing, 
  QualityCheck, 
  SequencingRun, 
  AnalysisRun, 
  GenomicReport, 
  WorkflowHistoryItem 
} from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { TraceabilityTimeline } from '../components/common/TraceabilityTimeline';
import { 
  TestTubes, 
  FlaskConical, 
  CheckCircle2, 
  XCircle, 
  Dna, 
  Cpu, 
  FileCheck2, 
  Send, 
  ArrowLeft, 
  RefreshCw, 
  Barcode, 
  Building, 
  Calendar, 
  MapPin, 
  Clock, 
  AlertCircle,
  ChevronRight,
  ShieldCheck,
  Award
} from 'lucide-react';

export const SampleDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sample, setSample] = useState<Sample | null>(null);
  const [processing, setProcessing] = useState<SampleProcessing | null>(null);
  const [qc, setQc] = useState<QualityCheck | null>(null);
  const [sequencing, setSequencing] = useState<SequencingRun | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisRun | null>(null);
  const [report, setReport] = useState<GenomicReport | null>(null);
  const [history, setHistory] = useState<WorkflowHistoryItem[]>([]);

  const fetchSampleData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const sampleId = parseInt(id, 10);
      const [detailRes, historyRes] = await Promise.all([
        api.samples.get(sampleId),
        api.samples.getHistory(sampleId),
      ]);

      setSample(detailRes.sample);
      setProcessing(detailRes.processing || null);
      setQc(detailRes.qc || null);
      setSequencing(detailRes.sequencing || null);
      setAnalysis(detailRes.analysis || null);
      setReport(detailRes.report || null);
      setHistory(historyRes.history);
    } catch (err: any) {
      setError(err.message || 'Failed to load sample traceability details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSampleData();
  }, [id]);

  if (loading && !sample) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600">Retrieving sample traceability records from MongoDB...</p>
        </div>
      </div>
    );
  }

  if (error || !sample) {
    return (
      <div className="p-6 bg-rose-50 rounded-xl border border-rose-200 text-rose-800">
        <div className="flex items-center gap-3 mb-2">
          <AlertCircle className="w-5 h-5 text-rose-600" />
          <h3 className="font-semibold text-base">Error Loading Sample</h3>
        </div>
        <p className="text-sm mb-4">{error || 'Sample record not found.'}</p>
        <Link to="/samples" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold">
          Return to Samples Registry
        </Link>
      </div>
    );
  }

  // Calculate Pipeline Stepper Status
  const stages = [
    { key: 'REGISTRATION', label: '1. Registered', done: true, current: sample.status === 'REGISTERED' },
    { 
      key: 'PROCESSING', 
      label: '2. Processing', 
      done: ['PROCESSING_COMPLETED', 'QC_PASSED', 'QC_FAILED', 'SEQUENCING', 'SEQUENCING_COMPLETED', 'ANALYSIS', 'ANALYSIS_COMPLETED', 'UNDER_REVIEW', 'APPROVED', 'DELIVERED'].includes(sample.status),
      current: sample.status === 'PROCESSING' 
    },
    { 
      key: 'QC', 
      label: '3. Quality Check', 
      done: ['QC_PASSED', 'SEQUENCING', 'SEQUENCING_COMPLETED', 'ANALYSIS', 'ANALYSIS_COMPLETED', 'UNDER_REVIEW', 'APPROVED', 'DELIVERED'].includes(sample.status),
      failed: sample.status === 'QC_FAILED',
      current: sample.status === 'PROCESSING_COMPLETED' || sample.status === 'QC_FAILED'
    },
    { 
      key: 'SEQUENCING', 
      label: '4. Sequencing', 
      done: ['SEQUENCING_COMPLETED', 'ANALYSIS', 'ANALYSIS_COMPLETED', 'UNDER_REVIEW', 'APPROVED', 'DELIVERED'].includes(sample.status),
      current: sample.status === 'SEQUENCING'
    },
    { 
      key: 'ANALYSIS', 
      label: '5. Analysis', 
      done: ['ANALYSIS_COMPLETED', 'UNDER_REVIEW', 'APPROVED', 'DELIVERED'].includes(sample.status),
      current: sample.status === 'ANALYSIS'
    },
    { 
      key: 'REPORT', 
      label: '6. Report Review', 
      done: ['APPROVED', 'DELIVERED'].includes(sample.status),
      failed: sample.status === 'REJECTED',
      current: sample.status === 'UNDER_REVIEW' || sample.status === 'REJECTED'
    },
    { 
      key: 'DELIVERY', 
      label: '7. Delivered', 
      done: sample.status === 'DELIVERED',
      current: sample.status === 'APPROVED'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Back button & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/samples"
            className="p-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-2xs font-bold text-indigo-600 uppercase tracking-wider">
                Full Specimen Traceability
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              <span className="font-mono text-2xs text-slate-500">ID #{sample.id}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 font-mono flex items-center gap-3">
              {sample.sample_code}
              <StatusBadge status={sample.status} size="md" />
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchSampleData}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Audit
          </button>
        </div>
      </div>

      {/* Interactive Workflow Pipeline Stepper */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
          Lifecycle Progression Track
        </h2>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {stages.map((st) => {
            let badgeBg = 'bg-slate-50 border-slate-200 text-slate-500';
            if (st.done) {
              badgeBg = 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold';
            } else if (st.failed) {
              badgeBg = 'bg-rose-50 border-rose-300 text-rose-800 font-semibold';
            } else if (st.current) {
              badgeBg = 'bg-indigo-50 border-indigo-400 text-indigo-900 font-bold ring-2 ring-indigo-500/20';
            }

            return (
              <div
                key={st.key}
                className={`p-3 rounded-xl border text-xs flex flex-col justify-between transition-all ${badgeBg}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-2xs font-mono uppercase">
                    {st.key}
                  </span>
                  {st.done && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  {st.failed && <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                  {!st.done && !st.failed && st.current && (
                    <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
                  )}
                </div>
                <div className="font-semibold text-2xs truncate">{st.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column Layout: Stage Subsystem Cards on Left, Audit History Timeline on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Subsystem Modules */}
        <div className="lg:col-span-2 space-y-6">
          {/* Metadata Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <TestTubes className="w-4 h-4 text-indigo-600" />
              Specimen Registration & Origin Details
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block">Specimen Type</span>
                <span className="font-semibold text-slate-900">{sample.sample_type}</span>
              </div>

              <div>
                <span className="text-slate-500 block">Host Organism</span>
                <span className="font-medium text-slate-800">{sample.organism}</span>
              </div>

              <div>
                <span className="text-slate-500 block">Collection Date</span>
                <span className="font-mono text-slate-700">{sample.collection_date}</span>
              </div>

              <div>
                <span className="text-slate-500 block">Storage Location</span>
                <span className="font-medium text-slate-800">{sample.storage_location || 'Receiving'}</span>
              </div>

              <div>
                <span className="text-slate-500 block">Assigned Technician</span>
                <span className="font-medium text-slate-800">{sample.assigned_technician_name || 'Unassigned'}</span>
              </div>

              <div>
                <span className="text-slate-500 block">Initial Volume</span>
                <span className="font-mono text-slate-800">{sample.initial_volume_ul ? `${sample.initial_volume_ul} µL` : '—'}</span>
              </div>
            </div>

            {/* Linked Request Block */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500 mr-2">Linked Request:</span>
                <span className="font-mono font-bold text-indigo-600">{sample.request_code}</span>
                <span className="text-slate-600 ml-2">({sample.test_type})</span>
              </div>
              <Link to="/requests" className="text-2xs font-semibold text-indigo-600 hover:underline">
                View Request
              </Link>
            </div>
          </div>

          {/* Subsystem 1: Sample Processing (Extraction) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-cyan-600" />
                DNA / RNA Extraction & Sample Processing
              </h2>
              {processing && <StatusBadge status={processing.status} size="sm" />}
            </div>

            {!processing ? (
              <p className="text-xs text-slate-500 italic py-2">No processing record initiated yet.</p>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-slate-500 block">Extraction Protocol</span>
                    <span className="font-semibold text-slate-800">{processing.extraction_method || 'Standard Protocol'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Elution Buffer</span>
                    <span className="text-slate-800">{processing.buffer_type || '10mM Tris-HCl'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Concentration (ng/µL)</span>
                    <span className="font-mono font-bold text-slate-900">{processing.concentration_ng_ul ? `${processing.concentration_ng_ul} ng/µL` : 'Pending'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Eluate Volume</span>
                    <span className="font-mono text-slate-900">{processing.volume_ul ? `${processing.volume_ul} µL` : 'Pending'}</span>
                  </div>
                </div>

                {processing.processing_notes && (
                  <div className="p-2.5 bg-slate-50 rounded-lg text-slate-700 text-2xs font-mono">
                    Notes: {processing.processing_notes}
                  </div>
                )}

                {/* Direct Action Shortcut for Lab Tech */}
                {sample.status === 'REGISTERED' && (
                  <Link
                    to="/processing"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-semibold"
                  >
                    Launch Extraction Protocol <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Subsystem 2: Quality Control (QC) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Quality Control Verification (QC)
              </h2>
              {qc && <StatusBadge status={qc.qc_result} size="sm" />}
            </div>

            {!qc ? (
              <div className="py-2 text-xs text-slate-500 italic flex items-center justify-between">
                <span>QC testing has not been recorded yet.</span>
                {sample.status === 'PROCESSING_COMPLETED' && (
                  <Link
                    to="/qc"
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold not-italic"
                  >
                    Perform Quality Check &rarr;
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-slate-500 block">DIN / RIN Integrity</span>
                    <span className="font-mono font-bold text-slate-900">{qc.din_rin_score ?? '—'} / 10.0</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">A260 / A280 Purity</span>
                    <span className="font-mono font-bold text-slate-900">{qc.a260_a280_ratio ?? '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">A260 / A230 Ratio</span>
                    <span className="font-mono font-bold text-slate-900">{qc.a260_a230_ratio ?? '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Post-QC Conc.</span>
                    <span className="font-mono text-slate-900">{qc.concentration_post_qc ? `${qc.concentration_post_qc} ng/µL` : '—'}</span>
                  </div>
                </div>

                {qc.qc_result === 'FAILED' && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Quality Control Failed:</span>
                      {qc.failure_reason || 'Specimen did not satisfy purity or integrity threshold.'}
                    </div>
                  </div>
                )}

                {qc.qc_comments && (
                  <p className="text-2xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-200 font-mono">
                    Spectrometry comments: {qc.qc_comments}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Subsystem 3: Sequencing Run */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Dna className="w-4 h-4 text-indigo-600" />
                High-Throughput Sequencing Instrument Run
              </h2>
              {sequencing && <StatusBadge status={sequencing.sequencing_status} size="sm" />}
            </div>

            {!sequencing ? (
              <div className="py-2 text-xs text-slate-500 italic flex items-center justify-between">
                <span>Sequencing run not launched yet.</span>
                {sample.status === 'QC_PASSED' && (
                  <Link
                    to="/sequencing"
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold not-italic"
                  >
                    Start Sequencing &rarr;
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-slate-500 block">Instrument Platform</span>
                    <span className="font-semibold text-slate-900">{sequencing.instrument_platform}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Flowcell ID</span>
                    <span className="font-mono text-slate-800">{sequencing.flowcell_id}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Sequencing Yield</span>
                    <span className="font-mono font-bold text-indigo-600">{sequencing.yield_gb ? `${sequencing.yield_gb} Gb` : 'Pending'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Q30 Quality Score</span>
                    <span className="font-mono font-bold text-emerald-600">{sequencing.q30_percent ? `${sequencing.q30_percent}%` : 'Pending'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Subsystem 4: Bioinformatics Analysis */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-600" />
                Bioinformatics Pipeline & Variant Calling
              </h2>
              {analysis && <StatusBadge status={analysis.analysis_status} size="sm" />}
            </div>

            {!analysis ? (
              <div className="py-2 text-xs text-slate-500 italic flex items-center justify-between">
                <span>Bioinformatics analysis pipeline not executed yet.</span>
                {sample.status === 'SEQUENCING_COMPLETED' && (
                  <Link
                    to="/analysis"
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold not-italic"
                  >
                    Launch Analysis Pipeline &rarr;
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-slate-500 block">Pipeline</span>
                    <span className="font-semibold text-slate-900">{analysis.pipeline_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Reference Genome</span>
                    <span className="font-mono text-slate-800">{analysis.reference_genome}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Mean Target Coverage</span>
                    <span className="font-mono font-bold text-purple-700">{analysis.mean_coverage ? `${analysis.mean_coverage}x` : '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Variants Called</span>
                    <span className="font-mono font-bold text-slate-900">{analysis.variants_called ?? '—'}</span>
                  </div>
                </div>

                {analysis.result_summary && (
                  <div className="p-3 bg-purple-50/60 rounded-lg border border-purple-200 text-slate-800 font-mono text-2xs leading-relaxed">
                    <span className="font-bold text-purple-900 block mb-1">Findings Summary:</span>
                    {analysis.result_summary}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Subsystem 5: Genomic Report & Clinical Approval */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-amber-600" />
                Genomic Clinical Report & Medical Sign-Off
              </h2>
              {report && <StatusBadge status={report.report_status} size="sm" />}
            </div>

            {!report ? (
              <div className="py-2 text-xs text-slate-500 italic flex items-center justify-between">
                <span>No clinical report generated for this sample yet.</span>
                {sample.status === 'ANALYSIS_COMPLETED' && (
                  <Link
                    to="/reports"
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold not-italic"
                  >
                    Draft Clinical Report &rarr;
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="font-mono text-2xs text-indigo-600 font-bold">{report.report_code}</span>
                  <h3 className="font-bold text-slate-900 text-sm">{report.report_title}</h3>
                </div>

                {report.findings_summary && (
                  <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    {report.findings_summary}
                  </p>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-2xs">
                  <div>
                    <span className="text-slate-400 block">Generated By</span>
                    <span className="font-medium text-slate-700">{report.generated_by_name || 'Bioinformatics Analyst'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Clinical Reviewer</span>
                    <span className="font-medium text-slate-700">{report.reviewed_by_name || 'Pending Review'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Sign-off Approver</span>
                    <span className="font-medium text-slate-700">{report.approved_by_name || 'Pending Approval'}</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <Link
                    to="/reports"
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1"
                  >
                    Open Clinical Report Viewer &rarr;
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Complete Traceability Audit Trail */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs h-fit sticky top-20">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
            <div>
              <span className="text-2xs font-mono font-bold uppercase tracking-wider text-emerald-600">
                Immutable Ledger
              </span>
              <h2 className="text-sm font-bold text-slate-900">
                Traceability Audit Trail
              </h2>
            </div>
            <span className="text-2xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">
              {history.length} events
            </span>
          </div>

          <div className="max-h-[750px] overflow-y-auto pr-1">
            <TraceabilityTimeline history={history} />
          </div>
        </div>
      </div>
    </div>
  );
};
