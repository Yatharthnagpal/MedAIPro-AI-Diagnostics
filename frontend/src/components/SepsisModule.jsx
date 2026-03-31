import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { analyzeSepsis } from '../api';
import LoadingSpinner from './LoadingSpinner';
import AnimatedCard from './AnimatedCard';
import { saveRecord } from '../historyStore';

const riskContext = {
  Critical: 'Extremely high probability of sepsis onset within the next 6 hours. Immediate clinical intervention recommended.',
  High: 'Elevated risk indicators detected. Closely monitor vitals and consider early intervention protocols.',
  Moderate: 'Some concerning patterns present. Continue regular monitoring and reassess within the hour.',
  Low: 'Vital signs within acceptable parameters. Continue standard monitoring protocols.',
};

const VITAL_FIELDS = [
  { key: 'HR', label: 'Heart Rate', unit: 'bpm', min: 30, max: 250, step: 1, default: 80, icon: 'bi-heart-pulse-fill' },
  { key: 'O2Sat', label: 'SpO2', unit: '%', min: 50, max: 100, step: 0.1, default: 97, icon: 'bi-droplet-fill' },
  { key: 'Temp', label: 'Temperature', unit: '\u00b0C', min: 33, max: 42, step: 0.1, default: 37.0, icon: 'bi-thermometer-half' },
  { key: 'SBP', label: 'Systolic BP', unit: 'mmHg', min: 50, max: 250, step: 1, default: 120, icon: 'bi-arrow-up-circle-fill' },
  { key: 'MAP', label: 'Mean Arterial Pressure', unit: 'mmHg', min: 30, max: 200, step: 1, default: 80, icon: 'bi-circle-fill' },
  { key: 'Resp', label: 'Respiratory Rate', unit: '/min', min: 5, max: 60, step: 1, default: 18, icon: 'bi-lungs-fill' },
];

const LAB_FIELDS = [
  { key: 'WBC', label: 'White Blood Cells', unit: '10^3/uL', default: '', icon: 'bi-shield-plus' },
  { key: 'Platelets', label: 'Platelets', unit: '10^3/uL', default: '', icon: 'bi-bullseye' },
  { key: 'Creatinine', label: 'Creatinine', unit: 'mg/dL', default: '', icon: 'bi-funnel-fill' },
  { key: 'Bilirubin_total', label: 'Bilirubin', unit: 'mg/dL', default: '', icon: 'bi-circle-half' },
  { key: 'Lactate', label: 'Lactate', unit: 'mmol/L', default: '', icon: 'bi-lightning-charge' },
  { key: 'BUN', label: 'BUN', unit: 'mg/dL', default: '', icon: 'bi-moisture' },
  { key: 'pH', label: 'Blood pH', unit: '', default: '', icon: 'bi-water' },
  { key: 'FiO2', label: 'FiO2', unit: '', default: '', icon: 'bi-wind' },
];

function RiskGauge({ value, level }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  const color = level === 'Critical' ? '#ef4444' : level === 'High' ? '#f59e0b' : level === 'Moderate' ? '#3b82f6' : '#22c55e';
  return (
    <div className="flex items-center justify-center">
      <div
        className="relative w-44 h-44 rounded-full"
        style={{ background: `conic-gradient(from 180deg, ${color} 0 ${v}%, rgba(148,163,184,0.20) ${v}% 100%)` }}
      >
        <div className="absolute inset-3 rounded-full bg-white/90 backdrop-blur-sm border border-slate-200/60 flex items-center justify-center">
          <div className="text-center">
            <div className="text-3xl font-black" style={{ color }}>{v}%</div>
            <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Risk Score</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContributionBar({ label, value, color }) {
  return (
    <div>
      <div className="flex justify-between text-xs font-bold mb-1">
        <span className="text-slate-700">{label}</span>
        <span style={{ color }}>{value}%</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(value, 100)}%` }}
          transition={{ duration: 0.8 }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
    </div>
  );
}

export default function SepsisModule({ addToast }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [activeView, setActiveView] = useState('report');

  const [patientName, setPatientName] = useState('Anonymous');
  const [age, setAge] = useState(60);
  const [gender, setGender] = useState(0);
  const [iculos, setIculos] = useState(1);

  const initialVitals = {};
  VITAL_FIELDS.forEach(f => { initialVitals[f.key] = f.default; });
  const [vitals, setVitals] = useState(initialVitals);

  const initialLabs = {};
  LAB_FIELDS.forEach(f => { initialLabs[f.key] = f.default; });
  const [labs, setLabs] = useState(initialLabs);

  const updateVital = (key, val) => setVitals(prev => ({ ...prev, [key]: val }));
  const updateLab = (key, val) => setLabs(prev => ({ ...prev, [key]: val }));

  const handleAnalyze = async () => {
    setLoading(true);
    setResult(null);
    setActiveView('report');
    try {
      const payload = {
        ...vitals,
        Age: Number(age),
        Gender: Number(gender),
        ICULOS: Number(iculos),
      };
      LAB_FIELDS.forEach(f => {
        const v = labs[f.key];
        payload[f.key] = v !== '' && v !== null && v !== undefined ? Number(v) : null;
      });
      const data = await analyzeSepsis(payload);
      setResult(data.data);
      addToast('Sepsis risk assessment completed', 'success');
      saveRecord({
        module: 'sepsis',
        patientName,
        inputs: { age, gender, iculos, ...vitals, ...labs },
        result: { risk_score: data.data?.risk_score, risk_level: data.data?.risk_level, alarm: data.data?.alarm, shock_index: data.data?.shock_index },
        imageFile: null,
      });
    } catch {
      addToast('Analysis failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const riskLevel = result?.risk_level ?? '';
  const riskScore = Number(result?.risk_score ?? 0);
  const alarm = result?.alarm ?? false;
  const shockIndex = result?.shock_index ?? 0;
  const contributions = result?.contributions ?? {};

  const riskColor = riskLevel === 'Critical' ? 'red' : riskLevel === 'High' ? 'amber' : riskLevel === 'Moderate' ? 'blue' : 'green';
  const riskGradient = {
    Critical: 'from-red-500 to-rose-600',
    High: 'from-amber-500 to-orange-500',
    Moderate: 'from-blue-500 to-cyan-500',
    Low: 'from-green-500 to-emerald-500',
  }[riskLevel] || 'from-green-500 to-emerald-500';

  const clinicalTips = useMemo(() => {
    const base = [
      'Always correlate AI risk scores with bedside clinical assessment.',
      'Sepsis management follows the Surviving Sepsis Campaign guidelines.',
    ];
    if (riskLevel === 'Critical') return ['Initiate sepsis bundle (antibiotics, lactate, cultures) immediately.', 'Consider vasopressor support if MAP < 65 mmHg.', ...base];
    if (riskLevel === 'High') return ['Obtain blood cultures and consider empiric antibiotics.', 'Monitor lactate levels and urine output closely.', ...base];
    if (riskLevel === 'Moderate') return ['Increase monitoring frequency to every 30 minutes.', 'Repeat labs in 2-4 hours to assess trend.', ...base];
    return ['Continue standard ICU monitoring protocols.', ...base];
  }, [riskLevel]);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <motion.div
            whileHover={{ rotate: 360, scale: 1.05 }}
            transition={{ duration: 0.6 }}
            className="p-4 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl shadow-md"
          >
            <i className="bi bi-virus text-white" style={{ fontSize: '36px' }} />
          </motion.div>
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-slate-900">Sepsis Early Warning</h2>
            <p className="text-slate-800 font-medium">Hybrid LSTM + XGBoost + RandomForest Ensemble</p>
          </div>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`px-4 py-2 rounded-2xl border font-black ${
                alarm ? 'bg-red-50 border-red-300 text-red-800 animate-pulse' : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <div className="text-xs uppercase font-bold tracking-wider">{alarm ? 'ALARM' : 'Status'}</div>
              <div className={`text-lg font-black bg-gradient-to-r ${riskGradient} bg-clip-text text-transparent`}>{riskLevel} Risk</div>
            </motion.div>
          )}
        </div>
      </motion.div>

      <div className="mb-8 flex items-start gap-3 rounded-2xl border border-orange-200/60 bg-orange-50 p-4">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-white shadow">
          <i className="bi bi-shield-lock-fill" style={{ fontSize: '18px' }} />
        </div>
        <div className="text-sm text-slate-900 font-medium leading-relaxed">
          <span className="font-bold">Clinical Notice:</span> This tool predicts sepsis risk 6 hours ahead. AI scores are assistive and must be correlated with clinical judgment.
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <AnimatedCard delay={0.02}>
            <div className="p-6">
              <h3 className="font-bold text-slate-700 mb-4 border-b pb-3 flex items-center gap-2">
                <i className="bi bi-person-fill" style={{ fontSize: '18px' }} />
                Patient Info
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500 uppercase font-bold mb-1 block">Name</label>
                  <input type="text" value={patientName} onChange={e => setPatientName(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-500/40 text-sm" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 uppercase font-bold mb-1 block">Age</label>
                    <input type="number" value={age} onChange={e => setAge(e.target.value)} min="0" max="120"
                      className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-500/40 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 uppercase font-bold mb-1 block">Sex</label>
                    <select value={gender} onChange={e => setGender(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-500/40 text-sm">
                      <option value={0}>Female</option>
                      <option value={1}>Male</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 uppercase font-bold mb-1 block">ICU hrs</label>
                    <input type="number" value={iculos} onChange={e => setIculos(e.target.value)} min="1" max="500"
                      className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-500/40 text-sm" />
                  </div>
                </div>
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard delay={0.04}>
            <div className="p-6">
              <h3 className="font-bold text-slate-700 mb-4 border-b pb-3 flex items-center gap-2">
                <i className="bi bi-heart-pulse-fill text-red-500" style={{ fontSize: '18px' }} />
                Vital Signs
              </h3>
              <div className="space-y-3">
                {VITAL_FIELDS.map(f => (
                  <div key={f.key}>
                    <label className="text-xs text-slate-500 uppercase font-bold mb-1 flex items-center gap-1.5">
                      <i className={`bi ${f.icon}`} style={{ fontSize: '12px' }} />
                      {f.label} <span className="text-slate-400">({f.unit})</span>
                    </label>
                    <input type="number" value={vitals[f.key]} onChange={e => updateVital(f.key, Number(e.target.value))}
                      min={f.min} max={f.max} step={f.step}
                      className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-500/40 text-sm" />
                  </div>
                ))}
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard delay={0.06}>
            <div className="p-6">
              <h3 className="font-bold text-slate-700 mb-4 border-b pb-3 flex items-center gap-2">
                <i className="bi bi-clipboard2-pulse-fill text-orange-500" style={{ fontSize: '18px' }} />
                Lab Values <span className="text-xs text-slate-400 font-normal">(optional)</span>
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {LAB_FIELDS.map(f => (
                  <div key={f.key}>
                    <label className="text-xs text-slate-500 uppercase font-bold mb-1 flex items-center gap-1">
                      <i className={`bi ${f.icon}`} style={{ fontSize: '11px' }} />
                      {f.label}
                    </label>
                    <input type="number" value={labs[f.key]} onChange={e => updateLab(f.key, e.target.value)}
                      placeholder="--" step="any"
                      className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-500/40 text-sm" />
                  </div>
                ))}
              </div>
            </div>
          </AnimatedCard>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleAnalyze}
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white py-4 rounded-lg font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
          >
            {loading ? (
              <><LoadingSpinner size="sm" text="" /><span>Analyzing Risk...</span></>
            ) : (
              <><i className="bi bi-play-fill" style={{ fontSize: '20px' }} /><span>Predict Sepsis Risk</span></>
            )}
          </motion.button>

          {result && (
            <AnimatedCard delay={0.1} hover={false}>
              <div className="p-2">
                <div className="text-xs font-semibold text-slate-500 uppercase px-4 py-2">Result views</div>
                <div className="overflow-hidden rounded-xl mx-2 mb-2 border border-slate-200/60">
                  {[
                    { key: 'report', label: 'Risk Report', icon: <i className="bi bi-file-medical-fill" style={{ fontSize: '18px' }} /> },
                    { key: 'ensemble', label: 'Model Breakdown', icon: <i className="bi bi-diagram-3-fill" style={{ fontSize: '18px' }} /> },
                  ].map((t, idx) => (
                    <motion.button key={t.key} type="button" onClick={() => setActiveView(t.key)}
                      className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                        activeView === t.key ? 'bg-gradient-to-r from-orange-50 to-red-50 text-orange-800 font-bold' : 'hover:bg-slate-50 text-slate-600'
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
                      <i className="bi bi-virus text-slate-400 mb-4 opacity-20" style={{ fontSize: '64px' }} />
                    </motion.div>
                    <p className="italic">Enter patient vitals to assess sepsis risk.</p>
                  </motion.div>
                ) : (
                  <motion.div key={activeView} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.25 }} className="h-full">
                    {activeView === 'report' && (
                      <div className="h-full flex flex-col">
                        <div className="flex items-start justify-between gap-4 flex-wrap mb-5 border-b pb-4">
                          <div>
                            <h3 className="text-2xl font-bold text-slate-800">Risk Assessment</h3>
                            <div className="text-sm text-slate-500 mt-1">6-hour early warning prediction</div>
                          </div>
                          <div className={`px-4 py-2 rounded-2xl border font-black ${
                            alarm ? 'bg-red-100 border-red-300 text-red-900 animate-pulse' : `bg-${riskColor}-50 border-${riskColor}-200 text-${riskColor}-900`
                          }`}>
                            <div className="text-xs uppercase font-bold tracking-wider">{alarm ? 'SEPSIS ALARM' : 'Risk Level'}</div>
                            <div className="text-lg">{riskLevel}</div>
                          </div>
                        </div>

                        {alarm && (
                          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                            className="mb-5 flex items-center gap-3 rounded-2xl border-2 border-red-400 bg-red-50 p-4">
                            <div className="p-3 rounded-xl bg-red-500 text-white shadow animate-pulse">
                              <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: '24px' }} />
                            </div>
                            <div>
                              <div className="font-black text-red-900 text-lg">Sepsis Alert Triggered</div>
                              <div className="text-sm text-red-800">Physics engine pressure exceeded threshold. Immediate clinical review recommended.</div>
                            </div>
                          </motion.div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                          <div className="bg-white/70 backdrop-blur-md border border-slate-200/60 rounded-2xl p-5">
                            <RiskGauge value={riskScore} level={riskLevel} />
                            <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60">
                                <div className="text-xs text-slate-500 uppercase font-bold">Shock Index</div>
                                <div className={`text-xl font-black ${shockIndex > 0.85 ? 'text-red-700' : 'text-slate-900'}`}>{shockIndex}</div>
                              </div>
                              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60">
                                <div className="text-xs text-slate-500 uppercase font-bold">Pressure</div>
                                <div className="text-xl font-black text-slate-900">{result?.pressure ?? 0}</div>
                              </div>
                            </div>
                          </div>

                          <div className="bg-white/70 backdrop-blur-md border border-slate-200/60 rounded-2xl p-5">
                            <div className="flex items-center gap-2 mb-3">
                              <i className="bi bi-info-circle-fill text-orange-700" style={{ fontSize: '18px' }} />
                              <div className="font-black text-slate-900">Clinical Guidance</div>
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed mb-4">{riskContext[riskLevel] || 'Continue monitoring.'}</p>
                            <div className="text-xs uppercase font-bold tracking-wider text-slate-500 mb-2">Recommended Actions</div>
                            <ul className="space-y-2 text-sm text-slate-700">
                              {clinicalTips.map((t, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-orange-700 font-black mt-0.5">&bull;</span>
                                  <span className="leading-relaxed">{t}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeView === 'ensemble' && (
                      <div className="h-full flex flex-col">
                        <div className="flex items-center justify-between gap-3 mb-5 border-b pb-4">
                          <h3 className="text-xl font-bold flex items-center gap-2 text-orange-700">
                            <i className="bi bi-diagram-3-fill" style={{ fontSize: '22px' }} />
                            Ensemble Model Breakdown
                          </h3>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                          {[
                            { name: 'LSTM', weight: '74%', desc: 'Temporal patterns over 50h', value: contributions.lstm, color: '#8b5cf6' },
                            { name: 'XGBoost', weight: '5%', desc: 'Current-state tree boosting', value: contributions.xgb, color: '#f59e0b' },
                            { name: 'Random Forest', weight: '21%', desc: 'Balanced ensemble trees', value: contributions.rf, color: '#22c55e' },
                          ].map(m => (
                            <motion.div key={m.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                              className="bg-white/70 border border-slate-200/60 rounded-2xl p-5">
                              <div className="flex items-center justify-between mb-2">
                                <div className="font-black text-slate-900">{m.name}</div>
                                <div className="text-xs px-2 py-1 rounded-full font-bold border" style={{ borderColor: m.color, color: m.color }}>{m.weight}</div>
                              </div>
                              <div className="text-xs text-slate-500 mb-3">{m.desc}</div>
                              <div className="text-2xl font-black" style={{ color: m.color }}>{m.value ?? 0}%</div>
                              <div className="mt-2 w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(m.value ?? 0, 100)}%` }}
                                  transition={{ duration: 0.8 }} className="h-full rounded-full" style={{ background: m.color }} />
                              </div>
                            </motion.div>
                          ))}
                        </div>

                        <div className="bg-white/70 border border-slate-200/60 rounded-2xl p-5">
                          <div className="font-black text-slate-900 mb-4">Final Weighted Score</div>
                          <ContributionBar label="LSTM (74%)" value={contributions.lstm ?? 0} color="#8b5cf6" />
                          <div className="mt-3"><ContributionBar label="XGBoost (5%)" value={contributions.xgb ?? 0} color="#f59e0b" /></div>
                          <div className="mt-3"><ContributionBar label="Random Forest (21%)" value={contributions.rf ?? 0} color="#22c55e" /></div>
                          <div className="mt-5 pt-4 border-t border-slate-200/60 flex items-center justify-between">
                            <div className="font-black text-slate-900">Combined Risk</div>
                            <div className={`text-2xl font-black bg-gradient-to-r ${riskGradient} bg-clip-text text-transparent`}>{riskScore}%</div>
                          </div>
                        </div>

                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          className="mt-4 text-sm text-slate-600 bg-white/70 border border-slate-200/60 p-4 rounded-xl">
                          <b>How it works:</b> The LSTM processes temporal patterns in vitals, while tree models assess the current snapshot.
                          A physics-based CUSUM engine then applies adaptive thresholding to trigger alarms.
                        </motion.p>
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
