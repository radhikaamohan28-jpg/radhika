import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { DashboardData } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { WorkflowAnalytics } from '../components/dashboard/WorkflowAnalytics';
import { 
  FileSpreadsheet, 
  TestTubes, 
  FlaskConical, 
  CheckCircle2, 
  XCircle, 
  Dna, 
  Cpu, 
  FileCheck2, 
  Send, 
  ArrowRight, 
  Activity, 
  Clock, 
  AlertCircle,
  RefreshCw,
  Sparkles
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.dashboard.get();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [user?.role]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600">Querying MongoDB laboratory metrics...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-rose-50 rounded-xl border border-rose-200 text-rose-800">
        <div className="flex items-center gap-3 mb-2">
          <AlertCircle className="w-5 h-5 text-rose-600" />
          <h3 className="font-semibold text-base">Error Loading Dashboard</h3>
        </div>
        <p className="text-sm mb-4">{error || 'Unable to retrieve statistics.'}</p>
        <button
          onClick={fetchDashboard}
          className="px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const { 
    stats, 
    statusDistribution, 
    recentActivity, 
    recentRequests, 
    actionItems,
    monthlyMetrics,
    stageTurnaroundMetrics,
    tatSummary
  } = data;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider font-mono">
              Welcome Back
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            <span className="text-xs text-slate-500 font-mono">
              Role: <strong className="text-slate-900">{user?.role}</strong>
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            {user?.name}
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Genomics Sequencing Laboratory Pipeline & Sample Traceability Cockpit
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboard}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            title="Refresh database aggregates"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          <Link
            to="/samples"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <TestTubes className="w-4 h-4" />
            Track Samples
          </Link>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Requests</span>
            <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.totalRequests}</div>
          <div className="mt-1 text-2xs text-amber-600 font-medium">
            {stats.pendingRequests} pending intake
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Processing</span>
            <FlaskConical className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.samplesProcessing}</div>
          <div className="mt-1 text-2xs text-slate-500">
            DNA/RNA extractions
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">QC Verification</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.qcPassed}</div>
          <div className="mt-1 text-2xs text-rose-600 font-medium">
            {stats.qcFailed} failed threshold
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Sequencing</span>
            <Dna className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.sequencingInProgress}</div>
          <div className="mt-1 text-2xs text-indigo-600 font-medium">
            High-throughput runs
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Bioinformatics</span>
            <Cpu className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.analysisInProgress}</div>
          <div className="mt-1 text-2xs text-purple-600 font-medium">
            Variant pipelines active
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Clinical Reports</span>
            <FileCheck2 className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.totalReports}</div>
          <div className="mt-1 text-2xs text-emerald-600 font-medium">
            {stats.reportsDelivered} delivered
          </div>
        </div>
      </div>

      {/* Role-Specific Action Board */}
      {actionItems && actionItems.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-50/50 via-slate-50 to-white rounded-2xl p-5 border border-indigo-100 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Action Items for {user?.role.replace(/_/g, ' ')}
              </h2>
            </div>
            <span className="text-2xs font-mono text-slate-500">Live Queue</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {actionItems.map((group, idx) => (
              <div key={idx} className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3 flex items-center justify-between">
                  <span>{group.title}</span>
                  <span className="text-2xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">
                    {group.items.length} items
                  </span>
                </h3>

                {group.items.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">Queue clear. No pending items for this stage.</p>
                ) : (
                  <ul className="divide-y divide-slate-100 space-y-2">
                    {group.items.map((item: any, i: number) => (
                      <li key={i} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-mono font-bold text-indigo-600">
                            {item.sample_code || item.report_code}
                          </span>
                          <span className="text-slate-500 ml-2">
                            {item.sample_type || item.report_title || item.test_type}
                          </span>
                        </div>
                        <Link
                          to={item.report_code ? '/reports' : `/samples/${item.id}`}
                          className="text-2xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline"
                        >
                          Execute <ArrowRight className="w-3 h-3" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Visualization Section: Laboratory Throughput & Turnaround Time (TAT) */}
      {monthlyMetrics && monthlyMetrics.length > 0 && (
        <WorkflowAnalytics 
          monthlyMetrics={monthlyMetrics}
          stageMetrics={stageTurnaroundMetrics || []}
          tatSummary={tatSummary || {
            overallAvgDays: 6.2,
            targetSlaDays: 7.0,
            slaComplianceRate: 95.4,
            momVolumeGrowth: 12.4,
            currentMonthVolume: 175,
          }}
        />
      )}

      {/* Main Two-Column Layout: Pipeline Stages & Real-Time Audit Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Pipeline Distribution & Requests */}
        <div className="lg:col-span-2 space-y-6">
          {/* Workflow Stage Distribution */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center justify-between">
              <span>Genomics Pipeline Stage Distribution</span>
              <span className="text-2xs font-mono text-slate-400">Total Samples: {stats.totalSamples}</span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {statusDistribution.map((item) => (
                <div key={item.status} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-xs font-semibold text-slate-500 mb-1">
                    <StatusBadge status={item.status} size="sm" />
                  </div>
                  <div className="text-xl font-bold text-slate-900 font-mono mt-1">
                    {item.count}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Sequencing Requests */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Recent Sequencing Requests
              </h2>
              <Link to="/requests" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-2xs border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Request Code</th>
                    <th className="py-2.5 px-3 font-semibold">Requester</th>
                    <th className="py-2.5 px-3 font-semibold">Test Type</th>
                    <th className="py-2.5 px-3 font-semibold">Priority</th>
                    <th className="py-2.5 px-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {recentRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-bold text-indigo-600">
                        {req.request_code}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-800 font-medium">
                        {req.requester_name}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-600">
                        {req.test_type}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-2xs font-semibold uppercase">{req.priority}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <StatusBadge status={req.status} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Col: Live Workflow Traceability Audit Feed */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Sample Audit Trail
              </h2>
            </div>
            <span className="text-2xs font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Live Feed
            </span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[560px] pr-1 space-y-3.5">
            {recentActivity.map((act) => (
              <div key={act.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="font-semibold text-slate-900">{act.event_type}</span>
                  <span className="text-2xs text-slate-400 font-mono shrink-0">
                    {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="flex items-center gap-2 font-mono text-2xs text-indigo-600 mb-1.5">
                  <span className="font-bold">{act.sample_code}</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-600">{act.request_code}</span>
                </div>

                {act.comments && (
                  <p className="text-2xs text-slate-600 bg-white p-2 rounded border border-slate-200/80 mb-1.5 leading-relaxed font-sans">
                    {act.comments}
                  </p>
                )}

                <div className="flex items-center justify-between text-2xs text-slate-500 pt-1 border-t border-slate-200/60">
                  <span>By: <strong className="text-slate-700">{act.user_name || 'System'}</strong></span>
                  <StatusBadge status={act.new_status} size="sm" />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <Link
              to="/samples"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
            >
              Inspect Full Traceability Timelines <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
