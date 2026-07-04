const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters']
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0']
    },
    type: {
      type: String,
      enum: ['expense', 'income'],
      default: 'expense'
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: [
        'Food & Dining',
        'Transportation',
        'Shopping',
        'Entertainment',
        'Healthcare',
        'Housing',
        'Education',
        'Utilities',
        'Travel',
        'Salary',
        'Freelance',
        'Investment',
        'Other'
      ]
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      default: Date.now
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters']
    }
  },
  { timestamps: true }
);

// Optimized indexes for fast query performance across large datasets
expenseSchema.index({ user: 1, date: -1 });               // default list sort
expenseSchema.index({ user: 1, category: 1 });             // category filter
expenseSchema.index({ user: 1, type: 1, date: -1 });       // type + date filter
expenseSchema.index({ user: 1, category: 1, date: -1 });   // category + date range
expenseSchema.index({ user: 1, date: -1, type: 1, category: 1 }); // compound for aggregation
expenseSchema.index({ title: 'text' });                    // full-text search on title

module.exports = mongoose.model('Expense', expenseSchema);
