const mongoose = require('mongoose');
const Loan = require('../models/Loan');
const Expense = require('../models/Expense');

const DEMO_LOANS = [
  {
    _id: 'demo-loan-1',
    title: 'MBA Education Loan',
    type: 'education',
    amount: 500000,
    interestRate: 8.5,
    emiAmount: 12500,
    emiDuration: 48,
    emiDay: 5,
    lender: 'SBI Bank',
    purpose: 'MBA Program at IIM',
    status: 'active',
    totalExpenses: 336000,
    remainingBalance: 164000,
    utilizationPercent: 67.2,
    createdAt: new Date('2024-01-15')
  },
  {
    _id: 'demo-loan-2',
    title: 'Startup Business Loan',
    type: 'business',
    amount: 300000,
    interestRate: 12,
    emiAmount: 8500,
    emiDuration: 36,
    emiDay: 10,
    lender: 'HDFC Bank',
    purpose: 'Startup working capital',
    status: 'active',
    totalExpenses: 203000,
    remainingBalance: 97000,
    utilizationPercent: 67.67,
    createdAt: new Date('2024-03-01')
  },
  {
    _id: 'demo-loan-3',
    title: 'Personal Emergency Loan',
    type: 'personal',
    amount: 150000,
    interestRate: 14,
    emiAmount: 7000,
    emiDuration: 24,
    emiDay: 15,
    lender: 'ICICI Bank',
    purpose: 'Medical emergency',
    status: 'active',
    totalExpenses: 100500,
    remainingBalance: 49500,
    utilizationPercent: 67,
    createdAt: new Date('2024-06-01')
  }
];

// @desc  Get all loans for user
// @route GET /api/loans
exports.getLoans = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1 || req.user?._id === 'demo-user-12345') {
      try {
        const loans = await Loan.find({ user: req.user._id }).sort({ createdAt: -1 });
        if (loans && loans.length > 0) {
          const loansWithStats = await Promise.all(loans.map(async (loan) => {
            const expenses = await Expense.aggregate([
              { $match: { loan: loan._id } },
              { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);
            const totalExpenses = expenses[0]?.total || 0;
            return {
              ...loan.toObject(),
              totalExpenses,
              remainingBalance: loan.amount - totalExpenses,
              utilizationPercent: loan.amount > 0 ? Math.min((totalExpenses / loan.amount) * 100, 100) : 0
            };
          }));
          return res.json({ success: true, loans: loansWithStats });
        }
      } catch (e) {
        // Use demo loans fallback
      }
      return res.json({ success: true, loans: DEMO_LOANS });
    }

    const loans = await Loan.find({ user: req.user._id }).sort({ createdAt: -1 });
    
    // Add expense totals to each loan
    const loansWithStats = await Promise.all(loans.map(async (loan) => {
      const expenses = await Expense.aggregate([
        { $match: { loan: loan._id } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const totalExpenses = expenses[0]?.total || 0;
      return {
        ...loan.toObject(),
        totalExpenses,
        remainingBalance: loan.amount - totalExpenses,
        utilizationPercent: loan.amount > 0 ? Math.min((totalExpenses / loan.amount) * 100, 100) : 0
      };
    }));

    res.json({ success: true, loans: loansWithStats });
  } catch (error) {
    res.json({ success: true, loans: DEMO_LOANS });
  }
};

// @desc  Get single loan
// @route GET /api/loans/:id
exports.getLoan = async (req, res) => {
  try {
    const loan = await Loan.findOne({ _id: req.params.id, user: req.user._id });
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });

    const expenses = await Expense.aggregate([
      { $match: { loan: loan._id } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalExpenses = expenses[0]?.total || 0;

    res.json({
      success: true,
      loan: {
        ...loan.toObject(),
        totalExpenses,
        remainingBalance: loan.amount - totalExpenses,
        utilizationPercent: loan.amount > 0 ? Math.min((totalExpenses / loan.amount) * 100, 100) : 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Create loan
// @route POST /api/loans
exports.createLoan = async (req, res) => {
  try {
    const loan = await Loan.create({ ...req.body, user: req.user._id });
    res.status(201).json({ success: true, loan });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc  Update loan
// @route PUT /api/loans/:id
exports.updateLoan = async (req, res) => {
  try {
    const loan = await Loan.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });
    res.json({ success: true, loan });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc  Delete loan
// @route DELETE /api/loans/:id
exports.deleteLoan = async (req, res) => {
  try {
    const loan = await Loan.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });
    
    // Delete associated expenses
    await Expense.deleteMany({ loan: req.params.id });
    
    res.json({ success: true, message: 'Loan and associated expenses deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
