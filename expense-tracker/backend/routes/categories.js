const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

router.use(protect);

const CATEGORIES = {
  expense: [
    { name: 'Food & Dining', icon: '🍔', color: '#FF6B6B' },
    { name: 'Transportation', icon: '🚗', color: '#4ECDC4' },
    { name: 'Shopping', icon: '🛍️', color: '#45B7D1' },
    { name: 'Entertainment', icon: '🎬', color: '#96CEB4' },
    { name: 'Healthcare', icon: '🏥', color: '#FFEAA7' },
    { name: 'Housing', icon: '🏠', color: '#DDA0DD' },
    { name: 'Education', icon: '📚', color: '#98D8C8' },
    { name: 'Utilities', icon: '💡', color: '#F7DC6F' },
    { name: 'Travel', icon: '✈️', color: '#85C1E9' },
    { name: 'Other', icon: '📦', color: '#BDC3C7' }
  ],
  income: [
    { name: 'Salary', icon: '💼', color: '#2ECC71' },
    { name: 'Freelance', icon: '💻', color: '#27AE60' },
    { name: 'Investment', icon: '📈', color: '#1ABC9C' },
    { name: 'Other', icon: '💰', color: '#16A085' }
  ]
};

router.get('/', (req, res) => {
  res.json({ categories: CATEGORIES });
});

module.exports = router;
