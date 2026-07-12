import express from 'express';
import Department from '../models/Department.js';
import User from '../models/User.js';
import { protect, allowRoles } from '../middleware/auth.js';
import { logActivity } from '../utils/activity.js';

const router = express.Router();

router.use(protect, allowRoles('Admin'));

router.get('/', async (req, res) => {
  const departments = await Department.find()
    .populate('head', 'name email role status')
    .populate('parentDepartment', 'name status');
  res.json(departments);
});

router.post('/', async (req, res) => {
  const department = await Department.create(req.body);
  await logActivity({ title: 'Department created', detail: department.name, type: 'asset', user: req.user._id });
  if (req.body.head) {
    await User.findByIdAndUpdate(req.body.head, {
      role: 'Department Head',
      department: department._id,
      status: 'Active',
    });
  }
  const populated = await Department.findById(department._id)
    .populate('head', 'name email role status')
    .populate('parentDepartment', 'name status');
  res.status(201).json(populated);
});

router.put('/:id', async (req, res) => {
  const previousDepartment = await Department.findById(req.params.id);
  const department = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    .populate('head', 'name email role status')
    .populate('parentDepartment', 'name status');

  if (Object.prototype.hasOwnProperty.call(req.body, 'head')) {
    if (req.body.head) {
      if (previousDepartment?.head && String(previousDepartment.head) !== String(req.body.head)) {
        await User.findByIdAndUpdate(previousDepartment.head, { role: 'Employee' });
      }
      await User.findByIdAndUpdate(req.body.head, {
        role: 'Department Head',
        department: department._id,
        status: 'Active',
      });
    } else if (previousDepartment?.head) {
      await User.findByIdAndUpdate(previousDepartment.head, { role: 'Employee' });
      await Department.findByIdAndUpdate(req.params.id, { head: null });
    }
  }

  res.json(department);
});

router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  const department = await Department.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true })
    .populate('head', 'name email role status')
    .populate('parentDepartment', 'name status');
  res.json(department);
});

router.patch('/:id/head', async (req, res) => {
  const { userId } = req.body;
  const department = await Department.findByIdAndUpdate(req.params.id, { head: userId }, { new: true }).populate('head', 'name email role status');
  await User.findByIdAndUpdate(userId, { role: 'Department Head', department: department._id, status: 'Active' });
  res.json(department);
});

export default router;