import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { en } from '../locales/en';
import { te } from '../locales/te';
import { Role } from '../contracts';
import { AlertDialog } from './ui/AlertDialog';
import { navigate, clearIntendedRoute } from '../lib/router';
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
  AlertCircle,
  LayoutDashboard
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
    syncAllToGoogleSheets,
    connectAndHydrateServer,
    hasPageAccess 
  } = useAppStore();
  
  const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  const t = language === 'TE' ? te : en;
  const roles: Role[] = ['ADMIN', 'OWNER', 'STAFF', 'CUSTOMER'];
  const pendingCount = orders.filter((o) => o.status === 'PENDING_REVIEW').length;

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    await connectAndHydrateServer();
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

  // Canonical navigation tabs with responsive concise labels and full titles for accessibility
  const navItems = [
    {
      id: 'dashboard',
      pageKey: 'dashboard_page',
      label: t.nav.dashboard,
      fullTitle: language === 'TE' ? 'వ్యాపార డాష్‌బోర్డ్ & ముఖ్య సూచికలు' : 'Business Performance Dashboard & KPIs',
      icon: LayoutDashboard,
    },
    {
      id: 'orders',
      pageKey: 'orders_page',
      label: t.nav.ordersShort,
      fullTitle: t.nav.pendingOrders,
      icon: Truck,
      badge: pendingCount,
    },
    {
      id: 'stock',
      pageKey: 'stock_page',
      label: t.nav.stockShort,
      fullTitle: t.nav.stock,
      icon: Package,
    },
    {
      id: 'customers',
      pageKey: 'customers_page',
      label: t.nav.customers,
      fullTitle: language === 'TE' ? 'కస్టమర్ల ఖాతా & చిరునామాలు' : 'Customers Directory & Khata',
      icon: Users,
    },
    {
      id: 'suppliers',
      pageKey: 'suppliers_page',
      label: t.nav.suppliers,
      fullTitle: language === 'TE' ? 'సప్లయర్లు & మిల్లు ఖాతాలు' : 'Suppliers Directory & Mill Ledgers',
      icon: Building2,
    },
    {
      id: 'exports',
      pageKey: 'reports_page',
      label: t.nav.reportsShort,
      fullTitle: t.nav.exportCenter,
      icon: FileSpreadsheet,
    },
    {
      id: 'admin',
      pageKey: 'user_management_page',
      label: t.nav.adminShort,
      fullTitle: t.nav.adminRequests,
      icon: ShieldCheck,
      isAdmin: true,
    },
  ].filter((item) => hasPageAccess(item.pageKey));

  return (
    <>
      {/* Top Main Navbar Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="w-full max-w-[1600px] mx-auto px-2.5 sm:px-4 lg:px-6 xl:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-1.5 sm:gap-2 xl:gap-3 min-w-0">
            
            {/* Brand Logo & Name (Clickable to redirect to index/initial page) */}
            <button
              onClick={() => {
                const target = hasPageAccess('dashboard_page') ? 'dashboard' : 'orders';
                setActiveTab(target);
                navigate(`/${target}`);
              }}
              className="flex items-center gap-2 sm:gap-2.5 shrink-0 text-left cursor-pointer group focus:outline-none"
              title={language === 'TE' ? 'కాతా హోమ్ పేజీకి వెళ్లండి' : 'Go to Kaatha Home / Initial Page'}
              aria-label={language === 'TE' ? 'కాతా CRM హోమ్' : 'Kaatha CRM Home'}
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 xl:w-10 xl:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-[#FF5A36] to-[#FF8155] flex items-center justify-center text-white shadow-md shadow-orange-500/20 shrink-0 transition-transform group-hover:scale-105 active:scale-95">
                <Flame className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />
              </div>
              <div className="flex flex-col justify-center shrink-0">
                <div className="flex items-center gap-1.5 whitespace-nowrap leading-tight">
                  <span className="text-sm sm:text-base xl:text-lg font-black tracking-tight text-slate-900 whitespace-nowrap group-hover:text-slate-700 transition-colors">
                    {language === 'TE' ? 'కాతా' : 'Kaatha'} <span className="text-[#FF5A36]">CRM</span>
                  </span>
                  <span className="hidden xl:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-orange-50 text-orange-700 border border-orange-200 whitespace-nowrap">
                    <Sparkles className="w-2.5 h-2.5" /> Mandi OS
                  </span>
                </div>
                <span className="hidden min-[1680px]:block text-[10px] xl:text-[11px] text-slate-400 font-medium whitespace-nowrap truncate max-w-[260px] leading-tight">
                  {t.tagline}
                </span>
              </div>
            </button>

            {/* Desktop Pill Navigation (Visible on lg: 1024px+ displays with all available options) */}
            <nav className="hidden lg:flex items-center p-1 bg-slate-100/90 rounded-full border border-slate-200/80 space-x-0.5 xl:space-x-1 shrink-0">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    title={item.fullTitle}
                    aria-label={item.fullTitle}
                    className={`relative inline-flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                      isActive
                        ? item.isAdmin
                          ? 'bg-[#FF5A36] text-white shadow-sm'
                          : 'bg-slate-900 text-white shadow-sm'
                        : item.isAdmin
                        ? 'text-orange-700 hover:bg-orange-50'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{item.label}</span>
                    {typeof item.badge === 'number' && item.badge > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-[#FF5A36] text-white">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Right Controls: Database Sync Pill, Settings, Language, User Profile & Sign Out */}
            <div className="flex items-center gap-1 sm:gap-1.5 xl:gap-2 shrink-0 ml-auto z-10">
              
              {/* Backend Database Sync Indicator Pill */}
              <button
                onClick={handleManualSync}
                title={
                  syncStatus === 'SYNCED' 
                    ? (language === 'TE' ? `క్లౌడ్ డేటాబేస్‌తో సింక్ అయింది (${lastSyncTime || 'ఇప్పుడే'}). రిఫ్రెష్ చేయడానికి క్లిక్ చేయండి.` : `Synced with Backend Database at ${lastSyncTime || 'now'}. Click to refresh.`) :
                  syncStatus === 'SYNCING' 
                    ? (language === 'TE' ? 'డేటాబేస్‌కు సింక్ అవుతోంది...' : 'Syncing to Backend Database...') :
                  syncStatus === 'ERROR' 
                    ? (language === 'TE' ? 'డేటాబేస్ సింక్ విఫలమైంది. సెట్టింగ్స్‌లో చెక్ చేయండి.' : 'Database sync failed. Click to test connection in Settings.') :
                  (language === 'TE' ? 'క్లౌడ్ డేటాబేస్‌ను కనెక్ట్ చేయడానికి క్లిక్ చేయండి' : 'Click to connect to Backend Database')
                }
                className={`inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-full text-[11px] font-bold border transition-all shrink-0 ${
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
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600 shrink-0" />
                ) : syncStatus === 'SYNCED' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : syncStatus === 'ERROR' ? (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                )}
                <span className="hidden min-[1440px]:inline text-[11px] whitespace-nowrap">
                  {syncStatus === 'SYNCED' ? (language === 'TE' ? 'డేటాబేస్ కనెక్ట్ అయింది' : 'Database Connected') :
                   syncStatus === 'SYNCING' || isManualSyncing ? (language === 'TE' ? 'సింక్ అవుతోంది...' : 'Syncing...') :
                   syncStatus === 'ERROR' ? (language === 'TE' ? 'రీకనెక్ట్ చేస్తోంది...' : 'Reconnecting...') : 
                   (language === 'TE' ? 'డేటాబేస్ కనెక్ట్' : 'Connect Database')}
                </span>
                <span className="hidden sm:inline min-[1440px]:hidden text-[11px] whitespace-nowrap">
                  {syncStatus === 'SYNCED' ? (language === 'TE' ? 'కనెక్ట్' : 'Connected') :
                   syncStatus === 'SYNCING' || isManualSyncing ? (language === 'TE' ? 'సింక్...' : 'Syncing...') :
                   syncStatus === 'ERROR' ? (language === 'TE' ? 'ఎర్రర్' : 'Error') : 
                   (language === 'TE' ? 'కనెక్ట్' : 'Connect')}
                </span>
              </button>

              {/* Settings Button */}
              <button
                onClick={onOpenSettings}
                className="p-1.5 sm:p-2 text-slate-600 hover:text-slate-900 bg-slate-100/90 hover:bg-slate-200 border border-slate-200/80 rounded-full transition-colors shrink-0 shadow-2xs"
                title={language === 'TE' ? 'డేటాబేస్ & సర్వర్ సెట్టింగ్స్' : 'Backend Database Connection Settings'}
                aria-label="Settings"
              >
                <Settings className="w-4 h-4 shrink-0" />
              </button>

              {/* Language Selector Dropdown */}
              <div className="inline-flex items-center gap-0.5 sm:gap-1 bg-slate-100 px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-full border border-slate-200 shrink-0">
                <Globe className="hidden sm:inline w-3 h-3 text-slate-500 shrink-0" />
                <select
                  aria-label={t.common.language}
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as 'EN' | 'TE')}
                  className="bg-transparent text-[10px] sm:text-xs font-bold text-slate-800 outline-none cursor-pointer"
                >
                  <option value="EN">EN</option>
                  <option value="TE">తె</option>
                </select>
              </div>

              {/* Current User Badge & Sign Out */}
              {currentUser && (
                <div className="flex items-center gap-1 pl-0.5 shrink-0">
                  <div 
                    title={`${currentUser.name} (${currentUser.role})`}
                    className="flex items-center gap-1 bg-orange-50 border border-orange-200/80 rounded-full p-0.5 sm:pl-1.5 sm:pr-2 sm:py-1 shrink-0"
                  >
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-tr from-[#FF5A36] to-[#FF8155] text-white flex items-center justify-center text-[9px] sm:text-[10px] font-black shrink-0">
                      {getUserInitials(currentUser.name)}
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-bold text-orange-900 hidden md:inline whitespace-nowrap">
                      {currentUser.role}
                    </span>
                  </div>

                  <button
                    onClick={() => setIsSignOutDialogOpen(true)}
                    className="p-1 sm:p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors shrink-0"
                    title={language === 'TE' ? 'లాగౌట్' : 'Sign Out'}
                  >
                    <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Responsive Top Navigation Strip for Smaller Screens (< lg: tablets and mobile) */}
        <div className="lg:hidden border-t border-slate-200/80 bg-slate-50/90 backdrop-blur-md px-2 sm:px-4 py-1.5">
          <div className="flex items-center justify-start sm:justify-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  title={item.fullTitle}
                  aria-label={item.fullTitle}
                  className={`relative inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                    isActive
                      ? item.isAdmin
                        ? 'bg-[#FF5A36] text-white shadow-sm'
                        : 'bg-slate-900 text-white shadow-sm'
                      : item.isAdmin
                      ? 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200/70'
                      : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80 shadow-2xs'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>
                  {typeof item.badge === 'number' && item.badge > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-[#FF5A36] text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* MOBILE BOTTOM NAVIGATION BAR (Thumb Reach for Handheld Phones) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 px-1 py-1 flex items-center justify-around shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-xl text-[9px] sm:text-[10px] font-bold transition-colors shrink-0 ${
                isActive
                  ? item.isAdmin ? 'text-[#FF5A36]' : 'text-slate-900 font-black'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="relative">
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 px-1 py-0.1 rounded-full text-[8px] font-black bg-[#FF5A36] text-white">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="truncate max-w-[50px]">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sign Out Confirmation Modal */}
      <AlertDialog
        isOpen={isSignOutDialogOpen}
        onClose={() => setIsSignOutDialogOpen(false)}
        type="warning"
        title={language === 'TE' ? 'కాతా హోల్‌సేల్ నుండి లాగౌట్ అవ్వాలా?' : 'Sign Out of Kaatha Wholesale?'}
        message={language === 'TE' 
          ? 'కాతా వర్క్‌స్పేస్‌ను తిరిగి అన్‌లాక్ చేయడానికి మీ పాస్‌వర్డ్‌తో లాగిన్ అవ్వాలి.'
          : 'You will need to sign in with your credentials to unlock your Kaatha workspace again.'}
        actionText={language === 'TE' ? 'అవును, లాగౌట్ చేయి' : 'Yes, Sign Out'}
        onAction={() => {
          clearIntendedRoute();
          logout();
          navigate('/login');
        }}
      />
    </>
  );
};
