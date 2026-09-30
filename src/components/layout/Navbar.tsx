import React, { useState } from 'react';
import { useAuth, DEMO_ACCOUNTS } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { api } from '../../services/api';
import { 
  Dna, 
  LogOut, 
  UserCheck, 
  ShieldCheck, 
  ChevronDown, 
  Database,
  Beaker,
  Cpu,
  Award,
  Edit3,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout, switchDemoRole, updateCurrentUser } = useAuth();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const openProfileModal = () => {
    if (user) {
      setNameInput(user.name);
      setEmailInput(user.email);
      setPasswordInput('');
      setProfileMsg(null);
      setEditProfileOpen(true);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!nameInput.trim()) {
      setProfileMsg({ type: 'error', text: 'Name cannot be empty.' });
      return;
    }

    try {
      setSaving(true);
      setProfileMsg(null);
      const payload: any = {
        name: nameInput.trim(),
        email: emailInput.trim(),
      };
      if (passwordInput.trim()) {
        payload.password = passwordInput.trim();
      }

      const res = await api.users.update(user.id, payload);
      updateCurrentUser(res.user);
      setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => {
        setEditProfileOpen(false);
      }, 900);
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return <ShieldCheck className="w-4 h-4 text-rose-600" />;
      case 'LAB_TECHNICIAN':
        return <Beaker className="w-4 h-4 text-cyan-600" />;
      case 'BIOINFORMATICS_ANALYST':
        return <Cpu className="w-4 h-4 text-purple-600" />;
      case 'REVIEWER':
        return <Award className="w-4 h-4 text-amber-600" />;
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'LAB_TECHNICIAN':
        return 'bg-cyan-50 text-cyan-800 border-cyan-200';
      case 'BIOINFORMATICS_ANALYST':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'REVIEWER':
        return 'bg-amber-50 text-amber-800 border-amber-200';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Dna className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 tracking-tight text-base sm:text-lg">
                  GENOMICS WORKFLOW LIMS
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-2xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase tracking-widest font-mono">
                  v2.6 Prod
                </span>
              </div>
              <p className="text-2xs text-slate-500 hidden sm:block">
                High-Throughput Sequencing & Traceability System
              </p>
            </div>
          </div>

          {/* Right Status & Controls */}
          <div className="flex items-center gap-3">
            {/* System Status Pill */}
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-600 font-mono">
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span>MongoDB Active</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            {/* Quick Role Switcher (Academic Project Feature) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 hover:border-slate-400 bg-white text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
                title="Switch role to test different permissions"
              >
                <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Role Switcher:</span>
                <span className="font-semibold text-slate-900">{user?.role}</span>
                <ChevronDown className="w-3 h-3 text-slate-500" />
              </button>

              {roleMenuOpen && (
                <div 
                  className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                  onClick={() => setRoleMenuOpen(false)}
                >
                  <div className="px-3 py-1.5 border-b border-slate-100">
                    <p className="text-2xs font-semibold uppercase tracking-wider text-slate-400">
                      Switch Role (1-Click Evaluation)
                    </p>
                  </div>
                  {(Object.keys(DEMO_ACCOUNTS) as UserRole[]).map((r) => {
                    const acc = DEMO_ACCOUNTS[r];
                    const isCurrent = user?.role === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => switchDemoRole(r)}
                        className={`w-full text-left px-3 py-2 text-xs flex items-start gap-2.5 transition-colors ${
                          isCurrent ? 'bg-indigo-50/70 text-indigo-950 font-medium' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="mt-0.5">{getRoleIcon(r)}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-900">{r}</span>
                            {isCurrent && (
                              <span className="text-2xs bg-indigo-600 text-white px-1.5 py-0.2 rounded font-mono">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-2xs text-slate-500 truncate">{acc.title} • {acc.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Current User Badge & Profile Editor */}
            {user && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <button
                  type="button"
                  onClick={openProfileModal}
                  className="hidden lg:block text-right hover:opacity-80 transition-opacity group cursor-pointer"
                  title="Click to edit profile in preview"
                >
                  <div className="text-xs font-semibold text-slate-900 leading-tight group-hover:text-indigo-600 flex items-center justify-end gap-1">
                    {user.name}
                    <Edit3 className="w-3 h-3 text-slate-400 group-hover:text-indigo-600" />
                  </div>
                  <div className="text-2xs text-slate-500 font-mono">
                    {user.email}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={openProfileModal}
                  className="lg:hidden p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Edit profile"
                >
                  <Edit3 className="w-4 h-4" />
                </button>

                <span className={`px-2 py-0.5 rounded text-2xs font-semibold border ${getRoleColor(user.role)}`}>
                  {user.role}
                </span>

                <button
                  type="button"
                  onClick={logout}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Sign out of laboratory session"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal (Direct In-Preview Editing) */}
      {editProfileOpen && user && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Edit Profile & Name</h3>
                  <p className="text-2xs text-slate-500">Live preview edit & database synchronization</p>
                </div>
              </div>
              <button 
                onClick={() => setEditProfileOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {profileMsg && (
              <div className={`mt-3 p-3 rounded-lg text-xs flex items-center gap-2 border ${
                profileMsg.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}>
                {profileMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{profileMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Full Name / Display Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. Radhika loosu"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="e.g. admin@genomics.lab"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  New Password <span className="text-2xs text-slate-400 font-normal">(Leave blank to keep unchanged)</span>
                </label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-1 flex items-center justify-between text-2xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <div>
                  <span className="font-semibold text-slate-700">Role:</span> {user.role}
                </div>
                <div>
                  <span className="font-semibold text-slate-700">User ID:</span> #{user.id}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditProfileOpen(false)}
                  className="px-3.5 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
