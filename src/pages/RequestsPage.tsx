import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { SequencingRequest, Sample } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { 
  FileSpreadsheet, 
  Plus, 
  Search, 
  Filter, 
  RefreshCw, 
  Eye, 
  X, 
  TestTubes, 
  Calendar, 
  Building, 
  Mail, 
  User as UserIcon,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const RequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<SequencingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<SequencingRequest | null>(null);
  const [selectedRequestSamples, setSelectedRequestSamples] = useState<Sample[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    requester_name: '',
    requester_email: '',
    institution: '',
    test_type: 'Whole Genome Sequencing (WGS)',
    priority: 'STANDARD',
    description: '',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.requests.list({
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        search: search || undefined,
      });
      setRequests(res.requests);
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter, priorityFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRequests();
  };

  const handleOpenDetails = async (req: SequencingRequest) => {
    setSelectedRequest(req);
    setDetailsLoading(true);
    try {
      const res = await api.requests.get(req.id);
      setSelectedRequest(res.request);
      setSelectedRequestSamples(res.samples);
    } catch (err) {
      console.error('Failed to load request details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);
    try {
      await api.requests.create(formData);
      setCreateModalOpen(false);
      setFormData({
        requester_name: '',
        requester_email: '',
        institution: '',
        test_type: 'Whole Genome Sequencing (WGS)',
        priority: 'STANDARD',
        description: '',
      });
      await fetchRequests();
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit request.');
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            Sequencing Request Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Intake intake, clinical specifications, test types, and sample batch allocations
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchRequests}
            className="p-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 shadow-2xs"
            title="Reload requests"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Sequencing Request
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code, requester, test..."
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
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg py-1.5 px-2.5 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="STANDARD">Standard</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-2xs border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">Request Code</th>
                <th className="py-3 px-4 font-semibold">Requester / Client</th>
                <th className="py-3 px-4 font-semibold">Institution</th>
                <th className="py-3 px-4 font-semibold">Assay / Test Type</th>
                <th className="py-3 px-4 font-semibold">Priority</th>
                <th className="py-3 px-4 font-semibold text-center">Samples</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-500">
                    No sequencing requests found matching criteria.
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                      {r.request_code}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{r.requester_name}</div>
                      <div className="text-2xs text-slate-500 font-mono">{r.requester_email}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 truncate max-w-xs">
                      {r.institution || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-medium">
                      {r.test_type}
                    </td>
                    <td className="py-3 px-4">
                      <PriorityBadge priority={r.priority} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-mono font-bold bg-slate-100 text-slate-700">
                        {r.sample_count || 0}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={r.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-2xs">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenDetails(r)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-2xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Request Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                Submit New Sequencing Request
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

            <form onSubmit={handleCreateRequest} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Requester / Principal Investigator *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.requester_name}
                    onChange={(e) => setFormData({ ...formData, requester_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Prof. Jane Doe, M.D."
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Contact Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.requester_email}
                    onChange={(e) => setFormData({ ...formData, requester_email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="jdoe@hospital.edu"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Affiliated Institution / Hospital Department
                </label>
                <input
                  type="text"
                  value={formData.institution}
                  onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Department of Medical Genetics, University Medical Center"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Sequencing Test Type *
                  </label>
                  <select
                    value={formData.test_type}
                    onChange={(e) => setFormData({ ...formData, test_type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Whole Genome Sequencing (WGS)">Whole Genome Sequencing (WGS)</option>
                    <option value="Whole Exome Sequencing (WES)">Whole Exome Sequencing (WES)</option>
                    <option value="Targeted Gene Panel (Heme/Solid)">Targeted Gene Panel (Heme/Solid)</option>
                    <option value="RNA-Seq (Transcriptome)">RNA-Seq (Transcriptome)</option>
                    <option value="Metagenomics Sequencing">Metagenomics Sequencing</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Priority Level *
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="STANDARD">Standard Turnaround</option>
                    <option value="HIGH">High Priority</option>
                    <option value="URGENT">Urgent (STAT Clinical)</option>
                    <option value="LOW">Low / Batch Research</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Clinical / Scientific Objective
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Detail test indication, suspected pathology, or research protocol details..."
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
                  {formSubmitting ? 'Registering...' : 'Create Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Request Details Drawer/Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="font-mono text-2xs text-indigo-600 font-bold uppercase tracking-wider">
                  Request Specification
                </span>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  {selectedRequest.request_code}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-slate-400" /> Requester
                </span>
                <p className="font-semibold text-slate-900">{selectedRequest.requester_name}</p>
                <p className="text-2xs text-slate-500 font-mono">{selectedRequest.requester_email}</p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-400" /> Institution
                </span>
                <p className="font-medium text-slate-800">{selectedRequest.institution || 'None specified'}</p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-500">Test Type</span>
                <p className="font-semibold text-indigo-900">{selectedRequest.test_type}</p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-500">Priority & Status</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <PriorityBadge priority={selectedRequest.priority} />
                  <StatusBadge status={selectedRequest.status} size="sm" />
                </div>
              </div>

              {selectedRequest.description && (
                <div className="col-span-2 p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-700">
                  <span className="font-semibold text-slate-900 block mb-0.5">Objective:</span>
                  {selectedRequest.description}
                </div>
              )}
            </div>

            {/* Associated Samples in this request */}
            <div className="mt-6 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <TestTubes className="w-4 h-4 text-indigo-600" />
                  Registered Samples ({selectedRequestSamples.length})
                </h4>
                <Link
                  to="/samples"
                  className="text-2xs font-semibold text-indigo-600 hover:underline"
                >
                  + Register New Sample for Request
                </Link>
              </div>

              {detailsLoading ? (
                <div className="py-6 text-center text-slate-400">Loading samples...</div>
              ) : selectedRequestSamples.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4 bg-slate-50 rounded-lg text-center">
                  No samples registered under this request yet.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden text-xs">
                  {selectedRequestSamples.map((s) => (
                    <div key={s.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <span className="font-mono font-bold text-indigo-600">{s.sample_code}</span>
                        <span className="text-slate-600 ml-2 font-medium">{s.sample_type}</span>
                        <span className="text-2xs text-slate-400 block font-mono">
                          Collected: {s.collection_date} • {s.organism}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={s.status} size="sm" />
                        <Link
                          to={`/samples/${s.id}`}
                          className="px-2.5 py-1 text-2xs font-semibold bg-slate-100 hover:bg-slate-200 rounded text-slate-700"
                        >
                          Trace Sample
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
