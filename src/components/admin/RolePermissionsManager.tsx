import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Role, RolePermissionsConfig, PagePermissionConfig } from '../../contracts';
import { PERMISSION_PAGES_META, DEFAULT_ROLE_PERMISSIONS } from '../../lib/permissions';
import { AlertDialog, DialogType } from '../ui/AlertDialog';
import { 
  ShieldCheck, 
  Crown, 
  UserCheck, 
  Users, 
  Save, 
  RotateCcw, 
  Code, 
  Check, 
  Copy, 
  Lock, 
  Unlock, 
  Sparkles,
  Info,
  CheckCircle2
} from 'lucide-react';

export const RolePermissionsManager: React.FC = () => {
  const { 
    rolePermissions, 
    updateRolePermissions, 
    startActionLoading, 
    stopActionLoading, 
    language,
    currentUser 
  } = useAppStore();

  const isTe = language === 'TE';
  const [selectedRole, setSelectedRole] = useState<Role>('STAFF');
  const [localPermissions, setLocalPermissions] = useState<RolePermissionsConfig>(() => 
    JSON.parse(JSON.stringify(rolePermissions || DEFAULT_ROLE_PERMISSIONS))
  );
  const [showJsonView, setShowJsonView] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Custom Alert Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: DialogType;
    actionText: string;
    onAction: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    actionText: '',
    onAction: () => {},
  });

  // Keep local state in sync when store updates
  React.useEffect(() => {
    if (rolePermissions) {
      setLocalPermissions(JSON.parse(JSON.stringify(rolePermissions)));
    }
  }, [rolePermissions]);

  const activeRoleConfig = localPermissions[selectedRole] || DEFAULT_ROLE_PERMISSIONS[selectedRole];

  const handleTogglePage = (pageKey: string, currentVal: boolean) => {
    const updated = JSON.parse(JSON.stringify(localPermissions)) as RolePermissionsConfig;
    if (!updated[selectedRole]) {
      updated[selectedRole] = JSON.parse(JSON.stringify(DEFAULT_ROLE_PERMISSIONS[selectedRole]));
    }
    if (!updated[selectedRole][pageKey]) {
      updated[selectedRole][pageKey] = { enabled: true, functionalities: {} };
    }
    updated[selectedRole][pageKey].enabled = !currentVal;
    setLocalPermissions(updated);
  };

  const handleToggleFunctionality = (pageKey: string, funcKey: string, currentVal: boolean) => {
    const updated = JSON.parse(JSON.stringify(localPermissions)) as RolePermissionsConfig;
    if (!updated[selectedRole]) {
      updated[selectedRole] = JSON.parse(JSON.stringify(DEFAULT_ROLE_PERMISSIONS[selectedRole]));
    }
    if (!updated[selectedRole][pageKey]) {
      updated[selectedRole][pageKey] = { enabled: true, functionalities: {} };
    }
    if (!updated[selectedRole][pageKey].functionalities) {
      updated[selectedRole][pageKey].functionalities = {};
    }
    updated[selectedRole][pageKey].functionalities[funcKey] = !currentVal;
    setLocalPermissions(updated);
  };

  const handleSaveRoleControls = () => {
    setConfirmDialog({
      isOpen: true,
      title: isTe ? `"${selectedRole}" రోల్ అనుమతులను సేవ్ చేయాలా?` : `Save Controls for Role "${selectedRole}"?`,
      message: isTe
        ? `ఈ రోల్ ఉన్న వినియోగదారులందరికీ ఫీచర్ యాక్సెస్ మరియు స్క్రీన్ విజిబిలిటీ తక్షణమే మారుతుంది. అలాగే క్లౌడ్ డేటాబేస్ ఆపరేషన్లకు కూడా ఈ పరిమితులు వర్తిస్తాయి.`
        : `This will update the global permissions JSON in the cloud database for role "${selectedRole}". All users with this role will immediately see restricted/enabled features in both UI and backend.`,
      type: 'info',
      actionText: isTe ? 'అవును, సేవ్ చేయి' : 'Yes, Save to Database',
      onAction: async () => {
        startActionLoading(
          `Syncing role permissions for "${selectedRole}" to database...`,
          `డేటాబేస్‌లో "${selectedRole}" రోల్ అనుమతులు సేవ్ అవుతున్నాయి...`
        );
        await updateRolePermissions(selectedRole, localPermissions[selectedRole]);
        stopActionLoading();
        setFeedbackMessage(
          isTe 
            ? `"${selectedRole}" రోల్ అనుమతులు విజయవంతంగా డేటాబేస్‌లో సేవ్ చేయబడ్డాయి.`
            : `Feature permissions for "${selectedRole}" successfully committed to database.`
        );
        setTimeout(() => setFeedbackMessage(null), 5000);
      },
    });
  };

  const handleResetDefaults = () => {
    setConfirmDialog({
      isOpen: true,
      title: isTe ? `డిఫాల్ట్ అనుమతులకు రీసెట్ చేయాలా?` : `Reset "${selectedRole}" to Standard Defaults?`,
      message: isTe
        ? `మీరు "${selectedRole}" రోల్ కొరకు సిఫార్సు చేసిన డిఫాల్ట్ అనుమతులను పునరుద్ధరించాలనుకుంటున్నారా?`
        : `Are you sure you want to revert all permissions for "${selectedRole}" to recommended enterprise defaults?`,
      type: 'warning',
      actionText: isTe ? 'రీసెట్ చేయి' : 'Reset Defaults',
      onAction: async () => {
        const defaultForRole = JSON.parse(JSON.stringify(DEFAULT_ROLE_PERMISSIONS[selectedRole]));
        const updated = {
          ...localPermissions,
          [selectedRole]: defaultForRole,
        };
        setLocalPermissions(updated);
        startActionLoading(
          `Resetting "${selectedRole}" permissions to defaults...`,
          `"${selectedRole}" అనుమతులు డిఫాల్ట్‌కు రీసెట్ అవుతున్నాయి...`
        );
        await updateRolePermissions(selectedRole, defaultForRole);
        stopActionLoading();
        setFeedbackMessage(
          isTe
            ? `"${selectedRole}" డిఫాల్ట్ అనుమతులు పునరుద్ధరించబడ్డాయి.`
            : `Reverted "${selectedRole}" to standard production defaults.`
        );
        setTimeout(() => setFeedbackMessage(null), 5000);
      },
    });
  };

  const roleMeta: Record<Role, { labelEn: string; labelTe: string; descEn: string; descTe: string; icon: React.ReactNode; color: string }> = {
    OWNER: {
      labelEn: 'Enterprise Owner',
      labelTe: 'సంస్థ యజమాని (Owner)',
      descEn: 'Full strategic ownership and uninhibited governance over financial ledgers and platform settings',
      descTe: 'సంస్థ యొక్క పూర్తి యజమాని — అన్ని ఆర్థిక లెడ్జర్లు మరియు సెట్టింగులపై పూర్తి అధికారాలు',
      icon: <Crown className="w-4 h-4 text-amber-500" />,
      color: 'border-amber-400 bg-amber-50/50 text-amber-900',
    },
    ADMIN: {
      labelEn: 'Platform Administrator',
      labelTe: 'అడ్మినిస్ట్రేటర్ (Admin)',
      descEn: 'Operational supervisor with complete capability to manage stock, orders, clients, and role governance',
      descTe: 'నిర్వాహకుడు — స్టాక్, ఆర్డర్లు, కస్టమర్లు మరియు అనుమతులను నిర్వహించే అధికారం',
      icon: <ShieldCheck className="w-4 h-4 text-[#FF5A36]" />,
      color: 'border-orange-400 bg-orange-50/50 text-orange-950',
    },
    STAFF: {
      labelEn: 'Operations & Dispatch Staff',
      labelTe: 'ఆపరేషన్స్ సిబ్బంది (Staff)',
      descEn: 'Frontline godown workers who create orders, dispatch vehicles, deliver goods, and unpack stock bags',
      descTe: 'గోడౌన్ సిబ్బంది — ఆర్డర్లు నమోదు చేయడం, లారీ రవాణా, డెలివరీ మరియు బస్తాలు విప్పడం',
      icon: <UserCheck className="w-4 h-4 text-blue-500" />,
      color: 'border-blue-400 bg-blue-50/50 text-blue-950',
    },
    CUSTOMER: {
      labelEn: 'Wholesale Buyer / Client',
      labelTe: 'హోల్‌సేల్ కస్టమర్ (Client)',
      descEn: 'Direct wholesale buyers viewing live catalog availability and placing bulk purchase orders',
      descTe: 'హోల్‌సేల్ కొనుగోలుదారు — లైవ్ స్టాక్ ధరలు చూడటం మరియు ఆర్డర్లు సమర్పించడం',
      icon: <Users className="w-4 h-4 text-emerald-500" />,
      color: 'border-emerald-400 bg-emerald-50/50 text-emerald-950',
    },
  };

  const formattedJson = JSON.stringify(activeRoleConfig, null, 2);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(formattedJson);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div className="space-y-6">
      <AlertDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        actionText={confirmDialog.actionText}
        cancelText={isTe ? 'రద్దు చేయి' : 'Cancel'}
        onAction={() => {
          confirmDialog.onAction();
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Role Navigation Selector Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#FF5A36] text-xs font-bold uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>{isTe ? 'రోల్ ఆధారిత అనుమతుల నిర్వహణ' : 'Role-Specific Governance'}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {isTe ? 'రోల్ నిర్దిష్ట ఫీచర్లు & యాక్సెస్ కంట్రోల్స్' : 'Role-Specific Features & Permissions Matrix'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl">
              {isTe 
                ? 'డేటాబేస్ JSON ద్వారా ప్రతి రోల్ చూసే స్క్రీన్ ఫీచర్లు మరియు క్లౌడ్ డేటాబేస్ మార్పులను ప్రపంచవ్యాప్తంగా నియంత్రించండి.'
                : 'Configure the database-driven boolean JSON schema to globally enable or disable screens and functionalities for each user role in both UI and backend.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowJsonView(!showJsonView)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-colors ${
                showJsonView 
                  ? 'bg-slate-900 text-white border-slate-900' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
              title={isTe ? 'డేటాబేస్ JSON స్కీమా చూడండి' : 'Toggle live database JSON view'}
            >
              <Code className="w-4 h-4" />
              <span>{isTe ? 'డేటాబేస్ JSON' : 'Database JSON'}</span>
            </button>

            <button
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
              title={isTe ? 'సిఫార్సు చేసిన డిఫాల్ట్ అనుమతులకు రీసెట్ చేయండి' : 'Reset this role to default permissions'}
            >
              <RotateCcw className="w-4 h-4 text-slate-500" />
              <span>{isTe ? 'డిఫాల్ట్‌కు రీసెట్' : 'Reset Defaults'}</span>
            </button>

            <button
              onClick={handleSaveRoleControls}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#FF5A36] to-[#FF6B4A] hover:from-[#f04f2c] hover:to-[#f05a38] text-white shadow-md shadow-orange-500/20 transition-all active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>{isTe ? 'డేటాబేస్‌లో సేవ్ చేయండి' : 'Save to Database'}</span>
            </button>
          </div>
        </div>

        {/* Role Pill Switcher */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
          {(['OWNER', 'ADMIN', 'STAFF', 'CUSTOMER'] as Role[]).map((r) => {
            const isSelected = selectedRole === r;
            const meta = roleMeta[r];
            return (
              <button
                key={r}
                type="button"
                onClick={() => setSelectedRole(r)}
                className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                  isSelected 
                    ? `${meta.color} ring-2 ring-[#FF5A36] shadow-sm` 
                    : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/80 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5 font-extrabold text-xs">
                    {meta.icon}
                    <span>{r}</span>
                  </div>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-[#FF5A36] animate-pulse" />
                  )}
                </div>
                <span className="text-[11px] font-bold block truncate">
                  {isTe ? meta.labelTe : meta.labelEn}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Role Active Banner */}
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-start gap-2.5 text-xs">
          <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-extrabold text-slate-900 mr-1.5">
              {isTe ? roleMeta[selectedRole].labelTe : roleMeta[selectedRole].labelEn}:
            </span>
            <span className="text-slate-600">
              {isTe ? roleMeta[selectedRole].descTe : roleMeta[selectedRole].descEn}
            </span>
          </div>
        </div>
      </div>

      {/* Success Feedback Banner */}
      {feedbackMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
          <button 
            onClick={() => setFeedbackMessage(null)}
            className="text-emerald-600 hover:text-emerald-900 font-bold text-sm"
          >
            &times;
          </button>
        </div>
      )}

      {/* Live Database JSON Schema Viewer */}
      {showJsonView && (
        <div className="bg-slate-950 rounded-3xl p-5 border border-slate-800 text-white space-y-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-orange-400" />
              <span className="text-xs font-mono font-bold text-orange-300">
                DATABASE SCHEMA: Role_Permissions[{selectedRole}]
              </span>
            </div>
            <button
              onClick={handleCopyJson}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors"
            >
              {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedJson ? (isTe ? 'కాపీ చేయబడింది' : 'Copied!') : (isTe ? 'JSON కాపీ చేయండి' : 'Copy JSON')}</span>
            </button>
          </div>
          <pre className="text-xs font-mono text-emerald-300 overflow-x-auto max-h-[380px] p-2 leading-relaxed selection:bg-orange-600 selection:text-white">
            {formattedJson}
          </pre>
        </div>
      )}

      {/* Pages and Functionalities Switchboard Cards */}
      <div className="space-y-4">
        {PERMISSION_PAGES_META.map((pageMeta) => {
          const pageKey = pageMeta.key;
          const pageConfig: PagePermissionConfig = activeRoleConfig[pageKey] || {
            enabled: true,
            functionalities: {},
          };
          const isPageActive = Boolean(pageConfig.enabled);

          return (
            <div 
              key={pageKey}
              className={`rounded-3xl border transition-all overflow-hidden ${
                isPageActive 
                  ? 'bg-white border-slate-200/90 shadow-sm' 
                  : 'bg-slate-50/60 border-slate-200/50 opacity-80'
              }`}
            >
              {/* Page Section Banner */}
              <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-50/80 via-white to-transparent">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    isPageActive 
                      ? 'bg-orange-50 text-[#FF5A36] border border-orange-200/60' 
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}>
                    {isPageActive ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                        {isTe ? pageMeta.labelTe : pageMeta.labelEn}
                      </h3>
                      <span className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full border ${
                        isPageActive 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {isPageActive ? (isTe ? 'పేజీ అందుబాటులో ఉంది' : 'PAGE ACTIVE') : (isTe ? 'పేజీ నిలిపివేయబడింది' : 'PAGE DISABLED')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isTe ? pageMeta.descriptionTe : pageMeta.descriptionEn}
                    </p>
                  </div>
                </div>

                {/* Main Page Master Switch */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-slate-600">
                    {isTe ? 'విభాగం యాక్సెస్:' : 'Module Access:'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleTogglePage(pageKey, isPageActive)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      isPageActive ? 'bg-[#FF5A36]' : 'bg-slate-300'
                    }`}
                    role="switch"
                    aria-checked={isPageActive}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isPageActive ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Child Functionalities Grid */}
              <div className="p-4 sm:p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {pageMeta.functionalities.map((funcMeta) => {
                    const funcKey = funcMeta.key;
                    const isFuncActive = isPageActive && Boolean(pageConfig.functionalities?.[funcKey]);

                    return (
                      <div
                        key={funcKey}
                        className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                          !isPageActive
                            ? 'bg-slate-100/50 border-slate-200/50 opacity-60'
                            : isFuncActive
                              ? 'bg-white border-emerald-200/80 shadow-xs'
                              : 'bg-slate-50/80 border-slate-200/80'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-slate-900 block truncate">
                              {isTe ? funcMeta.labelTe : funcMeta.labelEn}
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
                              isFuncActive 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : 'bg-slate-200/80 text-slate-600'
                            }`}>
                              {isFuncActive ? (isTe ? 'అనుమతించబడింది' : 'ENABLED') : (isTe ? 'పరిమితం' : 'DISABLED')}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 block mt-0.5 leading-snug">
                            {isTe ? funcMeta.descriptionTe : funcMeta.descriptionEn}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 mt-1 block">
                            key: {funcKey}
                          </span>
                        </div>

                        {/* Functionality Toggle */}
                        <button
                          type="button"
                          disabled={!isPageActive}
                          onClick={() => handleToggleFunctionality(pageKey, funcKey, isFuncActive)}
                          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
                            !isPageActive 
                              ? 'bg-slate-200 cursor-not-allowed' 
                              : isFuncActive 
                                ? 'bg-emerald-500 cursor-pointer' 
                                : 'bg-slate-300 cursor-pointer'
                          }`}
                          role="switch"
                          aria-checked={isFuncActive}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                              isFuncActive ? 'translate-x-4' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
