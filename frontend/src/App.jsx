import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ChestModule from './components/ChestModule';
import BrainModule from './components/BrainModule';
import EyeModule from './components/EyeModule';
import SkinModule from './components/SkinModule';
import SepsisModule from './components/SepsisModule';
import HistoryModule from './components/HistoryModule';
import { ToastContainer } from './components/Toast';
import HospitalLanding from './components/HospitalLanding';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import { logout, me } from './api';

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [authStatus, setAuthStatus] = useState('checking'); // checking | authenticated | unauthenticated
  const [user, setUser] = useState(null);

  // Random brain icon for Brain MRI module
  const brainIcon = useMemo(() => {
    const icons = [
      <i className="bi bi-brain text-white" style={{ fontSize: '20px' }} />,
      <i className="bi bi-lightning-charge-fill text-white" style={{ fontSize: '20px' }} />,
      <i className="bi bi-cpu text-white" style={{ fontSize: '20px' }} />,
      <i className="bi bi-gear-fill text-white" style={{ fontSize: '20px' }} />,
      <i className="bi bi-shield-check text-white" style={{ fontSize: '20px' }} />,
    ];
    return icons[Math.floor(Math.random() * icons.length)];
  }, []);

  const addToast = (message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const handleAuthSuccess = async () => {
    try {
      const data = await me();
      setUser(data?.user ?? null);
      setAuthStatus('authenticated');
      setActiveTab('home');
    } catch {
      setUser(null);
      setAuthStatus('unauthenticated');
      setActiveTab('login');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // ignore; cookie may already be cleared
    } finally {
      setUser(null);
      setAuthStatus('unauthenticated');
      setActiveTab('login');
      addToast('Logged out', 'info');
    }
  };

  // Validate auth cookie on load.
  React.useEffect(() => {
    me()
      .then((data) => {
        setUser(data?.user ?? null);
        setAuthStatus('authenticated');
      })
      .catch(() => {
        setUser(null);
        setAuthStatus('unauthenticated');
        setActiveTab('login');
      });
  }, []);

  // React to backend 401 responses.
  React.useEffect(() => {
    const handler = () => {
      setUser(null);
      setAuthStatus('unauthenticated');
      setActiveTab('login');
      const id = Date.now();
      setToasts((prev) => [
        ...prev,
        { id, message: 'Session expired. Please login again.', type: 'warning', duration: 3500 },
      ]);
    };
    window.addEventListener('medai:unauthorized', handler);
    return () => window.removeEventListener('medai:unauthorized', handler);
  }, []);

  const renderContent = () => {
    switch(activeTab) {
      case 'home':
        return <HospitalLanding onNavigate={setActiveTab} addToast={addToast} brainIcon={brainIcon} />;
      case 'chest': return <ChestModule addToast={addToast} />;
      case 'brain': return <BrainModule addToast={addToast} brainIcon={brainIcon} />;
      case 'eye': return <EyeModule addToast={addToast} />;
      case 'skin': return <SkinModule addToast={addToast} />;
      case 'sepsis': return <SepsisModule addToast={addToast} />;
      case 'history': return <HistoryModule addToast={addToast} />;
      default: return <div>Select a module</div>;
    }
  };

  if (authStatus === 'checking') {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white">
        <div className="text-slate-700 font-semibold">Checking session...</div>
      </div>
    );
  }

  if (authStatus !== 'authenticated') {
    return (
      <div className="h-screen w-screen bg-white overflow-hidden">
        {activeTab === 'signup' ? (
          <SignupPage
            addToast={addToast}
            onSuccess={handleAuthSuccess}
            onSwitchToLogin={() => setActiveTab('login')}
          />
        ) : (
          <LoginPage
            addToast={addToast}
            onSuccess={handleAuthSuccess}
            onSwitchToSignup={() => setActiveTab('signup')}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Sidebar */}
      <motion.aside 
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        className={`${sidebarOpen ? 'w-72' : 'w-20'} bg-gradient-to-b from-purple-50 to-white shadow-lg border-r border-purple-100 text-slate-900 flex flex-col transition-all duration-300 relative z-10 overflow-hidden`}
      >
        {/* Header */}
        <div className="p-6 border-b border-purple-100/60 flex items-center gap-3 flex-nowrap overflow-hidden bg-gradient-to-r from-purple-50 to-violet-50">
          <motion.div 
            className="p-2 rounded-lg text-white shadow-md"
            style={{ background: 'linear-gradient(135deg, #7B6FA0, #9B8FC0)' }}
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.6 }}
          >
            <i className="bi bi-lightning-fill" aria-hidden="true" style={{ fontSize: '24px' }} />
          </motion.div>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 min-w-0"
            >
              <h1 className="text-2xl font-bold gradient-text">
                MedAI Pro
              </h1>
              <p className="text-xs text-slate-600 font-medium">Advanced Diagnostics</p>
              {user?.email && (
                <p className="text-[11px] text-slate-600 mt-1 truncate max-w-full">Signed in as {user.email}</p>
              )}
            </motion.div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-purple-200/60 rounded-lg transition-colors shrink-0 text-purple-700 hover:text-purple-900"
          >
            <i className={`bi ${sidebarOpen ? 'bi-x-lg' : 'bi-list'}`} style={{ fontSize: '20px' }} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          <SidebarItem 
            icon={<i className="bi bi-grid" style={{ fontSize: '20px' }} />} 
            label="Dashboard" 
            active={activeTab === 'home'} 
            onClick={() => setActiveTab('home')}
            sidebarOpen={sidebarOpen}
          />
          
          {sidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs font-bold text-slate-600 uppercase mt-6 mb-2 pl-2 tracking-wider"
            >
              Diagnosis Modules
            </motion.div>
          )}
          
          <SidebarItem 
            icon={<i className="bi bi-heart-pulse" style={{ fontSize: '20px' }} />} 
            label="Chest X-Ray" 
            active={activeTab === 'chest'} 
            onClick={() => setActiveTab('chest')}
            sidebarOpen={sidebarOpen}
            color="grey"
          />
          <SidebarItem 
            icon={brainIcon} 
            label="Brain MRI" 
            active={activeTab === 'brain'} 
            onClick={() => setActiveTab('brain')}
            sidebarOpen={sidebarOpen}
            color="purple"
          />
          <SidebarItem 
            icon={<i className="bi bi-eye" style={{ fontSize: '20px' }} />} 
            label="Retinal Scan" 
            active={activeTab === 'eye'} 
            onClick={() => setActiveTab('eye')}
            sidebarOpen={sidebarOpen}
            color="black"
          />
          <SidebarItem 
            icon={<i className="bi bi-droplet-half" style={{ fontSize: '20px' }} />} 
            label="Skin Lesion" 
            active={activeTab === 'skin'} 
            onClick={() => setActiveTab('skin')}
            sidebarOpen={sidebarOpen}
            color="red"
          />
          <SidebarItem 
            icon={<i className="bi bi-virus" style={{ fontSize: '20px' }} />} 
            label="Sepsis Risk" 
            active={activeTab === 'sepsis'} 
            onClick={() => setActiveTab('sepsis')}
            sidebarOpen={sidebarOpen}
            color="red"
          />
          
          {sidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs font-bold text-slate-600 uppercase mt-6 mb-2 pl-2 tracking-wider"
            >
              Records
            </motion.div>
          )}
          
          <SidebarItem 
            icon={<i className="bi bi-journal-text" style={{ fontSize: '20px' }} />} 
            label="Patient History" 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')}
            sidebarOpen={sidebarOpen}
          />
        </nav>

        {/* Footer */}
        {sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 border-t border-purple-100/60"
          >
            <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-3 border border-purple-100/60 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
              <i className="bi bi-stars text-purple-600" style={{ fontSize: '14px' }} />
              <span className="text-xs font-bold text-slate-900">AI Powered</span>
            </div>
            <p className="text-xs text-slate-700 font-medium">Advanced ML Models</p>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 w-full px-4 py-2 rounded-xl font-bold text-slate-900 bg-purple-100 hover:bg-purple-200 transition-colors border border-purple-200/60"
          >
            Logout
          </button>
        </motion.div>
      )}
    </motion.aside>

    <main className="flex-1 overflow-auto relative">
      {/* Navbar Open Button */}
      {!sidebarOpen && (
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.05 }}
          onClick={() => setSidebarOpen(true)}
          className="fixed top-4 left-4 z-40 p-3 text-white rounded-lg shadow-lg hover:shadow-xl transition-all"
          style={{ background: 'linear-gradient(135deg, #7B6FA0, #9B8FC0)' }}
          aria-label="Open navbar"
        >
          <i className="bi bi-list" style={{ fontSize: '20px' }} />
        </motion.button>
      )}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </main>

    {/* Toast Container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

// Enhanced Home Dashboard
function HomeDashboard({ onNavigate }) {
  const stats = [
    { 
      label: 'AI-Powered Analysis', 
      value: 'Deep Learning', 
      desc: 'Advanced neural networks for accurate disease detection',
      icon: <i className="bi bi-stars" style={{ fontSize: '24px' }} />, 
      color: 'blue'
    },
    { 
      label: 'Multi-Modal Detection', 
      value: '5 Modules', 
      desc: 'Brain, Chest, Eye, Skin & Sepsis analysis',
      icon: <i className="bi bi-microscope" style={{ fontSize: '24px' }} />, 
      color: 'purple'
    },
    { 
      label: 'Fast Processing', 
      value: 'Real-Time', 
      desc: 'Get results in seconds with instant analysis',
      icon: <i className="bi bi-lightning-charge-fill" style={{ fontSize: '24px' }} />, 
      color: 'amber'
    },
    { 
      label: 'Medical Grade', 
      value: 'FDA Ready', 
      desc: 'Built with clinical accuracy standards',
      icon: <i className="bi bi-shield-check" style={{ fontSize: '24px' }} />, 
      color: 'green'
    },
  ];

  const modules = [
    { 
      id: 'chest',
      title: 'Chest X-Ray', 
      desc: 'Pneumonia & 13 other conditions', 
      icon: <i className="bi bi-stethoscope text-blue-500" style={{ fontSize: '32px' }} />,
      gradient: 'from-blue-500 to-cyan-500',
      stats: '14 Conditions',
      onClick: () => onNavigate('chest')
    },
    { 
      id: 'brain',
      title: 'Brain MRI', 
      desc: 'Tumor Detection & Classification', 
      icon: <i className="bi bi-brain text-purple-500" style={{ fontSize: '32px' }} />,
      gradient: 'from-purple-500 to-pink-500',
      stats: '4 Classes',
      onClick: () => onNavigate('brain')
    },
    { 
      id: 'eye',
      title: 'Retinal Scan', 
      desc: 'Diabetic Retinopathy Staging', 
      icon: <i className="bi bi-eye text-amber-500" style={{ fontSize: '32px' }} />,
      gradient: 'from-amber-500 to-orange-500',
      stats: '5 Stages',
      onClick: () => onNavigate('eye')
    },
    { 
      id: 'skin',
      title: 'Skin Lesion', 
      desc: 'Melanoma Malignancy Check', 
      icon: <i className="bi bi-droplet-half text-red-500" style={{ fontSize: '32px' }} />,
      gradient: 'from-red-500 to-rose-500',
      stats: 'Binary Classification',
      onClick: () => onNavigate('skin')
    },
    { 
      id: 'sepsis',
      title: 'Sepsis Risk', 
      desc: '6-Hour Early Warning System', 
      icon: <i className="bi bi-virus text-orange-500" style={{ fontSize: '32px' }} />,
      gradient: 'from-orange-500 to-red-500',
      stats: 'LSTM + XGB + RF',
      onClick: () => onNavigate('sepsis')
    },
  ];

  const imagingModules = modules.filter((m) => m.id !== 'sepsis');

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold text-slate-900 mb-2">
          Welcome back, <span className="gradient-text">Dr. User</span> 👋
        </h1>
        <p className="text-slate-700 font-medium">Here's what's happening with your diagnostics today</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, idx) => {
          const colorClasses = {
            blue: { bg: 'bg-blue-100', text: 'text-blue-700', textDark: 'text-blue-900' },
            green: { bg: 'bg-green-100', text: 'text-green-700', textDark: 'text-green-900' },
            purple: { bg: 'bg-purple-100', text: 'text-purple-700', textDark: 'text-purple-900' },
            amber: { bg: 'bg-amber-100', text: 'text-amber-700', textDark: 'text-amber-900' },
          };
          const colors = colorClasses[stat.color] || colorClasses.blue;
          
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white rounded-2xl shadow-md border border-purple-100/60 p-6 card-hover"
            >
              <div className="flex items-center mb-4">
                <div className={`p-3 ${colors.bg} rounded-lg`}>
                  <div className={colors.textDark}>
                    {stat.icon}
                  </div>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-1">{stat.value}</h3>
              <p className="text-sm font-semibold text-slate-800 mb-2">{stat.label}</p>
              <p className="text-xs text-slate-700 leading-relaxed">{stat.desc}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Sepsis — ICU / vitals (non-imaging) */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-8 rounded-2xl border border-orange-200/80 bg-gradient-to-br from-orange-50 via-white to-amber-50/80 p-6 md:p-8 shadow-md"
      >
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="flex items-start gap-4 flex-1">
            <div
              className="p-4 rounded-2xl text-white shadow-lg shrink-0"
              style={{ background: 'linear-gradient(135deg, #ea580c, #f97316)' }}
            >
              <i className="bi bi-virus" style={{ fontSize: '36px' }} aria-hidden />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-orange-800/80 mb-1">ICU · Clinical inputs</p>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Sepsis risk assessment</h2>
              <p className="text-slate-700 text-sm md:text-base leading-relaxed max-w-2xl">
                No image upload—enter vitals and labs for an ensemble early-warning score (LSTM + XGBoost + Random Forest),
                shock index, and alarm cues for bedside review.
              </p>
            </div>
          </div>
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate('sepsis')}
            className="shrink-0 px-6 py-3.5 rounded-xl font-bold text-white shadow-lg transition-colors whitespace-nowrap"
            style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)' }}
          >
            Open Sepsis module
          </motion.button>
        </div>
      </motion.section>

      {/* Modules Grid */}
      <div>
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-2xl font-bold text-slate-800 mb-6"
        >
          Imaging diagnostic modules
        </motion.h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {imagingModules.map((module, idx) => (
            <motion.div
              key={module.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={module.onClick}
              className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 cursor-pointer card-hover group relative overflow-hidden"
            >
              {/* Gradient Background Effect */}
              <div className={`absolute inset-0 bg-gradient-to-br ${module.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
              
              <div className="relative z-10">
                <div className="mb-4 p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl w-fit group-hover:scale-110 transition-transform duration-300">
                  {module.icon}
                </div>
                <h3 className="font-bold text-xl text-slate-800 mb-2 group-hover:text-slate-900 transition-colors">
                  {module.title}
                </h3>
                <p className="text-slate-500 text-sm mb-3">{module.desc}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-600">
                    {module.stats}
                  </span>
                  <motion.div
                    whileHover={{ x: 5 }}
                    className="text-slate-400 group-hover:text-slate-600 transition-colors"
                  >
                    →
                  </motion.div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-8 rounded-xl shadow-xl p-6 text-white"
        style={{ background: 'linear-gradient(135deg, #7B6FA0, #8B7FA8, #9B8FC0)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold mb-2">Need Help?</h3>
            <p className="text-purple-100">Check our documentation or contact support</p>
          </div>
          <button className="px-6 py-3 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition-colors backdrop-blur-sm">
            Get Support
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// Enhanced Sidebar Item
function SidebarItem({ icon, label, active, onClick, sidebarOpen, color = 'blue' }) {
  const colorClasses = {
    grey: 'bg-purple-300 text-slate-900',
    black: 'bg-purple-300 text-slate-900',
    white: 'bg-white text-black',
    purple: 'bg-purple-500',
    red: 'bg-purple-400',
    sky: 'bg-purple-500',
  };

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ x: 5 }}
      whileTap={{ scale: 0.95 }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 relative overflow-hidden group ${
        active 
          ? `${colorClasses[color]} text-white shadow-lg` 
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      {active && (
        <motion.div
          layoutId="activeTab"
          className={`absolute inset-0 ${colorClasses[color]} rounded-lg`}
          transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
        />
      )}
      <span className="relative z-10">{icon}</span>
      {sidebarOpen && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative z-10 font-medium"
        >
          {label}
        </motion.span>
      )}
    </motion.button>
  );
}

export default App;
