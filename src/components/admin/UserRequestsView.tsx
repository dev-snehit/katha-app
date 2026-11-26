import React, { useState } from 'react';
import { useAppStore, normalizeEmail, normalizePhone } from '../../store/useAppStore';
import { User, Role } from '../../contracts';
import { ShieldCheck, UserCheck, UserX, Clock, Plus } from 'lucide-react';
import { useModalDismiss } from '../../hooks/useModalDismiss';

export const UserRequestsView: React.FC = () => {
  const { users, approveUser, denyUser, registerUser } = useAppStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role>('STAFF');
  const [modalError, setModalError] = useState<string | null>(null);

  const closeModal = () => {
    setIsModalOpen(false);
    setModalError(null);
  };

  useModalDismiss(isModalOpen, closeModal);

  const pendingUsers = users.filter((u) => u.status === 'PENDING_APPROVAL');
  const activeUsers = users.filter((u) => u.status === 'APPROVED');

  const handleSimulateSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    const cleanEmail = normalizeEmail(email);
    const cleanPhone = normalizePhone(phone);

    if (cleanPhone.length !== 10) {
      setModalError('Mobile number should have 10 digits. Please verify.');
      return;
    }

    const newUser: User = {
      id: crypto.randomUUID ? crypto.randomUUID() : `user-${Date.now()}`,
      name: name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      role,
      status: 'PENDING_APPROVAL',
      createdAt: new Date().toISOString(),
    };

    const res = registerUser(newUser);
    if (!res.success) {
      setModalError(res.message);
      return;
    }

    setIsModalOpen(false);
    setName('');
    setEmail('');
    setPhone('');
    setModalError(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold tracking-wider uppercase mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Administrator Portal</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            User Registration & Access Approvals
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Review and approve pending staff and customer account requests
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Simulate User Signup</span>
        </button>
      </div>

      {/* Pending Requests Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5">
        <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-500" />
          Pending Approval Requests ({pendingUsers.length})
        </h2>

        {pendingUsers.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">
            No pending user registration requests. All accounts are up-to-date.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {pendingUsers.map((user) => (
              <div key={user.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-sm text-slate-900">{user.name}</div>
                  <div className="text-xs text-slate-500 font-mono">
                    {user.email} &bull; {user.phone}
                  </div>
                  <span className="inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded bg-amber-50 text-amber-800">
                    Requested Role: {user.role}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => approveUser(user.id)}
                    className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-1.5 px-3 rounded-lg shadow-sm transition-colors"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Approve
                  </button>
                  <button
                    onClick={() => denyUser(user.id)}
                    className="inline-flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold py-1.5 px-3 rounded-lg border border-rose-200 transition-colors"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-bold text-slate-900 text-sm">
          Active System Users ({activeUsers.length})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs font-bold text-slate-700 uppercase">
              <tr>
                <th className="px-6 py-3">Full Name</th>
                <th className="px-6 py-3">Email Address</th>
                <th className="px-6 py-3">Phone</th>
                <th className="px-6 py-3">Assigned Role</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeUsers.map((u) => (
                <tr key={u.id}>
                  <td className="px-6 py-3 font-bold text-slate-900">{u.name}</td>
                  <td className="px-6 py-3 font-mono text-xs">{u.email}</td>
                  <td className="px-6 py-3 font-mono text-xs">{u.phone}</td>
                  <td className="px-6 py-3">
                    <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700">
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Simulate Signup Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={closeModal}
        >
          <div 
            className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-3xl w-full p-5 sm:p-7 border border-slate-100 h-[88vh] sm:h-[90vh] max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-4 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Drag Indicator Bar */}
            <div className="w-12 h-1.5 rounded-full bg-slate-300 mx-auto mb-3 sm:hidden" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 shrink-0">
              <h2 className="text-xl font-bold text-slate-900">
                Simulate New User Registration
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold p-1 leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSimulateSignup} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto no-scrollbar pr-1 space-y-4">
                {modalError && (
                  <div className="p-3 text-xs bg-rose-50 text-rose-700 rounded-lg border border-rose-200 font-medium">
                    {modalError}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full text-sm border border-slate-300 rounded-lg p-2.5 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="ramesh@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full text-sm border border-slate-300 rounded-lg p-2.5 outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mobile Number *
                    </label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="9848011223"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="w-full text-sm border border-slate-300 rounded-lg p-2.5 outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Requested Role *
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as Role)}
                      className="w-full text-sm border border-slate-300 rounded-lg p-2.5 outline-none focus:border-indigo-500"
                    >
                      <option value="STAFF">Warehouse Staff</option>
                      <option value="OWNER">Business Owner</option>
                      <option value="CUSTOMER">Retail Customer</option>
                      <option value="ADMIN">Administrator</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-md transition-colors"
                >
                  Submit Registration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
