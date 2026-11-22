import React, { useState } from 'react';
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

export default function App() {
  const [activeTab, setActiveTab] = useState('orders');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { language, isAuthenticated, currentUser } = useAppStore();

  // Authentication Gate: Require sign in every time the application is opened
  if (!isAuthenticated || !currentUser) {
    return <AuthView />;
  }

  return (
    <div className={`min-h-screen bg-[#F8F9FB] flex flex-col ${language === 'TE' ? 'font-telugu' : ''}`}>
      {/* Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Container (with pb-28 for mobile thumb reach above sticky bottom nav) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-5 sm:py-6 pb-28 md:pb-8">
        {activeTab === 'orders' && <PendingOrdersView setActiveTab={setActiveTab} />}
        {activeTab === 'stock' && <StockRegistryView />}
        {activeTab === 'customers' && <CustomerDirectoryView />}
        {activeTab === 'suppliers' && <SupplierDirectoryView />}
        {activeTab === 'exports' && <ExportCenterView />}
        {activeTab === 'admin' && currentUser.role === 'ADMIN' && <UserRequestsView />}
      </main>

      {/* Footer (hidden on small mobile screens to save vertical space) */}
      <footer className="hidden md:block bg-white border-t border-slate-200/80 py-4 text-center text-xs text-slate-400">
        <p>
          {language === 'TE'
            ? 'కథా హోల్‌సేల్ • బియ్యం మరియు కిరాణా వేదిక'
            : 'Katha Wholesale • Enterprise Rice & Groceries Platform'}
        </p>
      </footer>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
