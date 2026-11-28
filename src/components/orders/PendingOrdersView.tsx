import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { en } from '../../locales/en';
import { te } from '../../locales/te';
import { getLocalizedText } from '../../lib/bilingualHelper';
import { Order, OrderItem, PaymentMode, UnitType, WALK_IN_CUSTOMER_ID, Customer } from '../../contracts';
import { AlertDialog, DialogType } from '../ui/AlertDialog';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import { useRouter } from '../../lib/router';
import { 
  Plus, 
  Trash2, 
  AlertTriangle, 
  Share2, 
  CheckCircle2, 
  Inbox,
  Percent,
  Pencil,
  Layers
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
    updateOrder, 
    deleteOrder,
    approveOrder, 
    markOrderDispatched, 
    markOrderDelivered,
    startActionLoading,
    stopActionLoading,
    hasFunctionalityAccess 
  } = useAppStore();

  const { route, navigate } = useRouter();

  const isAdminOrOwner = currentUser?.role === 'ADMIN' || currentUser?.role === 'OWNER';
  const t = language === 'TE' ? te : en;
  const isTe = language === 'TE';

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  // Synchronize modal state with URL route (e.g. /orders/new, /orders/:id)
  useEffect(() => {
    if (route.view !== 'orders') {
      setIsModalOpen(false);
      setEditingOrder(null);
      return;
    }

    if (route.subView === 'new') {
      setEditingOrder(null);
      setSelectedCustomerId('');
      setOrderDate(todayStr);
      setItemRows([{ rowId: 'row-1', productId: '', unitType: 'OUTER_BAG', quantity: '', unitPrice: '' }]);
      setHamaliPerBag('');
      setTransportCharges('');
      setDiscount('');
      setVehicleNumber('');
      setDriverPhone('');
      setErrorMessage('');
      setIsModalOpen(true);
    } else if (route.subView === 'edit' && route.paramId) {
      const order = orders.find((o) => o.id === route.paramId || o.orderNumber === route.paramId);
      if (order) {
        setEditingOrder(order);
        setSelectedCustomerId(order.customerId);
        setOrderDate(order.orderDate ? order.orderDate.slice(0, 10) : todayStr);
        if (order.items && order.items.length > 0) {
          setItemRows(
            order.items.map((it, idx) => ({
              rowId: `row-${idx + 1}-${Date.now()}`,
              productId: it.productId,
              unitType: it.unitType,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
            }))
          );
        } else {
          setItemRows([{ rowId: 'row-1', productId: '', unitType: 'OUTER_BAG', quantity: '', unitPrice: '' }]);
        }
        const hamaliPer = order.totalOuterBags > 0 ? (order.hamaliCharges || 0) / order.totalOuterBags : '';
        setHamaliPerBag(hamaliPer !== '' && !isNaN(Number(hamaliPer)) ? Number(hamaliPer) : '');
        setTransportCharges(order.transportCharges || '');
        setDiscount(order.discount || '');
        setVehicleNumber(order.vehicleNumber || '');
        setDriverPhone(order.driverPhone || '');
        setErrorMessage('');
        setIsModalOpen(true);
      } else {
        setIsModalOpen(false);
        setEditingOrder(null);
      }
    } else {
      setIsModalOpen(false);
      setEditingOrder(null);
    }
  }, [route.view, route.subView, route.paramId, orders]);

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingOrder(null);
    setSelectedCustomerId('');
    setItemRows([{ rowId: 'row-1', productId: '', unitType: 'OUTER_BAG', quantity: '', unitPrice: '' }]);
    setHamaliPerBag('');
    setTransportCharges('');
    setDiscount('');
    setVehicleNumber('');
    setDriverPhone('');
    setErrorMessage('');
    if (route.view === 'orders' && route.subView) {
      navigate('/orders');
    }
  };

  useModalDismiss(isModalOpen, closeModal);

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
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [orderDate, setOrderDate] = useState(todayStr);
  const [itemRows, setItemRows] = useState<FormItemRow[]>([
    { rowId: 'row-1', productId: '', unitType: 'OUTER_BAG', quantity: '', unitPrice: '' }
  ]);
  const [hamaliPerBag, setHamaliPerBag] = useState<number | ''>('');
  const [transportCharges, setTransportCharges] = useState<number | ''>('');
  const [discount, setDiscount] = useState<number | ''>(''); // Custom discount
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Active Pipeline Filter, Search & Sort
  const [activePipeline, setActivePipeline] = useState<string>('ALL');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderSort, setOrderSort] = useState<'DATE_DESC' | 'AMOUNT_DESC' | 'AMOUNT_ASC' | 'BAGS_DESC'>('DATE_DESC');

  // Delivery Payment Mode Completion Modal State
  const [completingOrder, setCompletingOrder] = useState<Order | null>(null);
  const [completionPaymentMode, setCompletionPaymentMode] = useState<PaymentMode>('CASH');

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

  // Pipeline Metrics (Simplified 3-Stage Pipeline: Pending -> Approved -> Delivered)
  const pendingOrders = orders.filter((o) => o.status === 'PENDING_REVIEW');
  const approvedOrders = orders.filter((o) => o.status === 'APPROVED' || o.status === 'DISPATCHED');
  const deliveredOrders = orders.filter((o) => o.status === 'DELIVERED');

  const filteredOrders = orders
    .filter((o) => {
      if (activePipeline === 'PENDING_REVIEW' && o.status !== 'PENDING_REVIEW') return false;
      if (activePipeline === 'APPROVED' && o.status !== 'APPROVED' && o.status !== 'DISPATCHED') return false;
      if (activePipeline === 'DELIVERED' && o.status !== 'DELIVERED') return false;
      if (orderSearch.trim()) {
        const q = orderSearch.trim().toLowerCase();
        return (
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          (o.customerPhone || '').includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (orderSort === 'AMOUNT_DESC') return b.grandTotal - a.grandTotal;
      if (orderSort === 'AMOUNT_ASC') return a.grandTotal - b.grandTotal;
      if (orderSort === 'BAGS_DESC') return b.totalOuterBags - a.totalOuterBags;
      return new Date(b.createdAt || b.orderDate).getTime() - new Date(a.createdAt || a.orderDate).getTime();
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

  // Check if multiple rows share the same commodity (productId) and unitType
  const hasDuplicateItemTypes = React.useMemo(() => {
    const seen = new Set<string>();
    for (const row of itemRows) {
      if (row.productId) {
        const key = `${row.productId}_${row.unitType}`;
        if (seen.has(key)) return true;
        seen.add(key);
      }
    }
    return false;
  }, [itemRows]);

  // Consolidate identical items sharing the same commodity and unit type
  const handleCombineDuplicateItems = () => {
    const combinedMap = new Map<string, FormItemRow>();
    const orderKeys: string[] = [];

    for (const row of itemRows) {
      if (!row.productId) {
        orderKeys.push(row.rowId);
        combinedMap.set(row.rowId, { ...row });
        continue;
      }

      const key = `${row.productId}_${row.unitType}`;
      const existing = combinedMap.get(key);

      if (!existing) {
        orderKeys.push(key);
        combinedMap.set(key, { ...row });
      } else {
        const prevQty = Number(existing.quantity) || 0;
        const currQty = Number(row.quantity) || 0;
        const combinedQty = prevQty + currQty;

        const prevPrice = Number(existing.unitPrice) || 0;
        const currPrice = Number(row.unitPrice) || 0;

        // Weighted unit price or preserve identical unit price
        const weightedPrice = combinedQty > 0
          ? Math.round(((prevQty * prevPrice + currQty * currPrice) / combinedQty) * 100) / 100
          : (currPrice || prevPrice);

        combinedMap.set(key, {
          ...existing,
          quantity: combinedQty > 0 ? combinedQty : '',
          unitPrice: weightedPrice > 0 ? weightedPrice : (existing.unitPrice || row.unitPrice),
        });
      }
    }

    const mergedRows = orderKeys.map((k) => combinedMap.get(k)!);
    setItemRows(mergedRows);
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
      category: prod?.category || '',
      categoryTe: prod?.categoryTe || '',
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

  const handleOpenEditOrder = (order: Order) => {
    navigate(`/orders/${encodeURIComponent(order.id)}`);
  };

  const handleOpenNewOrder = () => {
    if (inventory.length === 0) {
      showDialog(
        isTe ? 'సరుకుల స్టాక్ ఖాళీగా ఉంది' : 'Stock Registry Empty',
        isTe 
          ? 'ఆర్డర్ నమోదు చేయడానికి ముందు దయచేసి స్టాక్ రిజిస్ట్రీలో సరుకులను చేర్చండి.'
          : 'You have not added any commodities yet. Please add Rice or Flour bags in the Stock Registry before placing an order.',
        'warning',
        isTe ? 'సరుకులను చేర్చండి' : 'Add Commodities Now',
        () => navigate('/stock/new')
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
        () => navigate('/customers/new')
      );
      return;
    }

    setErrorMessage('');
    navigate('/orders/new');
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const walkInFallback: Customer = {
      id: WALK_IN_CUSTOMER_ID,
      name: 'Walk-In Customer',
      nameTe: 'వాక్-ఇన్ కస్టమర్',
      phone: '0000000000',
      currentDue: 0,
      createdAt: new Date().toISOString(),
    };
    const selectableCustomers = customers.some((c) => c.id === WALK_IN_CUSTOMER_ID)
      ? customers
      : [walkInFallback, ...customers];
    const customer = selectableCustomers.find((c) => c.id === selectedCustomerId);
    if (!customer) {
      setErrorMessage(isTe ? 'దయచేసి ఒక కస్టమర్‌ను ఎంచుకోండి.' : 'Please select a customer.');
      return;
    }

    if (calculatedItems.length === 0 || calculatedItems.some((it) => !it.productId || it.quantity <= 0)) {
      setErrorMessage(isTe ? 'దయచేసి అన్ని సరుకుల వరుసలలో సరైన పరిమాణాలను నమోదు చేయండి.' : 'Please complete all commodity rows with valid quantities.');
      return;
    }

    // Automatically consolidate multiple items sharing the same productId and unitType
    const consolidatedMap = new Map<string, OrderItem>();
    for (const it of calculatedItems) {
      if (!it.productId) continue;
      const key = `${it.productId}_${it.unitType}`;
      const existing = consolidatedMap.get(key);
      if (!existing) {
        consolidatedMap.set(key, { ...it });
      } else {
        const combinedQty = existing.quantity + it.quantity;
        const combinedTotal = existing.lineTotal + it.lineTotal;
        const combinedPrice = combinedQty > 0
          ? Math.round((combinedTotal / combinedQty) * 100) / 100
          : existing.unitPrice;
        consolidatedMap.set(key, {
          ...existing,
          quantity: combinedQty,
          unitPrice: combinedPrice,
          lineTotal: combinedTotal,
        });
      }
    }
    const finalItems = Array.from(consolidatedMap.values());

    const finalSubtotal = finalItems.reduce((sum, it) => sum + it.lineTotal, 0);
    const finalTotalOuterBags = finalItems
      .filter((it) => it.unitType === 'OUTER_BAG')
      .reduce((sum, it) => sum + it.quantity, 0);
    const finalTotalInnerBags = finalItems
      .filter((it) => it.unitType === 'INNER_BAG')
      .reduce((sum, it) => sum + it.quantity, 0);

    const finalTotalWeightKg = finalItems.reduce((sum, it) => {
      const prod = inventory.find((p) => p.id === it.productId);
      if (!prod) return sum;
      if (it.unitType === 'OUTER_BAG') return sum + it.quantity * prod.outerBagTotalKg;
      if (it.unitType === 'INNER_BAG') return sum + it.quantity * prod.innerBagWeightKg;
      return sum + it.quantity;
    }, 0);

    const finalTotalHamali = finalTotalOuterBags * (Number(hamaliPerBag) || 0);
    const finalGrandTotal = Math.max(0, finalSubtotal + finalTotalHamali + totalFreight - totalDiscount);

    // Check stock availability
    for (const item of finalItems) {
      const prod = inventory.find((p) => p.id === item.productId);
      if (prod && item.unitType === 'OUTER_BAG') {
        const prevItem = editingOrder ? editingOrder.items.find((it) => it.productId === item.productId && it.unitType === 'OUTER_BAG') : null;
        const prevQty = prevItem ? prevItem.quantity : 0;
        const available = prod.stockPhysicalOuter - prod.stockReservedOuter + prevQty;
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

    if (editingOrder) {
      const updatedOrder: Order = {
        ...editingOrder,
        customerId: customer.id,
        customerName: customer.name,
        customerNameTe: customer.nameTe,
        customerPhone: customer.phone,
        orderDate: orderDate ? new Date(`${orderDate}T12:00:00`).toISOString() : editingOrder.orderDate,
        totalOuterBags: finalTotalOuterBags,
        totalInnerBags: finalTotalInnerBags,
        totalWeightKg: finalTotalWeightKg,
        items: finalItems,
        subtotal: finalSubtotal,
        hamaliCharges: finalTotalHamali,
        transportCharges: totalFreight,
        discount: totalDiscount,
        grandTotal: finalGrandTotal,
        vehicleNumber,
        driverPhone,
      };

      setDialogConfig({
        isOpen: true,
        type: 'warning',
        title: isTe ? 'ఆర్డర్ మార్పులను సేవ్ చేయాలా?' : 'Update Order Details?',
        message: isTe
          ? `మీరు "${editingOrder.orderNumber}" ఆర్డర్‌ను సవరించి మార్పులను డేటాబేస్‌లో సేవ్ చేయాలనుకుంటున్నారా?`
          : `Are you sure you want to update order "${editingOrder.orderNumber}" and sync changes to the database?`,
        actionText: isTe ? 'అవును, సేవ్ చేయి' : 'Yes, Save Changes',
        onAction: async () => {
          startActionLoading(
            `Updating order "${editingOrder.orderNumber}" in database...`,
            `డేటాబేస్‌లో "${editingOrder.orderNumber}" ఆర్డర్ వివరాలు సేవ్ అవుతున్నాయి...`
          );
          await updateOrder(updatedOrder);
          stopActionLoading();
          closeModal();
        }
      });
      return;
    } else {
      const newOrder: Order = {
        id: crypto.randomUUID ? crypto.randomUUID() : `ord-${Date.now()}`,
        orderNumber: `ORD-${Date.now().toString().slice(-4)}`,
        customerId: customer.id,
        customerName: customer.name,
        customerNameTe: customer.nameTe,
        customerPhone: customer.phone,
        orderDate: orderDate ? new Date(`${orderDate}T12:00:00`).toISOString() : new Date().toISOString(),
        status: 'PENDING_REVIEW',
        totalOuterBags: finalTotalOuterBags,
        totalInnerBags: finalTotalInnerBags,
        totalWeightKg: finalTotalWeightKg,
        items: finalItems,
        subtotal: finalSubtotal,
        hamaliCharges: finalTotalHamali,
        transportCharges: totalFreight,
        discount: totalDiscount,
        grandTotal: finalGrandTotal,
        paymentMode: 'CREDIT',
        vehicleNumber,
        driverPhone,
        submittedByRole: currentUser?.role || 'STAFF',
        createdAt: new Date().toISOString(),
      };
      startActionLoading(
        `Placing order "${newOrder.orderNumber}" and reserving stock...`,
        `"${newOrder.orderNumber}" ఆర్డర్ నమోదు అవుతోంది మరియు స్టాక్ రిజర్వ్ చేయబడుతోంది...`
      );
      addOrder(newOrder);
      stopActionLoading();
      closeModal();
    }
  };

  const handleDeleteOrder = (order: Order) => {
    setDialogConfig({
      isOpen: true,
      type: 'danger',
      title: isTe ? 'ఆర్డర్‌ను తొలగించాలా?' : 'Delete Order?',
      message: isTe
        ? `మీరు "${order.orderNumber}" ఆర్డర్‌ను ఖచ్చితంగా తొలగించాలనుకుంటున్నారా? ఈ ఆర్డర్ కోసం రిజర్వ్ చేసిన సరుకు తిరిగి గోడౌన్ స్టాక్‌లోకి విడుదల చేయబడుతుంది.`
        : `Are you sure you want to delete order "${order.orderNumber}"? All reserved stock will be safely released back to active godown inventory.`,
      actionText: isTe ? 'అవును, తొలగించు' : 'Yes, Delete Order',
      onAction: async () => {
        startActionLoading(
          `Deleting order "${order.orderNumber}" and restoring inventory...`,
          `ఆర్డర్ "${order.orderNumber}" తొలగించబడుతోంది మరియు స్టాక్ పునరుద్ధరించబడుతోంది...`
        );
        await deleteOrder(order.id);
        stopActionLoading();
        if (isModalOpen) closeModal();
      }
    });
  };

  const handleApproveOrder = (order: Order) => {
    setDialogConfig({
      isOpen: true,
      type: 'warning',
      title: isTe ? 'ఆర్డర్‌ను ఆమోదించాలా?' : 'Approve Order?',
      message: isTe
        ? `మీరు "${order.orderNumber}" ఆర్డర్‌ను ఆమోదించి రవాణా పైప్‌లైన్‌కు పంపించాలనుకుంటున్నారా?`
        : `Are you sure you want to approve order "${order.orderNumber}" and move it to the dispatch queue?`,
      actionText: isTe ? 'అవును, ఆమోదించు' : 'Yes, Approve Order',
      onAction: async () => {
        startActionLoading(
          `Approving order "${order.orderNumber}" in database...`,
          `డేటాబేస్‌లో "${order.orderNumber}" ఆర్డర్ ఆమోదించబడుతోంది...`
        );
        await approveOrder(order.id, currentUser?.role || 'ADMIN');
        stopActionLoading();
      }
    });
  };

  const handleDispatchOrder = (order: Order) => {
    setDialogConfig({
      isOpen: true,
      type: 'warning',
      title: isTe ? 'ఆర్డర్‌ను రవాణా చేయాలా?' : 'Mark Order Dispatched?',
      message: isTe
        ? `మీరు "${order.orderNumber}" ఆర్డర్ లోడింగ్ పూర్తి చేసి వాహనాన్ని డెలివరీకి పంపించాలనుకుంటున్నారా?`
        : `Are you sure you want to mark order "${order.orderNumber}" as dispatched for delivery?`,
      actionText: isTe ? 'అవును, రవాణా చేయి' : 'Yes, Mark Dispatched',
      onAction: async () => {
        startActionLoading(
          `Marking order "${order.orderNumber}" as dispatched...`,
          `"${order.orderNumber}" ఆర్డర్ రవాణా చేయబడినట్లుగా నమోదు అవుతోంది...`
        );
        await markOrderDispatched(order.id);
        stopActionLoading();
      }
    });
  };

  const handleDeliverOrder = (order: Order) => {
    setCompletionPaymentMode(order.paymentMode || 'CASH');
    setCompletingOrder(order);
  };

  const confirmCompleteDelivery = async () => {
    if (!completingOrder) return;
    const target = completingOrder;
    setCompletingOrder(null);
    startActionLoading(
      `Finalizing delivery for "${target.orderNumber}"...`,
      `"${target.orderNumber}" ఆర్డర్ డెలివరీ పూర్తయినట్లు నమోదు అవుతోంది...`
    );
    await markOrderDelivered(target.id, completionPaymentMode);
    stopActionLoading();
  };

  const triggerWhatsAppBill = (order: Order) => {
    const text = encodeURIComponent(
      `*KAATHA WHOLESALE - INVOICE*\n` +
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
        {hasFunctionalityAccess('orders_page', 'create_order') && (
          <div>
            <button
              onClick={handleOpenNewOrder}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 via-orange-600 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-black text-sm px-6 py-3.5 sm:py-3 rounded-full shadow-lg shadow-orange-500/25 transition-all active:scale-95 min-h-[48px]"
            >
              <Plus className="w-5 h-5 stroke-[3]" />
              <span>{isTe ? 'కొత్త ఆర్డర్' : 'New Order'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Multi-Segment 3-Stage Color Pipeline Strip */}
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-1.5 h-2 w-full rounded-full overflow-hidden bg-slate-200/60 p-0.5">
          <div className="bg-blue-500 rounded-full h-full" title={isTe ? 'పెండింగ్' : 'Pending'} />
          <div className="bg-amber-500 rounded-full h-full" title={isTe ? 'ఆమోదించబడింది' : 'Approved'} />
          <div className="bg-emerald-500 rounded-full h-full" title={isTe ? 'డెలివరీ పూర్తయింది' : 'Delivered'} />
        </div>

        {/* Filter Pills + Search & Sort */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
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
              {isTe ? `పెండింగ్ (${pendingOrders.length})` : `Pending (${pendingOrders.length})`}
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
              {isTe ? `ఆమోదించబడినవి (${approvedOrders.length})` : `Approved (${approvedOrders.length})`}
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
              {isTe ? `డెలివరీ అయినవి (${deliveredOrders.length})` : `Delivered (${deliveredOrders.length})`}
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <input
              type="text"
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              placeholder={isTe ? 'ఆర్డర్ / కస్టమర్ శోధన...' : 'Search order / customer...'}
              className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white outline-none focus:border-orange-500 w-44 sm:w-48"
            />
            <select
              aria-label={isTe ? 'క్రమబద్ధీకరణ' : 'Sort orders'}
              value={orderSort}
              onChange={(e) => setOrderSort(e.target.value as any)}
              className="text-xs font-semibold border border-slate-200 rounded-xl px-2.5 py-2 bg-white outline-none focus:border-orange-500 text-slate-700"
            >
              <option value="DATE_DESC">{isTe ? 'కొత్తవి ముందు' : 'Newest First'}</option>
              <option value="AMOUNT_DESC">{isTe ? 'మొత్తం (ఎక్కువ-తక్కువ)' : 'Amount: High → Low'}</option>
              <option value="AMOUNT_ASC">{isTe ? 'మొత్తం (తక్కువ-ఎక్కువ)' : 'Amount: Low → High'}</option>
              <option value="BAGS_DESC">{isTe ? 'బస్తాలు (ఎక్కువ-తక్కువ)' : 'Bags: High → Low'}</option>
            </select>
          </div>
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
                  {/* Card Header: Initials Avatar + Name + Status + Amount */}
                  <div className="flex items-start justify-between gap-2.5 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center font-black text-xs shrink-0 ${avatarColor}`}>
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-900 truncate">
                            {getLocalizedText(order, 'customerName', language)}
                          </h4>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            order.status === 'DELIVERED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : order.status === 'APPROVED' || order.status === 'DISPATCHED'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {order.status === 'DELIVERED'
                              ? (isTe ? 'డెలివరీ' : 'Delivered')
                              : order.status === 'APPROVED' || order.status === 'DISPATCHED'
                              ? (isTe ? 'ఆమోదించబడింది' : 'Approved')
                              : (isTe ? 'పెండింగ్' : 'Pending')}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                          {order.orderNumber}
                          {order.customerPhone ? ` • ${order.customerPhone}` : ''}
                          {order.orderDate ? ` • ${String(order.orderDate).slice(0, 10)}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-base font-black text-slate-900 font-mono">
                        ₹{(order.grandTotal || 0).toLocaleString()}
                      </div>
                      {order.discount && order.discount > 0 ? (
                        <span className="text-[10px] font-extrabold text-emerald-600 block">
                          -₹{order.discount.toLocaleString()} {isTe ? 'తగ్గింపు' : 'off'}
                        </span>
                      ) : null}
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 uppercase">
                        {order.paymentMode || 'CREDIT'}
                      </span>
                    </div>
                  </div>

                  {/* Bags, Weight & Item Count Badges */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700">
                      {order.totalOuterBags} {isTe ? 'బస్తాలు' : 'Bags'}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100/70 text-slate-600 font-mono">
                      {order.totalWeightKg || 0} kg
                    </span>
                    {order.items.length > 0 && (
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200/70">
                        {order.items.length} {isTe ? 'రకాలు' : (order.items.length === 1 ? 'Item' : 'Items')}
                      </span>
                    )}
                    {order.vehicleNumber && (
                      <span className="px-2 py-1 rounded-lg text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {order.vehicleNumber}
                      </span>
                    )}
                  </div>

                  {/* Commodities list with Category + Rates (never empty grey box) */}
                  <div className="bg-slate-50/90 rounded-2xl p-3 text-xs text-slate-600 mb-4 border border-slate-200/60 space-y-1.5">
                    {order.items.length > 0 ? (
                      order.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[11px] gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="truncate text-slate-800 font-semibold">
                              {getLocalizedText(it, 'productName', language)}
                            </span>
                            {(it.category || it.categoryTe) && (
                              <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[9px] font-bold text-slate-500 shrink-0">
                                {isTe ? (it.categoryTe || it.category) : it.category}
                              </span>
                            )}
                          </div>
                          <span className="font-bold text-slate-900 font-mono shrink-0">
                            {it.quantity} {it.unitType === 'OUTER_BAG' ? (isTe ? 'బస్తాలు' : 'Bags') : (isTe ? 'ప్యాకెట్లు' : 'Pcs')} × ₹{it.unitPrice}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="flex justify-between items-center text-[11px] text-slate-500">
                        <span>{isTe ? 'మొత్తం సరుకు సారాంశం' : 'Order Summary'}</span>
                        <span className="font-mono font-bold text-slate-700">
                          {order.totalOuterBags} {isTe ? 'బస్తాలు' : 'Bags'} • ₹{(order.grandTotal || 0).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Footer (3-Stage Progression: Pending -> Approved -> Delivered) */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-1">
                    {order.status === 'PENDING_REVIEW' && hasFunctionalityAccess('orders_page', 'approve_order') && (
                      <button
                        onClick={() => handleApproveOrder(order)}
                        className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 px-3 rounded-xl shadow-sm transition-all active:scale-95 text-center min-h-[40px]"
                      >
                        {isTe ? 'ఆమోదించు' : 'Approve'}
                      </button>
                    )}

                    {(order.status === 'APPROVED' || order.status === 'DISPATCHED') && hasFunctionalityAccess('orders_page', 'deliver_order') && (
                      <button
                        onClick={() => handleDeliverOrder(order)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 px-3 rounded-xl shadow-sm transition-all active:scale-95 text-center min-h-[40px]"
                      >
                        {isTe ? 'డెలివరీ పూర్తి చేయి' : 'Complete & Deliver'}
                      </button>
                    )}

                    {order.status === 'DELIVERED' && (
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 py-1 px-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {isTe ? 'డెలివరీ పూర్తయింది' : 'Delivered'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {order.status !== 'DELIVERED' && hasFunctionalityAccess('orders_page', 'edit_order') && (
                      <button
                        onClick={() => handleOpenEditOrder(order)}
                        className="p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors"
                        title={isTe ? 'ఆర్డర్ సవరించండి' : 'Edit Order'}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {hasFunctionalityAccess('orders_page', 'delete_order') && (
                      <button
                        onClick={() => handleDeleteOrder(order)}
                        className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
                        title={isTe ? 'ఆర్డర్ తొలగించండి' : 'Delete Order'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    {hasFunctionalityAccess('orders_page', 'send_whatsapp_bill') && (
                      <button
                        onClick={() => triggerWhatsAppBill(order)}
                        className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                        title={isTe ? 'వాట్సాప్ బిల్లు పంపండి' : 'Send WhatsApp Statement'}
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MOBILE BOTTOM-SHEET / MODAL FOR NEW ORDER */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={closeModal}
        >
          <div 
            className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-3xl lg:max-w-4xl w-full p-5 sm:p-7 border border-slate-100 h-[88vh] sm:h-[90vh] max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-4 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Mobile Drag Indicator Bar */}
            <div className="w-12 h-1.5 rounded-full bg-slate-300 mx-auto mb-3 sm:hidden" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                  {editingOrder ? <Pencil className="w-4 h-4" /> : <Plus className="w-5 h-5 stroke-[3]" />}
                </div>
                <h2 className="text-lg font-black text-slate-900">
                  {editingOrder 
                    ? (isTe ? `ఆర్డర్ వివరాలు సవరించండి (${editingOrder.orderNumber})` : `Edit Order (${editingOrder.orderNumber})`) 
                    : (isTe ? 'కొత్త హోల్‌సేల్ ఆర్డర్ నమోదు' : 'New Wholesale Order')}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold p-1 leading-none"
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

            <form onSubmit={handleCreateOrder} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto no-scrollbar pr-1 space-y-4">
              
              {/* Customer Selector & Order Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
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
                    {!customers.some((c) => c.id === WALK_IN_CUSTOMER_ID) && (
                      <option value={WALK_IN_CUSTOMER_ID}>
                        {isTe ? 'వాక్-ఇన్ కస్టమర్ (కౌంటర్ నగదు)' : 'Walk-In Customer (Counter Cash)'}
                      </option>
                    )}
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {getLocalizedText(c, 'name', language)} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isTe ? 'ఆర్డర్ తేదీ *' : 'Order / Sale Date *'}
                  </label>
                  <input
                    type="date"
                    required
                    max={todayStr}
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-2xl p-3 outline-none focus:border-orange-500 bg-slate-50/50 font-medium min-h-[46px]"
                  />
                </div>
              </div>

              {/* DYNAMIC COMMODITY ROWS BUILDER WITH EDITABLE SALE VALUE */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    {isTe ? 'సరుకుల వివరాలు & అమ్మకపు ధరలు' : 'Order Items & Sale Rates'}
                  </label>
                  <div className="flex items-center gap-2">
                    {hasDuplicateItemTypes && (
                      <button
                        type="button"
                        onClick={handleCombineDuplicateItems}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-full border border-amber-300 transition-colors shadow-sm"
                        title={isTe ? 'ఒకే రకమైన సరుకుల పరిమాణాలను కలపండి' : 'Combine quantities of identical item rows'}
                      >
                        <Layers className="w-3.5 h-3.5 text-amber-600" />
                        <span>{isTe ? 'డూప్లికేట్స్ కలపండి' : 'Combine Duplicates'}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleAddItemRow}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-full border border-orange-200 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>{isTe ? 'సరుకు చేర్చండి' : 'Add Item'}</span>
                    </button>
                  </div>
                </div>

                {/* Column Headers for desktop view */}
                <div className="hidden md:grid grid-cols-12 gap-2.5 px-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <div className="col-span-4">{isTe ? 'సరుకు ఎంపిక' : 'Commodity'}</div>
                  <div className="col-span-2">{isTe ? 'యూనిట్ రకం' : 'Unit Type'}</div>
                  <div className="col-span-2 text-center">{isTe ? 'పరిమాణం (Qty)' : 'Quantity (Qty)'}</div>
                  <div className="col-span-2 text-center">{isTe ? 'ధర (Rate ₹)' : 'Rate (₹)'}</div>
                  <div className="col-span-2 text-right pr-6">{isTe ? 'మొత్తం (Total)' : 'Total (₹)'}</div>
                </div>

                <div className="space-y-2.5">
                  {itemRows.map((row, idx) => (
                    <div 
                      key={row.rowId}
                      className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                    >
                      {/* Commodity Dropdown */}
                      <div className="sm:col-span-12 md:col-span-4 min-w-0">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1 md:hidden">
                          {isTe ? 'సరుకు ఎంపిక' : 'Commodity'}
                        </label>
                        <select
                          required
                          value={row.productId}
                          onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                          className="w-full text-xs font-bold border border-slate-300 rounded-xl p-2.5 bg-white outline-none focus:border-orange-500 min-h-[42px] truncate"
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
                      <div className="sm:col-span-4 md:col-span-2 min-w-0">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1 md:hidden">
                          {isTe ? 'యూనిట్ రకం' : 'Unit Type'}
                        </label>
                        <select
                          value={row.unitType}
                          onChange={(e) => handleItemChange(idx, 'unitType', e.target.value as UnitType)}
                          className="w-full text-xs border border-slate-300 rounded-xl p-2.5 bg-white outline-none focus:border-orange-500 font-semibold min-h-[42px]"
                        >
                          <option value="OUTER_BAG">{isTe ? 'బస్తా (Outer Bag)' : 'Outer Bag'}</option>
                          <option value="INNER_BAG">{isTe ? 'ప్యాకెట్ (Inner Pkt)' : 'Inner Pkt'}</option>
                          <option value="LOOSE_KG">{isTe ? 'కిలో (Loose Kg)' : 'Loose Kg'}</option>
                        </select>
                      </div>

                      {/* Quantity (Zero auto-fill) */}
                      <div className="sm:col-span-4 md:col-span-2 min-w-0">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1 md:hidden">
                          {isTe ? 'పరిమాణం (Qty)' : 'Quantity (Qty)'}
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          placeholder={isTe ? 'పరిమాణం (Qty)' : 'Quantity (Qty)'}
                          value={row.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full text-xs font-bold border border-slate-300 rounded-xl p-2.5 bg-white outline-none focus:border-orange-500 text-center min-h-[42px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>

                      {/* EDITABLE SALE VALUE / UNIT RATE */}
                      <div className="sm:col-span-4 md:col-span-2 min-w-0">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1 md:hidden">
                          {isTe ? 'ధర (Rate ₹)' : 'Rate (₹)'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          required
                          placeholder={isTe ? 'ధర (రూ.)' : 'Rate (₹)'}
                          value={row.unitPrice}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full text-xs font-bold border border-slate-300 rounded-xl p-2.5 bg-white outline-none focus:border-orange-500 text-center font-mono min-h-[42px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>

                      {/* Rate / Total Preview & Delete */}
                      <div className="sm:col-span-12 md:col-span-2 flex items-center justify-between md:justify-end gap-2 pt-1 md:pt-0 min-w-0">
                        <div className="text-right min-w-0 flex-1 md:flex-initial">
                          <span className="text-[10px] text-slate-400 block md:hidden">{isTe ? 'మొత్తం:' : 'Total:'}</span>
                          <span 
                            className="text-xs sm:text-sm font-mono font-black text-slate-900 block truncate"
                            title={`₹${((Number(row.quantity) || 0) * (Number(row.unitPrice) || 0)).toLocaleString()}`}
                          >
                            ₹{((Number(row.quantity) || 0) * (Number(row.unitPrice) || 0)).toLocaleString()}
                          </span>
                        </div>
                        {itemRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors shrink-0"
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isTe ? 'హమాలీ (రూ/బస్తా)' : 'Hamali (₹/Bag)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder={isTe ? 'ఉదా: 10' : 'e.g. 10'}
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
                    placeholder={isTe ? 'ఉదా: 500' : 'e.g. 500'}
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
                    placeholder={isTe ? 'ఉదా: 200' : 'e.g. 200'}
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-xs border border-emerald-300 bg-emerald-50/50 rounded-xl p-2.5 outline-none focus:border-emerald-500 font-bold text-emerald-800 min-h-[42px]"
                  />
                </div>
              </div>

              {/* Vehicle & Driver */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isTe ? 'వాహనం నంబర్' : 'Vehicle Number'}
                  </label>
                  <input
                    type="text"
                    placeholder={isTe ? 'ఉదా: TS 09 UA 1234' : 'e.g. TS 09 UA 1234'}
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
                    placeholder={isTe ? 'ఉదా: 9988776655' : 'e.g. 9988776655'}
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
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-between gap-2.5 pt-3 border-t border-slate-100 shrink-0">
              {editingOrder && isAdminOrOwner ? (
                <button
                  type="button"
                  onClick={() => handleDeleteOrder(editingOrder)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-full transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>{isTe ? 'ఆర్డర్ తొలగించు' : 'Delete Order'}</span>
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-full"
                >
                  {isTe ? 'రద్దు చేయండి' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 text-xs font-black bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white rounded-full shadow-lg shadow-orange-500/25 transition-all active:scale-95 min-h-[44px]"
                >
                  {editingOrder ? (isTe ? 'ఆర్డర్‌ను నవీకరించండి' : 'Update Order') : (isTe ? 'ఆర్డర్‌ను నిర్ధారించండి' : 'Confirm & Place Order')}
                </button>
              </div>
            </div>
          </form>
          </div>
        </div>
      )}

      {/* Complete Delivery & Select Payment Mode Modal */}
      {completingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-5 sm:p-6 space-y-4">
            <div>
              <h3 className="text-base font-black text-slate-900">
                {isTe ? 'డెలివరీ పూర్తి & చెల్లింపు విధానం' : 'Complete Delivery & Payment Mode'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {isTe
                  ? `${completingOrder.orderNumber} ఆర్డర్ ఏ చెల్లింపు విధానంలో పూర్తయిందో ఎంచుకోండి:`
                  : `Select how order ${completingOrder.orderNumber} (₹${(completingOrder.grandTotal || 0).toLocaleString()}) was settled:`}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(['CASH', 'CREDIT', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'DD'] as PaymentMode[]).map((pm) => (
                <button
                  key={pm}
                  type="button"
                  onClick={() => setCompletionPaymentMode(pm)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                    completionPaymentMode === pm
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {pm === 'BANK_TRANSFER' ? (isTe ? 'ఖాతా బదిలీ (A/C)' : 'A/C Transfer') : pm}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCompletingOrder(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                {isTe ? 'రద్దు' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={confirmCompleteDelivery}
                className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm"
              >
                {isTe ? 'డెలివరీ నిర్ధారించు' : 'Confirm Delivery'}
              </button>
            </div>
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
        cancelText={isTe ? 'రద్దు చేయి' : 'Cancel'}
        onAction={dialogConfig.onAction}
      />
    </div>
  );
};
