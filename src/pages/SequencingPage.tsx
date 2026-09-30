import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { SequencingRun, Sample } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { 
  Dna, 
  Search, 
  Filter, 
  RefreshCw, 
  Play, 
  CheckCircle, 
  X, 
  AlertCircle,
  Eye,
  Activity,
  Plus
} from 'lucide-react';

export const SequencingPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const [runs, setRuns] = useState<SequencingRun[]>([]);
  const [eligibleSamples, setEligibleSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [completeModalItem, setCompleteModalItem] = useState<SequencingRun | null>(null);

  // Start Form
  const [startForm, setStartForm] = useState({
    sample_id: '',
    instrument_platform: 'Illumina NovaSeq X Plus',
    flowcell_id: 'FC-NX-99824',
    read_length: '2x150 bp (Paired-End)',
    target_depth: '30x Genome / 100x Exome',
  });

  // Complete Form
  const [completeForm, setCompleteForm] = useState({
    yield_gb: '124.5',
    q30_percent: '92.4',
    status: 'COMPLETED',
  });

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchSequencingData = async () => {
    try {
      setLoading(true);
      const [runsRes, samplesRes] = await Promise.all([
        api.sequencing.list({
          status: statusFilter || undefined,
          search: search || undefined,
        }),
        api.samples.list({ status: 'QC_PASSED' }),
      ]);
      setRuns(runsRes.sequencingRuns);
      setEligibleSamples(samplesRes.samples);
      if (samplesRes.samples.length > 0 && !startForm.sample_id) {
        setStartForm((prev) => ({ ...prev, sample_id: String(samplesRes.samples[0].id) }));
      }
    } catch (err) {
      console.error('Failed to load sequencing data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSequencingData();
  }, [statusFilter]);

  const handleStartSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const sampleId = parseInt(startForm.sample_id, 10);
      await api.sequencing.start(sampleId, {
        instrument_platform: startForm.instrument_platform,
        flowcell_id: startForm.flowcell_id,
        read_length: startForm.read_length,
        target_depth: startForm.target_depth,
      });
      setStartModalOpen(false);
      await fetchSequencingData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to initialize sequencing run.');
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
      await api.sequencing.complete(completeModalItem.sample_id, {
        yield_gb: parseFloat(completeForm.yield_gb),
        q30_percent: parseFloat(completeForm.q30_percent),
        status: completeForm.status,
      });
      setCompleteModalItem(null);
      await fetchSequencingData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to complete sequencing run.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Dna className="w-5 h-5 text-indigo-600" />
            Next-Generation High-Throughput Sequencing Runs
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Flowcell clustering, dual-index demultiplexing, basecalling (BCL &rarr; FASTQ), and Q30 metrics
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchSequencingData}
            className="p-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 shadow-2xs"
            title="Reload sequencing runs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {hasRole('ADMIN', 'BIOINFORMATICS_ANALYST') && (
            <button
              onClick={() => { setFormError(null); setStartModalOpen(true); }}
              className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Launch New Sequencing Run
            </button>
          )}
        </div>
      </div>

      {/* Eligible Samples Callout */}
      {eligibleSamples.length > 0 && (
        <div className="p-4 bg-indigo-50/70 rounded-xl border border-indigo-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 uppercase tracking-wider">
              <Activity className="w-4 h-4 text-indigo-600" />
              QC-Passed Samples Ready for Sequencing ({eligibleSamples.length})
            </div>
            <span className="text-2xs text-indigo-700 font-mono">Eligible Queue</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 mt-3">
            {eligibleSamples.map((s) => (
              <div
                key={s.id}
                className="bg-white p-3 rounded-lg border border-indigo-200 shadow-2xs flex items-center justify-between text-xs"
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
                    className="px-2.5 py-1 text-2xs font-semibold bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors shadow-2xs"
                  >
                    Load Run
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={(e) => { e.preventDefault(); fetchSequencingData(); }} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search run code, flowcell, platform..."
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
            <option value="">All Run Statuses</option>
            <option value="IN_PROGRESS">In Progress (Sequencing)</option>
            <option value="COMPLETED">Completed (FASTQ Ready)</option>
            <option value="FAILED">Failed Run</option>
          </select>
        </div>
      </div>

      {/* Sequencing Runs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-2xs border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">Run Code</th>
                <th className="py-3 px-4 font-semibold">Sample Code</th>
                <th className="py-3 px-4 font-semibold">Platform & Flowcell</th>
                <th className="py-3 px-4 font-semibold">Configuration</th>
                <th className="py-3 px-4 font-semibold">Total Yield</th>
                <th className="py-3 px-4 font-semibold">Q30 Score</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Operator</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-500">
                    No sequencing runs found matching criteria.
                  </td>
                </tr>
              ) : (
                runs.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                      {r.run_code}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-semibold text-slate-900 block">{r.sample_code}</span>
                      <span className="text-2xs text-slate-500 font-mono">{r.request_code}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{r.instrument_platform}</div>
                      <div className="text-2xs text-slate-500 font-mono">Flowcell: {r.flowcell_id}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div>{r.read_length}</div>
                      <div className="text-2xs text-slate-400 font-mono">Depth: {r.target_depth}</div>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {r.yield_gb ? (
                        <span className="font-bold text-slate-900">{r.yield_gb} Gb</span>
                      ) : (
                        <span className="text-slate-400 italic">Sequencing...</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {r.q30_percent ? (
                        <span className="font-bold text-emerald-700">{r.q30_percent}%</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={r.sequencing_status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {r.operator_name || 'System'}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {hasRole('ADMIN', 'BIOINFORMATICS_ANALYST') && r.sequencing_status === 'IN_PROGRESS' && (
                        <button
                          onClick={() => {
                            setCompleteModalItem(r);
                            setCompleteForm({
                              yield_gb: r.yield_gb ? String(r.yield_gb) : '128.6',
                              q30_percent: r.q30_percent ? String(r.q30_percent) : '93.2',
                              status: 'COMPLETED',
                            });
                            setFormError(null);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-2xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded border border-emerald-200"
                        >
                          <CheckCircle className="w-3 h-3" /> Complete Run
                        </button>
                      )}

                      <Link
                        to={`/samples/${r.sample_id}`}
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

      {/* Launch Run Modal */}
      {startModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Dna className="w-4 h-4 text-indigo-600" />
                Configure & Launch Sequencing Run
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
                  QC-Passed Specimen Target *
                </label>
                <select
                  required
                  value={startForm.sample_id}
                  onChange={(e) => setStartForm({ ...startForm, sample_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 font-mono"
                >
                  <option value="">Select QC-passed sample...</option>
                  {eligibleSamples.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.sample_code} — {s.sample_type} ({s.test_type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Instrument Platform *
                </label>
                <select
                  value={startForm.instrument_platform}
                  onChange={(e) => setStartForm({ ...startForm, instrument_platform: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Illumina NovaSeq X Plus">Illumina NovaSeq X Plus (High-Throughput)</option>
                  <option value="Illumina NextSeq 2000">Illumina NextSeq 2000 (Targeted / Exome)</option>
                  <option value="Oxford Nanopore PromethION 24">Oxford Nanopore PromethION 24 (Long Reads)</option>
                  <option value="PacBio Revio (HiFi Reads)">PacBio Revio (HiFi Long Reads)</option>
                  <option value="MGI DNBSEQ-T7">MGI DNBSEQ-T7</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Flowcell Barcode ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={startForm.flowcell_id}
                    onChange={(e) => setStartForm({ ...startForm, flowcell_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                    placeholder="FC-NX-99824"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Read Configuration *
                  </label>
                  <input
                    type="text"
                    required
                    value={startForm.read_length}
                    onChange={(e) => setStartForm({ ...startForm, read_length: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                    placeholder="2x150 bp (Paired-End)"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Target Sequencing Depth
                </label>
                <input
                  type="text"
                  value={startForm.target_depth}
                  onChange={(e) => setStartForm({ ...startForm, target_depth: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="30x Genome / 100x Exome"
                />
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
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Starting...' : 'Launch Sequencing Run'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Run Modal */}
      {completeModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Complete Sequencing Run {completeModalItem.run_code}
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
                    Sequencing Yield (Gb) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={completeForm.yield_gb}
                    onChange={(e) => setCompleteForm({ ...completeForm, yield_gb: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                    placeholder="124.5"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Q30 Quality Score (%) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    required
                    value={completeForm.q30_percent}
                    onChange={(e) => setCompleteForm({ ...completeForm, q30_percent: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                    placeholder="92.4"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Run Completion Outcome *
                </label>
                <select
                  value={completeForm.status}
                  onChange={(e) => setCompleteForm({ ...completeForm, status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="COMPLETED">Run Successfully Completed (FASTQ Generation OK)</option>
                  <option value="FAILED">Run Terminated / Optical Laser Error</option>
                </select>
              </div>

              <div className="p-2.5 bg-indigo-50 rounded-lg border border-indigo-100 text-2xs text-indigo-900 leading-relaxed">
                <strong>Next Step:</strong> Completing this run will advance the sample to <span className="font-mono font-bold">SEQUENCING_COMPLETED</span>, readying raw FASTQ data for secondary bioinformatics analysis and alignment.
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
                  {submitting ? 'Committing...' : 'Commit Run Results'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
