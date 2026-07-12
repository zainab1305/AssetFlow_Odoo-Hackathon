import express from 'express';
import User from '../models/User.js';
import Department from '../models/Department.js';
import { protect, allowRoles } from '../middleware/auth.js';

const router = express.Router();

router.use(protect, allowRoles('Admin'));

router.get('/', async (req, res) => {
  const users = await User.find().select('-password').populate('department', 'name');
  res.json(users);
});

router.patch('/:id/role', async (req, res) => {
  const { role, department } = req.body;
  const updates = { role };
  if (department) updates.department = department;
  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password').populate('department', 'name');
  if (role === 'Department Head' && department) {
    await Department.findByIdAndUpdate(department, { head: user._id });
  }
  res.json(user);
});

export default router;