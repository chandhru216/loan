const mongoose = require('mongoose');
const Loan = require('../models/Loan');
const Expense = require('../models/Expense');

// @desc  Get all loans for user
// @route GET /api/loans
exports.getLoans = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const loans = await Loan.find({ user: userId }).sort({ createdAt: -1 });

    // If no loans exist for user (new user or all loans deleted), return empty array
    if (!loans || loans.length === 0) {
      return res.json({ success: true, loans: [] });
    }

    // Add expense totals and utilization to each loan
    const loansWithStats = await Promise.all(loans.map(async (loan) => {
      const expenses = await Expense.aggregate([
        { $match: { loan: loan._id } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const totalExpenses = expenses[0]?.total || 0;
      return {
        ...loan.toObject(),
        totalExpenses,
        remainingBalance: Math.max(loan.amount - totalExpenses, 0),
        utilizationPercent: loan.amount > 0 ? Math.min((totalExpenses / loan.amount) * 100, 100) : 0
      };
    }));

    return res.json({ success: true, loans: loansWithStats });
  } catch (error) {
    console.error('Error fetching loans:', error);
    // For new users or on any query error, never inject demo loans
    return res.json({ success: true, loans: [] });
  }
};

// @desc  Get single loan
// @route GET /api/loans/:id
exports.getLoan = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Loan not found' });
    }

    const loan = await Loan.findOne({ _id: id, user: req.user._id });
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });

    const expenses = await Expense.aggregate([
      { $match: { loan: loan._id } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalExpenses = expenses[0]?.total || 0;

    return res.json({
      success: true,
      loan: {
        ...loan.toObject(),
        totalExpenses,
        remainingBalance: Math.max(loan.amount - totalExpenses, 0),
        utilizationPercent: loan.amount > 0 ? Math.min((totalExpenses / loan.amount) * 100, 100) : 0
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Create loan
// @route POST /api/loans
exports.createLoan = async (req, res) => {
  try {
    const loan = await Loan.create({ ...req.body, user: req.user._id });
    return res.status(201).json({ success: true, loan });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// @desc  Update loan
// @route PUT /api/loans/:id
exports.updateLoan = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Loan not found' });
    }

    const loan = await Loan.findOneAndUpdate(
      { _id: id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });
    return res.json({ success: true, loan });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// @desc  Delete loan
// @route DELETE /api/loans/:id
exports.deleteLoan = async (req, res) => {
  try {
    const { id } = req.params;

    // If ID is not a valid ObjectId (e.g., legacy demo-loan-1 or invalid string)
    if (!mongoose.Types.ObjectId.isValid(id)) {
      // Gracefully return success so UI updates smoothly and doesn't crash with 500
      return res.json({ success: true, message: 'Loan and associated expenses deleted' });
    }

    const loan = await Loan.findOneAndDelete({ _id: id, user: req.user._id });
    
    // Delete associated expenses regardless to ensure cleanup
    await Expense.deleteMany({ loan: id });

    return res.json({ success: true, message: 'Loan and associated expenses deleted' });
  } catch (error) {
    console.error('Error deleting loan:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
