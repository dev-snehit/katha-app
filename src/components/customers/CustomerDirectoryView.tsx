import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { en } from '../../locales/en';
import { te } from '../../locales/te';
import { getLocalizedText } from '../../lib/bilingualHelper';
import { Customer } from '../../contracts';
import { Users, Plus, Phone, MapPin, Send } from 'lucide-react';

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

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    const newCustomer: Customer = {
      id: crypto.randomUUID ? crypto.randomUUID() : `cust-${Date.now()}`,
      name,
      nameTe,
      phone,
      businessName,
      address,
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
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {t.nav.customers} (కస్టమర్ డైరెక్టరీ)
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Retailers, kirana shops, and catering buyers with mandatory WhatsApp numbers
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          + Add Customer (కస్టమర్ చేర్చండి)
        </button>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Customer Name (కస్టమర్ పేరు)</th>
                <th className="px-6 py-4">Business / Shop Name</th>
                <th className="px-6 py-4">Mobile Number</th>
                <th className="px-6 py-4">Address</th>
                <th className="px-6 py-4 text-right">Current Due (బకాయి)</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-900">
                    {getLocalizedText(c, 'name', language)}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-800">
                    {getLocalizedText(c, 'businessName', language) || '-'}
                  </td>
                  <td className="px-6 py-4 font-mono font-semibold text-slate-700">
                    {c.phone}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">
                    {getLocalizedText(c, 'address', language) || '-'}
                  </td>
                  <td className="px-6 py-4 text-right font-bold">
                    {c.currentDue > 0 ? (
                      <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                        Rs. {c.currentDue.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        Settled (Rs. 0)
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openWhatsAppChat(c)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      WhatsApp
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              Add Customer (కస్టమర్ చేర్చండి)
            </h2>

            {error && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 text-rose-700 text-xs font-medium border border-rose-200">
                {error}
              </div>
            )}

            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer Name (English) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sri Balaji Kirana Stores"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer Name (తెలుగు) - Optional
                </label>
                <input
                  type="text"
                  placeholder="ఉదా: శ్రీ బాలాజీ కిరాణా స్టోర్స్"
                  value={nameTe}
                  onChange={(e) => setNameTe(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 outline-none focus:border-brand-500 font-telugu"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  10-Digit Mobile Number (WhatsApp) *
                </label>
                <input
                  type="tel"
                  required
                  pattern="[6-9][0-9]{9}"
                  placeholder="e.g. 9848022338"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 outline-none focus:border-brand-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Business / Shop Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Balaji Traders"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Address
                </label>
                <textarea
                  rows={2}
                  placeholder="Shop number, street, area, city..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white rounded-lg shadow-md transition-colors"
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
