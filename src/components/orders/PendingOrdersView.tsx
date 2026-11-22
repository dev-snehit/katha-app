import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { en } from '../../locales/en';
import { te } from '../../locales/te';
import { getLocalizedText } from '../../lib/bilingualHelper';
import { Order, OrderStatus } from '../../contracts';
import { 
  Truck, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Send, 
  AlertCircle,
  FileText,
  User,
  Phone
} from 'lucide-react';

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
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(10);
  const [hamaliPerBag, setHamaliPerBag] = useState(8);
  const [transportCharges, setTransportCharges] = useState(150);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Status Filter
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === 'ALL') return true;
    return o.status === statusFilter;
  });

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const customer = customers.find((c) => c.id === selectedCustomerId);
    const product = inventory.find((p) => p.id === selectedProductId);

    if (!customer || !product) {
      setErrorMessage('Please select both a customer and a product.');
      return;
    }

    const available = product.stockPhysicalOuter - product.stockReservedOuter;
    if (quantity > available) {
      setErrorMessage(`Insufficient stock: Only ${available} bags available.`);
      return;
    }

    const subtotal = quantity * product.wholesalePriceBag;
    const totalHamali = quantity * hamaliPerBag;
    const grandTotal = subtotal + totalHamali + Number(transportCharges || 0);

    const newOrder: Order = {
      id: crypto.randomUUID ? crypto.randomUUID() : `ord-${Date.now()}`,
      orderNumber: `ORD-${Date.now().toString().slice(-4)}`,
      customerId: customer.id,
      customerName: customer.name,
      customerNameTe: customer.nameTe,
      customerPhone: customer.phone,
      orderDate: new Date().toISOString(),
      status: 'PENDING_REVIEW',
      totalOuterBags: quantity,
      totalInnerBags: 0,
      totalWeightKg: quantity * product.outerBagTotalKg,
      items: [
        {
          productId: product.id,
          productName: product.name,
          productNameTe: product.nameTe,
          unitType: 'OUTER_BAG',
          quantity: quantity,
          unitPrice: product.wholesalePriceBag,
          lineTotal: subtotal,
        }
      ],
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
    setSelectedProductId('');
    setQuantity(10);
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <Clock className="w-3.5 h-3.5" />
            {t.orders.statusPending}
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {t.orders.statusApproved}
          </span>
        );
      case 'DISPATCHED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
            <Truck className="w-3.5 h-3.5" />
            {t.orders.statusDispatched}
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {t.orders.statusDelivered}
          </span>
        );
      default:
        return null;
    }
  };

  const triggerWhatsAppBill = (order: Order) => {
    const text = encodeURIComponent(
      `*KATHA WHOLESALE INVOICE*\n` +
      `Order: ${order.orderNumber}\n` +
      `Customer: ${order.customerName}\n` +
      `Total Bags: ${order.totalOuterBags} Bags (${order.totalWeightKg} kg)\n` +
      `Grand Total: Rs. ${order.grandTotal.toLocaleString()}\n` +
      `Payment Mode: ${order.paymentMode}\n` +
      `Vehicle: ${order.vehicleNumber || 'Store Dispatch'}\n` +
      `Status: ${order.status}\n\n` +
      `Thank you for your business!`
    );
    window.open(`https://wa.me/91${order.customerPhone}?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Orders Yet to Deliver */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold mb-1">
            <Truck className="w-4 h-4" />
            <span>DISPATCH & DELIVERY COMMAND CENTER</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {t.orders.title}
          </h1>
          <p className="text-slate-300 text-sm mt-1 max-w-xl">
            {t.orders.subtitle}
          </p>
        </div>

        <div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-bold px-5 py-3 rounded-xl shadow-md transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            {t.orders.createOrderBtn}
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {['ALL', 'PENDING_REVIEW', 'APPROVED', 'DISPATCHED', 'DELIVERED'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              statusFilter === st
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {st === 'ALL' ? 'All Orders' : st.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Orders List / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOrders.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200">
            <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-slate-600 font-medium">{t.orders.noOrders}</p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-slate-500">
                      {order.orderNumber}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5 line-clamp-1">
                      {getLocalizedText(order, 'customerName', language)}
                    </h3>
                  </div>
                  {getStatusBadge(order.status)}
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" /> Mobile:
                    </span>
                    <span className="font-semibold text-slate-800">{order.customerPhone}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Total Bags:</span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      {order.totalOuterBags} Bags ({order.totalWeightKg} kg)
                    </span>
                  </div>
                  {order.vehicleNumber && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Vehicle:</span>
                      <span className="font-mono font-semibold text-slate-800">{order.vehicleNumber}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 font-semibold">
                    <span className="text-slate-700">Grand Total:</span>
                    <span className="text-sm font-bold text-slate-900">
                      Rs. {order.grandTotal.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Items preview */}
                <div className="text-xs text-slate-600 mb-4">
                  <span className="font-semibold text-slate-700">Commodities:</span>
                  <ul className="mt-1 list-disc list-inside space-y-0.5 text-slate-500">
                    {order.items.map((it, idx) => (
                      <li key={idx} className="line-clamp-1">
                        {getLocalizedText(it, 'productName', language)} ({it.quantity} Bags)
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Buttons based on Role & State */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                {order.status === 'PENDING_REVIEW' && (currentUser.role === 'ADMIN' || currentUser.role === 'OWNER') && (
                  <button
                    onClick={() => approveOrder(order.id, currentUser.role)}
                    className="flex-1 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold py-2 px-3 rounded-lg shadow-sm transition-colors"
                  >
                    {t.orders.approveBtn}
                  </button>
                )}

                {order.status === 'APPROVED' && (
                  <button
                    onClick={() => markOrderDispatched(order.id)}
                    className="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold py-2 px-3 rounded-lg shadow-sm transition-colors"
                  >
                    {t.orders.markDispatched}
                  </button>
                )}

                {order.status === 'DISPATCHED' && (
                  <button
                    onClick={() => markOrderDelivered(order.id)}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 px-3 rounded-lg shadow-sm transition-colors"
                  >
                    {t.orders.markDelivered}
                  </button>
                )}

                {/* 1-Click WhatsApp Trigger */}
                <button
                  onClick={() => triggerWhatsAppBill(order)}
                  className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold py-2 px-3 rounded-lg border border-emerald-200 transition-colors"
                  title="Send Invoice via WhatsApp"
                >
                  <Send className="w-3.5 h-3.5" />
                  WhatsApp
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Order Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-100 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              {t.orders.createOrderBtn}
            </h2>

            {errorMessage && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 text-rose-700 text-xs font-medium border border-rose-200">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleCreateOrder} className="space-y-4">
              {/* Customer Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer (రైతు / దుకాణం) *
                </label>
                <select
                  required
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 outline-none focus:border-brand-500"
                >
                  <option value="">Select Customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {getLocalizedText(c, 'name', language)} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              {/* Product Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Commodity (సరుకు) *
                </label>
                <select
                  required
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 outline-none focus:border-brand-500"
                >
                  <option value="">Select Commodity...</option>
                  {inventory.map((p) => {
                    const avail = p.stockPhysicalOuter - p.stockReservedOuter;
                    return (
                      <option key={p.id} value={p.id}>
                        {getLocalizedText(p, 'name', language)} - {p.outerBagTotalKg}kg Bag (Avail: {avail} Bags)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Quantity (Bags) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quantity (బస్తాల సంఖ్య) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 outline-none focus:border-brand-500"
                />
              </div>

              {/* Hamali & Transport */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hamali (హమాలీ Rs/Bag)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={hamaliPerBag}
                    onChange={(e) => setHamaliPerBag(Number(e.target.value))}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Freight (రవాణా ఖర్చు)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={transportCharges}
                    onChange={(e) => setTransportCharges(Number(e.target.value))}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Vehicle & Driver */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vehicle No (వాహనం నం.)
                  </label>
                  <input
                    type="text"
                    placeholder="TS 09 UA 1234"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Driver Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="9988776655"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white rounded-lg shadow-md transition-colors"
                >
                  Submit Order (సమర్పించు)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
