import React, { useState } from 'react';
import { motion } from 'framer-motion';
import LoadingSpinner from './LoadingSpinner';
import { login } from '../api';

export default function LoginPage({ addToast, onSuccess, onSwitchToSignup }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = email.trim().includes('@') && password.length >= 1;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await login(email, password);
      addToast('Logged in successfully', 'success');
      onSuccess();
    } catch {
      addToast('Login failed. Check your email/password.', 'error');
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
        {/* Left — Cream form section */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 sm:px-14 z-10"
          style={{ backgroundColor: '#F5F0E1' }}>

          <div className="w-full max-w-[320px]">
            <h2 className="text-lg font-bold text-slate-700 text-center mb-8">Sign In</h2>

            <form onSubmit={onSubmit} className="space-y-6">
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
                  autoComplete="current-password"
                  placeholder="Password"
                  className="w-full pb-2 bg-transparent border-b border-slate-400/50 text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:border-slate-600 transition"
                />
              </div>

              <div className="flex items-center justify-between pt-3">
                <button
                  type="button"
                  onClick={onSwitchToSignup}
                  className="text-xs text-slate-500 hover:text-slate-700 transition"
                >
                  No account?{' '}
                  <span className="font-semibold underline">Sign up</span>
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

        {/* Curved divider — mirrored */}
        <svg
          className="absolute top-0 bottom-0 hidden md:block z-20"
          style={{ right: '38%' }}
          width="140" height="100%" viewBox="0 0 140 600" preserveAspectRatio="none"
        >
          <path d="M0,0 L0,600 L140,600 C70,480 50,360 70,300 C90,240 60,120 140,0 Z" fill="#F5F0E1" />
        </svg>

        {/* Right — Purple branded section */}
        <div className="relative w-[45%] hidden md:flex flex-col justify-between p-10 z-10"
          style={{ backgroundColor: '#8B7FA8' }}>

          <div className="flex items-center gap-2 justify-end">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
              <i className="bi bi-heart-pulse-fill text-white" style={{ fontSize: 13 }} />
            </div>
            <span className="text-sm font-semibold text-white/90 tracking-wide">MedAI Pro</span>
          </div>

          <div className="text-right">
            <h1 className="text-3xl font-extrabold text-white leading-snug">
              Welcome<br />back!
            </h1>
            <p className="mt-3 text-white/70 text-sm leading-relaxed">
              Pick up where you left off
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            {[0.3, 0.5, 0.7, 1].map((op, i) => (
              <div key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: `rgba(255,255,255,${op})` }} />
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
