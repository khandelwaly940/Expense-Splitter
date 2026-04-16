/**
 * Expense calculation engine.
 * Extracted from ExpenseSplitter monolith for modularity.
 */

/**
 * Calculate per-person balances (paid, share, net).
 * @param {string[]} participants
 * @param {object[]} expenses
 * @returns {{ name: string, paid: number, share: number, balance: number }[]}
 */
export function calculateBalances(participants, expenses) {
  const balanceMap = {};
  participants.forEach(p => {
    balanceMap[p] = { paid: 0, share: 0 };
  });

  expenses.forEach(expense => {
    const amount = parseFloat(expense.amount) || 0;
    const payer = expense.paidBy;
    const beneficiaries = expense.splitAmong.filter(p => participants.includes(p));
    const validBeneficiaries = beneficiaries.length > 0 ? beneficiaries : [payer];
    const costPerPerson = amount / validBeneficiaries.length;

    if (balanceMap[payer]) {
      balanceMap[payer].paid += amount;
    }

    validBeneficiaries.forEach(person => {
      if (balanceMap[person]) {
        balanceMap[person].share += costPerPerson;
      }
    });
  });

  return participants.map(p => ({
    name: p,
    paid: balanceMap[p].paid,
    share: balanceMap[p].share,
    balance: balanceMap[p].paid - balanceMap[p].share,
  }));
}

/**
 * Smart Settle — greedy algorithm to minimize transactions.
 * @param {{ name: string, balance: number }[]} balances
 * @returns {{ from: string, to: string, amount: number, reason: string }[]}
 */
export function calculateSmartSettlements(balances) {
  const debtors = balances
    .filter(b => b.balance < -0.01)
    .map(b => ({ ...b }));
  const creditors = balances
    .filter(b => b.balance > 0.01)
    .map(b => ({ ...b }));

  debtors.sort((a, b) => a.balance - b.balance);
  creditors.sort((a, b) => b.balance - a.balance);

  const transactions = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(Math.abs(debtor.balance), creditor.balance);

    transactions.push({
      from: debtor.name,
      to: creditor.name,
      amount,
      reason: 'Settlement',
    });

    debtor.balance += amount;
    creditor.balance -= amount;

    if (Math.abs(debtor.balance) < 0.01) i++;
    if (creditor.balance < 0.01) j++;
  }

  return transactions;
}

/**
 * Itemized settlements — aggregated by person pair with item breakdown.
 * @param {string[]} participants
 * @param {object[]} expenses
 * @returns {{ from: string, to: string, amount: number, items: object[], id: string }[]}
 */
export function calculateItemizedSettlements(participants, expenses) {
  const map = new Map();

  expenses.forEach(expense => {
    const amount = parseFloat(expense.amount) || 0;
    const payer = expense.paidBy;
    const beneficiaries = expense.splitAmong.filter(p => participants.includes(p));

    if (beneficiaries.length === 0) return;

    const costPerPerson = amount / beneficiaries.length;

    beneficiaries.forEach(person => {
      if (person !== payer) {
        const key = `${person}-${payer}`;
        if (!map.has(key)) {
          map.set(key, {
            from: person,
            to: payer,
            amount: 0,
            items: [],
            id: key,
          });
        }
        const entry = map.get(key);
        entry.amount += costPerPerson;
        entry.items.push({
          reason: expense.item || 'Untitled',
          amount: costPerPerson,
        });
      }
    });
  });

  return Array.from(map.values());
}

/**
 * Calculate how much each paidBy person owes back to their payment method(s).
 *
 * For each expense tagged with a paymentMethod:
 *   - othersShare = sum of cost-per-person for splitAmong members who ≠ paidBy
 *   - ownShare    = cost-per-person for paidBy (if they are in splitAmong), else 0
 *   - repayAmount = othersShare + (expense.includeOwnShare ? ownShare : 0)
 *
 * Results are grouped by (paidBy, paymentMethod) and aggregated.
 *
 * @param {object[]} expenses
 * @returns {{ paidBy: string, paymentMethod: string, amount: number, includeOwnShare: boolean, expenseIds: number[] }[]}
 */
export function calculateRepayments(expenses) {
  const map = new Map(); // key: "paidBy::paymentMethod"

  expenses.forEach(expense => {
    if (!expense.paymentMethod) return; // skip untagged expenses

    const amount = parseFloat(expense.amount) || 0;
    if (amount === 0) return;

    const payer = expense.paidBy;
    const method = expense.paymentMethod;
    const splitAmong = expense.splitAmong || [];
    const includeOwnShare = expense.includeOwnShare || false;

    // Effective split list: if empty, treat as [payer]
    const members = splitAmong.length > 0 ? splitAmong : [payer];
    const costPerPerson = amount / members.length;

    const othersShare = members
      .filter(p => p !== payer)
      .reduce(acc => acc + costPerPerson, 0);
    const ownShare = members.includes(payer) ? costPerPerson : 0;
    const repayAmount = othersShare + (includeOwnShare ? ownShare : 0);

    const key = `${payer}::${method}`;
    if (!map.has(key)) {
      map.set(key, {
        paidBy: payer,
        paymentMethod: method,
        amount: 0,
        // per-expense includeOwnShare is displayed individually in the panel,
        // here we just aggregate for the summary total
        expenseIds: [],
      });
    }
    const entry = map.get(key);
    entry.amount += repayAmount;
    entry.expenseIds.push(expense.id);
  });

  return Array.from(map.values());
}
