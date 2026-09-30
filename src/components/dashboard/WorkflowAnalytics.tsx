import React, { useState } from 'react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  BarChart, 
  Bar, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ReferenceLine 
} from 'recharts';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  Layers, 
  Flame, 
  ArrowUpRight, 
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { MonthlyVolumeMetric, StageTurnaroundMetric, TatSummaryMetrics } from '../../types';

interface WorkflowAnalyticsProps {
  monthlyMetrics: MonthlyVolumeMetric[];
  stageMetrics: StageTurnaroundMetric[];
  tatSummary: TatSummaryMetrics;
}

type ViewMode = 'combined' | 'volume' | 'tat' | 'stages';

export const WorkflowAnalytics: React.FC<WorkflowAnalyticsProps> = ({
  monthlyMetrics,
  stageMetrics,
  tatSummary,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('combined');

  // Custom polished tooltip for recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs min-w-[200px]">
          <div className="font-semibold border-b border-slate-800 pb-1.5 mb-2 text-slate-200 flex items-center justify-between">
            <span>{label}</span>
            <span className="text-2xs text-slate-400 font-mono">Monthly Aggregate</span>
          </div>
          <div className="space-y-1.5">
            {payload.map((item: any, index: number) => {
              const isDays = item.dataKey === 'avgTurnaroundDays' || item.dataKey === 'targetTurnaroundDays';
              const isHours = item.dataKey === 'avgHours' || item.dataKey === 'targetHours';
              const unit = isDays ? 'days' : isHours ? 'hrs' : 'samples';
              return (
                <div key={index} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    <span 
                      className="w-2.5 h-2.5 rounded-xs shrink-0" 
                      style={{ backgroundColor: item.color || item.fill || item.stroke }}
                    />
                    <span className="text-slate-300 capitalize text-2xs">
                      {item.name}:
                    </span>
                  </div>
                  <span className="font-mono font-bold text-white">
                    {item.value} {unit}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
      {/* Header & Sub-Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <BarChart3 className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-slate-900">
              Laboratory Throughput & Turnaround Time (TAT)
            </h2>
            <span className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              CLIA / CAP Benchmark
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tracking monthly specimen volume from registration through sequencing and bioinformatics delivery against standard 7-day SLA.
          </p>
        </div>

        {/* View Mode Selector */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start lg:self-auto text-xs font-medium text-slate-600">
          <button
            onClick={() => setViewMode('combined')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              viewMode === 'combined'
                ? 'bg-white text-indigo-600 font-semibold shadow-2xs'
                : 'hover:text-slate-900'
            }`}
          >
            Volume & TAT
          </button>
          <button
            onClick={() => setViewMode('volume')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              viewMode === 'volume'
                ? 'bg-white text-indigo-600 font-semibold shadow-2xs'
                : 'hover:text-slate-900'
            }`}
          >
            Volume Trend
          </button>
          <button
            onClick={() => setViewMode('tat')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              viewMode === 'tat'
                ? 'bg-white text-indigo-600 font-semibold shadow-2xs'
                : 'hover:text-slate-900'
            }`}
          >
            TAT vs. SLA
          </button>
          <button
            onClick={() => setViewMode('stages')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              viewMode === 'stages'
                ? 'bg-white text-indigo-600 font-semibold shadow-2xs'
                : 'hover:text-slate-900'
            }`}
          >
            Stage Duration
          </button>
        </div>
      </div>

      {/* Analytical KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-2xs uppercase tracking-wider font-semibold">Monthly Processed</span>
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900">
              {tatSummary.currentMonthVolume}
            </span>
            <span className="text-2xs font-semibold text-emerald-600 flex items-center">
              <ArrowUpRight className="w-3 h-3" />
              +{tatSummary.momVolumeGrowth}%
            </span>
          </div>
          <p className="text-2xs text-slate-500 mt-1">Active month throughput</p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-2xs uppercase tracking-wider font-semibold">Average TAT</span>
            <Clock className="w-3.5 h-3.5 text-cyan-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900">
              {tatSummary.overallAvgDays}
            </span>
            <span className="text-xs text-slate-500 font-sans">Days</span>
            <span className="text-2xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-sm">
              -0.4d MoM
            </span>
          </div>
          <p className="text-2xs text-slate-500 mt-1">Target benchmark: 7.0 days</p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-2xs uppercase tracking-wider font-semibold">SLA Compliance</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900">
              {tatSummary.slaComplianceRate}%
            </span>
            <span className="text-2xs text-emerald-600 font-semibold">On-time</span>
          </div>
          <p className="text-2xs text-slate-500 mt-1">≤ 7 days turnaround</p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-2xs uppercase tracking-wider font-semibold">Conversion Rate</span>
            <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900">
              92.8%
            </span>
            <span className="text-2xs text-slate-500">QC Pass to Report</span>
          </div>
          <p className="text-2xs text-slate-500 mt-1">First-pass library prep</p>
        </div>
      </div>

      {/* Main Charts Area */}
      <div className="pt-2">
        {/* VIEW 1: Combined Volume & TAT */}
        {viewMode === 'combined' && (
          <div>
            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                Monthly Volume vs. Turnaround Time Trend (Past 6 Months)
              </span>
              <span className="text-slate-400 text-2xs">Dual-Axis: Left (Samples), Right (Days)</span>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyMetrics} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="shortMonth" 
                    tick={{ fontSize: 12, fill: '#64748b' }} 
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis 
                    yAxisId="left" 
                    tick={{ fontSize: 12, fill: '#64748b' }} 
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    domain={[0, 12]}
                    tick={{ fontSize: 12, fill: '#64748b' }} 
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                    unit="d"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="top" 
                    align="right" 
                    iconType="circle"
                    wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
                  />
                  <Bar 
                    yAxisId="left" 
                    dataKey="processedVolume" 
                    name="Processed Volume" 
                    fill="#6366f1" 
                    radius={[6, 6, 0, 0]} 
                    maxBarSize={36} 
                  />
                  <Bar 
                    yAxisId="left" 
                    dataKey="deliveredVolume" 
                    name="Delivered Reports" 
                    fill="#06b6d4" 
                    radius={[6, 6, 0, 0]} 
                    maxBarSize={36} 
                  />
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="avgTurnaroundDays" 
                    name="Avg Turnaround (Days)" 
                    stroke="#f59e0b" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6 }}
                  />
                  <ReferenceLine 
                    yAxisId="right" 
                    y={7.0} 
                    stroke="#ef4444" 
                    strokeDasharray="4 4" 
                    label={{ value: 'SLA (7d)', position: 'insideTopRight', fill: '#ef4444', fontSize: 10 }} 
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* VIEW 2: Monthly Volume Stacked/Grouped */}
        {viewMode === 'volume' && (
          <div>
            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="font-semibold text-slate-700">
                End-to-End Pipeline Volume Progression by Stage
              </span>
              <span className="text-slate-400 text-2xs">Number of specimens processed</span>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyMetrics} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12, fill: '#64748b' }} 
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: '#64748b' }} 
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="top" 
                    align="right" 
                    iconType="circle"
                    wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
                  />
                  <Bar dataKey="processedVolume" name="DNA/RNA Extracted" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="sequencingVolume" name="Sequenced Runs" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="analysisVolume" name="Bioinformatics Analyzed" fill="#ec4899" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="deliveredVolume" name="Clinical Reports Delivered" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* VIEW 3: Turnaround Time (TAT) vs. Target SLA */}
        {viewMode === 'tat' && (
          <div>
            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="font-semibold text-slate-700">
                Average Laboratory Turnaround Time (Intake to Report Sign-Off)
              </span>
              <span className="text-slate-500 text-2xs font-mono">Benchmark SLA: ≤ 7.0 Days</span>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyMetrics} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12, fill: '#64748b' }} 
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis 
                    domain={[4, 10]} 
                    tick={{ fontSize: 12, fill: '#64748b' }} 
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                    unit="d"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="top" 
                    align="right" 
                    iconType="circle"
                    wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
                  />
                  <ReferenceLine 
                    y={7.0} 
                    stroke="#ef4444" 
                    strokeWidth={2} 
                    strokeDasharray="4 4" 
                    label={{ value: 'Target SLA Limit (7.0 Days)', position: 'insideTopLeft', fill: '#ef4444', fontSize: 11 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="avgTurnaroundDays" 
                    name="Average TAT (Days)" 
                    stroke="#0891b2" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorTat)" 
                    dot={{ r: 5, fill: '#0891b2', stroke: '#fff', strokeWidth: 2 }}
                    activeDot={{ r: 7 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 text-2xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
              <span>Note: Turnaround time has decreased by <strong>26.2%</strong> over the past 6 months due to automated liquid handling and batch bioinformatics orchestration.</span>
              <span className="text-emerald-700 font-semibold">Positive Trend</span>
            </div>
          </div>
        )}

        {/* VIEW 4: Stage Duration Breakdown */}
        {viewMode === 'stages' && (
          <div>
            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="font-semibold text-slate-700">
                Mean Operational Duration by Pipeline Stage vs. Standard Target
              </span>
              <span className="text-slate-500 text-2xs">Unit: Hours</span>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  layout="vertical" 
                  data={stageMetrics} 
                  margin={{ top: 10, right: 30, left: 50, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis 
                    type="number" 
                    unit="h" 
                    tick={{ fontSize: 12, fill: '#64748b' }} 
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="stage" 
                    tick={{ fontSize: 11, fill: '#334155', fontWeight: 500 }} 
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                    width={140}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="top" 
                    align="right" 
                    iconType="circle"
                    wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
                  />
                  <Bar dataKey="avgHours" name="Actual Duration (Hours)" fill="#6366f1" radius={[0, 4, 4, 0]} maxBarSize={20} />
                  <Bar dataKey="targetHours" name="Target SLA (Hours)" fill="#cbd5e1" radius={[0, 4, 4, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Analytical Insights Footer */}
      <div className="pt-2 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
          <div>
            <span className="font-semibold text-slate-800">Capacity & Scale</span>
            <p className="text-2xs text-slate-500 mt-0.5">
              Current laboratory operational capacity is running at 78% of maximum flowcell loading limits.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
          <div>
            <span className="font-semibold text-slate-800">Critical Path Optimization</span>
            <p className="text-2xs text-slate-500 mt-0.5">
              Sequencing run duration (44.8h) remains the largest contributor to total turnaround time.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
          <div>
            <span className="font-semibold text-slate-800">Quality Gating</span>
            <p className="text-2xs text-slate-500 mt-0.5">
              Fast-track QC turnaround (8.5h) prevents degraded libraries from consuming expensive flowcell real estate.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
