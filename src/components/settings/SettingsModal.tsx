import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { pingGoogleSheet } from '../../lib/syncService';
import { Settings, Link2, Check, ExternalLink, RefreshCw, Radio, AlertCircle } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { backendUrl, setBackendUrl, syncAllToGoogleSheets, syncStatus, lastSyncTime } = useAppStore();
  const [urlInput, setUrlInput] = useState(backendUrl);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncAllResult, setSyncAllResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setBackendUrl(urlInput);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
    }, 1500);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const res = await pingGoogleSheet(urlInput);
    setTesting(false);
    if (res.success) {
      setTestResult({
        success: true,
        message: res.details?.sheetName 
          ? `Connected to "${res.details.sheetName}" Google Sheet!`
          : 'Connected successfully to Google Sheet backend!'
      });
    } else {
      setTestResult({
        success: false,
        message: res.error || 'Failed to connect. Verify your deployed Web App URL and permissions.'
      });
    }
  };

  const handleSyncAll = async () => {
    setIsSyncingAll(true);
    setSyncAllResult(null);
    // Ensure URL is saved first
    setBackendUrl(urlInput);
    const success = await syncAllToGoogleSheets();
    setIsSyncingAll(false);
    if (success) {
      setSyncAllResult('All local commodities, customers, suppliers, and orders synced to Google Sheets!');
    } else {
      setSyncAllResult('Sync failed. Please test your connection above.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-7 border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5 text-slate-900 font-extrabold text-lg">
            <div className="p-2 rounded-xl bg-orange-50 text-[#FF5A36]">
              <Settings className="w-5 h-5" />
            </div>
            <span>Google Sheets Cloud Sync</span>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            &times;
          </button>
        </div>

        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
          Connect Katha Wholesale to your private Master Google Sheet via your free Google Apps Script Webhook. All transactions sync automatically.
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Google Apps Script Web App URL:
            </label>
            <div className="relative">
              <input
                type="url"
                required
                placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="w-full text-xs font-mono border border-slate-300 rounded-xl p-3 outline-none focus:border-[#FF5A36] focus:ring-2 focus:ring-[#FF5A36]/10 pr-10 bg-slate-50 focus:bg-white transition-all"
              />
              <Link2 className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Follow setup instructions in <span className="font-semibold text-slate-700">docs/SETUP_GUIDE.md</span>.
            </p>
          </div>

          {/* Test Connection Button & Status */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !urlInput.trim()}
              className="px-3.5 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <Radio className={`w-3.5 h-3.5 ${testing ? 'animate-pulse text-amber-500' : 'text-slate-500'}`} />
              <span>{testing ? 'Testing Connection...' : 'Test Connection'}</span>
            </button>

            <button
              type="button"
              onClick={handleSyncAll}
              disabled={isSyncingAll || !urlInput.trim()}
              className="px-3.5 py-2 text-xs font-bold bg-orange-50 hover:bg-orange-100 text-[#FF5A36] border border-orange-200 rounded-xl transition-all disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
              <span>{isSyncingAll ? 'Syncing...' : 'Sync All Records to Sheet'}</span>
            </button>
          </div>

          {/* Connection Test Result */}
          {testResult && (
            <div
              className={`p-3 rounded-2xl text-xs flex items-start gap-2 ${
                testResult.success
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {testResult.success ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Sync All Result */}
          {syncAllResult && (
            <div className="p-3 rounded-2xl text-xs bg-blue-50 text-blue-800 border border-blue-200 flex items-start gap-2">
              <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>{syncAllResult}</span>
            </div>
          )}

          {/* Sync Status Info */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/60 text-xs text-slate-600 flex items-center justify-between">
            <span className="font-medium">Current Status:</span>
            <div className="flex items-center gap-2 font-bold">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                syncStatus === 'SYNCED' ? 'bg-emerald-500' :
                syncStatus === 'SYNCING' ? 'bg-amber-500 animate-ping' :
                syncStatus === 'ERROR' ? 'bg-rose-500' : 'bg-slate-400'
              }`} />
              <span>{syncStatus}</span>
              {lastSyncTime && <span className="text-[10px] text-slate-400 font-normal">({lastSyncTime})</span>}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Close
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold bg-gradient-to-r from-[#FF5A36] to-[#FF6B4A] hover:from-[#f04f2c] hover:to-[#f05a38] text-white rounded-xl shadow-lg shadow-orange-500/25 transition-all inline-flex items-center gap-1.5"
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Saved!</span>
                </>
              ) : (
                'Save Connection'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
