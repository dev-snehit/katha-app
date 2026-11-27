export const en = {
  appTitle: "Kaatha Wholesale",
  tagline: "Rice & Groceries Wholesale Platform",
  nav: {
    pendingOrders: "Orders Yet to Deliver",
    stock: "Stock Registry",
    customers: "Customers",
    suppliers: "Suppliers",
    exportCenter: "Export & Reports",
    adminRequests: "User Requests",
    login: "Login",
    logout: "Logout",
    register: "Sign Up"
  },
  roles: {
    ADMIN: "Administrator",
    OWNER: "Business Owner",
    STAFF: "Warehouse Staff",
    CUSTOMER: "Retail Customer"
  },
  orders: {
    title: "Pending Orders Yet to Deliver",
    subtitle: "Active dispatch queue: Review, Load, and Dispatch orders",
    createOrderBtn: "New Pending Order",
    statusPending: "Pending Review",
    statusApproved: "Approved & Packing",
    statusPacked: "Packed & Ready",
    statusDispatched: "Out for Delivery",
    statusDelivered: "Delivered & Settled",
    statusCancelled: "Cancelled",
    orderNo: "Order #",
    customer: "Customer",
    bags: "Bags",
    total: "Total Amount",
    vehicle: "Vehicle No.",
    actions: "Actions",
    approveBtn: "Approve Order",
    markDispatched: "Mark Dispatched",
    markDelivered: "Mark Delivered",
    sendWhatsApp: "Send WhatsApp Bill",
    noOrders: "No pending orders found."
  },
  stock: {
    title: "Stock Registry",
    physicalOuter: "Physical Bags (Godown)",
    reservedOuter: "Reserved (Pending Orders)",
    availableOuter: "Available for Sale",
    looseInner: "Loose Packets",
    looseKg: "Loose Kg",
    unpackBtn: "Unpack 1 Bag",
    reorderAlert: "Low Stock Alert"
  },
  common: {
    search: "Search...",
    save: "Save",
    cancel: "Cancel",
    confirm: "Confirm",
    language: "Language",
    loading: "Loading...",
    filterDate: "Filter Date",
    singleDate: "Single Day",
    dateRange: "Date Range"
  }
};

export type Translations = typeof en;
