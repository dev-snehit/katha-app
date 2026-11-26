import { useState, useEffect } from 'react';

export type MainView = 'orders' | 'stock' | 'customers' | 'suppliers' | 'exports' | 'admin' | 'settings' | 'auth';
export type SubView = 'new' | 'edit' | 'new-user' | 'login' | 'register' | 'forgot' | 'reset' | null;

export interface RouteInfo {
  hash: string;
  path: string;
  view: MainView;
  subView: SubView;
  paramId: string | null;
  queryParams: Record<string, string>;
  isModalOpen: boolean;
}

const INTENDED_ROUTE_KEY = 'katha_intended_route';

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
 * Parse any raw hash or URL into a strongly-typed RouteInfo structure
 */
export function parseRoute(rawHashOrPath?: string): RouteInfo {
  let raw = rawHashOrPath;
  if (typeof raw !== 'string') {
    if (typeof window !== 'undefined') {
      raw = window.location.hash || window.location.pathname;
    } else {
      raw = '#/orders';
    }
  }

  // Handle direct pathnames if hash is empty (e.g., /katha-app/stock or /stock)
  if (!raw || raw === '#' || raw === '#/' || raw === '/') {
    raw = '#/orders';
  } else if (!raw.startsWith('#')) {
    // If given a pathname like "/stock/new", convert to hash format
    const cleanPath = raw.replace(/^\/katha-app\/?/, '/');
    raw = `#${cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`}`;
  }

  // Split path and query parameters
  const [hashPathPart, queryString] = raw.split('?');
  const queryParams = parseQueryParams(queryString || '');

  // Strip leading '#' and trim slashes
  const cleanPath = hashPathPart.replace(/^#\/?/, '').trim();
  const segments = cleanPath ? cleanPath.split('/').filter(Boolean) : ['orders'];

  const firstSeg = segments[0]?.toLowerCase() || 'orders';
  const secondSeg = segments[1]?.toLowerCase() || null;
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
      }
      break;
  }

  // Construct canonical path
  let canonicalPath = `/${view}`;
  if (subView) {
    canonicalPath += `/${subView}`;
    if (paramId) {
      canonicalPath += `/${encodeURIComponent(paramId)}`;
    }
  }

  const isModalOpen = subView === 'new' || subView === 'edit' || subView === 'new-user';

  return {
    hash: raw,
    path: canonicalPath,
    view,
    subView,
    paramId,
    queryParams,
    isModalOpen
  };
}

/**
 * Programmatic Navigation with Browser History push / replace
 */
export function navigate(targetPath: string, options?: { replace?: boolean }): void {
  if (typeof window === 'undefined') return;

  // Clean target path
  let path = targetPath.trim();
  if (path.startsWith('#')) {
    path = path.slice(1);
  }
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }

  const targetHash = `#${path}`;

  if (window.location.hash === targetHash) {
    // If same hash, re-dispatch event to ensure fresh synchronization
    window.dispatchEvent(new CustomEvent('katha:route-change', { detail: { path } }));
    return;
  }

  if (options?.replace) {
    if (typeof window.history.replaceState === 'function') {
      window.history.replaceState(null, '', targetHash);
    }
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
    window.dispatchEvent(new CustomEvent('katha:route-change', { detail: { path } }));
  } else {
    // Setting window.location.hash automatically adds a history entry and triggers hashchange
    window.location.hash = targetHash;
    window.dispatchEvent(new CustomEvent('katha:route-change', { detail: { path } }));
  }
}

/**
 * Navigate to the parent view or step back in browser history
 */
export function goBack(fallbackPath: string = '/orders'): void {
  if (typeof window === 'undefined') return;

  if (window.history.length > 1) {
    window.history.back();
  } else {
    navigate(fallbackPath, { replace: true });
  }
}

/**
 * Retrieve the saved intended route for post-login redirect
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
 * Persist the user's intended route when unauthenticated
 */
export function setIntendedRoute(route: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (route) {
      localStorage.setItem(INTENDED_ROUTE_KEY, route);
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
        titlePart = isTe ? `ఆర్డర్ సవరణ (${route.paramId || ''})` : `Edit Order ${route.paramId ? `#${route.paramId}` : ''}`;
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

  const appName = isTe ? 'కథా CRM' : 'Katha CRM';
  document.title = titlePart ? `${appName} | ${titlePart}` : appName;
}

/**
 * Custom React hook that subscribes to route changes (hashchange, popstate, and programmatic navigate)
 */
export function useRouter() {
  const [route, setRoute] = useState<RouteInfo>(() => parseRoute());

  useEffect(() => {
    const handleRouteChange = () => {
      setRoute(parseRoute());
    };

    window.addEventListener('hashchange', handleRouteChange);
    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('katha:route-change', handleRouteChange);

    // Initial check for hash normalization if on direct path
    if (typeof window !== 'undefined' && !window.location.hash) {
      const initial = parseRoute();
      if (initial.path !== '/orders') {
        navigate(initial.path, { replace: true });
      } else {
        navigate('/orders', { replace: true });
      }
    }

    return () => {
      window.removeEventListener('hashchange', handleRouteChange);
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
