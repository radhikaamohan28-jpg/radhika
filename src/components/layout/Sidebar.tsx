import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  FileSpreadsheet, 
  TestTubes, 
  FlaskConical, 
  CheckCircle, 
  Dna, 
  Cpu, 
  FileCheck2, 
  Users, 
  Lock 
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user, hasRole } = useAuth();

  const navigation = [
    {
      name: 'Lab Overview',
      to: '/',
      icon: LayoutDashboard,
      roles: ['ADMIN', 'LAB_TECHNICIAN', 'BIOINFORMATICS_ANALYST', 'REVIEWER'],
    },
    {
      name: 'Sequencing Requests',
      to: '/requests',
      icon: FileSpreadsheet,
      roles: ['ADMIN', 'LAB_TECHNICIAN', 'BIOINFORMATICS_ANALYST', 'REVIEWER'],
    },
    {
      name: 'Samples & Traceability',
      to: '/samples',
      icon: TestTubes,
      roles: ['ADMIN', 'LAB_TECHNICIAN', 'BIOINFORMATICS_ANALYST', 'REVIEWER'],
    },
    {
      name: 'Sample Processing',
      to: '/processing',
      icon: FlaskConical,
      roles: ['ADMIN', 'LAB_TECHNICIAN'],
      highlightRole: 'Lab Tech',
    },
    {
      name: 'Quality Control (QC)',
      to: '/qc',
      icon: CheckCircle,
      roles: ['ADMIN', 'LAB_TECHNICIAN'],
      highlightRole: 'Lab Tech',
    },
    {
      name: 'Sequencing Runs',
      to: '/sequencing',
      icon: Dna,
      roles: ['ADMIN', 'BIOINFORMATICS_ANALYST'],
      highlightRole: 'Analyst',
    },
    {
      name: 'Bioinformatics Pipeline',
      to: '/analysis',
      icon: Cpu,
      roles: ['ADMIN', 'BIOINFORMATICS_ANALYST'],
      highlightRole: 'Analyst',
    },
    {
      name: 'Genomic Reports',
      to: '/reports',
      icon: FileCheck2,
      roles: ['ADMIN', 'REVIEWER', 'BIOINFORMATICS_ANALYST'],
      highlightRole: 'Reviewer',
    },
    {
      name: 'User Management',
      to: '/users',
      icon: Users,
      roles: ['ADMIN'],
      adminOnly: true,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-[calc(100vh-4rem)] border-r border-slate-800">
      <div className="p-4 border-b border-slate-800">
        <div className="text-2xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
          Active Laboratory Session
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-white truncate">{user?.name}</span>
        </div>
        <div className="mt-1 text-2xs text-slate-400 font-mono">
          Role: <span className="text-indigo-400 font-semibold">{user?.role}</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-2xs font-semibold uppercase tracking-wider text-slate-400">
          Workflow Modules
        </div>

        {navigation.map((item) => {
          const isPermitted = user && item.roles.includes(user.role);
          const Icon = item.icon;

          if (!isPermitted) {
            return (
              <div
                key={item.name}
                className="flex items-center justify-between px-3 py-2 text-xs text-slate-500 rounded-lg cursor-not-allowed opacity-60"
                title={`Requires ${item.roles.join(' or ')} permission`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 text-slate-600" />
                  <span>{item.name}</span>
                </div>
                <Lock className="w-3.5 h-3.5 text-slate-600" />
              </div>
            );
          }

          return (
            <NavLink
              key={item.name}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <Icon className="w-4 h-4" />
                <span>{item.name}</span>
              </div>
              {item.highlightRole && (
                <span className="text-2xs px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                  {item.highlightRole}
                </span>
              )}
              {item.adminOnly && (
                <span className="text-2xs px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 font-mono">
                  Admin
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 text-2xs text-slate-400 space-y-1">
        <div className="flex justify-between items-center text-slate-400">
          <span>Database</span>
          <span className="text-emerald-400 font-mono font-medium">MongoDB (Mongoose)</span>
        </div>
        <div className="flex justify-between items-center text-slate-400">
          <span>Security</span>
          <span className="text-slate-300 font-mono">JWT + RBAC</span>
        </div>
        <div className="flex justify-between items-center text-slate-400">
          <span>Auditing</span>
          <span className="text-indigo-400 font-mono">Full Traceability</span>
        </div>
      </div>
    </aside>
  );
};
