import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { analyzeImage } from '../api';
import LoadingSpinner from './LoadingSpinner';
import AnimatedCard from './AnimatedCard';
import { saveRecord } from '../historyStore';

const tumorInfo = {
  Glioma:
    'Gliomas occur in supportive glial cells. They are the most common type of primary brain tumor.',
  Meningioma:
    'Meningiomas form on membranes covering the brain and spinal cord. They are often slow-growing.',
  Pituitary:
    'Pituitary tumors are abnormal growths in the pituitary gland. Some cause hormone imbalances.',
  'No Tumor':
    'The MRI scan appears clear. No significant abnormalities were detected by the AI model.',
};

function ConfidenceRing({ value }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="flex items-center justify-center">
      <div
        className="relative w-44 h-44 rounded-full"
        style={{
          background: `conic-gradient(from 90deg, #7c3aed 0 ${v}%, rgba(148,163,184,0.25) ${v}% 100%)`,
        }}
      >
        <div className="absolute inset-3 rounded-full bg-white/90 backdrop-blur-sm border border-slate-200/60 flex items-center justify-center">
          <div className="text-center">
            <div className="text-3xl font-black text-purple-800">{v}%</div>
            <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Confidence</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompareImage({ baseSrc, overlaySrc, baseLabel, overlayLabel, split, onSplit, accent }) {
  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50">
      <div className="relative w-full h-[420px]">
        <img src={baseSrc} alt={baseLabel} className="w-full h-full object-cover" />
        <div className="absolute inset-0 overflow-hidden" style={{ width: `${split}%` }}>
          <img src={overlaySrc} alt={overlayLabel} className="w-full h-full object-cover" />
        </div>
        <div
          className={`absolute inset-y-0 w-[2px] ${accent}`}
          style={{ left: `${split}%`, transform: 'translateX(-1px)' }}
          aria-hidden="true"
        />

        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-white/80 border border-slate-200/70 text-xs font-bold text-slate-700">
            {baseLabel}
          </span>
          <span className="px-3 py-1 rounded-full bg-white/70 border border-slate-200/60 text-xs font-bold text-purple-800">
            {overlayLabel}
          </span>
        </div>

        <div className="absolute bottom-3 left-3 right-3 z-10 bg-white/70 backdrop-blur-md border border-slate-200/70 rounded-2xl p-3">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="text-xs font-bold text-slate-700">Split: {split}%</div>
            <div className="text-xs text-slate-500">Drag to compare</div>
          </div>
          <input
            type="range"
            min={20}
            max={80}
            step={1}
            value={split}
            onChange={(e) => onSplit(Number(e.target.value))}
            className="w-full accent-purple-600"
          />
        </div>
      </div>
    </div>
  );
}

export default function BrainModule({ addToast, brainIcon: passedBrainIcon }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [activeView, setActiveView] = useState('report');
  const [dragActive, setDragActive] = useState(false);

  // Patient metadata (saved with analysis history)
  const [patientName, setPatientName] = useState('Anonymous');
  const [age, setAge] = useState(45);
  const [sex, setSex] = useState('male');

  // Use passed brain icon or generate one as fallback
  const brainIcon = useMemo(() => {
    if (passedBrainIcon) return passedBrainIcon;
    const icons = [
      <i className="bi bi-brain text-white" style={{ fontSize: '36px' }} />,
      <i className="bi bi-lightning-charge-fill text-white" style={{ fontSize: '36px' }} />,
      <i className="bi bi-cpu text-white" style={{ fontSize: '36px' }} />,
      <i className="bi bi-gear-fill text-white" style={{ fontSize: '36px' }} />,
      <i className="bi bi-shield-check text-white" style={{ fontSize: '36px' }} />,
    ];
    return icons[Math.floor(Math.random() * icons.length)];
  }, [passedBrainIcon]);

  const [contextOpen, setContextOpen] = useState(true);
  const [contrastSplit, setContrastSplit] = useState(55);
  const [heatOpacity, setHeatOpacity] = useState(0.65);
  const [heatBoost, setHeatBoost] = useState(1.2);

  const handleAnalyze = async () => {
    if (!file) {
      addToast('Please select an image first', 'warning');
      return;
    }
    setLoading(true);
    setResult(null);
    setActiveView('report');
    try {
      const data = await analyzeImage('brain', file, { patientName, age, sex });
      setResult(data.data);
      addToast('Analysis completed successfully', 'success');
      saveRecord({
        module: 'brain',
        patientName,
        inputs: { age, sex },
        result: { diagnosis: data.data?.diagnosis, confidence: data.data?.confidence },
        imageFile: file,
      });
    } catch {
      addToast('Analysis failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
  };

  const diagnosis = result?.diagnosis ?? '';
  const confidence = result?.confidence ?? 0;
  const infoText = tumorInfo[diagnosis] || 'Detailed analysis required.';

  const reviewTips = useMemo(() => {
    const base = [
      'Cross-check the highlighted areas with clinical symptoms and imaging reports.',
      'Use confidence cues as a “where to look next” guide, not a final decision.',
    ];
    if (diagnosis === 'No Tumor') return ['If clinically warranted, consider second opinions.', ...base];
    if (diagnosis === 'Pituitary')
      return ['Review the sellar/suprasellar region and correlate with endocrine labs.', ...base];
    if (diagnosis === 'Meningioma')
      return ['Meningiomas often show characteristic dural attachment; correlate with radiology findings.', ...base];
    if (diagnosis === 'Glioma')
      return ['Gliomas may appear infiltrative; review the lesion extent and diffusion patterns.', ...base];
    return base;
  }, [diagnosis]);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="mb-6"
      >
        <div className="flex items-center gap-4 flex-wrap">
          <motion.div
            whileHover={{ rotate: 360, scale: 1.05 }}
            transition={{ duration: 0.6 }}
            className="p-4 bg-sky-400 rounded-xl shadow-md"
          >
            <div style={{ fontSize: '36px' }}>
              {brainIcon}
            </div>
          </motion.div>
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-slate-900">Brain MRI Diagnostics</h2>
            <p className="text-slate-800 font-medium">VGG-16 Architecture • Segmentation + Explainability</p>
          </div>
          {result && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="px-4 py-2 rounded-2xl bg-white border border-blue-100 shadow-md">
              <div className="text-xs uppercase font-bold tracking-wider text-slate-700">Prediction</div>
              <div className="font-black text-slate-900">{diagnosis}</div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Clinical Notice */}
      <div className="mb-8 flex items-start gap-3 rounded-2xl border border-sky-200/60 bg-sky-50 p-4">
        <div className="p-2.5 rounded-xl bg-sky-400 text-white shadow">
          <i className="bi bi-shield-lock-fill" style={{ fontSize: '18px' }} />
        </div>
        <div className="text-sm text-slate-900 font-medium leading-relaxed">
          <span className="font-bold text-slate-900">Clinical Notice:</span> AI results are assistive and must be correlated with clinical history and professional judgment.
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <AnimatedCard delay={0.02}>
            <div className="p-6">
              <h3 className="font-bold text-slate-700 mb-4 border-b pb-3 flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500/15 to-pink-500/15 text-purple-700">
                  P
                </span>
                Patient Metadata
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-500 uppercase font-bold mb-2 block flex items-center gap-2">
                    <i className="bi bi-person-fill" style={{ fontSize: '14px' }} />
                    Name
                  </label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-transparent transition-all"
                    placeholder="e.g., John Doe"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-500 uppercase font-bold mb-2 block flex items-center gap-2">
                    <i className="bi bi-calendar-event" style={{ fontSize: '14px' }} />
                    Age
                  </label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-transparent transition-all"
                    min="1"
                    max="120"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-500 uppercase font-bold mb-2 block flex items-center gap-2">
                    <i className="bi bi-gender-ambiguous" style={{ fontSize: '14px' }} />
                    Sex
                  </label>
                  <select
                    value={sex}
                    onChange={(e) => setSex(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-transparent transition-all"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </div>
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard delay={0.05}>
            <div className="p-6">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl h-64 flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 cursor-pointer relative overflow-hidden transition-all duration-300 ${
                  dragActive ? 'border-purple-500 bg-purple-50 scale-105' : 'border-slate-300 hover:border-purple-400'
                }`}
              >
                <input
                  type="file"
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  accept="image/*"
                />

                {!file ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-slate-400">
                    <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                      <i className="bi bi-cloud-upload-fill mx-auto mb-4 text-slate-300" style={{ fontSize: '48px' }} />
                    </motion.div>
                    <p className="text-sm font-medium mb-1">Drop MRI scan here</p>
                    <p className="text-xs">or click to browse</p>
                  </motion.div>
                ) : (
                  <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full h-full">
                    <img src={URL.createObjectURL(file)} className="w-full h-full object-contain rounded-lg" alt="Preview" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      aria-label="Remove image"
                    >
                      <i className="bi bi-x-circle-fill" style={{ fontSize: '16px' }} />
                    </button>
                  </motion.div>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAnalyze}
                disabled={loading || !file}
                className="w-full mt-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 rounded-lg font-bold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" text="" />
                    <span>Scanning Brain...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-play-fill" style={{ fontSize: '20px' }} />
                    <span>Detect Tumor</span>
                  </>
                )}
              </motion.button>
            </div>
          </AnimatedCard>

          {result && (
            <AnimatedCard delay={0.12} hover={false}>
              <div className="p-2">
                <div className="text-xs font-semibold text-slate-500 uppercase px-4 py-2">Result views</div>
                <div className="overflow-hidden rounded-xl mx-2 mb-2 border border-slate-200/60">
                  {[
                    { key: 'report', label: 'Diagnostic Report', icon: <i className="bi bi-file-medical-fill" style={{ fontSize: '18px' }} /> },
                    { key: 'contrast', label: 'Contrast Enhanced', icon: <i className="bi bi-thermometer-half" style={{ fontSize: '18px' }} /> },
                    { key: 'heatmap', label: 'Tumor Localization', icon: <i className="bi bi-geo-alt-fill" style={{ fontSize: '18px' }} /> },
                  ].map((t, idx) => (
                    <motion.button
                      key={t.key}
                      type="button"
                      onClick={() => setActiveView(t.key)}
                      className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                        activeView === t.key
                          ? 'bg-gradient-to-r from-purple-50 to-pink-50 text-purple-800 font-bold'
                          : 'hover:bg-slate-50 text-slate-600'
                      } ${idx !== 0 ? 'border-t border-slate-200/60' : ''}`}
                      whileHover={{ x: 3 }}
                    >
                      {t.icon}
                      <span className="text-sm">{t.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </AnimatedCard>
          )}
        </div>

        <div className="md:col-span-2">
          <AnimatedCard delay={0.05}>
            <div className="p-8 min-h-[600px]">
              <AnimatePresence mode="wait">
                {!result ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col items-center justify-center text-slate-400">
                    <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                      <i className="bi bi-brain text-slate-400 mb-4 opacity-20" style={{ fontSize: '64px' }} />
                    </motion.div>
                    <p className="italic">Upload an MRI scan to start segmentation.</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key={activeView}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.25 }}
                    className="h-full"
                  >
                    {activeView === 'report' && (
                      <div className="h-full flex flex-col">
                        <div className="flex items-start justify-between gap-4 flex-wrap mb-5 border-b pb-4">
                          <div>
                            <h3 className="text-2xl font-bold text-slate-800">Model Summary</h3>
                            <div className="text-sm text-slate-500 mt-1">Confidence + clinical context</div>
                          </div>
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="px-4 py-2 rounded-2xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200/70"
                          >
                            <div className="text-xs uppercase font-bold tracking-wider text-purple-700">Diagnosis</div>
                            <div className="font-black text-purple-900 text-lg">{diagnosis}</div>
                          </motion.div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                          <div className="bg-white/70 backdrop-blur-md border border-slate-200/60 rounded-2xl p-5">
                            <ConfidenceRing value={confidence} />
                          </div>

                          <div className="bg-white/70 backdrop-blur-md border border-slate-200/60 rounded-2xl p-5">
                            <div className="flex items-center justify-between gap-3 mb-3">
                              <div className="flex items-center gap-2">
                                <i className="bi bi-info-circle-fill text-purple-700" style={{ fontSize: '18px' }} />
                                <div className="font-black text-slate-900">Medical Context</div>
                              </div>
                              <motion.button
                                whileHover={{ y: -1 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setContextOpen((v) => !v)}
                                type="button"
                                className="px-4 py-2 rounded-xl border border-slate-200/70 bg-white/70 hover:bg-white transition-colors font-bold text-sm text-purple-800 flex items-center gap-2"
                              >
                                <i className={`bi ${contextOpen ? 'bi-chevron-up' : 'bi-chevron-down'}`} style={{ fontSize: '16px' }} />
                                {contextOpen ? 'Collapse' : 'Expand'}
                              </motion.button>
                            </div>
                            <div className="text-sm text-slate-700 leading-relaxed">
                              {infoText}
                            </div>
                            <AnimatePresence initial={false}>
                              {contextOpen && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="mt-4"
                                >
                                  <div className="text-xs uppercase font-bold tracking-wider text-slate-500 mb-2">What to review next</div>
                                  <ul className="space-y-2 text-sm text-slate-700">
                                    {reviewTips.map((t, i) => (
                                      <li key={i} className="flex items-start gap-2">
                                        <span className="text-purple-700 font-black mt-0.5">•</span>
                                        <span className="leading-relaxed">{t}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeView === 'contrast' && (
                      <div className="h-full">
                        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap border-b pb-4">
                          <h3 className="text-xl font-bold flex items-center gap-2 text-purple-700">
                            <i className="bi bi-sunglasses" style={{ fontSize: '22px', color: '#c084fc' }} />
                            Contrast Enhanced — Compare
                          </h3>
                          <div className="text-xs text-slate-500">Drag split to reveal contrast region</div>
                        </div>

                        <CompareImage
                          baseSrc={`data:image/png;base64,${result.images.original}`}
                          overlaySrc={`data:image/png;base64,${result.images.contrast}`}
                          baseLabel="Standard"
                          overlayLabel="Contrast"
                          split={contrastSplit}
                          onSplit={setContrastSplit}
                          accent="bg-purple-500"
                        />

                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="mt-4 text-sm text-slate-600 bg-white/70 border border-slate-200/60 p-4 rounded-xl"
                        >
                          <b>Why use this?</b> Contrast helps highlight tumor boundaries and improves interpretability in low-contrast areas.
                        </motion.p>
                      </div>
                    )}

                    {activeView === 'heatmap' && (
                      <div className="h-full flex flex-col">
                        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap border-b pb-4">
                          <h3 className="text-xl font-bold flex items-center gap-2 text-purple-700">
                            <i className="bi bi-geo-alt-fill" style={{ fontSize: '22px', color: '#c084fc' }} />
                            Tumor Localization — Heatmap Overlay
                          </h3>
                          <div className="text-xs text-slate-500">Adjust opacity and boost intensity</div>
                        </div>

                        <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50">
                          <div className="relative w-full h-[420px]">
                            <img
                              src={`data:image/png;base64,${result.images.original}`}
                              alt="Original MRI"
                              className="w-full h-full object-cover"
                            />
                            <motion.img
                              src={`data:image/png;base64,${result.images.heatmap}`}
                              alt="Heatmap"
                              className="absolute inset-0 w-full h-full object-cover"
                              style={{
                                opacity: heatOpacity,
                                filter: `contrast(${heatBoost}) saturate(${heatBoost})`,
                              }}
                              initial={false}
                            />

                            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                              <span className="px-3 py-1 rounded-full bg-white/80 border border-slate-200/70 text-xs font-bold text-slate-700">
                                Original
                              </span>
                              <span className="px-3 py-1 rounded-full bg-purple-600/20 border border-purple-400/30 text-xs font-bold text-purple-900">
                                Heatmap
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="bg-white/70 border border-slate-200/60 rounded-2xl p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-bold text-slate-700">Heat opacity</div>
                              <div className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                {Math.round(heatOpacity * 100)}%
                              </div>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.05}
                              value={heatOpacity}
                              onChange={(e) => setHeatOpacity(Number(e.target.value))}
                              className="mt-3 w-full accent-purple-600"
                            />
                          </div>

                          <div className="bg-white/70 border border-slate-200/60 rounded-2xl p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-bold text-slate-700">Heat boost</div>
                              <div className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                {heatBoost.toFixed(1)}x
                              </div>
                            </div>
                            <input
                              type="range"
                              min={1}
                              max={1.8}
                              step={0.1}
                              value={heatBoost}
                              onChange={(e) => setHeatBoost(Number(e.target.value))}
                              className="mt-3 w-full accent-purple-600"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </AnimatedCard>
        </div>
      </div>
    </div>
  );
}

