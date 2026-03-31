import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { analyzeImage } from '../api';
import { Activity, AlertCircle, AlertTriangle, Info, Scissors, Scan } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import AnimatedCard from './AnimatedCard';
import { saveRecord } from '../historyStore';

const skinContext = {
  Malignant:
    'High-risk appearance patterns may indicate malignant potential. Review ABCD features and correlate clinically.',
  Benign:
    'The model leans toward benign patterns. Consider clinical context and ensure appropriate follow-up.',
};

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
          <span className="px-3 py-1 rounded-full bg-white/70 border border-slate-200/60 text-xs font-bold text-red-900">
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
            className="w-full accent-red-600"
          />
        </div>
      </div>
    </div>
  );
}

export default function SkinModule({ addToast }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [activeView, setActiveView] = useState('report');
  const [dragActive, setDragActive] = useState(false);

  // Metadata State
  const [patientName, setPatientName] = useState('Anonymous');
  const [age, setAge] = useState(45);
  const [sex, setSex] = useState('male');
  const [site, setSite] = useState('torso');

  const [cleanSplit, setCleanSplit] = useState(58);
  const [maskOpacity, setMaskOpacity] = useState(0.72);

  const handleAnalyze = async () => {
    if (!file) {
      addToast('Please select an image first', 'warning');
      return;
    }
    setLoading(true);
    setResult(null);
    setActiveView('report');
    try {
      const data = await analyzeImage('skin', file, { patientName, age, sex, site });
      setResult(data.data);
      addToast('Analysis completed successfully', 'success');
      saveRecord({
        module: 'skin',
        patientName,
        inputs: { age, sex, site },
        result: { diagnosis: data.data?.diagnosis, malignancy_score: data.data?.malignancy_score, details: data.data?.details },
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
  const malignancyScore = Number(result?.malignancy_score ?? 0);
  const isMalignant = diagnosis === 'Malignant';

  const riskLabel = isMalignant ? 'Malignant risk' : 'Benign risk';
  const riskTone = isMalignant ? 'from-red-500 to-rose-500' : 'from-green-500 to-emerald-500';

  const abcTips = useMemo(() => {
    return [
      { k: 'A', title: 'Asymmetry', body: 'Melanomas often show uneven shape compared to benign lesions.' },
      { k: 'B', title: 'Border', body: 'Irregular or blurred edges can suggest malignancy.' },
      { k: 'C', title: 'Color', body: 'Multiple colors or uneven pigmentation may be concerning.' },
      { k: 'D', title: 'Diameter', body: 'Larger lesions can warrant closer evaluation.' },
    ];
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <motion.div
            whileHover={{ rotate: 360, scale: 1.05 }}
            transition={{ duration: 0.6 }}
            className="p-4 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl shadow-md"
          >
            <i className="bi bi-droplet-half text-white" style={{ fontSize: '36px' }} />
          </motion.div>
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Skin Lesion Diagnostics</h2>
            <p className="text-slate-800 font-medium">Multi-Modal Analysis (Image + Patient Metadata)</p>
          </div>
        </div>
      </motion.div>

      <div className="mb-8 flex items-start gap-3 rounded-2xl border border-red-200/60 bg-red-50 p-4">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-600 to-red-700 text-white shadow">
          <i className="bi bi-shield-lock-fill" style={{ fontSize: '18px' }} />
        </div>
        <div className="text-sm text-slate-900 font-medium leading-relaxed">
          <span className="font-bold text-slate-900">Clinical Notice:</span> AI results are assistive and must be correlated with clinical history and professional judgment.
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* LEFT */}
        <div className="md:col-span-1 space-y-6">
          <AnimatedCard delay={0.05}>
            <div className="p-6">
              <h3 className="font-bold text-slate-700 mb-4 border-b pb-3 flex items-center gap-2">
                <i className="bi bi-person-fill" style={{ fontSize: '18px' }} />
                Patient Metadata
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-500 uppercase font-bold mb-2 block">Name</label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-transparent transition-all"
                    placeholder="e.g., John Doe"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 uppercase font-bold mb-2 block">Age</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-transparent transition-all"
                    min="1"
                    max="120"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 uppercase font-bold mb-2 block">Sex</label>
                  <select
                    value={sex}
                    onChange={(e) => setSex(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-transparent transition-all"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 uppercase font-bold mb-2 flex items-center gap-1">
                    <i className="bi bi-geo-alt-fill" style={{ fontSize: '14px' }} />
                    Anatomical Site
                  </label>
                  <select
                    value={site}
                    onChange={(e) => setSite(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-transparent transition-all"
                  >
                    <option value="torso">Torso (Chest/Back)</option>
                    <option value="head/neck">Head / Neck</option>
                    <option value="upper extremity">Upper Extremity (Arm)</option>
                    <option value="lower extremity">Lower Extremity (Leg)</option>
                    <option value="palms/soles">Palms / Soles</option>
                  </select>
                </div>
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard delay={0.08}>
            <div className="p-6">
              <h3 className="font-bold text-slate-700 mb-4 border-b pb-3 flex items-center gap-2">
                <i className="bi bi-upload text-red-500" style={{ fontSize: '18px' }} />
                Lesion Image
              </h3>
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl h-48 flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 cursor-pointer relative overflow-hidden transition-all duration-300 ${
                  dragActive ? 'border-red-500 bg-red-50 scale-105' : 'border-slate-300 hover:border-red-400'
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
                      <i className="bi bi-cloud-arrow-up-fill mx-auto mb-3 text-red-400" style={{ fontSize: '40px' }} />
                    </motion.div>
                    <p className="text-sm font-medium">Drop image here</p>
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
                      <AlertCircle size={16} />
                    </button>
                  </motion.div>
                )}
              </div>
            </div>
          </AnimatedCard>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleAnalyze}
            disabled={loading || !file}
            className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white py-4 rounded-lg font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" text="" />
                <span>Analyzing Lesion...</span>
              </>
            ) : (
              <>
                <Activity size={20} />
                <span>Run Assessment</span>
              </>
            )}
          </motion.button>

          {result && (
            <AnimatedCard delay={0.12} hover={false}>
              <div className="p-2">
                <div className="text-xs font-semibold text-slate-500 uppercase px-4 py-2">Result views</div>
                <div className="overflow-hidden rounded-xl mx-2 mb-2 border border-slate-200/60">
                  {[
                    { key: 'report', label: 'Risk Assessment', icon: <Activity size={18} /> },
                    { key: 'cleaned', label: 'Hair Removal View', icon: <Scissors size={18} /> },
                    { key: 'segmented', label: 'Lesion Segmentation', icon: <Scan size={18} /> },
                  ].map((t, idx) => (
                    <motion.button
                      key={t.key}
                      type="button"
                      onClick={() => setActiveView(t.key)}
                      className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                        activeView === t.key
                          ? 'bg-gradient-to-r from-red-50 to-rose-50 text-red-800 font-bold'
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

        {/* RIGHT */}
        <div className="md:col-span-2">
          <AnimatedCard delay={0.05} hover={false}>
            <div className="p-8 min-h-[600px]">
              <AnimatePresence mode="wait">
                {!result ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center text-slate-400">
                    <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                      <Activity size={64} className="mb-4 opacity-20" />
                    </motion.div>
                    <p className="italic">Enter patient details and upload image to calculate risk.</p>
                  </motion.div>
                ) : (
                  <motion.div key={activeView} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.2 }} className="h-full">
                    {activeView === 'report' && (
                      <div className="h-full flex flex-col">
                        <div className="flex items-start justify-between gap-4 flex-wrap border-b pb-4 mb-5">
                          <div>
                            <h3 className="text-2xl font-bold text-slate-800">AI Risk Summary</h3>
                            <div className="text-sm text-slate-500 mt-1">Malignancy score with clinician-friendly context</div>
                          </div>
                          <div className={`px-4 py-2 rounded-2xl border font-black ${isMalignant ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'}`}>
                            <div className="text-xs uppercase font-bold tracking-wider">{isMalignant ? 'Malignant' : 'Benign'}</div>
                            <div className="text-lg mt-1">{diagnosis.toUpperCase()}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                          <div className="bg-white/70 border border-slate-200/60 rounded-2xl p-5">
                            <div className="flex items-center justify-between gap-3 mb-3">
                              <div>
                                <div className="text-xs uppercase font-bold tracking-wider text-slate-500">Malignancy probability</div>
                                <div className="text-3xl font-black text-slate-900 mt-1">{malignancyScore}%</div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-bold text-slate-600">{riskLabel}</div>
                                <div className="text-xs text-slate-500">Clinician correlation recommended</div>
                              </div>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-8 overflow-hidden shadow-inner">
                              <div className={`h-full w-full bg-gradient-to-r ${riskTone} opacity-30`} />
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${malignancyScore}%` }}
                                transition={{ duration: 1.2 }}
                                className={`absolute h-8 ${riskTone}`}
                                style={{ maxWidth: '100%' }}
                              />
                            </div>
                            <div className="mt-3 text-xs text-slate-500 flex justify-between font-bold">
                              <span>Low</span>
                              <span>Review</span>
                              <span>High</span>
                            </div>
                          </div>

                          <div className="bg-white/70 border border-slate-200/60 rounded-2xl p-5">
                            <div className="flex items-center gap-2">
                              <Info size={18} className="text-red-700" />
                              <div className="font-black text-slate-900">Clinical reasoning</div>
                            </div>
                            <p className="mt-3 text-sm text-slate-700 leading-relaxed">{skinContext[diagnosis] || 'Use this output as assistive context.'}</p>

                            <div className="mt-4 rounded-2xl border border-slate-200/60 bg-white/60 p-4">
                              <div className="text-xs uppercase font-bold tracking-wider text-slate-500 mb-2">ABCD rule</div>
                              <div className="space-y-2">
                                {abcTips.map((t) => (
                                  <div key={t.k} className="flex items-start gap-2">
                                    <div className="text-red-700 font-black">{t.k}</div>
                                    <div>
                                      <div className="text-sm font-bold text-slate-800">{t.title}</div>
                                      <div className="text-sm text-slate-600 leading-relaxed">{t.body}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeView === 'cleaned' && (
                      <div className="h-full">
                        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap border-b pb-4">
                          <h3 className="text-xl font-bold flex items-center gap-2 text-red-700">
                            <Scissors size={22} className="text-red-600" />
                            Hair Removal — Compare
                          </h3>
                          <div className="text-xs text-slate-500">Reveal improves feature clarity</div>
                        </div>

                        <CompareImage
                          baseSrc={`data:image/png;base64,${result.images.original}`}
                          overlaySrc={`data:image/png;base64,${result.images.cleaned}`}
                          baseLabel="Original"
                          overlayLabel="Cleaned"
                          split={cleanSplit}
                          onSplit={setCleanSplit}
                          accent="bg-red-500"
                        />

                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-sm text-slate-600 bg-white/70 border border-slate-200/60 p-4 rounded-xl">
                          <b>Why remove hair?</b> Hair strands can confuse the AI model. This step digitally removes confounding pixels for more accurate classification.
                        </motion.p>
                      </div>
                    )}

                    {activeView === 'segmented' && (
                      <div className="h-full flex flex-col">
                        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap border-b pb-4">
                          <h3 className="text-xl font-bold flex items-center gap-2 text-red-700">
                            <Scan size={22} className="text-red-600" />
                            Lesion Segmentation — Overlay
                          </h3>
                          <div className="text-xs text-slate-500">Slide opacity to inspect mask</div>
                        </div>

                        <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50">
                          <div className="relative w-full h-[420px]">
                            <img src={`data:image/png;base64,${result.images.original}`} alt="Original Lesion" className="w-full h-full object-cover" />
                            <motion.img
                              src={`data:image/png;base64,${result.images.segmented}`}
                              alt="Segmentation Mask"
                              className="absolute inset-0 w-full h-full object-cover"
                              style={{ opacity: maskOpacity }}
                              initial={false}
                              animate={{ opacity: maskOpacity }}
                            />
                            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                              <span className="px-3 py-1 rounded-full bg-white/80 border border-slate-200/70 text-xs font-bold text-slate-700">
                                Image
                              </span>
                              <span className="px-3 py-1 rounded-full bg-red-600/15 border border-red-400/25 text-xs font-bold text-red-900">
                                Mask
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="bg-white/70 border border-slate-200/60 rounded-2xl p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-bold text-slate-700">Mask opacity</div>
                              <div className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                {Math.round(maskOpacity * 100)}%
                              </div>
                            </div>
                            <input
                              type="range"
                              min={0.1}
                              max={1}
                              step={0.05}
                              value={maskOpacity}
                              onChange={(e) => setMaskOpacity(Number(e.target.value))}
                              className="mt-3 w-full accent-red-600"
                            />
                          </div>
                          <div className="bg-white/70 border border-slate-200/60 rounded-2xl p-4">
                            <div className="flex items-start gap-3">
                              <AlertTriangle className="text-red-700" size={18} />
                              <div>
                                <div className="font-bold text-slate-900">Segmentation hint</div>
                                <div className="text-sm text-slate-600 leading-relaxed mt-1">
                                  Use the mask boundary to verify lesion edges, then apply clinical ABCD reasoning.
                                </div>
                              </div>
                            </div>
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

