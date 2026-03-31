import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getRecords, deleteRecord, clearAll } from '../historyStore';
import AnimatedCard from './AnimatedCard';

const MODULE_META = {
  chest:  { label: 'Chest X-Ray',   icon: 'bi-heart-pulse-fill', color: 'purple' },
  brain:  { label: 'Brain MRI',     icon: 'bi-brain',            color: 'violet' },
  eye:    { label: 'Retinal Scan',  icon: 'bi-eye-fill',         color: 'amber' },
  skin:   { label: 'Skin Lesion',   icon: 'bi-droplet-half',     color: 'rose' },
  sepsis: { label: 'Sepsis Risk',   icon: 'bi-virus',            color: 'orange' },
};

const COLOR_MAP = {
  purple: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', badge: 'bg-purple-50 text-purple-700 border-purple-200', gradient: 'from-purple-500 to-violet-500' },
  violet: { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200', badge: 'bg-violet-50 text-violet-700 border-violet-200', gradient: 'from-violet-500 to-purple-500' },
  amber:  { bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-200',  badge: 'bg-amber-50 text-amber-700 border-amber-200',   gradient: 'from-amber-500 to-orange-500' },
  rose:   { bg: 'bg-rose-100',   text: 'text-rose-700',   border: 'border-rose-200',   badge: 'bg-rose-50 text-rose-700 border-rose-200',       gradient: 'from-rose-500 to-pink-500' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-700',  border: 'border-orange-200', badge: 'bg-orange-50 text-orange-700 border-orange-200', gradient: 'from-orange-500 to-red-500' },
};

function formatResult(mod, result) {
  if (!result) return 'No result';
  if (mod === 'chest') return result.topCondition ? `${result.topCondition} (${result.topConfidence}%)` : 'No Finding';
  if (mod === 'sepsis') return `${result.risk_level} Risk — ${result.risk_score}%`;
  if (mod === 'skin') return `${result.diagnosis || 'Unknown'} — ${result.malignancy_score}%`;
  if (result.diagnosis) return `${result.diagnosis} (${result.confidence}%)`;
  return result.prediction ? `${result.prediction} (${result.confidence}%)` : 'Completed';
}

function shortResult(mod, result) {
  if (!result) return 'N/A';
  if (mod === 'chest') return result.topCondition || 'No Finding';
  if (mod === 'sepsis') return result.risk_level || 'Low';
  if (mod === 'skin') return result.diagnosis || 'Unknown';
  return result.diagnosis || result.prediction || 'Done';
}

/* ─── Modal popup ─── */
function ReportModal({ item, onClose }) {
  if (!item) return null;
  const meta = MODULE_META[item.module] || MODULE_META.chest;
  const colors = COLOR_MAP[meta.color] || COLOR_MAP.purple;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto"
      >
        {/* Header bar */}
        <div className={`bg-gradient-to-r ${colors.gradient} p-5 rounded-t-2xl`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <i className={`bi ${meta.icon} text-white`} style={{ fontSize: 20 }} />
              </div>
              <div>
                <div className="text-white font-bold text-lg">{meta.label} Report</div>
                <div className="text-white/70 text-xs">{new Date(item.timestamp).toLocaleString()}</div>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
              <i className="bi bi-x-lg text-white" style={{ fontSize: 14 }} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Patient info */}
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center">
              <i className="bi bi-person-fill text-slate-400" style={{ fontSize: 22 }} />
            </div>
            <div>
              <div className="font-bold text-slate-800 text-lg">{item.patientName}</div>
              <div className="text-xs text-slate-400">Patient</div>
            </div>
          </div>

          {/* Image preview */}
          {item.thumbnail && (
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Uploaded Scan</div>
              <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                <img src={item.thumbnail} alt="scan" className="w-full max-h-64 object-contain" />
              </div>
            </div>
          )}

          {/* Result */}
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Diagnosis Result</div>
            <div className={`rounded-xl p-4 ${colors.bg} border ${colors.border}`}>
              <div className={`text-lg font-bold ${colors.text}`}>
                {formatResult(item.module, item.result)}
              </div>
            </div>
          </div>

          {/* Full result breakdown */}
          {item.result && Object.keys(item.result).length > 0 && (
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Details</div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(item.result).map(([k, v]) => {
                  if (v === null || v === undefined) return null;
                  if (typeof v === 'object' && !Array.isArray(v)) return null;
                  let display = String(v);
                  if (Array.isArray(v)) display = `${v.length} items`;
                  return (
                    <div key={k} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide">{k.replace(/_/g, ' ')}</div>
                      <div className="text-sm font-bold text-slate-800 mt-0.5 truncate">{display}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Inputs */}
          {item.inputs && Object.keys(item.inputs).length > 0 && (
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Patient Inputs</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(item.inputs).map(([k, v]) => {
                  if (v === '' || v === null || v === undefined) return null;
                  return (
                    <span key={k} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700">
                      <span className="text-slate-400 capitalize">{k}:</span> {String(v)}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Main component ─── */
export default function HistoryModule({ addToast }) {
  const [history, setHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    setHistory(getRecords());
  }, []);

  const handleDelete = (e, id) => {
    e.stopPropagation();
    const updated = deleteRecord(id);
    setHistory(updated);
    if (selectedItem?.id === id) setSelectedItem(null);
    addToast('Record deleted', 'info');
  };

  const handleClearAll = () => {
    clearAll();
    setHistory([]);
    setSelectedItem(null);
    addToast('All history cleared', 'info');
  };

  const filteredHistory = history.filter(item => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = !q ||
      (item.patientName || '').toLowerCase().includes(q) ||
      (item.module || '').toLowerCase().includes(q);
    const matchesFilter = filter === 'all' || item.module === filter;
    return matchesSearch && matchesFilter;
  });

  const moduleCounts = {};
  history.forEach((h) => { moduleCounts[h.module] = (moduleCounts[h.module] || 0) + 1; });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-lg" style={{ background: 'linear-gradient(135deg, #7B6FA0, #9B8FC0)' }}>
            <i className="bi bi-journal-text text-white" style={{ fontSize: '32px' }} />
          </div>
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-slate-900">Patient History</h2>
            <p className="text-slate-600 font-medium">Click any card to view the full report</p>
          </div>
          {history.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-4 py-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Search + Filter */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <i className="bi bi-search text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" style={{ fontSize: '16px' }} />
            <input
              type="text"
              placeholder="Search by name or module..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400/40 text-slate-900"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-3 bg-white border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400/40 text-slate-900"
          >
            <option value="all">All Modules</option>
            {Object.entries(MODULE_META).map(([key, m]) => (
              <option key={key} value={key}>{m.label}</option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
        <AnimatedCard delay={0.05}>
          <div className="p-4 text-center">
            <div className="text-2xl font-bold text-slate-800">{history.length}</div>
            <div className="text-xs text-slate-500 font-medium">Total</div>
          </div>
        </AnimatedCard>
        {Object.entries(MODULE_META).map(([key, m], idx) => (
          <AnimatedCard key={key} delay={0.05 + idx * 0.05}>
            <div className="p-4 text-center">
              <div className="text-2xl font-bold text-slate-800">{moduleCounts[key] || 0}</div>
              <div className="text-xs text-slate-500 font-medium flex items-center justify-center gap-1">
                <i className={`bi ${m.icon}`} style={{ fontSize: 12 }} /> {m.label}
              </div>
            </div>
          </AnimatedCard>
        ))}
      </div>

      {/* Cards grid */}
      {filteredHistory.length === 0 ? (
        <AnimatedCard>
          <div className="p-12 text-center">
            <i className="bi bi-journal-text text-slate-300 mb-4" style={{ fontSize: '48px' }} />
            <p className="text-slate-500 text-lg">No records found</p>
            <p className="text-slate-400 text-sm mt-2">
              {searchTerm ? 'Try adjusting your search' : 'Run an analysis from any module to see history here'}
            </p>
          </div>
        </AnimatedCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredHistory.map((item, idx) => {
            const meta = MODULE_META[item.module] || MODULE_META.chest;
            const colors = COLOR_MAP[meta.color] || COLOR_MAP.purple;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.04 }}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedItem(item)}
                className="cursor-pointer"
              >
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all overflow-hidden group">
                  {/* Card image / icon area */}
                  <div className="relative h-40 bg-slate-50 overflow-hidden">
                    {item.thumbnail ? (
                      <img src={item.thumbnail} alt="scan" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center ${colors.bg}`}>
                        <i className={`bi ${meta.icon} ${colors.text}`} style={{ fontSize: 48 }} />
                      </div>
                    )}
                    {/* Module badge */}
                    <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-bold border backdrop-blur-sm bg-white/80 ${colors.badge}`}>
                      {meta.label}
                    </div>
                    {/* Delete button */}
                    <button
                      onClick={(e) => handleDelete(e, item.id)}
                      className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm border border-slate-200 flex items-center justify-center hover:bg-red-50 hover:border-red-200 transition opacity-0 group-hover:opacity-100"
                      title="Delete"
                    >
                      <i className="bi bi-trash text-red-400" style={{ fontSize: 12 }} />
                    </button>
                  </div>

                  {/* Card body */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-slate-800 truncate">{item.patientName}</h3>
                    </div>
                    <div className={`text-sm font-semibold ${colors.text} mb-2 truncate`}>
                      {shortResult(item.module, item.result)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <i className="bi bi-clock" style={{ fontSize: 10 }} />
                        {new Date(item.timestamp).toLocaleDateString()}
                      </span>
                      <span className="text-[11px] font-semibold text-purple-500 flex items-center gap-1 group-hover:underline">
                        View Report <i className="bi bi-arrow-right" style={{ fontSize: 10 }} />
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Report popup modal */}
      <AnimatePresence>
        {selectedItem && (
          <ReportModal item={selectedItem} onClose={() => setSelectedItem(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
