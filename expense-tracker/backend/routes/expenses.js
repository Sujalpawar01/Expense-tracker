const express = require('express');
const router = express.Router();
const { body, validationResult, query } = require('express-validator');
const Expense = require('../models/Expense');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// @route   GET /api/expenses
// @desc    Get all expenses with filters & pagination
// @access  Private
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      type,
      startDate,
      endDate,
      search
    } = req.query;

    const filter = { user: req.user._id };

    if (category) filter.category = category;
    if (type) filter.type = type;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    if (search) {
      filter.title = { $regex: search, $options: 'i' };
    }

    const total = await Expense.countDocuments(filter);
    const expenses = await Expense.find(filter)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    res.json({
      expenses,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/expenses/summary
// @desc    Get financial summary stats + day-of-week breakdown
// @access  Private
router.get('/summary', async (req, res) => {
  try {
    const { month, year } = req.query;
    const now = new Date();
    const targetMonth = month ? parseInt(month) - 1 : now.getMonth();
    const targetYear = year ? parseInt(year) : now.getFullYear();

    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

    // Run all aggregations in parallel for performance
    const [monthlyData, categoryData, trendData, dayOfWeekData, dailySpending] = await Promise.all([
      // Monthly totals
      Expense.aggregate([
        {
          $match: {
            user: req.user._id,
            date: { $gte: startOfMonth, $lte: endOfMonth }
          }
        },
        {
          $group: {
            _id: '$type',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),

      // Category breakdown (expenses only)
      Expense.aggregate([
        {
          $match: {
            user: req.user._id,
            type: 'expense',
            date: { $gte: startOfMonth, $lte: endOfMonth }
          }
        },
        {
          $group: {
            _id: '$category',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { total: -1 } }
      ]),

      // Last 6 months trend
      Expense.aggregate([
        {
          $match: {
            user: req.user._id,
            date: { $gte: (() => { const d = new Date(); d.setMonth(d.getMonth() - 5); d.setDate(1); return d; })() }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$date' },
              month: { $month: '$date' },
              type: '$type'
            },
            total: { $sum: '$amount' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),

      // Spending by day of week (1=Sun … 7=Sat)
      Expense.aggregate([
        {
          $match: {
            user: req.user._id,
            type: 'expense',
            date: { $gte: startOfMonth, $lte: endOfMonth }
          }
        },
        {
          $group: {
            _id: { $dayOfWeek: '$date' },
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // Daily spending for calendar heatmap
      Expense.aggregate([
        {
          $match: {
            user: req.user._id,
            type: 'expense',
            date: { $gte: startOfMonth, $lte: endOfMonth }
          }
        },
        {
          $group: {
            _id: { $dayOfMonth: '$date' },
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    const totalIncome  = monthlyData.find(d => d._id === 'income')?.total  || 0;
    const totalExpense = monthlyData.find(d => d._id === 'expense')?.total || 0;

    // Spending forecast: daily burn rate × remaining days in month
    const today        = new Date();
    const isCurrentMonth = today.getMonth() === targetMonth && today.getFullYear() === targetYear;
    const daysPassed   = isCurrentMonth ? today.getDate() : new Date(targetYear, targetMonth + 1, 0).getDate();
    const daysInMonth  = new Date(targetYear, targetMonth + 1, 0).getDate();
    const daysLeft     = isCurrentMonth ? daysInMonth - today.getDate() : 0;
    const dailyBurn    = daysPassed > 0 ? totalExpense / daysPassed : 0;
    const forecastTotal = isCurrentMonth ? totalExpense + dailyBurn * daysLeft : totalExpense;

    res.json({
      summary: {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        transactionCount:
          (monthlyData.find(d => d._id === 'income')?.count || 0) +
          (monthlyData.find(d => d._id === 'expense')?.count || 0)
      },
      forecast: {
        dailyBurn: Math.round(dailyBurn),
        forecastTotal: Math.round(forecastTotal),
        daysLeft,
        daysInMonth
      },
      categoryBreakdown: categoryData,
      trend: trendData,
      spendingByDayOfWeek: dayOfWeekData,
      dailySpending
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/expenses/export
// @desc    Export filtered transactions as CSV
// @access  Private
router.get('/export', async (req, res) => {
  try {
    const { type, category, startDate, endDate, search } = req.query;

    const filter = { user: req.user._id };
    if (category) filter.category = category;
    if (type) filter.type = type;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    if (search) filter.title = { $regex: search, $options: 'i' };

    const expenses = await Expense.find(filter).sort({ date: -1 }).lean();

    // Build CSV with proper escaping
    const escape = (val) => `"${String(val || '').replace(/"/g, '""')}"`;

    const headers = ['Date', 'Title', 'Type', 'Category', 'Amount', 'Notes'];
    const rows = expenses.map(e => [
      new Date(e.date).toISOString().split('T')[0],
      escape(e.title),
      e.type,
      escape(e.category),
      e.amount.toFixed(2),
      escape(e.notes || '')
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="transactions_${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/expenses/compare
// @desc    Compare current month vs previous month
// @access  Private
router.get('/compare', async (req, res) => {
  try {
    const { month, year } = req.query;
    const now = new Date();
    const targetMonth = month ? parseInt(month) - 1 : now.getMonth();
    const targetYear = year ? parseInt(year) : now.getFullYear();

    const startCurr = new Date(targetYear, targetMonth, 1);
    const endCurr = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

    const prevDate = new Date(targetYear, targetMonth - 1, 1);
    const startPrev = new Date(prevDate.getFullYear(), prevDate.getMonth(), 1);
    const endPrev = new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 0, 23, 59, 59);

    const getStats = async (start, end) => {
      const [typeSummary, catBreakdown] = await Promise.all([
        Expense.aggregate([
          { $match: { user: req.user._id, date: { $gte: start, $lte: end } } },
          { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } }
        ]),
        Expense.aggregate([
          { $match: { user: req.user._id, type: 'expense', date: { $gte: start, $lte: end } } },
          { $group: { _id: '$category', total: { $sum: '$amount' } } },
          { $sort: { total: -1 } },
          { $limit: 5 }
        ])
      ]);

      const income = typeSummary.find(d => d._id === 'income')?.total || 0;
      const expense = typeSummary.find(d => d._id === 'expense')?.total || 0;
      const count = typeSummary.reduce((a, d) => a + d.count, 0);
      return { income, expense, balance: income - expense, count, topCategories: catBreakdown };
    };

    const [current, previous] = await Promise.all([
      getStats(startCurr, endCurr),
      getStats(startPrev, endPrev)
    ]);

    res.json({ current, previous, month: targetMonth + 1, year: targetYear });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/expenses/insights
// @desc    Auto-generated smart financial insights from data
// @access  Private
router.get('/insights', async (req, res) => {
  try {
    const now = new Date();
    const currStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [currCats, prevCats, currSummary, dailyData] = await Promise.all([
      Expense.aggregate([
        { $match: { user: req.user._id, type: 'expense', date: { $gte: currStart, $lte: currEnd } } },
        { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } }
      ]),
      Expense.aggregate([
        { $match: { user: req.user._id, type: 'expense', date: { $gte: prevStart, $lte: prevEnd } } },
        { $group: { _id: '$category', total: { $sum: '$amount' } } }
      ]),
      Expense.aggregate([
        { $match: { user: req.user._id, date: { $gte: currStart, $lte: currEnd } } },
        { $group: { _id: '$type', total: { $sum: '$amount' } } }
      ]),
      Expense.aggregate([
        { $match: { user: req.user._id, type: 'expense', date: { $gte: currStart, $lte: currEnd } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, total: { $sum: '$amount' } } },
        { $sort: { total: -1 } },
        { $limit: 1 }
      ])
    ]);

    const insights = [];
    const currTotal = currCats.reduce((a, c) => a + c.total, 0);
    const prevTotal = prevCats.reduce((a, c) => a + c.total, 0);

    // Overall spending change vs last month
    if (prevTotal > 0 && currTotal > 0) {
      const deltaPercent = Math.round(((currTotal - prevTotal) / prevTotal) * 100);
      if (Math.abs(deltaPercent) >= 5) {
        insights.push({
          type: deltaPercent > 0 ? 'warning' : 'positive',
          icon: deltaPercent > 0 ? '📈' : '📉',
          title: 'Monthly Spending Trend',
          text: `You've spent ${Math.abs(deltaPercent)}% ${deltaPercent > 0 ? 'more' : 'less'} than last month overall.`
        });
      }
    }

    // Per-category changes
    for (const curr of currCats.slice(0, 4)) {
      const prev = prevCats.find(p => p._id === curr._id);
      if (prev && prev.total > 0) {
        const delta = Math.round(((curr.total - prev.total) / prev.total) * 100);
        if (Math.abs(delta) >= 25) {
          insights.push({
            type: delta > 0 ? 'warning' : 'positive',
            icon: delta > 0 ? '⚠️' : '✅',
            title: `${curr._id} Spending`,
            text: `Your ${curr._id} spending is ${Math.abs(delta)}% ${delta > 0 ? 'higher' : 'lower'} than last month.`
          });
        }
      }
    }

    // Savings rate
    const income = currSummary.find(d => d._id === 'income')?.total || 0;
    if (income > 0) {
      const savingsRate = Math.round(((income - currTotal) / income) * 100);
      if (savingsRate >= 30) {
        insights.push({ type: 'positive', icon: '🎯', title: 'Excellent Savings Rate', text: `You're saving ${savingsRate}% of your income this month — keep it up!` });
      } else if (savingsRate > 0) {
        insights.push({ type: 'info', icon: '💰', title: 'Savings Rate', text: `You're saving ${savingsRate}% of your income this month. Aim for 20%+!` });
      } else if (savingsRate < 0) {
        insights.push({ type: 'danger', icon: '🚨', title: 'Overspending Alert', text: `You've spent ${Math.abs(savingsRate)}% more than your income this month.` });
      }
    }

    // Top category share
    if (currCats.length > 0 && currTotal > 0) {
      const top = currCats[0];
      const pct = Math.round((top.total / currTotal) * 100);
      if (pct >= 30) {
        insights.push({ type: 'info', icon: '💡', title: 'Top Spending Category', text: `${top._id} accounts for ${pct}% of your total spending — your biggest expense area.` });
      }
    }

    // Highest spending day
    if (dailyData.length > 0) {
      const day = new Date(dailyData[0]._id).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      insights.push({
        type: 'info',
        icon: '📅',
        title: 'Peak Spending Day',
        text: `Your highest spending day this month was ${day}.`
      });
    }

    if (insights.length === 0) {
      insights.push({ type: 'info', icon: '📊', title: 'Getting Started', text: 'Add more transactions to get personalised financial insights!' });
    }

    res.json({ insights });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/expenses/import
// @desc    Bulk-import transactions from CSV body text
// @access  Private
router.post('/import', async (req, res) => {
  try {
    const { csvText } = req.body;
    if (!csvText) return res.status(400).json({ message: 'No CSV data provided' });

    const VALID_CATEGORIES = ['Food & Dining','Transportation','Shopping','Entertainment',
      'Healthcare','Housing','Education','Utilities','Travel','Salary','Freelance','Investment','Other'];

    const lines = csvText.trim().split('\n').filter(Boolean);
    if (lines.length < 2) return res.status(400).json({ message: 'CSV must have a header row and at least one data row' });

    // Skip header row
    const rows = lines.slice(1);
    const docs = [];
    const errors = [];

    rows.forEach((line, idx) => {
      // Handle quoted fields
      const cols = line.match(/(".*?"|[^,]+)/g)?.map(c => c.replace(/^"|"$/g, '').trim()) || [];
      const [date, title, type, category, amount, notes] = cols;

      if (!date || !title || !type || !category || !amount) {
        errors.push(`Row ${idx + 2}: missing required fields`);
        return;
      }
      if (!['expense','income'].includes(type.toLowerCase())) {
        errors.push(`Row ${idx + 2}: type must be 'expense' or 'income'`);
        return;
      }
      const cat = VALID_CATEGORIES.find(c => c.toLowerCase() === category.toLowerCase()) || 'Other';
      const parsedDate = new Date(date);
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedDate.getTime())) { errors.push(`Row ${idx + 2}: invalid date`); return; }
      if (isNaN(parsedAmount) || parsedAmount <= 0) { errors.push(`Row ${idx + 2}: invalid amount`); return; }

      docs.push({ user: req.user._id, title, amount: parsedAmount, type: type.toLowerCase(), category: cat, date: parsedDate, notes: notes || '' });
    });

    if (docs.length === 0) return res.status(400).json({ message: 'No valid rows found', errors });

    const inserted = await Expense.insertMany(docs, { ordered: false });
    res.status(201).json({ imported: inserted.length, skipped: rows.length - inserted.length, errors: errors.slice(0, 10) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Import failed' });
  }
});

// @route   POST /api/expenses

// @desc    Create new expense/income
// @access  Private
router.post(
  '/',
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0'),
    body('category').notEmpty().withMessage('Category is required'),
    body('type').isIn(['expense', 'income']).withMessage('Type must be expense or income'),
    body('date').isISO8601().withMessage('Valid date is required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    try {
      const expense = await Expense.create({
        ...req.body,
        user: req.user._id
      });
      res.status(201).json({ expense });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   PUT /api/expenses/:id
// @desc    Update expense
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, user: req.user._id });
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    const updated = await Expense.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    res.json({ expense: updated });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/expenses/:id
// @desc    Delete expense
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, user: req.user._id });
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    await expense.deleteOne();
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
