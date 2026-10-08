const Loan    = require('../models/Loan');
const Expense = require('../models/Expense');

// Helper: PDF-safe / readable currency format
const fmt = (n) => `Rs. ${Number(n || 0).toLocaleString('en-IN')}`;

// Smart rule-based advisor fallback using real user financial data
function generateSmartAdvice(userQuery, { loans, loanDetails, totalLoanAmount, totalSpent, totalRemaining, overallUtil, recentExpenses }) {
  const query = (userQuery || '').toLowerCase();

  // Find highest interest rate loan (Avalanche method)
  const sortedByInterest = [...loanDetails].sort((a, b) => b.interestRate - a.interestRate);
  const highestInterestLoan = sortedByInterest[0];

  // Find lowest remaining balance loan (Snowball method)
  const sortedByBalance = [...loanDetails].sort((a, b) => a.remaining - b.remaining);
  const smallestBalanceLoan = sortedByBalance[0];

  // Total monthly EMI
  const totalMonthlyEmi = loanDetails.reduce((s, l) => s + (l.emiAmount || 0), 0);

  if (query.includes('reduce') && (query.includes('emi') || query.includes('payment'))) {
    let advice = `### 💡 How to Reduce Your Monthly EMI (Total EMI: ${fmt(totalMonthlyEmi)}/mo)\n\n`;
    advice += `Based on your **${loans.length} active loans** totaling **${fmt(totalLoanAmount)}**, here are 3 targeted strategies:\n\n`;
    if (highestInterestLoan) {
      advice += `1. **Refinance High-Interest Debt**: Your **${highestInterestLoan.title}** carries your highest interest rate at **${highestInterestLoan.interestRate}%**. Refinancing or transferring balance to a lower-rate loan could reduce your monthly EMI.\n`;
    }
    advice += `2. **Partial Prepayment**: Making lump sum prepayments towards principal lowers your outstanding principal, allowing your lender to recalculate a lower EMI.\n`;
    advice += `3. **Tenure Extension**: Negotiate with your lender (${highestInterestLoan?.lender || 'your bank'}) to extend the repayment tenure, spreading out monthly obligations.\n\n`;
    advice += `Current Total Utilization: **${overallUtil}%** across your portfolio. Reducing high-interest debt first saves maximum money!`;
    return advice;
  }

  if (query.includes('close') || query.includes('pay off') || query.includes('first')) {
    let advice = `### 🎯 Recommended Loan Payoff Strategy\n\n`;
    advice += `Looking at your active loan portfolio (${fmt(totalLoanAmount)} total outstanding):\n\n`;
    if (highestInterestLoan) {
      advice += `🔥 **Avalanche Method (Save Most Money)**: Target **${highestInterestLoan.title}** first. It has the highest interest rate at **${highestInterestLoan.interestRate}%** per annum with an EMI of **${fmt(highestInterestLoan.emiAmount)}**.\n\n`;
    }
    if (smallestBalanceLoan && smallestBalanceLoan !== highestInterestLoan) {
      advice += `⚡ **Snowball Method (Quick Victory)**: Alternatively, target **${smallestBalanceLoan.title}** which has a remaining balance of **${fmt(smallestBalanceLoan.remaining)}**. Closing this first will free up **${fmt(smallestBalanceLoan.emiAmount)}/month** immediately.\n\n`;
    }
    advice += `**Recommendation**: Pay minimum EMIs on all other loans, and allocate extra funds toward your **${highestInterestLoan ? highestInterestLoan.title : 'highest interest loan'}**.`;
    return advice;
  }

  if (query.includes('utilization') || query.includes('high')) {
    let advice = `### 📊 Loan Utilization Breakdown (${overallUtil}% overall)\n\n`;
    advice += `You have spent **${fmt(totalSpent)}** out of your total **${fmt(totalLoanAmount)}** loan budget.\n\n`;
    loanDetails.forEach(l => {
      advice += `• **${l.title}**: ${l.utilizationPct}% utilized (${fmt(l.totalSpent)} spent, ${fmt(l.remaining)} remaining)\n`;
    });
    advice += `\n**Tip**: Keeping overall utilization under 70% preserves a healthy emergency buffer for unexpected expenses!`;
    return advice;
  }

  if (query.includes('save') || query.includes('month') || query.includes('budget')) {
    let advice = `### 💰 Monthly Savings & Budget Plan\n\n`;
    advice += `• **Total Monthly EMI Commitments**: ${fmt(totalMonthlyEmi)}\n`;
    advice += `• **Total Available Loan Buffer**: ${fmt(totalRemaining)}\n\n`;
    advice += `**Action Steps to Save More**:\n`;
    advice += `1. Set aside at least 15% of your income before discretionary spending.\n`;
    advice += `2. Avoid using loan funds for non-essential lifestyle expenses.\n`;
    advice += `3. Redirect monthly savings into pre-paying high-interest debt (**${highestInterestLoan ? highestInterestLoan.title : 'loans'}**).`;
    return advice;
  }

  if (query.includes('repayment') || query.includes('plan') || query.includes('debt')) {
    let advice = `### 📋 Customized Debt Repayment Plan\n\n`;
    advice += `**1. Current Obligations**:\n`;
    loanDetails.forEach(l => {
      advice += `• **${l.title}**: EMI ${fmt(l.emiAmount)} due on ${l.emiDay}th of each month (${l.interestRate}% interest rate)\n`;
    });
    advice += `\n**2. Combined Monthly EMI**: **${fmt(totalMonthlyEmi)}**\n`;
    advice += `**3. Execution**: Automate your EMI payments 2 days before the due date to ensure a clean credit record. Put surplus cash flow toward **${highestInterestLoan ? highestInterestLoan.title : 'high-interest loans'}**.`;
    return advice;
  }

  if (query.includes('fee') || query.includes('expense') || query.includes('spend')) {
    let advice = `### 💸 Recent Spending & Category Analysis\n\n`;
    if (recentExpenses.length > 0) {
      advice += `Here are your recent transactions:\n`;
      recentExpenses.slice(0, 5).forEach(e => {
        advice += `• **${e.title}**: ${fmt(e.amount)} (${e.category}) - ${e.loan?.title || 'Loan'}\n`;
      });
    } else {
      advice += `No recent expense transactions recorded yet.\n`;
    }
    advice += `\n**Tip**: Track categories regularly under the **Expenses** section to avoid overspending on non-essential categories.`;
    return advice;
  }

  // General fallback snapshot
  let advice = `### 🤖 LoanTrack Financial Advisor\n\n`;
  advice += `Here is your real-time financial snapshot:\n\n`;
  advice += `• **Active Loans**: ${loans.length} loans totaling **${fmt(totalLoanAmount)}**\n`;
  advice += `• **Total Amount Spent**: **${fmt(totalSpent)}** (${overallUtil}% overall utilization)\n`;
  advice += `• **Remaining Available Balance**: **${fmt(totalRemaining)}**\n`;
  advice += `• **Total Monthly EMI Commitment**: **${fmt(totalMonthlyEmi)}**\n\n`;
  advice += `Ask me specifically about **reducing your EMI**, **choosing which loan to close first**, **budgeting**, or **debt repayment plans**!`;
  return advice;
}

// @desc  Send message to AI chatbot with user's real financial context
// @route POST /api/ai/chat
exports.chat = async (req, res) => {
  try {
    const { messages } = req.body; // [{ role: 'user'|'assistant', content: '...' }]

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, message: 'Messages are required' });
    }

    const lastUserMessage = messages[messages.length - 1]?.content || '';

    // ── Fetch user's real loan data ──
    const loans = await Loan.find({ user: req.user._id });

    const loanDetails = await Promise.all(loans.map(async (loan) => {
      const expAgg = await Expense.aggregate([
        { $match: { loan: loan._id } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]);
      const totalSpent = expAgg[0]?.total || 0;
      const remaining  = loan.amount - totalSpent;
      const utilPct    = loan.amount > 0 ? ((totalSpent / loan.amount) * 100).toFixed(1) : 0;

      const catAgg = await Expense.aggregate([
        { $match: { loan: loan._id } },
        { $group: { _id: '$category', total: { $sum: '$amount' } } },
        { $sort: { total: -1 } },
        { $limit: 5 }
      ]);

      return {
        title:           loan.title,
        type:            loan.type,
        lender:          loan.lender || 'Unknown',
        totalAmount:     loan.amount,
        interestRate:    loan.interestRate || 0,
        emiAmount:       loan.emiAmount,
        emiDuration:     loan.emiDuration,
        emiDay:          loan.emiDay || 1,
        startDate:       loan.startDate?.toISOString().slice(0, 10),
        status:          loan.status,
        totalSpent,
        remaining:       Math.max(remaining, 0),
        utilizationPct:  utilPct,
        expenseCount:    expAgg[0]?.count || 0,
        topCategories:   catAgg.map(c => `${c._id}: ${fmt(c.total)}`).join(', '),
        monthlyInterest: ((loan.amount * (loan.interestRate / 100)) / 12).toFixed(0),
      };
    }));

    const totalLoanAmount = loanDetails.reduce((s, l) => s + l.totalAmount, 0);
    const totalSpent      = loanDetails.reduce((s, l) => s + l.totalSpent,  0);
    const totalRemaining  = loanDetails.reduce((s, l) => s + l.remaining,   0);
    const overallUtil     = totalLoanAmount > 0
      ? ((totalSpent / totalLoanAmount) * 100).toFixed(1)
      : 0;

    // Recent expenses
    const recentExpenses = await Expense.find({ user: req.user._id })
      .sort({ date: -1 })
      .limit(10)
      .populate('loan', 'title');

    const contextData = {
      loans,
      loanDetails,
      totalLoanAmount,
      totalSpent,
      totalRemaining,
      overallUtil,
      recentExpenses
    };

    // ── Check if Groq API key is configured ──
    const apiKey = process.env.GROQ_API_KEY;
    const modelName = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

    if (apiKey && apiKey.trim() !== '') {
      try {
        const systemPrompt = `You are LoanTrack AI, a smart and friendly personal finance advisor embedded inside the LoanTrack app. You help users understand and manage their loans and expenses.

You have access to this user's REAL financial data right now:
📊 OVERALL SUMMARY: Total Loans: ${loans.length}, Total Loan Amount: ${fmt(totalLoanAmount)}, Total Spent: ${fmt(totalSpent)}, Remaining: ${fmt(totalRemaining)}, Utilization: ${overallUtil}%
🏦 INDIVIDUAL LOANS:
${loanDetails.map(l => `- ${l.title}: Amount ${fmt(l.totalAmount)}, Rate ${l.interestRate}%, EMI ${fmt(l.emiAmount)}, Spent ${fmt(l.totalSpent)}, Remaining ${fmt(l.remaining)}`).join('\n')}

INSTRUCTIONS:
- Always refer to user's ACTUAL data above when answering
- Give specific, actionable advice based on their real numbers in Indian Rupee format (Rs.)
- Keep answers concise, clear and structured.`;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: modelName,
            messages: [{ role: 'system', content: systemPrompt }, ...messages],
            temperature: 0.7,
            max_tokens: 1024
          })
        });

        if (response.ok) {
          const data = await response.json();
          const aiReply = data.choices?.[0]?.message?.content;
          if (aiReply) {
            return res.json({ success: true, reply: aiReply });
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.warn('Groq API Error response, falling back to smart advice generator:', errorData);
        }
      } catch (err) {
        console.warn('Groq API network/fetch error, falling back to smart advice generator:', err.message);
      }
    }

    // ── Smart Fallback Advice Generator (works instantly without requiring external API keys) ──
    const fallbackAdvice = generateSmartAdvice(lastUserMessage, contextData);
    return res.json({ success: true, reply: fallbackAdvice });

  } catch (error) {
    console.error('AI Chat Controller Error:', error);
    res.status(500).json({
      success: false,
      message: 'AI service error: ' + (error.message || 'Unknown error')
    });
  }
};
