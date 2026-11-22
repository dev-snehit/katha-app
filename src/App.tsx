import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { PendingOrdersView } from './components/orders/PendingOrdersView';
import { StockRegistryView } from './components/stock/StockRegistryView';
import { CustomerDirectoryView } from './components/customers/CustomerDirectoryView';
import { SupplierDirectoryView } from './components/suppliers/SupplierDirectoryView';
import { ExportCenterView } from './components/exports/ExportCenterView';
import { UserRequestsView } from './components/admin/UserRequestsView';
import { SettingsModal } from './components/settings/SettingsModal';
import { useAppStore } from './store/useAppStore';

export default function App() {
  const [activeTab, setActiveTab] = useState('orders');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { language } = useAppStore();

  return (
    <div className={`min-h-screen bg-slate-50/80 flex flex-col ${language === 'TE' ? 'font-telugu' : ''}`}>
      {/* Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'orders' && <PendingOrdersView />}
        {activeTab === 'stock' && <StockRegistryView />}
        {activeTab === 'customers' && <CustomerDirectoryView />}
        {activeTab === 'suppliers' && <SupplierDirectoryView />}
        {activeTab === 'exports' && <ExportCenterView />}
        {activeTab === 'admin' && <UserRequestsView />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <p>
          Katha Wholesale (కథా హోల్‌సేల్) &bull; Enterprise Rice & Groceries Platform &bull; Pre-Seeded Admin: Snehit Tadepalli
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
