import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { SampleProcessing } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { 
  FlaskConical, 
  Search, 
  Filter, 
  RefreshCw, 
  Play, 
  CheckCircle, 
  Clock, 
  X, 
  AlertCircle,
  Eye,
  Beaker
} from 'lucide-react';

export const ProcessingPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const [processingList, setProcessingList] = useState<SampleProcessing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [startModalItem, setStartModalItem] = useState<SampleProcessing | null>(null);
  const [completeModalItem, setCompleteModalItem] = useState<SampleProcessing | null>(null);

  // Start Form
  const [startForm, setStartForm] = useState({
    extraction_method: 'Magnetic Bead-Based Automated DNA Extraction',
    buffer_type: '10mM Tris-HCl, pH 8.5',
    notes: '',
  });

  // Complete Form
  const [completeForm, setCompleteForm] = useState({
    concentration_ng_ul: '',
    volume_ul: '',
    extraction_method: '',
    buffer_type: '',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchProcessing = async () => {
    try {
      setLoading(true);
      const res = await api.processing.list({
        status: statusFilter || undefined,
        search: search || undefined,
      });
      setProcessingList(res.processing);
    } catch (err) {
      console.error('Failed to load processing list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcessing();
  }, [statusFilter]);

  const handleStartSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startModalItem) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await api.processing.start(startModalItem.sample_id, startForm);
      setStartModalItem(null);
      await fetchProcessing();
    } catch (err: any) {
      setFormError(err.message || 'Failed to start processing.');
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
      await api.processing.complete(completeModalItem.sample_id, completeForm);
      setCompleteModalItem(null);
      await fetchProcessing();
    } catch (err: any) {
      setFormError(err.message || 'Failed to complete processing.');
    } finally {
      setSubmitting(false);
    }
  };

  const openCompleteModal = (item: SampleProcessing) => {
    setCompleteModalItem(item);
    setCompleteForm({
      concentration_ng_ul: item.concentration_ng_ul ? String(item.concentration_ng_ul) : '55.0',
      volume_ul: item.volume_ul ? String(item.volume_ul) : '50.0',
      extraction_method: item.extraction_method || 'Automated Spin-Column / Magnetic Bead',
      buffer_type: item.buffer_type || '10mM Tris-HCl, pH 8.5',
      notes: item.processing_notes || '',
    });
    setFormError(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-cyan-600" />
            DNA / RNA Sample Processing & Extraction Workstation
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Lysis protocols, magnetic bead & column purification, yield quantitation
          </p>
        </div>

        <button
          onClick={fetchProcessing}
          className="p-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 shadow-2xs self-start sm:self-auto"
          title="Reload processing tasks"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={(e) => { e.preventDefault(); fetchProcessing(); }} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sample code, method, request..."
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
            <option value="">All Processing States</option>
            <option value="PENDING">Pending Start</option>
            <option value="PROCESSING">Currently Extracting</option>
            <option value="COMPLETED">Completed (Ready for QC)</option>
            <option value="ON_HOLD">On Hold</option>
          </select>
        </div>
      </div>

      {/* Processing Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-2xs border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">Sample Code</th>
                <th className="py-3 px-4 font-semibold">Specimen & Request</th>
                <th className="py-3 px-4 font-semibold">Extraction Method</th>
                <th className="py-3 px-4 font-semibold">Concentration</th>
                <th className="py-3 px-4 font-semibold">Eluate Volume</th>
                <th className="py-3 px-4 font-semibold">Technician</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {processingList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-500">
                    No processing records found matching criteria.
                  </td>
                </tr>
              ) : (
                processingList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-indigo-600 block text-sm">
                        {item.sample_code}
                      </span>
                      <StatusBadge status={item.sample_status || ''} size="sm" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{item.sample_type}</div>
                      <div className="text-2xs text-slate-500 font-mono">
                        {item.request_code} • {item.test_type}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 max-w-xs truncate">
                      {item.extraction_method || 'Standard Extraction'}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {item.concentration_ng_ul ? (
                        <span className="font-bold text-slate-900">{item.concentration_ng_ul} ng/µL</span>
                      ) : (
                        <span className="text-slate-400 italic">Not measured</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {item.volume_ul ? `${item.volume_ul} µL` : '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {item.technician_name || 'Unassigned'}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={item.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {hasRole('ADMIN', 'LAB_TECHNICIAN') && item.status === 'PENDING' && (
                        <button
                          onClick={() => { setStartModalItem(item); setFormError(null); }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-2xs font-semibold bg-cyan-50 text-cyan-700 hover:bg-cyan-100 rounded border border-cyan-200"
                        >
                          <Play className="w-3 h-3" /> Start
                        </button>
                      )}

                      {hasRole('ADMIN', 'LAB_TECHNICIAN') && item.status === 'PROCESSING' && (
                        <button
                          onClick={() => openCompleteModal(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-2xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded border border-emerald-200"
                        >
                          <CheckCircle className="w-3 h-3" /> Complete
                        </button>
                      )}

                      <Link
                        to={`/samples/${item.sample_id}`}
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

      {/* Start Processing Modal */}
      {startModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Play className="w-4 h-4 text-cyan-600" />
                Initiate Sample Processing for {startModalItem.sample_code}
              </h3>
              <button onClick={() => setStartModalItem(null)} className="text-slate-400 hover:text-slate-600">
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
                  Extraction Protocol / Method *
                </label>
                <select
                  value={startForm.extraction_method}
                  onChange={(e) => setStartForm({ ...startForm, extraction_method: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Magnetic Bead-Based Automated DNA Extraction">Magnetic Bead-Based Automated DNA Extraction</option>
                  <option value="Column-Based FFPE Deparaffinization & Extraction">Column-Based FFPE Deparaffinization & Extraction</option>
                  <option value="Ficoll-Paque Gradient + Silica Spin Column">Ficoll-Paque Gradient + Silica Spin Column</option>
                  <option value="TRIzol Reagent + RNeasy Mini Column">TRIzol Reagent + RNeasy Mini Column</option>
                  <option value="Bead-Beating Mechanical Homogenizer">Bead-Beating Mechanical Homogenizer</option>
                  <option value="Standard Organic Phenol-Chloroform">Standard Organic Phenol-Chloroform</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Elution Buffer *
                </label>
                <input
                  type="text"
                  required
                  value={startForm.buffer_type}
                  onChange={(e) => setStartForm({ ...startForm, buffer_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="10mM Tris-HCl, pH 8.5"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Bench Operator Notes
                </label>
                <textarea
                  rows={2}
                  value={startForm.notes}
                  onChange={(e) => setStartForm({ ...startForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Note lot numbers, centrifuge RPM, or lysis incubation temperature..."
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStartModalItem(null)}
                  className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Starting...' : 'Start Extraction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Processing Modal */}
      {completeModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Complete Extraction for {completeModalItem.sample_code}
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
                    Concentration (ng/µL) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={completeForm.concentration_ng_ul}
                    onChange={(e) => setCompleteForm({ ...completeForm, concentration_ng_ul: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                    placeholder="e.g. 68.4"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Eluate Volume (µL) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={completeForm.volume_ul}
                    onChange={(e) => setCompleteForm({ ...completeForm, volume_ul: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                    placeholder="e.g. 50.0"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Extraction Method Confirmed
                </label>
                <input
                  type="text"
                  value={completeForm.extraction_method}
                  onChange={(e) => setCompleteForm({ ...completeForm, extraction_method: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Quality & Observation Notes
                </label>
                <textarea
                  rows={2}
                  value={completeForm.notes}
                  onChange={(e) => setCompleteForm({ ...completeForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Eluate is clear; no particulates or brown humic tint..."
                />
              </div>

              <div className="p-2.5 bg-indigo-50 rounded-lg border border-indigo-100 text-2xs text-indigo-900 leading-relaxed">
                <strong>Next Workflow Step:</strong> Completing extraction will advance the sample to <span className="font-mono font-bold">PROCESSING_COMPLETED</span> and queue it in the Quality Control (QC) module.
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
                  {submitting ? 'Submitting...' : 'Mark Extraction Complete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
