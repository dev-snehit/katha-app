import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { PendingOrdersView } from './components/orders/PendingOrdersView';
import { StockRegistryView } from './components/stock/StockRegistryView';
import { CustomerDirectoryView } from './components/customers/CustomerDirectoryView';
import { SupplierDirectoryView } from './components/suppliers/SupplierDirectoryView';
import { ExportCenterView } from './components/exports/ExportCenterView';
import { UserRequestsView } from './components/admin/UserRequestsView';
import { SettingsModal } from './components/settings/SettingsModal';
import { AuthView } from './components/auth/AuthView';
import { useAppStore } from './store/useAppStore';
import { 
  useRouter, 
  updateDocumentTitle, 
  getIntendedRoute, 
  setIntendedRoute, 
  clearIntendedRoute 
} from './lib/router';

export default function App() {
  const { route, navigate, goBack } = useRouter();
  const [lastActiveTab, setLastActiveTab] = useState<string>('orders');
  const { 
    language, 
    isAuthenticated, 
    currentUser, 
    connectAndHydrateServer, 
    isConnectingServer, 
    actionLoading,
    hasPageAccess 
  } = useAppStore();

  // Establish persistent server connection & hydrate latest database records on initial load
  useEffect(() => {
    connectAndHydrateServer();
  }, [connectAndHydrateServer]);

  // Keep document title synchronized with active route and bilingual locale
  useEffect(() => {
    updateDocumentTitle(route, language);
  }, [route, language]);

  // Derive active tab from route
  const activeTab = route.view === 'settings' 
    ? lastActiveTab 
    : (route.view === 'auth' ? 'orders' : route.view);

  // Track the last non-settings view tab
  useEffect(() => {
    if (route.view !== 'settings' && route.view !== 'auth') {
      setLastActiveTab(route.view);
    }
  }, [route.view]);

  // Redirect users away from views disabled in role permissions
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      const pageKeyMap: Record<string, string> = {
        orders: 'orders_page',
        stock: 'stock_page',
        customers: 'customers_page',
        suppliers: 'suppliers_page',
        exports: 'reports_page',
        admin: 'user_management_page',
      };
      const pageKey = pageKeyMap[route.view];
      if (pageKey && !hasPageAccess(pageKey)) {
        const pages = ['orders', 'stock', 'customers', 'suppliers', 'exports'];
        const firstAvailable = pages.find((p) => hasPageAccess(pageKeyMap[p])) || 'orders';
        navigate(`/${firstAvailable}`, { replace: true });
      }
    }
  }, [isAuthenticated, currentUser, route.view, hasPageAccess, navigate]);

  // Handle post-login redirection to intended bookmarked route
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      const intended = getIntendedRoute();
      if (intended) {
        clearIntendedRoute();
        navigate(intended, { replace: true });
      } else if (route.view === 'auth') {
        navigate('/orders', { replace: true });
      }
    }
  }, [isAuthenticated, currentUser, route.view, navigate]);

  // Remember intended protected route when unauthenticated
  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      if (route.view !== 'auth') {
        if (route.path !== '/orders' && route.path !== '/' && route.path !== '') {
          setIntendedRoute(route.path);
        }
      }
    }
  }, [isAuthenticated, currentUser, route]);

  // Authentication Gate: Require sign in if no active persistent authenticated session exists
  if (!isAuthenticated || !currentUser) {
    return <AuthView />;
  }

  const isSettingsOpen = route.view === 'settings' || Boolean(route.queryParams.settings);

  const handleTabChange = (tab: string) => {
    navigate(`/${tab}`);
  };

  const handleCloseSettings = () => {
    if (route.view === 'settings') {
      navigate(`/${lastActiveTab || 'orders'}`);
    } else {
      goBack(`/${lastActiveTab || 'orders'}`);
    }
  };

  return (
    <div className={`min-h-screen bg-[#F8F9FB] flex flex-col ${language === 'TE' ? 'font-telugu' : ''}`}>
      {/* Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onOpenSettings={() => navigate('/settings')}
      />

      {/* Main Container (with pb-28 for mobile thumb reach above sticky bottom nav) */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-5 sm:py-6 pb-28 md:pb-8 relative">
        {/* Content area with disabled user actions when connecting/syncing server */}
        <div 
          className={`transition-all duration-300 ${
            isConnectingServer ? 'pointer-events-none select-none opacity-20 filter blur-[1px]' : ''
          }`}
          aria-hidden={isConnectingServer}
        >
          {activeTab === 'orders' && hasPageAccess('orders_page') && <PendingOrdersView setActiveTab={handleTabChange} />}
          {activeTab === 'stock' && hasPageAccess('stock_page') && <StockRegistryView />}
          {activeTab === 'customers' && hasPageAccess('customers_page') && <CustomerDirectoryView />}
          {activeTab === 'suppliers' && hasPageAccess('suppliers_page') && <SupplierDirectoryView />}
          {activeTab === 'exports' && hasPageAccess('reports_page') && <ExportCenterView />}
          {activeTab === 'admin' && hasPageAccess('user_management_page') && <UserRequestsView />}
        </div>

        {/* Action Loading Spinner with Simple Message */}
        {actionLoading?.isLoading && (
          <div 
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <div className="max-w-sm w-full bg-white p-6 sm:p-7 rounded-3xl shadow-2xl border border-slate-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
              <div className="relative w-14 h-14 mb-3.5">
                <div className="absolute inset-0 rounded-full border-4 border-orange-100" />
                <div className="absolute inset-0 rounded-full border-4 border-[#FF5A36] border-t-transparent animate-spin" />
                <div className="absolute inset-2 rounded-full border-2 border-orange-200 border-b-transparent animate-spin [animation-direction:reverse] [animation-duration:1.5s]" />
                <div className="absolute inset-0 flex items-center justify-center text-[#FF5A36]">
                  <RefreshCw className="w-5 h-5 animate-spin [animation-duration:3s]" />
                </div>
              </div>

              <h3 className="text-base font-black text-slate-900 mb-1">
                {language === 'TE' 
                  ? (actionLoading.messageTe || actionLoading.message) 
                  : actionLoading.message}
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                {language === 'TE' ? 'దయచేసి వేచి ఉండండి...' : 'Please wait a moment...'}
              </p>
            </div>
          </div>
        )}

        {/* Server Connection & Live Sync Overlay */}
        {isConnectingServer && (
          <div 
            className="absolute inset-x-3.5 sm:inset-x-6 lg:inset-x-8 top-5 sm:top-6 bottom-28 md:bottom-8 z-40 bg-white/75 backdrop-blur-md rounded-3xl border border-orange-200/70 shadow-2xl flex items-center justify-center p-4 sm:p-6 animate-in fade-in zoom-in-95 duration-200"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <div className="max-w-md w-full bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-100 flex flex-col items-center text-center">
              {/* Animated Spinner with Brand Theme */}
              <div className="relative w-16 h-16 mb-4">
                <div className="absolute inset-0 rounded-full border-4 border-orange-100" />
                <div className="absolute inset-0 rounded-full border-4 border-[#FF5A36] border-t-transparent animate-spin" />
                <div className="absolute inset-2 rounded-full border-2 border-orange-200 border-b-transparent animate-spin [animation-direction:reverse] [animation-duration:1.5s]" />
                <div className="absolute inset-0 flex items-center justify-center text-[#FF5A36]">
                  <RefreshCw className="w-6 h-6 animate-spin [animation-duration:3s]" />
                </div>
              </div>

              {/* Title */}
              <h3 className="text-lg font-black text-slate-900 mb-2">
                {language === 'TE' 
                  ? 'సర్వర్ మరియు డేటాబేస్‌తో అనుసంధానించబడుతోంది...' 
                  : 'Connecting to Backend Database...'}
              </h3>

              {/* Detailed Progress Description */}
              <p className="text-xs text-slate-600 leading-relaxed font-medium mb-4">
                {language === 'TE'
                  ? 'మీ క్లౌడ్ డేటాబేస్ నుండి సరుకులు, తాజా హోల్‌సేల్ ధరలు, కస్టమర్ రికార్డులు మరియు బకాయి ఆర్డర్లను లోడ్ చేస్తున్నాము. సమకాలీకరణ పూర్తయ్యే వరకు కంటెంట్ స్క్రీన్ చర్యలు తాత్కాలికంగా నిలిపివేయబడ్డాయి.'
                  : 'Connecting to your secure cloud database backend and hydrating the latest inventory, wholesale prices, customer accounts, and pending orders. Main content actions are temporarily disabled until data synchronization completes.'}
              </p>

              {/* Sync Progress Pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200/80 text-[11px] font-bold text-orange-800 mb-3">
                <span className="w-2 h-2 rounded-full bg-[#FF5A36] animate-ping" />
                <span>
                  {language === 'TE' 
                    ? 'లైవ్ డేటాబేస్ సింక్ పురోగతిలో ఉంది • దయచేసి వేచి ఉండండి' 
                    : 'Live Database Sync in Progress • Please wait'}
                </span>
              </div>

              <p className="text-[10px] text-slate-400">
                {language === 'TE'
                  ? 'గమనిక: సెట్టింగ్‌లు లేదా ఇతర ఎంపికల కోసం ఎగువ నావ్‌బార్ ఎల్లప్పుడూ అందుబాటులో ఉంటుంది.'
                  : 'Tip: Top navigation bar remains active for settings or other actions.'}
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer (hidden on small mobile screens to save vertical space) */}
      <footer className="hidden md:block bg-white border-t border-slate-200/80 py-4 text-center text-xs text-slate-400">
        <p>
          {language === 'TE'
            ? 'కాతా హోల్‌సేల్ • బియ్యం మరియు కిరాణా వేదిక'
            : 'Kaatha Wholesale • Enterprise Rice & Groceries Platform'}
        </p>
      </footer>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={handleCloseSettings}
      />
    </div>
  );
}
