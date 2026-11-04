(function () {
  'use strict';
  const num = (p, k) => Number(p[k]);
  const finite = (...v) => v.every(Number.isFinite);
  const nonneg = (...v) => v.every(x => Number.isFinite(x) && x >= 0);
  const positive = (...v) => v.every(x => Number.isFinite(x) && x > 0);
  const pct = x => Number.isFinite(x) && x >= 0 && x <= 100;
  const fmt = (v, digits=2) => Number(v).toLocaleString('en-US', { maximumFractionDigits: digits });
  const money = (v, currency='USD') => {
    try { return new Intl.NumberFormat('en-US', { style:'currency', currency, maximumFractionDigits:2 }).format(v); }
    catch (_) { return `${currency} ${fmt(v)}`; }
  };
  const bad = message => ({ error: message });
  const calculators = {
    'hourly-rate'(p) {
      const take = num(p,'desiredMonthlyTakeHome'), expenses = num(p,'monthlyExpenses'), reserve = num(p,'taxReserveRate'), hours = num(p,'billableHoursPerWeek'), weeks = num(p,'workingWeeksPerYear');
      if (!positive(take,hours,weeks) || !nonneg(expenses) || !pct(reserve) || reserve >= 100 || hours > 168 || weeks > 52) return bad('Enter a positive income target, billable hours and working weeks (up to 52), non-negative expenses, and a reserve rate below 100%.');
      const annualExpenses = expenses * 12, annualTake = take * 12;
      const requiredRevenue = annualExpenses + annualTake / (1 - reserve/100);
      const annualHours = hours * weeks;
      const rate = requiredRevenue / annualHours;
      const c = p.currency || 'USD';
      return { main: `${money(rate,c)} per billable hour`, details: [`Required annual revenue: ${money(requiredRevenue,c)}`,`Annual business expenses: ${money(annualExpenses,c)}`,`Target annual take-home: ${money(annualTake,c)}`,`Annual billable hours: ${fmt(annualHours,1)}`,`Weekly revenue target: ${money(requiredRevenue/weeks,c)}`], note:'The selected reserve percentage is applied to revenue remaining after the stated business expenses. This is a planning model, not a tax calculation.' };
    },
    'project-quote'(p) {
      const hours=num(p,'estimatedHours'), revisions=num(p,'revisionHours'), rate=num(p,'hourlyRate'), expenses=num(p,'directExpenses'), buffer=num(p,'contingencyRate');
      if (!positive(hours,rate) || !nonneg(revisions,expenses) || !pct(buffer) || hours+revisions>10000) return bad('Enter positive project hours and rate, non-negative revisions and expenses, and a contingency percentage from 0% to 100%.');
      const labor=(hours+revisions)*rate, base=labor+expenses, contingency=base*buffer/100, quote=base+contingency, c=p.currency||'USD';
      return { main: money(quote,c), details:[`Production and revision time: ${fmt(hours+revisions,2)} hours`,`Labor value: ${money(labor,c)}`,`Direct expenses: ${money(expenses,c)}`,`Contingency allowance: ${money(contingency,c)}`,`Subtotal before contingency: ${money(base,c)}`], note:'This is a quote-planning estimate. Define deliverables, revision limits, milestones, and out-of-scope work separately.' };
    },
    'day-rate'(p) {
      const take=num(p,'desiredMonthlyTakeHome'), expenses=num(p,'monthlyExpenses'), reserve=num(p,'taxReserveRate'), days=num(p,'billableDaysPerMonth');
      if (!positive(take,days) || !nonneg(expenses) || !pct(reserve) || reserve>=100 || days>31) return bad('Enter a positive take-home goal and 1–31 billable days, non-negative expenses, and a reserve rate below 100%.');
      const revenue=expenses+take/(1-reserve/100), rate=revenue/days, c=p.currency||'USD';
      return { main:`${money(rate,c)} per billable day`, details:[`Required monthly revenue: ${money(revenue,c)}`,`Monthly business expenses: ${money(expenses,c)}`,`Target monthly take-home: ${money(take,c)}`,`Billable days: ${fmt(days,2)}`], note:'Uses a user-selected reserve percentage and estimated billable days. It does not determine legal tax or employment obligations.' };
    },
    'cleaning-price'(p) {
      const area=num(p,'area'), rate=num(p,'ratePerUnit'), addons=num(p,'addOnServices'), supplies=num(p,'suppliesCost'), travel=num(p,'travelCost'), discount=num(p,'discountRate');
      if (!positive(area,rate) || !nonneg(addons,supplies,travel) || !pct(discount)) return bad('Enter positive area and rate, non-negative additional costs, and a discount from 0% to 100%.');
      const areaCharge=area*rate, subtotal=areaCharge+addons+supplies+travel, discountValue=subtotal*discount/100, total=subtotal-discountValue, unit=p.areaUnit==='sqft'?'sq ft':'m²', c=p.currency||'USD';
      return { main:money(total,c), details:[`Area charge (${fmt(area,2)} ${unit} × ${money(rate,c)} per ${unit}): ${money(areaCharge,c)}`,`Add-on services: ${money(addons,c)}`,`Supplies and travel: ${money(supplies+travel,c)}`,`Discount: ${money(discountValue,c)}`,`Subtotal before discount: ${money(subtotal,c)}`], note:'The area rate and add-ons are supplied by you. Confirm property condition, included tasks, and the agreed scope before quoting.' };
    },
    'daily-worker-pay'(p) {
      const days=num(p,'workDays'), hours=num(p,'hoursPerDay'), regular=num(p,'regularHoursPerDay'), rate=num(p,'hourlyRate'), mult=num(p,'overtimeMultiplier'), allowance=num(p,'allowances'), advance=num(p,'advances');
      if (!positive(days,hours,regular,rate,mult) || !nonneg(allowance,advance) || hours>24 || regular>24 || mult<1 || mult>5) return bad('Enter positive days, hours, rate, and multiplier (1–5); hours per day cannot exceed 24 and other amounts must be non-negative.');
      const reg=days*Math.min(hours,regular)*rate, ot=days*Math.max(hours-regular,0)*rate*mult, gross=reg+ot+allowance;
      if (advance>gross) return bad('Advances cannot exceed the estimated gross payment. Check the amounts or calculate the remaining balance separately.');
      const net=gross-advance, c=p.currency||'USD';
      return { main:money(net,c), details:[`Regular pay: ${money(reg,c)}`,`Overtime pay at ${fmt(mult,2)}×: ${money(ot,c)}`,`Allowances: ${money(allowance,c)}`,`Estimated gross amount: ${money(gross,c)}`,`Advances deducted: ${money(advance,c)}`], note:'The regular-hours threshold and overtime multiplier are user-entered assumptions, not statements of statutory pay or labor-law compliance.' };
    },
    'gig-earnings'(p) {
      const jobs=num(p,'jobEarnings'), tips=num(p,'tips'), incentives=num(p,'incentives'), fee=num(p,'platformFeeRate'), distance=num(p,'distance'), cost=num(p,'operatingCostPerUnit'), expenses=num(p,'otherExpenses'), hours=num(p,'activeHours');
      if (!nonneg(jobs,tips,incentives,distance,cost,expenses) || !positive(hours) || !pct(fee)) return bad('Enter non-negative earnings, costs, distance, and expenses; active hours must be positive and platform fee must be 0%–100%.');
      const feeAmount=(jobs+incentives)*fee/100, vehicle=distance*cost, net=jobs+tips+incentives-feeAmount-vehicle-expenses, c=p.currency||'USD', unit=p.distanceUnit==='mi'?'miles':'km';
      return { main:money(net,c), details:[`Fares/job earnings plus incentives: ${money(jobs+incentives,c)}`,`Tips: ${money(tips,c)}`,`Platform fee: ${money(feeAmount,c)}`,`Vehicle operating cost (${fmt(distance,2)} ${unit}): ${money(vehicle,c)}`,`Other expenses: ${money(expenses,c)}`,`Estimated net per active hour: ${money(net/hours,c)}`], note:'The platform fee is applied to job earnings and incentives, not tips, as a modeling assumption. Confirm the actual platform fee base and include all relevant work time and vehicle costs.' };
    },
    'platform-fee'(p) {
      const amount=num(p,'saleAmount'), count=num(p,'transactionCount'), pr=num(p,'platformRate'), pf=num(p,'platformFixedFee'), payr=num(p,'paymentRate'), payf=num(p,'paymentFixedFee');
      if (!positive(amount,count) || !Number.isInteger(count) || !pct(pr) || !pct(payr) || !nonneg(pf,payf)) return bad('Enter a positive sale amount and whole transaction count, fee rates from 0% to 100%, and non-negative fixed fees.');
      const gross=amount*count, platform=gross*pr/100+count*pf, processing=gross*payr/100+count*payf, fees=platform+processing, payout=gross-fees, c=p.currency||'USD';
      return { main:money(payout,c), details:[`Gross sales: ${money(gross,c)}`,`Platform fees: ${money(platform,c)}`,`Payment processing fees: ${money(processing,c)}`,`Total fees: ${money(fees,c)}`,`Effective fee rate: ${fmt(gross ? fees/gross*100 : 0)}%`], note:payout<0?'The modeled fees exceed gross sales. Check the fixed-fee inputs and provider schedule.':'Actual provider charges may vary by plan, country, payment method, currency, refunds, and taxes.' };
    },
    'invoice'(p) {
      const hours=num(p,'hours'), rate=num(p,'hourlyRate'), services=num(p,'additionalServices'), expenses=num(p,'reimbursableExpenses'), discount=num(p,'discountRate'), tax=num(p,'taxRate'), paid=num(p,'amountPaid');
      if (!nonneg(hours,rate,services,expenses,paid) || (hours*rate+services+expenses)<=0 || (hours>0 && rate<=0) || !pct(discount) || !pct(tax)) return bad('Enter non-negative hours, rates, services, expenses, and payments; use a positive rate when hours are entered, include at least one charge, and keep discount/tax assumptions from 0% to 100%.');
      const labor=hours*rate, serviceSubtotal=labor+services, discountValue=serviceSubtotal*discount/100, discountedServices=serviceSubtotal-discountValue, taxValue=discountedServices*tax/100, total=discountedServices+expenses+taxValue;
      if (paid>total) return bad('The amount already paid is greater than this estimated invoice total. Check the payment or charge inputs.');
      const c=p.currency||'USD';
      return { main:money(total-paid,c), details:[`Labor: ${money(labor,c)}`,`Additional services: ${money(services,c)}`,`Discount: −${money(discountValue,c)}`,`Reimbursable expenses: ${money(expenses,c)}`,`Estimated tax: ${money(taxValue,c)}`,`Invoice total: ${money(total,c)}`,`Already paid: ${money(paid,c)}`], note:'The tax assumption is applied only to discounted services in this model; real tax treatment of services and reimbursements depends on local rules.' };
    },
    'late-invoice'(p) {
      const principal=num(p,'invoiceAmount'), days=num(p,'daysLate'), annual=num(p,'annualInterestRate'), late=num(p,'lateFeeRate'), admin=num(p,'adminFee');
      if (!positive(principal) || !Number.isInteger(days) || days<0 || days>36500 || !Number.isFinite(annual) || annual<0 || annual>1000 || !pct(late) || !nonneg(admin)) return bad('Enter a positive principal, whole overdue days, an annual rate from 0% to 1,000%, a one-time fee from 0% to 100%, and a non-negative fixed fee.');
      const interest=principal*annual/100*days/365, lateValue=principal*late/100, total=principal+interest+lateValue+admin, c=p.currency||'USD';
      return { main:money(total,c), details:[`Original principal: ${money(principal,c)}`,`Simple interest for ${fmt(days,0)} days: ${money(interest,c)}`,`One-time late fee: ${money(lateValue,c)}`,`Fixed administration fee: ${money(admin,c)}`,`Estimated additional charges: ${money(interest+lateValue+admin,c)}`], note:'Interest is simple (not compounded) and uses a 365-day year. This does not determine whether fees or interest are enforceable under your contract or local law.' };
    },
    'tax-set-aside'(p) {
      const gross=num(p,'grossRevenue'), expenses=num(p,'businessExpenses'), rate=num(p,'reserveRate'), saved=num(p,'alreadyReserved');
      if (!positive(gross) || !nonneg(expenses,saved) || expenses>gross || !pct(rate)) return bad('Enter positive revenue, expenses not exceeding revenue, a reserve rate from 0% to 100%, and non-negative savings already set aside.');
      const profit=gross-expenses, target=profit*rate/100, additional=Math.max(target-saved,0), c=p.currency||'USD';
      return { main:money(additional,c), details:[`Estimated profit after expenses: ${money(profit,c)}`,`Target reserve at ${fmt(rate)}%: ${money(target,c)}`,`Already reserved: ${money(saved,c)}`,`Additional amount to set aside: ${money(additional,c)}`,`Profit remaining after target reserve: ${money(profit-target,c)}`], note:'The reserve rate is a cash-planning assumption only. It is not a tax estimate and does not identify deductible expenses or filing obligations.' };
    },
    'freelancer-break-even-calculator'(p) {
      const fixed=num(p,'fixedMonthlyCosts'), price=num(p,'averageProjectPrice'), variable=num(p,'variableCostPerProject'), owner=num(p,'targetOwnerPay');
      if (!positive(fixed,price) || !nonneg(variable,owner) || price<=variable) return bad('Enter positive fixed costs and project revenue, non-negative variable costs and owner-pay goal, and project revenue greater than variable cost.');
      const margin=price-variable, breakEven=Math.ceil(fixed/margin), target=Math.ceil((fixed+owner)/margin), c=p.currency||'USD';
      return { main:`${fmt(target,0)} projects per month`, details:[`Contribution per project: ${money(margin,c)}`,`Projects to cover fixed costs: ${fmt(breakEven,0)}`,`Projects to cover costs and target owner income: ${fmt(target,0)}`,`Revenue at target project count: ${money(target*price,c)}`,`Contribution after fixed costs at target: ${money(target*margin-fixed,c)}`], note:'Project counts are rounded up to whole projects. This simplified model excludes taxes, irregular cash flow, capacity, financing, and differences between project sizes.' };
    }
  };
  if (typeof globalThis !== 'undefined') globalThis.CalcDailyFreelanceCalculators = calculators;
  function init() {
    const kind=document.body && document.body.dataset.freelanceCalculator;
    const calc=calculators[kind];
    const form=document.getElementById('freelance-calc-form');
    if (!calc || !form) return;
    const read=()=>{ const p={}; form.querySelectorAll('input,select').forEach(el=>p[el.id]=el.value); return p; };
    const render=()=>{
      const result=calc(read());
      const main=document.getElementById('result-main'), details=document.getElementById('result-details'), note=document.getElementById('result-note');
      if (!main || !details || !note) return;
      main.textContent=result.error?'Check your inputs':result.main;
      details.textContent=result.error?result.error:(result.details||[]).join('\n');
      note.textContent=result.error?'No estimate was produced until the inputs are corrected.':(result.note||'');
    };
    form.addEventListener('submit',e=>{e.preventDefault();render();});
    form.querySelectorAll('input,select').forEach(el=>{el.addEventListener('input',render);el.addEventListener('change',render);});
    render();
  }
  if (typeof document!=='undefined') { if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init(); }
})();
