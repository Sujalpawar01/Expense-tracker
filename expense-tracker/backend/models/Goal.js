const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    title: {
      type: String,
      required: [true, 'Goal title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters']
    },
    targetAmount: {
      type: Number,
      required: [true, 'Target amount is required'],
      min: [1, 'Target must be at least 1']
    },
    savedAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    icon: {
      type: String,
      default: '🎯'
    },
    color: {
      type: String,
      default: '#7c6af7'
    },
    deadline: {
      type: Date
    },
    isCompleted: {
      type: Boolean,
      default: false
    },
    contributions: [
      {
        amount: Number,
        note: String,
        date: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

goalSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Goal', goalSchema);
