const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Goal = require('../models/Goal');
const { protect } = require('../middleware/auth');

router.use(protect);

// GET /api/goals — list all goals
router.get('/', async (req, res) => {
  try {
    const goals = await Goal.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ goals });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/goals — create goal
router.post('/', [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('targetAmount').isFloat({ gt: 0 }).withMessage('Target amount must be positive'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
  try {
    const { title, targetAmount, icon, color, deadline } = req.body;
    const goal = await Goal.create({ user: req.user._id, title, targetAmount, icon: icon || '🎯', color: color || '#7c6af7', deadline });
    res.status(201).json({ goal });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/goals/:id/contribute — add money towards goal
router.post('/:id/contribute', [
  body('amount').isFloat({ gt: 0 }).withMessage('Contribution must be positive'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
  try {
    const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
    if (!goal) return res.status(404).json({ message: 'Goal not found' });

    const { amount, note } = req.body;
    goal.contributions.push({ amount: parseFloat(amount), note });
    goal.savedAmount = Math.min(goal.savedAmount + parseFloat(amount), goal.targetAmount);
    if (goal.savedAmount >= goal.targetAmount) goal.isCompleted = true;
    await goal.save();
    res.json({ goal });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/goals/:id — update goal
router.put('/:id', async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    const { title, targetAmount, icon, color, deadline } = req.body;
    if (title) goal.title = title;
    if (targetAmount) goal.targetAmount = targetAmount;
    if (icon) goal.icon = icon;
    if (color) goal.color = color;
    if (deadline !== undefined) goal.deadline = deadline;
    await goal.save();
    res.json({ goal });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/goals/:id
router.delete('/:id', async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    await goal.deleteOne();
    res.json({ message: 'Goal deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
