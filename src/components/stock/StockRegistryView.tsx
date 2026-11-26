import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { en } from '../../locales/en';
import { te } from '../../locales/te';
import { getLocalizedText } from '../../lib/bilingualHelper';
import { Product } from '../../contracts';
import { Package, Plus, Layers, Inbox, Tag, CheckCircle2, AlertTriangle } from 'lucide-react';
import { validatePurchaseRecord, isPricingHierarchyValid } from '../../lib/purchaseValidation';

export const StockRegistryView: React.FC = () => {
  const { inventory, language, unpackProduct, addProduct } = useAppStore();
  const t = language === 'TE' ? te : en;

  const [isModalOpen, setIsModalOpen] = useState(false);
  // Zero auto-fill: All inputs start empty
  const [name, setName] = useState('');
  const [nameTe, setNameTe] = useState('');
  const [category, setCategory] = useState('');
  const [brandOrMill, setBrandOrMill] = useState('');
  const [innerBagWeightKg, setInnerBagWeightKg] = useState('');
  const [innerBagsPerOuter, setInnerBagsPerOuter] = useState('');
  const [stockPhysicalOuter, setStockPhysicalOuter] = useState('');
  const [costPricePerBag, setCostPricePerBag] = useState('');
  const [wholesalePriceBag, setWholesalePriceBag] = useState('');
  const [retailPriceBag, setRetailPriceBag] = useState('');
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const totalWarehouseBags = inventory.reduce((sum, p) => sum + p.stockPhysicalOuter, 0);
  const totalReservedBags = inventory.reduce((sum, p) => sum + p.stockReservedOuter, 0);

  // Real-time pricing hierarchy calculation
  const pRate = Number(costPricePerBag);
  const wRate = Number(wholesalePriceBag);
  const rRate = Number(retailPriceBag);
  const allThreePricingEntered = costPricePerBag !== '' && wholesalePriceBag !== '' && retailPriceBag !== '';
  const isPricingValid = isPricingHierarchyValid(pRate, wRate, rRate);

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFieldErrors({});

    const validation = validatePurchaseRecord({
      name,
      nameTe,
      category,
      brandOrMill,
      innerBagWeightKg,
      innerBagsPerOuter,
      stockPhysicalOuter,
      costPricePerBag,
      wholesalePriceBag,
      retailPriceBag,
    }, language as 'EN' | 'TE');

    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      setFormError(validation.errorMessage || (language === 'TE' ? 'దయచేసి ఫారమ్‌లోని లోపాలను సరిదిద్దండి.' : 'Please correct the highlighted form errors.'));
      return;
    }

    const innerWt = Number(innerBagWeightKg);
    const innerCount = Number(innerBagsPerOuter);
    const outerBagTotalKg = innerWt * innerCount;
    const physicalStock = Number(stockPhysicalOuter);
    const costRate = Number(costPricePerBag);
    const wholesaleRate = Number(wholesalePriceBag);
    const retailRate = Number(retailPriceBag);

    const newProd: Product = {
      id: crypto.randomUUID ? crypto.randomUUID() : `prod-${Date.now()}`,
      name: name.trim(),
      nameTe: nameTe.trim(),
      category,
      brandOrMill: brandOrMill.trim(),
      innerBagWeightKg: innerWt,
      innerBagsPerOuter: innerCount,
      outerBagTotalKg,
      stockPhysicalOuter: physicalStock,
      stockReservedOuter: 0,
      stockLooseInner: 0,
      stockLooseKg: 0,
      costPricePerBag: costRate,
      wholesalePriceBag: wholesaleRate,
      retailPriceBag: retailRate,
      pricePerInnerBag: innerCount > 1 ? retailRate / innerCount : retailRate,
    };

    addProduct(newProd);
    setIsModalOpen(false);

    // Reset to clean empty form
    setName('');
    setNameTe('');
    setCategory('');
    setBrandOrMill('');
    setInnerBagWeightKg('');
    setInnerBagsPerOuter('');
    setStockPhysicalOuter('');
    setCostPricePerBag('');
    setWholesalePriceBag('');
    setRetailPriceBag('');
    setFieldErrors({});
    setFormError('');
  };

  const getCategoryLabel = (cat: string) => {
    if (language === 'TE') {
      const map: Record<string, string> = {
        RICE: 'బియ్యం',
        BROKEN_RICE: 'నూకలు',
        SUJI_RAVVA: 'సూజీ రవ్వ',
        WHEAT_RAVVA: 'గోధుమ రవ్వ',
        MAIDA: 'మైదా',
        ATTA: 'గోధుమ పిండి',
        OTHER: 'ఇతర ధాన్యాలు',
      };
      return map[cat] || cat;
    }
    const map: Record<string, string> = {
      RICE: 'Rice',
      BROKEN_RICE: 'Broken Rice',
      SUJI_RAVVA: 'Suji Ravva',
      WHEAT_RAVVA: 'Wheat Ravva',
      MAIDA: 'Maida',
      ATTA: 'Atta',
      OTHER: 'Other Grains',
    };
    return map[cat] || cat;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {language === 'TE' ? 'సరుకుల స్టాక్ జాబితా' : 'Stock Registry'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-900 text-white">
              {inventory.length} {language === 'TE' ? 'వస్తువులు' : 'items'}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            {language === 'TE' ? (
              <>
                గోడౌన్ స్టాక్: <span className="font-bold text-slate-700">{totalWarehouseBags} బస్తాలు</span> &bull; రిజర్వు: <span className="font-bold text-orange-600">{totalReservedBags} బస్తాలు</span>
              </>
            ) : (
              <>
                Physical stock: <span className="font-bold text-slate-700">{totalWarehouseBags} Bags</span> &bull; Reserved: <span className="font-bold text-orange-600">{totalReservedBags} Bags</span>
              </>
            )}
          </p>
        </div>

        <button
          onClick={() => {
            setFormError('');
            setIsModalOpen(true);
          }}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-black text-sm px-6 py-3 rounded-full shadow-lg shadow-orange-500/25 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>{language === 'TE' ? 'కొత్త సరుకు చేర్చండి' : 'Add Commodity'}</span>
        </button>
      </div>

      {/* Zero Data Empty State */}
      {inventory.length === 0 ? (
        <div className="card-soft p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-3xl bg-orange-50 text-orange-500 flex items-center justify-center mb-4">
            <Inbox className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {language === 'TE' ? 'సరుకుల జాబితా ఖాళీగా ఉంది' : 'No commodities in stock registry yet'}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mb-6">
            {language === 'TE'
              ? 'మీ వద్ద ఉన్న బియ్యం లేదా పిండి రకాలను వాటి కొనుగోలు, హోల్‌సేల్ మరియు రిటైల్ ధరలతో నమోదు చేయడానికి క్రింది బటన్‌పై నొక్కండి.'
              : 'Your stock list is completely empty. Tap below to register your first Rice variety or Flour bag with purchase, wholesale, and retail values.'}
          </p>
          <button
            onClick={() => {
              setFormError('');
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-full shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'TE' ? 'మొదటి సరుకును నమోదు చేయండి' : 'Register First Commodity'}</span>
          </button>
        </div>
      ) : (
        /* Mobile Cards + Desktop Table */
        <div className="space-y-4">
          {/* Mobile Card List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-3">
            {inventory.map((item) => {
              const available = Math.max(0, item.stockPhysicalOuter - item.stockReservedOuter);
              return (
                <div key={item.id} className="card-soft p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                        {getCategoryLabel(item.category)}
                      </span>
                      <span className="text-xs font-black text-orange-600 font-mono">
                        {language === 'TE' ? 'హోల్‌సేల్:' : 'Wholesale:'} ₹{item.wholesalePriceBag.toLocaleString()}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 mb-0.5">
                      {getLocalizedText(item, 'name', language)}
                    </h4>
                    {item.brandOrMill && (
                      <p className="text-xs text-slate-400 mb-2">
                        {language === 'TE' ? 'బ్రాండ్:' : 'Brand:'} {getLocalizedText(item, 'brandOrMill', language)}
                      </p>
                    )}

                    {/* 3 Values: Purchase, Wholesale, Retail */}
                    <div className="grid grid-cols-3 gap-1.5 bg-amber-50/60 p-2 rounded-xl border border-amber-200/50 text-center mb-3">
                      <div>
                        <span className="text-[9px] text-amber-800/80 block font-bold">
                          {language === 'TE' ? 'కొనుగోలు' : 'Purchase'}
                        </span>
                        <span className="text-[11px] font-mono font-extrabold text-amber-900">
                          ₹{(item.costPricePerBag || 0).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-orange-800/80 block font-bold">
                          {language === 'TE' ? 'హోల్‌సేల్' : 'Wholesale'}
                        </span>
                        <span className="text-[11px] font-mono font-extrabold text-orange-900">
                          ₹{(item.wholesalePriceBag || 0).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-emerald-800/80 block font-bold">
                          {language === 'TE' ? 'రిటైల్' : 'Retail'}
                        </span>
                        <span className="text-[11px] font-mono font-extrabold text-emerald-900">
                          ₹{(item.retailPriceBag || item.wholesalePriceBag || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Stock Counts */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center mb-3">
                      <div>
                        <span className="text-[10px] text-slate-400 block">
                          {language === 'TE' ? 'గోడౌన్' : 'Godown'}
                        </span>
                        <span className="text-xs font-bold text-slate-800">{item.stockPhysicalOuter}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">
                          {language === 'TE' ? 'రిజర్వు' : 'Reserved'}
                        </span>
                        <span className="text-xs font-bold text-orange-600">{item.stockReservedOuter}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">
                          {language === 'TE' ? 'అందుబాటు' : 'Available'}
                        </span>
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
                      {language === 'TE' 
                        ? `1 బస్తా విప్పండి (${item.innerBagsPerOuter} ప్యాకెట్లు)`
                        : `Unpack 1 Bag (${item.innerBagsPerOuter} Pkts)`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-4">{language === 'TE' ? 'సరుకు పేరు' : 'Commodity'}</th>
                  <th className="px-4 py-4">{language === 'TE' ? 'వర్గం' : 'Category'}</th>
                  <th className="px-4 py-4">{language === 'TE' ? 'బ్రాండ్ / మిల్లు' : 'Brand / Mill'}</th>
                  <th className="px-4 py-4">{language === 'TE' ? 'బస్తా స్పెసిఫికేషన్' : 'Bag Spec'}</th>
                  <th className="px-4 py-4 text-center">{language === 'TE' ? 'గోడౌన్' : 'Godown'}</th>
                  <th className="px-4 py-4 text-center">{language === 'TE' ? 'రిజర్వు' : 'Reserved'}</th>
                  <th className="px-4 py-4 text-center">{language === 'TE' ? 'అందుబాటు' : 'Available'}</th>
                  <th className="px-4 py-4 text-center">{language === 'TE' ? 'కొనుగోలు ధర' : 'Purchase (₹)'}</th>
                  <th className="px-4 py-4 text-center">{language === 'TE' ? 'హోల్‌సేల్ ధర' : 'Wholesale (₹)'}</th>
                  <th className="px-4 py-4 text-center">{language === 'TE' ? 'రిటైల్ ధర' : 'Retail (₹)'}</th>
                  <th className="px-4 py-4 text-right">{language === 'TE' ? 'చర్యలు' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventory.map((item) => {
                  const available = Math.max(0, item.stockPhysicalOuter - item.stockReservedOuter);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-4 font-bold text-slate-900">
                        {getLocalizedText(item, 'name', language)}
                      </td>
                      <td className="px-4 py-4">
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-700">
                          {getCategoryLabel(item.category)}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-medium text-slate-800">
                        {getLocalizedText(item, 'brandOrMill', language) || '-'}
                      </td>
                      <td className="px-4 py-4 font-mono text-xs">
                        {item.innerBagsPerOuter > 1 
                          ? `${item.innerBagsPerOuter} × ${item.innerBagWeightKg}kg (${item.outerBagTotalKg}kg)`
                          : `${item.outerBagTotalKg} kg`}
                      </td>
                      <td className="px-4 py-4 text-center font-bold text-slate-800">
                        {item.stockPhysicalOuter}
                      </td>
                      <td className="px-4 py-4 text-center font-bold text-orange-600">
                        {item.stockReservedOuter}
                      </td>
                      <td className="px-4 py-4 text-center font-black text-emerald-700">
                        {available}
                      </td>
                      <td className="px-4 py-4 text-center font-mono font-bold text-amber-800">
                        ₹{(item.costPricePerBag || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-center font-mono font-extrabold text-orange-600">
                        ₹{(item.wholesalePriceBag || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-center font-mono font-bold text-emerald-800">
                        ₹{(item.retailPriceBag || item.wholesalePriceBag || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {item.innerBagsPerOuter > 1 && (
                          <button
                            onClick={() => unpackProduct(item.id)}
                            disabled={item.stockPhysicalOuter <= 0}
                            className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 disabled:opacity-40 transition-colors"
                          >
                            <Layers className="w-3.5 h-3.5" />
                            {language === 'TE' ? '1 బస్తా విప్పండి' : 'Unpack 1 Bag'}
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

      {/* Add Commodity Modal (Zero auto-fill) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-7 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-xl font-black text-slate-900">
                {language === 'TE' ? 'కొత్త సరుకు / కొనుగోలు నమోదు' : 'Add New Commodity / Purchase Record'}
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setFormError('');
                  setFieldErrors({});
                }}
                className="text-slate-400 hover:text-slate-700 text-2xl font-bold"
              >
                &times;
              </button>
            </div>

            {formError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {language === 'TE' ? 'సరుకు పేరు (ఇంగ్లీష్) *' : 'Commodity Name (English) *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={language === 'TE' ? 'ఉదా: Sona Masoori Raw Rice' : 'e.g. Sona Masoori Raw Rice'}
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
                  {language === 'TE' ? 'సరుకు పేరు (తెలుగు) - ఐచ్ఛికం' : 'Commodity Name (Regional) - Optional'}
                </label>
                <input
                  type="text"
                  placeholder={language === 'TE' ? 'ఉదా: సోనా మసూరి పాత బియ్యం' : 'e.g. Regional Script'}
                  value={nameTe}
                  onChange={(e) => setNameTe(e.target.value)}
                  className="w-full text-xs font-medium border border-slate-300 rounded-xl p-3 outline-none focus:border-orange-500 font-telugu"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'TE' ? 'వర్గం *' : 'Category *'}
                  </label>
                  <select
                    required
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      if (fieldErrors.category) {
                        setFieldErrors((prev) => { const n = { ...prev }; delete n.category; return n; });
                      }
                    }}
                    className={`w-full text-xs font-medium border rounded-xl p-3 outline-none transition-colors ${
                      fieldErrors.category 
                        ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500' 
                        : 'border-slate-300 focus:border-orange-500'
                    }`}
                  >
                    <option value="">{language === 'TE' ? 'వర్గాన్ని ఎంచుకోండి...' : 'Select Category...'}</option>
                    <option value="RICE">{language === 'TE' ? 'బియ్యం' : 'Rice'}</option>
                    <option value="BROKEN_RICE">{language === 'TE' ? 'నూకలు' : 'Broken Rice'}</option>
                    <option value="SUJI_RAVVA">{language === 'TE' ? 'సూజీ రవ్వ' : 'Suji Ravva'}</option>
                    <option value="WHEAT_RAVVA">{language === 'TE' ? 'గోధుమ రవ్వ' : 'Wheat Ravva'}</option>
                    <option value="MAIDA">{language === 'TE' ? 'మైదా' : 'Maida'}</option>
                    <option value="ATTA">{language === 'TE' ? 'గోధుమ పిండి' : 'Atta'}</option>
                    <option value="OTHER">{language === 'TE' ? 'ఇతర ధాన్యాలు' : 'Other Grains'}</option>
                  </select>
                  {fieldErrors.category && (
                    <p className="text-[11px] font-semibold text-rose-600 mt-1">{fieldErrors.category}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'TE' ? 'బిల్లు / మిల్లు పేరు (Bill Name - కేవలం అక్షరాలు మాత్రమే) *' : 'Bill Name / Mill Name (Alphabets Only) *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={language === 'TE' ? 'ఉదా: Sri Lalitha / Naga' : 'e.g. Sri Lalitha / Naga'}
                    value={brandOrMill}
                    onChange={(e) => {
                      setBrandOrMill(e.target.value);
                      if (fieldErrors.brandOrMill) {
                        setFieldErrors((prev) => { const n = { ...prev }; delete n.brandOrMill; return n; });
                      }
                    }}
                    className={`w-full text-xs font-medium border rounded-xl p-3 outline-none transition-colors ${
                      fieldErrors.brandOrMill 
                        ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500' 
                        : 'border-slate-300 focus:border-orange-500'
                    }`}
                  />
                  {fieldErrors.brandOrMill && (
                    <p className="text-[11px] font-semibold text-rose-600 mt-1">{fieldErrors.brandOrMill}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'TE' ? 'చిన్న ప్యాకెట్ (కిలోలు) *' : 'Packet Wt (kg) *'}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    required
                    placeholder="26"
                    value={innerBagWeightKg}
                    onChange={(e) => {
                      setInnerBagWeightKg(e.target.value);
                      if (fieldErrors.innerBagWeightKg) {
                        setFieldErrors((prev) => { const n = { ...prev }; delete n.innerBagWeightKg; return n; });
                      }
                    }}
                    className={`w-full text-xs font-medium border rounded-xl p-3 outline-none transition-colors ${
                      fieldErrors.innerBagWeightKg 
                        ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500' 
                        : 'border-slate-300 focus:border-orange-500'
                    }`}
                  />
                  {fieldErrors.innerBagWeightKg && (
                    <p className="text-[10px] font-semibold text-rose-600 mt-1">{fieldErrors.innerBagWeightKg}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'TE' ? 'ప్యాకెట్ల సంఖ్య *' : 'Packets / Bag *'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="1"
                    value={innerBagsPerOuter}
                    onChange={(e) => {
                      setInnerBagsPerOuter(e.target.value);
                      if (fieldErrors.innerBagsPerOuter) {
                        setFieldErrors((prev) => { const n = { ...prev }; delete n.innerBagsPerOuter; return n; });
                      }
                    }}
                    className={`w-full text-xs font-medium border rounded-xl p-3 outline-none transition-colors ${
                      fieldErrors.innerBagsPerOuter 
                        ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500' 
                        : 'border-slate-300 focus:border-orange-500'
                    }`}
                  />
                  {fieldErrors.innerBagsPerOuter && (
                    <p className="text-[10px] font-semibold text-rose-600 mt-1">{fieldErrors.innerBagsPerOuter}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'TE' ? 'స్టాక్ బస్తాలు *' : 'Stock (Bags) *'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="0"
                    value={stockPhysicalOuter}
                    onChange={(e) => {
                      setStockPhysicalOuter(e.target.value);
                      if (fieldErrors.stockPhysicalOuter) {
                        setFieldErrors((prev) => { const n = { ...prev }; delete n.stockPhysicalOuter; return n; });
                      }
                    }}
                    className={`w-full text-xs font-medium border rounded-xl p-3 outline-none transition-colors ${
                      fieldErrors.stockPhysicalOuter 
                        ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500' 
                        : 'border-slate-300 focus:border-orange-500'
                    }`}
                  />
                  {fieldErrors.stockPhysicalOuter && (
                    <p className="text-[10px] font-semibold text-rose-600 mt-1">{fieldErrors.stockPhysicalOuter}</p>
                  )}
                </div>
              </div>

              {/* THREE VALUES SECTION: Wholesale >= Purchase and Retail >= Wholesale (Purchase <= Wholesale <= Retail) */}
              <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-orange-950 uppercase tracking-wide">
                    <Tag className="w-4 h-4 text-[#FF5A36]" />
                    <span>
                      {language === 'TE' ? '3 ధరల వివరాలు (Purchase ≤ Wholesale ≤ Retail)' : '3 Pricing Values (Purchase ≤ Wholesale ≤ Retail)'}
                    </span>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-200/60 text-orange-900">
                    P ≤ W ≤ R
                  </span>
                </div>

                {/* Real-time pricing hierarchy validation visual banner */}
                {allThreePricingEntered && (
                  <div className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                    isPricingValid 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}>
                    {isPricingValid ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          {language === 'TE'
                            ? `ధరల నిష్పత్తి సరైనది: కొనుగోలు (₹${pRate}) ≤ హోల్‌సేల్ (₹${wRate}) ≤ రిటైల్ (₹${rRate})`
                            : `Valid Pricing: Purchase (₹${pRate}) ≤ Wholesale (₹${wRate}) ≤ Retail (₹${rRate})`}
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>
                          {wRate < pRate
                            ? (language === 'TE' 
                                ? `హోల్‌సేల్ ధర (₹${wRate}) తప్పనిసరిగా కొనుగోలు ధర (₹${pRate}) కంటే ఎక్కువ లేదా సమానంగా ఉండాలి!` 
                                : `Wholesale value (₹${wRate}) should be greater than or equal to Purchase value (₹${pRate})!`)
                            : (language === 'TE' 
                                ? `రిటైల్ ధర (₹${rRate}) తప్పనిసరిగా హోల్‌సేల్ ధర (₹${wRate}) కంటే ఎక్కువ లేదా సమానంగా ఉండాలి!` 
                                : `Retail value (₹${rRate}) must be greater than or equal to Wholesale value (₹${wRate})!`)}
                        </span>
                      </>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {language === 'TE' ? '1. కొనుగోలు ధర (Purchase) *' : '1. Purchase Value *'}
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 1300"
                      value={costPricePerBag}
                      onChange={(e) => {
                        setCostPricePerBag(e.target.value);
                        if (fieldErrors.costPricePerBag || fieldErrors.pricingHierarchy) {
                          setFieldErrors((prev) => { const n = { ...prev }; delete n.costPricePerBag; delete n.pricingHierarchy; return n; });
                        }
                      }}
                      className={`w-full text-xs font-bold border rounded-xl p-2.5 outline-none transition-colors ${
                        fieldErrors.costPricePerBag || (allThreePricingEntered && !isPricingValid && wRate < pRate)
                          ? 'border-rose-400 bg-rose-50/30 focus:border-rose-500'
                          : 'border-slate-300 focus:border-orange-500 bg-white'
                      }`}
                    />
                    {fieldErrors.costPricePerBag && (
                      <p className="text-[10px] font-bold text-rose-600 mt-1">{fieldErrors.costPricePerBag}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {language === 'TE' ? '2. హోల్‌సేల్ ధర (Wholesale) *' : '2. Wholesale Value *'}
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 1450"
                      value={wholesalePriceBag}
                      onChange={(e) => {
                        setWholesalePriceBag(e.target.value);
                        if (fieldErrors.wholesalePriceBag || fieldErrors.pricingHierarchy) {
                          setFieldErrors((prev) => { const n = { ...prev }; delete n.wholesalePriceBag; delete n.pricingHierarchy; return n; });
                        }
                      }}
                      className={`w-full text-xs font-bold border rounded-xl p-2.5 outline-none transition-colors ${
                        fieldErrors.wholesalePriceBag || (allThreePricingEntered && !isPricingValid)
                          ? 'border-rose-400 bg-rose-50/30 focus:border-rose-500'
                          : 'border-slate-300 focus:border-orange-500 bg-white'
                      }`}
                    />
                    {fieldErrors.wholesalePriceBag && (
                      <p className="text-[10px] font-bold text-rose-600 mt-1">{fieldErrors.wholesalePriceBag}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {language === 'TE' ? '3. రిటైల్ ధర (Retail) *' : '3. Retail Value *'}
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 1550"
                      value={retailPriceBag}
                      onChange={(e) => {
                        setRetailPriceBag(e.target.value);
                        if (fieldErrors.retailPriceBag || fieldErrors.pricingHierarchy) {
                          setFieldErrors((prev) => { const n = { ...prev }; delete n.retailPriceBag; delete n.pricingHierarchy; return n; });
                        }
                      }}
                      className={`w-full text-xs font-bold border rounded-xl p-2.5 outline-none transition-colors ${
                        fieldErrors.retailPriceBag || (allThreePricingEntered && !isPricingValid && rRate < wRate)
                          ? 'border-rose-400 bg-rose-50/30 focus:border-rose-500'
                          : 'border-slate-300 focus:border-orange-500 bg-white'
                      }`}
                    />
                    {fieldErrors.retailPriceBag && (
                      <p className="text-[10px] font-bold text-rose-600 mt-1">{fieldErrors.retailPriceBag}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setFormError('');
                    setFieldErrors({});
                  }}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  {language === 'TE' ? 'రద్దు చేయండి' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-bold bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white rounded-xl shadow-lg shadow-orange-500/25 transition-all"
                >
                  {language === 'TE' ? 'సరుకును భద్రపరచండి' : 'Save Commodity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
