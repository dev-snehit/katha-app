/**
 * Google Apps Script Live Synchronization Service
 * 
 * Communicates with the user's deployed Google Apps Script Web App
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
      error: 'Google Sheet Webhook URL is not configured. Please configure in Settings.'
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
      message: data.message || 'Synchronized with Google Sheet',
      error: data.error,
      details: data
    };
  } catch (err: any) {
    console.warn(`[Katha Sync] Push failed for action "${action}":`, err);
    return {
      success: false,
      error: err.message || 'Unable to reach Google Apps Script webhook'
    };
  }
}

export async function pingGoogleSheet(backendUrl: string): Promise<SyncResponse> {
  if (!backendUrl || !backendUrl.trim().startsWith('http')) {
    return {
      success: false,
      error: 'Google Sheet Webhook URL is not configured'
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
      message: data.message || 'Connected to Google Sheet backend',
      error: data.error
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Connection test failed. Check Web App permissions.'
    };
  }
}
