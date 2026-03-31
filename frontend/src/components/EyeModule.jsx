import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { analyzeImage } from '../api';
// Using bootstrap icons via class names (no lucide-react needed)
import LoadingSpinner from './LoadingSpinner';
import AnimatedCard from './AnimatedCard';
import { saveRecord } from '../historyStore';

function CompareImage({ baseSrc, overlaySrc, baseLabel, overlayLabel, split, onSplit, lineClass }) {
  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50">
      <div className="relative w-full h-[420px]">
        <img src={baseSrc} alt={baseLabel} className="w-full h-full object-cover" />
        <div className="absolute inset-0 overflow-hidden" style={{ width: `${split}%` }}>
          <img src={overlaySrc} alt={overlayLabel} className="w-full h-full object-cover" />
        </div>
        <div
          className={`absolute inset-y-0 w-[2px] ${lineClass}`}
          style={{ left: `${split}%`, transform: 'translateX(-1px)' }}
          aria-hidden="true"
        />

        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-white/80 border border-slate-200/70 text-xs font-bold text-slate-700">
            {baseLabel}
          </span>
          <span className="px-3 py-1 rounded-full bg-white/70 border border-slate-200/60 text-xs font-bold text-amber-900">
            {overlayLabel}
          </span>
        </div>

        <div className="absolute bottom-3 left-3 right-3 z-10 bg-white/70 backdrop-blur-md border border-slate-200/70 rounded-2xl p-3">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="text-xs font-bold text-slate-700">Reveal: {split}%</div>
            <div className="text-xs text-slate-500">Drag split</div>
          </div>
          <input
            type="range"
            min={20}
            max={80}
            step={1}
            value={split}
            onChange={(e) => onSplit(Number(e.target.value))}
            className="w-full accent-amber-600"
          />
        </div>
      </div>
    </div>
  );
}

function RiskMeter({ diagnosis, confidence }) {
  const conf = Math.max(0, Math.min(100, Number(confidence) || 0));
  const isNo = diagnosis === 'No DR' || diagnosis === 'No Disease';
  const barClass = isNo ? 'from-green-500 to-emerald-500' : 'from-amber-500 to-orange-500';
  const label = isNo ? 'Low risk' : 'Elevated risk';

  return (
    <div className="bg-white/70 border border-slate-200/60 rounded-2xl p-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase font-bold tracking-wider text-slate-500">AI confidence</div>
          <div className="mt-1 text-2xl font-black text-slate-900">{conf}%</div>
        </div>
        <div className="px-4 py-2 rounded-2xl bg-gradient-to-r from-white/80 to-white/60 border border-slate-200/60">
          <div className={`text-sm font-bold ${isNo ? 'text-emerald-700' : 'text-orange-700'}`}>{label}</div>
        </div>
      </div>
      <div className="mt-4 w-full bg-slate-200 rounded-full h-4 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${conf}%` }}
          transition={{ duration: 0.9, delay: 0.05 }}
          className={`h-full rounded-full bg-gradient-to-r ${barClass}`}
        />
      </div>
      <div className="mt-3 text-xs text-slate-500 flex justify-between">
        <span>Benign</span>
        <span>Review</span>
        <span>Severe</span>
      </div>
    </div>
  );
}

export default function EyeModule({ addToast }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [activeView, setActiveView] = useState('report');
  const [dragActive, setDragActive] = useState(false);

  // Patient metadata (saved with analysis history)
  const [patientName, setPatientName] = useState('Anonymous');
  const [age, setAge] = useState(45);
  const [sex, setSex] = useState('male');

  const [claheSplit, setClaheSplit] = useState(55);
  const [heatOpacity, setHeatOpacity] = useState(0.78);
  const [heatZoom, setHeatZoom] = useState(1.15);
  const [heatBoost, setHeatBoost] = useState(1.15);
  const [showLegend, setShowLegend] = useState(true);

  const handleAnalyze = async () => {
    if (!file) {
      addToast('Please select an image first', 'warning');
      return;
    }
    setLoading(true);
    setResult(null);
    setActiveView('report');
    try {
      const data = await analyzeImage('eye', file, { patientName, age, sex });
      setResult(data.data);
      addToast('Analysis completed successfully', 'success');
      saveRecord({
        module: 'eye',
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
  const isNo = diagnosis === 'No DR' || diagnosis === 'No Disease';

  const readThis = useMemo(() => {
    if (isNo) return 'The AI found no strong evidence for diabetic retinopathy patterns in this input.';
    return 'Red areas indicate regions the model considered highly relevant to retinopathy-related features.';
  }, [isNo]);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <motion.div whileHover={{ rotate: 360, scale: 1.05 }} transition={{ duration: 0.6 }} className="p-4 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-md">
            <i className="bi bi-eye text-white" style={{ fontSize: '36px' }} />
          </motion.div>
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-slate-900">Retinal Disease Analysis</h2>
            <p className="text-slate-800 font-medium">Ensemble Deep Learning • CLAHE + Explainability</p>
          </div>
          {result && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="px-4 py-2 rounded-2xl bg-white border border-blue-100 shadow-md">
              <div className="text-xs uppercase font-bold tracking-wider text-slate-700">Prediction</div>
              <div className="font-black text-slate-900">{diagnosis}</div>
            </motion.div>
          )}
        </div>
      </motion.div>

      <div className="mb-8 flex items-start gap-3 rounded-2xl border border-amber-200/60 bg-amber-50 p-4">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-600 to-orange-600 text-white shadow">
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
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 text-amber-700">
                  P
                </span>
                Patient Metadata
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-500 uppercase font-bold mb-2 block">Name</label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-transparent transition-all"
                    placeholder="e.g., John Doe"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-500 uppercase font-bold mb-2 block">Age</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-transparent transition-all"
                    min="1"
                    max="120"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-500 uppercase font-bold mb-2 block">Sex</label>
                  <select
                    value={sex}
                    onChange={(e) => setSex(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-transparent transition-all"
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
                  dragActive ? 'border-amber-500 bg-amber-50 scale-105' : 'border-slate-300 hover:border-amber-400'
                }`}
              >
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={(e) => setFile(e.target.files?.[0] ?? null)} accept="image/*" />

                {!file ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-slate-400">
                    <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                      <i className="bi bi-cloud-arrow-up-fill mx-auto mb-4 text-amber-400" style={{ fontSize: '48px' }} />
                    </motion.div>
                    <p className="text-sm font-medium mb-1">Drop Fundus Image here</p>
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
                className="w-full mt-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white py-3 rounded-lg font-bold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" text="" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-play-circle-fill" style={{ fontSize: '20px' }} />
                    <span>Run Diagnostics</span>
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
                    { key: 'report', label: 'Diagnostic Report', icon: <i className="bi bi-file-earmark-text" style={{ fontSize: '18px' }} /> },
                    { key: 'clahe', label: 'CLAHE Enhanced View', icon: <i className="bi bi-filter-circle" style={{ fontSize: '18px' }} /> },
                    { key: 'explain', label: 'Saliency Maps', icon: <i className="bi bi-layers" style={{ fontSize: '18px' }} /> },
                  ].map((t, idx) => (
                    <motion.button
                      key={t.key}
                      type="button"
                      onClick={() => setActiveView(t.key)}
                      className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                        activeView === t.key
                          ? 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-800 font-bold'
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
                      <i className="bi bi-eye-fill mb-4 opacity-20" style={{ fontSize: '64px' }} />
                    </motion.div>
                    <p className="italic">Upload a scan to view detailed analysis.</p>
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
                            <h3 className="text-2xl font-bold text-slate-800">Clinical Classification</h3>
                            <div className="text-sm text-slate-500 mt-1">Confidence cues + interpretability</div>
                          </div>
                          <div className={`px-4 py-2 rounded-2xl border font-black ${isNo ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-orange-200 bg-orange-50 text-orange-800'}`}>
                            <div className="text-xs uppercase font-bold tracking-wider">{isNo ? 'No DR' : 'Positive'}</div>
                            <div className="text-lg mt-1">{diagnosis}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                          <div>
                            <RiskMeter diagnosis={diagnosis} confidence={confidence} />
                          </div>
                          <div className="bg-white/70 border border-slate-200/60 rounded-2xl p-5">
                            <div className="flex items-center gap-2">
                              <i className="bi bi-info-circle-fill text-amber-700" style={{ fontSize: '18px' }} />
                              <div className="font-black text-slate-900">How to read this</div>
                            </div>
                            <div className="mt-3 text-sm text-slate-700 leading-relaxed">
                              {readThis}
                            </div>
                            <div className="mt-4 flex gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => setActiveView('explain')}
                                className="px-4 py-2 rounded-xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-700 hover:to-orange-700 transition-colors"
                              >
                                View Saliency Map
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveView('clahe')}
                                className="px-4 py-2 rounded-xl font-bold border border-slate-200/70 bg-white/70 hover:bg-white transition-colors text-amber-800"
                              >
                                CLAHE Compare
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeView === 'clahe' && (
                      <div className="h-full">
                        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap border-b pb-4">
                          <h3 className="text-xl font-bold flex items-center gap-2 text-amber-800">
                            <i className="bi bi-filter-circle text-amber-600" style={{ fontSize: '22px' }} />
                            CLAHE Enhanced — Compare
                          </h3>
                          <div className="text-xs text-slate-500">Reveal split between standard and CLAHE</div>
                        </div>

                        <CompareImage
                          baseSrc={`data:image/png;base64,${result.images.original}`}
                          overlaySrc={`data:image/png;base64,${result.images.clahe}`}
                          baseLabel="Standard"
                          overlayLabel="CLAHE"
                          split={claheSplit}
                          onSplit={setClaheSplit}
                          lineClass="bg-amber-500"
                        />

                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="mt-4 text-sm text-slate-600 bg-white/70 border border-slate-200/60 p-4 rounded-xl"
                        >
                          <b>Why use this?</b> CLAHE boosts local contrast to reveal vessels and micro-aneurysms that are harder to see in the original.
                        </motion.p>
                      </div>
                    )}

                    {activeView === 'explain' && (
                      <div className="h-full flex flex-col">
                        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap border-b pb-4">
                          <h3 className="text-xl font-bold flex items-center gap-2 text-red-600">
                            <i className="bi bi-layers text-red-500" style={{ fontSize: '22px' }} />
                            Saliency Maps — Interactive Heatmap
                          </h3>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setShowLegend((v) => !v)}
                              className="px-4 py-2 rounded-xl border border-slate-200/70 bg-white/70 hover:bg-white transition-colors font-bold text-sm text-red-700"
                            >
                              {showLegend ? 'Hide' : 'Show'} Legend
                            </button>
                          </div>
                        </div>

                        <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50">
                          <div className="relative w-full h-[420px]">
                            <img
                              src={`data:image/png;base64,${result.images.original}`}
                              alt="Original scan"
                              className="w-full h-full object-cover"
                            />

                            {result.images.heatmap ? (
                              <motion.img
                                src={`data:image/png;base64,${result.images.heatmap}`}
                                alt="Grad-CAM heatmap"
                                className="absolute inset-0 w-full h-full object-cover"
                                style={{
                                  opacity: heatOpacity,
                                  transform: `scale(${heatZoom})`,
                                  transformOrigin: 'center',
                                  filter: `contrast(${heatBoost}) saturate(${heatBoost})`,
                                }}
                                initial={false}
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-500">
                                Heatmap unavailable
                              </div>
                            )}

                            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                              <span className="px-3 py-1 rounded-full bg-white/80 border border-slate-200/70 text-xs font-bold text-slate-700">
                                Original
                              </span>
                              <span className="px-3 py-1 rounded-full bg-red-600/15 border border-red-400/25 text-xs font-bold text-red-900">
                                Heatmap
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="bg-white/70 border border-slate-200/60 rounded-2xl p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-bold text-slate-700">Opacity</div>
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
                              className="mt-3 w-full accent-red-600"
                            />
                          </div>

                          <div className="bg-white/70 border border-slate-200/60 rounded-2xl p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-bold text-slate-700">Zoom</div>
                              <div className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                {heatZoom.toFixed(2)}x
                              </div>
                            </div>
                            <input
                              type="range"
                              min={1}
                              max={1.7}
                              step={0.05}
                              value={heatZoom}
                              onChange={(e) => setHeatZoom(Number(e.target.value))}
                              className="mt-3 w-full accent-amber-600"
                            />
                          </div>

                          <div className="bg-white/70 border border-slate-200/60 rounded-2xl p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-bold text-slate-700">Boost</div>
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
                              className="mt-3 w-full accent-red-600"
                            />
                          </div>
                        </div>

                        {showLegend && (
                          <div className="mt-4 bg-white/70 border border-slate-200/60 rounded-2xl p-4">
                            <div className="font-black text-slate-900 mb-2">Legend</div>
                            <div className="flex flex-wrap gap-4 text-sm text-slate-700">
                              <div className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded-full bg-red-600 shadow" />
                                <span>
                                  <b>Red:</b> High importance
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded-full bg-blue-600 shadow" />
                                <span>
                                  <b>Blue:</b> Low importance
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
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

