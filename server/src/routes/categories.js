import express from 'express';
import Category from '../models/Category.js';
import { protect, allowRoles } from '../middleware/auth.js';

const router = express.Router();

router.use(protect, allowRoles('Admin', 'Asset Manager'));

router.get('/', async (req, res) => {
  const categories = await Category.find().populate('department', 'name');
  res.json(categories);
});

router.post('/', async (req, res) => {
  const category = await Category.create(req.body);
  res.status(201).json(category);
});

router.put('/:id', async (req, res) => {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(category);
});

router.delete('/:id', async (req, res) => {
  await Category.findByIdAndDelete(req.params.id);
  res.json({ message: 'Category deleted' });
});

export default router;