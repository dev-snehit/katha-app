import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useRouter } from '../../lib/router';
import { getLocalizedText } from '../../lib/bilingualHelper';
import { Order, Product, Customer } from '../../contracts';
import { FlowchartModal } from '../ui/FlowchartModal';
import { 
  TrendingUp, 
  Truck, 
  Package, 
  Users, 
  Building2, 
  GitBranch,
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Layers, 
  ArrowUpRight, 
  Send, 
  Plus, 
  FileSpreadsheet, 
  CreditCard,
  DollarSign,
  ChevronRight,
  Boxes,
  Activity,
  Flame
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { 
    orders, 
    inventory, 
    customers, 
    suppliers, 
    language, 
    currentUser, 
    hasFunctionalityAccess,
    syncStatus,
    lastSyncTime,
    connectAndHydrateServer 
  } = useAppStore();

  const { navigate } = useRouter();
  const isTe = language === 'TE';
  const [isFlowchartOpen, setIsFlowchartOpen] = useState(false);

  // --- 1. Commercial Financial Metrics ---
  const totalSupplierPayables = suppliers.reduce((sum, s) => sum + (s.payableAmount || 0), 0);
  const totalPipelineTurnover = orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
  const settledRevenue = orders
    .filter((o) => o.status === 'DELIVERED')
    .reduce((sum, o) => sum + (o.grandTotal || 0), 0);
  const pendingPipelineValue = orders
    .filter((o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + (o.grandTotal || 0), 0);
  const totalOutstandingCreditDues = customers.reduce((sum, c) => sum + (c.currentDue || 0), 0);

  // Today's Orders & Volume
  const todayDateStr = new Date().toISOString().slice(0, 10);
  const todayOrders = orders.filter((o) => (o.orderDate || '').slice(0, 10) === todayDateStr);
  const todayTurnover = todayOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
  const todayBags = todayOrders.reduce((sum, o) => sum + (o.totalOuterBags || 0), 0);

  // --- 2. Order Funnel Counts & Bags ---
  const pendingOrders = orders.filter((o) => o.status === 'PENDING_REVIEW');
  const approvedOrders = orders.filter((o) => o.status === 'APPROVED');
  const dispatchedOrders = orders.filter((o) => o.status === 'DISPATCHED');
  const deliveredOrders = orders.filter((o) => o.status === 'DELIVERED');

  const pendingBags = pendingOrders.reduce((sum, o) => sum + (o.totalOuterBags || 0), 0);
  const approvedBags = approvedOrders.reduce((sum, o) => sum + (o.totalOuterBags || 0), 0);
  const dispatchedBags = dispatchedOrders.reduce((sum, o) => sum + (o.totalOuterBags || 0), 0);
  const deliveredBags = deliveredOrders.reduce((sum, o) => sum + (o.totalOuterBags || 0), 0);

  // --- 3. Godown Inventory Metrics ---
  const totalGodownPhysicalBags = inventory.reduce((sum, p) => sum + (p.stockPhysicalOuter || 0), 0);
  const totalReservedBags = inventory.reduce((sum, p) => sum + (p.stockReservedOuter || 0), 0);
  const totalAvailableBags = Math.max(0, totalGodownPhysicalBags - totalReservedBags);
  const totalLooseInnerPackets = inventory.reduce((sum, p) => sum + (p.stockLooseInner || 0), 0);
  
  // Low stock commodities threshold <= 20 bags available
  const lowStockCommodities = inventory.filter((p) => {
    const avail = p.stockPhysicalOuter - p.stockReservedOuter;
    return avail <= 20;
  });

  // Top commodities for Stock Distribution Chart (sorted by physical bags)
  const topCommodities = [...inventory]
    .sort((a, b) => b.stockPhysicalOuter - a.stockPhysicalOuter)
    .slice(0, 6);

  const maxCommodityStock = topCommodities.length > 0 
    ? Math.max(...topCommodities.map((p) => p.stockPhysicalOuter), 1) 
    : 1;

  // --- 4. Customer Receivables & Risk Exposure ---
  const topIndebtedCustomers = [...customers]
    .filter((c) => c.currentDue > 0)
    .sort((a, b) => b.currentDue - a.currentDue)
    .slice(0, 5);

  // --- 5. Recent 8 Transactions ---
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt || b.orderDate).getTime() - new Date(a.createdAt || a.orderDate).getTime())
    .slice(0, 8);

  const triggerCustomerWhatsApp = (c: Customer) => {
    const text = encodeURIComponent(
      `Hello ${c.name}, Greetings from Kaatha Wholesale!\n` +
      `Your current pending credit balance is: Rs. ${c.currentDue.toLocaleString()}.\n` +
      `Kindly arrange payment settlement at your earliest convenience.\n\n` +
      `Thank you for your business!`
    );
    window.open(`https://wa.me/91${c.phone}?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Dashboard Top Header & Fast Overview */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 sm:p-7 rounded-3xl shadow-xl shadow-slate-900/10 border border-slate-700/50">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FF5A36] to-[#FF8155] flex items-center justify-center text-white shadow-md shadow-orange-500/30">
              <Flame className="w-4 h-4 fill-white" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              {isTe ? 'కాతా వ్యాపార డాష్‌బోర్డ్' : 'Kaatha Business Dashboard'}
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-orange-500/20 text-orange-300 border border-orange-500/30 uppercase tracking-wider">
              {currentUser?.role || 'COMMERCIAL'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-medium">
            {isTe 
              ? 'నిజ సమయ వ్యాపార లావాదేవీలు, ఆర్డర్ల పైప్‌లైన్, గోడౌన్ నిల్వలు మరియు కస్టమర్ల బకాయిల సమగ్ర విశ్లేషణ'
              : 'At-a-glance business clarity: real-time sales pipeline, godown inventory, receivables, and fulfillment intelligence.'}
          </p>
        </div>

        {/* Quick Actions Shortcuts */}
        {hasFunctionalityAccess('dashboard_page', 'quick_actions') && (
          <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-700/60">
            <button
              onClick={() => navigate('/orders/new')}
              className="inline-flex items-center gap-1.5 bg-[#FF5A36] hover:bg-[#e04826] text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-md shadow-orange-500/30 transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isTe ? 'కొత్త ఆర్డర్' : 'New Order'}</span>
            </button>

            <button
              onClick={() => navigate('/stock/new')}
              className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 shadow-sm transition-all active:scale-95"
            >
              <Package className="w-3.5 h-3.5 text-orange-400" />
              <span>{isTe ? 'సరుకు చేర్చండి' : 'Add Stock'}</span>
            </button>

            <button
              onClick={() => navigate('/customers/new')}
              className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 shadow-sm transition-all active:scale-95"
            >
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span>{isTe ? 'కస్టమర్' : 'Add Client'}</span>
            </button>

            <button
              onClick={() => navigate('/exports')}
              className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 shadow-sm transition-all active:scale-95"
              title={isTe ? 'ఎక్సెల్ రిపోర్టులు' : 'Download Reports'}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            </button>

            <button
              onClick={() => setIsFlowchartOpen(true)}
              className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 shadow-sm transition-all active:scale-95"
              title={isTe ? 'యాక్షన్ ఫ్లోచార్ట్‌లు' : 'Action Flowcharts'}
            >
              <GitBranch className="w-3.5 h-3.5 text-amber-400" />
              <span>{isTe ? 'ఫ్లోచార్ట్' : 'Flowcharts'}</span>
            </button>
          </div>
        )}
      </div>

      {/* --- SECTION 1: KEY FINANCIAL & OPERATIONAL KPIS --- */}
      {hasFunctionalityAccess('dashboard_page', 'view_kpi_metrics') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Gross Sales Turnover */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:border-orange-300 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {isTe ? 'మొత్తం అమ్మకాల టర్నోవర్' : 'Gross Pipeline Turnover'}
              </span>
              <div className="w-9 h-9 rounded-2xl bg-orange-50 text-[#FF5A36] flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              ₹{totalPipelineTurnover.toLocaleString()}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px]">
              <span className="text-slate-400">{isTe ? 'నేటి ఆర్డర్లు:' : 'Today:'}</span>
              <span className="font-bold text-emerald-600 font-mono">
                +₹{todayTurnover.toLocaleString()} ({todayBags} {isTe ? 'బస్తాలు' : 'Bags'})
              </span>
            </div>
          </div>

          {/* Card 2: Active Pipeline in Motion */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:border-blue-300 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {isTe ? 'రవాణా & ప్రాసెసింగ్' : 'Active Fulfillment'}
              </span>
              <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono tracking-tight flex items-baseline gap-2">
              <span>{pendingOrders.length + approvedOrders.length + dispatchedOrders.length}</span>
              <span className="text-xs font-bold text-slate-400 font-sans">
                {isTe ? 'ఆర్డర్లు' : 'Orders'}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px]">
              <span className="text-slate-400">{isTe ? 'పైప్‌లైన్ విలువ:' : 'Pipeline Value:'}</span>
              <span className="font-bold text-blue-700 font-mono">
                ₹{pendingPipelineValue.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Card 3: Total Outstanding Customer Dues */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:border-rose-300 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {isTe ? 'మొత్తం కస్టమర్ల బకాయిలు' : 'Outstanding Credit Dues'}
              </span>
              <div className="w-9 h-9 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className={`text-2xl font-black font-mono tracking-tight ${totalOutstandingCreditDues > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              ₹{totalOutstandingCreditDues.toLocaleString()}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px]">
              <span className="text-slate-400">{isTe ? 'సప్లయర్ బకాయిలు:' : 'Supplier Payables:'}</span>
              <button onClick={() => navigate('/suppliers')} className="font-bold text-amber-700 font-mono hover:underline">
                ₹{totalSupplierPayables.toLocaleString()}
              </button>
            </div>
          </div>

          {/* Card 4: Godown Physical Stock Capacity */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:border-emerald-300 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {isTe ? 'గోడౌన్ భౌతిక నిల్వలు' : 'Available Stock For Sale'}
              </span>
              <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-700 font-mono tracking-tight flex items-baseline gap-2">
              <span>{totalAvailableBags}</span>
              <span className="text-xs font-bold text-slate-400 font-sans">
                {isTe ? 'బస్తాలు' : 'Bags Available'}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px]">
              <span className="text-slate-400">{isTe ? 'మొత్తం గోడౌన్:' : 'Godown Total:'}</span>
              <span className="font-bold text-slate-700 font-mono">
                {totalGodownPhysicalBags} {isTe ? 'బస్తాలు' : 'Bags'} &bull; {totalLooseInnerPackets} {isTe ? 'లూజ్' : 'Pkts'}
              </span>
            </div>
          </div>

        </div>
      )}

      {/* --- SECTION 2: INTERACTIVE CHARTS & VISUAL INTELLIGENCE --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Fulfillment Pipeline Funnel Chart (Left 7 Cols) */}
        {hasFunctionalityAccess('dashboard_page', 'view_order_funnel_chart') && (
          <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#FF5A36]" />
                    <span>{isTe ? 'ఆర్డర్ల పైప్‌లైన్ ఫన్నెల్ & స్థితి విశ్లేషణ' : 'Order Fulfillment Pipeline Funnel'}</span>
                  </h2>
                  <p className="text-xs text-slate-400 font-medium">
                    {isTe ? 'వివిధ డెలివరీ దశలలో ఉన్న ఆర్డర్లు మరియు బస్తాల సంఖ్య' : 'Live tracking of wholesale volume across dispatch stages'}
                  </p>
                </div>
                <button
                  onClick={() => navigate('/orders')}
                  className="text-xs font-bold text-[#FF5A36] hover:text-[#e04826] inline-flex items-center gap-1 hover:underline"
                >
                  <span>{isTe ? 'అన్నీ చూడండి' : 'View Pipeline'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Visual Funnel Bar */}
              <div className="space-y-3.5 my-4">
                
                {/* Stage 1: Pending Review */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="flex items-center gap-1.5 text-blue-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      {isTe ? 'సమీక్షలో ఉన్నాయి (Pending Review)' : 'Pending Review'}
                    </span>
                    <span className="font-mono text-slate-700">
                      {pendingOrders.length} {isTe ? 'ఆర్డర్లు' : 'Orders'} &bull; {pendingBags} {isTe ? 'బస్తాలు' : 'Bags'}
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${orders.length ? Math.max(6, (pendingOrders.length / orders.length) * 100) : 0}%` }}
                    />
                  </div>
                </div>

                {/* Stage 2: Approved & Packing */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="flex items-center gap-1.5 text-amber-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      {isTe ? 'ఆమోదించబడినవి & ప్యాకింగ్ (Packing)' : 'Approved & Packing'}
                    </span>
                    <span className="font-mono text-slate-700">
                      {approvedOrders.length} {isTe ? 'ఆర్డర్లు' : 'Orders'} &bull; {approvedBags} {isTe ? 'బస్తాలు' : 'Bags'}
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${orders.length ? Math.max(6, (approvedOrders.length / orders.length) * 100) : 0}%` }}
                    />
                  </div>
                </div>

                {/* Stage 3: Dispatched & In Transit */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="flex items-center gap-1.5 text-purple-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                      {isTe ? 'రవాణాలో ఉన్నాయి (Out for Delivery)' : 'Dispatched & Transit'}
                    </span>
                    <span className="font-mono text-slate-700">
                      {dispatchedOrders.length} {isTe ? 'ఆర్డర్లు' : 'Orders'} &bull; {dispatchedBags} {isTe ? 'బస్తాలు' : 'Bags'}
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-500 rounded-full transition-all duration-500"
                      style={{ width: `${orders.length ? Math.max(6, (dispatchedOrders.length / orders.length) * 100) : 0}%` }}
                    />
                  </div>
                </div>

                {/* Stage 4: Delivered & Settled */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="flex items-center gap-1.5 text-emerald-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      {isTe ? 'డెలివరీ పూర్తయినవి (Settled)' : 'Delivered & Settled'}
                    </span>
                    <span className="font-mono text-slate-700">
                      {deliveredOrders.length} {isTe ? 'ఆర్డర్లు' : 'Orders'} &bull; {deliveredBags} {isTe ? 'బస్తాలు' : 'Bags'}
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${orders.length ? Math.max(6, (deliveredOrders.length / orders.length) * 100) : 0}%` }}
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* Quick Metrics Footer */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-100 text-center">
              <div className="p-2 rounded-xl bg-slate-50">
                <span className="text-[10px] text-slate-400 font-bold block">{isTe ? 'మొత్తం ఆర్డర్లు' : 'Total Orders'}</span>
                <span className="text-sm font-black text-slate-900 font-mono">{orders.length}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50">
                <span className="text-[10px] text-slate-400 font-bold block">{isTe ? 'డెలివరీ అయినవి' : 'Settled Value'}</span>
                <span className="text-sm font-black text-emerald-600 font-mono">₹{settledRevenue.toLocaleString()}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50">
                <span className="text-[10px] text-slate-400 font-bold block">{isTe ? 'మొత్తం బస్తాలు' : 'Total Bags'}</span>
                <span className="text-sm font-black text-slate-900 font-mono">{orders.reduce((acc, o) => acc + o.totalOuterBags, 0)}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50">
                <span className="text-[10px] text-slate-400 font-bold block">{isTe ? 'రద్దు చేసినవి' : 'Cancelled'}</span>
                <span className="text-sm font-black text-rose-600 font-mono">{orders.filter(o => o.status === 'CANCELLED').length}</span>
              </div>
            </div>
          </div>
        )}

        {/* Godown Stock Breakdown & Low Stock Warnings (Right 5 Cols) */}
        {hasFunctionalityAccess('dashboard_page', 'view_inventory_health') && (
          <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-emerald-600" />
                  <span>{isTe ? 'గోడౌన్ స్టాక్ హెల్త్ & గ్రాఫ్' : 'Godown Stock Health'}</span>
                </h2>
                <button
                  onClick={() => navigate('/stock')}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1 hover:underline"
                >
                  <span>{isTe ? 'రిజిస్ట్రీ' : 'Registry'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Low Stock Warning Banner if any */}
              {lowStockCommodities.length > 0 && (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 mb-4 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-bold text-amber-900">
                      {isTe ? `${lowStockCommodities.length} సరుకులు తక్కువ స్టాక్‌లో ఉన్నాయి (<=20 బస్తాలు):` : `${lowStockCommodities.length} commodities running low on available stock:`}
                    </span>
                    <span className="text-amber-800 ml-1">
                      {lowStockCommodities.map((c) => getLocalizedText(c, 'name', language)).slice(0, 3).join(', ')}
                      {lowStockCommodities.length > 3 ? '...' : ''}
                    </span>
                  </div>
                </div>
              )}

              {/* Interactive Top Commodity Distribution Bar Graph */}
              <div className="space-y-2.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  {isTe ? 'ప్రధాన సరుకుల నిల్వలు (బస్తాలు):' : 'Top Commodity Reserves (Outer Bags):'}
                </span>
                {topCommodities.map((prod) => {
                  const avail = Math.max(0, prod.stockPhysicalOuter - prod.stockReservedOuter);
                  const pct = Math.min(100, Math.round((prod.stockPhysicalOuter / maxCommodityStock) * 100));

                  return (
                    <div key={prod.id} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-800 truncate max-w-[200px]" title={prod.name}>
                          {getLocalizedText(prod, 'name', language)} ({prod.outerBagTotalKg}kg)
                        </span>
                        <span className="font-mono text-slate-600 text-[11px]">
                          {prod.stockPhysicalOuter} {isTe ? 'బస్తా' : 'Bags'} &bull;{' '}
                          <span className={avail <= 20 ? 'text-amber-600 font-bold' : 'text-emerald-700 font-bold'}>
                            {avail} {isTe ? 'అందుబాటు' : 'Avail'}
                          </span>
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${avail <= 20 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.max(5, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>{inventory.length} {isTe ? 'రకాల సరుకులు' : 'Total Varieties'}</span>
              <span>{suppliers.length} {isTe ? 'మిల్లులు & సప్లయర్లు' : 'Milling Partners'}</span>
            </div>
          </div>
        )}

      </div>

      {/* --- SECTION 3: CUSTOMER CREDIT DUES & RECENT TRANSACTIONS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Customer Receivables & Debtors Table (Left 5 Cols) */}
        {hasFunctionalityAccess('dashboard_page', 'view_credit_risk_table') && (
          <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-rose-600" />
                  <span>{isTe ? 'ఎక్కువ బకాయి ఉన్న కస్టమర్లు' : 'Top Outstanding Receivables'}</span>
                </h2>
                <button
                  onClick={() => navigate('/customers')}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1 hover:underline"
                >
                  <span>{isTe ? 'డైరెక్టరీ' : 'All Clients'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-slate-400 font-medium mb-3">
                {isTe ? 'అత్యధిక క్రెడిట్ బకాయిలు ఉన్న ఖాతాదారులు & వాట్సాప్ రిమైండర్' : 'Credit exposure ranking with 1-click WhatsApp payment reminders'}
              </p>

              {topIndebtedCustomers.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">
                    {isTe ? 'అద్భుతం! పెండింగ్ బకాయిలు ఏవీ లేవు.' : 'Great! All customer accounts are settled with zero outstanding credit.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {topIndebtedCustomers.map((c) => (
                    <div 
                      key={c.id}
                      className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/70 flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors"
                    >
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {getLocalizedText(c, 'name', language)}
                        </h4>
                        <p className="text-[10px] text-slate-400 truncate">
                          {c.businessName ? `${c.businessName} &bull; ` : ''}{c.phone}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-black font-mono text-rose-600">
                          ₹{c.currentDue.toLocaleString()}
                        </span>
                        <button
                          onClick={() => triggerCustomerWhatsApp(c)}
                          className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                          title={isTe ? 'వాట్సాప్ పేమెంట్ రిమైండర్ పంపండి' : 'Send WhatsApp Reminder'}
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>{customers.length} {isTe ? 'మొత్తం కస్టమర్లు' : 'Total Customers'}</span>
              <span className="font-bold text-rose-600 font-mono">
                {isTe ? 'మొత్తం బాకీ:' : 'Total Dues:'} ₹{totalOutstandingCreditDues.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* Recent Real-Time Activity Feed & Order Transactions (Right 7 Cols) */}
        {hasFunctionalityAccess('dashboard_page', 'view_recent_activity') && (
          <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-700" />
                  <span>{isTe ? 'ఇటీవలి వ్యాపార లావాదేవీలు' : 'Recent Business Transactions'}</span>
                </h2>
                <button
                  onClick={() => navigate('/orders')}
                  className="text-xs font-bold text-slate-700 hover:text-slate-900 inline-flex items-center gap-1 hover:underline"
                >
                  <span>{isTe ? 'అన్ని ఆర్డర్లు' : 'All Orders'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {recentOrders.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-500 font-medium">
                  {isTe ? 'ఇంకా ఎటువంటి ఆర్డర్లు నమోదు కాలేదు.' : 'No transactions recorded in database yet.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                        <th className="pb-2">{isTe ? 'ఆర్డర్ #' : 'Invoice'}</th>
                        <th className="pb-2">{isTe ? 'కస్టమర్' : 'Customer'}</th>
                        <th className="pb-2 text-center">{isTe ? 'బస్తాలు' : 'Bags'}</th>
                        <th className="pb-2 text-right">{isTe ? 'మొత్తం' : 'Total'}</th>
                        <th className="pb-2 text-right">{isTe ? 'స్థితి' : 'Status'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentOrders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 font-bold font-mono text-slate-900 whitespace-nowrap">
                            {ord.orderNumber}
                          </td>
                          <td className="py-2.5 font-medium text-slate-800 truncate max-w-[140px]" title={ord.customerName}>
                            {ord.customerName}
                          </td>
                          <td className="py-2.5 text-center font-bold font-mono text-slate-600">
                            {ord.totalOuterBags}
                          </td>
                          <td className="py-2.5 text-right font-black font-mono text-slate-900 whitespace-nowrap">
                            ₹{ord.grandTotal.toLocaleString()}
                          </td>
                          <td className="py-2.5 text-right whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              ord.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              ord.status === 'DISPATCHED' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                              ord.status === 'APPROVED' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}>
                              {ord.status === 'DELIVERED' ? (isTe ? 'డెలివరీ' : 'Settled') :
                               ord.status === 'DISPATCHED' ? (isTe ? 'రవాణా' : 'Transit') :
                               ord.status === 'APPROVED' ? (isTe ? 'ప్యాకింగ్' : 'Packing') :
                               (isTe ? 'సమీక్ష' : 'Pending')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                {isTe ? 'క్లౌడ్ డేటాబేస్‌తో సమకాలీకరించబడింది' : 'Synchronized with live backend database'}
              </span>
              <span className="font-mono text-[11px] text-slate-400">
                {lastSyncTime || 'Active'}
              </span>
            </div>
          </div>
        )}

      </div>

      <FlowchartModal
        isOpen={isFlowchartOpen}
        onClose={() => setIsFlowchartOpen(false)}
        language={language}
      />
    </div>
  );
};
