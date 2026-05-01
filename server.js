const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// 🔥 SIMPLE MIDDLEWARE
app.use(cors({ origin: '*' }));  // Allow all origins
app.use(express.json());
app.use(express.static('public'));

// 🔥 IN-MEMORY DB (No MongoDB needed)
let users = [];

// Routes
app.get('/api/test', (req, res) => {
  res.json({ 
    status: '✅ SERVER WORKING PERFECTLY!', 
    time: new Date().toLocaleString(),
    users: users.length
  });
});

app.post('/api/register', async (req, res) => {
  const { email, password, name } = req.body;
  
  // Check if exists
  const exists = users.find(u => u.email === email.toLowerCase());
  if (exists) {
    return res.json({ error: 'Email already exists' });
  }
  
  // Hash password
  const hashed = await bcrypt.hash(password, 10);
  
  // Create user
  const user = {
    id: Date.now().toString(),
    email: email.toLowerCase(),
    password: hashed,
    name: name || 'User',
    subscription: { status: 'trial', plan: 'starter' }
  };
  
  users.push(user);
  
  const token = jwt.sign({ id: user.id }, 'supersecret', { expiresIn: '30d' });
  res.json({ 
    success: true,
    token, 
    user: { id: user.id, email: user.email, name: user.name, subscription: user.subscription }
  });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  const user = users.find(u => u.email === email.toLowerCase());
  if (!user) {
    return res.json({ error: 'Invalid email or password' });
  }
  
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.json({ error: 'Invalid email or password' });
  }
  
  const token = jwt.sign({ id: user.id }, 'supersecret', { expiresIn: '30d' });
  res.json({ 
    success: true,
    token, 
    user: { id: user.id, email: user.email, name: user.name, subscription: user.subscription }
  });
});

app.get('/api/dashboard', (req, res) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  try {
    jwt.verify(token, 'supersecret');
    res.json({
      user: users[0] || { email: 'demo@test.com', subscription: { plan: 'pro' } },
      stats: {
        followers: 24567,
        likes: 1234,
        actions: 200
      }
    });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.listen(3000, () => {
  console.log('\n🚀 SERVER STARTED!');
  console.log('🌐 http://localhost:3000');
  console.log('🧪 Test: http://localhost:3000/api/test');
  console.log('📱 Login: http://localhost:3000/auth.html');
  console.log('\n');
});
