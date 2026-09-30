import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Sample, SequencingRequest, User } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { 
  TestTubes, 
  Plus, 
  Search, 
  Filter, 
  RefreshCw, 
  ArrowRight, 
  X, 
  Calendar, 
  MapPin, 
  AlertCircle,
  FlaskConical,
  Barcode
} from 'lucide-react';

export const SamplesPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const [samples, setSamples] = useState<Sample[]>([]);
  const [requests, setRequests] = useState<SequencingRequest[]>([]);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sampleTypeFilter, setSampleTypeFilter] = useState('');

  // Register Sample Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    request_id: '',
    sample_type: 'Peripheral Blood (EDTA)',
    organism: 'Homo sapiens',
    collection_date: new Date().toISOString().split('T')[0],
    storage_location: 'Ultra-Low Freezer A (-80C) / Box Bio-01',
    initial_volume_ul: '250',
    assigned_technician_id: '',
    notes: '',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchSamples = async () => {
    try {
      setLoading(true);
      const res = await api.samples.list({
        status: statusFilter || undefined,
        sample_type: sampleTypeFilter || undefined,
        search: search || undefined,
      });
      setSamples(res.samples);
    } catch (err) {
      console.error('Failed to load samples:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDependencies = async () => {
    try {
      const [reqRes, usersRes] = await Promise.all([
        api.requests.list(),
        api.users.list({ role: 'LAB_TECHNICIAN' }),
      ]);
      setRequests(reqRes.requests);
      setTechnicians(usersRes.users);
      if (reqRes.requests.length > 0) {
        setFormData((prev) => ({
          ...prev,
          request_id: String(reqRes.requests[0].id),
        }));
      }
    } catch (err) {
      console.error('Failed to load dependency dropdowns:', err);
    }
  };

  useEffect(() => {
    fetchSamples();
    loadDependencies();
  }, [statusFilter, sampleTypeFilter]);

  const handleRegisterSample = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);
    try {
      await api.samples.create({
        ...formData,
        request_id: parseInt(formData.request_id, 10),
        assigned_technician_id: formData.assigned_technician_id ? parseInt(formData.assigned_technician_id, 10) : undefined,
      });
      setCreateModalOpen(false);
      setFormData({
        request_id: requests.length > 0 ? String(requests[0].id) : '',
        sample_type: 'Peripheral Blood (EDTA)',
        organism: 'Homo sapiens',
        collection_date: new Date().toISOString().split('T')[0],
        storage_location: 'Ultra-Low Freezer A (-80C) / Box Bio-01',
        initial_volume_ul: '250',
        assigned_technician_id: '',
        notes: '',
      });
      await fetchSamples();
    } catch (err: any) {
      setFormError(err.message || 'Failed to register sample.');
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <TestTubes className="w-5 h-5 text-indigo-600" />
            Biological Sample Registry & Traceability
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Specimen chain-of-custody, freezer storage locations, and end-to-end audit tracking
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchSamples}
            className="p-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 shadow-2xs"
            title="Reload samples"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {hasRole('ADMIN', 'LAB_TECHNICIAN') && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Register New Sample
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={(e) => { e.preventDefault(); fetchSamples(); }} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sample code, request, storage..."
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
            <option value="">All Pipeline Stages</option>
            <option value="REGISTERED">Registered</option>
            <option value="PROCESSING">Processing</option>
            <option value="PROCESSING_COMPLETED">Extracted (Ready for QC)</option>
            <option value="QC_PASSED">QC Passed</option>
            <option value="QC_FAILED">QC Failed</option>
            <option value="SEQUENCING">Sequencing</option>
            <option value="SEQUENCING_COMPLETED">Sequencing Completed</option>
            <option value="ANALYSIS">Analysis</option>
            <option value="ANALYSIS_COMPLETED">Analysis Completed</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="APPROVED">Approved</option>
            <option value="DELIVERED">Delivered</option>
          </select>

          <select
            value={sampleTypeFilter}
            onChange={(e) => setSampleTypeFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg py-1.5 px-2.5 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Specimen Types</option>
            <option value="Peripheral Blood (EDTA)">Peripheral Blood (EDTA)</option>
            <option value="Formalin-Fixed Paraffin-Embedded (FFPE)">FFPE Tissue</option>
            <option value="Bone Marrow Aspirate">Bone Marrow Aspirate</option>
            <option value="Saliva / Buccal Swab">Saliva / Buccal</option>
            <option value="Total RNA (Fresh Frozen)">Total RNA (Fresh Frozen)</option>
            <option value="Cell Pellet (Cultured)">Cell Pellet</option>
            <option value="Fecal Biomass">Fecal Biomass</option>
          </select>
        </div>
      </div>

      {/* Samples Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-2xs border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">Sample Code</th>
                <th className="py-3 px-4 font-semibold">Associated Request</th>
                <th className="py-3 px-4 font-semibold">Specimen Type & Organism</th>
                <th className="py-3 px-4 font-semibold">Storage Location</th>
                <th className="py-3 px-4 font-semibold">Technician</th>
                <th className="py-3 px-4 font-semibold">Current Pipeline Status</th>
                <th className="py-3 px-4 font-semibold text-right">Traceability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {samples.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-500">
                    No samples found matching filter criteria.
                  </td>
                </tr>
              ) : (
                samples.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Barcode className="w-4 h-4 text-slate-400" />
                        <span className="font-mono font-bold text-indigo-600 text-sm">
                          {s.sample_code}
                        </span>
                      </div>
                      <span className="text-2xs text-slate-400 font-mono block">
                        Collected: {s.collection_date}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-slate-800">{s.request_code}</span>
                      <span className="text-2xs text-slate-500 block truncate max-w-xs">{s.test_type}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{s.sample_type}</div>
                      <div className="text-2xs text-slate-500 italic">{s.organism}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div className="flex items-center gap-1.5 text-2xs">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-xs">{s.storage_location || 'Receiving Storage'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {s.assigned_technician_name || 'Unassigned'}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={s.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/samples/${s.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 rounded-lg border border-indigo-200 transition-colors shadow-2xs"
                      >
                        Inspect Timeline <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Sample Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TestTubes className="w-5 h-5 text-indigo-600" />
                Register New Biological Sample
              </h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                {formError}
              </div>
            )}

            <form onSubmit={handleRegisterSample} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Link to Sequencing Request *
                </label>
                <select
                  required
                  value={formData.request_id}
                  onChange={(e) => setFormData({ ...formData, request_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 font-mono"
                >
                  <option value="">Select a sequencing request...</option>
                  {requests.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.request_code} — {r.requester_name} ({r.test_type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Specimen / Sample Type *
                  </label>
                  <select
                    value={formData.sample_type}
                    onChange={(e) => setFormData({ ...formData, sample_type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Peripheral Blood (EDTA)">Peripheral Blood (EDTA)</option>
                    <option value="Formalin-Fixed Paraffin-Embedded (FFPE)">FFPE Tissue Block</option>
                    <option value="Bone Marrow Aspirate">Bone Marrow Aspirate</option>
                    <option value="Saliva / Buccal Swab">Saliva / Buccal Swab</option>
                    <option value="Total RNA (Fresh Frozen)">Total RNA (Fresh Frozen)</option>
                    <option value="Cell Pellet (Cultured)">Cell Pellet (Cultured)</option>
                    <option value="Fecal Biomass">Fecal Biomass</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Organism / Species *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.organism}
                    onChange={(e) => setFormData({ ...formData, organism: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Homo sapiens"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Specimen Collection Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.collection_date}
                    onChange={(e) => setFormData({ ...formData, collection_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Initial Volume (µL)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.initial_volume_ul}
                    onChange={(e) => setFormData({ ...formData, initial_volume_ul: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                    placeholder="250.0"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Assigned Lab Technician
                </label>
                <select
                  value={formData.assigned_technician_id}
                  onChange={(e) => setFormData({ ...formData, assigned_technician_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Assign technician...</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Storage Location (Freezer / Rack / Box) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.storage_location}
                  onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ultra-Low Freezer A (-80C) / Box Bio-01 / Pos C4"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Clinical Intake Notes
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Note hemolysis, ice pack status, or barcode stickers..."
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50"
                >
                  {formSubmitting ? 'Registering...' : 'Register Specimen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
