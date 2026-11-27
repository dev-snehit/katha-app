/**
 * Kaatha Backend Database Live Synchronization Service
 * 
 * Communicates with the user's deployed backend database webhook API
 * without triggering CORS preflight rejections by using text/plain body format.
 */

export interface SyncResponse {
  success: boolean;
  message?: string;
  error?: string;
  timestamp?: string;
  details?: any;
}

export async function pushToGoogleSheet(
  backendUrl: string,
  action: string,
  payload: Record<string, any> = {}
): Promise<SyncResponse> {
  if (!backendUrl || !backendUrl.trim().startsWith('http')) {
    return {
      success: false,
      error: 'Database Webhook API URL is not configured. Please configure in Settings.'
    };
  }

  try {
    const postBody = JSON.stringify({
      action,
      timestamp: new Date().toISOString(),
      ...payload
    });

    const response = await fetch(backendUrl.trim(), {
      method: 'POST',
      mode: 'cors',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: postBody
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP error: ${response.status} ${response.statusText}`
      };
    }

    const data = await response.json();
    return {
      success: data.status === 'success' || data.status === 'ok',
      message: data.message || 'Synchronized with Backend Database',
      error: data.error,
      details: data
    };
  } catch (err: any) {
    console.warn(`[Kaatha Sync] Push failed for action "${action}":`, err);
    return {
      success: false,
      error: err.message || 'Unable to reach backend database webhook'
    };
  }
}

export async function pingGoogleSheet(backendUrl: string): Promise<SyncResponse> {
  if (!backendUrl || !backendUrl.trim().startsWith('http')) {
    return {
      success: false,
      error: 'Database Webhook API URL is not configured'
    };
  }

  try {
    // Attempt POST ping first
    const res = await pushToGoogleSheet(backendUrl, 'ping');
    if (res.success) return res;

    // Fallback to GET ping
    const getUrl = new URL(backendUrl.trim());
    getUrl.searchParams.set('action', 'ping');
    const response = await fetch(getUrl.toString(), {
      method: 'GET',
      mode: 'cors',
      redirect: 'follow'
    });

    const data = await response.json();
    return {
      success: data.status === 'ok' || data.status === 'success',
      message: data.message || 'Connected to Backend Database',
      error: data.error
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Connection test failed. Check webhook permissions.'
    };
  }
}

export async function pullFromGoogleSheet(backendUrl: string): Promise<SyncResponse & { data?: any }> {
  if (!backendUrl || !backendUrl.trim().startsWith('http')) {
    return {
      success: false,
      error: 'Database Webhook API URL is not configured.'
    };
  }

  try {
    // 1. Try CORS-safe POST first (avoids preflight issues with text/plain body)
    const postRes = await pushToGoogleSheet(backendUrl, 'getData');
    if (postRes.success && postRes.details?.data) {
      return {
        success: true,
        data: postRes.details.data,
        message: 'Database loaded from Backend Database'
      };
    }

    // 2. Fallback to GET
    const getUrl = new URL(backendUrl.trim());
    getUrl.searchParams.set('action', 'getData');
    const response = await fetch(getUrl.toString(), {
      method: 'GET',
      mode: 'cors',
      redirect: 'follow'
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP error: ${response.status} ${response.statusText}`
      };
    }

    const json = await response.json();
    return {
      success: json.status === 'success' || json.status === 'ok',
      data: json.data,
      message: json.message || 'Database loaded from Backend Database'
    };
  } catch (err: any) {
    console.warn('[Kaatha Sync] pullFromGoogleSheet error:', err);
    return {
      success: false,
      error: err.message || 'Failed to pull data from Backend Database'
    };
  }
}

export async function lockRemoteSheets(backendUrl: string): Promise<SyncResponse> {
  return pushToGoogleSheet(backendUrl, 'lockSheets');
}

export const pushToBackendDatabase = pushToGoogleSheet;
export const pingBackendDatabase = pingGoogleSheet;
export const pullFromBackendDatabase = pullFromGoogleSheet;
