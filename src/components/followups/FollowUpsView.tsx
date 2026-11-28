import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { FollowUp, FollowUpStatus } from '../../contracts';
import { AlertDialog } from '../ui/AlertDialog';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import { Plus, Phone, MapPin, MessageCircle, Pencil, Trash2, ClipboardList, Calendar, Inbox } from 'lucide-react';

export const FollowUpsView: React.FC = () => {
  const { followUps, addFollowUp, updateFollowUp, deleteFollowUp, language, hasFunctionalityAccess, startActionLoading, stopActionLoading } = useAppStore();
  const isTe = language === 'TE';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FollowUp | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [purpose, setPurpose] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<FollowUpStatus>('OPEN');
  const [formError, setFormError] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | FollowUpStatus>('ALL');
  const [sortBy, setSortBy] = useState<'DATE_ASC' | 'NAME_ASC'>('DATE_ASC');

  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; actionText: string; onAction: () => Promise<void> | void }>({
    isOpen: false,
    title: '',
    message: '',
    actionText: '',
    onAction: () => {},
  });

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setName('');
    setPhone('');
    setAddress('');
    setPurpose('');
    setFollowUpDate('');
    setNotes('');
    setStatus('OPEN');
    setFormError('');
  };

  useModalDismiss(isModalOpen, closeModal);

  const openNew = () => {
    closeModal();
    setIsModalOpen(true);
  };

  const openEdit = (item: FollowUp) => {
    setEditingItem(item);
    setName(item.name);
    setPhone(item.phone);
    setAddress(item.address || '');
    setPurpose(item.purpose);
    setFollowUpDate(item.followUpDate || '');
    setNotes(item.notes || '');
    setStatus(item.status || 'OPEN');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (name.trim().length < 2) {
      setFormError(isTe ? 'పేరు కనీసం 2 అక్షరాలు ఉండాలి.' : 'Name must be at least 2 characters.');
      return;
    }
    if (cleanPhone.length !== 10) {
      setFormError(isTe ? '10 అంకెల మొబైల్ నంబర్ అవసరం.' : '10-digit mobile number is required.');
      return;
    }
    if (purpose.trim().length < 2) {
      setFormError(isTe ? 'కొనుగోలు ఉద్దేశ్యం నమోదు చేయండి.' : 'Please enter purpose of purchase / inquiry.');
      return;
    }

    startActionLoading(
      editingItem ? 'Updating follow-up...' : 'Saving follow-up...',
      editingItem ? 'ఫాలో-అప్ అప్‌డేట్ అవుతోంది...' : 'ఫాలో-అప్ సేవ్ అవుతోంది...'
    );
    if (editingItem) {
      updateFollowUp({
        ...editingItem,
        name: name.trim(),
        phone: cleanPhone,
        address: address.trim(),
        purpose: purpose.trim(),
        followUpDate: followUpDate.trim(),
        notes: notes.trim(),
        status,
      });
    } else {
      addFollowUp({
        id: crypto.randomUUID ? crypto.randomUUID() : `fu-${Date.now()}`,
        name: name.trim(),
        phone: cleanPhone,
        address: address.trim(),
        purpose: purpose.trim(),
        followUpDate: followUpDate.trim(),
        notes: notes.trim(),
        status,
        createdAt: new Date().toISOString(),
      });
    }
    stopActionLoading();
    closeModal();
  };

  const handleDelete = (item: FollowUp) => {
    setConfirmDialog({
      isOpen: true,
      title: isTe ? 'ఫాలో-అప్ తొలగించాలా?' : 'Delete Follow-Up?',
      message: isTe ? `"${item.name}" ఫాలో-అప్ వివరాలను తొలగించాలా?` : `Delete follow-up lead for "${item.name}"?`,
      actionText: isTe ? 'తొలగించు' : 'Delete',
      onAction: async () => {
        startActionLoading('Deleting follow-up...', 'ఫాలో-అప్ తొలగించబడుతోంది...');
        await deleteFollowUp(item.id);
        stopActionLoading();
      },
    });
  };

  const filtered = followUps
    .filter((f) => {
      if (statusFilter !== 'ALL' && f.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          f.name.toLowerCase().includes(q) ||
          f.phone.includes(q) ||
          f.purpose.toLowerCase().includes(q) ||
          (f.address || '').toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'NAME_ASC') return a.name.localeCompare(b.name);
      return (a.followUpDate || a.createdAt).localeCompare(b.followUpDate || b.createdAt);
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {isTe ? 'వాక్-ఇన్ & ఫాలో-అప్ డైరెక్టరీ' : 'Walk-In & Follow-Up Directory'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-900 text-white">
              {followUps.length}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            {isTe
              ? 'భవిష్యత్ ఫాలో-అప్ కోసం వాక్-ఇన్ కస్టమర్ల వివరాలు మరియు కొనుగోలు ఉద్దేశ్యం'
              : 'Track walk-in visitors, inquiries, and purchase purposes for future follow-ups'}
          </p>
        </div>
        {hasFunctionalityAccess('followups_page', 'add_followup') && (
          <button
            onClick={openNew}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-black text-sm px-6 py-3 rounded-full shadow-lg shadow-orange-500/25 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{isTe ? 'కొత్త ఫాలో-అప్' : 'Add Follow-Up'}</span>
          </button>
        )}
      </div>

      {followUps.length === 0 ? (
        <div className="card-soft p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-3xl bg-orange-50 text-orange-500 flex items-center justify-center mb-4">
            <Inbox className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {isTe ? 'ఫాలో-అప్ వివరాలు లేవు' : 'No walk-in or follow-up leads recorded yet'}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mb-5">
            {isTe
              ? 'వాక్-ఇన్ కస్టమర్ల పేరు, ఫోన్ నంబర్ మరియు కొనుగోలు ఉద్దేశ్యాన్ని సేవ్ చేయండి.'
              : 'Save walk-in visitor details and purchase purposes to follow up later via WhatsApp or call.'}
          </p>
          {hasFunctionalityAccess('followups_page', 'add_followup') && (
            <button onClick={openNew} className="inline-flex items-center gap-2 bg-slate-900 text-white font-bold text-xs px-5 py-2.5 rounded-full">
              <Plus className="w-4 h-4" />
              <span>{isTe ? 'మొదటి ఫాలో-అప్ చేర్చండి' : 'Add First Follow-Up'}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white p-3 rounded-2xl border border-slate-200/80">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isTe ? 'పేరు / ఫోన్ / ఉద్దేశ్యం శోధించండి...' : 'Search name, phone, or purpose...'}
              className="text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-orange-500 w-full sm:w-64"
            />
            <div className="flex items-center gap-2">
              <select
                aria-label="Filter follow-up status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="text-xs font-semibold border border-slate-200 rounded-xl px-2.5 py-2 bg-slate-50 outline-none focus:border-orange-500"
              >
                <option value="ALL">{isTe ? 'అన్ని స్థితులు' : 'All Statuses'}</option>
                <option value="OPEN">{isTe ? 'ఓపెన్' : 'Open'}</option>
                <option value="CONTACTED">{isTe ? 'సంప్రదించబడింది' : 'Contacted'}</option>
                <option value="CONVERTED">{isTe ? 'కన్వర్ట్ అయింది' : 'Converted'}</option>
              </select>
              <select
                aria-label="Sort follow-ups"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-xs font-semibold border border-slate-200 rounded-xl px-2.5 py-2 bg-slate-50 outline-none focus:border-orange-500"
              >
                <option value="DATE_ASC">{isTe ? 'తేదీ ప్రకారం' : 'Follow-Up Date'}</option>
                <option value="NAME_ASC">{isTe ? 'పేరు (A-Z)' : 'Name (A → Z)'}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((item) => (
              <div key={item.id} className="card-soft p-5 flex flex-col justify-between hover:border-orange-400 transition-all">
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">{item.name}</h3>
                      <div className="text-xs font-mono text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" /> {item.phone}
                      </div>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      item.status === 'CONVERTED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : item.status === 'CONTACTED'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {item.status}
                    </span>
                  </div>

                  <div className="p-2.5 bg-orange-50/70 border border-orange-200/70 rounded-xl text-xs text-slate-800">
                    <span className="text-[10px] font-bold text-orange-700 uppercase block mb-0.5">
                      {isTe ? 'కొనుగోలు ఉద్దేశ్యం' : 'Purpose of Purchase'}
                    </span>
                    {item.purpose}
                  </div>

                  {item.address && (
                    <div className="text-xs text-slate-500 flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
                      <span>{item.address}</span>
                    </div>
                  )}

                  {item.followUpDate && (
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{item.followUpDate}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={() => {
                      const txt = encodeURIComponent(`Hello ${item.name}, following up from Kaatha Wholesale regarding ${item.purpose}.`);
                      window.open(`https://wa.me/91${item.phone}?text=${txt}`, '_blank');
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                  {hasFunctionalityAccess('followups_page', 'edit_followup') && (
                    <button
                      onClick={() => openEdit(item)}
                      className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200"
                      title={isTe ? 'సవరించు' : 'Edit'}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {hasFunctionalityAccess('followups_page', 'delete_followup') && (
                    <button
                      onClick={() => handleDelete(item)}
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                      title={isTe ? 'తొలగించు' : 'Delete'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-xs flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-100 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-[#FF5A36]" />
                <span>{editingItem ? (isTe ? 'ఫాలో-అప్ సవరించండి' : 'Edit Follow-Up Lead') : (isTe ? 'కొత్త ఫాలో-అప్ చేర్చండి' : 'New Walk-In / Follow-Up')}</span>
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-700 text-2xl font-bold leading-none">&times;</button>
            </div>
            {formError && <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold">{formError}</div>}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{isTe ? 'పేరు *' : 'Name *'}</label>
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full text-xs border border-slate-300 rounded-xl p-2.5" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{isTe ? 'మొబైల్ నంబర్ *' : 'Mobile Number *'}</label>
                  <input type="tel" required maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} className="w-full text-xs border border-slate-300 rounded-xl p-2.5 font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{isTe ? 'కొనుగోలు ఉద్దేశ్యం *' : 'Purpose of Purchase / Inquiry *'}</label>
                <input type="text" required placeholder={isTe ? 'ఉదా: హోటల్ కోసం 50 బస్తాల సోనా మసూరి' : 'e.g. Monthly 50 bags Sona Masoori for catering'} value={purpose} onChange={(e) => setPurpose(e.target.value)} className="w-full text-xs border border-slate-300 rounded-xl p-2.5" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{isTe ? 'చిరునామా' : 'Address'}</label>
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full text-xs border border-slate-300 rounded-xl p-2.5" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{isTe ? 'ఫాలో-అప్ తేదీ' : 'Follow-Up Date'}</label>
                  <input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} className="w-full text-xs border border-slate-300 rounded-xl p-2.5" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{isTe ? 'స్థితి' : 'Status'}</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value as FollowUpStatus)} className="w-full text-xs border border-slate-300 rounded-xl p-2.5">
                    <option value="OPEN">OPEN</option>
                    <option value="CONTACTED">CONTACTED</option>
                    <option value="CONVERTED">CONVERTED</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-full">{isTe ? 'రద్దు' : 'Cancel'}</button>
                <button type="submit" className="px-5 py-2 text-xs font-bold bg-[#FF5A36] hover:bg-[#e04826] text-white rounded-full">{isTe ? 'సేవ్ చేయి' : 'Save Follow-Up'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AlertDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((p) => ({ ...p, isOpen: false }))}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type="danger"
        actionText={confirmDialog.actionText}
        cancelText={isTe ? 'రద్దు' : 'Cancel'}
        onAction={confirmDialog.onAction}
      />
    </div>
  );
};
