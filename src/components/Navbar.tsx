import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { en } from '../locales/en';
import { te } from '../locales/te';
import { Role } from '../contracts';
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
  Search,
  Sparkles
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, onOpenSettings }) => {
  const { language, setLanguage, currentUser, setCurrentUser, orders } = useAppStore();
  const t = language === 'TE' ? te : en;

  const roles: Role[] = ['ADMIN', 'OWNER', 'STAFF', 'CUSTOMER'];
  const pendingCount = orders.filter((o) => o.status === 'PENDING_REVIEW').length;

  return (
    <>
      {/* Top Main Navbar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            
            {/* Brand Logo & Name */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 via-rose-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
                <Flame className="w-5 h-5 fill-white" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-black tracking-tight text-slate-900">
                    Katha <span className="text-orange-600 font-extrabold">CRM</span>
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

            {/* Desktop Pill Navigation (Inspired by the Reference CRM UI) */}
            <nav className="hidden lg:flex items-center p-1 bg-slate-100/80 rounded-full border border-slate-200/70 space-x-1">
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
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-orange-500 text-white">
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

              {currentUser.role === 'ADMIN' && (
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                    activeTab === 'admin'
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'text-orange-700 hover:bg-orange-50'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{t.nav.adminRequests}</span>
                </button>
              )}
            </nav>

            {/* Right Controls: Search, Language & Settings */}
            <div className="flex items-center gap-2 sm:gap-3">
              
              {/* Language Selector Dropdown */}
              <div className="inline-flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                <Globe className="w-3.5 h-3.5 text-slate-500" />
                <select
                  aria-label={t.common.language}
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as 'EN' | 'TE')}
                  className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
                >
                  <option value="EN">English</option>
                  <option value="TE">తెలుగు</option>
                </select>
              </div>

              {/* Role Indicator Pill */}
              <div className="hidden sm:inline-flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                <span className="text-[11px] text-slate-400 font-medium">Role:</span>
                <select
                  aria-label="Active Role"
                  value={currentUser.role}
                  onChange={(e) => {
                    const role = e.target.value as Role;
                    setCurrentUser({ ...currentUser, role });
                  }}
                  className="bg-transparent text-xs font-bold text-orange-600 outline-none cursor-pointer"
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Settings Button */}
              <button
                onClick={onOpenSettings}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
                title="Google Sheet Connection Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE BOTTOM NAVIGATION BAR (Sticky Thumb-First Control) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 flex items-center justify-around shadow-lg">
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-[10px] font-bold transition-colors ${
            activeTab === 'orders' ? 'text-orange-600' : 'text-slate-500'
          }`}
        >
          <div className="relative">
            <Truck className="w-5 h-5" />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-orange-600 text-white">
                {pendingCount}
              </span>
            )}
          </div>
          <span>Orders</span>
        </button>

        <button
          onClick={() => setActiveTab('stock')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-[10px] font-bold transition-colors ${
            activeTab === 'stock' ? 'text-orange-600' : 'text-slate-500'
          }`}
        >
          <Package className="w-5 h-5" />
          <span>Stock</span>
        </button>

        <button
          onClick={() => setActiveTab('customers')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-[10px] font-bold transition-colors ${
            activeTab === 'customers' ? 'text-orange-600' : 'text-slate-500'
          }`}
        >
          <Users className="w-5 h-5" />
          <span>Clients</span>
        </button>

        <button
          onClick={() => setActiveTab('suppliers')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-[10px] font-bold transition-colors ${
            activeTab === 'suppliers' ? 'text-orange-600' : 'text-slate-500'
          }`}
        >
          <Building2 className="w-5 h-5" />
          <span>Mills</span>
        </button>

        <button
          onClick={() => setActiveTab('exports')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-[10px] font-bold transition-colors ${
            activeTab === 'exports' ? 'text-orange-600' : 'text-slate-500'
          }`}
        >
          <FileSpreadsheet className="w-5 h-5" />
          <span>Reports</span>
        </button>
      </div>
    </>
  );
};
