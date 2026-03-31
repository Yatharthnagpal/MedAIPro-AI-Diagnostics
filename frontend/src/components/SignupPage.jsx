import React, { useState } from 'react';
import { motion } from 'framer-motion';
import LoadingSpinner from './LoadingSpinner';
import { signup } from '../api';

export default function SignupPage({ addToast, onSuccess, onSwitchToLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = email.trim().includes('@') && password.length >= 8 && password === confirm;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await signup(email, password);
      addToast('Account created. Welcome!', 'success');
      onSuccess();
    } catch {
      addToast('Signup failed. Try a different email.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center w-full h-screen"
      style={{ background: 'linear-gradient(135deg, #e0dce6 0%, #d5d0dc 50%, #cac4d4 100%)' }}>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative w-[92%] max-w-[960px] h-[85vh] max-h-[600px] rounded-3xl overflow-hidden shadow-2xl flex"
      >
        {/* Left — Purple branded section */}
        <div className="relative w-[45%] hidden md:flex flex-col justify-between p-10 z-10"
          style={{ backgroundColor: '#8B7FA8' }}>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
              <i className="bi bi-heart-pulse-fill text-white" style={{ fontSize: 13 }} />
            </div>
            <span className="text-sm font-semibold text-white/90 tracking-wide">MedAI Pro</span>
          </div>

          <div>
            <h1 className="text-3xl font-extrabold text-white leading-snug">
              We're so glad<br />to have you<br />on board!
            </h1>
            <p className="mt-3 text-white/70 text-sm leading-relaxed max-w-[240px]">
              Join doctors worldwide using AI-powered diagnostics to detect diseases faster.
            </p>
          </div>

          <div className="flex gap-2">
            {[0.3, 0.5, 0.7, 1].map((op, i) => (
              <div key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: `rgba(255,255,255,${op})` }} />
            ))}
          </div>
        </div>

        {/* Curved divider */}
        <svg
          className="absolute top-0 bottom-0 hidden md:block z-20"
          style={{ left: '38%' }}
          width="140" height="100%" viewBox="0 0 140 600" preserveAspectRatio="none"
        >
          <path d="M140,0 L140,600 L0,600 C70,480 90,360 70,300 C50,240 80,120 0,0 Z" fill="#F5F0E1" />
        </svg>

        {/* Right — Cream form section */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 sm:px-14 z-10"
          style={{ backgroundColor: '#F5F0E1' }}>

          <div className="w-full max-w-[320px]">
            <h2 className="text-lg font-bold text-slate-700 text-center mb-6">Sign Up</h2>

            <div className="flex justify-center mb-6">
              <div className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#d4c9b8' }}>
                <i className="bi bi-person-fill text-white" style={{ fontSize: 26 }} />
              </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  type="text"
                  autoComplete="name"
                  placeholder="Name"
                  className="w-full pb-2 bg-transparent border-b border-slate-400/50 text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:border-slate-600 transition"
                />
              </div>

              <div>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                  placeholder="E-mail address"
                  className="w-full pb-2 bg-transparent border-b border-slate-400/50 text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:border-slate-600 transition"
                />
              </div>

              <div>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  autoComplete="new-password"
                  placeholder="Password"
                  className="w-full pb-2 bg-transparent border-b border-slate-400/50 text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:border-slate-600 transition"
                />
              </div>

              <div>
                <input
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  type="password"
                  autoComplete="new-password"
                  placeholder="Confirm Password"
                  className="w-full pb-2 bg-transparent border-b border-slate-400/50 text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:border-slate-600 transition"
                />
              </div>

              <div className="flex items-center justify-between pt-3">
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  className="text-xs text-slate-500 hover:text-slate-700 transition"
                >
                  Already signed up?{' '}
                  <span className="font-semibold underline">Sign in</span>
                </button>

                <button
                  type="submit"
                  disabled={!canSubmit || submitting}
                  className="px-6 py-2 rounded-md text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-95"
                  style={{ backgroundColor: '#5a4f72' }}
                >
                  {submitting ? <LoadingSpinner size="sm" text="" /> : 'Complete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
