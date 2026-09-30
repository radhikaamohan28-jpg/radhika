import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { GenomicReport, Sample } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { 
  FileCheck2, 
  Search, 
  Filter, 
  RefreshCw, 
  Plus, 
  X, 
  AlertCircle,
  Eye,
  Award,
  Send,
  Printer,
  CheckCircle2,
  XCircle,
  Dna,
  ShieldCheck,
  Building,
  User as UserIcon,
  Calendar,
  Lock
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const [reports, setReports] = useState<GenomicReport[]>([]);
  const [eligibleSamples, setEligibleSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [reviewModalItem, setReviewModalItem] = useState<GenomicReport | null>(null);
  const [viewReportItem, setViewReportItem] = useState<GenomicReport | null>(null);

  // Create Draft Form
  const [createForm, setCreateForm] = useState({
    sample_id: '',
    report_title: 'Clinical Diagnostic Next-Generation Sequencing Report',
    findings_summary: '',
    recommendations: '',
  });

  // Review Form
  const [reviewForm, setReviewForm] = useState({
    decision: 'APPROVED' as 'APPROVED' | 'REJECTED',
    review_comments: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchReportsData = async () => {
    try {
      setLoading(true);
      const [reportsRes, samplesRes] = await Promise.all([
        api.reports.list({
          status: statusFilter || undefined,
          search: search || undefined,
        }),
        api.samples.list({ status: 'ANALYSIS_COMPLETED' }),
      ]);
      setReports(reportsRes.reports);
      setEligibleSamples(samplesRes.samples);
      if (samplesRes.samples.length > 0 && !createForm.sample_id) {
        setCreateForm((prev) => ({ ...prev, sample_id: String(samplesRes.samples[0].id) }));
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, [statusFilter]);

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await api.reports.generate({
        sample_id: parseInt(createForm.sample_id, 10),
        report_title: createForm.report_title,
        findings_summary: createForm.findings_summary,
        recommendations: createForm.recommendations,
      });
      setCreateModalOpen(false);
      await fetchReportsData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create genomic report.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModalItem) return;
    setSubmitting(true);
    setFormError(null);
    try {
      if (reviewForm.decision === 'APPROVED') {
        await api.reports.approve(reviewModalItem.id, {
          comments: reviewForm.review_comments,
        });
      } else {
        await api.reports.reject(reviewModalItem.id, {
          rejection_reason: reviewForm.review_comments,
          comments: reviewForm.review_comments,
        });
      }
      setReviewModalItem(null);
      await fetchReportsData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit clinical sign-off.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeliverReport = async (reportId: number) => {
    if (!window.confirm('Confirm clinical dispatch and delivery to client institution? This will mark the sample and sequencing request as COMPLETED.')) {
      return;
    }
    try {
      await api.reports.deliver(reportId);
      await fetchReportsData();
    } catch (err: any) {
      alert(err.message || 'Failed to deliver report.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-amber-600" />
            Genomic Reports, Clinical Review & Medical Sign-Off
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pathologist / Geneticist peer review, ACMG variant classification, and clinical dispatch
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchReportsData}
            className="p-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 shadow-2xs"
            title="Reload reports"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {hasRole('ADMIN', 'BIOINFORMATICS_ANALYST') && (
            <button
              onClick={() => {
                setFormError(null);
                setCreateModalOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Draft Clinical Report
            </button>
          )}
        </div>
      </div>

      {/* Eligible Queue */}
      {eligibleSamples.length > 0 && (
        <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider">
              <Award className="w-4 h-4 text-amber-600" />
              Analyses Completed & Ready for Clinical Reporting ({eligibleSamples.length})
            </div>
            <span className="text-2xs text-amber-700 font-mono">Awaiting Draft</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 mt-3">
            {eligibleSamples.map((s) => (
              <div
                key={s.id}
                className="bg-white p-3 rounded-lg border border-amber-200 shadow-2xs flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-mono font-bold text-indigo-600">{s.sample_code}</span>
                  <span className="text-2xs text-slate-500 block truncate">{s.sample_type}</span>
                </div>
                {hasRole('ADMIN', 'BIOINFORMATICS_ANALYST') && (
                  <button
                    onClick={() => {
                      setCreateForm((prev) => ({
                        ...prev,
                        sample_id: String(s.id),
                        findings_summary: `Genomic analysis of specimen ${s.sample_code} performed using high-throughput sequencing.`,
                        recommendations: 'Genetic counseling recommended for patient and first-degree relatives.',
                      }));
                      setCreateModalOpen(true);
                    }}
                    className="px-2.5 py-1 text-2xs font-semibold bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors shadow-2xs"
                  >
                    Draft Report
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={(e) => { e.preventDefault(); fetchReportsData(); }} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search report code, title, sample..."
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
            <option value="">All Report Statuses</option>
            <option value="GENERATED">Generated / Ready for Review</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="APPROVED">Clinically Approved</option>
            <option value="REJECTED">Rejected / Amend</option>
            <option value="DELIVERED">Delivered to Requester</option>
          </select>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-2xs border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">Report Code</th>
                <th className="py-3 px-4 font-semibold">Report Title</th>
                <th className="py-3 px-4 font-semibold">Sample & Request</th>
                <th className="py-3 px-4 font-semibold">Requester</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Sign-off Approver</th>
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-500">
                    No clinical reports found matching criteria.
                  </td>
                </tr>
              ) : (
                reports.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                      {r.report_code}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-slate-900 truncate">{r.report_title}</div>
                      <div className="text-2xs text-slate-500 truncate">{r.findings_summary}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-slate-900 block">{r.sample_code}</span>
                      <span className="text-2xs text-slate-500 font-mono">{r.request_code}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <div>{r.requester_name}</div>
                      <div className="text-2xs text-slate-400 truncate max-w-xs">{r.institution}</div>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={r.report_status} size="sm" />
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      {r.approved_by_name ? (
                        <div className="flex items-center gap-1 text-emerald-800">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{r.approved_by_name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Pending approval</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 text-2xs">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {/* Clinical Review Button */}
                      {hasRole('ADMIN', 'REVIEWER') && (r.report_status === 'GENERATED' || r.report_status === 'UNDER_REVIEW') && (
                        <button
                          onClick={() => {
                            setReviewModalItem(r);
                            setReviewForm({ decision: 'APPROVED', review_comments: 'Pathology and variant classification confirmed in accordance with ACMG/AMP clinical guidelines.' });
                            setFormError(null);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-2xs font-semibold bg-amber-50 text-amber-800 hover:bg-amber-100 rounded border border-amber-200"
                        >
                          <Award className="w-3 h-3 text-amber-600" /> Review Sign-off
                        </button>
                      )}

                      {/* Delivery Button */}
                      {hasRole('ADMIN', 'REVIEWER') && r.report_status === 'APPROVED' && (
                        <button
                          onClick={() => handleDeliverReport(r.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-2xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded shadow-2xs"
                        >
                          <Send className="w-3 h-3" /> Deliver
                        </button>
                      )}

                      {/* View & Print Button */}
                      <button
                        onClick={() => setViewReportItem(r)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-2xs font-medium text-slate-600 hover:bg-slate-100 rounded"
                        title="View Diagnostic Clinical Report"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Draft Report Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-amber-600" />
                Draft Clinical Diagnostic Genomic Report
              </h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateReport} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Analysis-Completed Sample Target *
                </label>
                <select
                  required
                  value={createForm.sample_id}
                  onChange={(e) => setCreateForm({ ...createForm, sample_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 font-mono"
                >
                  <option value="">Select sample with analysis complete...</option>
                  {eligibleSamples.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.sample_code} — {s.sample_type} ({s.test_type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Report Title *
                </label>
                <input
                  type="text"
                  required
                  value={createForm.report_title}
                  onChange={(e) => setCreateForm({ ...createForm, report_title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Clinical Findings & Variant Evaluation *
                </label>
                <textarea
                  rows={4}
                  required
                  value={createForm.findings_summary}
                  onChange={(e) => setCreateForm({ ...createForm, findings_summary: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Summarize pathogenic or likely pathogenic variants, cytogenetic alterations, or negative test outcomes..."
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Clinical Recommendations & Follow-Up
                </label>
                <textarea
                  rows={3}
                  value={createForm.recommendations}
                  onChange={(e) => setCreateForm({ ...createForm, recommendations: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Recommend Sanger confirmation, genetic counseling, or surveillance protocols..."
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Generating...' : 'Submit Report for Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review & Sign-Off Modal */}
      {reviewModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-600" />
                Medical Geneticist Sign-Off ({reviewModalItem.report_code})
              </h3>
              <button onClick={() => setReviewModalItem(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                {formError}
              </div>
            )}

            <form onSubmit={handleReviewSubmit} className="mt-4 space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900">{reviewModalItem.report_title}</div>
                <div className="text-2xs text-slate-600 font-mono">Sample: {reviewModalItem.sample_code} • Requester: {reviewModalItem.requester_name}</div>
                <div className="text-2xs text-slate-700 mt-2 bg-white p-2 rounded border border-slate-200">
                  {reviewModalItem.findings_summary}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Clinical Review Determination *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setReviewForm({ ...reviewForm, decision: 'APPROVED' })}
                    className={`py-2 px-3 rounded-lg border font-semibold flex items-center justify-center gap-2 ${
                      reviewForm.decision === 'APPROVED'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20'
                        : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    APPROVE (Sign-Off)
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewForm({ ...reviewForm, decision: 'REJECTED' })}
                    className={`py-2 px-3 rounded-lg border font-semibold flex items-center justify-center gap-2 ${
                      reviewForm.decision === 'REJECTED'
                        ? 'bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-500/20'
                        : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <XCircle className="w-4 h-4 text-rose-600" />
                    REJECT (Request Revision)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reviewer Clinical Attestation & Comments *
                </label>
                <textarea
                  rows={3}
                  required
                  value={reviewForm.review_comments}
                  onChange={(e) => setReviewForm({ ...reviewForm, review_comments: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Record pathologist interpretation or specific revision directives..."
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReviewModalItem(null)}
                  className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Applying Sign-Off...' : 'Submit Clinical Sign-Off'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ISO / Diagnostic Laboratory Report Print/View Modal */}
      {viewReportItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-8 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            {/* Action Bar */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6 print:hidden">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded">
                  {viewReportItem.report_code}
                </span>
                <StatusBadge status={viewReportItem.report_status} size="sm" />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Printer className="w-3.5 h-3.5" /> Print PDF
                </button>
                <button
                  onClick={() => setViewReportItem(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Diagnostic Report Document Content */}
            <div className="space-y-6 text-slate-900">
              {/* Report Header */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                <div>
                  <div className="flex items-center gap-2 text-indigo-700 font-bold tracking-tight text-lg">
                    <Dna className="w-6 h-6" />
                    CLINICAL GENOMICS DIAGNOSTIC LABORATORY
                  </div>
                  <p className="text-2xs text-slate-500 uppercase tracking-widest mt-0.5">
                    CLIA / CAP Accredited Diagnostic Facility • ISO 15189 Compliant
                  </p>
                </div>
                <div className="text-right text-2xs font-mono text-slate-600">
                  <div className="font-bold text-slate-900">REPORT ID: {viewReportItem.report_code}</div>
                  <div>DATE: {new Date(viewReportItem.created_at).toLocaleDateString()}</div>
                </div>
              </div>

              {/* Patient / Specimen Box */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div className="space-y-1">
                  <div><strong className="text-slate-600">Specimen Code:</strong> <span className="font-mono font-bold text-indigo-600">{viewReportItem.sample_code}</span></div>
                  <div><strong className="text-slate-600">Sequencing Request:</strong> <span className="font-mono">{viewReportItem.request_code}</span></div>
                  <div><strong className="text-slate-600">Assay Indication:</strong> {viewReportItem.test_type}</div>
                </div>
                <div className="space-y-1">
                  <div><strong className="text-slate-600">Ordering Physician:</strong> {viewReportItem.requester_name}</div>
                  <div><strong className="text-slate-600">Institution:</strong> {viewReportItem.institution || 'Medical Center'}</div>
                  <div><strong className="text-slate-600">Specimen Type:</strong> {viewReportItem.sample_type}</div>
                </div>
              </div>

              {/* Title */}
              <div>
                <h2 className="text-base font-bold text-slate-950 uppercase tracking-wide">
                  {viewReportItem.report_title}
                </h2>
              </div>

              {/* Clinical Summary */}
              <div className="space-y-2 text-xs">
                <h3 className="font-bold text-slate-900 uppercase tracking-wider text-2xs border-b border-slate-200 pb-1">
                  1. Clinical Findings & Variant Interpretation
                </h3>
                <p className="text-slate-800 leading-relaxed bg-slate-50/60 p-3 rounded-lg border border-slate-200">
                  {viewReportItem.findings_summary}
                </p>
              </div>

              {/* Recommendations */}
              {viewReportItem.recommendations && (
                <div className="space-y-2 text-xs">
                  <h3 className="font-bold text-slate-900 uppercase tracking-wider text-2xs border-b border-slate-200 pb-1">
                    2. Medical Recommendations & Genetic Counseling
                  </h3>
                  <p className="text-slate-800 leading-relaxed bg-slate-50/60 p-3 rounded-lg border border-slate-200">
                    {viewReportItem.recommendations}
                  </p>
                </div>
              )}

              {/* Signatures & Accreditation */}
              <div className="pt-6 border-t-2 border-slate-900 grid grid-cols-3 gap-4 text-2xs">
                <div>
                  <div className="text-slate-500 font-semibold mb-1 uppercase">Bioinformatics Analyst</div>
                  <div className="font-bold text-slate-900">{viewReportItem.generated_by_name || 'Elena Rostova, M.Sc.'}</div>
                  <div className="text-slate-400 font-mono">Sign-off: Electronic</div>
                </div>

                <div>
                  <div className="text-slate-500 font-semibold mb-1 uppercase">Clinical Peer Reviewer</div>
                  <div className="font-bold text-slate-900">{viewReportItem.reviewed_by_name || 'Dr. Aris Thorne, MD'}</div>
                  <div className="text-slate-400 font-mono">Status: Verified</div>
                </div>

                <div>
                  <div className="text-slate-500 font-semibold mb-1 uppercase">Laboratory Medical Director</div>
                  <div className="font-bold text-slate-900">{viewReportItem.approved_by_name || 'Radhika loosu, FACMG'}</div>
                  <div className="text-emerald-700 font-mono font-semibold">
                    {viewReportItem.approved_at ? `Signed ${new Date(viewReportItem.approved_at).toLocaleDateString()}` : 'Awaiting Final Signature'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
