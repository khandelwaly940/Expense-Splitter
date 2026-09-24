import { payersFor, methodsFor } from './expenses.js';
export const emptyFilters = { description: '', paidBy: '', splitWith: '', method: '', minAmount: '', maxAmount: '', fromDate: '', toDate: '', sort: 'date-desc', rules: [], match: 'all' };

export function matchesRule(expense, rule, participants = []) {
  const { field, operator = 'is', values = [], value = '', from = '', to = '' } = rule;
  if (field === 'splitWith') {
    const members = [...new Set(expense.splitAmong || [])];
    if (operator === 'one') return members.length === 1;
    if (operator === 'two') return members.length === 2;
    if (operator === 'none') return members.length === 0;
    if (operator === 'everyone') return participants.length > 0 && members.length === participants.length && participants.every(p => members.includes(p));
    if (operator === 'exact') return members.length === values.length && values.every(p => members.includes(p));
  }
  if (field === 'description') {
    if (!value.trim()) return true;
    const match = (expense.item || '').toLowerCase().includes(value.trim().toLowerCase());
    return operator === 'not' ? !match : match;
  }
  if (field === 'amount') {
    const amount = Number(expense.amount) || 0;
    return (from === '' || amount >= Number(from)) && (to === '' || amount <= Number(to));
  }
  if (field === 'date') return (!from || expense.date >= from) && (!to || expense.date <= to);
  if (!values.length) return true;
  const actual = field === 'splitWith' ? expense.splitAmong || [] : field === 'method' ? methodsFor(expense) : payersFor(expense);
  const found = operator === 'every' ? values.every(v => actual.includes(v)) : values.some(v => actual.includes(v));
  return operator === 'not' ? !found : found;
}

export function filterExpenses(expenses, filters, participants = []) {
  const matches = expenses.filter(e => {
    const amount = Number(e.amount) || 0;
    const rules = (filters.rules || []).filter(rule => rule.field === 'splitWith' && ['one', 'two', 'none', 'everyone'].includes(rule.operator) ? true : ['amount', 'date'].includes(rule.field) ? rule.from !== '' || rule.to !== '' : rule.field === 'description' ? !!rule.value?.trim() : !!rule.values?.length);
    const ruleMatch = !rules.length || (filters.match === 'any' ? rules.some(rule => matchesRule(e, rule, participants)) : rules.every(rule => matchesRule(e, rule, participants)));
    return ruleMatch && (!filters.description || (e.item || '').toLowerCase().includes(filters.description.toLowerCase()))
      && (!filters.paidBy || payersFor(e).includes(filters.paidBy))
      && (!filters.splitWith || (e.splitAmong || []).includes(filters.splitWith))
      && (!filters.method || methodsFor(e).includes(filters.method))
      && (filters.minAmount === '' || amount >= Number(filters.minAmount))
      && (filters.maxAmount === '' || amount <= Number(filters.maxAmount))
      && (!filters.fromDate || e.date >= filters.fromDate)
      && (!filters.toDate || e.date <= filters.toDate);
  });
  const [field, direction] = filters.sort.split('-');
  const valueFor = e => {
    if (field === 'amount') return Number(e.amount) || 0;
    if (field === 'description') return (e.item || '').toLowerCase();
    if (field === 'paidBy') return payersFor(e).join(', ').toLowerCase();
    if (field === 'splitWith') return (e.splitAmong || []).join(', ').toLowerCase();
    if (field === 'method') return methodsFor(e).join(', ').toLowerCase();
    return e.date || '';
  };
  return matches.sort((a, b) => {
    const av = valueFor(a);
    const bv = valueFor(b);
    return (av < bv ? -1 : av > bv ? 1 : 0) * (direction === 'asc' ? 1 : -1);
  });
}

export function filterError(filters) {
  const rules = filters.rules || [];
  if (!rules.length) return 'Add a condition.';
  for (const rule of rules) {
    if (['paidBy', 'method', 'splitWith'].includes(rule.field) && !['one', 'two', 'everyone', 'none'].includes(rule.operator) && !rule.values?.length) return 'Choose at least one person or method.';
    if (rule.field === 'description' && !rule.value?.trim()) return 'Enter description text.';
    if (['amount', 'date'].includes(rule.field)) {
      const from = rule.from ?? '', to = rule.to ?? '';
      if (from === '' && to === '') return 'Enter at least one range limit.';
      if (rule.field === 'amount') {
        if ([from, to].some(v => v !== '' && (!Number.isFinite(Number(v)) || Number(v) < 0))) return 'Enter a valid positive amount or zero.';
        if (from !== '' && to !== '' && Number(from) > Number(to)) return 'Minimum must not exceed maximum.';
      } else {
        if ([from, to].some(v => v && (!/^\d{4}-\d{2}-\d{2}$/.test(v) || !Number.isFinite(Date.parse(v)) || new Date(v).toISOString().slice(0, 10) !== v))) return 'Choose a valid date.';
        if (from && to && from > to) return 'From date must not follow To date.';
      }
    }
  }
  return '';
}
