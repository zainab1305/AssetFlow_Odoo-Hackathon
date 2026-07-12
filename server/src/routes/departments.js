import express from 'express';
import Department from '../models/Department.js';
import User from '../models/User.js';
import { protect, allowRoles } from '../middleware/auth.js';
import { logActivity } from '../utils/activity.js';

const router = express.Router();

router.use(protect, allowRoles('Admin'));

router.get('/', async (req, res) => {
  const departments = await Department.find().populate('head', 'name email role');
  res.json(departments);
});

router.post('/', async (req, res) => {
  const department = await Department.create(req.body);
  await logActivity({ title: 'Department created', detail: department.name, type: 'asset', user: req.user._id });
  res.status(201).json(department);
});

router.put('/:id', async (req, res) => {
  const department = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(department);
});

router.delete('/:id', async (req, res) => {
  await Department.findByIdAndDelete(req.params.id);
  res.json({ message: 'Department removed' });
});

router.patch('/:id/head', async (req, res) => {
  const { userId } = req.body;
  const department = await Department.findByIdAndUpdate(req.params.id, { head: userId }, { new: true }).populate('head', 'name email role');
  await User.findByIdAndUpdate(userId, { role: 'Department Head', department: department._id });
  res.json(department);
});

export default router;