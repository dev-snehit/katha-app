import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { en } from '../../locales/en';
import { te } from '../../locales/te';
import { getLocalizedText } from '../../lib/bilingualHelper';
import { Order, OrderStatus, OrderItem, UnitType } from '../../contracts';
import { 
  Truck, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Send, 
  Trash2, 
  Phone, 
  Sparkles,
  Inbox,
  AlertTriangle
} from 'lucide-react';

interface FormItemRow {
  rowId: string;
  productId: string;
  unitType: UnitType;
  quantity: number;
  unitPrice: number;
}

export const PendingOrdersView: React.FC = () => {
  const { 
    orders, 
    inventory, 
    customers, 
    currentUser, 
    language, 
    approveOrder, 
    markOrderDispatched, 
    markOrderDelivered,
    addOrder 
  } = useAppStore();

  const t = language === 'TE' ? te : en;
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Order Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [itemRows, setItemRows] = useState<FormItemRow[]>([
    { rowId: 'row-1', productId: '', unitType: 'OUTER_BAG', quantity: 10, unitPrice: 0 }
  ]);
  const [hamaliPerBag, setHamaliPerBag] = useState(8);
  const [transportCharges, setTransportCharges] = useState(150);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Active Pipeline Filter
  const [activePipeline, setActivePipeline] = useState<string>('ALL');

  // Helpers to get 2-letter initials for avatar badge (like OS, RM, KS in inspiration image)
  const getInitials = (name: string) => {
    if (!name) return 'WH';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
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
        productId: inventory.length > 0 ? inventory[0].id : '',
        unitType: 'OUTER_BAG',
        quantity: 10,
        unitPrice: inventory.length > 0 ? inventory[0].wholesalePriceBag : 0,
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

    // Auto-update price when product changes
    if (field === 'productId') {
      const prod = inventory.find((p) => p.id === value);
      if (prod) {
        updated[index].unitPrice = updated[index].unitType === 'OUTER_BAG' 
          ? prod.wholesalePriceBag 
          : prod.pricePerInnerBag;
      }
    }

    // Auto-update price when unitType changes
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
    const lineTotal = (row.quantity || 0) * (row.unitPrice || 0);
    return {
      productId: row.productId,
      productName: prod ? prod.name : 'Commodity',
      productNameTe: prod ? prod.nameTe : '',
      unitType: row.unitType,
      quantity: row.quantity || 0,
      unitPrice: row.unitPrice || 0,
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

  const totalHamali = totalOuterBags * hamaliPerBag;
  const grandTotal = subtotal + totalHamali + Number(transportCharges || 0);

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (inventory.length === 0) {
      setErrorMessage('Please add at least one commodity in the Stock Registry before creating orders.');
      return;
    }

    const customer = customers.find((c) => c.id === selectedCustomerId);
    if (!customer) {
      setErrorMessage('Please select a customer.');
      return;
    }

    if (calculatedItems.length === 0 || calculatedItems.some((it) => !it.productId || it.quantity <= 0)) {
      setErrorMessage('Please complete all commodity rows with valid quantities.');
      return;
    }

    // Check stock availability
    for (const item of calculatedItems) {
      const prod = inventory.find((p) => p.id === item.productId);
      if (prod && item.unitType === 'OUTER_BAG') {
        const available = prod.stockPhysicalOuter - prod.stockReservedOuter;
        if (item.quantity > available) {
          setErrorMessage(`Insufficient stock for ${prod.name}: Only ${available} bags available.`);
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
      transportCharges: Number(transportCharges || 0),
      grandTotal,
      paymentMode: 'CREDIT',
      vehicleNumber,
      driverPhone,
      submittedByRole: currentUser.role,
      createdAt: new Date().toISOString(),
    };

    addOrder(newOrder);
    setIsModalOpen(false);
    // Reset form
    setSelectedCustomerId('');
    setItemRows([{ rowId: 'row-1', productId: inventory[0]?.id || '', unitType: 'OUTER_BAG', quantity: 10, unitPrice: inventory[0]?.wholesalePriceBag || 0 }]);
  };

  const triggerWhatsAppBill = (order: Order) => {
    const text = encodeURIComponent(
      `*KATHA WHOLESALE - INVOICE*\n` +
      `Order: ${order.orderNumber}\n` +
      `Customer: ${order.customerName}\n` +
      `Total Bags: ${order.totalOuterBags} Bags (${order.totalWeightKg} kg)\n` +
      `Grand Total: Rs. ${order.grandTotal.toLocaleString()}\n` +
      `Status: ${order.status}\n\n` +
      `Thank you for your business!`
    );
    window.open(`https://wa.me/91${order.customerPhone}?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Order Pipeline
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-900 text-white">
              {orders.length} orders
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Total active pipeline value: <span className="font-bold text-slate-700">Rs. {totalPipelineValue.toLocaleString()}</span>
          </p>
        </div>

        {/* Primary Action Button (Matching Inspiration Coral Pill Style) */}
        <div>
          <button
            onClick={() => {
              if (inventory.length === 0) {
                alert('Please add commodities in the Stock Registry first before placing an order.');
                return;
              }
              if (customers.length === 0) {
                alert('Please add at least one customer in the Customers tab first.');
                return;
              }
              setIsModalOpen(true);
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 via-orange-600 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-black text-sm px-6 py-3 rounded-full shadow-lg shadow-orange-500/25 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ New Order (కొత్త ఆర్డర్)</span>
          </button>
        </div>
      </div>

      {/* Multi-Segment Color Pipeline Strip (Exact Inspiration Design) */}
      <div className="space-y-2">
        <div className="grid grid-cols-4 gap-1.5 h-2 w-full rounded-full overflow-hidden bg-slate-200/60 p-0.5">
          <div className="bg-blue-500 rounded-full h-full" title="Pending Review" />
          <div className="bg-amber-500 rounded-full h-full" title="Approved & Packing" />
          <div className="bg-purple-500 rounded-full h-full" title="Out for Delivery" />
          <div className="bg-emerald-500 rounded-full h-full" title="Delivered & Settled" />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setActivePipeline('ALL')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              activePipeline === 'ALL'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            All Orders ({orders.length})
          </button>

          <button
            onClick={() => setActivePipeline('PENDING_REVIEW')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              activePipeline === 'PENDING_REVIEW'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-blue-700 hover:bg-blue-50 border border-blue-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Pending Review ({pendingOrders.length})
          </button>

          <button
            onClick={() => setActivePipeline('APPROVED')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              activePipeline === 'APPROVED'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-white text-amber-700 hover:bg-amber-50 border border-amber-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Packing ({approvedOrders.length})
          </button>

          <button
            onClick={() => setActivePipeline('DISPATCHED')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              activePipeline === 'DISPATCHED'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-white text-purple-700 hover:bg-purple-50 border border-purple-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            In Transit ({dispatchedOrders.length})
          </button>

          <button
            onClick={() => setActivePipeline('DELIVERED')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              activePipeline === 'DELIVERED'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Delivered ({deliveredOrders.length})
          </button>
        </div>
      </div>

      {/* Orders Grid / Mobile Card View */}
      {filteredOrders.length === 0 ? (
        <div className="card-soft p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-3xl bg-orange-50 text-orange-500 flex items-center justify-center mb-4">
            <Inbox className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {orders.length === 0 ? 'No orders recorded yet' : 'No orders in this pipeline stage'}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            {orders.length === 0 
              ? 'Your order book is clean. Tap "+ New Order" to start recording wholesale dispatches.' 
              : 'Switch filter tabs above to view orders in other operational stages.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const initials = getInitials(order.customerName);
            const avatarColor = getAvatarColor(order.customerName);

            return (
              <div
                key={order.id}
                className="card-soft p-5 flex flex-col justify-between hover:border-orange-400 transition-all group"
              >
                <div>
                  {/* Card Header: Initials Avatar + Name + Amount */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center font-black text-xs shrink-0 ${avatarColor}`}>
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
                        Rs. {order.grandTotal.toLocaleString()}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {order.paymentMode}
                      </span>
                    </div>
                  </div>

                  {/* Bags & Weight Badge */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700">
                      {order.totalOuterBags} Bags
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

                  {/* Commodities list */}
                  <div className="bg-slate-50/80 rounded-xl p-2.5 text-xs text-slate-600 mb-4 border border-slate-100 space-y-1">
                    {order.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[11px]">
                        <span className="truncate text-slate-700 font-medium">
                          {getLocalizedText(it, 'productName', language)}
                        </span>
                        <span className="font-bold text-slate-900 font-mono shrink-0 ml-2">
                          {it.quantity} {it.unitType === 'OUTER_BAG' ? 'Bags' : 'Pcs'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-1">
                    {order.status === 'PENDING_REVIEW' && (currentUser.role === 'ADMIN' || currentUser.role === 'OWNER') && (
                      <button
                        onClick={() => approveOrder(order.id, currentUser.role)}
                        className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2 px-3 rounded-xl shadow-sm transition-all active:scale-95 text-center"
                      >
                        Approve (ఆమోదించు)
                      </button>
                    )}

                    {order.status === 'APPROVED' && (
                      <button
                        onClick={() => markOrderDispatched(order.id)}
                        className="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold py-2 px-3 rounded-xl shadow-sm transition-all active:scale-95 text-center"
                      >
                        Dispatch (రవాణా)
                      </button>
                    )}

                    {order.status === 'DISPATCHED' && (
                      <button
                        onClick={() => markOrderDelivered(order.id)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 px-3 rounded-xl shadow-sm transition-all active:scale-95 text-center"
                      >
                        Delivered (డెలివరీ)
                      </button>
                    )}

                    {order.status === 'DELIVERED' && (
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 py-1 px-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Settled
                      </span>
                    )}
                  </div>

                  {/* 1-Click WhatsApp Trigger */}
                  <button
                    onClick={() => triggerWhatsAppBill(order)}
                    className="p-2 text-emerald-700 hover:bg-emerald-50 rounded-xl border border-emerald-200 transition-colors shrink-0"
                    title="Send WhatsApp Invoice"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DYNAMIC MULTI-ITEM ORDER MODAL (with '+' Button) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-5 sm:p-7 border border-slate-100 max-h-[92vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                  <Plus className="w-5 h-5 stroke-[3]" />
                </div>
                <h2 className="text-lg font-black text-slate-900">
                  New Wholesale Order (కొత్త ఆర్డర్)
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 mb-4 rounded-2xl bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreateOrder} className="space-y-5">
              
              {/* Customer Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Customer (రైతు / దుకాణం) *
                </label>
                <select
                  required
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-xl p-3 outline-none focus:border-orange-500 bg-slate-50/50 font-medium"
                >
                  <option value="">Select Customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {getLocalizedText(c, 'name', language)} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              {/* DYNAMIC COMMODITY ROWS BUILDER */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    Order Items (సరుకులు)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-full border border-orange-200 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>+ Add Item (మరో సరుకు చేర్చు)</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {itemRows.map((row, idx) => (
                    <div 
                      key={row.rowId}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 grid grid-cols-12 gap-2.5 items-center"
                    >
                      {/* Commodity Dropdown */}
                      <div className="col-span-12 sm:col-span-5">
                        <select
                          required
                          value={row.productId}
                          onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                          className="w-full text-xs font-bold border border-slate-300 rounded-xl p-2.5 bg-white outline-none focus:border-orange-500"
                        >
                          <option value="">Select Commodity...</option>
                          {inventory.map((p) => {
                            const avail = p.stockPhysicalOuter - p.stockReservedOuter;
                            return (
                              <option key={p.id} value={p.id}>
                                {getLocalizedText(p, 'name', language)} ({p.outerBagTotalKg}kg - Avail: {avail})
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Unit Type */}
                      <div className="col-span-4 sm:col-span-3">
                        <select
                          value={row.unitType}
                          onChange={(e) => handleItemChange(idx, 'unitType', e.target.value)}
                          className="w-full text-xs border border-slate-300 rounded-xl p-2.5 bg-white outline-none focus:border-orange-500 font-semibold"
                        >
                          <option value="OUTER_BAG">Outer Bag</option>
                          <option value="INNER_BAG">Inner Pkt</option>
                          <option value="LOOSE_KG">Loose Kg</option>
                        </select>
                      </div>

                      {/* Quantity */}
                      <div className="col-span-3 sm:col-span-2">
                        <input
                          type="number"
                          min="1"
                          required
                          placeholder="Qty"
                          value={row.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                          className="w-full text-xs font-bold border border-slate-300 rounded-xl p-2.5 bg-white outline-none focus:border-orange-500 text-center"
                        />
                      </div>

                      {/* Rate / Total Preview */}
                      <div className="col-span-4 sm:col-span-2 flex items-center justify-between gap-1">
                        <div className="text-right w-full">
                          <span className="text-[11px] font-mono font-bold text-slate-800 block">
                            Rs. {(row.quantity * row.unitPrice).toLocaleString()}
                          </span>
                        </div>
                        {itemRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Remove row"
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
              <div className="p-3.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-slate-400">Total Bags: </span>
                  <span className="font-extrabold text-orange-400">{totalOuterBags} Bags</span>
                  <span className="text-slate-500 ml-2">({totalWeightKg} kg)</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400">Items Subtotal: </span>
                  <span className="font-extrabold text-emerald-400 font-mono">Rs. {subtotal.toLocaleString()}</span>
                </div>
              </div>

              {/* Hamali & Transport */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hamali (హమాలీ Rs/Bag)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={hamaliPerBag}
                    onChange={(e) => setHamaliPerBag(Number(e.target.value))}
                    className="w-full text-xs border border-slate-300 rounded-xl p-2.5 outline-none focus:border-orange-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Freight (రవాణా ఖర్చు Rs.)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={transportCharges}
                    onChange={(e) => setTransportCharges(Number(e.target.value))}
                    className="w-full text-xs border border-slate-300 rounded-xl p-2.5 outline-none focus:border-orange-500 font-medium"
                  />
                </div>
              </div>

              {/* Vehicle & Driver */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Vehicle Number (వాహనం)
                  </label>
                  <input
                    type="text"
                    placeholder="TS 09 UA 1234"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-xl p-2.5 outline-none focus:border-orange-500 uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Driver Mobile
                  </label>
                  <input
                    type="tel"
                    placeholder="9988776655"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-xl p-2.5 outline-none focus:border-orange-500 font-mono"
                  />
                </div>
              </div>

              {/* Grand Total Bar */}
              <div className="p-4 bg-orange-50 border border-orange-200/80 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-orange-950 uppercase tracking-wider block">
                    Grand Total
                  </span>
                  <span className="text-[11px] text-orange-700">
                    Includes {totalOuterBags} bags &bull; Hamali Rs. {totalHamali} &bull; Freight Rs. {transportCharges}
                  </span>
                </div>
                <span className="text-xl font-black text-orange-900 font-mono">
                  Rs. {grandTotal.toLocaleString()}
                </span>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-full"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-7 py-3 text-xs font-black bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white rounded-full shadow-lg shadow-orange-500/25 transition-all active:scale-95"
                >
                  Confirm & Submit Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
