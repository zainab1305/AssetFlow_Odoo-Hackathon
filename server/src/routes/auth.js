import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { logActivity } from '../utils/activity.js';

const router = express.Router();

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, department } = req.body;
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      department: department || null,
      role: 'Employee',
      status: 'Active',
      employeeId: `EMP-${Date.now().toString().slice(-6)}`,
    });

    await logActivity({
      title: 'New employee account created',
      detail: `${user.name} registered as Employee`,
      type: 'auth',
      user: user._id,
    });

    res.status(201).json({
      token: signToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).populate('department');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    if (user.status === 'Inactive') {
      return res.status(403).json({ message: 'Your account is inactive' });
    }

    const valid = await user.matchPassword(password);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      token: signToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/me', protect, async (req, res) => {
  res.json({ user: req.user });
});

export default router;