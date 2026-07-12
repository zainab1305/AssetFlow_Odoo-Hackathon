import express from 'express';
import Category from '../models/Category.js';
import { protect, allowRoles } from '../middleware/auth.js';

const router = express.Router();

router.use(protect, allowRoles('Admin'));

router.get('/', async (req, res) => {
  const categories = await Category.find().populate('department', 'name');
  res.json(categories);
});

router.post('/', async (req, res) => {
  const category = await Category.create(req.body);
  const populated = await Category.findById(category._id).populate('department', 'name');
  res.status(201).json(populated);
});

router.put('/:id', async (req, res) => {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('department', 'name');
  res.json(category);
});

router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  const category = await Category.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true }).populate('department', 'name');
  res.json(category);
});

router.delete('/:id', async (req, res) => {
  await Category.findByIdAndDelete(req.params.id);
  res.json({ message: 'Category deleted' });
});

export default router;