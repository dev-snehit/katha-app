import React, { useState, useEffect } from 'react';
import { useAppStore, normalizeEmail, normalizePhone } from '../../store/useAppStore';
import { User, Role, UserStatus } from '../../contracts';
import { ShieldCheck, UserCheck, UserX, Clock, Plus, Pencil, Trash2, Sparkles, CheckCircle2, AlertCircle, Users, Sliders } from 'lucide-react';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import { useRouter } from '../../lib/router';
import { AlertDialog, DialogType } from '../ui/AlertDialog';
import { RolePermissionsManager } from './RolePermissionsManager';

export const UserRequestsView: React.FC = () => {
  const { 
    users, 
    approveUser, 
    denyUser, 
    registerUser, 
    updateUser, 
    deleteUser, 
    startActionLoading,
    stopActionLoading,
    hasFunctionalityAccess,
    language 
  } = useAppStore();
  const { route, navigate } = useRouter();
  const isTe = language === 'TE';
  const [adminSubTab, setAdminSubTab] = useState<'users' | 'permissions'>('users');

  // Simulate Signup Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role>('STAFF');
  const [modalError, setModalError] = useState<string | null>(null);

  // Edit Active User Modal State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<Role>('STAFF');
  const [editStatus, setEditStatus] = useState<UserStatus>('APPROVED');
  const [editError, setEditError] = useState<string | null>(null);

  // Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: DialogType;
    actionText: string;
    cancelText?: string;
    onAction: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
    actionText: 'Confirm',
    cancelText: 'Cancel',
    onAction: () => {},
  });

  // Synchronize modal state with URL route (e.g. /admin/new-user)
  useEffect(() => {
    if (route.view !== 'admin') {
      setIsModalOpen(false);
      return;
    }

    if (route.subView === 'new-user') {
      setIsModalOpen(true);
      setModalError(null);
    } else {
      setIsModalOpen(false);
      setModalError(null);
    }
  }, [route.view, route.subView]);

  const closeModal = () => {
    setIsModalOpen(false);
    setModalError(null);
    if (route.view === 'admin' && route.subView) {
      navigate('/admin');
    }
  };

  const closeEditModal = () => {
    setEditingUser(null);
    setEditError(null);
  };

  useModalDismiss(isModalOpen, closeModal);
  useModalDismiss(Boolean(editingUser), closeEditModal);

  const pendingUsers = users.filter((u) => u.status === 'PENDING_APPROVAL');
  const activeUsers = users.filter((u) => u.status === 'APPROVED');

  // Trigger confirmation dialog helper
  const requestConfirmation = (config: {
    title: string;
    message: string;
    type?: DialogType;
    actionText: string;
    cancelText?: string;
    onAction: () => void;
  }) => {
    setConfirmDialog({
      isOpen: true,
      title: config.title,
      message: config.message,
      type: config.type || 'warning',
      actionText: config.actionText,
      cancelText: config.cancelText || (isTe ? 'రద్దు చేయి' : 'Cancel'),
      onAction: config.onAction,
    });
  };

  // 1. Simulate Signup submission
  const handleSimulateSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    const cleanEmail = normalizeEmail(email);
    const cleanPhone = normalizePhone(phone);

    if (cleanPhone.length !== 10) {
      setModalError(isTe ? 'మొబైల్ నంబర్ 10 అంకెలు ఉండాలి. దయచేసి సరిచూసుకోండి.' : 'Mobile number should have 10 digits. Please verify.');
      return;
    }

    startActionLoading(
      'Registering user request...',
      'యూజర్ అభ్యర్థన నమోదు చేయబడుతోంది...'
    );

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
    stopActionLoading();

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

  // 2. Open Edit Active User modal
  const handleStartEditUser = (u: User) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditRole(u.role);
    setEditStatus(u.status);
    setEditError(null);
  };

  // 3. Save Active User with Confirmation & Action Spinner
  const handleSaveActiveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!editName.trim()) {
      setEditError(isTe ? 'దయచేసి యూజర్ పేరును నమోదు చేయండి.' : 'User name cannot be empty.');
      return;
    }

    requestConfirmation({
      title: isTe ? 'యూజర్ మార్పులను సేవ్ చేయాలా?' : 'Save User Changes?',
      message: isTe 
        ? `"${editingUser.name}" యొక్క పేరు, పాత్ర (${editRole}) లేదా స్థితి మార్పులను అప్‌డేట్ చేయాలనుకుంటున్నారా?` 
        : `Are you sure you want to save changes for user "${editingUser.name}"?`,
      type: 'info',
      actionText: isTe ? 'అవును, సేవ్ చేయి' : 'Yes, Save Changes',
      cancelText: isTe ? 'రద్దు చేయి' : 'Cancel',
      onAction: async () => {
        startActionLoading(
          `Updating details for ${editingUser.name}...`,
          `${editingUser.name} వివరాలు అప్‌డేట్ అవుతున్నాయి...`
        );
        await updateUser(editingUser.id, {
          name: editName.trim(),
          role: editRole,
          status: editStatus,
        });
        stopActionLoading();
        closeEditModal();
      },
    });
  };

  // 4. Delete Active User with Confirmation
  const handleDeleteUser = (u: User) => {
    requestConfirmation({
      title: isTe ? 'యూజర్‌ను తొలగించాలా?' : 'Remove User Account?',
      message: isTe
        ? `"${u.name}" (${u.email}) ఖాతాను సిస్టమ్ నుండి శాశ్వతంగా తొలగించాలనుకుంటున్నారా?`
        : `Are you sure you want to remove user "${u.name}" (${u.email})? This action cannot be undone.`,
      type: 'error',
      actionText: isTe ? 'తొలగించు' : 'Delete User',
      cancelText: isTe ? 'రద్దు చేయి' : 'Cancel',
      onAction: async () => {
        startActionLoading(
          `Removing user ${u.name}...`,
          `${u.name} యూజర్ తొలగించబడుతున్నారు...`
        );
        await deleteUser(u.id);
        stopActionLoading();
      },
    });
  };

  // 5. Approve Request with Confirmation
  const handleApproveUser = (u: User) => {
    requestConfirmation({
      title: isTe ? 'యూజర్ అభ్యర్థనను ఆమోదించాలా?' : 'Approve User Request?',
      message: isTe
        ? `"${u.name}" (${u.role}) ఖాతాను కథా హోల్‌సేల్ యాక్సెస్ కోసం ఆమోదించాలనుకుంటున్నారా?`
        : `Are you sure you want to approve access for "${u.name}" as ${u.role}?`,
      type: 'info',
      actionText: isTe ? 'ఆమోదించు' : 'Approve Access',
      cancelText: isTe ? 'రద్దు చేయి' : 'Cancel',
      onAction: async () => {
        startActionLoading(
          `Approving access for ${u.name}...`,
          `${u.name} ఖాతా ఆమోదించబడుతోంది...`
        );
        approveUser(u.id);
        stopActionLoading();
      },
    });
  };

  // 6. Deny Request with Confirmation
  const handleDenyUser = (u: User) => {
    requestConfirmation({
      title: isTe ? 'యూజర్ అభ్యర్థనను తిరస్కరించాలా?' : 'Deny User Request?',
      message: isTe
        ? `"${u.name}" (${u.email}) అభ్యర్థనను తిరస్కరించాలనుకుంటున్నారా?`
        : `Are you sure you want to deny registration request for "${u.name}"?`,
      type: 'warning',
      actionText: isTe ? 'తిరస్కరించు' : 'Deny Request',
      cancelText: isTe ? 'రద్దు చేయి' : 'Cancel',
      onAction: async () => {
        startActionLoading(
          `Denying access for ${u.name}...`,
          `${u.name} ఖాతా తిరస్కరించబడుతోంది...`
        );
        denyUser(u.id);
        stopActionLoading();
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#FF5A36] text-xs font-bold tracking-wider uppercase mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>{isTe ? 'అడ్మినిస్ట్రేటర్ పోర్టల్' : 'Administrator Portal'}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {isTe ? 'యూజర్ రిజిస్ట్రేషన్లు & యాక్సెస్ నిర్వహణ' : 'User Registration & Access Management'}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5 font-medium">
            {isTe 
              ? 'సిబ్బంది, యజమాని మరియు కస్టమర్ ఖాతాల అనుమతులను సమీక్షించండి మరియు అప్‌డేట్ చేయండి'
              : 'Review pending requests, update active user roles and status, and maintain clean database records'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Simulate User Signup Button */}
          {hasFunctionalityAccess('user_management_page', 'create_user') && (
            <button
              onClick={() => navigate('/admin/new-user')}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-[#FF5A36] to-[#FF6B4A] hover:from-[#f04f2c] hover:to-[#f05a38] text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md shadow-orange-500/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>{isTe ? 'యూజర్ రిజిస్ట్రేషన్ సైన్-అప్' : 'Simulate User Signup'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-Tab Navigation Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setAdminSubTab('users')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            adminSubTab === 'users'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{isTe ? 'యూజర్ ఖాతాలు & రిజిస్ట్రేషన్లు' : 'User Accounts & Registrations'}</span>
          {pendingUsers.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-[#FF5A36] text-white">
              {pendingUsers.length}
            </span>
          )}
        </button>

        {hasFunctionalityAccess('user_management_page', 'manage_role_permissions') && (
          <button
            onClick={() => setAdminSubTab('permissions')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              adminSubTab === 'permissions'
                ? 'bg-[#FF5A36] text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>{isTe ? 'రోల్ నిర్దిష్ట నియంత్రణలు' : 'Role Specific Controls'}</span>
          </button>
        )}
      </div>

      {adminSubTab === 'permissions' ? (
        <RolePermissionsManager />
      ) : (
        <>
          {/* Pending Requests Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5">
        <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-500" />
          <span>{isTe ? 'అనుమతి కోసం వేచి ఉన్న అభ్యర్థనలు' : 'Pending Approval Requests'}</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800">
            {pendingUsers.length}
          </span>
        </h2>

        {pendingUsers.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center font-medium">
            {isTe 
              ? 'ప్రస్తుతం ఎలాంటి పెండింగ్ అభ్యర్థనలు లేవు. అన్ని ఖాతాలు నవీకరించబడ్డాయి.'
              : 'No pending user registration requests. All accounts are up-to-date.'}
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {pendingUsers.map((user) => (
              <div key={user.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-sm text-slate-900">{user.name}</div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    {user.email} &bull; {user.phone}
                  </div>
                  <span className="inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded bg-amber-50 text-amber-800 border border-amber-200/60">
                    {isTe ? `కోరిన పాత్ర: ${user.role}` : `Requested Role: ${user.role}`}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {hasFunctionalityAccess('user_management_page', 'approve_user') && (
                    <button
                      onClick={() => handleApproveUser(user)}
                      className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-1.5 px-3 rounded-lg shadow-sm transition-colors active:scale-95"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{isTe ? 'ఆమోదించు' : 'Approve'}</span>
                    </button>
                  )}
                  {hasFunctionalityAccess('user_management_page', 'deny_user') && (
                    <button
                      onClick={() => handleDenyUser(user)}
                      className="inline-flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold py-1.5 px-3 rounded-lg border border-rose-200 transition-colors active:scale-95"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      <span>{isTe ? 'తిరస్కరించు' : 'Deny'}</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active System Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-bold text-slate-900 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>{isTe ? 'యాక్టివ్ సిస్టమ్ యూజర్లు' : 'Active System Users'}</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-slate-100 text-slate-700">
              {activeUsers.length}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-normal">
            {isTe ? 'డూప్లికేట్లు తొలగించబడ్డాయి • క్లీన్ డేటా' : 'Deduplicated • Unique Clean Records'}
          </span>
        </div>
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">{isTe ? 'పూర్తి పేరు' : 'Full Name'}</th>
                <th className="px-5 py-3">{isTe ? 'ఈమెయిల్ చిరునామా' : 'Email Address'}</th>
                <th className="px-5 py-3">{isTe ? 'మొబైల్' : 'Phone'}</th>
                <th className="px-5 py-3">{isTe ? 'పాత్ర' : 'Assigned Role'}</th>
                <th className="px-5 py-3">{isTe ? 'స్థితి' : 'Status'}</th>
                <th className="px-5 py-3 text-right">{isTe ? 'చర్యలు' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3 font-bold text-slate-900 whitespace-nowrap">{u.name}</td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-600">{u.email}</td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-600">{u.phone}</td>
                  <td className="px-5 py-3">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200/60">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                      {isTe ? 'యాక్టివ్' : 'Active'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="inline-flex items-center gap-1.5 justify-end">
                      {/* Modify active user button */}
                      {hasFunctionalityAccess('user_management_page', 'edit_user') && (
                        <button
                          onClick={() => handleStartEditUser(u)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-all inline-flex items-center gap-1 text-xs font-bold"
                          title={isTe ? 'యూజర్ వివరాలను సవరించండి' : 'Modify user name, role, status'}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{isTe ? 'సవరించు' : 'Edit'}</span>
                        </button>
                      )}

                      {/* Delete user button */}
                      {hasFunctionalityAccess('user_management_page', 'delete_user') && (
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all"
                          title={isTe ? 'యూజర్‌ను తొలగించండి' : 'Remove user'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Active User Modal */}
      {editingUser && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={closeEditModal}
        >
          <div 
            className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-2xl w-full p-5 sm:p-7 border border-slate-100 h-[88vh] sm:h-auto max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-4 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Drag Indicator Bar */}
            <div className="w-12 h-1.5 rounded-full bg-slate-300 mx-auto mb-3 sm:hidden" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-orange-50 text-[#FF5A36]">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {isTe ? 'యాక్టివ్ యూజర్ వివరాలను సవరించండి' : 'Modify Active User Details'}
                  </h2>
                  <p className="text-xs text-slate-400 font-medium">
                    {isTe ? 'పేరు, అసైన్ చేయబడిన పాత్ర మరియు ఖాతా స్థితిని మార్చండి' : 'Update full name, assigned role, and account status'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold p-1 leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveActiveUser} className="space-y-4">
              {editError && (
                <div className="p-3 text-xs bg-rose-50 text-rose-700 rounded-xl border border-rose-200 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              {/* Readonly Identifiers */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs flex flex-wrap gap-4 text-slate-600 font-mono">
                <div>
                  <span className="font-bold text-slate-400 block text-[10px] uppercase font-sans">{isTe ? 'ఈమెయిల్' : 'Email'}</span>
                  {editingUser.email}
                </div>
                <div>
                  <span className="font-bold text-slate-400 block text-[10px] uppercase font-sans">{isTe ? 'మొబైల్ నంబర్' : 'Mobile'}</span>
                  {editingUser.phone}
                </div>
              </div>

              {/* 1. Editable Field: Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isTe ? 'పూర్తి పేరు *' : 'Full Name *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Snehit Tadepalli"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-xl p-3 outline-none focus:border-[#FF5A36] focus:ring-2 focus:ring-[#FF5A36]/10 font-semibold"
                />
              </div>

              {/* 2. Editable Field: Role */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isTe ? 'అసైన్ చేయబడిన పాత్ర (Role) *' : 'Assigned Role *'}
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as Role)}
                  className="w-full text-sm border border-slate-300 rounded-xl p-3 outline-none focus:border-[#FF5A36] focus:ring-2 focus:ring-[#FF5A36]/10 font-bold bg-white"
                >
                  <option value="ADMIN">ADMIN (Administrator)</option>
                  <option value="OWNER">OWNER (Business Owner)</option>
                  <option value="STAFF">STAFF (Warehouse Staff)</option>
                  <option value="CUSTOMER">CUSTOMER (Retail Customer)</option>
                </select>
              </div>

              {/* 3. Editable Field: Status */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isTe ? 'ఖాతా స్థితి (Status) *' : 'Account Status *'}
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as UserStatus)}
                  className="w-full text-sm border border-slate-300 rounded-xl p-3 outline-none focus:border-[#FF5A36] focus:ring-2 focus:ring-[#FF5A36]/10 font-bold bg-white"
                >
                  <option value="APPROVED">{isTe ? 'APPROVED (ఆమోదించబడింది)' : 'APPROVED (Active & Approved)'}</option>
                  <option value="PENDING_APPROVAL">{isTe ? 'PENDING_APPROVAL (పరిశీలనలో ఉంది)' : 'PENDING_APPROVAL (Pending)'}</option>
                  <option value="DENIED">{isTe ? 'DENIED (తిరస్కరించబడింది)' : 'DENIED (Access Revoked)'}</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
                >
                  {isTe ? 'రద్దు చేయి' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold bg-gradient-to-r from-[#FF5A36] to-[#FF6B4A] hover:from-[#f04f2c] hover:to-[#f05a38] text-white rounded-xl shadow-md shadow-orange-500/20 transition-all active:scale-95"
                >
                  {isTe ? 'మార్పులను సేవ్ చేయి' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                {isTe ? 'కొత్త యూజర్ రిజిస్ట్రేషన్ నమోదు' : 'Simulate New User Registration'}
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
                      {isTe ? 'పూర్తి పేరు *' : 'Full Name *'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full text-sm border border-slate-300 rounded-lg p-2.5 outline-none focus:border-[#FF5A36]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {isTe ? 'ఈమెయిల్ చిరునామా *' : 'Email Address *'}
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="ramesh@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full text-sm border border-slate-300 rounded-lg p-2.5 outline-none focus:border-[#FF5A36] font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {isTe ? 'మొబైల్ నంబర్ *' : 'Mobile Number *'}
                    </label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="9848011223"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="w-full text-sm border border-slate-300 rounded-lg p-2.5 outline-none focus:border-[#FF5A36] font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {isTe ? 'కోరిన పాత్ర *' : 'Requested Role *'}
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as Role)}
                      className="w-full text-sm border border-slate-300 rounded-lg p-2.5 outline-none focus:border-[#FF5A36]"
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
                  {isTe ? 'రద్దు చేయి' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold bg-[#FF5A36] hover:bg-[#e04826] text-white rounded-lg shadow-md transition-colors"
                >
                  {isTe ? 'రిజిస్ట్రేషన్ నమోదు చేయి' : 'Submit Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
      )}

      {/* Confirmation Alert Dialog */}
      <AlertDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        actionText={confirmDialog.actionText}
        cancelText={confirmDialog.cancelText}
        onAction={confirmDialog.onAction}
      />
    </div>
  );
};
