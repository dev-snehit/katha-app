import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { en } from '../../locales/en';
import { te } from '../../locales/te';
import { getLocalizedText } from '../../lib/bilingualHelper';
import { Product } from '../../contracts';
import { Package, Plus, AlertTriangle, Layers } from 'lucide-react';

export const StockRegistryView: React.FC = () => {
  const { inventory, language, unpackProduct, addProduct } = useAppStore();
  const t = language === 'TE' ? te : en;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [nameTe, setNameTe] = useState('');
  const [category, setCategory] = useState('RICE');
  const [brandOrMill, setBrandOrMill] = useState('');
  const [innerBagWeightKg, setInnerBagWeightKg] = useState(26);
  const [innerBagsPerOuter, setInnerBagsPerOuter] = useState(1);
  const [stockPhysicalOuter, setStockPhysicalOuter] = useState(100);
  const [wholesalePriceBag, setWholesalePriceBag] = useState(1450);

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const outerBagTotalKg = innerBagWeightKg * innerBagsPerOuter;

    const newProd: Product = {
      id: crypto.randomUUID ? crypto.randomUUID() : `prod-${Date.now()}`,
      name,
      nameTe,
      category,
      brandOrMill,
      innerBagWeightKg,
      innerBagsPerOuter,
      outerBagTotalKg,
      stockPhysicalOuter,
      stockReservedOuter: 0,
      stockLooseInner: 0,
      stockLooseKg: 0,
      costPricePerBag: wholesalePriceBag * 0.9,
      wholesalePriceBag,
      pricePerInnerBag: wholesalePriceBag / innerBagsPerOuter,
    };

    addProduct(newProd);
    setIsModalOpen(false);
    setName('');
    setNameTe('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {t.stock.title}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Physical bags, reserved bags, loose packets, and auto-unbundling
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          + Add Commodity (సరుకు చేర్చండి)
        </button>
      </div>

      {/* Stock Cards / Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Commodity (సరుకు)</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Brand / Mill</th>
                <th className="px-6 py-4">Bag Spec</th>
                <th className="px-6 py-4 text-center">{t.stock.physicalOuter}</th>
                <th className="px-6 py-4 text-center">{t.stock.reservedOuter}</th>
                <th className="px-6 py-4 text-center">{t.stock.availableOuter}</th>
                <th className="px-6 py-4 text-center">{t.stock.looseInner}</th>
                <th className="px-6 py-4 text-right">Wholesale Rate</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inventory.map((item) => {
                const available = Math.max(0, item.stockPhysicalOuter - item.stockReservedOuter);
                const isLowStock = available <= 15;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">
                        {getLocalizedText(item, 'name', language)}
                      </div>
                      {language === 'TE' && item.name && (
                        <div className="text-xs text-slate-400 font-normal">
                          {item.name}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800">
                      {getLocalizedText(item, 'brandOrMill', language) || '-'}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">
                      {item.innerBagsPerOuter > 1 ? (
                        <span>
                          {item.innerBagsPerOuter} &times; {item.innerBagWeightKg}kg ({item.outerBagTotalKg}kg Bag)
                        </span>
                      ) : (
                        <span>{item.outerBagTotalKg} kg Sack</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-slate-800">
                      {item.stockPhysicalOuter}
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-amber-700">
                      {item.stockReservedOuter > 0 ? (
                        <span className="bg-amber-50 px-2 py-0.5 rounded">
                          {item.stockReservedOuter}
                        </span>
                      ) : (
                        '0'
                      )}
                    </td>
                    <td className="px-6 py-4 text-center font-bold">
                      <span className={`px-2.5 py-1 rounded-lg ${
                        isLowStock 
                          ? 'bg-rose-50 text-rose-700 font-extrabold' 
                          : 'bg-emerald-50 text-emerald-800'
                      }`}>
                        {available} Bags
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-medium text-slate-700">
                      {item.stockLooseInner}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900">
                      Rs. {item.wholesalePriceBag.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {item.innerBagsPerOuter > 1 && (
                        <button
                          onClick={() => unpackProduct(item.id)}
                          disabled={item.stockPhysicalOuter <= 0}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 disabled:opacity-40 transition-colors"
                          title="Unpack 1 Bag into loose packets"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          {t.stock.unpackBtn}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Commodity Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              Add New Commodity (కొత్త సరుకు చేర్చండి)
            </h2>

            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Commodity Name (English) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sona Masoori Rice (Raw Old)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Commodity Name (తెలుగు) - Optional
                </label>
                <input
                  type="text"
                  placeholder="ఉదా: సోనా మసూరి పాత బియ్యం"
                  value={nameTe}
                  onChange={(e) => setNameTe(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 outline-none focus:border-brand-500 font-telugu"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 outline-none focus:border-brand-500"
                  >
                    <option value="RICE">Rice (బియ్యం)</option>
                    <option value="BROKEN_RICE">Broken Rice (నూకలు)</option>
                    <option value="SUJI_RAVVA">Suji Ravva (సూజీ రవ్వ)</option>
                    <option value="WHEAT_RAVVA">Wheat Ravva (గోధుమ రవ్వ)</option>
                    <option value="MAIDA">Maida (మైదా)</option>
                    <option value="ATTA">Atta (గోధుమ పిండి)</option>
                    <option value="OTHER">Other Grains</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Brand / Mill Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sri Lalitha / Naga"
                    value={brandOrMill}
                    onChange={(e) => setBrandOrMill(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Inner Bag (kg)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={innerBagWeightKg}
                    onChange={(e) => setInnerBagWeightKg(Number(e.target.value))}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Inner Bags Count / Outer
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={innerBagsPerOuter}
                    onChange={(e) => setInnerBagsPerOuter(Number(e.target.value))}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Opening Stock (Bags)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={stockPhysicalOuter}
                    onChange={(e) => setStockPhysicalOuter(Number(e.target.value))}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Wholesale Price / Bag (Rs.)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={wholesalePriceBag}
                    onChange={(e) => setWholesalePriceBag(Number(e.target.value))}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 outline-none focus:border-brand-500"
                  />
                </div>
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
                  Save Commodity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
