import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { QualityCheck, Sample } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { 
  CheckCircle, 
  XCircle, 
  Search, 
  Filter, 
  RefreshCw, 
  Plus, 
  X, 
  AlertCircle,
  Eye,
  Activity,
  Award
} from 'lucide-react';

export const QualityControlPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const [qcList, setQcList] = useState<QualityCheck[]>([]);
  const [pendingSamples, setPendingSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [resultFilter, setResultFilter] = useState('');

  // QC Record Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);

  const [formData, setFormData] = useState({
    sample_id: '',
    din_rin_score: '8.5',
    a260_a280_ratio: '1.85',
    a260_a230_ratio: '2.10',
    concentration_post_qc: '55.0',
    qc_result: 'PASSED',
    failure_reason: '',
    qc_comments: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchQCData = async () => {
    try {
      setLoading(true);
      const [qcRes, samplesRes] = await Promise.all([
        api.qc.list({
          result: resultFilter || undefined,
          search: search || undefined,
        }),
        api.samples.list({ status: 'PROCESSING_COMPLETED' }),
      ]);
      setQcList(qcRes.qualityChecks);
      setPendingSamples(samplesRes.samples);
      if (samplesRes.samples.length > 0 && !formData.sample_id) {
        setFormData((prev) => ({ ...prev, sample_id: String(samplesRes.samples[0].id) }));
      }
    } catch (err) {
      console.error('Failed to load QC data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQCData();
  }, [resultFilter]);

  const handleOpenModal = (sample?: Sample) => {
    if (sample) {
      setSelectedSample(sample);
      setFormData((prev) => ({
        ...prev,
        sample_id: String(sample.id),
        din_rin_score: '8.4',
        a260_a280_ratio: '1.86',
        a260_a230_ratio: '2.15',
        concentration_post_qc: '60.0',
        qc_result: 'PASSED',
        failure_reason: '',
        qc_comments: 'TapeStation 4200 electropherogram indicates sharp 18S and 28S ribosomal RNA / intact genomic DNA band.',
      }));
    } else {
      setSelectedSample(null);
    }
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmitQC = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    if (formData.qc_result === 'FAILED' && !formData.failure_reason.trim()) {
      setFormError('Failure reason is strictly required when marking Quality Check as FAILED.');
      setSubmitting(false);
      return;
    }

    try {
      await api.qc.record({
        sample_id: parseInt(formData.sample_id, 10),
        din_rin_score: parseFloat(formData.din_rin_score),
        a260_a280_ratio: parseFloat(formData.a260_a280_ratio),
        a260_a230_ratio: parseFloat(formData.a260_a230_ratio),
        concentration_post_qc: parseFloat(formData.concentration_post_qc),
        qc_result: formData.qc_result as 'PASSED' | 'FAILED' | 'PENDING_REVIEW',
        failure_reason: formData.qc_result === 'FAILED' ? formData.failure_reason : undefined,
        qc_comments: formData.qc_comments,
      });

      setModalOpen(false);
      await fetchQCData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit QC verification.');
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
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            Quality Control (QC) & Sample Integrity Station
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            TapeStation/Bioanalyzer RIN/DIN, NanoDrop spectrophotometry (A260/A280, A260/A230), and gatekeeping
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchQCData}
            className="p-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 shadow-2xs"
            title="Reload QC records"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {hasRole('ADMIN', 'LAB_TECHNICIAN') && (
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Record New QC Test
            </button>
          )}
        </div>
      </div>

      {/* Awaiting QC Notice / Queue */}
      {pendingSamples.length > 0 && (
        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider">
              <Activity className="w-4 h-4 text-amber-600" />
              Samples Extracted & Awaiting QC Gatekeeping ({pendingSamples.length})
            </div>
            <span className="text-2xs text-amber-700 font-mono">Immediate Action</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 mt-3">
            {pendingSamples.map((s) => (
              <div
                key={s.id}
                className="bg-white p-3 rounded-lg border border-amber-200 shadow-2xs flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-mono font-bold text-indigo-600">{s.sample_code}</span>
                  <span className="text-2xs text-slate-500 block truncate">{s.sample_type}</span>
                </div>
                {hasRole('ADMIN', 'LAB_TECHNICIAN') && (
                  <button
                    onClick={() => handleOpenModal(s)}
                    className="px-2.5 py-1 text-2xs font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors shadow-2xs"
                  >
                    Perform QC
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={(e) => { e.preventDefault(); fetchQCData(); }} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sample code, comments..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg py-1.5 px-2.5 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All QC Results</option>
            <option value="PASSED">Passed (Eligible for Sequencing)</option>
            <option value="FAILED">Failed (Threshold Breached)</option>
            <option value="PENDING_REVIEW">Pending Review</option>
          </select>
        </div>
      </div>

      {/* QC Records Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-2xs border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">Sample Code</th>
                <th className="py-3 px-4 font-semibold">Specimen & Request</th>
                <th className="py-3 px-4 font-semibold">DIN / RIN Integrity</th>
                <th className="py-3 px-4 font-semibold">A260 / A280 (Purity)</th>
                <th className="py-3 px-4 font-semibold">A260 / A230</th>
                <th className="py-3 px-4 font-semibold">Post-QC Conc.</th>
                <th className="py-3 px-4 font-semibold">QC Result</th>
                <th className="py-3 px-4 font-semibold">Technician</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {qcList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-500">
                    No QC evaluation records found matching criteria.
                  </td>
                </tr>
              ) : (
                qcList.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-indigo-600 block text-sm">
                        {q.sample_code}
                      </span>
                      <span className="text-2xs text-slate-400 font-mono">
                        {new Date(q.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{q.sample_type}</div>
                      <div className="text-2xs text-slate-500 font-mono">{q.request_code}</div>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <span className={`font-bold ${q.din_rin_score && q.din_rin_score >= 7.0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {q.din_rin_score !== null ? `${q.din_rin_score} / 10` : '—'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <span className={`font-semibold ${q.a260_a280_ratio && q.a260_a280_ratio >= 1.7 && q.a260_a280_ratio <= 2.1 ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {q.a260_a280_ratio ?? '—'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {q.a260_a230_ratio ?? '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-900 font-medium">
                      {q.concentration_post_qc ? `${q.concentration_post_qc} ng/µL` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={q.qc_result} size="sm" />
                      {q.qc_result === 'FAILED' && q.failure_reason && (
                        <span className="block text-2xs text-rose-600 font-medium mt-0.5 truncate max-w-xs">
                          {q.failure_reason}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {q.technician_name || 'System Operator'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/samples/${q.sample_id}`}
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

      {/* QC Form Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Record Quality Control (QC) Measurements
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitQC} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Target Sample Specimen *
                </label>
                <select
                  required
                  value={formData.sample_id}
                  onChange={(e) => setFormData({ ...formData, sample_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 font-mono"
                >
                  <option value="">Select sample for QC evaluation...</option>
                  {pendingSamples.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.sample_code} — {s.sample_type} ({s.request_code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    DIN / RIN Score (0 - 10) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    required
                    value={formData.din_rin_score}
                    onChange={(e) => setFormData({ ...formData, din_rin_score: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                    placeholder="8.5"
                  />
                  <span className="text-2xs text-slate-400">Pass benchmark: &ge; 7.0</span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    A260 / A280 Purity *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.a260_a280_ratio}
                    onChange={(e) => setFormData({ ...formData, a260_a280_ratio: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                    placeholder="1.85"
                  />
                  <span className="text-2xs text-slate-400">Pure DNA ~1.8, RNA ~2.0</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    A260 / A230 Ratio
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.a260_a230_ratio}
                    onChange={(e) => setFormData({ ...formData, a260_a230_ratio: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                    placeholder="2.10"
                  />
                  <span className="text-2xs text-slate-400">Salt/solvent benchmark: 2.0 - 2.2</span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Post-QC Conc. (ng/µL) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.concentration_post_qc}
                    onChange={(e) => setFormData({ ...formData, concentration_post_qc: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                    placeholder="55.0"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  QC Gatekeeping Decision *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, qc_result: 'PASSED' })}
                    className={`py-2 px-3 rounded-lg border font-semibold flex items-center justify-center gap-2 ${
                      formData.qc_result === 'PASSED'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20'
                        : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    QC PASSED (Proceed)
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, qc_result: 'FAILED' })}
                    className={`py-2 px-3 rounded-lg border font-semibold flex items-center justify-center gap-2 ${
                      formData.qc_result === 'FAILED'
                        ? 'bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-500/20'
                        : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <XCircle className="w-4 h-4 text-rose-600" />
                    QC FAILED (Block)
                  </button>
                </div>
              </div>

              {formData.qc_result === 'FAILED' && (
                <div>
                  <label className="block font-semibold text-rose-700 mb-1">
                    Deficiency / Failure Root Cause *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.failure_reason}
                    onChange={(e) => setFormData({ ...formData, failure_reason: e.target.value })}
                    className="w-full px-3 py-2 border border-rose-300 bg-rose-50/40 rounded-lg focus:ring-2 focus:ring-rose-500"
                    placeholder="e.g. DIN 4.8 indicates severe degradation; A260/A230 of 1.1 reflects phenol salt carryover."
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Instrument / Spectrometry Notes
                </label>
                <textarea
                  rows={2}
                  value={formData.qc_comments}
                  onChange={(e) => setFormData({ ...formData, qc_comments: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="TapeStation 4200 trace uploaded; clean single 18S/28S peak observed..."
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Recording...' : 'Commit QC Determination'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
