import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { en } from '../locales/en';
import { te } from '../locales/te';
import { Role } from '../contracts';
import { AlertDialog } from './ui/AlertDialog';
import { 
  Flame, 
  Truck, 
  Package, 
  Users, 
  Building2, 
  FileSpreadsheet, 
  ShieldCheck, 
  Settings, 
  Globe,
  Sparkles,
  LogOut,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, onOpenSettings }) => {
  const { 
    language, 
    setLanguage, 
    currentUser, 
    setCurrentUser, 
    logout, 
    orders, 
    syncStatus, 
    lastSyncTime,
    syncAllToGoogleSheets 
  } = useAppStore();
  
  const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  const t = language === 'TE' ? te : en;
  const roles: Role[] = ['ADMIN', 'OWNER', 'STAFF', 'CUSTOMER'];
  const pendingCount = orders.filter((o) => o.status === 'PENDING_REVIEW').length;

  const handleManualSync = async () => {
    if (syncStatus === 'UNLINKED') {
      onOpenSettings();
      return;
    }
    setIsManualSyncing(true);
    await syncAllToGoogleSheets();
    setIsManualSyncing(false);
  };

  const getUserInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <>
      {/* Top Main Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
            
            {/* Brand Logo & Name */}
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FF5A36] to-[#FF8155] flex items-center justify-center text-white shadow-md shadow-orange-500/20 shrink-0">
                <Flame className="w-5 h-5 fill-white" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-base sm:text-lg font-black tracking-tight text-slate-900">
                    Katha <span className="text-[#FF5A36]">CRM</span>
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                    <Sparkles className="w-2.5 h-2.5" /> Mandi OS
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium -mt-0.5 line-clamp-1">
                  {t.tagline}
                </span>
              </div>
            </div>

            {/* Desktop Pill Navigation */}
            <nav className="hidden lg:flex items-center p-1 bg-slate-100/90 rounded-full border border-slate-200/70 space-x-1">
              <button
                onClick={() => setActiveTab('orders')}
                className={`relative inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  activeTab === 'orders'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>{t.nav.pendingOrders}</span>
                {pendingCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-[#FF5A36] text-white">
                    {pendingCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('stock')}
                className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  activeTab === 'stock'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>{t.nav.stock}</span>
              </button>

              <button
                onClick={() => setActiveTab('customers')}
                className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  activeTab === 'customers'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>{t.nav.customers}</span>
              </button>

              <button
                onClick={() => setActiveTab('suppliers')}
                className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  activeTab === 'suppliers'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>{t.nav.suppliers}</span>
              </button>

              <button
                onClick={() => setActiveTab('exports')}
                className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  activeTab === 'exports'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>{t.nav.exportCenter}</span>
              </button>

              {currentUser?.role === 'ADMIN' && (
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                    activeTab === 'admin'
                      ? 'bg-[#FF5A36] text-white shadow-sm'
                      : 'text-orange-700 hover:bg-orange-50'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{t.nav.adminRequests}</span>
                </button>
              )}
            </nav>

            {/* Right Controls: Sync Pill, Language, User Profile & Settings */}
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              
              {/* Google Sheets Sync Indicator Pill */}
              <button
                onClick={handleManualSync}
                title={
                  syncStatus === 'SYNCED' ? `Synced with Google Sheet at ${lastSyncTime || 'now'}. Click to refresh.` :
                  syncStatus === 'SYNCING' ? 'Syncing to Google Sheet...' :
                  syncStatus === 'ERROR' ? 'Sync failed. Click to test connection in Settings.' :
                  'Click to connect your Google Sheet'
                }
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
                  syncStatus === 'SYNCED'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    : syncStatus === 'SYNCING' || isManualSyncing
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : syncStatus === 'ERROR'
                    ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                }`}
              >
                {syncStatus === 'SYNCING' || isManualSyncing ? (
                  <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />
                ) : syncStatus === 'SYNCED' ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                ) : syncStatus === 'ERROR' ? (
                  <AlertCircle className="w-3 h-3 text-rose-600" />
                ) : (
                  <RefreshCw className="w-3 h-3 text-slate-400" />
                )}
                <span className="hidden sm:inline">
                  {syncStatus === 'SYNCED' ? (language === 'TE' ? 'షీట్ సింక్ అయింది' : 'Sheet Synced') :
                   syncStatus === 'SYNCING' || isManualSyncing ? (language === 'TE' ? 'సింక్ అవుతోంది...' : 'Syncing...') :
                   syncStatus === 'ERROR' ? (language === 'TE' ? 'సింక్ లోపం' : 'Sync Error') : 
                   (language === 'TE' ? 'షీట్ లింక్ చేయండి' : 'Link Sheet')}
                </span>
              </button>

              {/* Language Selector Dropdown */}
              <div className="inline-flex items-center gap-1 bg-slate-100 px-2.5 py-1.5 rounded-full border border-slate-200">
                <Globe className="w-3.5 h-3.5 text-slate-500" />
                <select
                  aria-label={t.common.language}
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as 'EN' | 'TE')}
                  className="bg-transparent text-[11px] sm:text-xs font-bold text-slate-800 outline-none cursor-pointer"
                >
                  <option value="EN">EN</option>
                  <option value="TE">తెలుగు</option>
                </select>
              </div>

              {/* Current User Badge & Sign Out */}
              {currentUser && (
                <div className="flex items-center gap-1.5 pl-1">
                  <div 
                    title={`${currentUser.name} (${currentUser.role})`}
                    className="flex items-center gap-1.5 bg-orange-50 border border-orange-200/80 rounded-full pl-1.5 pr-2.5 py-1"
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#FF5A36] to-[#FF8155] text-white flex items-center justify-center text-[10px] font-black">
                      {getUserInitials(currentUser.name)}
                    </div>
                    <span className="text-[11px] font-bold text-orange-900 hidden sm:inline">
                      {currentUser.role}
                    </span>
                  </div>

                  <button
                    onClick={() => setIsSignOutDialogOpen(true)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors"
                    title={language === 'TE' ? 'లాగౌట్' : 'Sign Out'}
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Settings Button */}
              <button
                onClick={onOpenSettings}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
                title={language === 'TE' ? 'గూగుల్ షీట్ సెట్టింగ్స్' : 'Google Sheet Connection Settings'}
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] font-bold transition-colors ${
            activeTab === 'orders' ? 'text-[#FF5A36]' : 'text-slate-500'
          }`}
        >
          <div className="relative">
            <Truck className="w-5 h-5" />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-[#FF5A36] text-white">
                {pendingCount}
              </span>
            )}
          </div>
          <span>{language === 'TE' ? 'ఆర్డర్లు' : 'Orders'}</span>
        </button>

        <button
          onClick={() => setActiveTab('stock')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] font-bold transition-colors ${
            activeTab === 'stock' ? 'text-[#FF5A36]' : 'text-slate-500'
          }`}
        >
          <Package className="w-5 h-5" />
          <span>{language === 'TE' ? 'స్టాక్' : 'Stock'}</span>
        </button>

        <button
          onClick={() => setActiveTab('customers')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] font-bold transition-colors ${
            activeTab === 'customers' ? 'text-[#FF5A36]' : 'text-slate-500'
          }`}
        >
          <Users className="w-5 h-5" />
          <span>{language === 'TE' ? 'కస్టమర్లు' : 'Clients'}</span>
        </button>

        <button
          onClick={() => setActiveTab('suppliers')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] font-bold transition-colors ${
            activeTab === 'suppliers' ? 'text-[#FF5A36]' : 'text-slate-500'
          }`}
        >
          <Building2 className="w-5 h-5" />
          <span>{language === 'TE' ? 'మిల్లులు' : 'Mills'}</span>
        </button>

        <button
          onClick={() => setActiveTab('exports')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] font-bold transition-colors ${
            activeTab === 'exports' ? 'text-[#FF5A36]' : 'text-slate-500'
          }`}
        >
          <FileSpreadsheet className="w-5 h-5" />
          <span>{language === 'TE' ? 'రిపోర్టులు' : 'Reports'}</span>
        </button>

        {currentUser?.role === 'ADMIN' && (
          <button
            onClick={() => setActiveTab('admin')}
            className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] font-bold transition-colors ${
              activeTab === 'admin' ? 'text-[#FF5A36]' : 'text-slate-500'
            }`}
          >
            <ShieldCheck className="w-5 h-5" />
            <span>{language === 'TE' ? 'అడ్మిన్' : 'Admin'}</span>
          </button>
        )}
      </div>

      {/* Sign Out Confirmation Modal */}
      <AlertDialog
        isOpen={isSignOutDialogOpen}
        onClose={() => setIsSignOutDialogOpen(false)}
        type="warning"
        title={language === 'TE' ? 'కథా హోల్‌సేల్ నుండి లాగౌట్ అవ్వాలా?' : 'Sign Out of Katha Wholesale?'}
        message={language === 'TE' 
          ? 'వర్క్‌స్పేస్‌ను తిరిగి అన్‌లాక్ చేయడానికి మీ పాస్‌వర్డ్‌తో లాగిన్ అవ్వాలి.'
          : 'You will need to sign in with your credentials to unlock the workspace again.'}
        actionText={language === 'TE' ? 'అవును, లాగౌట్ చేయి' : 'Yes, Sign Out'}
        onAction={logout}
      />
    </>
  );
};
