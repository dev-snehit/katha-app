import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { en } from '../../locales/en';
import { te } from '../../locales/te';
import { getLocalizedText } from '../../lib/bilingualHelper';
import { Customer } from '../../contracts';
import { Users, Plus, Phone, MapPin, Send, Inbox, AlertTriangle } from 'lucide-react';
import { validateCustomer } from '../../lib/customerValidation';
import { useModalDismiss } from '../../hooks/useModalDismiss';

export const CustomerDirectoryView: React.FC = () => {
  const { customers, language, addCustomer } = useAppStore();
  const t = language === 'TE' ? te : en;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [nameTe, setNameTe] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const closeModal = () => {
    setIsModalOpen(false);
    setError('');
    setFieldErrors({});
  };

  useModalDismiss(isModalOpen, closeModal);

  const getInitials = (name: string) => {
    if (!name) return 'CU';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const validation = validateCustomer({
      name,
      nameTe,
      phone,
      businessName,
      address,
    }, language as 'EN' | 'TE');

    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      setError(validation.errorMessage || (language === 'TE' ? 'దయచేసి ఫారమ్‌లోని లోపాలను సరిదిద్దండి.' : 'Please correct the highlighted form errors.'));
      return;
    }

    const newCustomer: Customer = {
      id: crypto.randomUUID ? crypto.randomUUID() : `cust-${Date.now()}`,
      name: name.trim(),
      nameTe: nameTe.trim(),
      phone: phone.trim(),
      businessName: businessName.trim(),
      address: address.trim(),
      currentDue: 0,
      createdAt: new Date().toISOString(),
    };

    addCustomer(newCustomer);
    setIsModalOpen(false);
    setName('');
    setNameTe('');
    setPhone('');
    setBusinessName('');
    setAddress('');
    setError('');
    setFieldErrors({});
  };

  const openWhatsAppChat = (c: Customer) => {
    const text = encodeURIComponent(
      `Hello ${c.name}, Greetings from Katha Wholesale!\n` +
      `Your current outstanding balance is: Rs. ${c.currentDue.toLocaleString()}.\n` +
      `Please let us know your next grain requirements.`
    );
    window.open(`https://wa.me/91${c.phone}?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {language === 'TE' ? 'ఖాతాదారుల జాబితా' : 'Customer Directory'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-900 text-white">
              {customers.length} {language === 'TE' ? 'మంది' : 'clients'}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            {language === 'TE' 
              ? 'కిరాణా దుకాణాలు, హోటళ్ళు మరియు రిటైలర్ల వివరాలు'
              : 'Retailers, kirana shops, and catering buyers with mandatory WhatsApp numbers'}
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-black text-sm px-6 py-3 rounded-full shadow-lg shadow-orange-500/25 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>{language === 'TE' ? 'కస్టమర్‌ను చేర్చండి' : 'Add Customer'}</span>
        </button>
      </div>

      {/* Empty State */}
      {customers.length === 0 ? (
        <div className="card-soft p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-3xl bg-orange-50 text-orange-500 flex items-center justify-center mb-4">
            <Inbox className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            No customer accounts registered yet
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mb-6">
            Register your first retail customer or kirana store with their phone number to enable 1-click WhatsApp billing.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-full shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'TE' ? 'మొదటి కస్టమర్‌ను చేర్చండి' : 'Add First Customer'}</span>
          </button>
        </div>
      ) : (
        /* Customers Mobile Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((c) => {
            const initials = getInitials(c.name);

            return (
              <div
                key={c.id}
                className="card-soft p-5 flex flex-col justify-between hover:border-orange-400 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-800 border border-orange-200 flex items-center justify-center font-black text-xs shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 truncate">
                          {getLocalizedText(c, 'name', language)}
                        </h4>
                        {c.businessName && (
                          <div className="text-xs text-slate-500 font-medium truncate">
                            {getLocalizedText(c, 'businessName', language)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">
                        Current Due
                      </span>
                      <span className={`text-sm font-black font-mono ${
                        c.currentDue > 0 ? 'text-rose-600' : 'text-emerald-700'
                      }`}>
                        Rs. {c.currentDue.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" /> Mobile:
                      </span>
                      <span className="font-mono font-bold text-slate-800">{c.phone}</span>
                    </div>
                    {c.address && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" /> Address:
                        </span>
                        <span className="text-slate-600 truncate max-w-[180px]">
                          {getLocalizedText(c, 'address', language)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={() => openWhatsAppChat(c)}
                    className="w-full inline-flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold py-2 px-3 rounded-xl border border-emerald-200 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    WhatsApp Statement
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Customer Modal */}
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
                {language === 'TE' ? 'కొత్త కస్టమర్‌ను చేర్చండి' : 'Add New Customer'}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold p-1 leading-none"
              >
                &times;
              </button>
            </div>

            {error && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200 flex items-start gap-2 shrink-0">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleAddCustomer} noValidate className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto no-scrollbar pr-1 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {language === 'TE' ? 'కస్టమర్ పేరు (కేవలం అక్షరాలు మాత్రమే) *' : 'Customer Name (Alphabets Only) *'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={language === 'TE' ? 'ఉదా: Sri Balaji Kirana Stores' : 'e.g. Sri Balaji Kirana Stores'}
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (fieldErrors.name) {
                          setFieldErrors((prev) => { const n = { ...prev }; delete n.name; return n; });
                        }
                      }}
                      className={`w-full text-xs font-medium border rounded-xl p-3 outline-none transition-colors ${
                        fieldErrors.name 
                          ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500' 
                          : 'border-slate-300 focus:border-orange-500'
                      }`}
                    />
                    {fieldErrors.name && (
                      <p className="text-[11px] font-semibold text-rose-600 mt-1">{fieldErrors.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {language === 'TE' ? '10-అంకెల మొబైల్ నంబర్ (WhatsApp) *' : '10-Digit Mobile Number (WhatsApp) *'}
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9848022338"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (fieldErrors.phone) {
                          setFieldErrors((prev) => { const n = { ...prev }; delete n.phone; return n; });
                        }
                      }}
                      className={`w-full text-xs font-bold border rounded-xl p-3 outline-none transition-colors font-mono ${
                        fieldErrors.phone 
                          ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500' 
                          : 'border-slate-300 focus:border-orange-500'
                      }`}
                    />
                    {fieldErrors.phone && (
                      <p className="text-[11px] font-semibold text-rose-600 mt-1">{fieldErrors.phone}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {language === 'TE' ? 'కస్టమర్ పేరు (తెలుగు) - ఐచ్ఛికం' : 'Customer Name (Regional) - Optional'}
                    </label>
                    <input
                      type="text"
                      placeholder={language === 'TE' ? 'ఉదా: శ్రీ బాలాజీ కిరాణా స్టోర్స్' : 'e.g. Regional Script'}
                      value={nameTe}
                      onChange={(e) => setNameTe(e.target.value)}
                      className="w-full text-xs font-medium border border-slate-300 rounded-xl p-3 outline-none focus:border-orange-500 font-telugu"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {language === 'TE' ? 'వ్యాపార / దుకాణం పేరు' : 'Business / Shop Name'}
                    </label>
                    <input
                      type="text"
                      placeholder={language === 'TE' ? 'ఉదా: Balaji Traders' : 'e.g. Balaji Traders'}
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full text-xs font-medium border border-slate-300 rounded-xl p-3 outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'TE' ? 'చిరునామా' : 'Address'}
                  </label>
                  <textarea
                    rows={3}
                    placeholder={language === 'TE' ? 'షాప్ నంబర్, వీధి, ప్రాంతం, ఊరు...' : 'Shop number, street, area, city...'}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full text-xs font-medium border border-slate-300 rounded-xl p-3 outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-full"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-7 py-3 text-xs font-black bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white rounded-full shadow-lg shadow-orange-500/25 transition-all active:scale-95"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
