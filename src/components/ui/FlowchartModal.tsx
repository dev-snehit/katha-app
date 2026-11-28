import React, { useState } from 'react';
import { GitBranch, X, ArrowRight } from 'lucide-react';
import { useModalDismiss } from '../../hooks/useModalDismiss';

interface FlowchartModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'EN' | 'TE';
}

interface FlowDef {
  id: string;
  titleEn: string;
  titleTe: string;
  steps: { labelEn: string; labelTe: string; detailEn: string; detailTe: string; color: string }[];
}

const FLOWS: FlowDef[] = [
  {
    id: 'auth',
    titleEn: 'Auth & 1-Hr Session',
    titleTe: 'లాగిన్ & సెషన్',
    steps: [
      { labelEn: 'Sign In / Request Access', labelTe: 'లాగిన్ / రిజిస్టర్', detailEn: 'Loading spinner + URL (/login, /register)', detailTe: 'లోడింగ్ స్పిన్నర్ + URL', color: 'bg-orange-50 border-orange-200 text-orange-900' },
      { labelEn: 'Backend JWT Auth', labelTe: 'JWT ధృవీకరణ', detailEn: 'HS256 token (1 hr) + Role check', detailTe: 'HS256 టోకెన్ (1 గంట)', color: 'bg-blue-50 border-blue-200 text-blue-900' },
      { labelEn: '5-Min Warning / Refresh', labelTe: '5-నిమిషాల హెచ్చరిక', detailEn: 'Stay Signed In or Auto-Logout', detailTe: 'కొనసాగండి లేదా లాగౌట్', color: 'bg-emerald-50 border-emerald-200 text-emerald-900' },
    ],
  },
  {
    id: 'orders',
    titleEn: '3-Stage Order + Payment',
    titleTe: '3-దశల ఆర్డర్ & చెల్లింపు',
    steps: [
      { labelEn: '1. Pending', labelTe: '1. పెండింగ్', detailEn: 'Items + Bilingual Category + Reserve Stock', detailTe: 'సరుకులు + వర్గం + రిజర్వ్', color: 'bg-blue-50 border-blue-200 text-blue-900' },
      { labelEn: '2. Approved', labelTe: '2. ఆమోదించబడింది', detailEn: 'Deduct Godown Stock + Credit Ledger', detailTe: 'స్టాక్ తగ్గింపు + ఖాతా', color: 'bg-amber-50 border-amber-200 text-amber-900' },
      { labelEn: '3. Delivered + Payment', labelTe: '3. డెలివరీ + చెల్లింపు', detailEn: 'Select Cash / Credit / UPI / A/C / Cheque / DD', detailTe: 'చెల్లింపు విధానం ఎంపిక', color: 'bg-emerald-50 border-emerald-200 text-emerald-900' },
    ],
  },
  {
    id: 'suppliers_followups',
    titleEn: 'Suppliers & Follow-Ups',
    titleTe: 'సప్లయర్లు & ఫాలో-అప్స్',
    steps: [
      { labelEn: 'Stock & Category EN/TE', labelTe: 'స్టాక్ & వర్గం', detailEn: 'Rice, Broken Rice, Ravva, Dals', detailTe: 'బియ్యం, నూకలు, రవ్వ, పప్పులు', color: 'bg-slate-50 border-slate-200 text-slate-900' },
      { labelEn: 'Supplier Payables (₹)', labelTe: 'సప్లయర్ బకాయిలు', detailEn: 'Track owed amount on Directory & Dashboard', detailTe: 'డైరెక్టరీ & డాష్‌బోర్డ్‌లో బకాయి', color: 'bg-rose-50 border-rose-200 text-rose-900' },
      { labelEn: 'Walk-In Follow-Ups', labelTe: 'వాక్-ఇన్ ఫాలో-అప్స్', detailEn: 'Save visitor, purpose & WhatsApp follow-up', detailTe: 'ఉద్దేశ్యం + వాట్సాప్ ఫాలో-అప్', color: 'bg-emerald-50 border-emerald-200 text-emerald-900' },
    ],
  },
  {
    id: 'sync',
    titleEn: 'DB Sync & Constraints',
    titleTe: 'డేటాబేస్ సింక్',
    steps: [
      { labelEn: 'UI Mutation + Spinner', labelTe: 'యాక్షన్ స్పిన్నర్', detailEn: 'Attach authToken + version', detailTe: 'authToken + version', color: 'bg-orange-50 border-orange-200 text-orange-900' },
      { labelEn: 'LockService + Constraints', labelTe: 'లాక్ & నియమాలు', detailEn: 'PK/UK/FK/CHECK + Server UUID/ORD-#', detailTe: 'PK/UK/FK/CHECK తనిఖీ', color: 'bg-purple-50 border-purple-200 text-purple-900' },
      { labelEn: 'Top-Right Toast', labelTe: 'నోటిఫికేషన్ టోస్ట్', detailEn: 'Reconcile ID/version or friendly EN/TE error', detailTe: 'సేవ్ నిర్ధారణ లేదా లోపం', color: 'bg-emerald-50 border-emerald-200 text-emerald-900' },
    ],
  },
  {
    id: 'master_reset',
    titleEn: 'Master Reset (Admin)',
    titleTe: 'మాస్టర్ రీసెట్ (అడ్మిన్)',
    steps: [
      { labelEn: 'Permission Switch', labelTe: 'అనుమతి స్విచ్', detailEn: 'Toggle master_reset in Role Controls', detailTe: 'రోల్ కంట్రోల్స్‌లో master_reset', color: 'bg-slate-50 border-slate-200 text-slate-900' },
      { labelEn: 'Double Confirmation', labelTe: 'రెండు సార్లు నిర్ధారణ', detailEn: 'Step 1 & Step 2 Danger AlertDialogs', detailTe: 'దశ 1 & దశ 2 హెచ్చరికలు', color: 'bg-rose-50 border-rose-200 text-rose-900' },
      { labelEn: 'Wipe & Seed Admin', labelTe: 'క్లీన్ & డిఫాల్ట్ అడ్మిన్', detailEn: 'Clear sheets + dev.snehit@gmail.com (ADMIN)', detailTe: 'షీట్స్ క్లియర్ + dev.snehit@gmail.com', color: 'bg-emerald-50 border-emerald-200 text-emerald-900' },
    ],
  },
];

export const FlowchartModal: React.FC<FlowchartModalProps> = ({ isOpen, onClose, language }) => {
  const [activeId, setActiveId] = useState('orders');
  const isTe = language === 'TE';
  useModalDismiss(isOpen, onClose);
  if (!isOpen) return null;

  const activeFlow = FLOWS.find((f) => f.id === activeId) || FLOWS[0];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-5 sm:p-6 border border-slate-200 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-[#FF5A36]" />
            <span>{isTe ? 'సిస్టమ్ యాక్షన్ ఫ్లోచార్ట్‌లు' : 'System Action Flowcharts'}</span>
          </h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex flex-wrap gap-2">
          {FLOWS.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveId(f.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeId === f.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {isTe ? f.titleTe : f.titleEn}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-6 bg-slate-50 rounded-2xl border border-slate-200/80">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {activeFlow.steps.map((st, idx) => (
              <React.Fragment key={idx}>
                <div className={`flex-1 p-4 rounded-2xl border shadow-xs ${st.color}`}>
                  <div className="text-xs font-black mb-1">{isTe ? st.labelTe : st.labelEn}</div>
                  <div className="text-[11px] opacity-85">{isTe ? st.detailTe : st.detailEn}</div>
                </div>
                {idx < activeFlow.steps.length - 1 && (
                  <ArrowRight className="w-5 h-5 text-slate-400 shrink-0 self-center rotate-90 md:rotate-0" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
