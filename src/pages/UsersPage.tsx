import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { User, UserRole } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  RefreshCw, 
  X, 
  ShieldAlert, 
  ShieldCheck, 
  Beaker, 
  Cpu, 
  Award,
  AlertCircle,
  CheckCircle2,
  Lock,
  Edit3
} from 'lucide-react';

export const UsersPage: React.FC = () => {
  const { user, hasRole, updateCurrentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'LAB_TECHNICIAN' as UserRole,
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit User Modal
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    role: 'LAB_TECHNICIAN' as UserRole,
    status: 'ACTIVE',
    password: '',
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.users.list({
        role: roleFilter || undefined,
        search: search || undefined,
      });
      setUsers(res.users);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasRole('ADMIN')) {
      fetchUsers();
    }
  }, [roleFilter]);

  if (!hasRole('ADMIN')) {
    return (
      <div className="p-8 max-w-lg mx-auto bg-white rounded-2xl border border-slate-200 shadow-xs text-center mt-12">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">Administrative Privileges Required</h2>
        <p className="text-xs text-slate-500 mb-4">
          This laboratory staff administration console is restricted strictly to users with the <span className="font-semibold text-slate-800">ADMIN</span> role.
        </p>
        <div className="p-3 bg-slate-50 rounded-lg text-2xs text-slate-600 border border-slate-200">
          Use the <strong>Role Switcher</strong> in the top navigation bar to switch to <strong>ADMIN (Radhika loosu)</strong> to access user administration.
        </div>
      </div>
    );
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await api.users.create(formData);
      setCreateModalOpen(false);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'LAB_TECHNICIAN',
      });
      await fetchUsers();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create user account.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (targetUser: User) => {
    const newStatus = targetUser.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.users.update(targetUser.id, { status: newStatus });
      await fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to update user status.');
    }
  };

  const openEditModal = (target: User) => {
    setEditingUser(target);
    setEditFormData({
      name: target.name,
      email: target.email,
      role: target.role,
      status: target.status,
      password: '',
    });
    setEditError(null);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditSubmitting(true);
    setEditError(null);
    try {
      const payload: any = {
        name: editFormData.name.trim(),
        email: editFormData.email.trim(),
        role: editFormData.role,
        status: editFormData.status,
      };
      if (editFormData.password.trim()) {
        payload.password = editFormData.password.trim();
      }

      const res = await api.users.update(editingUser.id, payload);
      if (editingUser.id === user?.id) {
        updateCurrentUser(res.user);
      }
      await fetchUsers();
      setEditingUser(null);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update user account.');
    } finally {
      setEditSubmitting(false);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Laboratory Personnel & Role-Based Access Control
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage authorized molecular technicians, bioinformaticians, reviewers, and cryptographic credentials
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchUsers}
            className="p-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 shadow-2xs"
            title="Reload personnel roster"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => { setFormError(null); setCreateModalOpen(true); }}
            className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Provision Personnel Account
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={(e) => { e.preventDefault(); fetchUsers(); }} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search personnel name or email..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg py-1.5 px-2.5 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Operational Roles</option>
            <option value="ADMIN">System Administrator</option>
            <option value="LAB_TECHNICIAN">Lab Technician</option>
            <option value="BIOINFORMATICS_ANALYST">Bioinformatics Analyst</option>
            <option value="REVIEWER">Clinical Reviewer</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-2xs border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">Laboratory Staff</th>
                <th className="py-3 px-4 font-semibold">Email Identity</th>
                <th className="py-3 px-4 font-semibold">Assigned Role</th>
                <th className="py-3 px-4 font-semibold">Account Status</th>
                <th className="py-3 px-4 font-semibold">Provisioned Date</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{u.name}</div>
                    <div className="text-2xs text-slate-400 font-mono">UID: #{u.id}</div>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-700">
                    {u.email}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      {getRoleIcon(u.role)}
                      <span className="font-semibold text-slate-800">{u.role}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={u.status} size="sm" />
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500 text-2xs">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditModal(u)}
                        className="px-2.5 py-1 text-2xs font-semibold rounded border transition-colors bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 flex items-center gap-1 cursor-pointer"
                        title="Edit user details"
                      >
                        <Edit3 className="w-3 h-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleStatus(u)}
                        disabled={u.id === user?.id}
                        className="px-2.5 py-1 text-2xs font-semibold rounded border transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 cursor-pointer"
                      >
                        {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provision User Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                Provision Personnel Laboratory Account
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

            <form onSubmit={handleCreateUser} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Full Name & Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Dr. Jordan Hayes, Ph.D."
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Laboratory Email Identity *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                  placeholder="jhayes@genomics.lab"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Initial Password (Bcrypt Encrypted) *
                </label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Laboratory RBAC Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="LAB_TECHNICIAN">LAB_TECHNICIAN — Extraction & QC Protocols</option>
                  <option value="BIOINFORMATICS_ANALYST">BIOINFORMATICS_ANALYST — Sequencing & Pipeline Execution</option>
                  <option value="REVIEWER">REVIEWER — Clinical Sign-off & Medical Review</option>
                  <option value="ADMIN">ADMIN — Full System & User Configuration</option>
                </select>
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
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Provision User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Edit Personnel Account
                  </h3>
                  <p className="text-2xs text-slate-500">UID #{editingUser.id} • {editingUser.email}</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingUser(null)} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                {editError}
              </div>
            )}

            <form onSubmit={handleUpdateUser} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reset Password <span className="text-2xs text-slate-400 font-normal">(Leave blank to keep current)</span>
                </label>
                <input
                  type="password"
                  value={editFormData.password}
                  onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                  placeholder="Leave empty to retain existing password"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Laboratory Role <span className="text-rose-500">*</span>
                </label>
                <select
                  value={editFormData.role}
                  onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ADMIN">ADMIN — Full System & User Configuration</option>
                  <option value="LAB_TECHNICIAN">LAB_TECHNICIAN — Extraction & QC Protocols</option>
                  <option value="BIOINFORMATICS_ANALYST">BIOINFORMATICS_ANALYST — Sequencing & Pipeline Execution</option>
                  <option value="REVIEWER">REVIEWER — Clinical Sign-off & Medical Review</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Account Status <span className="text-rose-500">*</span>
                </label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50"
                >
                  {editSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
