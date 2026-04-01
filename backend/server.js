require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');


const app = express();
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'img-src': ["'self'", 'data:', 'blob:', 'https:'],
      },
    },
  })
);
const isProd = process.env.NODE_ENV === 'production';
app.use(
  cors({
    origin: (origin, callback) => {
      // In dev, allow the incoming origin so cookie credentials work reliably.
      if (!isProd) return callback(null, true);
      if (!origin) return callback(null, false);
      const allowed = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
      return callback(null, origin === allowed);
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// --- 1. DATABASE CONNECTION ---
// Replace this string if you are using MongoDB Atlas
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const USE_MONGO = Boolean(MONGO_URI && typeof MONGO_URI === 'string' && MONGO_URI.trim().length > 0);
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'medai_auth';

// When MONGO_URI isn't configured, the server still starts in dev mode.
// It falls back to in-memory auth + history so the frontend can work.
const inMemoryUsers = [];
const inMemoryReports = [];
let inMemoryUserSeq = 1;
let inMemoryReportSeq = 1;

if (USE_MONGO) {
  mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch((err) => console.error("❌ DB Connection Error:", err));
} else {
  console.warn('⚠️ MONGO_URI not set. Using in-memory auth + history (dev only).');
}

// --- 2. DATABASE SCHEMA (Patient History) ---
const ReportSchema = new mongoose.Schema({
    patientName: String,
    age: Number,
    sex: String,
    module: String, // 'chest', 'brain', 'eye', 'skin'
    diagnosis: String,
    confidence: Number,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, default: Date.now }
});
const Report = mongoose.model('Report', ReportSchema);

// --- 2b. DATABASE SCHEMA (Auth Users) ---
const UserSchema = new mongoose.Schema({
    email: { type: String, unique: true, index: true, required: true },
    passwordHash: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});
const User = mongoose.model('User', UserSchema);

// --- 3. FILE UPLOAD CONFIG ---
const upload = multer({ dest: 'uploads/' });

// --- 4. AUTH HELPERS & MIDDLEWARE ---
function signToken(user) {
    const sub = user?._id ? user._id.toString() : String(user?.id ?? user?._id ?? '');
    return jwt.sign(
        { sub, email: user.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

function requireAuth(req, res, next) {
    const token = req.cookies?.[AUTH_COOKIE_NAME];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        return next();
    } catch (_err) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
}

function setAuthCookie(res, token) {
    const isProd = process.env.NODE_ENV === 'production';
    const prodMode = process.env.NODE_ENV === 'production';
    res.cookie(AUTH_COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: prodMode ? 'none' : 'lax',
        secure: prodMode,
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
}

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
});

// --- 5. AUTH ROUTES ---
app.post('/api/auth/signup', authLimiter, async (req, res) => {
    try {
        const { email, password } = req.body || {};
        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
        if (!normalizedEmail || !normalizedEmail.includes('@')) {
            return res.status(400).json({ error: 'Invalid email' });
        }
        if (typeof password !== 'string' || password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        if (!USE_MONGO) {
            const existing = inMemoryUsers.find((u) => u.email === normalizedEmail);
            if (existing) return res.status(409).json({ error: 'Account already exists' });

            const passwordHash = await bcrypt.hash(password, 12);
            const user = { id: String(inMemoryUserSeq++), email: normalizedEmail, passwordHash };
            inMemoryUsers.push(user);

            const token = signToken(user);
            setAuthCookie(res, token);
            return res.json({ success: true });
        }

        const existing = await User.findOne({ email: normalizedEmail });
        if (existing) return res.status(409).json({ error: 'Account already exists' });

        const passwordHash = await bcrypt.hash(password, 12);
        const user = await User.create({ email: normalizedEmail, passwordHash });
        const token = signToken(user);
        setAuthCookie(res, token);
        return res.json({ success: true });
    } catch (_err) {
        return res.status(500).json({ error: 'Signup failed' });
    }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
    try {
        const { email, password } = req.body || {};
        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
        if (!normalizedEmail || !normalizedEmail.includes('@')) {
            return res.status(400).json({ error: 'Invalid email' });
        }
        if (typeof password !== 'string' || password.length < 1) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        if (!USE_MONGO) {
            const user = inMemoryUsers.find((u) => u.email === normalizedEmail);
            if (!user) return res.status(401).json({ error: 'Invalid credentials' });

            const ok = await bcrypt.compare(password, user.passwordHash);
            if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

            const token = signToken(user);
            setAuthCookie(res, token);
            return res.json({ success: true });
        }

        const user = await User.findOne({ email: normalizedEmail });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

        const token = signToken(user);
        setAuthCookie(res, token);
        return res.json({ success: true });
    } catch (_err) {
        return res.status(500).json({ error: 'Login failed' });
    }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
    try {
        if (!USE_MONGO) {
            const user = inMemoryUsers.find((u) => u.id === String(req.user.sub));
            if (!user) return res.status(401).json({ error: 'Unauthorized' });
            return res.json({ user: { id: user.id, email: user.email } });
        }

        const user = await User.findById(req.user.sub).select('_id email');
        if (!user) return res.status(401).json({ error: 'Unauthorized' });
        return res.json({ user: { id: user._id.toString(), email: user.email } });
    } catch (_err) {
        return res.status(500).json({ error: 'Failed to fetch user' });
    }
});

app.post('/api/auth/logout', requireAuth, async (req, res) => {
    res.clearCookie(AUTH_COOKIE_NAME);
    return res.json({ success: true });
});

// --- 6. THE MASTER API ROUTE (Protected) ---
app.post('/api/analyze', requireAuth, upload.single('image'), async (req, res) => {
    try {
        const { module, patientName, age, sex, site } = req.body;
        const userId = req.user.sub;
        const filePath = req.file.path;

        console.log(`received request for module: ${module}`);

        // A. PREPARE DATA FOR PYTHON API
        const formData = new FormData();
        formData.append('file', fs.createReadStream(filePath));
        
        // Add extra fields if it's Skin Cancer
        if (module === 'skin') {
            formData.append('age', age);
            formData.append('sex', sex);
            formData.append('site', site);
        }

        // B. CALL PYTHON API (The "Bridge")
        const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://127.0.0.1:8000';
        const pythonUrl = `${PYTHON_API_URL}/predict/${module}`;
        const response = await axios.post(pythonUrl, formData, {
            headers: { ...formData.getHeaders() }
        });

        const aiResult = response.data;

        // C. SAVE (History)
        let diagnosis_text = aiResult.diagnosis || aiResult.findings?.[0]?.condition || "Unknown";
        let confidence_score = aiResult.confidence || aiResult.findings?.[0]?.confidence || 0;

        let historyId;
        if (!USE_MONGO) {
            historyId = String(inMemoryReportSeq++);
            inMemoryReports.push({
                id: historyId,
                patientName: patientName || 'Anonymous',
                age: age || 0,
                sex: sex || 'Unknown',
                module,
                diagnosis: diagnosis_text,
                confidence: confidence_score,
                userId,
                date: new Date(),
            });
        } else {
            const newReport = new Report({
                patientName: patientName || "Anonymous",
                age: age || 0,
                sex: sex || "Unknown",
                module: module,
                diagnosis: diagnosis_text,
                confidence: confidence_score,
                userId
            });

            await newReport.save();
            console.log("✅ Report saved to Database");
            historyId = newReport._id;
        }

        // D. CLEANUP & RESPOND
        fs.unlinkSync(filePath); // Delete temp file
        res.json({ success: true, data: aiResult, historyId });

    } catch (error) {
        console.error("Error:", error?.response?.data || error.message);
        const message = error?.response?.data?.detail || error?.response?.data?.error || error?.message || "AI Processing Failed";
        res.status(500).json({ success: false, error: message });
    }
});

// --- 6b. SEPSIS ROUTE (Protected — proxied to FastAPI) ---
app.post('/api/analyze/sepsis', requireAuth, async (req, res) => {
    try {
        const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://127.0.0.1:8000';
        const response = await axios.post(`${PYTHON_API_URL}/predict/sepsis`, req.body);
        res.json({ success: true, data: response.data });
    } catch (error) {
        console.error("Sepsis Error:", error?.response?.data || error.message);
        const message = error?.response?.data?.detail || error?.message || "Sepsis analysis failed";
        res.status(500).json({ success: false, error: message });
    }
});

// --- 7. HISTORY ROUTE (Protected) ---
app.get('/api/history', requireAuth, async (req, res) => {
    try {
        if (!USE_MONGO) {
            const reports = inMemoryReports
                .filter((r) => String(r.userId) === String(req.user.sub))
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            return res.json(reports);
        }

        const reports = await Report.find({ userId: req.user.sub }).sort({ date: -1 });
        return res.json(reports);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch history" });
    }
});

const path = require('path');
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
  app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
}

app.listen(PORT, () => console.log(`🚀 Node Server running on port ${PORT}`));
