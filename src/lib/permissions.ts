import { Role, RolePermissionsConfig, PagePermissionConfig } from '../contracts';
import rolesRegistry from '../config/roles/roles.json';
import ownerPermissionsJson from '../config/roles/owner.json';
import adminPermissionsJson from '../config/roles/admin.json';
import staffPermissionsJson from '../config/roles/staff.json';
import customerPermissionsJson from '../config/roles/customer.json';

export const ROLE_CONFIG_REGISTRY = rolesRegistry.roles;

export interface FunctionalityMeta {
  key: string;
  labelEn: string;
  labelTe: string;
  descriptionEn: string;
  descriptionTe: string;
}

export interface PageMeta {
  key: string;
  labelEn: string;
  labelTe: string;
  navKey: string;
  descriptionEn: string;
  descriptionTe: string;
  functionalities: FunctionalityMeta[];
}

export const PERMISSION_PAGES_META: PageMeta[] = [
  {
    key: 'dashboard_page',
    labelEn: 'Business Performance Dashboard',
    labelTe: 'వ్యాపార పనితీరు డాష్‌బోర్డ్',
    navKey: 'dashboard',
    descriptionEn: 'At-a-glance business clarity, live KPIs, interactive charts, and cross-module intelligence',
    descriptionTe: 'వ్యాపార లావాదేవీలు, పనితీరు సూచికలు మరియు గ్రాఫికల్ విశ్లేషణల సమగ్ర సమాచారం',
    functionalities: [
      {
        key: 'view_dashboard',
        labelEn: 'View Dashboard Overview',
        labelTe: 'డాష్‌బోర్డ్ ముఖ్యాంశాలు చూడటం',
        descriptionEn: 'Allow viewing main business dashboard summary',
        descriptionTe: 'వ్యాపార డాష్‌బోర్డ్ సారాంశం చూసే అనుమతి',
      },
      {
        key: 'view_kpi_metrics',
        labelEn: 'View Revenue & Financial KPIs',
        labelTe: 'ఆదాయం & లాభనష్టాల సూచికలు',
        descriptionEn: 'Allow viewing gross pipeline value, realized collections, and credit dues cards',
        descriptionTe: 'మొత్తం అమ్మకాల విలువ, వసూళ్లు మరియు బకాయిల కార్డులను చూసే అనుమతి',
      },
      {
        key: 'view_order_funnel_chart',
        labelEn: 'View Order Pipeline Funnel Chart',
        labelTe: 'ఆర్డర్ల పైప్‌లైన్ ఫన్నెల్ చార్ట్',
        descriptionEn: 'Allow viewing interactive distribution graphs across order fulfillment stages',
        descriptionTe: 'ఆర్డర్ల పంపిణీ మరియు డెలివరీ స్థితి గ్రాఫ్‌లను చూసే అనుమతి',
      },
      {
        key: 'view_inventory_health',
        labelEn: 'View Inventory Health & Stock Chart',
        labelTe: 'స్టాక్ నిల్వలు & విశ్లేషణ గ్రాఫ్',
        descriptionEn: 'Allow viewing physical vs reserved stock breakdown and low-stock indicators',
        descriptionTe: 'గోడౌన్ నిల్వలు మరియు తక్కువ స్టాక్ హెచ్చరికలను చూసే అనుమతి',
      },
      {
        key: 'view_credit_risk_table',
        labelEn: 'View Customer Credit & Receivables Table',
        labelTe: 'కస్టమర్ల బకాయిల విశ్లేషణ పట్టిక',
        descriptionEn: 'Allow viewing top outstanding dues and credit risk exposure rankings',
        descriptionTe: 'ఎక్కువ బకాయి ఉన్న కస్టమర్ల వివరాల పట్టికను చూసే అనుమతి',
      },
      {
        key: 'view_recent_activity',
        labelEn: 'View Recent Real-time Activity Feed',
        labelTe: 'ఇటీవలి లావాదేవీల ఫీడ్',
        descriptionEn: 'Allow reviewing the chronological live audit feed of transactions and actions',
        descriptionTe: 'తాజా ఆర్డర్లు మరియు స్టాక్ లావాదేవీల లైవ్ ఫీడ్ చూసే అనుమతి',
      },
      {
        key: 'quick_actions',
        labelEn: 'Access Quick Action Shortcuts',
        labelTe: 'త్వరిత చర్యల షార్ట్‌కట్‌లు',
        descriptionEn: 'Allow navigating directly from dashboard to New Order, Add Stock, and Collect Payments',
        descriptionTe: 'డాష్‌బోర్డ్ నుండి నేరుగా కొత్త ఆర్డర్ లేదా సరుకు చేర్చే షార్ట్‌కట్ అనుమతి',
      },
    ],
  },
  {
    key: 'orders_page',
    labelEn: 'Orders Pipeline & Dispatch',
    labelTe: 'ఆర్డర్లు & డెలివరీ పైప్‌లైన్',
    navKey: 'orders',
    descriptionEn: 'Manage wholesale customer orders, approval, dispatch, and delivery status',
    descriptionTe: 'హోల్‌సేల్ కస్టమర్ ఆర్డర్లు, ఆమోదం, రవాణా మరియు డెలివరీ స్థితి నిర్వహణ',
    functionalities: [
      {
        key: 'view_orders',
        labelEn: 'View Orders',
        labelTe: 'ఆర్డర్లను చూడటం',
        descriptionEn: 'Allow viewing existing wholesale orders list and cards',
        descriptionTe: 'ఆర్డర్ల జాబితాను మరియు కార్డ్‌లను చూసే అనుమతి',
      },
      {
        key: 'create_order',
        labelEn: 'Create New Order',
        labelTe: 'కొత్త ఆర్డర్ నమోదు',
        descriptionEn: 'Allow submitting new wholesale orders with commodity builder',
        descriptionTe: 'సరుకుల వివరాలతో కొత్త ఆర్డర్‌ను నమోదు చేసే అనుమతి',
      },
      {
        key: 'edit_order',
        labelEn: 'Edit Existing Order',
        labelTe: 'ఆర్డర్ సవరించడం',
        descriptionEn: 'Allow updating commodities, pricing, vehicle, and discounts for pending orders',
        descriptionTe: 'ఆర్డర్ సరుకులు, ధరలు, తగ్గింపులు మరియు వాహనం వివరాలను మార్చే అనుమతి',
      },
      {
        key: 'delete_order',
        labelEn: 'Delete Order',
        labelTe: 'ఆర్డర్ తొలగించడం',
        descriptionEn: 'Allow permanently deleting orders and restoring reserved inventory',
        descriptionTe: 'ఆర్డర్‌ను తొలగించి సరుకును స్టాక్‌లో తిరిగి చేర్చే అనుమతి',
      },
      {
        key: 'approve_order',
        labelEn: 'Approve Order',
        labelTe: 'ఆర్డర్ ఆమోదించడం',
        descriptionEn: 'Allow approving pending orders and committing inventory reservation',
        descriptionTe: 'పెండింగ్ ఆర్డర్‌ను ఆమోదించి అధికారిక అమ్మకంగా మార్చే అనుమతి',
      },
      {
        key: 'dispatch_order',
        labelEn: 'Dispatch Order',
        labelTe: 'ఆర్డర్ రవాణా చేయడం',
        descriptionEn: 'Allow marking approved orders as dispatched with transport details',
        descriptionTe: 'రవాణా వివరాలతో ఆర్డర్‌ను డిస్పాచ్ చేసే అనుమతి',
      },
      {
        key: 'deliver_order',
        labelEn: 'Mark Order Delivered',
        labelTe: 'డెలివరీ పూర్తయినట్లు గుర్తించడం',
        descriptionEn: 'Allow finalizing order delivery and settling customer account',
        descriptionTe: 'ఆర్డర్ డెలివరీ పూర్తయినట్లు మార్క్ చేసి ఖాతా సెటిల్ చేసే అనుమతి',
      },
      {
        key: 'send_whatsapp_bill',
        labelEn: 'Share WhatsApp Statement',
        labelTe: 'వాట్సాప్ బిల్లు పంపడం',
        descriptionEn: 'Allow sharing structured WhatsApp invoices with customers',
        descriptionTe: 'కస్టమర్లకు వాట్సాప్ ద్వారా బిల్లు స్టేట్‌మెంట్ పంపే అనుమతి',
      },
    ],
  },
  {
    key: 'stock_page',
    labelEn: 'Stock Registry & Godown Inventory',
    labelTe: 'స్టాక్ రిజిస్ట్రీ & గోడౌన్ నిల్వలు',
    navKey: 'stock',
    descriptionEn: 'Rice, flour, and grain outer bags, inner packets, and loose packaging inventory',
    descriptionTe: 'బియ్యం, పిండి బస్తాలు, ప్యాకెట్లు మరియు విడి నిల్వల వివరాలు',
    functionalities: [
      {
        key: 'view_stock',
        labelEn: 'View Stock Inventory',
        labelTe: 'స్టాక్ నిల్వలను చూడటం',
        descriptionEn: 'Allow viewing physical, reserved, and available stock levels',
        descriptionTe: 'అందుబాటులో ఉన్న నిల్వలు మరియు రిజర్వ్డ్ స్టాక్ చూసే అనుమతి',
      },
      {
        key: 'add_product',
        labelEn: 'Add New Commodity',
        labelTe: 'కొత్త సరుకు చేర్చడం',
        descriptionEn: 'Allow registering new rice or grocery brand commodities',
        descriptionTe: 'స్టాక్ రిజిస్ట్రీలో కొత్త రకం సరుకును చేర్చే అనుమతి',
      },
      {
        key: 'edit_product',
        labelEn: 'Edit Commodity & Rates',
        labelTe: 'సరుకు వివరాలు & ధరల సవరణ',
        descriptionEn: 'Allow editing wholesale rates, retail prices, and bag weights',
        descriptionTe: 'హోల్‌సేల్ మరియు రిటైల్ ధరలను సవరించే అనుమతి',
      },
      {
        key: 'delete_product',
        labelEn: 'Delete Commodity',
        labelTe: 'సరుకును తొలగించడం',
        descriptionEn: 'Allow removing commodity records from active registry',
        descriptionTe: 'రిజిస్ట్రీ నుండి సరుకు రికార్డును తొలగించే అనుమతి',
      },
      {
        key: 'unpack_bag',
        labelEn: 'Unpack Outer Bag to Loose',
        labelTe: 'బస్తాను విప్పి ప్యాకెట్లుగా మార్చడం',
        descriptionEn: 'Allow converting 1 outer bag into loose inner packets for retail',
        descriptionTe: 'బస్తాను విప్పి విడి ప్యాకెట్లుగా విభజించే అనుమతి',
      },
    ],
  },
  {
    key: 'customers_page',
    labelEn: 'Customer Directory & Accounts',
    labelTe: 'కస్టమర్ల డైరెక్టరీ & ఖాతాలు',
    navKey: 'customers',
    descriptionEn: 'Wholesale buyers, retail clients, credit dues, and ledger balances',
    descriptionTe: 'ఖాతాదారుల వివరాలు, బకాయిలు మరియు ఫోన్ నంబర్లు',
    functionalities: [
      {
        key: 'view_customers',
        labelEn: 'View Customers',
        labelTe: 'కస్టమర్లను చూడటం',
        descriptionEn: 'Allow viewing customer contacts and pending credit balance',
        descriptionTe: 'కస్టమర్ల జాబితా మరియు బకాయిలను చూసే అనుమతి',
      },
      {
        key: 'add_customer',
        labelEn: 'Add New Customer',
        labelTe: 'కొత్త కస్టమర్‌ను చేర్చడం',
        descriptionEn: 'Allow registering new clients with unique 10-digit phone',
        descriptionTe: '10 అంకెల మొబైల్ నంబర్‌తో కొత్త కస్టమర్‌ను చేర్చే అనుమతి',
      },
      {
        key: 'edit_customer',
        labelEn: 'Edit Customer Details',
        labelTe: 'కస్టమర్ వివరాల సవరణ',
        descriptionEn: 'Allow updating customer business name, phone, address, and balance',
        descriptionTe: 'వ్యాపార పేరు, చిరునామా మరియు బకాయిలను సవరించే అనుమతి',
      },
      {
        key: 'delete_customer',
        labelEn: 'Delete Customer',
        labelTe: 'కస్టమర్‌ను తొలగించడం',
        descriptionEn: 'Allow deleting customer accounts from database',
        descriptionTe: 'డేటాబేస్ నుండి కస్టమర్ ఖాతాను తొలగించే అనుమతి',
      },
    ],
  },
  {
    key: 'suppliers_page',
    labelEn: 'Suppliers & Millers Directory',
    labelTe: 'సరఫరాదారులు & మిల్లుల డైరెక్టరీ',
    navKey: 'suppliers',
    descriptionEn: 'Rice millers, farmers, bank account details, and purchases registry',
    descriptionTe: 'రైస్ మిల్లర్లు, బ్యాంక్ ఖాతా వివరాలు మరియు కొనుగోలు లెడ్జర్',
    functionalities: [
      {
        key: 'view_suppliers',
        labelEn: 'View Suppliers',
        labelTe: 'సరఫరాదారులను చూడటం',
        descriptionEn: 'Allow viewing supplier list and bank account details',
        descriptionTe: 'సరఫరాదారులు మరియు బ్యాంక్ వివరాలను చూసే అనుమతి',
      },
      {
        key: 'add_supplier',
        labelEn: 'Add New Supplier',
        labelTe: 'కొత్త సప్లయర్‌ను చేర్చడం',
        descriptionEn: 'Allow adding new grain suppliers, millers, and bank coordinates',
        descriptionTe: 'కొత్త సప్లయర్ వివరాలు మరియు బ్యాంక్ సమాచారం చేర్చే అనుమతి',
      },
      {
        key: 'edit_supplier',
        labelEn: 'Edit Supplier Details',
        labelTe: 'సప్లయర్ వివరాల సవరణ',
        descriptionEn: 'Allow modifying supplier business names, IFSC, and accounts',
        descriptionTe: 'సప్లయర్ బ్యాంక్ ఖాతా మరియు చిరునామా సవరించే అనుమతి',
      },
      {
        key: 'delete_supplier',
        labelEn: 'Delete Supplier',
        labelTe: 'సప్లయర్‌ను తొలగించడం',
        descriptionEn: 'Allow deleting supplier profiles from system',
        descriptionTe: 'సిస్టమ్ నుండి సప్లయర్ ప్రొఫైల్‌ను తొలగించే అనుమతి',
      },
    ],
  },
  {
    key: 'followups_page',
    labelEn: 'Walk-In & Follow-Up Leads',
    labelTe: 'వాక్-ఇన్ & ఫాలో-అప్ డైరెక్టరీ',
    navKey: 'followups',
    descriptionEn: 'Track walk-in customers, purchase inquiries, and future follow-up reminders',
    descriptionTe: 'వాక్-ఇన్ కస్టమర్లు, కొనుగోలు ఉద్దేశ్యం మరియు భవిష్యత్ ఫాలో-అప్ వివరాలు',
    functionalities: [
      { key: 'view_followups', labelEn: 'View Follow-Up Directory', labelTe: 'ఫాలో-అప్ వివరాలు చూడటం', descriptionEn: 'Allow viewing walk-in leads and follow-up notes', descriptionTe: 'వాక్-ఇన్ కస్టమర్ల ఫాలో-అప్ జాబితాను చూడటం' },
      { key: 'add_followup', labelEn: 'Add Follow-Up Lead', labelTe: 'కొత్త ఫాలో-అప్ చేర్చడం', descriptionEn: 'Allow adding new walk-in / customer follow-up records', descriptionTe: 'కొత్త ఫాలో-అప్ ఎంట్రీని నమోదు చేయడం' },
      { key: 'edit_followup', labelEn: 'Update Follow-Up Status', labelTe: 'ఫాలో-అప్ స్థితి మార్చడం', descriptionEn: 'Allow updating follow-up status and notes', descriptionTe: 'ఫాలో-అప్ స్థితి మరియు నోట్స్ సవరించడం' },
      { key: 'delete_followup', labelEn: 'Delete Follow-Up Lead', labelTe: 'ఫాలో-అప్ తొలగించడం', descriptionEn: 'Allow deleting follow-up entries', descriptionTe: 'ఫాలో-అప్ ఎంట్రీని తొలగించడం' },
    ],
  },
  {
    key: 'reports_page',
    labelEn: 'Export & Financial Reports',
    labelTe: 'ఎగుమతి & ఆర్థిక నివేదికలు',
    navKey: 'reports',
    descriptionEn: 'Sales analytics, inventory exports, daily tally, and ledger downloads',
    descriptionTe: 'అమ్మకాల విశ్లేషణ, ఎక్సెల్ డౌన్‌లోడ్లు మరియు రోజువారీ లెక్కలు',
    functionalities: [
      {
        key: 'view_reports',
        labelEn: 'View Financial Analytics',
        labelTe: 'ఆర్థిక నివేదికలను చూడటం',
        descriptionEn: 'Allow viewing pipeline turnover, total bags sold, and metrics',
        descriptionTe: 'మొత్తం అమ్మకాలు మరియు ఆర్థిక విశ్లేషణలను చూసే అనుమతి',
      },
      {
        key: 'export_data',
        labelEn: 'Export Data (CSV / Excel)',
        labelTe: 'డేటా డౌన్‌లోడ్ (ఎక్సెల్ / CSV)',
        descriptionEn: 'Allow exporting orders and customer data into spreadsheets',
        descriptionTe: 'ఆర్డర్లు మరియు కస్టమర్ల డేటాను డౌన్‌లోడ్ చేసే అనుమతి',
      },
      {
        key: 'generate_statement',
        labelEn: 'Generate Billing Statements',
        labelTe: 'ఖాతా స్టేట్‌మెంట్‌లు తయారుచేయడం',
        descriptionEn: 'Allow generating formal billing receipts and account statements',
        descriptionTe: 'కస్టమర్ బిల్లు స్టేట్‌మెంట్‌లను తయారుచేసే అనుమతి',
      },
    ],
  },
  {
    key: 'user_management_page',
    labelEn: 'User Requests & Role Governance',
    labelTe: 'యూజర్ రిజిస్ట్రేషన్లు & రోల్ నియంత్రణ',
    navKey: 'admin',
    descriptionEn: 'Staff onboarding, approval workflow, active accounts, and role permissions matrix',
    descriptionTe: 'సిబ్బంది ఆమోదం, ఖాతాల నిర్వహణ మరియు రోల్ అనుమతుల నియంత్రణ',
    functionalities: [
      {
        key: 'view_users',
        labelEn: 'View User Accounts',
        labelTe: 'యూజర్ల జాబితాను చూడటం',
        descriptionEn: 'Allow reviewing pending registrations and active system users',
        descriptionTe: 'పెండింగ్ అభ్యర్థనలు మరియు యాక్టివ్ యూజర్లను చూసే అనుమతి',
      },
      {
        key: 'approve_user',
        labelEn: 'Approve User Request',
        labelTe: 'యూజర్ అభ్యర్థనను ఆమోదించడం',
        descriptionEn: 'Allow granting access to pending staff or partner registrations',
        descriptionTe: 'పెండింగ్ యూజర్‌కు లాగిన్ అనుమతి ఇచ్చే అధికారం',
      },
      {
        key: 'deny_user',
        labelEn: 'Deny User Request',
        labelTe: 'యూజర్ అభ్యర్థనను తిరస్కరించడం',
        descriptionEn: 'Allow denying unauthorized registration attempts',
        descriptionTe: 'అనధికార యూజర్ అభ్యర్థనను తిరస్కరించే అధికారం',
      },
      {
        key: 'edit_user',
        labelEn: 'Edit User Role & Status',
        labelTe: 'యూజర్ రోల్ & స్థితిని మార్చడం',
        descriptionEn: 'Allow updating user full name, role (Owner/Admin/Staff), and active status',
        descriptionTe: 'యూజర్ పేరు, రోల్ మరియు యాక్టివ్ స్థితిని సవరించే అనుమతి',
      },
      {
        key: 'delete_user',
        labelEn: 'Delete User Account',
        labelTe: 'యూజర్ ఖాతాను తొలగించడం',
        descriptionEn: 'Allow permanently purging user login profiles from system',
        descriptionTe: 'సిస్టమ్ నుండి యూజర్ ఖాతాను శాశ్వతంగా తొలగించే అధికారం',
      },
      {
        key: 'manage_role_permissions',
        labelEn: 'Manage Role Permissions Matrix',
        labelTe: 'రోల్ అనుమతుల మ్యాట్రిక్స్ నిర్వహణ',
        descriptionEn: 'Allow configuring the global feature access boolean JSON for all roles',
        descriptionTe: 'అన్ని రోల్స్ కొరకు ఫీచర్ అనుమతుల JSON ను నిర్వహించే అధికారం',
      },
    ],
  },
];

/**
 * Default production-grade permissions matrix loaded from role configuration JSON files
 * in `src/config/roles/` (`owner.json`, `admin.json`, `staff.json`, `customer.json`).
 * Fully controls visibility and execution across both frontend UI and backend services.
 */
export const DEFAULT_ROLE_PERMISSIONS: RolePermissionsConfig = {
  OWNER: ownerPermissionsJson as Record<string, PagePermissionConfig>,
  ADMIN: adminPermissionsJson as Record<string, PagePermissionConfig>,
  STAFF: staffPermissionsJson as Record<string, PagePermissionConfig>,
  CUSTOMER: customerPermissionsJson as Record<string, PagePermissionConfig>,
};

/**
 * Checks if a specific page/module is enabled for a given role.
 */
export function isPageEnabled(
  permissions: RolePermissionsConfig | undefined | null,
  role: Role | undefined | null,
  pageKey: string
): boolean {
  if (!role) return false;
  if (role === 'OWNER') return true;

  const currentPerms = permissions || DEFAULT_ROLE_PERMISSIONS;
  const roleConfig = currentPerms[role] || DEFAULT_ROLE_PERMISSIONS[role];
  if (!roleConfig) return false;

  const page = roleConfig[pageKey];
  if (!page) {
    const fallback = DEFAULT_ROLE_PERMISSIONS[role]?.[pageKey];
    return fallback ? fallback.enabled : false;
  }
  return Boolean(page.enabled);
}

/**
 * Checks if a specific functionality inside a page is enabled for a given role.
 */
export function isFunctionalityEnabled(
  permissions: RolePermissionsConfig | undefined | null,
  role: Role | undefined | null,
  pageKey: string,
  functionalityKey: string
): boolean {
  if (!role) return false;
  if (role === 'OWNER') return true;

  const currentPerms = permissions || DEFAULT_ROLE_PERMISSIONS;
  const roleConfig = currentPerms[role] || DEFAULT_ROLE_PERMISSIONS[role];
  if (!roleConfig) return false;

  const page = roleConfig[pageKey];
  if (!page) {
    const fallback = DEFAULT_ROLE_PERMISSIONS[role]?.[pageKey];
    if (!fallback || !fallback.enabled) return false;
    return Boolean(fallback.functionalities?.[functionalityKey]);
  }

  // If page itself is disabled, all sub-functionalities are disabled
  if (!page.enabled) return false;

  if (page.functionalities && page.functionalities[functionalityKey] !== undefined) {
    return Boolean(page.functionalities[functionalityKey]);
  }

  const fallback = DEFAULT_ROLE_PERMISSIONS[role]?.[pageKey];
  return Boolean(fallback?.functionalities?.[functionalityKey]);
}

/**
 * Safely merges loaded configuration with the full default schema to ensure no keys are missing.
 */
export function mergeWithDefaultPermissions(incoming: any): RolePermissionsConfig {
  const result: RolePermissionsConfig = JSON.parse(JSON.stringify(DEFAULT_ROLE_PERMISSIONS));
  if (!incoming || typeof incoming !== 'object') return result;

  const roles: Role[] = ['OWNER', 'ADMIN', 'STAFF', 'CUSTOMER'];
  for (const r of roles) {
    if (incoming[r] && typeof incoming[r] === 'object') {
      for (const pageMeta of PERMISSION_PAGES_META) {
        const pageKey = pageMeta.key;
        if (incoming[r][pageKey] && typeof incoming[r][pageKey] === 'object') {
          if (typeof incoming[r][pageKey].enabled === 'boolean') {
            result[r][pageKey].enabled = incoming[r][pageKey].enabled;
          }
          if (incoming[r][pageKey].functionalities && typeof incoming[r][pageKey].functionalities === 'object') {
            for (const funcMeta of pageMeta.functionalities) {
              const funcKey = funcMeta.key;
              if (typeof incoming[r][pageKey].functionalities[funcKey] === 'boolean') {
                result[r][pageKey].functionalities[funcKey] = incoming[r][pageKey].functionalities[funcKey];
              }
            }
          }
        }
      }
    }
  }

  return result;
}
