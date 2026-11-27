import { useState, useEffect } from 'react';

export type MainView = 'orders' | 'stock' | 'customers' | 'suppliers' | 'exports' | 'admin' | 'settings' | 'auth';
export type SubView = 'new' | 'edit' | 'new-user' | 'login' | 'register' | 'forgot' | 'reset' | null;

export interface RouteInfo {
  path: string;              // Canonical application path, e.g. '/orders/ORD-101'
  fullPath: string;          // Includes base path if applicable, e.g. '/katha-app/orders/ORD-101'
  view: MainView;
  subView: SubView;
  paramId: string | null;
  queryParams: Record<string, string>;
  isModalOpen: boolean;
}

const INTENDED_ROUTE_KEY = 'katha_intended_route';

/**
 * Detects base repository path (e.g. '/katha-app' on GitHub Pages, or '' on localhost / custom domain)
 */
export function getBasePath(): string {
  if (typeof window === 'undefined') return '';
  const pathname = window.location.pathname;
  if (pathname === '/katha-app' || pathname.startsWith('/katha-app/')) {
    return '/katha-app';
  }
  return '';
}

/**
 * Strips the base path and legacy hashes to produce a clean application path
 */
export function stripBasePath(rawPath: string): string {
  if (!rawPath) return '/orders';
  let path = rawPath.trim();

  // Strip query string if embedded
  if (path.includes('?')) {
    path = path.split('?')[0];
  }

  // Strip legacy '#' hash symbol if present
  if (path.startsWith('#')) {
    path = path.slice(1).trim();
  }

  const basePath = getBasePath();
  if (basePath && path.startsWith(basePath)) {
    path = path.slice(basePath.length);
  } else if (path.startsWith('/katha-app')) {
    path = path.slice('/katha-app'.length);
  }

  if (!path.startsWith('/')) {
    path = `/${path}`;
  }

  // Clean trailing slashes except for root
  if (path.length > 1 && path.endsWith('/')) {
    path = path.slice(0, -1);
  }

  return path || '/orders';
}

/**
 * Parse query string into key-value map
 */
export function parseQueryParams(queryString: string): Record<string, string> {
  const params: Record<string, string> = {};
  if (!queryString) return params;
  const clean = queryString.startsWith('?') ? queryString.slice(1) : queryString;
  const searchParams = new URLSearchParams(clean);
  searchParams.forEach((val, key) => {
    params[key] = val;
  });
  return params;
}

/**
 * Parse any pathname or URL into a strongly-typed RouteInfo structure using pure slash routing
 */
export function parseRoute(rawPathOrUrl?: string): RouteInfo {
  let raw = rawPathOrUrl;
  let queryString = '';

  if (typeof raw !== 'string') {
    if (typeof window !== 'undefined') {
      // Check query string for GitHub Pages redirect fallback (?/orders/123)
      const search = window.location.search;
      if (search && search.startsWith('?/')) {
        raw = search.slice(1); // removes '?'
        queryString = '';
      } else {
        // Read location pathname and search
        raw = window.location.pathname;
        queryString = window.location.search;
        // Fallback for legacy hash if someone used an old bookmark
        if (window.location.hash) {
          raw = window.location.hash.slice(1);
        }
      }
    } else {
      raw = '/orders';
    }
  } else if (raw.includes('?')) {
    const parts = raw.split('?');
    raw = parts[0];
    queryString = parts[1] || '';
  }

  const cleanPath = stripBasePath(raw);
  const queryParams = parseQueryParams(queryString);
  const segments = cleanPath ? cleanPath.split('/').filter(Boolean) : [];

  const firstSeg = segments[0]?.toLowerCase() || 'orders';
  const secondSeg = segments[1] || null;
  const thirdSeg = segments[2] || null;

  let view: MainView = 'orders';
  let subView: SubView = null;
  let paramId: string | null = null;

  switch (firstSeg) {
    case 'stock':
    case 'stocks':
    case 'inventory':
      view = 'stock';
      if (secondSeg === 'new' || secondSeg === 'add') {
        subView = 'new';
      } else if (secondSeg === 'edit' && thirdSeg) {
        subView = 'edit';
        paramId = decodeURIComponent(thirdSeg);
      } else if (secondSeg) {
        // Direct route param e.g. /stock/:productid
        subView = 'edit';
        paramId = decodeURIComponent(secondSeg);
      }
      break;

    case 'customers':
    case 'customer':
      view = 'customers';
      if (secondSeg === 'new' || secondSeg === 'add') {
        subView = 'new';
      } else if (secondSeg === 'edit' && thirdSeg) {
        subView = 'edit';
        paramId = decodeURIComponent(thirdSeg);
      } else if (secondSeg) {
        // Direct route param e.g. /customers/:customerid
        subView = 'edit';
        paramId = decodeURIComponent(secondSeg);
      }
      break;

    case 'suppliers':
    case 'supplier':
      view = 'suppliers';
      if (secondSeg === 'new' || secondSeg === 'add') {
        subView = 'new';
      } else if (secondSeg === 'edit' && thirdSeg) {
        subView = 'edit';
        paramId = decodeURIComponent(thirdSeg);
      } else if (secondSeg) {
        // Direct route param e.g. /suppliers/:supplierid
        subView = 'edit';
        paramId = decodeURIComponent(secondSeg);
      }
      break;

    case 'exports':
    case 'export':
    case 'reports':
      view = 'exports';
      break;

    case 'admin':
    case 'users':
      view = 'admin';
      if (secondSeg === 'new-user' || secondSeg === 'signup' || secondSeg === 'new') {
        subView = 'new-user';
      }
      break;

    case 'settings':
      view = 'settings';
      break;

    case 'login':
    case 'signin':
      view = 'auth';
      subView = 'login';
      break;

    case 'register':
    case 'signup':
      view = 'auth';
      subView = 'register';
      break;

    case 'forgot-password':
    case 'forgot':
      view = 'auth';
      subView = 'forgot';
      break;

    case 'reset-password':
    case 'reset':
      view = 'auth';
      subView = 'reset';
      if (secondSeg) {
        paramId = decodeURIComponent(secondSeg);
      }
      break;

    case 'orders':
    case 'order':
    default:
      view = 'orders';
      if (secondSeg === 'new' || secondSeg === 'add') {
        subView = 'new';
      } else if (secondSeg === 'edit' && thirdSeg) {
        subView = 'edit';
        paramId = decodeURIComponent(thirdSeg);
      } else if (secondSeg && secondSeg !== 'orders') {
        // Direct route param e.g. /orders/:orderid
        subView = 'edit';
        paramId = decodeURIComponent(secondSeg);
      }
      break;
  }

  // Construct standard canonical slash path
  let canonicalPath = `/${view}`;
  if (subView === 'new') {
    canonicalPath += '/new';
  } else if (subView === 'edit' && paramId) {
    // Prefer clean slash parameter: /orders/:orderid, /stock/:productid, etc.
    canonicalPath += `/${encodeURIComponent(paramId)}`;
  } else if (subView === 'new-user') {
    canonicalPath = '/admin/new-user';
  } else if (view === 'auth') {
    if (subView === 'register') canonicalPath = '/register';
    else if (subView === 'forgot') canonicalPath = '/forgot-password';
    else if (subView === 'reset') canonicalPath = paramId ? `/reset-password/${encodeURIComponent(paramId)}` : '/reset-password';
    else canonicalPath = '/login';
  }

  const basePath = getBasePath();
  const fullPath = `${basePath}${canonicalPath}`;
  const isModalOpen = subView === 'new' || subView === 'edit' || subView === 'new-user';

  return {
    path: canonicalPath,
    fullPath,
    view,
    subView,
    paramId,
    queryParams,
    isModalOpen
  };
}

/**
 * Programmatic Navigation with HTML5 History API (pushState & replaceState)
 */
export function navigate(targetPath: string, options?: { replace?: boolean }): void {
  if (typeof window === 'undefined') return;

  const clean = stripBasePath(targetPath);
  const basePath = getBasePath();
  const targetFullPath = `${basePath}${clean}`;

  // Keep query params if not part of targetPath
  const search = targetPath.includes('?') ? `?${targetPath.split('?')[1]}` : '';
  const finalUrl = `${targetFullPath}${search}`;

  if (window.location.pathname === targetFullPath && !options?.replace) {
    window.dispatchEvent(new CustomEvent('katha:route-change', { detail: { path: clean } }));
    return;
  }

  if (options?.replace) {
    window.history.replaceState({ path: clean }, '', finalUrl);
  } else {
    window.history.pushState({ path: clean }, '', finalUrl);
  }

  window.dispatchEvent(new CustomEvent('katha:route-change', { detail: { path: clean } }));
}

/**
 * Step back in browser history or navigate to fallback path
 */
export function goBack(fallbackPath: string = '/orders'): void {
  if (typeof window === 'undefined') return;

  if (window.history && window.history.length > 1) {
    window.history.back();
  } else {
    navigate(fallbackPath, { replace: true });
  }
}

/**
 * Retrieve saved intended route for post-login redirect
 */
export function getIntendedRoute(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(INTENDED_ROUTE_KEY);
  } catch {
    return null;
  }
}

/**
 * Persist user's intended route when unauthenticated
 */
export function setIntendedRoute(route: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (route) {
      localStorage.setItem(INTENDED_ROUTE_KEY, stripBasePath(route));
    } else {
      localStorage.removeItem(INTENDED_ROUTE_KEY);
    }
  } catch {
    // Ignore storage quota or disabled errors
  }
}

/**
 * Clear the saved intended route
 */
export function clearIntendedRoute(): void {
  setIntendedRoute(null);
}

/**
 * Updates document.title to reflect current view, subview and bilingual labels
 */
export function updateDocumentTitle(route: RouteInfo, language: 'EN' | 'TE'): void {
  if (typeof document === 'undefined') return;

  const isTe = language === 'TE';
  let titlePart = '';

  switch (route.view) {
    case 'orders':
      if (route.subView === 'new') {
        titlePart = isTe ? 'కొత్త ఆర్డర్' : 'Place Order';
      } else if (route.subView === 'edit') {
        titlePart = isTe ? `ఆర్డర్ (${route.paramId || ''})` : `Order ${route.paramId ? `#${route.paramId}` : ''}`;
      } else {
        titlePart = isTe ? 'పెండింగ్ ఆర్డర్లు' : 'Orders Yet to Deliver';
      }
      break;

    case 'stock':
      if (route.subView === 'new') {
        titlePart = isTe ? 'కొత్త సరుకు చేర్చండి' : 'Add Commodity';
      } else if (route.subView === 'edit') {
        titlePart = isTe ? 'సరుకు సవరణ' : 'Edit Commodity';
      } else {
        titlePart = isTe ? 'స్టాక్ రిజిస్ట్రీ' : 'Stock Registry';
      }
      break;

    case 'customers':
      if (route.subView === 'new') {
        titlePart = isTe ? 'కొత్త కస్టమర్' : 'Add Customer';
      } else if (route.subView === 'edit') {
        titlePart = isTe ? 'కస్టమర్ సవరణ' : 'Edit Customer';
      } else {
        titlePart = isTe ? 'కస్టమర్ల డైరెక్టరీ' : 'Customers Directory';
      }
      break;

    case 'suppliers':
      if (route.subView === 'new') {
        titlePart = isTe ? 'కొత్త సప్లయర్' : 'Add Supplier';
      } else if (route.subView === 'edit') {
        titlePart = isTe ? 'సప్లయర్ సవరణ' : 'Edit Supplier';
      } else {
        titlePart = isTe ? 'సప్లయర్ల డైరెక్టరీ' : 'Suppliers Directory';
      }
      break;

    case 'exports':
      titlePart = isTe ? 'ఎగుమతులు & నివేదికలు' : 'Exports & Reports';
      break;

    case 'admin':
      if (route.subView === 'new-user') {
        titlePart = isTe ? 'వినియోగదారుని నమోదు' : 'Simulate User Signup';
      } else {
        titlePart = isTe ? 'వినియోగదారుల నిర్వహణ' : 'User Requests & Admin';
      }
      break;

    case 'settings':
      titlePart = isTe ? 'సెట్టింగ్‌లు' : 'Settings';
      break;

    case 'auth':
      if (route.subView === 'register') {
        titlePart = isTe ? 'యాక్సెస్ అభ్యర్థన' : 'Request Access';
      } else if (route.subView === 'forgot') {
        titlePart = isTe ? 'పాస్‌వర్డ్ మర్చిపోయారా' : 'Forgot Password';
      } else if (route.subView === 'reset') {
        titlePart = isTe ? 'పాస్‌వర్డ్ రీసెట్' : 'Reset Password';
      } else {
        titlePart = isTe ? 'లాగిన్' : 'Sign In';
      }
      break;

    default:
      titlePart = isTe ? 'మండి మేనేజర్' : 'Mandi OS';
      break;
  }

  const appName = isTe ? 'కాతా CRM' : 'Kaatha CRM';
  document.title = titlePart ? `${appName} | ${titlePart}` : appName;
}

/**
 * Custom React hook that subscribes to route changes (popstate and programmatic navigate)
 */
export function useRouter() {
  const [route, setRoute] = useState<RouteInfo>(() => parseRoute());

  useEffect(() => {
    const handleRouteChange = () => {
      setRoute(parseRoute());
    };

    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('katha:route-change', handleRouteChange);

    // Backward-compatibility: if an old bookmark opens with #/path, migrate it seamlessly to clean slash /path
    if (typeof window !== 'undefined' && window.location.hash) {
      const hashContent = window.location.hash.replace(/^#\/?/, '').trim();
      if (hashContent) {
        window.location.hash = '';
        navigate(`/${hashContent}`, { replace: true });
      }
    }

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('katha:route-change', handleRouteChange);
    };
  }, []);

  return {
    route,
    navigate,
    goBack
  };
}
