import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Settings, Link2, Check, ExternalLink } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { backendUrl, setBackendUrl } = useAppStore();
  const [urlInput, setUrlInput] = useState(backendUrl);
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setBackendUrl(urlInput);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
            <Settings className="w-5 h-5 text-brand-600" />
            <span>Backend Connection Settings</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-sm">
            &times;
          </button>
        </div>

        <p className="text-xs text-slate-500 mb-4">
          Connect your Katha Wholesale web app to your free Google Apps Script Webhook. All approved orders and customer transactions sync directly to your Master Google Sheet.
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Google Apps Script Web App URL:
            </label>
            <div className="relative">
              <input
                type="url"
                placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2.5 outline-none focus:border-brand-500 pr-10"
              />
              <Link2 className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Follow instructions in <span className="font-semibold text-slate-600">docs/SETUP_GUIDE.md</span> to deploy the script in your Google Sheet.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Close
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white rounded-lg shadow-md transition-colors inline-flex items-center gap-1.5"
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
