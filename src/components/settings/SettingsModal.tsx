import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { pingGoogleSheet } from '../../lib/syncService';
import { 
  Settings, 
  Link2, 
  Check, 
  ExternalLink, 
  RefreshCw, 
  Radio, 
  AlertCircle,
  Type,
  Minus,
  Plus,
  RotateCcw
} from 'lucide-react';
import { useModalDismiss } from '../../hooks/useModalDismiss';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { 
    backendUrl, 
    setBackendUrl, 
    syncAllToGoogleSheets, 
    syncStatus, 
    lastSyncTime,
    baseFontSize,
    setBaseFontSize,
    language,
    connectAndHydrateServer
  } = useAppStore();
  const [urlInput, setUrlInput] = useState(backendUrl);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncAllResult, setSyncAllResult] = useState<string | null>(null);

  useModalDismiss(isOpen, onClose);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const urlChanged = urlInput.trim() !== backendUrl;
    setBackendUrl(urlInput);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
    }, 1500);

    if (urlChanged && urlInput.trim()) {
      onClose();
      await connectAndHydrateServer();
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const res = await pingGoogleSheet(urlInput);
    setTesting(false);
    if (res.success) {
      setTestResult({
        success: true,
        message: 'Connected successfully to cloud database backend!'
      });
    } else {
      setTestResult({
        success: false,
        message: res.error || 'Failed to connect. Verify your database API Webhook URL and permissions.'
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
      setSyncAllResult('All local commodities, customers, suppliers, and orders synced to cloud database!');
    } else {
      setSyncAllResult('Sync failed. Please test your connection above.');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-3xl w-full p-5 sm:p-7 border border-slate-100 h-[88vh] sm:h-[90vh] max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Indicator Bar */}
        <div className="w-12 h-1.5 rounded-full bg-slate-300 mx-auto mb-3 sm:hidden" />

        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 shrink-0">
          <div className="flex items-center gap-2.5 text-slate-900 font-extrabold text-lg">
            <div className="p-2 rounded-xl bg-orange-50 text-[#FF5A36]">
              <Settings className="w-5 h-5" />
            </div>
            <span>{language === 'TE' ? 'క్లౌడ్ డేటాబేస్ సింక్' : 'Cloud Database Sync'}</span>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSave} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto no-scrollbar pr-1 space-y-4">
            <p className="text-xs text-slate-500 mb-2 leading-relaxed">
              {language === 'TE'
                ? 'కథా హోల్‌సేల్‌ను మీ సురక్షిత క్లౌడ్ డేటాబేస్ బ్యాకెండ్ APIకి కనెక్ట్ చేయండి. మీ అన్ని లావాదేవీలు, స్టాక్, కస్టమర్ వివరాలు ఆటోమేటిక్‌గా సింక్ అవుతాయి.'
                : 'Connect Katha Wholesale to your secure cloud database backend API. All inventory, customer records, and orders synchronize automatically.'}
            </p>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {language === 'TE' ? 'బ్యాకెండ్ డేటాబేస్ వెబ్‌హుక్ API URL:' : 'Backend Database Webhook API URL:'}
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
              <span>{testing ? 'Testing Connection...' : (language === 'TE' ? 'కనెక్షన్‌ని పరీక్షించండి' : 'Test Connection')}</span>
            </button>

            <button
              type="button"
              onClick={handleSyncAll}
              disabled={isSyncingAll || !urlInput.trim()}
              className="px-3.5 py-2 text-xs font-bold bg-orange-50 hover:bg-orange-100 text-[#FF5A36] border border-orange-200 rounded-xl transition-all disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
              <span>{isSyncingAll ? 'Syncing...' : (language === 'TE' ? 'అన్ని వివరాలను డేటాబేస్‌కు సింక్ చేయండి' : 'Sync All Records to Database')}</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                setBackendUrl(urlInput);
                onClose();
                await connectAndHydrateServer();
              }}
              disabled={!urlInput.trim()}
              className="px-3.5 py-2 text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl transition-all disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
              <span>{language === 'TE' ? 'డేటాబేస్ నుండి రీ-సింక్ చేయండి' : 'Connect & Sync from Database'}</span>
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

          {/* Base Font Size Configuration (Global Typography Scaling) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-orange-100 text-[#FF5A36]">
                  <Type className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    {language === 'TE' ? 'బేస్ ఫాంట్ పరిమాణం (Font Scaling)' : 'Base Font Size (Typography Scaling)'}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {language === 'TE'
                      ? 'ఈ సంఖ్య ఆధారంగా అన్ని పేజీలు, పట్టికలు, ఫీల్డ్‌ల ఫాంట్ ఆటోమేటిక్‌గా మారుతుంది.'
                      : 'Base font size in px. All options, fields, views, and pages scale proportionally.'}
                  </p>
                </div>
              </div>
              <span className="text-xs font-black px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-800 shadow-sm font-mono">
                {baseFontSize}px
              </span>
            </div>

            {/* Stepper & Direct Number Input */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex items-center border border-slate-300 rounded-xl bg-white shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setBaseFontSize(Math.max(12, baseFontSize - 1))}
                  disabled={baseFontSize <= 12}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white transition-colors border-r border-slate-200 text-sm font-bold"
                  aria-label="Decrease font size"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <div className="flex items-center px-3">
                  <input
                    type="number"
                    min={12}
                    max={26}
                    step={1}
                    value={baseFontSize}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) {
                        setBaseFontSize(val);
                      }
                    }}
                    className="w-12 text-center text-xs font-bold outline-none font-mono bg-transparent"
                  />
                  <span className="text-[11px] text-slate-400 font-bold ml-0.5">px</span>
                </div>
                <button
                  type="button"
                  onClick={() => setBaseFontSize(Math.min(26, baseFontSize + 1))}
                  disabled={baseFontSize >= 26}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white transition-colors border-l border-slate-200 text-sm font-bold"
                  aria-label="Increase font size"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { label: language === 'TE' ? 'చిన్నది' : 'Compact', size: 14 },
                  { label: language === 'TE' ? 'డిఫాల్ట్' : 'Default', size: 16 },
                  { label: language === 'TE' ? 'పెద్దది' : 'Large', size: 18 },
                  { label: language === 'TE' ? 'ఎక్కువ' : 'XL', size: 20 },
                ].map((preset) => (
                  <button
                    key={preset.size}
                    type="button"
                    onClick={() => setBaseFontSize(preset.size)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      baseFontSize === preset.size
                        ? 'bg-[#FF5A36] text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {preset.label} ({preset.size})
                  </button>
                ))}

                {baseFontSize !== 16 && (
                  <button
                    type="button"
                    onClick={() => setBaseFontSize(16)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-700 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{language === 'TE' ? 'రీసెట్' : 'Reset'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Live Preview Container */}
            <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                {language === 'TE' ? 'లైవ్ ప్రివ్యూ' : 'Live Preview'}
              </span>
              <p className="text-sm font-bold text-slate-800">
                {language === 'TE'
                  ? 'కథా హోల్‌సేల్ • సోనా మసూరి బియ్యం (₹1,450 / బస్తా) • ప్రత్యక్ష ఫాంట్ స్కేలింగ్'
                  : 'Katha Wholesale • Sona Masoori Rice (₹1,450 / bag) • Live Scaled Sample'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {language === 'TE' 
                  ? 'ఆర్డర్లు, స్టాక్ రిజిస్ట్రీ, కస్టమర్లు మరియు సరఫరాదారుల అన్ని వివరాలు దీనికి అనుగుణంగా మారుతాయి.'
                  : 'All tables, order items, customer fields, and dialogs dynamically adjust to this size.'}
              </p>
            </div>
          </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 shrink-0">
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
