import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { en } from '../../locales/en';
import { te } from '../../locales/te';
import { getLocalizedText } from '../../lib/bilingualHelper';
import { Order, OrderItem, UnitType } from '../../contracts';
import { AlertDialog, DialogType } from '../ui/AlertDialog';
import { 
  Plus, 
  Trash2, 
  AlertTriangle, 
  Share2, 
  CheckCircle2, 
  Inbox,
  Percent
} from 'lucide-react';

interface FormItemRow {
  rowId: string;
  productId: string;
  unitType: UnitType;
  quantity: number | '';
  unitPrice: number | '';
}

interface PendingOrdersViewProps {
  setActiveTab?: (tab: string) => void;
}

export const PendingOrdersView: React.FC<PendingOrdersViewProps> = ({ setActiveTab }) => {
  const { 
    orders, 
    inventory, 
    customers, 
    language, 
    currentUser, 
    addOrder, 
    approveOrder, 
    markOrderDispatched, 
    markOrderDelivered 
  } = useAppStore();

  const t = language === 'TE' ? te : en;
  const isTe = language === 'TE';

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Custom Alert Dialog State
  const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: DialogType;
    actionText: string;
    onAction?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
    actionText: 'Got it',
  });

  const showDialog = (
    title: string, 
    message: string, 
    type: DialogType = 'warning', 
    actionText = 'Understood', 
    onAction?: () => void
  ) => {
    setDialogConfig({
      isOpen: true,
      title,
      message,
      type,
      actionText,
      onAction,
    });
  };

  // New Order Form State (ZERO AUTO-FILL)
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [itemRows, setItemRows] = useState<FormItemRow[]>([
    { rowId: 'row-1', productId: '', unitType: 'OUTER_BAG', quantity: '', unitPrice: '' }
  ]);
  const [hamaliPerBag, setHamaliPerBag] = useState<number | ''>('');
  const [transportCharges, setTransportCharges] = useState<number | ''>('');
  const [discount, setDiscount] = useState<number | ''>(''); // Custom discount
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Active Pipeline Filter
  const [activePipeline, setActivePipeline] = useState<string>('ALL');

  // Helpers to get 2-letter initials for avatar badge
  const getInitials = (name: string) => {
    if (!name) return 'WH';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const avatarColorPalettes = [
    'bg-orange-100 text-orange-800 border-orange-200',
    'bg-blue-100 text-blue-800 border-blue-200',
    'bg-amber-100 text-amber-800 border-amber-200',
    'bg-rose-100 text-rose-800 border-rose-200',
    'bg-emerald-100 text-emerald-800 border-emerald-200',
    'bg-purple-100 text-purple-800 border-purple-200',
  ];

  const getAvatarColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash += str.charCodeAt(i);
    return avatarColorPalettes[Math.abs(hash) % avatarColorPalettes.length];
  };

  // Pipeline Metrics
  const pendingOrders = orders.filter((o) => o.status === 'PENDING_REVIEW');
  const approvedOrders = orders.filter((o) => o.status === 'APPROVED');
  const dispatchedOrders = orders.filter((o) => o.status === 'DISPATCHED');
  const deliveredOrders = orders.filter((o) => o.status === 'DELIVERED');

  const filteredOrders = orders.filter((o) => {
    if (activePipeline === 'ALL') return true;
    return o.status === activePipeline;
  });

  const totalPipelineValue = orders.reduce((sum, o) => sum + o.grandTotal, 0);

  // Dynamic Row Item Handlers
  const handleAddItemRow = () => {
    setItemRows([
      ...itemRows,
      {
        rowId: `row-${Date.now()}`,
        productId: '',
        unitType: 'OUTER_BAG',
        quantity: '',
        unitPrice: '',
      }
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (itemRows.length <= 1) return;
    setItemRows(itemRows.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: keyof FormItemRow, value: any) => {
    const updated = [...itemRows];
    updated[index] = { ...updated[index], [field]: value };

    // Suggest default wholesale rate when product is selected IF unit price is not set yet
    if (field === 'productId') {
      const prod = inventory.find((p) => p.id === value);
      if (prod && (updated[index].unitPrice === '' || updated[index].unitPrice === 0)) {
        updated[index].unitPrice = updated[index].unitType === 'OUTER_BAG' 
          ? prod.wholesalePriceBag 
          : prod.pricePerInnerBag;
      }
    }

    if (field === 'unitType') {
      const prod = inventory.find((p) => p.id === updated[index].productId);
      if (prod) {
        updated[index].unitPrice = value === 'OUTER_BAG' 
          ? prod.wholesalePriceBag 
          : prod.pricePerInnerBag;
      }
    }

    setItemRows(updated);
  };

  // Multi-item dynamic calculation
  const calculatedItems: OrderItem[] = itemRows.map((row) => {
    const prod = inventory.find((p) => p.id === row.productId);
    const qty = Number(row.quantity) || 0;
    const rate = Number(row.unitPrice) || 0;
    const lineTotal = qty * rate;
    return {
      productId: row.productId,
      productName: prod ? prod.name : (isTe ? 'సరుకు' : 'Commodity'),
      productNameTe: prod ? prod.nameTe : '',
      unitType: row.unitType,
      quantity: qty,
      unitPrice: rate,
      lineTotal,
    };
  });

  const subtotal = calculatedItems.reduce((sum, it) => sum + it.lineTotal, 0);
  const totalOuterBags = calculatedItems
    .filter((it) => it.unitType === 'OUTER_BAG')
    .reduce((sum, it) => sum + it.quantity, 0);
  const totalInnerBags = calculatedItems
    .filter((it) => it.unitType === 'INNER_BAG')
    .reduce((sum, it) => sum + it.quantity, 0);

  const totalWeightKg = calculatedItems.reduce((sum, it) => {
    const prod = inventory.find((p) => p.id === it.productId);
    if (!prod) return sum;
    if (it.unitType === 'OUTER_BAG') return sum + it.quantity * prod.outerBagTotalKg;
    if (it.unitType === 'INNER_BAG') return sum + it.quantity * prod.innerBagWeightKg;
    return sum + it.quantity;
  }, 0);

  const totalHamali = totalOuterBags * (Number(hamaliPerBag) || 0);
  const totalFreight = Number(transportCharges) || 0;
  const totalDiscount = Number(discount) || 0;
  const grandTotal = Math.max(0, subtotal + totalHamali + totalFreight - totalDiscount);

  const handleOpenNewOrder = () => {
    if (inventory.length === 0) {
      showDialog(
        isTe ? 'సరుకుల స్టాక్ ఖాళీగా ఉంది' : 'Stock Registry Empty',
        isTe 
          ? 'ఆర్డర్ నమోదు చేయడానికి ముందు దయచేసి స్టాక్ రిజిస్ట్రీలో సరుకులను చేర్చండి.'
          : 'You have not added any commodities yet. Please add Rice or Flour bags in the Stock Registry before placing an order.',
        'warning',
        isTe ? 'సరుకులను చేర్చండి' : 'Add Commodities Now',
        () => setActiveTab && setActiveTab('stock')
      );
      return;
    }

    if (customers.length === 0) {
      showDialog(
        isTe ? 'ఖాతాదారుల వివరాలు లేవు' : 'No Customers Registered',
        isTe 
          ? 'ఆర్డర్ నమోదు చేయడానికి ముందు దయచేసి కస్టమర్‌లను డైరెక్టరీలో చేర్చండి.'
          : 'You have not added any customers yet. Please add a customer with a 10-digit mobile number first.',
        'warning',
        isTe ? 'కస్టమర్‌ను చేర్చండి' : 'Add Customer Now',
        () => setActiveTab && setActiveTab('customers')
      );
      return;
    }

    // Reset to clean empty form with ZERO auto-fill
    setSelectedCustomerId('');
    setItemRows([{ rowId: 'row-1', productId: '', unitType: 'OUTER_BAG', quantity: '', unitPrice: '' }]);
    setHamaliPerBag('');
    setTransportCharges('');
    setDiscount('');
    setVehicleNumber('');
    setDriverPhone('');
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const customer = customers.find((c) => c.id === selectedCustomerId);
    if (!customer) {
      setErrorMessage(isTe ? 'దయచేసి ఒక కస్టమర్‌ను ఎంచుకోండి.' : 'Please select a customer.');
      return;
    }

    if (calculatedItems.length === 0 || calculatedItems.some((it) => !it.productId || it.quantity <= 0)) {
      setErrorMessage(isTe ? 'దయచేసి అన్ని సరుకుల వరుసలలో సరైన పరిమాణాలను నమోదు చేయండి.' : 'Please complete all commodity rows with valid quantities.');
      return;
    }

    // Check stock availability
    for (const item of calculatedItems) {
      const prod = inventory.find((p) => p.id === item.productId);
      if (prod && item.unitType === 'OUTER_BAG') {
        const available = prod.stockPhysicalOuter - prod.stockReservedOuter;
        if (item.quantity > available) {
          setErrorMessage(
            isTe 
              ? `${prod.name} కొరకు స్టాక్ సరిపోదు: కేవలం ${available} బస్తాలు మాత్రమే అందుబాటులో ఉన్నాయి.`
              : `Insufficient stock for ${prod.name}: Only ${available} bags available.`
          );
          return;
        }
      }
    }

    const newOrder: Order = {
      id: crypto.randomUUID ? crypto.randomUUID() : `ord-${Date.now()}`,
      orderNumber: `ORD-${Date.now().toString().slice(-4)}`,
      customerId: customer.id,
      customerName: customer.name,
      customerNameTe: customer.nameTe,
      customerPhone: customer.phone,
      orderDate: new Date().toISOString(),
      status: 'PENDING_REVIEW',
      totalOuterBags,
      totalInnerBags,
      totalWeightKg,
      items: calculatedItems,
      subtotal,
      hamaliCharges: totalHamali,
      transportCharges: totalFreight,
      discount: totalDiscount,
      grandTotal,
      paymentMode: 'CREDIT',
      vehicleNumber,
      driverPhone,
      submittedByRole: currentUser?.role || 'STAFF',
      createdAt: new Date().toISOString(),
    };

    addOrder(newOrder);
    setIsModalOpen(false);
    setSelectedCustomerId('');
    setItemRows([{ rowId: 'row-1', productId: '', unitType: 'OUTER_BAG', quantity: '', unitPrice: '' }]);
  };

  const triggerWhatsAppBill = (order: Order) => {
    const text = encodeURIComponent(
      `*KATHA WHOLESALE - INVOICE*\n` +
      `Order: ${order.orderNumber}\n` +
      `Customer: ${order.customerName}\n` +
      `Total Bags: ${order.totalOuterBags} Bags (${order.totalWeightKg} kg)\n` +
      `Subtotal: Rs. ${order.subtotal.toLocaleString()}\n` +
      (order.discount && order.discount > 0 ? `Discount: -Rs. ${order.discount.toLocaleString()}\n` : '') +
      `Grand Total: Rs. ${order.grandTotal.toLocaleString()}\n` +
      `Status: ${order.status}\n\n` +
      `Thank you for your business!`
    );
    window.open(`https://wa.me/91${order.customerPhone}?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      
      {/* Top Header & Metrics Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {isTe ? 'ఆర్డర్ల పైప్‌లైన్' : 'Order Pipeline'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-900 text-white">
              {orders.length}
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-400 font-medium mt-0.5">
            {isTe ? (
              <>
                మొత్తం ఆర్డర్ల విలువ:{' '}
                <span className="font-bold text-slate-700">₹{totalPipelineValue.toLocaleString()}</span>
              </>
            ) : (
              <>
                Active pipeline value:{' '}
                <span className="font-bold text-slate-700">₹{totalPipelineValue.toLocaleString()}</span>
              </>
            )}
          </p>
        </div>

        {/* Primary Action Button */}
        <div>
          <button
            onClick={handleOpenNewOrder}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 via-orange-600 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-black text-sm px-6 py-3.5 sm:py-3 rounded-full shadow-lg shadow-orange-500/25 transition-all active:scale-95 min-h-[48px]"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
            <span>{isTe ? 'కొత్త ఆర్డర్' : 'New Order'}</span>
          </button>
        </div>
      </div>

      {/* Multi-Segment Color Pipeline Strip */}
      <div className="space-y-2.5">
        <div className="grid grid-cols-4 gap-1.5 h-2 w-full rounded-full overflow-hidden bg-slate-200/60 p-0.5">
          <div className="bg-blue-500 rounded-full h-full" title={isTe ? 'సమీక్షలో ఉంది' : 'Pending Review'} />
          <div className="bg-amber-500 rounded-full h-full" title={isTe ? 'ప్యాకింగ్' : 'Approved & Packing'} />
          <div className="bg-purple-500 rounded-full h-full" title={isTe ? 'రవాణాలో ఉంది' : 'Out for Delivery'} />
          <div className="bg-emerald-500 rounded-full h-full" title={isTe ? 'డెలివరీ పూర్తయింది' : 'Delivered & Settled'} />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          <button
            onClick={() => setActivePipeline('ALL')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all min-h-[36px] ${
              activePipeline === 'ALL'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            {isTe ? `అన్ని ఆర్డర్లు (${orders.length})` : `All Orders (${orders.length})`}
          </button>

          <button
            onClick={() => setActivePipeline('PENDING_REVIEW')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all min-h-[36px] ${
              activePipeline === 'PENDING_REVIEW'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-blue-700 hover:bg-blue-50 border border-blue-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            {isTe ? `సమీక్షలో ఉన్నాయి (${pendingOrders.length})` : `Pending (${pendingOrders.length})`}
          </button>

          <button
            onClick={() => setActivePipeline('APPROVED')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all min-h-[36px] ${
              activePipeline === 'APPROVED'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-white text-amber-700 hover:bg-amber-50 border border-amber-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            {isTe ? `ప్యాకింగ్ (${approvedOrders.length})` : `Packing (${approvedOrders.length})`}
          </button>

          <button
            onClick={() => setActivePipeline('DISPATCHED')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all min-h-[36px] ${
              activePipeline === 'DISPATCHED'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-white text-purple-700 hover:bg-purple-50 border border-purple-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            {isTe ? `రవాణాలో ఉన్నాయి (${dispatchedOrders.length})` : `Transit (${dispatchedOrders.length})`}
          </button>

          <button
            onClick={() => setActivePipeline('DELIVERED')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all min-h-[36px] ${
              activePipeline === 'DELIVERED'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {isTe ? `డెలివరీ అయినవి (${deliveredOrders.length})` : `Settled (${deliveredOrders.length})`}
          </button>
        </div>
      </div>

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <div className="card-soft p-8 sm:p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-3xl bg-orange-50 text-orange-500 flex items-center justify-center mb-4">
            <Inbox className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {orders.length === 0 
              ? (isTe ? 'ఇంకా ఎటువంటి ఆర్డర్లు నమోదు కాలేదు' : 'No orders recorded yet')
              : (isTe ? 'ఈ విభాగంలో ఆర్డర్లు లేవు' : 'No orders in this pipeline stage')}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mb-5 font-medium">
            {orders.length === 0 
              ? (isTe ? 'ఆర్డర్లను నమోదు చేయడానికి "కొత్త ఆర్డర్" బటన్ నొక్కండి.' : 'Your order book is ready. Tap "New Order" to start recording dispatches.')
              : (isTe ? 'ఇతర విభాగాల ఆర్డర్లను వీక్షించడానికి పై ఫిల్టర్లను ఎంచుకోండి.' : 'Switch filter tabs above to view orders in other operational stages.')}
          </p>
          {orders.length === 0 && (
            <button
              onClick={handleOpenNewOrder}
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-3 rounded-full shadow-md active:scale-95 transition-transform"
            >
              <Plus className="w-4 h-4" />
              <span>{isTe ? 'మొదటి ఆర్డర్‌ను నమోదు చేయండి' : 'Place First Order'}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {filteredOrders.map((order) => {
            const initials = getInitials(order.customerName);
            const avatarColor = getAvatarColor(order.customerName);

            return (
              <div
                key={order.id}
                className="card-soft p-4 sm:p-5 flex flex-col justify-between hover:border-orange-400 transition-all active:scale-[0.99]"
              >
                <div>
                  {/* Card Header: Initials Avatar + Name + Amount */}
                  <div className="flex items-start justify-between gap-2.5 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center font-black text-xs shrink-0 ${avatarColor}`}>
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 truncate">
                          {getLocalizedText(order, 'customerName', language)}
                        </h4>
                        <div className="text-[11px] font-mono text-slate-400">
                          {order.orderNumber} &bull; {order.customerPhone}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-black text-slate-900 font-mono">
                        ₹{order.grandTotal.toLocaleString()}
                      </div>
                      {order.discount && order.discount > 0 ? (
                        <span className="text-[10px] font-extrabold text-emerald-600 block">
                          -₹{order.discount.toLocaleString()} {isTe ? 'తగ్గింపు' : 'off'}
                        </span>
                      ) : null}
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {order.paymentMode}
                      </span>
                    </div>
                  </div>

                  {/* Bags & Weight Badge */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700">
                      {order.totalOuterBags} {isTe ? 'బస్తాలు' : 'Bags'}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100/70 text-slate-500 font-mono">
                      {order.totalWeightKg} kg
                    </span>
                    {order.vehicleNumber && (
                      <span className="px-2 py-1 rounded-lg text-[10px] font-mono font-bold bg-orange-50 text-orange-700 border border-orange-200">
                        {order.vehicleNumber}
                      </span>
                    )}
                  </div>

                  {/* Commodities list with custom modified rates */}
                  <div className="bg-slate-50/80 rounded-2xl p-2.5 text-xs text-slate-600 mb-4 border border-slate-100 space-y-1">
                    {order.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[11px]">
                        <span className="truncate text-slate-700 font-medium">
                          {getLocalizedText(it, 'productName', language)}
                        </span>
                        <span className="font-bold text-slate-900 font-mono shrink-0 ml-2">
                          {it.quantity} {it.unitType === 'OUTER_BAG' ? (isTe ? 'బస్తాలు' : 'Bags') : (isTe ? 'ప్యాకెట్లు' : 'Pcs')} @ ₹{it.unitPrice}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-1">
                    {order.status === 'PENDING_REVIEW' && (currentUser?.role === 'ADMIN' || currentUser?.role === 'OWNER') && (
                      <button
                        onClick={() => approveOrder(order.id, currentUser?.role || 'ADMIN')}
                        className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 px-3 rounded-xl shadow-sm transition-all active:scale-95 text-center min-h-[40px]"
                      >
                        {isTe ? 'ఆమోదించు' : 'Approve'}
                      </button>
                    )}

                    {order.status === 'APPROVED' && (
                      <button
                        onClick={() => markOrderDispatched(order.id)}
                        className="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold py-2.5 px-3 rounded-xl shadow-sm transition-all active:scale-95 text-center min-h-[40px]"
                      >
                        {isTe ? 'రవాణా చేయండి' : 'Dispatch'}
                      </button>
                    )}

                    {order.status === 'DISPATCHED' && (
                      <button
                        onClick={() => markOrderDelivered(order.id)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 px-3 rounded-xl shadow-sm transition-all active:scale-95 text-center min-h-[40px]"
                      >
                        {isTe ? 'డెలివరీ చేయబడింది' : 'Delivered'}
                      </button>
                    )}

                    {order.status === 'DELIVERED' && (
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 py-1 px-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {isTe ? 'పూర్తయింది' : 'Settled'}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => triggerWhatsAppBill(order)}
                    className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                    title={isTe ? 'వాట్సాప్ బిల్లు పంపండి' : 'Send WhatsApp Statement'}
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MOBILE BOTTOM-SHEET / MODAL FOR NEW ORDER */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-2xl w-full p-5 sm:p-7 border border-slate-100 max-h-[92vh] flex flex-col animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-4 duration-200">
            
            {/* Mobile Drag Indicator Bar */}
            <div className="w-12 h-1.5 rounded-full bg-slate-300 mx-auto mb-3 sm:hidden" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                  <Plus className="w-5 h-5 stroke-[3]" />
                </div>
                <h2 className="text-lg font-black text-slate-900">
                  {isTe ? 'కొత్త హోల్‌సేల్ ఆర్డర్ నమోదు' : 'New Wholesale Order'}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 mb-4 rounded-2xl bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200 flex items-center gap-2 shrink-0">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreateOrder} className="space-y-4 overflow-y-auto pr-1">
              
              {/* Customer Selector (Zero auto-fill) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isTe ? 'కస్టమర్ *' : 'Customer *'}
                </label>
                <select
                  required
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-2xl p-3 outline-none focus:border-orange-500 bg-slate-50/50 font-medium min-h-[46px]"
                >
                  <option value="">{isTe ? 'కస్టమర్‌ను ఎంచుకోండి...' : 'Select Customer...'}</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {getLocalizedText(c, 'name', language)} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              {/* DYNAMIC COMMODITY ROWS BUILDER WITH EDITABLE SALE VALUE */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    {isTe ? 'సరుకుల వివరాలు & అమ్మకపు ధరలు' : 'Order Items & Sale Rates'}
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-full border border-orange-200 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>{isTe ? 'సరుకు చేర్చండి' : 'Add Item'}</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {itemRows.map((row, idx) => (
                    <div 
                      key={row.rowId}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 grid grid-cols-12 gap-2 items-center"
                    >
                      {/* Commodity Dropdown */}
                      <div className="col-span-12 sm:col-span-4">
                        <select
                          required
                          value={row.productId}
                          onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                          className="w-full text-xs font-bold border border-slate-300 rounded-xl p-2.5 bg-white outline-none focus:border-orange-500 min-h-[42px]"
                        >
                          <option value="">{isTe ? 'సరుకును ఎంచుకోండి...' : 'Select Commodity...'}</option>
                          {inventory.map((p) => {
                            const avail = p.stockPhysicalOuter - p.stockReservedOuter;
                            return (
                              <option key={p.id} value={p.id}>
                                {getLocalizedText(p, 'name', language)} ({p.outerBagTotalKg}kg - {isTe ? 'స్టాక్:' : 'Avail:'} {avail})
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Unit Type */}
                      <div className="col-span-4 sm:col-span-2">
                        <select
                          value={row.unitType}
                          onChange={(e) => handleItemChange(idx, 'unitType', e.target.value as UnitType)}
                          className="w-full text-xs border border-slate-300 rounded-xl p-2.5 bg-white outline-none focus:border-orange-500 font-semibold min-h-[42px]"
                        >
                          <option value="OUTER_BAG">{isTe ? 'బస్తా' : 'Outer Bag'}</option>
                          <option value="INNER_BAG">{isTe ? 'ప్యాకెట్' : 'Inner Pkt'}</option>
                          <option value="LOOSE_KG">{isTe ? 'కిలో' : 'Loose Kg'}</option>
                        </select>
                      </div>

                      {/* Quantity (Zero auto-fill) */}
                      <div className="col-span-3 sm:col-span-2">
                        <input
                          type="number"
                          min="1"
                          required
                          placeholder={isTe ? 'పరిమాణం' : 'Qty'}
                          value={row.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full text-xs font-bold border border-slate-300 rounded-xl p-2.5 bg-white outline-none focus:border-orange-500 text-center min-h-[42px]"
                        />
                      </div>

                      {/* EDITABLE SALE VALUE / UNIT RATE */}
                      <div className="col-span-3 sm:col-span-2">
                        <input
                          type="number"
                          min="0"
                          required
                          placeholder={isTe ? 'ధర (రూ.)' : 'Rate (₹)'}
                          value={row.unitPrice}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full text-xs font-bold border border-slate-300 rounded-xl p-2.5 bg-white outline-none focus:border-orange-500 text-center font-mono min-h-[42px]"
                        />
                      </div>

                      {/* Rate / Total Preview & Delete */}
                      <div className="col-span-2 sm:col-span-2 flex items-center justify-between gap-1">
                        <div className="text-right w-full">
                          <span className="text-[11px] font-mono font-bold text-slate-800 block">
                            ₹{((Number(row.quantity) || 0) * (Number(row.unitPrice) || 0)).toLocaleString()}
                          </span>
                        </div>
                        {itemRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                            title={isTe ? 'తొలగించండి' : 'Remove row'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tally Summary Bar */}
              <div className="p-3 bg-slate-900 text-white rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-slate-400">{isTe ? 'మొత్తం బస్తాలు: ' : 'Total: '}</span>
                  <span className="font-extrabold text-orange-400">{totalOuterBags} {isTe ? 'బస్తాలు' : 'Bags'}</span>
                  <span className="text-slate-500 ml-1.5 font-mono">({totalWeightKg} kg)</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400">{isTe ? 'సరుకుల మొత్తం: ' : 'Subtotal: '}</span>
                  <span className="font-extrabold text-emerald-400 font-mono">₹{subtotal.toLocaleString()}</span>
                </div>
              </div>

              {/* Hamali, Freight & CUSTOM DISCOUNT (Zero auto-fill) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isTe ? 'హమాలీ (రూ/బస్తా)' : 'Hamali (₹/Bag)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={hamaliPerBag}
                    onChange={(e) => setHamaliPerBag(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-xs border border-slate-300 rounded-xl p-2.5 outline-none focus:border-orange-500 font-medium min-h-[42px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isTe ? 'రవాణా ఖర్చు (రూ.)' : 'Freight (₹)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={transportCharges}
                    onChange={(e) => setTransportCharges(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-xs border border-slate-300 rounded-xl p-2.5 outline-none focus:border-orange-500 font-medium min-h-[42px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-emerald-700 mb-1 flex items-center gap-1">
                    <Percent className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{isTe ? 'డిస్కౌంట్ / తగ్గింపు (రూ.)' : 'Custom Discount (₹)'}</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-xs border border-emerald-300 bg-emerald-50/50 rounded-xl p-2.5 outline-none focus:border-emerald-500 font-bold text-emerald-800 min-h-[42px]"
                  />
                </div>
              </div>

              {/* Vehicle & Driver */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isTe ? 'వాహనం నంబర్' : 'Vehicle Number'}
                  </label>
                  <input
                    type="text"
                    placeholder="TS 09 UA 1234"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-xl p-2.5 outline-none focus:border-orange-500 uppercase font-mono min-h-[42px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isTe ? 'డ్రైవర్ మొబైల్' : 'Driver Mobile'}
                  </label>
                  <input
                    type="tel"
                    placeholder="9988776655"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-xl p-2.5 outline-none focus:border-orange-500 font-mono min-h-[42px]"
                  />
                </div>
              </div>

              {/* Grand Total Bar */}
              <div className="p-3.5 bg-orange-50 border border-orange-200/80 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-orange-950 uppercase tracking-wider block">
                    {isTe ? 'తుది మొత్తం (Grand Total)' : 'Grand Total'}
                  </span>
                  <span className="text-[10px] text-orange-700">
                    {totalOuterBags} {isTe ? 'బస్తాలు' : 'bags'} &bull; {isTe ? 'హమాలీ:' : 'Hamali:'} ₹{totalHamali}
                    {totalDiscount > 0 && ` • ${isTe ? 'తగ్గింపు:' : 'Discount:'} -₹${totalDiscount}`}
                  </span>
                </div>
                <span className="text-xl font-black text-orange-900 font-mono">
                  ₹{grandTotal.toLocaleString()}
                </span>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 pb-1">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-full"
                >
                  {isTe ? 'రద్దు చేయండి' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 text-xs font-black bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white rounded-full shadow-lg shadow-orange-500/25 transition-all active:scale-95 min-h-[44px]"
                >
                  {isTe ? 'ఆర్డర్‌ను నిర్ధారించండి' : 'Confirm & Place Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Universal Alert Dialog Component */}
      <AlertDialog
        isOpen={dialogConfig.isOpen}
        onClose={() => setDialogConfig((prev) => ({ ...prev, isOpen: false }))}
        title={dialogConfig.title}
        message={dialogConfig.message}
        type={dialogConfig.type}
        actionText={dialogConfig.actionText}
        onAction={dialogConfig.onAction}
      />
    </div>
  );
};
