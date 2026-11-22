import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { en } from '../../locales/en';
import { te } from '../../locales/te';
import { getLocalizedText } from '../../lib/bilingualHelper';
import { Supplier } from '../../contracts';
import { Building2, Plus, Copy, Check, CreditCard, Inbox } from 'lucide-react';

export const SupplierDirectoryView: React.FC = () => {
  const { suppliers, language, addSupplier } = useAppStore();
  const t = language === 'TE' ? te : en;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [businessNameTe, setBusinessNameTe] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();

    const newSupplier: Supplier = {
      id: crypto.randomUUID ? crypto.randomUUID() : `supp-${Date.now()}`,
      businessName,
      businessNameTe,
      ownerName,
      bankName,
      accountNumber,
      ifscCode: ifscCode.toUpperCase(),
      nickname,
      createdAt: new Date().toISOString(),
    };

    addSupplier(newSupplier);
    setIsModalOpen(false);
    setBusinessName('');
    setBusinessNameTe('');
    setOwnerName('');
    setBankName('');
    setAccountNumber('');
    setIfscCode('');
    setNickname('');
  };

  const copyBankDetails = (s: Supplier) => {
    const text = 
      `Bank: ${s.bankName}\n` +
      `A/C: ${s.accountNumber}\n` +
      `IFSC: ${s.ifscCode}\n` +
      `Beneficiary: ${s.businessName}`;
    navigator.clipboard.writeText(text);
    setCopiedId(s.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Supplier Directory (రైస్ మిల్లులు)
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-900 text-white">
              {suppliers.length} mills
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Rice mills and suppliers with bank accounts and reference nicknames
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-black text-sm px-6 py-3 rounded-full shadow-lg shadow-orange-500/25 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Add Supplier (సప్లయర్ చేర్చండి)</span>
        </button>
      </div>

      {/* Empty State */}
      {suppliers.length === 0 ? (
        <div className="card-soft p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-3xl bg-orange-50 text-orange-500 flex items-center justify-center mb-4">
            <Inbox className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            No suppliers or rice mills added yet
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mb-6">
            Add your primary rice mills and grain suppliers along with their bank account numbers and IFSC codes.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-full shadow-md"
          >
            <Plus className="w-4 h-4" />
            + Add First Supplier
          </button>
        </div>
      ) : (
        /* Suppliers Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((s) => (
            <div
              key={s.id}
              className="card-soft p-5 flex flex-col justify-between hover:border-orange-400 transition-all"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
                    {s.nickname}
                  </span>
                  <CreditCard className="w-4 h-4 text-slate-400" />
                </div>

                <h3 className="text-base font-black text-slate-900">
                  {getLocalizedText(s, 'businessName', language)}
                </h3>
                {s.ownerName && (
                  <p className="text-xs text-slate-400 mt-0.5 font-medium">
                    Prop: {s.ownerName}
                  </p>
                )}

                {/* Bank Details Card */}
                <div className="mt-4 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100 text-xs space-y-1.5 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Bank:</span>
                    <span className="font-bold text-slate-800 font-sans">{s.bankName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">A/C No:</span>
                    <span className="font-extrabold text-slate-900">{s.accountNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">IFSC:</span>
                    <span className="font-extrabold text-emerald-700">{s.ifscCode}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-2">
                <button
                  onClick={() => copyBankDetails(s)}
                  className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
                >
                  {copiedId === s.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                      <span className="text-emerald-700 font-bold">Copied Bank Details!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy Bank Details</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Supplier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-100">
            <h2 className="text-xl font-black text-slate-900 mb-4">
              Add Supplier (సప్లయర్ చేర్చండి)
            </h2>

            <form onSubmit={handleAddSupplier} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Business Name (English) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sri Lalitha Rice Industries"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full text-xs font-medium border border-slate-300 rounded-xl p-3 outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Business Name (తెలుగు) - Optional
                </label>
                <input
                  type="text"
                  placeholder="ఉదా: శ్రీ లలిత రైస్ ఇండస్ట్రీస్"
                  value={businessNameTe}
                  onChange={(e) => setBusinessNameTe(e.target.value)}
                  className="w-full text-xs font-medium border border-slate-300 rounded-xl p-3 outline-none focus:border-orange-500 font-telugu"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Owner Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. M. Rao"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full text-xs font-medium border border-slate-300 rounded-xl p-3 outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Reference Nickname *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lalitha SBI"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full text-xs font-medium border border-slate-300 rounded-xl p-3 outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Bank Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. State Bank of India / HDFC"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full text-xs font-medium border border-slate-300 rounded-xl p-3 outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Account Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="30291823901"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full text-xs font-bold border border-slate-300 rounded-xl p-3 outline-none focus:border-orange-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    IFSC Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="SBIN0001234"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value)}
                    className="w-full text-xs font-bold border border-slate-300 rounded-xl p-3 outline-none focus:border-orange-500 font-mono uppercase"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-full"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-7 py-3 text-xs font-black bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white rounded-full shadow-lg shadow-orange-500/25 transition-all active:scale-95"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
