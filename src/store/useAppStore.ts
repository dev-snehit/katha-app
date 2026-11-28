import { create } from 'zustand';
import { 
  Customer, 
  Supplier, 
  FollowUp,
  Product, 
  Order, 
  PaymentMode,
  User, 
  Role, 
  UserStatus,
  SupportedLanguage,
  INITIAL_ADMIN_USER,
  RolePermissionsConfig,
  PagePermissionConfig
} from '../contracts';
import { pushToGoogleSheet, pullFromGoogleSheet, lockRemoteSheets } from '../lib/syncService';
import { DEFAULT_SERVER_URL } from '../config/backend';
import { hashPassword, generateTemporaryPassword } from '../lib/crypto';
import { isJwtExpired } from '../lib/jwt';
import { 
  DEFAULT_ROLE_PERMISSIONS, 
  isPageEnabled, 
  isFunctionalityEnabled, 
  mergeWithDefaultPermissions 
} from '../lib/permissions';

export type SyncStatus = 'IDLE' | 'SYNCING' | 'SYNCED' | 'ERROR' | 'UNLINKED';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  titleTe?: string;
  message: string;
  messageTe?: string;
  durationMs?: number;
}

export interface AppState {
  // Current user & authentication session
  currentUser: User | null;
  authToken: string | null;
  isAuthenticated: boolean;
  sessionExpiredMessage: string | null;
  clearSessionExpiredMessage: () => void;
  refreshSessionToken: () => Promise<{ success: boolean; message?: string }>;
  checkSessionExpiry: () => void;
  users: User[];
  login: (email: string, password: string) => Promise<{ success: boolean; message: string; user?: User; mustResetPassword?: boolean }>;
  resetPassword: (userId: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  forgotPassword: (email: string) => Promise<{
    success: boolean;
    message: string;
    tempPassword?: string;
    resetToken?: string;
    resetLink?: string;
  }>;
  validateResetToken: (token: string) => {
    valid: boolean;
    user?: User;
    error?: string;
  };
  resetPasswordWithToken: (token: string, newPassword: string) => Promise<{
    success: boolean;
    message: string;
    user?: User;
  }>;
  logout: (expiredReason?: string) => void;
  
  // Active Language
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;

  // Typography & Accessibility font scaling
  baseFontSize: number;
  setBaseFontSize: (size: number) => void;

  // Server connecting & hydration state (blocks main content with loading spinner)
  isConnectingServer: boolean;
  setIsConnectingServer: (status: boolean) => void;

  // Action Loading state for on-screen loading spinner with simple message
  actionLoading: ActionLoadingState | null;
  setActionLoading: (loading: ActionLoadingState | null) => void;
  startActionLoading: (message: string, messageTe?: string) => void;
  stopActionLoading: () => void;

  // Top-right Toast Notifications for backend save confirmations & errors
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
  
  // Domain entities (CLEAN SLATE: Zero dummy data)
  orders: Order[];
  inventory: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  followUps: FollowUp[];

  // Google Sheets Backend Sync
  backendUrl: string;
  setBackendUrl: (url: string) => void;
  syncStatus: SyncStatus;
  lastSyncTime: string | null;
  syncError: string | null;
  triggerSync: (action: string, payload?: Record<string, any>) => Promise<void>;
  syncAllToGoogleSheets: () => Promise<boolean>;
  connectAndHydrateServer: () => Promise<boolean>;
  lockManagedSheets: () => Promise<boolean>;

  // Actions & Mutators
  setCurrentUser: (user: User | null) => void;
  createUser: (userData: { name: string; email: string; phone: string; role: Role }) => Promise<{
    success: boolean;
    message: string;
    user?: User;
    tempPassword?: string;
    resetLink?: string;
  }>;
  registerUser: (user: User, tempPassword?: string, resetLink?: string) => {
    success: boolean;
    message: string;
    user?: User;
    isRoleChangeRequest?: boolean;
    isReRequest?: boolean;
  };
  approveUser: (userId: string, role?: Role) => void;
  denyUser: (userId: string) => void;
  updateUser: (userId: string, updates: { name?: string; role?: Role; status?: UserStatus }) => Promise<boolean>;
  deleteUser: (userId: string) => Promise<boolean>;
  cleanDuplicateUsers: () => Promise<{ removed: number; total: number }>;
  masterResetDatabase: () => Promise<{
    success: boolean;
    message: string;
    user?: User;
    tempPassword?: string;
    resetLink?: string;
  }>;

  addOrder: (order: Order) => void;
  updateOrder: (order: Order) => void;
  deleteOrder: (orderId: string) => Promise<boolean>;
  approveOrder: (orderId: string, approvedByRole: Role) => void;
  markOrderDispatched: (orderId: string, vehicleNo?: string) => void;
  markOrderDelivered: (orderId: string, paymentMode?: PaymentMode) => void;

  addFollowUp: (followUp: FollowUp) => void;
  updateFollowUp: (followUp: FollowUp) => void;
  deleteFollowUp: (followUpId: string) => Promise<boolean>;

  addCustomer: (customer: Customer) => void;
  updateCustomer: (customer: Customer) => void;
  deleteCustomer: (customerId: string) => Promise<boolean>;
  addSupplier: (supplier: Supplier) => void;
  updateSupplier: (supplier: Supplier) => void;
  deleteSupplier: (supplierId: string) => Promise<boolean>;
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (productId: string) => Promise<boolean>;
  unpackProduct: (productId: string) => void;

  // Role-Specific Features & Permissions Configuration
  rolePermissions: RolePermissionsConfig;
  updateRolePermissions: (role: Role, config: Record<string, PagePermissionConfig>) => Promise<boolean>;
  hasPageAccess: (pageKey: string) => boolean;
  hasFunctionalityAccess: (pageKey: string, funcKey: string) => boolean;
  canRolePerform: (role: Role, pageKey: string, funcKey: string) => boolean;
}

export interface ActionLoadingState {
  isLoading: boolean;
  message: string;
  messageTe?: string;
}

// LocalStorage Persistence Helpers
const STORAGE_PREFIX = 'katha_wholesale_';

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export const normalizeEmail = (email: string): string => {
  let clean = (email || '').trim().toLowerCase();
  if (clean.endsWith('@gmail')) {
    clean += '.com';
  }
  return clean;
};

export const normalizePhone = (phone: string): string => {
  return (phone || '').replace(/\D/g, '').slice(-10);
};

export const applyBaseFontSize = (size: number) => {
  if (typeof document !== 'undefined') {
    const clamped = Math.max(12, Math.min(26, Math.round(size)));
    document.documentElement.style.fontSize = `${clamped}px`;
    document.documentElement.style.setProperty('--app-base-font-size', `${clamped}px`);
    document.documentElement.style.setProperty('--font-scale-factor', (clamped / 16).toString());
  }
};

const initialBaseFontSize = loadFromStorage<number>('baseFontSize', 16);
applyBaseFontSize(initialBaseFontSize);

// Initial pre-seeded users (ensures root admin is always present as first-time registered admin)
const storedUsers = loadFromStorage<User[]>('users', []);
const hasRootAdmin = storedUsers.some(
  (u) => u.email.toLowerCase() === INITIAL_ADMIN_USER.email.toLowerCase() || u.email.toLowerCase() === 'dev.snehit@gmail'
);
const initialUsers = hasRootAdmin ? storedUsers : [INITIAL_ADMIN_USER, ...storedUsers];

if (DEFAULT_SERVER_URL) {
  saveToStorage('backendUrl', '');
}
const initialBackendUrl = DEFAULT_SERVER_URL || loadFromStorage<string>('backendUrl', '');
const rawStoredUser = loadFromStorage<User | null>('currentUser', null);
const rawStoredToken = loadFromStorage<string | null>('authToken', null);
const hasValidInitialSession = Boolean(rawStoredUser && rawStoredToken && !isJwtExpired(rawStoredToken));

if (rawStoredUser && !hasValidInitialSession) {
  saveToStorage('currentUser', null);
  saveToStorage('authToken', null);
}

const initialCurrentUser = hasValidInitialSession ? rawStoredUser : null;
const initialAuthToken = hasValidInitialSession ? rawStoredToken : null;
const initialSessionExpiredMessage =
  rawStoredUser && !hasValidInitialSession
    ? 'Your session has expired. Please sign in again.'
    : null;

export const useAppStore = create<AppState>((set, get) => ({
  // Authentication: Strictly backed by 1-hour HS256 JWT persisted in localStorage
  currentUser: initialCurrentUser,
  authToken: initialAuthToken,
  isAuthenticated: hasValidInitialSession,
  sessionExpiredMessage: initialSessionExpiredMessage,
  clearSessionExpiredMessage: () => set({ sessionExpiredMessage: null }),
  users: initialUsers,

  // Role Permissions
  rolePermissions: loadFromStorage<RolePermissionsConfig>('role_permissions', DEFAULT_ROLE_PERMISSIONS),

  login: async (email: string, password: string) => {
    let cleanEmail = email.trim().toLowerCase();
    if (cleanEmail.endsWith('@gmail')) {
      cleanEmail += '.com';
    }
    const cleanPass = password.trim();
    const backendUrl = get().backendUrl;

    if (!backendUrl || !backendUrl.trim().startsWith('http')) {
      return {
        success: false,
        message: 'Backend database URL is not configured. Please configure it in Settings before signing in.',
      };
    }

    const passwordHash = await hashPassword(cleanPass);
    const res = await pushToGoogleSheet(backendUrl, 'login', {
      email: cleanEmail,
      passwordHash,
    });

    if (!res.success) {
      const rawErr =
        res.details?.message ||
        res.error ||
        'Unable to reach authentication server. Please check your connection and try again.';
      const friendlyErr = rawErr.includes('Unknown action: login')
        ? 'Backend authentication endpoint is outdated. Please re-deploy the latest backend/Code.gs as a New Version in Google Apps Script.'
        : rawErr;
      return {
        success: false,
        message: friendlyErr,
      };
    }

    // Mandatory password reset on temporary credentials (pre-JWT)
    if (res.details?.mustResetPassword && res.details?.user) {
      const resetUser = res.details.user as User;
      const existingIdx = get().users.findIndex(
        (u) => u.id === resetUser.id || u.email.toLowerCase() === resetUser.email.toLowerCase()
      );
      const nextUsers =
        existingIdx >= 0
          ? get().users.map((u, idx) => (idx === existingIdx ? { ...u, ...resetUser } : u))
          : [...get().users, resetUser];
      saveToStorage('users', nextUsers);
      set({ users: nextUsers });
      return {
        success: true,
        mustResetPassword: true,
        message: res.details.message || 'Please choose a permanent password to continue.',
        user: resetUser,
      };
    }

    const token = res.details?.token as string | undefined;
    const serverUser = res.details?.user as User | undefined;

    if (!token || !serverUser || isJwtExpired(token)) {
      return {
        success: false,
        message: 'Authentication server returned an invalid or expired session token.',
      };
    }

    if (serverUser.status === 'PENDING_APPROVAL') {
      return {
        success: false,
        message: 'Your account is pending approval by an administrator. Please check back shortly.',
      };
    }

    if (serverUser.status === 'DENIED') {
      return {
        success: false,
        message: 'Access has been denied for this account. Contact your administrator.',
      };
    }

    const existingIdx = get().users.findIndex(
      (u) => u.id === serverUser.id || u.email.toLowerCase() === serverUser.email.toLowerCase()
    );
    const nextUsers =
      existingIdx >= 0
        ? get().users.map((u, idx) => (idx === existingIdx ? { ...u, ...serverUser } : u))
        : [...get().users, serverUser];

    saveToStorage('users', nextUsers);
    saveToStorage('authToken', token);
    saveToStorage('currentUser', serverUser);
    set({
      users: nextUsers,
      authToken: token,
      currentUser: serverUser,
      isAuthenticated: true,
      sessionExpiredMessage: null,
    });

    // Retain and re-apply base font size upon every login
    applyBaseFontSize(get().baseFontSize);

    // Establish live server connection and hydrate latest database on login
    get().connectAndHydrateServer();

    return { success: true, message: `Welcome back, ${serverUser.name}!`, user: serverUser };
  },

  refreshSessionToken: async () => {
    const { backendUrl, authToken } = get();
    if (!backendUrl || !authToken) {
      get().logout('Your session has expired. Please sign in again.');
      return { success: false, message: 'Your session has expired. Please sign in again.' };
    }

    const res = await pushToGoogleSheet(backendUrl, 'refreshToken', { authToken });
    const freshToken = res.details?.token as string | undefined;

    if (res.success && freshToken && !isJwtExpired(freshToken)) {
      const freshUser = (res.details?.user as User | undefined) || get().currentUser;
      saveToStorage('authToken', freshToken);
      if (freshUser) {
        saveToStorage('currentUser', freshUser);
      }
      set({
        authToken: freshToken,
        currentUser: freshUser || null,
        sessionExpiredMessage: null,
      });
      return { success: true };
    }

    get().logout('Your session has expired. Please sign in again.');
    return {
      success: false,
      message: res.error || res.details?.message || 'Your session has expired. Please sign in again.',
    };
  },

  checkSessionExpiry: () => {
    const { isAuthenticated, authToken } = get();
    if (isAuthenticated && (!authToken || isJwtExpired(authToken))) {
      get().logout('Your session has expired. Please sign in again.');
    }
  },

  resetPassword: async (userId: string, newPassword: string) => {
    const cleanPass = newPassword.trim();
    if (cleanPass.length < 4) {
      return { success: false, message: 'Password must be at least 4 characters.' };
    }
    const newHash = await hashPassword(cleanPass);
    const updated = get().users.map((u) => 
      u.id === userId ? { ...u, passwordHash: newHash, password: cleanPass, mustResetPassword: false } : u
    );
    saveToStorage('users', updated);
    const updatedUser = updated.find((u) => u.id === userId);
    set({ users: updated });

    if (updatedUser) {
      await get().triggerSync('resetPassword', { email: updatedUser.email, newPasswordHash: newHash });
      if (updatedUser.status === 'APPROVED') {
        // Perform backend login to obtain a valid 1-hour JWT after resetting temp password
        const loginRes = await get().login(updatedUser.email, cleanPass);
        if (loginRes.success) {
          return { success: true, message: 'Password successfully updated.' };
        }
      }
    }
    saveToStorage('currentUser', null);
    saveToStorage('authToken', null);
    set({ currentUser: null, authToken: null, isAuthenticated: false });
    return { success: true, message: 'Password successfully updated. Please sign in.' };
  },

  forgotPassword: async (email: string) => {
    let cleanEmail = normalizeEmail(email);
    const user = get().users.find((u) => {
      const uEmail = normalizeEmail(u.email);
      return (
        uEmail === cleanEmail ||
        ((cleanEmail === 'dev.snehit@gmail.com' || cleanEmail === 'dev.snehit@gmail') &&
          (uEmail === 'dev.snehit@gmail.com' || uEmail === 'dev.snehit@gmail'))
      );
    });

    if (!user) {
      return { success: false, message: 'No registered user found with this email address.' };
    }

    const resetToken = crypto.randomUUID ? crypto.randomUUID() : 'rst-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour validity

    let baseUrl = 'https://dev-snehit.github.io/katha-app/';
    if (typeof window !== 'undefined' && window.location) {
      baseUrl = window.location.origin + window.location.pathname;
    }
    const resetLink = `${baseUrl}?resetToken=${resetToken}`;

    const tempPassword = generateTemporaryPassword();
    const tempHash = await hashPassword(tempPassword);

    const updated = get().users.map((u) =>
      u.id === user.id
        ? {
            ...u,
            resetPasswordToken: resetToken,
            resetPasswordExpires: expiresAt,
            passwordHash: tempHash,
            password: tempPassword,
            mustResetPassword: true,
          }
        : u
    );
    saveToStorage('users', updated);
    set({ users: updated });

    get().triggerSync('forgotPassword', {
      email: cleanEmail,
      resetToken,
      resetLink,
      expiresAt,
      name: user.name,
      tempPassword,
      passwordHash: tempHash,
    });

    return { 
      success: true, 
      message: `A unique password reset link has been dispatched to ${cleanEmail}. Check your email.`,
      tempPassword,
      resetToken,
      resetLink
    };
  },

  validateResetToken: (token: string) => {
    if (!token || !token.trim()) {
      return { valid: false, error: 'Reset token is required.' };
    }
    const cleanToken = token.trim();
    const user = get().users.find((u) => u.resetPasswordToken === cleanToken);
    if (!user) {
      return { valid: false, error: 'Invalid or unrecognized password reset link.' };
    }
    if (user.resetPasswordExpires) {
      const expiry = new Date(user.resetPasswordExpires).getTime();
      if (Date.now() > expiry) {
        return { valid: false, error: 'This password reset link has expired. Please request a new one.' };
      }
    }
    return { valid: true, user };
  },

  resetPasswordWithToken: async (token: string, newPassword: string) => {
    const validation = get().validateResetToken(token);
    if (!validation.valid || !validation.user) {
      return { success: false, message: validation.error || 'Invalid or expired password reset link.' };
    }
    const user = validation.user;
    const cleanPass = newPassword.trim();
    if (cleanPass.length < 4) {
      return { success: false, message: 'Password must be at least 4 characters.' };
    }
    const newHash = await hashPassword(cleanPass);
    const updated = get().users.map((u) =>
      u.id === user.id
        ? {
            ...u,
            passwordHash: newHash,
            password: cleanPass,
            mustResetPassword: false,
            resetPasswordToken: undefined,
            resetPasswordExpires: undefined,
          }
        : u
    );
    saveToStorage('users', updated);
    const updatedUser = updated.find((u) => u.id === user.id)!;
    // Do not auto-login after resetting password via link; redirect user to login page
    // (especially important for PENDING_APPROVAL users who must wait for admin approval)
    saveToStorage('currentUser', null);
    set({ users: updated, currentUser: null, isAuthenticated: false });

    get().triggerSync('resetPassword', { email: user.email, newPasswordHash: newHash });
    get().connectAndHydrateServer();
    return { success: true, message: 'Password successfully updated. Please sign in.', user: updatedUser };
  },

  logout: (expiredReason?: string) => {
    saveToStorage('currentUser', null);
    saveToStorage('authToken', null);
    set({
      currentUser: null,
      authToken: null,
      isAuthenticated: false,
      sessionExpiredMessage: expiredReason ?? null,
    });
  },

  language: loadFromStorage<SupportedLanguage>('lang', 'EN'),
  setLanguage: (lang) => {
    saveToStorage('lang', lang);
    set({ language: lang });
  },

  baseFontSize: initialBaseFontSize,
  setBaseFontSize: (size: number) => {
    const clamped = Math.max(12, Math.min(26, Math.round(size)));
    saveToStorage('baseFontSize', clamped);
    applyBaseFontSize(clamped);
    set({ baseFontSize: clamped });
  },

  isConnectingServer: false,
  setIsConnectingServer: (status: boolean) => set({ isConnectingServer: status }),

  actionLoading: null,
  setActionLoading: (loading) => set({ actionLoading: loading }),
  startActionLoading: (message, messageTe) => set({ actionLoading: { isLoading: true, message, messageTe } }),
  stopActionLoading: () => set({ actionLoading: null }),

  toasts: [],
  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set((state) => ({ toasts: [...state.toasts.slice(-4), { ...toast, id }] }));
    const duration = toast.durationMs ?? 4500;
    if (duration > 0 && typeof setTimeout !== 'undefined') {
      setTimeout(() => {
        get().dismissToast(id);
      }, duration);
    }
  },
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  
  // Clean empty state: zero mock/sample data
  orders: loadFromStorage<Order[]>('orders', []),
  inventory: loadFromStorage<Product[]>('inventory', []),
  customers: loadFromStorage<Customer[]>('customers', []),
  suppliers: loadFromStorage<Supplier[]>('suppliers', []),
  followUps: loadFromStorage<FollowUp[]>('followUps', []),

  // Google Sheets live sync connection
  backendUrl: initialBackendUrl,
  syncStatus: initialBackendUrl ? 'IDLE' : 'UNLINKED',
  lastSyncTime: null,
  syncError: null,

  setBackendUrl: (url) => {
    if (DEFAULT_SERVER_URL) {
      saveToStorage('backendUrl', '');
      set({
        backendUrl: DEFAULT_SERVER_URL,
        syncStatus: 'IDLE',
        syncError: null
      });
      return;
    }
    const trimmed = url.trim();
    saveToStorage('backendUrl', trimmed);
    set({ 
      backendUrl: trimmed, 
      syncStatus: trimmed ? 'IDLE' : 'UNLINKED',
      syncError: null 
    });
  },

  triggerSync: async (action: string, payload: Record<string, any> = {}) => {
    const { backendUrl, authToken } = get();
    if (!backendUrl) {
      set({ syncStatus: 'UNLINKED' });
      return;
    }

    const actionLabels: Record<string, { loadingEn: string; loadingTe: string; okEn: string; okTe: string }> = {
      saveOrder: { loadingEn: 'Saving order to database...', loadingTe: 'ఆర్డర్ డేటాబేస్‌లో సేవ్ అవుతోంది...', okEn: 'Order saved to database.', okTe: 'ఆర్డర్ డేటాబేస్‌లో సేవ్ చేయబడింది.' },
      updateOrderStatus: { loadingEn: 'Updating order status...', loadingTe: 'ఆర్డర్ స్థితి అప్‌డేట్ అవుతోంది...', okEn: 'Order status updated in database.', okTe: 'ఆర్డర్ స్థితి డేటాబేస్‌లో అప్‌డేట్ చేయబడింది.' },
      deleteOrder: { loadingEn: 'Deleting order from database...', loadingTe: 'ఆర్డర్ తొలగించబడుతోంది...', okEn: 'Order deleted from database.', okTe: 'ఆర్డర్ డేటాబేస్ నుండి తొలగించబడింది.' },
      saveProduct: { loadingEn: 'Saving stock item to database...', loadingTe: 'స్టాక్ వివరాలు సేవ్ అవుతున్నాయి...', okEn: 'Stock item saved to database.', okTe: 'స్టాక్ వివరాలు డేటాబేస్‌లో సేవ్ చేయబడ్డాయి.' },
      deleteProduct: { loadingEn: 'Deleting stock item...', loadingTe: 'స్టాక్ తొలగించబడుతోంది...', okEn: 'Stock item deleted from database.', okTe: 'స్టాక్ డేటాబేస్ నుండి తొలగించబడింది.' },
      saveCustomer: { loadingEn: 'Saving customer to database...', loadingTe: 'కస్టమర్ వివరాలు సేవ్ అవుతున్నాయి...', okEn: 'Customer saved to database.', okTe: 'కస్టమర్ వివరాలు సేవ్ చేయబడ్డాయి.' },
      deleteCustomer: { loadingEn: 'Deleting customer...', loadingTe: 'కస్టమర్ తొలగించబడుతున్నారు...', okEn: 'Customer deleted from database.', okTe: 'కస్టమర్ డేటాబేస్ నుండి తొలగించబడ్డారు.' },
      saveSupplier: { loadingEn: 'Saving supplier to database...', loadingTe: 'సప్లయర్ వివరాలు సేవ్ అవుతున్నాయి...', okEn: 'Supplier saved to database.', okTe: 'సప్లయర్ వివరాలు సేవ్ చేయబడ్డాయి.' },
      deleteSupplier: { loadingEn: 'Deleting supplier...', loadingTe: 'సప్లయర్ తొలగించబడుతున్నారు...', okEn: 'Supplier deleted from database.', okTe: 'సప్లయర్ డేటాబేస్ నుండి తొలగించబడ్డారు.' },
      createUser: { loadingEn: 'Creating user in database...', loadingTe: 'యూజర్ ఖాతా సృష్టించబడుతోంది...', okEn: 'User created in database.', okTe: 'యూజర్ ఖాతా డేటాబేస్‌లో సృష్టించబడింది.' },
      registerUser: { loadingEn: 'Submitting request to database...', loadingTe: 'అభ్యర్థన డేటాబేస్‌కు పంపబడుతోంది...', okEn: 'Access request saved to database.', okTe: 'యాక్సెస్ అభ్యర్థన డేటాబేస్‌లో సేవ్ చేయబడింది.' },
      approveUser: { loadingEn: 'Updating user approval...', loadingTe: 'యూజర్ ఆమోదం అప్‌డేట్ అవుతోంది...', okEn: 'User approval updated in database.', okTe: 'యూజర్ ఆమోదం డేటాబేస్‌లో అప్‌డేట్ చేయబడింది.' },
      updateUser: { loadingEn: 'Updating user details...', loadingTe: 'యూజర్ వివరాలు అప్‌డేట్ అవుతున్నాయి...', okEn: 'User details updated in database.', okTe: 'యూజర్ వివరాలు అప్‌డేట్ చేయబడ్డాయి.' },
      deleteUser: { loadingEn: 'Deleting user...', loadingTe: 'యూజర్ తొలగించబడుతున్నారు...', okEn: 'User removed from database.', okTe: 'యూజర్ డేటాబేస్ నుండి తొలగించబడ్డారు.' },
      saveRolePermissions: { loadingEn: 'Saving role permissions...', loadingTe: 'రోల్ అనుమతులు సేవ్ అవుతున్నాయి...', okEn: 'Role permissions saved to database.', okTe: 'రోల్ అనుమతులు డేటాబేస్‌లో సేవ్ చేయబడ్డాయి.' },
      resetPassword: { loadingEn: 'Updating password in database...', loadingTe: 'పాస్‌వర్డ్ అప్‌డేట్ అవుతోంది...', okEn: 'Password updated in database.', okTe: 'పాస్‌వర్డ్ డేటాబేస్‌లో అప్‌డేట్ చేయబడింది.' },
      saveFollowUp: { loadingEn: 'Saving follow-up lead...', loadingTe: 'ఫాలో-అప్ వివరాలు సేవ్ అవుతున్నాయి...', okEn: 'Follow-up saved to database.', okTe: 'ఫాలో-అప్ వివరాలు డేటాబేస్‌లో సేవ్ చేయబడ్డాయి.' },
      deleteFollowUp: { loadingEn: 'Deleting follow-up...', loadingTe: 'ఫాలో-అప్ తొలగించబడుతోంది...', okEn: 'Follow-up deleted from database.', okTe: 'ఫాలో-అప్ డేటాబేస్ నుండి తొలగించబడింది.' },
      masterResetDatabase: { loadingEn: 'Resetting database and creating default Admin...', loadingTe: 'డేటాబేస్ రీసెట్ & డిఫాల్ట్ అడ్మిన్ సృష్టిస్తోంది...', okEn: 'Master reset complete. Default Admin created.', okTe: 'మాస్టర్ రీసెట్ పూర్తయింది. డిఫాల్ట్ అడ్మిన్ సృష్టించబడ్డారు.' },
    };

    const labels = actionLabels[action];
    const startedSpinnerHere = Boolean(labels && !get().actionLoading?.isLoading);
    if (startedSpinnerHere && labels) {
      set({ actionLoading: { isLoading: true, message: labels.loadingEn, messageTe: labels.loadingTe } });
    }

    const user = get().currentUser;
    const enrichedPayload = {
      ...payload,
      ...(authToken ? { authToken } : {}),
      userRole: payload?.userRole || user?.role || 'STAFF',
      userId: payload?.userId || user?.id,
    };

    set({ syncStatus: 'SYNCING', syncError: null });
    try {
      const res = await pushToGoogleSheet(backendUrl, action, enrichedPayload);
      if (res.code === 'TOKEN_EXPIRED' || res.code === 'UNAUTHORIZED') {
        get().logout('Your session has expired. Please sign in again.');
        set({
          syncStatus: 'ERROR',
          syncError: res.error || 'Session expired',
        });
        get().addToast({
          type: 'error',
          title: 'Session Expired',
          titleTe: 'సెషన్ గడువు ముగిసింది',
          message: 'Your session has expired. Please sign in again.',
          messageTe: 'మీ సెషన్ గడువు ముగిసింది. దయచేసి మళ్లీ లాగిన్ అవ్వండి.',
        });
        return;
      }
      if (res.success) {
        const srvId = res.details?.id as string | undefined;
        const srvOrderNo = res.details?.orderNumber as string | undefined;
        const srvVer = res.details?.version !== undefined ? Number(res.details.version) : undefined;

        if (srvId || srvOrderNo || srvVer !== undefined) {
          if (action === 'saveOrder' && payload.order?.id) {
            const clientId = payload.order.id;
            const updatedOrders = get().orders.map((o) =>
              o.id === clientId
                ? { ...o, ...(srvId ? { id: srvId } : {}), ...(srvOrderNo ? { orderNumber: srvOrderNo } : {}), ...(srvVer !== undefined ? { version: srvVer } : {}) }
                : o
            );
            saveToStorage('orders', updatedOrders);
            set({ orders: updatedOrders });
          } else if (action === 'updateOrderStatus' && payload.orderId && srvVer !== undefined) {
            const updatedOrders = get().orders.map((o) =>
              o.id === payload.orderId ? { ...o, version: srvVer } : o
            );
            saveToStorage('orders', updatedOrders);
            set({ orders: updatedOrders });
          } else if (action === 'saveProduct' && payload.product?.id) {
            const clientId = payload.product.id;
            const updatedInv = get().inventory.map((p) =>
              p.id === clientId ? { ...p, ...(srvId ? { id: srvId } : {}), ...(srvVer !== undefined ? { version: srvVer } : {}) } : p
            );
            saveToStorage('inventory', updatedInv);
            set({ inventory: updatedInv });
          } else if (action === 'saveCustomer' && payload.customer?.id) {
            const clientId = payload.customer.id;
            const updatedCust = get().customers.map((c) =>
              c.id === clientId ? { ...c, ...(srvId ? { id: srvId } : {}), ...(srvVer !== undefined ? { version: srvVer } : {}) } : c
            );
            saveToStorage('customers', updatedCust);
            set({ customers: updatedCust });
          } else if (action === 'saveSupplier' && payload.supplier?.id) {
            const clientId = payload.supplier.id;
            const updatedSupp = get().suppliers.map((s) =>
              s.id === clientId ? { ...s, ...(srvId ? { id: srvId } : {}), ...(srvVer !== undefined ? { version: srvVer } : {}) } : s
            );
            saveToStorage('suppliers', updatedSupp);
            set({ suppliers: updatedSupp });
          } else if (action === 'saveFollowUp' && payload.followUp?.id) {
            const clientId = payload.followUp.id;
            const updatedFu = get().followUps.map((f) =>
              f.id === clientId ? { ...f, ...(srvId ? { id: srvId } : {}), ...(srvVer !== undefined ? { version: srvVer } : {}) } : f
            );
            saveToStorage('followUps', updatedFu);
            set({ followUps: updatedFu });
          } else if ((action === 'createUser' || action === 'registerUser' || action === 'approveUser' || action === 'updateUser')) {
            const clientUserId = payload.user?.id || payload.userId;
            if (clientUserId) {
              const updatedUsers = get().users.map((u) =>
                u.id === clientUserId ? { ...u, ...(srvId ? { id: srvId } : {}), ...(srvVer !== undefined ? { version: srvVer } : {}) } : u
              );
              saveToStorage('users', updatedUsers);
              set({ users: updatedUsers });
            }
          }
        }

        set({
          syncStatus: 'SYNCED',
          lastSyncTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          syncError: null
        });
        if (labels) {
          get().addToast({
            type: 'success',
            title: 'Saved to Database',
            titleTe: 'డేటాబేస్‌లో సేవ్ అయింది',
            message: labels.okEn,
            messageTe: labels.okTe,
          });
        }
      } else {
        const rawErr = res.details?.message || res.error || 'Failed to sync changes with Backend Database.';
        const code = res.code || res.details?.code;
        const mappedErrors: Record<string, { en: string; te: string }> = {
          DUPLICATE_KEY: {
            en: `Duplicate record detected: ${rawErr}`,
            te: `ఈ వివరాలు ఇప్పటికే డేటాబేస్‌లో ఉన్నాయి: ${rawErr}`,
          },
          FOREIGN_KEY_VIOLATION: {
            en: `Cannot complete action because related records exist or are missing: ${rawErr}`,
            te: `సంబంధిత రికార్డులు ఉన్నందున లేదా లేనందున ఈ చర్య సాధ్యం కాదు: ${rawErr}`,
          },
          CHECK_CONSTRAINT_FAILED: {
            en: `Validation check failed: ${rawErr}`,
            te: `డేటా నియమాలు సరిపోలలేదు: ${rawErr}`,
          },
          CONFLICT_STALE_VERSION: {
            en: 'Another user updated this record. Refreshing latest data from server...',
            te: 'మరొకరు ఈ రికార్డును మార్చారు. తాజా డేటా రీఫ్రెష్ అవుతోంది...',
          },
          FORBIDDEN: {
            en: `Permission denied for your role: ${rawErr}`,
            te: `మీ పాత్రకు ఈ చర్యకు అనుమతి లేదు: ${rawErr}`,
          },
          NOT_FOUND: {
            en: `Record no longer exists on server: ${rawErr}`,
            te: `ఈ రికార్డు సర్వర్‌లో కనుగొనబడలేదు: ${rawErr}`,
          },
        };
        const mapped = code && mappedErrors[code] ? mappedErrors[code] : null;
        const errMsg = mapped ? mapped.en : rawErr;
        const errMsgTe = mapped ? mapped.te : `డేటాబేస్‌లో సేవ్ చేయడం విఫలమైంది: ${rawErr}`;

        set({
          syncStatus: 'ERROR',
          syncError: errMsg
        });
        get().addToast({
          type: 'error',
          title: code === 'CONFLICT_STALE_VERSION' ? 'Data Out of Date' : 'Database Save Failed',
          titleTe: code === 'CONFLICT_STALE_VERSION' ? 'పాత డేటా లోపం' : 'డేటాబేస్ సేవ్ విఫలమైంది',
          message: errMsg,
          messageTe: errMsgTe,
        });

        if (code === 'CONFLICT_STALE_VERSION') {
          get().connectAndHydrateServer();
        }
      }
    } finally {
      if (startedSpinnerHere) {
        set({ actionLoading: null });
      }
    }
  },

  syncAllToGoogleSheets: async () => {
    const { backendUrl, authToken, inventory, customers, suppliers, orders, users } = get();
    if (!backendUrl) {
      set({ syncStatus: 'UNLINKED', syncError: 'Database Webhook URL not configured.' });
      return false;
    }

    set({ isConnectingServer: true, syncStatus: 'SYNCING', syncError: null });
    try {
      const res = await pushToGoogleSheet(backendUrl, 'syncAll', {
        ...(authToken ? { authToken } : {}),
        products: inventory,
        customers,
        suppliers,
        orders,
        users
      });

      if (res.code === 'TOKEN_EXPIRED' || res.code === 'UNAUTHORIZED') {
        get().logout('Your session has expired. Please sign in again.');
        set({
          syncStatus: 'ERROR',
          syncError: res.error || 'Session expired',
        });
        return false;
      }

      if (res.success) {
        set({
          syncStatus: 'SYNCED',
          lastSyncTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          syncError: null
        });
        get().addToast({
          type: 'success',
          title: 'Database Synced',
          titleTe: 'డేటాబేస్ సింక్ అయింది',
          message: 'All records have been saved to Google Sheets.',
          messageTe: 'అన్ని రికార్డులు Google Sheetsలో సేవ్ చేయబడ్డాయి.',
        });
        return true;
      } else {
        const errMsg = res.error || 'Batch sync failed';
        set({
          syncStatus: 'ERROR',
          syncError: errMsg
        });
        get().addToast({
          type: 'error',
          title: 'Database Sync Failed',
          titleTe: 'డేటాబేస్ సింక్ విఫలమైంది',
          message: errMsg,
          messageTe: `డేటాబేస్ సింక్ విఫలమైంది: ${errMsg}`,
        });
        return false;
      }
    } finally {
      set({ isConnectingServer: false });
    }
  },

  connectAndHydrateServer: async () => {
    const { backendUrl, authToken } = get();
    if (!backendUrl) return false;

    set({ isConnectingServer: true, syncStatus: 'SYNCING', syncError: null });

    try {
      const res = await pullFromGoogleSheet(backendUrl, authToken);
      if (res.code === 'TOKEN_EXPIRED' || res.code === 'UNAUTHORIZED') {
        get().logout('Your session has expired. Please sign in again.');
        set({
          syncStatus: 'ERROR',
          syncError: res.error || 'Session expired',
        });
        return false;
      }
      if (res.success && res.data) {
        const {
          Master_Products = [],
          Master_Customers = [],
          Master_Suppliers = [],
          Master_Orders_Sales = [],
          Pending_Orders = [],
          Users = []
        } = res.data;

        // Hydrate Products if available in sheet
        if (Array.isArray(Master_Products) && Master_Products.length > 0) {
          const hydratedProducts: Product[] = Master_Products.map((row: any) => {
            const innerCount = Number(row.inner_count || row.innerBagsPerOuter || 25);
            const priceBag = Number(row.price_bag || row.wholesalePriceBag || 0);
            return {
              id: row.id || crypto.randomUUID(),
              name: row.name_en || row.name || 'Rice',
              nameTe: row.name_te || row.nameTe || '',
              category: row.category || 'RICE',
              categoryTe: row.category_te || row.categoryTe || '',
              brandOrMill: row.brand_en || row.brandOrMill || '',
              brandOrMillTe: row.brand_te || row.brandOrMillTe || '',
              innerBagWeightKg: Number(row.inner_wt_kg || row.innerBagWeightKg || 1),
              innerBagsPerOuter: innerCount,
              outerBagTotalKg: Number(row.outer_wt_kg || row.outerBagTotalKg || 25),
              stockPhysicalOuter: Number(row.stock_physical || row.stockPhysicalOuter || 0),
              stockReservedOuter: Number(row.stock_reserved || row.stockReservedOuter || 0),
              stockLooseInner: Number(row.stock_loose || row.stockLooseInner || 0),
              stockLooseKg: Number(row.stock_loose_kg || 0),
              wholesalePriceBag: priceBag,
              costPricePerBag: Number(row.cost_bag || row.costPricePerBag || 0),
              pricePerInnerBag: Number(row.price_inner || (innerCount > 0 ? priceBag / innerCount : 0)),
              retailPriceBag: Number(row.retail_price_bag || row.retailPriceBag || 0),
            };
          });
          saveToStorage('inventory', hydratedProducts);
          set({ inventory: hydratedProducts });
        }

        // Hydrate Customers if available in sheet
        if (Array.isArray(Master_Customers) && Master_Customers.length > 0) {
          const hydratedCustomers: Customer[] = Master_Customers.map((row: any) => ({
            id: row.id || crypto.randomUUID(),
            name: row.name_en || row.name || '',
            nameTe: row.name_te || row.nameTe || '',
            phone: String(row.phone || ''),
            businessName: row.business_en || row.businessName || '',
            businessNameTe: row.business_te || row.businessNameTe || '',
            address: row.address_en || row.address || '',
            addressTe: row.address_te || row.addressTe || '',
            currentDue: Number(row.current_due || row.currentDue || 0),
            createdAt: row.createdAt || new Date().toISOString(),
          }));
          saveToStorage('customers', hydratedCustomers);
          set({ customers: hydratedCustomers });
        }

        // Hydrate Suppliers if available in sheet
        if (Array.isArray(Master_Suppliers) && Master_Suppliers.length > 0) {
          const hydratedSuppliers: Supplier[] = Master_Suppliers.map((row: any) => ({
            id: row.id || crypto.randomUUID(),
            businessName: row.business_en || row.businessName || '',
            businessNameTe: row.business_te || row.businessNameTe || '',
            ownerName: row.owner_en || row.ownerName || '',
            ownerNameTe: row.owner_te || row.ownerNameTe || '',
            bankName: row.bank_name || row.bankName || '',
            accountNumber: String(row.account_no || row.accountNumber || ''),
            ifscCode: row.ifsc_code || row.ifscCode || '',
            nickname: row.nickname_en || row.nickname || '',
            nicknameTe: row.nickname_te || row.nicknameTe || '',
            payableAmount: Number(row.payable_amount || row.payableAmount || 0),
            version: row.version ? Number(row.version) : undefined,
            createdAt: row.createdAt || new Date().toISOString(),
          }));
          saveToStorage('suppliers', hydratedSuppliers);
          set({ suppliers: hydratedSuppliers });
        }

        // Hydrate Follow-Ups if available in sheet
        const Follow_Ups = (res.data as any).Follow_Ups;
        if (Array.isArray(Follow_Ups) && Follow_Ups.length > 0) {
          const hydratedFollowUps: FollowUp[] = Follow_Ups.map((row: any) => ({
            id: row.id || crypto.randomUUID(),
            name: row.name || '',
            phone: String(row.phone || ''),
            address: row.address || '',
            purpose: row.purpose || '',
            followUpDate: row.follow_up_date || row.followUpDate || '',
            notes: row.notes || '',
            status: (row.status || 'OPEN') as FollowUp['status'],
            version: row.version ? Number(row.version) : undefined,
            createdAt: row.created_at || row.createdAt || new Date().toISOString(),
          }));
          saveToStorage('followUps', hydratedFollowUps);
          set({ followUps: hydratedFollowUps });
        }

        // Hydrate Orders if available in sheet
        const allOrders = [...Pending_Orders, ...Master_Orders_Sales];
        if (Array.isArray(allOrders) && allOrders.length > 0) {
          const hydratedOrders: Order[] = allOrders.map((row: any) => ({
            id: row.id || crypto.randomUUID(),
            orderNumber: row.order_no || row.orderNumber || 'ORD-1001',
            customerId: row.customer_id || row.customerId || '',
            customerName: row.customer_name || row.customerName || '',
            customerPhone: String(row.customer_phone || row.customerPhone || ''),
            orderDate: row.date || row.orderDate || new Date().toISOString(),
            createdAt: row.createdAt || new Date().toISOString(),
            items: [],
            totalOuterBags: Number(row.total_bags || row.totalOuterBags || 0),
            totalInnerBags: Number(row.total_inner_bags || 0),
            totalWeightKg: Number(row.total_weight_kg || row.totalWeightKg || 0),
            subtotal: Number(row.subtotal || row.grand_total || 0),
            discount: Number(row.discount || 0),
            hamaliCharges: 0,
            transportCharges: 0,
            grandTotal: Number(row.grand_total || row.grandTotal || 0),
            paymentMode: (row.payment_mode || 'CREDIT') as any,
            status: (row.status || 'PENDING_REVIEW') as any,
            submittedByRole: (row.approved_by || row.submitted_by || 'STAFF') as any,
          }));
          saveToStorage('orders', hydratedOrders);
          set({ orders: hydratedOrders });
        }

        // Hydrate & merge Users with strict duplicate-free mapping
        if (Array.isArray(Users) && Users.length > 0) {
          const currentUsers = get().users;
          const userMap = new Map<string, User>();
          const phoneMap = new Map<string, string>(); // phone -> emailKey

          currentUsers.forEach((u) => {
            const emailKey = normalizeEmail(u.email);
            const phoneKey = normalizePhone(u.phone);
            userMap.set(emailKey, u);
            if (phoneKey.length === 10) phoneMap.set(phoneKey, emailKey);
          });

          Users.forEach((u: any) => {
            const cleanEmail = normalizeEmail(u.email);
            const cleanPhone = normalizePhone(String(u.phone || ''));
            const passHash = u.passwordHash || u[''] || '';

            // Match by email or by phone to merge duplicates
            let existingKey = cleanEmail;
            if (!userMap.has(existingKey) && cleanPhone.length === 10 && phoneMap.has(cleanPhone)) {
              existingKey = phoneMap.get(cleanPhone)!;
            }

            const existing = userMap.get(existingKey);
            const serverReqRole = u.requestedRole ? (u.requestedRole as Role) : undefined;
            const serverReqName = u.requestedName ? String(u.requestedName) : undefined;
            if (existing) {
              const updated = {
                ...existing,
                name: u.name || existing.name,
                role: (u.role || existing.role) as Role,
                status: (u.status || existing.status) as UserStatus,
                phone: cleanPhone || existing.phone,
                requestedRole: serverReqRole !== undefined ? serverReqRole : existing.requestedRole,
                requestedName: serverReqName !== undefined ? serverReqName : existing.requestedName,
                ...(passHash ? { passwordHash: passHash } : {})
              };
              userMap.set(existingKey, updated);
            } else {
              const newUser: User = {
                id: u.id || (crypto.randomUUID ? crypto.randomUUID() : `u-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
                name: u.name || 'User',
                email: cleanEmail,
                phone: cleanPhone || '9999999999',
                role: (u.role || 'STAFF') as Role,
                status: (u.status || 'PENDING_APPROVAL') as UserStatus,
                createdAt: u.createdAt || new Date().toISOString(),
                ...(serverReqRole ? { requestedRole: serverReqRole } : {}),
                ...(serverReqName ? { requestedName: serverReqName } : {}),
                ...(passHash ? { passwordHash: passHash } : {})
              };
              userMap.set(cleanEmail, newUser);
              if (cleanPhone.length === 10) phoneMap.set(cleanPhone, cleanEmail);
            }
          });

          const merged = Array.from(userMap.values());
          saveToStorage('users', merged);
          set({ users: merged });

          // Synchronize active session if user profile or status updated on server
          const activeUser = get().currentUser;
          if (activeUser) {
            const freshUser = merged.find(
              (u) => u.id === activeUser.id || u.email.toLowerCase() === activeUser.email.toLowerCase()
            );
            if (freshUser) {
              if (freshUser.status === 'DENIED') {
                get().logout();
              } else {
                saveToStorage('currentUser', freshUser);
                set({ currentUser: freshUser });
              }
            }
          }
        }

        // Hydrate Role Permissions matrix if returned by backend
        const incomingRolePerms = res.data.rolePermissions || res.data.Role_Permissions;
        if (incomingRolePerms) {
          const mergedPerms = mergeWithDefaultPermissions(incomingRolePerms);
          saveToStorage('role_permissions', mergedPerms);
          set({ rolePermissions: mergedPerms });
        }

        set({
          syncStatus: 'SYNCED',
          lastSyncTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          syncError: null
        });
        return true;
      } else {
        // Fallback: ping check
        set({
          syncStatus: 'SYNCED',
          lastSyncTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          syncError: null
        });
        return true;
      }
    } catch (err: any) {
      console.warn('[Kaatha Sync] Hydration failed, keeping local state:', err);
      set({
        syncStatus: 'ERROR',
        syncError: err.message || 'Server connection failed'
      });
      return false;
    } finally {
      set({ isConnectingServer: false });
    }
  },

  lockManagedSheets: async () => {
    const { backendUrl, authToken } = get();
    if (!backendUrl) return false;
    const res = await lockRemoteSheets(backendUrl, authToken);
    if (res.code === 'TOKEN_EXPIRED' || res.code === 'UNAUTHORIZED') {
      get().logout('Your session has expired. Please sign in again.');
      return false;
    }
    return res.success;
  },

  setCurrentUser: (user) => {
    saveToStorage('currentUser', user);
    set({ currentUser: user, isAuthenticated: !!user });
  },
  
  createUser: async (userData: { name: string; email: string; phone: string; role: Role }) => {
    const normEmail = normalizeEmail(userData.email);
    const normPhone = normalizePhone(userData.phone);

    // 1. Check duplicate email: no user allowed with already used email
    const existingEmail = get().users.find((u) => {
      const uEmail = normalizeEmail(u.email);
      return (
        uEmail === normEmail ||
        ((normEmail === 'dev.snehit@gmail.com' || normEmail === 'dev.snehit@gmail') &&
          (uEmail === 'dev.snehit@gmail.com' || uEmail === 'dev.snehit@gmail'))
      );
    });

    if (existingEmail) {
      return {
        success: false,
        message: 'An account with this email address already exists in the database.',
      };
    }

    // 2. Check duplicate phone: no user allowed with already used mobile number
    if (normPhone) {
      const existingPhone = get().users.find((u) => {
        const uPhone = normalizePhone(u.phone);
        return uPhone.length >= 10 && uPhone === normPhone;
      });

      if (existingPhone) {
        return {
          success: false,
          message: 'An account with this mobile number already exists in the database.',
        };
      }
    }

    // 3. Generate a secure temporary password e.g. Kaatha@7482
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const tempPassword = `Kaatha@${randomDigits}`;
    const passwordHash = await hashPassword(tempPassword);

    // 4. Generate unique password reset token and link
    const resetToken = `rst-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours valid
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const basePath = typeof window !== 'undefined' && window.location.pathname.startsWith('/katha-app') ? '/katha-app' : '';
    const resetLink = `${origin}${basePath}/reset-password/${resetToken}`;

    const newUser: User = {
      id: crypto.randomUUID ? crypto.randomUUID() : `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: userData.name.trim(),
      email: normEmail,
      phone: normPhone,
      role: userData.role,
      status: 'APPROVED',
      createdAt: new Date().toISOString(),
      password: tempPassword,
      passwordHash: passwordHash,
      mustResetPassword: true,
      resetPasswordToken: resetToken,
      resetPasswordExpires: expiresAt,
    };

    const updated = [...get().users, newUser];
    saveToStorage('users', updated);
    set({ users: updated });

    // Sync directly to the database via createUser action
    await get().triggerSync('createUser', { 
      user: newUser, 
      tempPassword, 
      resetLink,
      resetToken,
      expiresAt 
    });

    return {
      success: true,
      message: 'User account created in database with temporary password and password setup link dispatched.',
      user: newUser,
      tempPassword,
      resetLink,
    };
  },

  masterResetDatabase: async () => {
    const normEmail = normalizeEmail('dev.snehit@gmail.com');
    const normPhone = normalizePhone('9032447447');
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const tempPassword = `Kaatha@${randomDigits}`;
    const passwordHash = await hashPassword(tempPassword);
    const resetToken = `rst-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const basePath = typeof window !== 'undefined' && window.location.pathname.startsWith('/katha-app') ? '/katha-app' : '';
    const resetLink = `${origin}${basePath}/reset-password/${resetToken}`;

    const defaultAdmin: User = {
      id: crypto.randomUUID ? crypto.randomUUID() : `usr-${Date.now()}-admin`,
      name: 'Administrator',
      email: normEmail,
      phone: normPhone,
      role: 'ADMIN',
      status: 'APPROVED',
      createdAt: new Date().toISOString(),
      password: tempPassword,
      passwordHash,
      mustResetPassword: true,
      resetPasswordToken: resetToken,
      resetPasswordExpires: expiresAt,
    };

    await get().triggerSync('masterResetDatabase', {
      user: defaultAdmin,
      tempPassword,
      resetLink,
      resetToken,
      expiresAt,
    });

    if (get().syncStatus === 'ERROR') {
      return {
        success: false,
        message: 'Master reset failed on the server. Local data was preserved.',
      };
    }

    const walkInCustomer: Customer = {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Walk-In Customer',
      nameTe: 'వాక్-ఇన్ కస్టమర్',
      phone: '0000000000',
      address: 'Counter Cash Sale',
      addressTe: 'కౌంటర్ నగదు అమ్మకం',
      businessName: 'Counter',
      businessNameTe: 'కౌంటర్',
      currentDue: 0,
      version: 1,
      createdAt: new Date().toISOString(),
    };

    const freshUsers = [defaultAdmin];
    const freshCustomers = [walkInCustomer];
    const freshPerms = JSON.parse(JSON.stringify(DEFAULT_ROLE_PERMISSIONS));

    saveToStorage('inventory', []);
    saveToStorage('customers', freshCustomers);
    saveToStorage('suppliers', []);
    saveToStorage('orders', []);
    saveToStorage('followUps', []);
    saveToStorage('users', freshUsers);
    saveToStorage('rolePermissions', freshPerms);

    set({
      inventory: [],
      customers: freshCustomers,
      suppliers: [],
      orders: [],
      followUps: [],
      users: freshUsers,
      rolePermissions: freshPerms,
    });

    return {
      success: true,
      message: 'Master database reset complete. All sheets cleared and default Admin created.',
      user: defaultAdmin,
      tempPassword,
      resetLink,
    };
  },

  registerUser: (user, tempPassword, resetLink) => {
    const normEmail = normalizeEmail(user.email);
    const normPhone = normalizePhone(user.phone);

    // 1. Check matching email & phone
    const existingEmail = get().users.find((u) => {
      const uEmail = normalizeEmail(u.email);
      return (
        uEmail === normEmail ||
        ((normEmail === 'dev.snehit@gmail.com' || normEmail === 'dev.snehit@gmail') &&
          (uEmail === 'dev.snehit@gmail.com' || uEmail === 'dev.snehit@gmail'))
      );
    });

    const existingPhone = normPhone
      ? get().users.find((u) => {
          const uPhone = normalizePhone(u.phone);
          return uPhone.length >= 10 && uPhone === normPhone;
        })
      : undefined;

    // Conflict check: email and phone belong to two different accounts
    if (existingEmail && existingPhone && existingEmail.id !== existingPhone.id) {
      return {
        success: false,
        message: 'The email and mobile number belong to different existing accounts. Please verify your details.',
        user: undefined,
      };
    }

    if (existingEmail && normalizePhone(existingEmail.phone) !== normPhone) {
      return {
        success: false,
        message:
          existingEmail.status === 'APPROVED'
            ? 'An account with this email address already exists, and the mobile number does not match our records. Please use your registered email and mobile number.'
            : 'An access request for this email address is already pending review, and the mobile number does not match.',
        user: undefined,
      };
    }

    if (existingPhone && normalizeEmail(existingPhone.email) !== normEmail) {
      return {
        success: false,
        message:
          existingPhone.status === 'APPROVED'
            ? 'An account with this mobile number already exists under a different email address.'
            : 'An access request for this mobile number is already pending review under a different email address.',
        user: undefined,
      };
    }

    const existingUser = existingEmail || existingPhone;

    // 2. Existing user re-requesting access with a different role / updated full name (without password change)
    if (existingUser) {
      const cleanName = user.name.trim() || existingUser.name;

      if (existingUser.status === 'APPROVED') {
        if (existingUser.role === user.role && cleanName === existingUser.name.trim()) {
          return {
            success: false,
            message: `Your account is already active with the ${existingUser.role} role. Please sign in or select a different role to request a change.`,
            user: undefined,
          };
        }

        // Preserve existing active role, status ('APPROVED'), and password; store pending role-change request
        const updatedUser: User = {
          ...existingUser,
          requestedRole: user.role,
          requestedName: cleanName,
          requestedAt: new Date().toISOString(),
        };
        const updated = get().users.map((u) => (u.id === existingUser.id ? updatedUser : u));
        saveToStorage('users', updated);
        set({ users: updated });
        get().triggerSync('registerUser', {
          user: updatedUser,
          isRoleChangeRequest: true,
        });
        return {
          success: true,
          isRoleChangeRequest: true,
          message: `Role change request to ${user.role} submitted! Your password remains unchanged, and you can continue signing in with your existing ${existingUser.role} role until an administrator approves.`,
          user: updatedUser,
        };
      }

      // Existing PENDING_APPROVAL or DENIED user re-requesting with a new role / updated name without changing password
      const updatedUser: User = {
        ...existingUser,
        name: cleanName,
        role: user.role,
        status: 'PENDING_APPROVAL',
        requestedRole: undefined,
        requestedName: undefined,
        requestedAt: undefined,
      };
      const updated = get().users.map((u) => (u.id === existingUser.id ? updatedUser : u));
      saveToStorage('users', updated);
      set({ users: updated });
      get().triggerSync('registerUser', {
        user: updatedUser,
        isReRequest: true,
      });
      return {
        success: true,
        isReRequest: true,
        message: `Access request updated to ${user.role}! Your existing password remains unchanged. Please wait for administrator approval.`,
        user: updatedUser,
      };
    }

    // 3. Brand new user registration
    const updated = [...get().users, user];
    saveToStorage('users', updated);
    set({ users: updated });
    get().triggerSync('registerUser', { user, tempPassword, resetLink });
    return { success: true, message: 'User registered successfully.', user };
  },
  
  approveUser: (userId, role) => {
    let resolvedRole = role;
    let resolvedName: string | undefined;
    const updated = get().users.map((u) => {
      if (u.id !== userId) return u;
      resolvedRole = role || u.requestedRole || u.role;
      resolvedName = u.requestedName || u.name;
      return {
        ...u,
        status: 'APPROVED' as const,
        role: resolvedRole,
        name: resolvedName,
        requestedRole: undefined,
        requestedName: undefined,
        requestedAt: undefined,
      };
    });
    saveToStorage('users', updated);
    set({ users: updated });
    get().triggerSync('approveUser', {
      userId,
      newStatus: 'APPROVED',
      role: resolvedRole,
      name: resolvedName,
    });
  },

  denyUser: (userId) => {
    const target = get().users.find((u) => u.id === userId);
    const isRoleChangeDenial = Boolean(target && target.status === 'APPROVED' && target.requestedRole);
    const updated = get().users.map((u) => {
      if (u.id !== userId) return u;
      if (isRoleChangeDenial) {
        return {
          ...u,
          requestedRole: undefined,
          requestedName: undefined,
          requestedAt: undefined,
        };
      }
      return {
        ...u,
        status: 'DENIED' as const,
        requestedRole: undefined,
        requestedName: undefined,
        requestedAt: undefined,
      };
    });
    saveToStorage('users', updated);
    set({ users: updated });
    if (isRoleChangeDenial && target) {
      get().triggerSync('approveUser', {
        userId,
        newStatus: 'APPROVED',
        role: target.role,
        clearRequestedRole: true,
      });
    } else {
      get().triggerSync('approveUser', { userId, newStatus: 'DENIED' });
    }
  },

  updateUser: async (userId, updates) => {
    const currentUsers = get().users;
    const existing = currentUsers.find(u => u.id === userId);
    if (!existing) return false;

    const updatedUser: User = {
      ...existing,
      name: updates.name !== undefined ? updates.name.trim() : existing.name,
      role: updates.role || existing.role,
      status: updates.status || existing.status,
    };

    const updatedUsers = currentUsers.map(u => u.id === userId ? updatedUser : u);
    saveToStorage('users', updatedUsers);
    
    const active = get().currentUser;
    if (active && (active.id === userId || active.email.toLowerCase() === existing.email.toLowerCase())) {
      saveToStorage('currentUser', updatedUser);
      set({ users: updatedUsers, currentUser: updatedUser });
    } else {
      set({ users: updatedUsers });
    }

    await get().triggerSync('updateUser', {
      userId,
      name: updatedUser.name,
      role: updatedUser.role,
      status: updatedUser.status,
      ...(existing.version !== undefined ? { version: existing.version } : {}),
    });
    return true;
  },

  deleteUser: async (userId) => {
    const currentUsers = get().users;
    const targetUser = currentUsers.find(u => u.id === userId);
    const filtered = currentUsers.filter(u => u.id !== userId);
    saveToStorage('users', filtered);
    set({ users: filtered });
    await get().triggerSync('deleteUser', {
      userId,
      ...(targetUser?.version !== undefined ? { version: targetUser.version } : {}),
    });
    return true;
  },

  cleanDuplicateUsers: async () => {
    const currentUsers = get().users;
    const seenEmails = new Set<string>();
    const seenPhones = new Set<string>();
    const cleanUsers: User[] = [];

    for (const u of currentUsers) {
      const email = normalizeEmail(u.email);
      const phone = normalizePhone(u.phone);

      if (seenEmails.has(email) || (phone.length === 10 && seenPhones.has(phone))) {
        continue;
      }
      seenEmails.add(email);
      if (phone.length === 10) seenPhones.add(phone);
      cleanUsers.push(u);
    }

    const removed = currentUsers.length - cleanUsers.length;
    saveToStorage('users', cleanUsers);
    set({ users: cleanUsers });

    await get().triggerSync('cleanDuplicateUsers', {});
    await get().triggerSync('syncAll', {
      products: get().inventory,
      customers: get().customers,
      suppliers: get().suppliers,
      orders: get().orders,
      users: cleanUsers
    });

    return { removed, total: cleanUsers.length };
  },

  addOrder: (order) => {
    // Reserve stock for items in the order
    const updatedInventory = get().inventory.map((prod) => {
      const orderItem = order.items.find((item) => item.productId === prod.id && item.unitType === 'OUTER_BAG');
      if (orderItem) {
        return {
          ...prod,
          stockReservedOuter: prod.stockReservedOuter + orderItem.quantity,
        };
      }
      return prod;
    });

    const updatedOrders = [order, ...get().orders];
    saveToStorage('orders', updatedOrders);
    saveToStorage('inventory', updatedInventory);

    set({
      orders: updatedOrders,
      inventory: updatedInventory,
    });

    // Auto-sync order and updated product stocks to Google Sheet
    get().triggerSync('saveOrder', { order });
  },

  updateOrder: (order) => {
    // If order items changed, adjust reserved stock accurately
    const prevOrder = get().orders.find((o) => o.id === order.id);
    let updatedInventory = get().inventory;

    if (prevOrder && prevOrder.status === 'PENDING_REVIEW' && order.status === 'PENDING_REVIEW') {
      updatedInventory = updatedInventory.map((prod) => {
        const prevItem = prevOrder.items.find((item) => item.productId === prod.id && item.unitType === 'OUTER_BAG');
        const newItem = order.items.find((item) => item.productId === prod.id && item.unitType === 'OUTER_BAG');
        const prevQty = prevItem ? prevItem.quantity : 0;
        const newQty = newItem ? newItem.quantity : 0;
        const diff = newQty - prevQty;
        return diff !== 0
          ? { ...prod, stockReservedOuter: Math.max(0, prod.stockReservedOuter + diff) }
          : prod;
      });
      saveToStorage('inventory', updatedInventory);
    }

    const updatedOrders = get().orders.map((o) => (o.id === order.id ? order : o));
    saveToStorage('orders', updatedOrders);
    set({ orders: updatedOrders, inventory: updatedInventory });
    get().triggerSync('saveOrder', { order });
  },

  deleteOrder: async (orderId) => {
    const targetOrder = get().orders.find((o) => o.id === orderId);
    let updatedInventory = get().inventory;
    if (targetOrder && targetOrder.status !== 'DELIVERED' && targetOrder.status !== 'CANCELLED') {
      updatedInventory = updatedInventory.map((prod) => {
        const item = targetOrder.items.find((i) => i.productId === prod.id && i.unitType === 'OUTER_BAG');
        if (item) {
          return {
            ...prod,
            stockReservedOuter: Math.max(0, prod.stockReservedOuter - item.quantity)
          };
        }
        return prod;
      });
      saveToStorage('inventory', updatedInventory);
    }
    const updatedOrders = get().orders.filter((o) => o.id !== orderId);
    saveToStorage('orders', updatedOrders);
    set({ orders: updatedOrders, inventory: updatedInventory });
    await get().triggerSync('deleteOrder', {
      orderId,
      ...(targetOrder?.version !== undefined ? { version: targetOrder.version } : {}),
    });
    return true;
  },

  approveOrder: (orderId, approvedByRole) => {
    const state = get();
    const targetOrder = state.orders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    // Permanently deduct physical and reserved stock
    const updatedInventory = state.inventory.map((prod) => {
      const orderItem = targetOrder.items.find((item) => item.productId === prod.id && item.unitType === 'OUTER_BAG');
      if (orderItem) {
        return {
          ...prod,
          stockPhysicalOuter: Math.max(0, prod.stockPhysicalOuter - orderItem.quantity),
          stockReservedOuter: Math.max(0, prod.stockReservedOuter - orderItem.quantity),
        };
      }
      return prod;
    });

    // Update customer due if credit sale
    const updatedCustomers = state.customers.map((c) => {
      if (c.id === targetOrder.customerId && targetOrder.paymentMode === 'CREDIT') {
        return { ...c, currentDue: c.currentDue + targetOrder.grandTotal };
      }
      return c;
    });

    const updatedOrders = state.orders.map((o) => 
      o.id === orderId ? { ...o, status: 'APPROVED' as const, approvedByRole } : o
    );

    saveToStorage('orders', updatedOrders);
    saveToStorage('inventory', updatedInventory);
    saveToStorage('customers', updatedCustomers);

    set({
      orders: updatedOrders,
      inventory: updatedInventory,
      customers: updatedCustomers,
    });

    get().triggerSync('updateOrderStatus', {
      orderId,
      newStatus: 'APPROVED',
      approvedByRole,
      ...(targetOrder.version !== undefined ? { version: targetOrder.version } : {}),
    });
  },

  markOrderDispatched: (orderId, vehicleNo) => {
    const targetOrder = get().orders.find((o) => o.id === orderId);
    const updated = get().orders.map((o) => 
      o.id === orderId ? { ...o, status: 'DISPATCHED' as const, ...(vehicleNo ? { vehicleNumber: vehicleNo } : {}) } : o
    );
    saveToStorage('orders', updated);
    set({ orders: updated });
    get().triggerSync('updateOrderStatus', {
      orderId,
      newStatus: 'DISPATCHED',
      vehicleNumber: vehicleNo,
      ...(targetOrder?.version !== undefined ? { version: targetOrder.version } : {}),
    });
  },

  markOrderDelivered: (orderId, paymentMode) => {
    const targetOrder = get().orders.find((o) => o.id === orderId);
    const resolvedPaymentMode = paymentMode || targetOrder?.paymentMode || 'CREDIT';
    const updated = get().orders.map((o) => 
      o.id === orderId ? { ...o, status: 'DELIVERED' as const, paymentMode: resolvedPaymentMode } : o
    );
    saveToStorage('orders', updated);
    set({ orders: updated });
    get().triggerSync('updateOrderStatus', {
      orderId,
      newStatus: 'DELIVERED',
      paymentMode: resolvedPaymentMode,
      ...(targetOrder?.version !== undefined ? { version: targetOrder.version } : {}),
    });
  },

  addFollowUp: (followUp) => {
    const updated = [followUp, ...get().followUps];
    saveToStorage('followUps', updated);
    set({ followUps: updated });
    get().triggerSync('saveFollowUp', { followUp });
  },

  updateFollowUp: (followUp) => {
    const updated = get().followUps.map((f) => (f.id === followUp.id ? followUp : f));
    saveToStorage('followUps', updated);
    set({ followUps: updated });
    get().triggerSync('saveFollowUp', { followUp });
  },

  deleteFollowUp: async (followUpId) => {
    const target = get().followUps.find((f) => f.id === followUpId);
    const updated = get().followUps.filter((f) => f.id !== followUpId);
    saveToStorage('followUps', updated);
    set({ followUps: updated });
    await get().triggerSync('deleteFollowUp', {
      followUpId,
      ...(target?.version !== undefined ? { version: target.version } : {}),
    });
    return true;
  },

  addCustomer: (customer) => {
    const updated = [...get().customers, customer];
    saveToStorage('customers', updated);
    set({ customers: updated });
    get().triggerSync('saveCustomer', { customer });
  },

  updateCustomer: (customer) => {
    const updated = get().customers.map((c) => (c.id === customer.id ? customer : c));
    saveToStorage('customers', updated);
    set({ customers: updated });
    get().triggerSync('saveCustomer', { customer });
  },

  deleteCustomer: async (customerId) => {
    const target = get().customers.find((c) => c.id === customerId);
    const updated = get().customers.filter((c) => c.id !== customerId);
    saveToStorage('customers', updated);
    set({ customers: updated });
    await get().triggerSync('deleteCustomer', {
      customerId,
      ...(target?.version !== undefined ? { version: target.version } : {}),
    });
    return true;
  },

  addSupplier: (supplier) => {
    const updated = [...get().suppliers, supplier];
    saveToStorage('suppliers', updated);
    set({ suppliers: updated });
    get().triggerSync('saveSupplier', { supplier });
  },

  updateSupplier: (supplier) => {
    const updated = get().suppliers.map((s) => (s.id === supplier.id ? supplier : s));
    saveToStorage('suppliers', updated);
    set({ suppliers: updated });
    get().triggerSync('saveSupplier', { supplier });
  },

  deleteSupplier: async (supplierId) => {
    const target = get().suppliers.find((s) => s.id === supplierId);
    const updated = get().suppliers.filter((s) => s.id !== supplierId);
    saveToStorage('suppliers', updated);
    set({ suppliers: updated });
    await get().triggerSync('deleteSupplier', {
      supplierId,
      ...(target?.version !== undefined ? { version: target.version } : {}),
    });
    return true;
  },

  addProduct: (product) => {
    const updated = [...get().inventory, product];
    saveToStorage('inventory', updated);
    set({ inventory: updated });
    get().triggerSync('saveProduct', { product });
  },

  updateProduct: (product) => {
    const updated = get().inventory.map((p) => (p.id === product.id ? product : p));
    saveToStorage('inventory', updated);
    set({ inventory: updated });
    get().triggerSync('saveProduct', { product });
  },

  deleteProduct: async (productId) => {
    const target = get().inventory.find((p) => p.id === productId);
    const updated = get().inventory.filter((p) => p.id !== productId);
    saveToStorage('inventory', updated);
    set({ inventory: updated });
    await get().triggerSync('deleteProduct', {
      productId,
      ...(target?.version !== undefined ? { version: target.version } : {}),
    });
    return true;
  },
  
  unpackProduct: (productId) => {
    let affectedProduct: Product | undefined;
    const updated = get().inventory.map((p) => {
      if (p.id === productId && p.stockPhysicalOuter > 0) {
        affectedProduct = {
          ...p,
          stockPhysicalOuter: p.stockPhysicalOuter - 1,
          stockLooseInner: p.stockLooseInner + p.innerBagsPerOuter,
        };
        return affectedProduct;
      }
      return p;
    });
    saveToStorage('inventory', updated);
    set({ inventory: updated });
    if (affectedProduct) {
      get().triggerSync('saveProduct', { product: affectedProduct });
    }
  },

  updateRolePermissions: async (role: Role, config: Record<string, PagePermissionConfig>) => {
    const current = get().rolePermissions;
    const updated: RolePermissionsConfig = {
      ...current,
      [role]: config,
    };
    saveToStorage('role_permissions', updated);
    set({ rolePermissions: updated });
    await get().triggerSync('saveRolePermissions', { role, config, allPermissions: updated });
    return true;
  },

  hasPageAccess: (pageKey: string) => {
    const user = get().currentUser;
    return isPageEnabled(get().rolePermissions, user?.role, pageKey);
  },

  hasFunctionalityAccess: (pageKey: string, funcKey: string) => {
    const user = get().currentUser;
    return isFunctionalityEnabled(get().rolePermissions, user?.role, pageKey, funcKey);
  },

  canRolePerform: (role: Role, pageKey: string, funcKey: string) => {
    return isFunctionalityEnabled(get().rolePermissions, role, pageKey, funcKey);
  }
}));
