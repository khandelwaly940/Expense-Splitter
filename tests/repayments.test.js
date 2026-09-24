import test from 'node:test';
import assert from 'node:assert/strict';
import { repaymentRows, repaymentGroups, updateRepayment } from '../src/utils/repayments.js';
import { paymentsFor, updateExpenseField } from '../src/utils/expenses.js';
import { calculateBalances } from '../src/utils/calculations.js';
import { buildSnapshot, normalizeTrip, tripFromShare } from '../src/utils/trips.js';
const expense = () => ({ id:'dinner', item:'Dinner', date:'2026-09-20', amount:1500, paidBy:'John', splitAmong:['John','Ritika','Mohan'], payments:[
  {id:'a',paidBy:'John',paymentMethod:'Card',amount:600},
  {id:'b',paidBy:'John',paymentMethod:'UPI',amount:400},
  {id:'c',paidBy:'Ritika',paymentMethod:'Card',amount:500},
] });
test('repayments allocate own share once per payer across contributions',()=>{
  const e=expense();
  assert.deepEqual(repaymentRows([e]).map(r=>[r.own,r.repay]),[[300,600],[200,400],[500,500]]);
  const excluded={...e,payments:e.payments.map(p=>({...p,includeOwnShare:false}))};
  assert.deepEqual(repaymentRows([excluded]).map(r=>r.repay),[300,200,0]);
  assert.equal(repaymentGroups([excluded]).length,3);
  assert.deepEqual(calculateBalances(e.splitAmong,[excluded]),calculateBalances(e.splitAmong,[e]));
});
test('payer-only, outsider, underfunded payer and cents stay nonnegative and proportional',()=>{
  let e=expense(); e.payments=e.payments.map(p=>({...p,includeOwnShare:false}));
  assert.deepEqual(repaymentRows([{...e,splitAmong:[]}]).map(r=>r.repay),[0,0,0]);
  assert.deepEqual(repaymentRows([{...e,splitAmong:['Mohan']}]).map(r=>r.repay),[600,400,500]);
  e={...e,amount:.03,splitAmong:['John'],payments:[{paidBy:'John',amount:.01,paymentMethod:'A',includeOwnShare:false},{paidBy:'John',amount:.01,paymentMethod:'B',includeOwnShare:false},{paidBy:'Ritika',amount:.01,paymentMethod:'C',includeOwnShare:false}]};
  const rows=repaymentRows([e]);
  assert.equal(rows[0].own+rows[1].own,.03);
  assert.deepEqual(rows.map(r=>r.repay),[0,0,.01]);
});
test('row options affect only one contribution; explicit custom zero and reset work',()=>{
  const e=expense(), before=JSON.stringify(e);
  const changed=updateRepayment(e,1,{repayAmountOverride:0,noteAmount:42,noteText:'Private note'});
  assert.equal(repaymentRows([changed])[1].repay,0);
  assert.equal(repaymentRows([changed])[0].repay,600);
  assert.equal(repaymentRows([updateRepayment(changed,1,{repayAmountOverride:null})])[1].repay,400);
  assert.equal(JSON.stringify(e),before);
  assert.deepEqual(calculateBalances(e.splitAmong,[changed]),calculateBalances(e.splitAmong,[e]));
});
test('repayment metadata round trips when included and is stripped when excluded',()=>{
  const e=updateRepayment(expense(),1,{includeOwnShare:false,repayAmountOverride:123,noteAmount:42,noteText:'Private note'});
  const trip=normalizeTrip({participants:e.splitAmong,expenses:[e]});
  const included=buildSnapshot(trip,[],{repay:true});
  assert.deepEqual(repaymentRows(tripFromShare(included).expenses).map(r=>r.repay),[600,123,500]);
  const excluded=buildSnapshot(trip,[],{repay:false});
  assert.equal(JSON.stringify(excluded).includes('Private note'),false);
  assert.ok(excluded.trip.expenses[0].payments.every(p=>p.repayAmountOverride===undefined && p.includeOwnShare===undefined));
  included.trip.expenses[0].payments[1].noteAmount=-1;
  assert.equal(tripFromShare(included),null);
});

test('adding another contribution preserves the original contribution accounting settings',()=>{
 const e={id:'old',item:'Dinner',date:'2026-09-20',amount:100,paidBy:'John',splitAmong:['John'],paymentMethod:'Card',includeOwnShare:false,noteText:'Keep this'};
 const next=updateExpenseField(e,'payments',[...paymentsFor(e),{id:'new',paidBy:'John',amount:50,paymentMethod:'UPI'}]);
 assert.equal(next.payments[0].noteText,'Keep this');
 assert.equal(next.payments[0].includeOwnShare,false);
 assert.equal(next.payments[1].includeOwnShare,undefined);
});
