import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// Landing page (public). This project does not support booking/calls.
export default function HospitalLanding({ onNavigate, brainIcon }) {
  const departments = useMemo(
    () => [
      {
        id: 'chest',
        title: 'Chest X-Ray',
        desc: 'Pneumonia and common thoracic findings with confidence indicators.',
        icon: <i className="bi bi-stethoscope text-cyan-600" style={{ fontSize: '34px' }} />,
        gradient: 'bg-cyan-500/20',
        dot: 'bg-cyan-500',
      },
      {
        id: 'skin',
        title: 'Skin Lesion',
        desc: 'Risk assessment with metadata-aware visual analysis.',
        icon: <i className="bi bi-droplet-half text-rose-600" style={{ fontSize: '34px' }} />,
        gradient: 'bg-rose-500/20',
        dot: 'bg-rose-500',
      },
      {
        id: 'brain',
        title: 'Brain MRI',
        desc: 'Tumor segmentation with explainable views and confidence.',
        icon: brainIcon ? <span className="text-sky-600" style={{ fontSize: '34px' }}>{brainIcon}</span> : <i className="bi bi-brain text-sky-600" style={{ fontSize: '34px' }} />,
        gradient: 'bg-sky-500/20',
        dot: 'bg-sky-500',
      },
      {
        id: 'eye',
        title: 'Retinal Scan',
        desc: 'Diabetic retinopathy staging with risk cues and explainable overlays.',
        icon: <i className="bi bi-eye text-amber-600" style={{ fontSize: '34px' }} />,
        gradient: 'bg-amber-500/20',
        dot: 'bg-amber-500',
      },
      {
        id: 'sepsis',
        title: 'Sepsis Risk (ICU)',
        desc: 'Early warning from vitals and labs using ensemble LSTM, XGBoost, and Random Forest.',
        icon: <i className="bi bi-virus text-orange-600" style={{ fontSize: '34px' }} />,
        gradient: 'bg-orange-500/20',
        dot: 'bg-orange-500',
      },
    ],
    [brainIcon]
  );

  const heroBadges = useMemo(
    () => [
      { icon: <i className="bi bi-shield-lock-fill" style={{ fontSize: '16px' }} />, text: 'Secure workflows' },
      { icon: <i className="bi bi-stars" style={{ fontSize: '16px' }} />, text: 'AI-assisted analysis' },
      { icon: <i className="bi bi-info-circle-fill" style={{ fontSize: '16px' }} />, text: 'Explainable visual views' },
    ],
    []
  );

  return (
    <div className="relative">
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-24 -left-24 w-72 h-72 rounded-full blur-3xl bg-fuchsia-500/30"
          animate={{ x: [0, 24, 0], y: [0, 10, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-16 -right-28 w-80 h-80 rounded-full blur-3xl bg-indigo-300/25"
          animate={{ x: [0, -18, 0], y: [0, -12, 0] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full blur-3xl bg-purple-500/20"
          animate={{ x: [0, 16, 0], y: [0, -8, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="p-8 max-w-7xl mx-auto">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative mb-10"
        >
          <div className="flex flex-col lg:flex-row lg:items-center gap-8">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white border border-blue-200 shadow-sm">
                <i className="bi bi-lightning-charge-fill text-blue-600" style={{ fontSize: '14px' }} />
                <span className="text-sm font-bold text-slate-900">MedAI Pro • AI Diagnostics</span>
              </div>

              <h1 className="mt-4 text-4xl sm:text-5xl font-black leading-tight text-slate-900">
                Vibrant, clinician-ready{' '}
                <span className="bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-500 bg-clip-text text-transparent">
                  hospital-grade design
                </span>
              </h1>
              <p className="mt-4 text-lg text-slate-800 font-medium leading-relaxed">
                Upload a scan for chest, brain, eye, and skin—or enter ICU vitals for sepsis risk—with confidence scores and explainable views.
              </p>

              <div className="mt-7 flex flex-col sm:flex-row gap-3">
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 py-3 rounded-xl font-bold text-white shadow-md transition-all bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                  onClick={() => {
                    const el =
                      typeof document !== 'undefined' ? document.getElementById('departments') : null;
                    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                >
                  Explore Departments
                </motion.button>
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 py-3 rounded-xl font-bold text-slate-900 shadow-sm transition-all border border-blue-200 bg-white hover:bg-blue-50"
                  onClick={() => onNavigate('history')}
                >
                  Patient History
                </motion.button>
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                {heroBadges.map((b) => (
                  <motion.div
                    key={b.text}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '30px' }}
                    transition={{ duration: 0.35 }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-blue-100"
                  >
                    <span className="text-blue-600">{b.icon}</span>
                    <span className="text-sm font-bold text-slate-900">{b.text}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="w-full lg:w-[420px]">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '40px' }}
                transition={{ duration: 0.6 }}
                className="bg-white border border-blue-100 rounded-3xl shadow-lg overflow-hidden"
              >
                <div className="p-5 border-b border-blue-100/60">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 text-white shadow">
                      <i className="bi bi-stars" style={{ fontSize: '20px' }} />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">Live Safety Brief</div>
                      <div className="text-sm text-slate-500">AI outputs are assistive, not a diagnosis.</div>
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {[
                    { icon: 'Check', title: 'Designed for review', body: 'Clear sections, confidence cues, and visual context.' },
                    { icon: 'Info', title: 'Decision support', body: 'Always correlate with clinical history and professional judgment.' },
                    { icon: 'Alert', title: 'Demo UI', body: 'This frontend showcases UX; it does not replace clinical workflows.' },
                  ].map((item, idx) => (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.35, delay: idx * 0.04 }}
                      className="flex items-start gap-3"
                    >
                    <div className="p-2 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 font-bold">✓</div>
                      <div className="text-sm text-slate-800 leading-relaxed">
                        <span className="font-bold text-slate-900 block">{item.title}</span>
                        <span className="text-slate-700">{item.body}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="px-5 py-4 border-t border-blue-100 bg-blue-50">
                  <div className="text-sm font-bold text-slate-900">
                    Choose a module from the Departments section.
                  </div>
                  <div className="mt-3 text-xs text-slate-800 leading-relaxed">
                    Chest and Retinal Scan appear once, so they won’t overpower Skin or Brain.
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Departments */}
        <section id="departments" className="mb-10">
          <div className="flex items-end justify-between gap-4 flex-wrap mb-5">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Departments</h2>
              <p className="text-slate-800 font-medium mt-1">Imaging modules plus ICU sepsis risk from clinical inputs.</p>
            </div>
            <div className="text-sm text-slate-700 font-medium">Vibrant, complementary colors + interactive animations.</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((d, idx) => (
              <motion.button
                key={d.id}
                onClick={() => onNavigate(d.id)}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '60px' }}
                transition={{ duration: 0.5, delay: idx * 0.06 }}
                className="text-left bg-white border border-blue-100/70 rounded-3xl p-5 shadow-md hover:shadow-lg transition-all overflow-hidden relative"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${d.gradient} opacity-50`} />
                <div className="relative">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-3.5 h-3.5 rounded-full ${d.dot} shadow-md`} aria-hidden="true" />
                      {d.icon}
                    </div>
                    <div className="px-3 py-1 rounded-full bg-blue-100 border border-blue-200 text-xs font-bold text-blue-900">
                      Open
                    </div>
                  </div>
                  <div className="mt-4 font-black text-slate-900 text-lg">{d.title}</div>
                  <div className="mt-2 text-sm text-slate-800 leading-relaxed font-medium">{d.desc}</div>
                  <div className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-blue-700">
                    <span>View Module</span>
                    <span aria-hidden="true" className="text-slate-400">
                      →
                    </span>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-10">
          <div className="mb-4">
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900">FAQ</h3>
            <p className="text-slate-800 font-medium mt-1">Fast answers with a hospital-style layout.</p>
          </div>

          <FaqItem
            q="Is this a replacement for clinical diagnosis?"
            a="No. MedAI is assistive and meant to support clinical decision-making. Always correlate with patient history and professional judgment."
            defaultOpen
          />
          <div className="mt-4">
            <FaqItem
              q="Do the modules provide confidence information?"
              a="Yes. Each module surfaces confidence cues and multiple views to help interpret findings more clearly."
            />
          </div>
          <div className="mt-4">
            <FaqItem
              q="What makes the UI hospital-grade?"
              a="Consistent typography, clean information hierarchy, responsive layouts, and interactive animations that guide the user."
            />
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-12 border-t border-slate-200/60 pt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-600 to-indigo-600 text-white shadow">
                  <i className="bi bi-stethoscope" style={{ fontSize: '20px' }} />
                </div>
                <div>
                  <div className="font-black text-slate-900 text-lg">MedAI Pro</div>
                  <div className="text-sm text-slate-500">Advanced Diagnostics</div>
                </div>
              </div>
              <p className="text-sm text-slate-600 mt-3 leading-relaxed">
                A vibrant hospital-style frontend for AI-assisted medical imaging workflows.
              </p>
            </div>

            <div className="bg-white/70 backdrop-blur-md border border-slate-200/60 rounded-2xl p-5">
              <div className="font-bold text-slate-900 mb-3">Quick Actions</div>
              <div className="space-y-2">
                <button
                  onClick={() => onNavigate('history')}
                  className="w-full text-left px-4 py-3 rounded-xl border border-slate-200/70 bg-white/80 hover:bg-white transition-colors font-bold text-slate-800"
                >
                  Review Patient History
                </button>
              </div>
              <div className="mt-4 text-xs text-slate-500">Built with React + Tailwind + Framer Motion.</div>
            </div>
          </div>

          <div className="mt-7 text-xs text-slate-500">
            © {new Date().getFullYear()} MedAI Pro. This UI is for demonstration purposes and includes assistive AI messaging.
          </div>
        </footer>
      </div>
    </div>
  );
}

function FaqItem({ q, a, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/70 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-5 py-4 flex items-center justify-between gap-3 hover:bg-white/80 transition-colors"
      >
        <div className="font-bold text-slate-900">{q}</div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <span aria-hidden="true" className="text-slate-600">
            ⌄
          </span>
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-5 pb-5 pt-0 text-sm text-slate-600 leading-relaxed">{a}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

