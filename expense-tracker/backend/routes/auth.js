const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Expense = require('../models/Expense');
const { protect } = require('../middleware/auth');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    try {
      const { name, email, password } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already registered' });
      }

      const user = await User.create({ name, email, password });
      const token = generateToken(user._id);

      res.status(201).json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          currency: user.currency,
          monthlyBudget: user.monthlyBudget
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      const token = generateToken(user._id);

      res.json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          currency: user.currency,
          monthlyBudget: user.monthlyBudget
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      currency: req.user.currency,
      monthlyBudget: req.user.monthlyBudget
    }
  });
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, currency, monthlyBudget } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, currency, monthlyBudget },
      { new: true, runValidators: true }
    );
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        currency: user.currency,
        monthlyBudget: user.monthlyBudget
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/auth/achievements
// @desc    Compute and return achievement badges from user's data
// @access  Private
router.get('/achievements', protect, async (req, res) => {
  try {
    const now = new Date();
    const currStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(now.getMonth() - 5); sixMonthsAgo.setDate(1);

    const [currSummary, prevSummary, totalCount, distinctMonths] = await Promise.all([
      Expense.aggregate([
        { $match: { user: req.user._id, date: { $gte: currStart, $lte: currEnd } } },
        { $group: { _id: '$type', total: { $sum: '$amount' } } }
      ]),
      Expense.aggregate([
        { $match: { user: req.user._id, date: { $gte: prevStart, $lte: prevEnd } } },
        { $group: { _id: '$type', total: { $sum: '$amount' } } }
      ]),
      Expense.countDocuments({ user: req.user._id }),
      Expense.aggregate([
        { $match: { user: req.user._id, date: { $gte: sixMonthsAgo } } },
        { $group: { _id: { year: { $year: '$date' }, month: { $month: '$date' } } } },
        { $count: 'months' }
      ])
    ]);

    const currIncome  = currSummary.find(d => d._id === 'income')?.total  || 0;
    const currExpense = currSummary.find(d => d._id === 'expense')?.total || 0;
    const prevIncome  = prevSummary.find(d => d._id === 'income')?.total  || 0;
    const prevExpense = prevSummary.find(d => d._id === 'expense')?.total || 0;
    const savingsRate = currIncome > 0 ? ((currIncome - currExpense) / currIncome) * 100 : 0;
    const months      = distinctMonths[0]?.months || 0;

    const allAchievements = [
      { id: 'first_step',     icon: '🚀', title: 'First Step',        desc: 'Log your very first transaction',                 unlocked: totalCount >= 1 },
      { id: 'transaction_10', icon: '📝', title: 'Getting Serious',   desc: 'Log 10 or more transactions',                    unlocked: totalCount >= 10 },
      { id: 'transaction_50', icon: '📚', title: 'Power Tracker',     desc: 'Log 50 or more transactions',                    unlocked: totalCount >= 50 },
      { id: 'saver_20',       icon: '💰', title: 'Saver',             desc: 'Save 20% or more of income this month',          unlocked: savingsRate >= 20 },
      { id: 'saver_30',       icon: '🏅', title: 'Super Saver',       desc: 'Save 30% or more of income this month',          unlocked: savingsRate >= 30 },
      { id: 'no_overspend',   icon: '🎯', title: 'Budget Master',     desc: 'Spend less than you earned this month',           unlocked: currIncome > 0 && currExpense < currIncome },
      { id: 'less_than_prev', icon: '📉', title: 'Cutting Back',      desc: 'Spend less this month than last month',           unlocked: prevExpense > 0 && currExpense < prevExpense },
      { id: 'streak_3',       icon: '🔥', title: '3-Month Streak',    desc: 'Track expenses for 3 consecutive months',         unlocked: months >= 3 },
      { id: 'streak_6',       icon: '⚡', title: '6-Month Streak',    desc: 'Track expenses for 6 consecutive months',         unlocked: months >= 6 },
      { id: 'income_logged',  icon: '💼', title: 'Income Tracker',    desc: 'Log at least one income transaction this month',  unlocked: currIncome > 0 },
    ];

    const unlocked = allAchievements.filter(a => a.unlocked).length;
    res.json({ achievements: allAchievements, unlocked, total: allAchievements.length });
  } catch (err) {
    console.error('Achievements error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
