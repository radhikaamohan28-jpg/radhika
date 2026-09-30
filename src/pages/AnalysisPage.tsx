import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AnalysisRun, Sample } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { 
  Cpu, 
  Search, 
  Filter, 
  RefreshCw, 
  Play, 
  CheckCircle, 
  X, 
  AlertCircle,
  Eye,
  Activity,
  Plus,
  Terminal,
  FileCode
} from 'lucide-react';

export const AnalysisPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const [analyses, setAnalyses] = useState<AnalysisRun[]>([]);
  const [eligibleSamples, setEligibleSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [completeModalItem, setCompleteModalItem] = useState<AnalysisRun | null>(null);

  // Start Form
  const [startForm, setStartForm] = useState({
    sample_id: '',
    pipeline_name: 'GATK Best Practices Germline (BWA-MEM2 + HaplotypeCaller)',
    pipeline_version: 'v4.5.0.0 (Containerized WDL/Cromwell)',
    reference_genome: 'GRCh38 / hg38 (GCA_000001405.15)',
  });

  // Complete Form
  const [completeForm, setCompleteForm] = useState({
    mean_coverage: '36.8',
    variants_called: '4821540',
    result_summary: '',
    status: 'COMPLETED',
  });

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchAnalysisData = async () => {
    try {
      setLoading(true);
      const [analysisRes, samplesRes] = await Promise.all([
        api.analysis.list({
          status: statusFilter || undefined,
          search: search || undefined,
        }),
        api.samples.list({ status: 'SEQUENCING_COMPLETED' }),
      ]);
      setAnalyses(analysisRes.analyses);
      setEligibleSamples(samplesRes.samples);
      if (samplesRes.samples.length > 0 && !startForm.sample_id) {
        setStartForm((prev) => ({ ...prev, sample_id: String(samplesRes.samples[0].id) }));
      }
    } catch (err) {
      console.error('Failed to load analysis data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysisData();
  }, [statusFilter]);

  const handleStartSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const sampleId = parseInt(startForm.sample_id, 10);
      await api.analysis.start(sampleId, {
        pipeline_name: startForm.pipeline_name,
        pipeline_version: startForm.pipeline_version,
        reference_genome: startForm.reference_genome,
      });
      setStartModalOpen(false);
      await fetchAnalysisData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to start analysis pipeline.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeModalItem) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await api.analysis.complete(completeModalItem.sample_id, {
        mean_coverage: parseFloat(completeForm.mean_coverage),
        variants_called: parseInt(completeForm.variants_called, 10),
        result_summary: completeForm.result_summary,
        status: completeForm.status,
      });
      setCompleteModalItem(null);
      await fetchAnalysisData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to complete analysis pipeline.');
    } finally {
      setSubmitting(false);
    }
  };

  const openCompleteModal = (item: AnalysisRun) => {
    setCompleteModalItem(item);
    setCompleteForm({
      mean_coverage: item.mean_coverage ? String(item.mean_coverage) : '38.5',
      variants_called: item.variants_called ? String(item.variants_called) : '4820190',
      result_summary: item.result_summary || 'Identified pathogenic variant in targeted locus; ClinVar class 5 concordance.',
      status: 'COMPLETED',
    });
    setFormError(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Cpu className="w-5 h-5 text-purple-600" />
            Bioinformatics Secondary Pipeline & Variant Calling
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            BWA-MEM2 alignment (BAM/CRAM), MarkDuplicates, GATK HaplotypeCaller (gVCF/VCF), and annotation
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchAnalysisData}
            className="p-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 shadow-2xs"
            title="Reload analysis runs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {hasRole('ADMIN', 'BIOINFORMATICS_ANALYST') && (
            <button
              onClick={() => { setFormError(null); setStartModalOpen(true); }}
              className="flex items-center gap-2 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Launch Pipeline Job
            </button>
          )}
        </div>
      </div>

      {/* Eligible Queue */}
      {eligibleSamples.length > 0 && (
        <div className="p-4 bg-purple-50/70 rounded-xl border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-900 uppercase tracking-wider">
              <Activity className="w-4 h-4 text-purple-600" />
              Sequenced Samples Ready for Pipeline Analysis ({eligibleSamples.length})
            </div>
            <span className="text-2xs text-purple-700 font-mono">FASTQ Ready</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 mt-3">
            {eligibleSamples.map((s) => (
              <div
                key={s.id}
                className="bg-white p-3 rounded-lg border border-purple-200 shadow-2xs flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-mono font-bold text-indigo-600">{s.sample_code}</span>
                  <span className="text-2xs text-slate-500 block truncate">{s.sample_type}</span>
                </div>
                {hasRole('ADMIN', 'BIOINFORMATICS_ANALYST') && (
                  <button
                    onClick={() => {
                      setStartForm((prev) => ({ ...prev, sample_id: String(s.id) }));
                      setStartModalOpen(true);
                    }}
                    className="px-2.5 py-1 text-2xs font-semibold bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors shadow-2xs"
                  >
                    Execute Pipeline
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={(e) => { e.preventDefault(); fetchAnalysisData(); }} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sample code, pipeline, findings..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg py-1.5 px-2.5 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Pipeline Statuses</option>
            <option value="RUNNING">Running (Alignment/Calling)</option>
            <option value="COMPLETED">Completed (VCF Output Ready)</option>
            <option value="FAILED">Pipeline Failed</option>
          </select>
        </div>
      </div>

      {/* Analyses Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-2xs border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">Sample Code</th>
                <th className="py-3 px-4 font-semibold">Pipeline Architecture</th>
                <th className="py-3 px-4 font-semibold">Reference Genome</th>
                <th className="py-3 px-4 font-semibold">Mean Coverage</th>
                <th className="py-3 px-4 font-semibold">Variants Called</th>
                <th className="py-3 px-4 font-semibold">Pipeline Status</th>
                <th className="py-3 px-4 font-semibold">Analyst</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {analyses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-500">
                    No pipeline runs found matching criteria.
                  </td>
                </tr>
              ) : (
                analyses.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-indigo-600 block text-sm">
                        {a.sample_code}
                      </span>
                      <span className="text-2xs text-slate-400 font-mono">{a.request_code}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{a.pipeline_name}</div>
                      <div className="text-2xs text-slate-500 font-mono">{a.pipeline_version}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {a.reference_genome}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {a.mean_coverage ? (
                        <span className="font-bold text-purple-700">{a.mean_coverage}x</span>
                      ) : (
                        <span className="text-slate-400 italic">Calculating...</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {a.variants_called !== null ? (
                        <span className="font-bold text-slate-900">{a.variants_called.toLocaleString()}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={a.analysis_status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {a.analyst_name || 'System Pipeline'}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {hasRole('ADMIN', 'BIOINFORMATICS_ANALYST') && a.analysis_status === 'RUNNING' && (
                        <button
                          onClick={() => openCompleteModal(a)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-2xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded border border-emerald-200"
                        >
                          <CheckCircle className="w-3 h-3" /> Finish Pipeline
                        </button>
                      )}

                      <Link
                        to={`/samples/${a.sample_id}`}
                        className="inline-flex items-center gap-1 px-2 py-1 text-2xs font-medium text-slate-600 hover:bg-slate-100 rounded"
                        title="View Full Sample Traceability"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Launch Job Modal */}
      {startModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-600" />
                Initialize Bioinformatics Pipeline Execution
              </h3>
              <button onClick={() => setStartModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                {formError}
              </div>
            )}

            <form onSubmit={handleStartSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Sequenced Sample Target *
                </label>
                <select
                  required
                  value={startForm.sample_id}
                  onChange={(e) => setStartForm({ ...startForm, sample_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 font-mono"
                >
                  <option value="">Select sequenced sample with FASTQ ready...</option>
                  {eligibleSamples.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.sample_code} — {s.sample_type} ({s.test_type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Analysis Pipeline Framework *
                </label>
                <select
                  value={startForm.pipeline_name}
                  onChange={(e) => setStartForm({ ...startForm, pipeline_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="GATK Best Practices Germline (BWA-MEM2 + HaplotypeCaller)">GATK Best Practices Germline (BWA-MEM2 + HaplotypeCaller)</option>
                  <option value="Illumina DRAGEN Bio-IT Platform (Accelerated Hardware)">Illumina DRAGEN Bio-IT Platform (Accelerated Hardware)</option>
                  <option value="Sentieon Somatic Tumor/Matched-Normal Pipeline">Sentieon Somatic Tumor/Matched-Normal Pipeline</option>
                  <option value="RNA-Seq Differential Expression (STAR + DESeq2)">RNA-Seq Differential Expression (STAR + DESeq2)</option>
                  <option value="Metagenomic Profiling (Kraken2 + Bracken)">Metagenomic Profiling (Kraken2 + Bracken)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Pipeline Container Version *
                  </label>
                  <input
                    type="text"
                    required
                    value={startForm.pipeline_version}
                    onChange={(e) => setStartForm({ ...startForm, pipeline_version: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Reference Genome Build *
                  </label>
                  <select
                    value={startForm.reference_genome}
                    onChange={(e) => setStartForm({ ...startForm, reference_genome: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 font-mono"
                  >
                    <option value="GRCh38 / hg38 (GCA_000001405.15)">GRCh38 / hg38</option>
                    <option value="CHM13-T2T v2.0 (Telomere-to-Telomere)">CHM13-T2T v2.0</option>
                    <option value="GRCh37 / hg19 (Legacy)">GRCh37 / hg19</option>
                    <option value="GRCm39 (Mus musculus)">GRCm39 (Mouse)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStartModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Dispatch Pipeline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Pipeline Modal */}
      {completeModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Finalize Variant Calling for {completeModalItem.sample_code}
              </h3>
              <button onClick={() => setCompleteModalItem(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                {formError}
              </div>
            )}

            <form onSubmit={handleCompleteSubmit} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mean Target Coverage (x) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={completeForm.mean_coverage}
                    onChange={(e) => setCompleteForm({ ...completeForm, mean_coverage: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                    placeholder="38.5"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Total Variants Called (SNV/Indel) *
                  </label>
                  <input
                    type="number"
                    required
                    value={completeForm.variants_called}
                    onChange={(e) => setCompleteForm({ ...completeForm, variants_called: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                    placeholder="4820190"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Bioinformatics Findings & ACMG Variant Summary *
                </label>
                <textarea
                  rows={3}
                  required
                  value={completeForm.result_summary}
                  onChange={(e) => setCompleteForm({ ...completeForm, result_summary: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                  placeholder="e.g. Heterozygous pathogenic variant identified in BRCA1 c.5266dupC (p.Gln1756Profs*74); ClinVar ID: 17652."
                />
              </div>

              <div className="p-2.5 bg-indigo-50 rounded-lg border border-indigo-100 text-2xs text-indigo-900 leading-relaxed">
                <strong>Next Workflow Step:</strong> Completing this pipeline will advance the sample to <span className="font-mono font-bold">ANALYSIS_COMPLETED</span> and automatically unlock clinical report drafting.
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCompleteModalItem(null)}
                  className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Finalize & Publish VCF'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
