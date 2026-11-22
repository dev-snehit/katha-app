import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { en } from '../../locales/en';
import { te } from '../../locales/te';
import { getLocalizedText } from '../../lib/bilingualHelper';
import { Product } from '../../contracts';
import { Package, Plus, Layers, Inbox } from 'lucide-react';

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

  const totalWarehouseBags = inventory.reduce((sum, p) => sum + p.stockPhysicalOuter, 0);
  const totalReservedBags = inventory.reduce((sum, p) => sum + p.stockReservedOuter, 0);

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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {t.stock.title}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-900 text-white">
              {inventory.length} items
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Physical stock: <span className="font-bold text-slate-700">{totalWarehouseBags} Bags</span> &bull; Reserved: <span className="font-bold text-orange-600">{totalReservedBags} Bags</span>
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-black text-sm px-6 py-3 rounded-full shadow-lg shadow-orange-500/25 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Add Commodity (సరుకు చేర్చండి)</span>
        </button>
      </div>

      {/* Zero Data Empty State */}
      {inventory.length === 0 ? (
        <div className="card-soft p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-3xl bg-orange-50 text-orange-500 flex items-center justify-center mb-4">
            <Inbox className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            No commodities in stock registry yet
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mb-6">
            Your stock list is completely empty. Tap below to register your first Rice variety or Flour bag with weight and rates.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-full shadow-md"
          >
            <Plus className="w-4 h-4" />
            + Register First Commodity
          </button>
        </div>
      ) : (
        /* Mobile Cards + Desktop Table */
        <div className="space-y-4">
          {/* Mobile Card List (Visible on Small Screens) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-3">
            {inventory.map((item) => {
              const available = Math.max(0, item.stockPhysicalOuter - item.stockReservedOuter);
              return (
                <div key={item.id} className="card-soft p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                        {item.category}
                      </span>
                      <span className="text-sm font-black text-slate-900 font-mono">
                        Rs. {item.wholesalePriceBag.toLocaleString()}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 mb-0.5">
                      {getLocalizedText(item, 'name', language)}
                    </h4>
                    {item.brandOrMill && (
                      <p className="text-xs text-slate-400 mb-3">
                        Brand: {getLocalizedText(item, 'brandOrMill', language)}
                      </p>
                    )}

                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center mb-3">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Godown</span>
                        <span className="text-xs font-bold text-slate-800">{item.stockPhysicalOuter}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Reserved</span>
                        <span className="text-xs font-bold text-orange-600">{item.stockReservedOuter}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Available</span>
                        <span className="text-xs font-black text-emerald-700">{available}</span>
                      </div>
                    </div>
                  </div>

                  {item.innerBagsPerOuter > 1 && (
                    <button
                      onClick={() => unpackProduct(item.id)}
                      disabled={item.stockPhysicalOuter <= 0}
                      className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 disabled:opacity-40 transition-colors"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      Unpack 1 Bag ({item.innerBagsPerOuter} Pkts)
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop Table (Hidden on Mobile) */}
          <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Commodity (సరుకు)</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Brand / Mill</th>
                  <th className="px-6 py-4">Bag Spec</th>
                  <th className="px-6 py-4 text-center">Godown Bags</th>
                  <th className="px-6 py-4 text-center">Reserved</th>
                  <th className="px-6 py-4 text-center">Available</th>
                  <th className="px-6 py-4 text-center">Loose Pkts</th>
                  <th className="px-6 py-4 text-right">Wholesale Rate</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventory.map((item) => {
                  const available = Math.max(0, item.stockPhysicalOuter - item.stockReservedOuter);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {getLocalizedText(item, 'name', language)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-700">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-800">
                        {getLocalizedText(item, 'brandOrMill', language) || '-'}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">
                        {item.innerBagsPerOuter > 1 
                          ? `${item.innerBagsPerOuter} × ${item.innerBagWeightKg}kg (${item.outerBagTotalKg}kg Bag)`
                          : `${item.outerBagTotalKg} kg Sack`}
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-slate-800">
                        {item.stockPhysicalOuter}
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-orange-600">
                        {item.stockReservedOuter}
                      </td>
                      <td className="px-6 py-4 text-center font-black text-emerald-700">
                        {available} Bags
                      </td>
                      <td className="px-6 py-4 text-center font-medium text-slate-700">
                        {item.stockLooseInner}
                      </td>
                      <td className="px-6 py-4 text-right font-black text-slate-900 font-mono">
                        Rs. {item.wholesalePriceBag.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {item.innerBagsPerOuter > 1 && (
                          <button
                            onClick={() => unpackProduct(item.id)}
                            disabled={item.stockPhysicalOuter <= 0}
                            className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 disabled:opacity-40 transition-colors"
                          >
                            <Layers className="w-3.5 h-3.5" />
                            Unpack 1 Bag
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
      )}

      {/* Add Commodity Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-black text-slate-900 mb-4">
              Add New Commodity (కొత్త సరుకు చేర్చండి)
            </h2>

            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Commodity Name (English) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sona Masoori Rice (Raw Old)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs font-medium border border-slate-300 rounded-xl p-3 outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Commodity Name (తెలుగు) - Optional
                </label>
                <input
                  type="text"
                  placeholder="ఉదా: సోనా మసూరి పాత బియ్యం"
                  value={nameTe}
                  onChange={(e) => setNameTe(e.target.value)}
                  className="w-full text-xs font-medium border border-slate-300 rounded-xl p-3 outline-none focus:border-orange-500 font-telugu"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-xs font-medium border border-slate-300 rounded-xl p-3 outline-none focus:border-orange-500"
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Brand / Mill Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sri Lalitha / Naga"
                    value={brandOrMill}
                    onChange={(e) => setBrandOrMill(e.target.value)}
                    className="w-full text-xs font-medium border border-slate-300 rounded-xl p-3 outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Inner Bag (kg)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={innerBagWeightKg}
                    onChange={(e) => setInnerBagWeightKg(Number(e.target.value))}
                    className="w-full text-xs font-medium border border-slate-300 rounded-xl p-3 outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Inner Packets / Outer Bag
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={innerBagsPerOuter}
                    onChange={(e) => setInnerBagsPerOuter(Number(e.target.value))}
                    className="w-full text-xs font-medium border border-slate-300 rounded-xl p-3 outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Godown Stock (Bags)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={stockPhysicalOuter}
                    onChange={(e) => setStockPhysicalOuter(Number(e.target.value))}
                    className="w-full text-xs font-medium border border-slate-300 rounded-xl p-3 outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Wholesale Rate / Bag (Rs.)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={wholesalePriceBag}
                    onChange={(e) => setWholesalePriceBag(Number(e.target.value))}
                    className="w-full text-xs font-medium border border-slate-300 rounded-xl p-3 outline-none focus:border-orange-500"
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
