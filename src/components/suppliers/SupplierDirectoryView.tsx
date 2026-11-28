import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { en } from '../../locales/en';
import { te } from '../../locales/te';
import { getLocalizedText } from '../../lib/bilingualHelper';
import { Supplier } from '../../contracts';
import { Building2, Plus, Copy, Check, CreditCard, Inbox, Pencil, Trash2 } from 'lucide-react';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import { useRouter } from '../../lib/router';
import { AlertDialog } from '../ui/AlertDialog';

export const SupplierDirectoryView: React.FC = () => {
  const { 
    suppliers, 
    language, 
    currentUser, 
    addSupplier, 
    updateSupplier, 
    deleteSupplier,
    startActionLoading, 
    stopActionLoading,
    hasFunctionalityAccess 
  } = useAppStore();
  const { route, navigate } = useRouter();
  const isAdminOrOwner = currentUser?.role === 'ADMIN' || currentUser?.role === 'OWNER';
  const t = language === 'TE' ? te : en;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'danger' | 'warning' | 'info';
    actionText: string;
    onAction: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    actionText: '',
    onAction: () => {},
  });
  const [businessName, setBusinessName] = useState('');
  const [businessNameTe, setBusinessNameTe] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [payableAmount, setPayableAmount] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierSort, setSupplierSort] = useState<'NAME_ASC' | 'PAYABLE_DESC'>('NAME_ASC');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Synchronize modal state with URL route (e.g. /suppliers/new, /suppliers/:id)
  useEffect(() => {
    if (route.view !== 'suppliers') {
      setIsModalOpen(false);
      setEditingSupplier(null);
      return;
    }

    if (route.subView === 'new') {
      setEditingSupplier(null);
      setBusinessName('');
      setBusinessNameTe('');
      setOwnerName('');
      setBankName('');
      setAccountNumber('');
      setIfscCode('');
      setNickname('');
      setPayableAmount('');
      setIsModalOpen(true);
    } else if (route.subView === 'edit' && route.paramId) {
      const s = suppliers.find((item) => item.id === route.paramId);
      if (s) {
        setEditingSupplier(s);
        setBusinessName(s.businessName || '');
        setBusinessNameTe(s.businessNameTe || '');
        setOwnerName(s.ownerName || '');
        setBankName(s.bankName || '');
        setAccountNumber(s.accountNumber || '');
        setIfscCode(s.ifscCode || '');
        setNickname(s.nickname || '');
        setPayableAmount(s.payableAmount !== undefined ? String(s.payableAmount) : '');
        setIsModalOpen(true);
      } else {
        setIsModalOpen(false);
        setEditingSupplier(null);
      }
    } else {
      setIsModalOpen(false);
      setEditingSupplier(null);
    }
  }, [route.view, route.subView, route.paramId, suppliers]);

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSupplier(null);
    setBusinessName('');
    setBusinessNameTe('');
    setOwnerName('');
    setBankName('');
    setAccountNumber('');
    setIfscCode('');
    setNickname('');
    if (route.view === 'suppliers' && route.subView) {
      navigate('/suppliers');
    }
  };

  useModalDismiss(isModalOpen, closeModal);

  const handleOpenEditModal = (s: Supplier) => {
    navigate(`/suppliers/${encodeURIComponent(s.id)}`);
  };

  const handleOpenAddModal = () => {
    navigate('/suppliers/new');
  };

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingSupplier) {
      const updatedSupplier: Supplier = {
        ...editingSupplier,
        businessName: businessName.trim(),
        businessNameTe: businessNameTe.trim(),
        ownerName: ownerName.trim(),
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        ifscCode: ifscCode.toUpperCase().trim(),
        nickname: nickname.trim(),
        payableAmount: Math.max(0, Number(payableAmount) || 0),
      };
      
      setConfirmDialog({
        isOpen: true,
        type: 'warning',
        title: language === 'TE' ? 'సరఫరాదారు వివరాలు అప్‌డేట్ చేయాలా?' : 'Update Supplier Details?',
        message: language === 'TE'
          ? `మీరు "${businessName.trim()}" మిల్లు/సరఫరాదారు బ్యాంక్ మరియు వివరాలను సేవ్ చేయాలనుకుంటున్నారా?`
          : `Are you sure you want to save updated bank & contact details for supplier "${businessName.trim()}"?`,
        actionText: language === 'TE' ? 'అవును, అప్‌డేట్ చేయి' : 'Yes, Save Changes',
        onAction: async () => {
          startActionLoading(
            `Updating supplier "${businessName.trim()}" in database...`,
            `డేటాబేస్‌లో సరఫరాదారు "${businessName.trim()}" వివరాలు సేవ్ అవుతున్నాయి...`
          );
          await updateSupplier(updatedSupplier);
          stopActionLoading();
          closeModal();
        }
      });
      return;
    } else {
      const newSupplier: Supplier = {
        id: crypto.randomUUID ? crypto.randomUUID() : `supp-${Date.now()}`,
        businessName: businessName.trim(),
        businessNameTe: businessNameTe.trim(),
        ownerName: ownerName.trim(),
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        ifscCode: ifscCode.toUpperCase().trim(),
        nickname: nickname.trim(),
        payableAmount: Math.max(0, Number(payableAmount) || 0),
        createdAt: new Date().toISOString(),
      };
      startActionLoading(
        `Saving supplier "${businessName.trim()}" to database...`,
        `డేటాబేస్‌లో సరఫరాదారు "${businessName.trim()}" నమోదు చేయబడుతోంది...`
      );
      addSupplier(newSupplier);
      stopActionLoading();
      closeModal();
    }
  };

  const handleDeleteSupplier = (s: Supplier) => {
    setConfirmDialog({
      isOpen: true,
      type: 'danger',
      title: language === 'TE' ? 'సరఫరాదారుని తొలగించాలా?' : 'Delete Supplier?',
      message: language === 'TE'
        ? `మీరు "${s.businessName}" మిల్లును శాశ్వతంగా తొలగించాలనుకుంటున్నారా? బ్యాంక్ వివరాలు మరియు రికార్డులు తొలగించబడతాయి.`
        : `Are you sure you want to permanently delete supplier "${s.businessName}"? This action cannot be undone.`,
      actionText: language === 'TE' ? 'అవును, తొలగించు' : 'Yes, Delete Supplier',
      onAction: async () => {
        startActionLoading(
          `Deleting supplier "${s.businessName}" from database...`,
          `డేటాబేస్ నుండి సరఫరాదారు "${s.businessName}" తొలగించబడుతోంది...`
        );
        await deleteSupplier(s.id);
        stopActionLoading();
        closeModal();
      }
    });
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
              {language === 'TE' ? 'సప్లయర్లు & మిల్లుల జాబితా' : 'Supplier Directory'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-900 text-white">
              {suppliers.length} {language === 'TE' ? 'మిల్లులు' : 'mills'}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            {language === 'TE' 
              ? 'రైస్ మిల్లులు, బ్యాంక్ ఖాతా వివరాలు మరియు నిక్ నేమ్స్'
              : 'Rice mills and suppliers with bank accounts and reference nicknames'}
          </p>
        </div>

        {hasFunctionalityAccess('suppliers_page', 'add_supplier') && (
          <button
            onClick={handleOpenAddModal}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-black text-sm px-6 py-3 rounded-full shadow-lg shadow-orange-500/25 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{language === 'TE' ? 'సప్లయర్‌ను చేర్చండి' : 'Add Supplier'}</span>
          </button>
        )}
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
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-full shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'TE' ? 'మొదటి సప్లయర్‌ను చేర్చండి' : 'Add First Supplier'}</span>
          </button>
        </div>
      ) : (
        /* Search, Sort & Suppliers Grid */
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white p-3 rounded-2xl border border-slate-200/80">
            <input
              type="text"
              value={supplierSearch}
              onChange={(e) => setSupplierSearch(e.target.value)}
              placeholder={language === 'TE' ? 'సప్లయర్ / బ్యాంక్ శోధించండి...' : 'Search supplier, nickname, or bank...'}
              className="text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-orange-500 w-full sm:w-64"
            />
            <select
              aria-label={language === 'TE' ? 'సప్లయర్ క్రమబద్ధీకరణ' : 'Sort suppliers'}
              value={supplierSort}
              onChange={(e) => setSupplierSort(e.target.value as any)}
              className="text-xs font-semibold border border-slate-200 rounded-xl px-2.5 py-2 bg-slate-50 outline-none focus:border-orange-500"
            >
              <option value="NAME_ASC">{language === 'TE' ? 'పేరు (A-Z)' : 'Name (A → Z)'}</option>
              <option value="PAYABLE_DESC">{language === 'TE' ? 'చెల్లించాల్సిన మొత్తం (ఎక్కువ-తక్కువ)' : 'Payable: High → Low'}</option>
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers
            .filter((s) => {
              if (!supplierSearch.trim()) return true;
              const q = supplierSearch.trim().toLowerCase();
              return (
                s.businessName.toLowerCase().includes(q) ||
                s.nickname.toLowerCase().includes(q) ||
                s.bankName.toLowerCase().includes(q)
              );
            })
            .sort((a, b) => {
              if (supplierSort === 'PAYABLE_DESC') return (b.payableAmount || 0) - (a.payableAmount || 0);
              return a.businessName.localeCompare(b.businessName);
            })
            .map((s) => (
            <div
              key={s.id}
              className="card-soft p-5 flex flex-col justify-between hover:border-orange-400 transition-all"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
                    {s.nickname}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black font-mono ${
                    (s.payableAmount || 0) > 0
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    {language === 'TE' ? 'బకాయి:' : 'Payable:'} ₹{(s.payableAmount || 0).toLocaleString()}
                  </span>
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

              <div className="pt-4 mt-2 flex items-center gap-2">
                <button
                  onClick={() => copyBankDetails(s)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
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
                {hasFunctionalityAccess('suppliers_page', 'edit_supplier') && (
                  <button
                    onClick={() => handleOpenEditModal(s)}
                    className="inline-flex items-center justify-center gap-1 text-xs font-bold py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                    title={language === 'TE' ? 'సవరించండి' : 'Edit Supplier'}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>{language === 'TE' ? 'సవరించండి' : 'Edit'}</span>
                  </button>
                )}
                {hasFunctionalityAccess('suppliers_page', 'delete_supplier') && (
                  <button
                    onClick={() => handleDeleteSupplier(s)}
                    className="inline-flex items-center justify-center gap-1 text-xs font-bold py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
                    title={language === 'TE' ? 'సరఫరాదారుని తొలగించండి' : 'Delete Supplier'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{language === 'TE' ? 'తొలగించు' : 'Delete'}</span>
                  </button>
                )}
              </div>
            </div>
          ))}
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={closeModal}
        >
          <div 
            className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-3xl w-full p-5 sm:p-7 border border-slate-100 h-[88vh] sm:h-[90vh] max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-4 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Drag Indicator Bar */}
            <div className="w-12 h-1.5 rounded-full bg-slate-300 mx-auto mb-3 sm:hidden" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 shrink-0">
              <h2 className="text-xl font-black text-slate-900">
                {editingSupplier
                  ? (language === 'TE' ? 'సప్లయర్ వివరాలను సవరించండి' : 'Edit Supplier Details')
                  : (language === 'TE' ? 'కొత్త సప్లయర్‌ను చేర్చండి' : 'Add New Supplier')}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold p-1 leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddSupplier} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto no-scrollbar pr-1 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {language === 'TE' ? 'వ్యాపార పేరు (ఇంగ్లీష్) *' : 'Business Name (English) *'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={language === 'TE' ? 'ఉదా: Sri Lalitha Rice Industries' : 'e.g. Sri Lalitha Rice Industries'}
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full text-xs font-medium border border-slate-300 rounded-xl p-3 outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {language === 'TE' ? 'వ్యాపార పేరు (తెలుగు) - ఐచ్ఛికం' : 'Business Name (Regional) - Optional'}
                    </label>
                    <input
                      type="text"
                      placeholder={language === 'TE' ? 'ఉదా: శ్రీ లలిత రైస్ ఇండస్ట్రీస్' : 'e.g. Regional Script'}
                      value={businessNameTe}
                      onChange={(e) => setBusinessNameTe(e.target.value)}
                      className="w-full text-xs font-medium border border-slate-300 rounded-xl p-3 outline-none focus:border-orange-500 font-telugu"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {language === 'TE' ? 'యజమాని పేరు' : 'Owner Name'}
                    </label>
                    <input
                      type="text"
                      placeholder={language === 'TE' ? 'ఉదా: M. Rao' : 'e.g. M. Rao'}
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      className="w-full text-xs font-medium border border-slate-300 rounded-xl p-3 outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {language === 'TE' ? 'గుర్తింపు పేరు (Nickname) *' : 'Reference Nickname *'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={language === 'TE' ? 'ఉదా: Lalitha SBI' : 'e.g. Lalitha SBI'}
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      className="w-full text-xs font-medium border border-slate-300 rounded-xl p-3 outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'TE' ? 'బ్యాంక్ పేరు *' : 'Bank Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={language === 'TE' ? 'ఉదా: State Bank of India' : 'e.g. State Bank of India'}
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full text-xs font-medium border border-slate-300 rounded-xl p-3 outline-none focus:border-orange-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {language === 'TE' ? 'ఖాతా నంబర్ (Account Number) *' : 'Account Number *'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={language === 'TE' ? 'ఉదా: 30291823901' : 'e.g. 30291823901'}
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="w-full text-xs font-bold border border-slate-300 rounded-xl p-3 outline-none focus:border-orange-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {language === 'TE' ? 'ఐఎఫ్ఎస్సీ కోడ్ (IFSC Code) *' : 'IFSC Code *'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={language === 'TE' ? 'ఉదా: SBIN0001234' : 'e.g. SBIN0001234'}
                      value={ifscCode}
                      onChange={(e) => setIfscCode(e.target.value)}
                      className="w-full text-xs font-bold border border-slate-300 rounded-xl p-3 outline-none focus:border-orange-500 font-mono uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'TE' ? 'సప్లయర్‌కు చెల్లించాల్సిన బకాయి (₹ Payable)' : 'Amount Payable to Supplier (₹)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={payableAmount}
                    onChange={(e) => setPayableAmount(e.target.value)}
                    className="w-full text-xs font-bold border border-slate-300 rounded-xl p-3 outline-none focus:border-orange-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200 shrink-0">
                {editingSupplier && isAdminOrOwner ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteSupplier(editingSupplier)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-full transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>{language === 'TE' ? 'సరఫరాదారుని తొలగించు' : 'Delete Supplier'}</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-full"
                  >
                    {language === 'TE' ? 'రద్దు చేయి' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="px-7 py-3 text-xs font-black bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white rounded-full shadow-lg shadow-orange-500/25 transition-all active:scale-95"
                  >
                    {editingSupplier
                      ? (language === 'TE' ? 'సప్లయర్‌ను నవీకరించండి' : 'Update Supplier')
                      : (language === 'TE' ? 'సప్లయర్‌ను భద్రపరచండి' : 'Save Supplier')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Edit / Delete */}
      <AlertDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        type={confirmDialog.type || 'warning'}
        title={confirmDialog.title}
        message={confirmDialog.message}
        actionText={confirmDialog.actionText}
        cancelText={language === 'TE' ? 'రద్దు చేయి' : 'Cancel'}
        onAction={confirmDialog.onAction}
      />
    </div>
  );
};
