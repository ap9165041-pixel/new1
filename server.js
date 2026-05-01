require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_...');

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// MongoDB (Local fallback)
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/instarocket', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB Connected'))
  .catch(() => console.log('⚠️ Using in-memory DB'));

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true, lowercase: true },
  password: { type: String, required: true },
  name: String,
  subscription: { status: 'trial', plan: 'starter' }
});

const User = mongoose.model('User', userSchema);

// Auth Middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || req.cookies.token;
    if (!token) return res.status(401).json({ error: 'No token provided' });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey123');
    req.user = await User.findById(decoded.id);
    if (!req.user) return res.status(401).json({ error: 'User not found' });
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// 🔑 LOGIN ROUTE (FIXED)
app.post('/api/login', async (req, res) => {
  try {
    console.log('🔐 Login attempt:', req.body.email);
    
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    console.log('User found:', !!user);
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match:', isMatch);
    
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Create token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'supersecretkey123', { 
      expiresIn: '30d' 
    });

    // Set cookie + return token
    res.cookie('token', token, { httpOnly: true, secure: false });
    
    res.json({ 
      success: true,
      token, 
      user: { 
        id: user._id, 
        email: user.email, 
        name: user.name || 'User',
        subscription: user.subscription 
      } 
    });
    console.log('✅ Login successful:', user.email);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// 🔑 REGISTER ROUTE (FIXED)
app.post('/api/register', async (req, res) => {
  try {
    console.log('📝 Register attempt:', req.body.email);
    
    const { email, password, name } = req.body;
    
    if (!email || !password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be 6+ characters' });
    }

    // Check existing user
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = new User({ 
      email: email.toLowerCase(),
      password: hashedPassword, 
      name: name || email.split('@')[0],
      subscription: { status: 'trial', plan: 'starter' }
    });
    
    await user.save();
    console.log('✅ User created:', user.email);

    // Create token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'supersecretkey123', { 
      expiresIn: '30d' 
    });

    res.json({ 
      success: true,
      token, 
      user: { id: user._id, email: user.email, name: user.name, subscription: user.subscription } 
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server working! 🚀', timestamp: new Date() });
});

app.listen(3000, () => {
  console.log('🚀 InstaRocket running on http://localhost:3000');
  console.log('📱 Test API: http://localhost:3000/api/test');
});
