import express from 'express';
import User from '../models/User.js';
import Department from '../models/Department.js';
import { protect, allowRoles } from '../middleware/auth.js';

const router = express.Router();

router.use(protect, allowRoles('Admin'));

router.get('/', async (req, res) => {
  const users = await User.find().select('-password').populate('department', 'name status');
  res.json(users);
});

router.patch('/:id/role', async (req, res) => {
  const { role, department, status } = req.body;
  const existingUser = await User.findById(req.params.id);
  const updates = {};

  if (role) updates.role = role;
  if (department !== undefined) updates.department = department || null;
  if (status) updates.status = status;

  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).select('-password').populate('department', 'name status');

  const roleChanged = Object.prototype.hasOwnProperty.call(req.body, 'role');
  const departmentChanged = Object.prototype.hasOwnProperty.call(req.body, 'department');

  if (existingUser?.role === 'Department Head' && existingUser.department && ((roleChanged && role !== 'Department Head') || (departmentChanged && department && String(existingUser.department) !== String(department)))) {
    await Department.findByIdAndUpdate(existingUser.department, { head: null });
  }

  if (role === 'Department Head' && department) {
    await Department.findByIdAndUpdate(department, { head: user._id });
  }
  res.json(user);
});

export default router;