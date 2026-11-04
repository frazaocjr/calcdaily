(function () {
  'use strict';

  const DAY_MS = 86400000;
  const number = (value) => Number(value);
  const validPositive = (...values) => values.every((v) => Number.isFinite(v) && v > 0);
  const validNonNegative = (...values) => values.every((v) => Number.isFinite(v) && v >= 0);
  const round = (value, digits = 2) => Number(value.toFixed(digits));
  const fmt = (value, digits = 2) => Number(value).toLocaleString('en-US', { maximumFractionDigits: digits });
  const money = (value, currency = 'USD') => {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
    } catch (_) {
      return `${currency} ${fmt(value)}`;
    }
  };
  const dateParts = (iso) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!match) return null;
    const y = Number(match[1]), m = Number(match[2]) - 1, d = Number(match[3]);
    const date = new Date(Date.UTC(y, m, d));
    if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m || date.getUTCDate() !== d) return null;
    return date;
  };
  const dateLabel = (date) => date.toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' });
  const dayCount = (start, end) => Math.round((end.getTime() - start.getTime()) / DAY_MS);
  const areaToM2 = (value, unit) => unit === 'ft' ? value * 0.09290304 : value;
  const lengthToM = (value, unit) => unit === 'ft' ? value * 0.3048 : value;
  const volumeToM3 = (value, unit) => unit === 'ft' ? value * 0.028316846592 : value;

  const calculators = {
    date(p) {
      const start = dateParts(p.startDate);
      const end = dateParts(p.endDate);
      const shift = number(p.shiftDays);
      if (!start || !end || !Number.isInteger(shift)) return { error: 'Enter valid dates and a whole number of days to add or subtract.' };
      const signedDays = dayCount(start, end);
      let businessDays = 0;
      const direction = signedDays >= 0 ? 1 : -1;
      for (let i = 1; i <= Math.abs(signedDays); i++) {
        const d = new Date(start.getTime() + direction * i * DAY_MS);
        const weekday = d.getUTCDay();
        if (weekday !== 0 && weekday !== 6) businessDays++;
      }
      const shifted = new Date(start.getTime() + shift * DAY_MS);
      const absDays = Math.abs(signedDays);
      return {
        main: `${fmt(absDays, 0)} calendar days`,
        details: [
          `Direction: ${signedDays < 0 ? 'end date is before start date' : 'end date is on or after start date'}`,
          `Equivalent to ${fmt(Math.floor(absDays / 7), 0)} full weeks and ${fmt(absDays % 7, 0)} days`,
          `Weekdays between the dates (excluding the start date): ${fmt(businessDays, 0)}`,
          `Start date plus ${shift} days: ${dateLabel(shifted)}`
        ],
        note: 'Calendar-day differences do not automatically account for public holidays, local work schedules, or legal date-counting rules.'
      };
    },

    incomeTax(p) {
      const gross = number(p.grossIncome), deductions = number(p.deductions), rate = number(p.taxRate);
      if (!validPositive(gross) || !validNonNegative(deductions) || deductions > gross || !Number.isFinite(rate) || rate < 0 || rate > 100) {
        return { error: 'Enter a positive gross income, deductions between zero and income, and a tax rate from 0% to 100%.' };
      }
      const taxable = gross - deductions;
      const tax = taxable * rate / 100;
      const net = gross - tax;
      const currency = p.currency || 'USD';
      return {
        main: money(net, currency),
        details: [
          `Estimated taxable income: ${money(taxable, currency)}`,
          `Estimated tax at ${fmt(rate)}%: ${money(tax, currency)}`,
          `Gross income: ${money(gross, currency)}`,
          `Estimated net income: ${money(net, currency)}`
        ],
        note: 'This is a user-defined flat-rate estimate, not a country-specific tax calculation. It does not apply tax brackets, credits, payroll taxes, local rules, or filing adjustments.'
      };
    },

    retirement(p) {
      const balance = number(p.currentSavings), contribution = number(p.monthlyContribution);
      const annualReturn = number(p.annualReturn), years = number(p.years), inflation = number(p.inflation);
      if (!validNonNegative(balance, contribution) || !Number.isFinite(annualReturn) || annualReturn <= -100 || !validPositive(years) || years > 100 || !Number.isFinite(inflation) || inflation < 0 || inflation > 50) {
        return { error: 'Use non-negative savings and contributions, a return above -100%, 0–100 years, and inflation from 0% to 50%.' };
      }
      const months = Math.round(years * 12);
      const monthlyRate = Math.pow(1 + annualReturn / 100, 1 / 12) - 1;
      const growth = Math.pow(1 + monthlyRate, months);
      const futureBalance = balance * growth + (Math.abs(monthlyRate) < 1e-12 ? contribution * months : contribution * ((growth - 1) / monthlyRate));
      const totalContributions = balance + contribution * months;
      const investmentGrowth = futureBalance - totalContributions;
      const realBalance = futureBalance / Math.pow(1 + inflation / 100, years);
      const currency = p.currency || 'USD';
      return {
        main: money(futureBalance, currency),
        details: [
          `Estimated future balance: ${money(futureBalance, currency)}`,
          `Value in today's purchasing power: ${money(realBalance, currency)}`,
          `Starting savings plus contributions: ${money(totalContributions, currency)}`,
          `Estimated investment growth: ${money(investmentGrowth, currency)}`,
          `Projection period: ${fmt(years)} years (${fmt(months, 0)} monthly periods)`
        ],
        note: 'A mathematical projection only. Returns are assumed constant, contributions are made at the end of each month, and taxes, fees, volatility, and contribution changes are excluded.'
      };
    },

    paycheck(p) {
      const gross = number(p.grossPay), taxRate = number(p.taxRate), otherRate = number(p.otherRate);
      const periods = { weekly: 52, biweekly: 26, semimonthly: 24, monthly: 12 }[p.frequency];
      if (!validPositive(gross) || !Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100 || !Number.isFinite(otherRate) || otherRate < 0 || otherRate > 100 || taxRate + otherRate > 100 || !periods) {
        return { error: 'Enter positive gross pay and valid withholding percentages whose combined total does not exceed 100%.' };
      }
      const taxes = gross * taxRate / 100;
      const deductions = gross * otherRate / 100;
      const net = gross - taxes - deductions;
      const currency = p.currency || 'USD';
      return {
        main: money(net, currency),
        details: [
          `Gross pay per period: ${money(gross, currency)}`,
          `Estimated tax withholding: ${money(taxes, currency)} (${fmt(taxRate)}%)`,
          `Other deductions: ${money(deductions, currency)} (${fmt(otherRate)}%)`,
          `Estimated annual take-home pay: ${money(net * periods, currency)}`
        ],
        note: 'This estimate uses the percentages you enter. Actual paycheck deductions depend on country, state or region, benefits, tax status, and employer rules.'
      };
    },

    timeCard(p) {
      const start = p.startTime, end = p.endTime;
      const breakMinutes = number(p.breakMinutes), rate = number(p.hourlyRate);
      const timePattern = /^(\d{2}):(\d{2})$/;
      const a = timePattern.exec(start || ''), b = timePattern.exec(end || '');
      if (!a || !b || Number(a[1]) > 23 || Number(b[1]) > 23 || Number(a[2]) > 59 || Number(b[2]) > 59 || !Number.isInteger(breakMinutes) || !validNonNegative(breakMinutes, rate)) {
        return { error: 'Enter valid clock times, a non-negative break length, and a non-negative hourly rate.' };
      }
      const toMinutes = (m) => Number(m[1]) * 60 + Number(m[2]);
      let workedMinutes = toMinutes(b) - toMinutes(a);
      if (workedMinutes < 0) workedMinutes += 1440;
      workedMinutes -= breakMinutes;
      if (workedMinutes <= 0) return { error: 'The break must be shorter than the shift.' };
      const hours = workedMinutes / 60;
      const currency = p.currency || 'USD';
      return {
        main: `${fmt(hours, 2)} hours`,
        details: [
          `Time worked: ${fmt(hours, 2)} decimal hours`,
          `Time worked: ${Math.floor(workedMinutes / 60)} hours ${workedMinutes % 60} minutes`,
          `Estimated gross pay: ${money(hours * rate, currency)}`,
          `Unpaid break: ${fmt(breakMinutes, 0)} minutes`
        ],
        note: 'One shift is calculated from start to end, allowing an overnight end time. Overtime, premiums, multiple shifts, and local labor rules are not included.'
      };
    },

    calorieDeficit(p) {
      const maintenance = number(p.maintenance), intake = number(p.intake);
      if (!validPositive(maintenance, intake)) return { error: 'Enter positive maintenance and daily intake calorie values.' };
      const daily = maintenance - intake;
      const weekly = daily * 7;
      const kg = weekly / 7700;
      const lb = weekly / 3500;
      return {
        main: `${daily > 0 ? 'Deficit' : daily < 0 ? 'Surplus' : 'Maintenance'}: ${fmt(Math.abs(daily), 0)} kcal/day`,
        details: [
          `Estimated daily energy difference: ${daily > 0 ? '-' : daily < 0 ? '+' : ''}${fmt(Math.abs(daily), 0)} kcal`,
          `Seven-day energy difference: ${fmt(Math.abs(weekly), 0)} kcal ${daily > 0 ? 'deficit' : daily < 0 ? 'surplus' : 'balance'}`,
          `Static energy-equivalent estimate: ${fmt(Math.abs(kg), 2)} kg / ${fmt(Math.abs(lb), 2)} lb per week`
        ],
        note: 'The 7,700 kcal/kg and 3,500 kcal/lb conversions are rough static estimates, not predictions of actual weight change. Energy needs adapt over time; this tool is not medical or dietary advice.'
      };
    },

    grade(p) {
      const grades = [1, 2, 3, 4].map((i) => ({ score: number(p[`grade${i}`]), weight: number(p[`weight${i}`]) }));
      const examWeight = number(p.examWeight), target = number(p.targetGrade);
      if (grades.some((g) => !Number.isFinite(g.score) || g.score < 0 || g.score > 100 || !Number.isFinite(g.weight) || g.weight < 0 || g.weight > 100) || !Number.isFinite(examWeight) || examWeight < 0 || examWeight > 100 || !Number.isFinite(target) || target < 0 || target > 100) {
        return { error: 'Scores and weights must be between 0 and 100.' };
      }
      const courseWeight = grades.reduce((sum, g) => sum + g.weight, 0);
      const totalWeight = courseWeight + examWeight;
      if (courseWeight <= 0 || Math.abs(totalWeight - 100) > 0.01) {
        return { error: `Entered coursework weights (${fmt(courseWeight)}%) plus final exam weight (${fmt(examWeight)}%) must total 100%.` };
      }
      const weightedPoints = grades.reduce((sum, g) => sum + g.score * g.weight / 100, 0);
      const currentAverage = weightedPoints / (courseWeight / 100);
      let needed = null;
      if (examWeight > 0) needed = (target - weightedPoints) / (examWeight / 100);
      const details = [
        `Current coursework average: ${fmt(currentAverage)}%`,
        `Coursework contribution to final grade: ${fmt(weightedPoints)} points out of 100`,
        `Final exam weight: ${fmt(examWeight)}%`,
        needed === null ? 'No final exam weight entered.' : `Score needed on final exam to reach ${fmt(target)}%: ${fmt(needed)}%`
      ];
      if (needed !== null && needed > 100) details.push('The target cannot be reached with a final exam capped at 100%, using these weights.');
      if (needed !== null && needed < 0) details.push('The target has already been reached before the final exam.');
      return { main: `${fmt(currentAverage)}% current coursework average`, details, note: 'Enter every component weight so coursework plus the final exam equals 100%. Grading scales and rounding rules vary by school.' };
    },

    area(p) {
      const shape = p.shape, a = number(p.a), b = number(p.b), c = number(p.c), unit = p.unit || 'm';
      let area, formula;
      if (shape === 'circle') {
        if (!validPositive(a)) return { error: 'Enter a positive radius.' };
        area = Math.PI * a * a; formula = 'π × radius²';
      } else if (shape === 'rectangle') {
        if (!validPositive(a, b)) return { error: 'Enter positive length and width values.' };
        area = a * b; formula = 'length × width';
      } else if (shape === 'triangle') {
        if (!validPositive(a, b)) return { error: 'Enter positive base and height values.' };
        area = a * b / 2; formula = '(base × height) ÷ 2';
      } else if (shape === 'trapezoid') {
        if (!validPositive(a, b, c)) return { error: 'Enter positive values for both parallel sides and the height.' };
        area = (a + b) * c / 2; formula = '((parallel side 1 + parallel side 2) × height) ÷ 2';
      } else return { error: 'Select a supported shape.' };
      const m2 = unit === 'ft' ? area * 0.09290304 : area;
      return { main: `${fmt(area, 4)} ${unit}²`, details: [`Area in square meters: ${fmt(m2, 4)} m²`, `Formula: ${formula}`], note: 'The result is a two-dimensional area. Measurements must use the same length unit.' };
    },

    volume(p) {
      const shape = p.shape, a = number(p.a), b = number(p.b), c = number(p.c), unit = p.unit || 'm';
      let volume, formula;
      if (shape === 'box') {
        if (!validPositive(a, b, c)) return { error: 'Enter positive length, width, and height values.' };
        volume = a * b * c; formula = 'length × width × height';
      } else if (shape === 'cylinder') {
        if (!validPositive(a, b)) return { error: 'Enter a positive radius and height.' };
        volume = Math.PI * a * a * b; formula = 'π × radius² × height';
      } else if (shape === 'sphere') {
        if (!validPositive(a)) return { error: 'Enter a positive radius.' };
        volume = (4 / 3) * Math.PI * a * a * a; formula = '(4 ÷ 3) × π × radius³';
      } else if (shape === 'cone') {
        if (!validPositive(a, b)) return { error: 'Enter a positive radius and height.' };
        volume = Math.PI * a * a * b / 3; formula = '(π × radius² × height) ÷ 3';
      } else return { error: 'Select a supported solid.' };
      const m3 = unit === 'ft' ? volume * 0.028316846592 : volume;
      return { main: `${fmt(volume, 4)} ${unit}³`, details: [`Volume in cubic meters: ${fmt(m3, 4)} m³`, `Formula: ${formula}`], note: 'This is geometric volume. It does not account for irregular shapes, wall thickness, voids, or material packing.' };
    },

    slope(p) {
      const x1 = number(p.x1), y1 = number(p.y1), x2 = number(p.x2), y2 = number(p.y2);
      if (![x1, y1, x2, y2].every(Number.isFinite) || (x1 === x2 && y1 === y2)) return { error: 'Enter four finite coordinates for two distinct points.' };
      const dx = x2 - x1, dy = y2 - y1;
      if (dx === 0) return { main: 'Undefined slope (vertical line)', details: [`Line equation: x = ${fmt(x1, 4)}`, `Vertical change: ${fmt(dy, 4)}`, 'A vertical line has no finite slope.'], note: 'Slope is rise divided by run. A vertical line has zero horizontal change, so its slope is undefined.' };
      const m = dy / dx, intercept = y1 - m * x1, angle = Math.atan(m) * 180 / Math.PI;
      const equation = Math.abs(intercept) < 1e-10 ? `y = ${fmt(m, 4)}x` : `y = ${fmt(m, 4)}x ${intercept < 0 ? '−' : '+'} ${fmt(Math.abs(intercept), 4)}`;
      return { main: `Slope: ${fmt(m, 6)}`, details: [`Line equation: ${equation}`, `Y-intercept: ${fmt(intercept, 6)}`, `Signed inclination from the positive x-axis: ${fmt(angle, 3)}°`, `Rise: ${fmt(dy, 4)} · Run: ${fmt(dx, 4)}`], note: 'The result uses the coordinate order (x₁, y₁) and (x₂, y₂). Coordinate units cancel in the slope.' };
    },

    concrete(p) {
      const unit = p.unit || 'ft';
      const length = number(p.length), width = number(p.width), depth = number(p.depth), waste = number(p.waste), bagYield = number(p.bagYield);
      if (!validPositive(length, width, depth, bagYield) || !Number.isFinite(waste) || waste < 0 || waste > 100) return { error: 'Enter positive dimensions and bag yield, with waste between 0% and 100%.' };
      const baseM3 = lengthToM(length, unit) * lengthToM(width, unit) * lengthToM(depth, unit);
      const totalM3 = baseM3 * (1 + waste / 100);
      const ft3 = totalM3 / 0.028316846592;
      const bags = Math.ceil(ft3 / bagYield);
      return { main: `${fmt(totalM3, 3)} m³ of concrete`, details: [`Volume before waste: ${fmt(baseM3, 3)} m³`, `Volume with ${fmt(waste)}% allowance: ${fmt(totalM3, 3)} m³ (${fmt(totalM3 / 0.764554857984, 3)} yd³)`, `Approximate bag count at ${fmt(bagYield, 2)} ft³ per bag: ${fmt(bags, 0)}`], note: 'Measure the actual formwork and verify the yield printed on the concrete mix. Waste allowance and bag yield vary by project and product.' };
    },

    paint(p) {
      const unit = p.unit || 'ft';
      const width = number(p.width), height = number(p.height), walls = number(p.walls), openings = number(p.openings), coats = number(p.coats), coverage = number(p.coverage), waste = number(p.waste);
      if (!validPositive(width, height, walls, coats, coverage) || !Number.isInteger(walls) || !Number.isInteger(coats) || !validNonNegative(openings) || !Number.isFinite(waste) || waste < 0 || waste > 100) return { error: 'Enter positive wall dimensions, wall count, coats, and coverage, plus valid opening area and waste.' };
      const totalArea = width * height * walls;
      if (openings >= totalArea) return { error: 'Opening area must be smaller than the total wall area.' };
      const netArea = totalArea - openings;
      const quantity = netArea * coats * (1 + waste / 100) / coverage;
      const areaLabel = unit === 'ft' ? 'ft²' : 'm²';
      const amountUnit = unit === 'ft' ? 'US gallons' : 'liters';
      return { main: `${fmt(quantity, 2)} ${amountUnit}`, details: [`Net paintable area: ${fmt(netArea, 2)} ${areaLabel}`, `Area including ${fmt(coats, 0)} coat(s): ${fmt(netArea * coats, 2)} ${areaLabel}`, `Coverage entered: ${fmt(coverage)} ${areaLabel} per ${unit === 'ft' ? 'gallon' : 'liter'}`, `Quantity includes ${fmt(waste)}% allowance.`], note: 'Paint coverage depends on the product, surface texture, primer, application method, and color change. Check the manufacturer’s coverage guidance.' };
    },

    gravel(p) {
      const unit = p.unit || 'ft';
      const length = number(p.length), width = number(p.width), depth = number(p.depth), density = number(p.density), waste = number(p.waste);
      if (!validPositive(length, width, depth, density) || !Number.isFinite(waste) || waste < 0 || waste > 100) return { error: 'Enter positive dimensions and density, with waste between 0% and 100%.' };
      const baseM3 = lengthToM(length, unit) * lengthToM(width, unit) * lengthToM(depth, unit);
      const volume = baseM3 * (1 + waste / 100);
      const massKg = volume * density;
      return { main: `${fmt(volume, 3)} m³ of gravel`, details: [`Volume including allowance: ${fmt(volume / 0.764554857984, 3)} yd³`, `Estimated mass: ${fmt(massKg / 1000, 2)} metric tonnes`, `Estimated mass: ${fmt(massKg / 907.18474, 2)} US short tons`, `Density used: ${fmt(density, 0)} kg/m³`], note: 'Gravel density varies significantly by stone type, moisture, and compaction. Replace the example density with the supplier’s specification before ordering.' };
    },

    mulch(p) {
      const unit = p.unit || 'ft';
      const length = number(p.length), width = number(p.width), depth = number(p.depth), waste = number(p.waste), bag = number(p.bagSize);
      if (!validPositive(length, width, depth, bag) || !Number.isFinite(waste) || waste < 0 || waste > 100) return { error: 'Enter positive dimensions and bag size, with waste between 0% and 100%.' };
      const depthM = unit === 'ft' ? depth * 0.0254 : depth / 100;
      const baseM3 = lengthToM(length, unit) * lengthToM(width, unit) * depthM;
      const totalM3 = baseM3 * (1 + waste / 100);
      const bagM3 = unit === 'ft' ? bag * 0.028316846592 : bag / 1000;
      const bags = Math.ceil(totalM3 / bagM3);
      return { main: `${fmt(totalM3 / 0.764554857984, 3)} yd³ of mulch`, details: [`Volume including ${fmt(waste)}% allowance: ${fmt(totalM3, 3)} m³`, `Approximate bags needed: ${fmt(bags, 0)}`, `Bag size used: ${fmt(bag)} ${unit === 'ft' ? 'ft³' : 'liters'}`], note: 'Mulch settles and compresses. Actual coverage depends on material type, desired depth, and bag size; confirm the product label.' };
    },

    drywall(p) {
      const unit = p.unit || 'ft';
      const length = number(p.length), height = number(p.height), openings = number(p.openings), sheetW = number(p.sheetWidth), sheetH = number(p.sheetHeight), waste = number(p.waste);
      if (!validPositive(length, height, sheetW, sheetH) || !validNonNegative(openings) || !Number.isFinite(waste) || waste < 0 || waste > 100) return { error: 'Enter positive wall and sheet dimensions, valid opening area, and waste between 0% and 100%.' };
      const gross = length * height;
      if (openings >= gross) return { error: 'Opening area must be smaller than the gross wall area.' };
      const net = gross - openings;
      const sheets = Math.ceil(net * (1 + waste / 100) / (sheetW * sheetH));
      const label = unit === 'ft' ? 'ft²' : 'm²';
      return { main: `${fmt(sheets, 0)} drywall sheets`, details: [`Net wall area: ${fmt(net, 2)} ${label}`, `Sheet area: ${fmt(sheetW * sheetH, 2)} ${label}`, `Area including ${fmt(waste)}% waste: ${fmt(net * (1 + waste / 100), 2)} ${label}`], note: 'This is an area-based sheet estimate. Layout, framing, cutouts, ceiling work, board orientation, fire ratings, and local installation requirements can change the quantity.' };
    },

    boardFoot(p) {
      const thickness = number(p.thickness), width = number(p.width), length = number(p.length), qty = number(p.quantity), price = number(p.price);
      if (!validPositive(thickness, width, length, qty) || !Number.isInteger(qty) || !validNonNegative(price)) return { error: 'Enter positive lumber dimensions and quantity, plus a non-negative price.' };
      const perPiece = thickness * width * length / 12;
      const total = perPiece * qty;
      return { main: `${fmt(total, 2)} board feet`, details: [`Board feet per piece: ${fmt(perPiece, 3)}`, `Number of pieces: ${fmt(qty, 0)}`, `Estimated material cost: ${money(total * price, 'USD')}`], note: 'Board-foot calculation uses nominal thickness and width in inches and length in feet. Actual surfaced dimensions may be smaller; lumber pricing and grading conventions vary.' };
    },

    voltageDrop(p) {
      const voltage = number(p.voltage), current = number(p.current), length = number(p.length), gauge = number(p.gauge), material = p.material || 'copper', system = p.system || 'single';
      if (!validPositive(voltage, current, length) || !Number.isInteger(gauge) || gauge < -4 || gauge > 14 || ![-4,-3,-2,-1,0,1,2,3,4,6,8,10,12,14].includes(gauge)) return { error: 'Enter positive voltage, current, and cable length, and select a supported AWG size.' };
      const diameterIn = 0.005 * Math.pow(92, (36 - gauge) / 39);
      const diameterM = diameterIn * 0.0254;
      const area = Math.PI * Math.pow(diameterM / 2, 2);
      const rho = material === 'aluminum' ? 2.82e-8 : 1.724e-8;
      const lengthM = p.lengthUnit === 'm' ? length : length * 0.3048;
      const resistanceOneWay = rho * lengthM / area;
      const multiplier = system === 'three' ? Math.sqrt(3) : 2;
      const drop = multiplier * current * resistanceOneWay;
      const percent = drop / voltage * 100;
      const atLoad = voltage - drop;
      return { main: `${fmt(percent, 2)}% voltage drop`, details: [`Estimated voltage drop: ${fmt(drop, 3)} V`, `Estimated voltage at load: ${fmt(atLoad, 3)} V`, `Conductor: ${gauge < 0 ? `${Math.abs(gauge)}/0 AWG` : `${gauge} AWG`} ${material}`, `One-way cable length: ${fmt(length)} ${p.lengthUnit === 'm' ? 'm' : 'ft'}`, `Calculation model: ${system === 'three' ? 'balanced three-phase (√3 factor)' : 'DC or single-phase (round-trip conductor length)'}`], note: 'Simplified resistive estimate at approximately 20°C. It excludes reactance, installation conditions, terminal limits, temperature correction, code tables, and protective-device design. Have a qualified electrician verify conductor sizing and safety.' };
    },

    stair(p) {
      const unit = p.unit || 'in';
      const rise = number(p.rise), desired = number(p.riser), tread = number(p.tread);
      if (!validPositive(rise, desired, tread)) return { error: 'Enter a positive total rise, target riser height, and tread depth.' };
      const risers = Math.ceil(rise / desired);
      const actualRiser = rise / risers;
      const treads = Math.max(0, risers - 1);
      const totalRun = treads * tread;
      const metric = unit === 'in' ? 2.54 : 1;
      return { main: `${fmt(risers, 0)} risers`, details: [`Actual riser height: ${fmt(actualRiser, 2)} ${unit}`, `Number of treads (assuming the upper floor is the final level): ${fmt(treads, 0)}`, `Total horizontal run: ${fmt(totalRun, 2)} ${unit} (${fmt(totalRun * metric, 2)} ${unit === 'in' ? 'cm' : 'cm'})`, `Target riser height: ${fmt(desired, 2)} ${unit}`], note: 'This is a preliminary geometric layout, not a building-code check. Verify permitted riser variation, minimum tread depth, headroom, landings, handrails, and local regulations before construction.' };
    },

    fuel(p) {
      const distance = number(p.distance), efficiency = number(p.efficiency), price = number(p.price), trips = number(p.trips);
      if (!validPositive(distance, efficiency, price) || ![1, 2].includes(trips)) return { error: 'Enter positive distance, fuel efficiency, and fuel price.' };
      let fuel, fuelUnit, distanceLabel, economyLabel, costLabel;
      if (p.system === 'metric') {
        fuel = distance * trips / 100 * efficiency;
        fuelUnit = 'L'; distanceLabel = 'km'; economyLabel = 'L/100 km'; costLabel = 'per liter';
      } else {
        fuel = distance * trips / efficiency;
        fuelUnit = 'US gal'; distanceLabel = 'mi'; economyLabel = 'mpg (US)'; costLabel = 'per US gallon';
      }
      const cost = fuel * price;
      return { main: money(cost, p.currency || 'USD'), details: [`Total trip distance: ${fmt(distance * trips)} ${distanceLabel}`, `Estimated fuel needed: ${fmt(fuel, 2)} ${fuelUnit}`, `Fuel efficiency: ${fmt(efficiency, 2)} ${economyLabel}`, `Fuel price used: ${fmt(price, 3)} ${p.currency || 'USD'} ${costLabel}`], note: 'This estimate uses the distance and efficiency you enter. Traffic, driving style, weather, vehicle load, route, and changing fuel prices affect actual cost.' };
    },

    electricity(p) {
      const watts = number(p.watts), quantity = number(p.quantity), hours = number(p.hours), days = number(p.days), rate = number(p.rate);
      if (!validPositive(watts, quantity, days) || !Number.isInteger(quantity) || !Number.isInteger(days) || !validNonNegative(hours, rate) || hours > 24 || days > 366) return { error: 'Enter positive wattage, quantity, days, and hours (up to 24 per day), plus a non-negative electricity rate.' };
      const kwh = watts * quantity * hours * days / 1000;
      const cost = kwh * rate;
      return { main: money(cost, p.currency || 'USD'), details: [`Energy used: ${fmt(kwh, 2)} kWh over ${fmt(days, 0)} days`, `Average daily use: ${fmt(kwh / days, 3)} kWh`, `Average power: ${fmt(watts * quantity, 0)} W across ${fmt(quantity, 0)} device(s)`, `Rate used: ${fmt(rate, 4)} ${p.currency || 'USD'} per kWh`], note: 'The estimate covers the entered appliance load only. It excludes standby use, tiered tariffs, fixed charges, taxes, demand charges, and other items on an electricity bill.' };
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = calculators;
  if (typeof window !== 'undefined') window.CalcDailyExpandedCalculators = calculators;

  const fieldIds = {
    date: ['startDate','endDate','shiftDays'], incomeTax: ['grossIncome','deductions','taxRate','currency'],
    retirement: ['currentSavings','monthlyContribution','annualReturn','years','inflation','currency'],
    paycheck: ['grossPay','frequency','taxRate','otherRate','currency'], timeCard: ['startTime','endTime','breakMinutes','hourlyRate','currency'],
    calorieDeficit: ['maintenance','intake'], grade: ['grade1','weight1','grade2','weight2','grade3','weight3','grade4','weight4','examWeight','targetGrade'],
    area: ['shape','a','b','c','unit'], volume: ['shape','a','b','c','unit'], slope: ['x1','y1','x2','y2'],
    concrete: ['length','width','depth','unit','waste','bagYield'], paint: ['width','height','walls','openings','coats','unit','coverage','waste'],
    gravel: ['length','width','depth','unit','density','waste'], mulch: ['length','width','depth','unit','bagSize','waste'],
    drywall: ['length','height','openings','unit','sheetWidth','sheetHeight','waste'], boardFoot: ['thickness','width','length','quantity','price'],
    voltageDrop: ['voltage','current','length','lengthUnit','gauge','material','system'], stair: ['rise','riser','tread','unit'],
    fuel: ['distance','efficiency','price','system','trips','currency'], electricity: ['watts','quantity','hours','days','rate','currency']
  };

  const labelText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  const updateShapeLabels = (kind) => {
    const shape = document.getElementById('shape')?.value;
    if (kind === 'area') {
      const labels = shape === 'circle' ? ['Radius','—','—'] : shape === 'rectangle' ? ['Length','Width','—'] : shape === 'triangle' ? ['Base','Height','—'] : ['Parallel side A','Parallel side B','Height'];
      labelText('label-a', labels[0] === '—' ? '—' : `${labels[0]} (${document.getElementById('unit')?.value || 'ft'})`);
      labelText('label-b', labels[1] === '—' ? '—' : `${labels[1]} (${document.getElementById('unit')?.value || 'ft'})`);
      labelText('label-c', labels[2] === '—' ? '—' : `${labels[2]} (${document.getElementById('unit')?.value || 'ft'})`);
      ['field-a','field-b','field-c'].forEach((id, i) => { const e = document.getElementById(id); if (e) e.hidden = labels[i] === '—'; });
    } else if (kind === 'volume') {
      const labels = shape === 'box' ? ['Length','Width','Height'] : shape === 'sphere' ? ['Radius','—','—'] : ['Radius','Height','—'];
      labelText('label-a', labels[0] === '—' ? '—' : `${labels[0]} (${document.getElementById('unit')?.value || 'ft'})`);
      labelText('label-b', labels[1] === '—' ? '—' : `${labels[1]} (${document.getElementById('unit')?.value || 'ft'})`);
      labelText('label-c', labels[2] === '—' ? '—' : `${labels[2]} (${document.getElementById('unit')?.value || 'ft'})`);
      ['field-a','field-b','field-c'].forEach((id, i) => { const e = document.getElementById(id); if (e) e.hidden = labels[i] === '—'; });
    }
  };
  const updateUnitLabels = (kind) => {
    const unit = document.getElementById('unit')?.value;
    if (kind === 'paint') {
      labelText('label-width', `Wall width (${unit})`);
      labelText('label-height', `Wall height (${unit})`);
      labelText('label-openings', `Total opening area (${unit === 'ft' ? 'ft²' : 'm²'})`);
      labelText('label-coverage', `Coverage (${unit === 'ft' ? 'ft² per US gallon' : 'm² per liter'})`);
    }
    if (kind === 'concrete' || kind === 'gravel') {
      labelText('label-length', `Length (${unit})`);
      labelText('label-width', `Width (${unit})`);
      labelText('label-depth', `Depth (${unit})`);
    }
    if (kind === 'drywall') {
      labelText('label-length', `Total wall length (${unit})`);
      labelText('label-height', `Wall height (${unit})`);
      labelText('label-openings', `Door and window area (${unit === 'ft' ? 'ft²' : 'm²'})`);
      labelText('label-sheetWidth', `Sheet width (${unit})`);
      labelText('label-sheetHeight', `Sheet height (${unit})`);
    }
    if (kind === 'mulch') {
      labelText('label-length', `Length (${unit})`);
      labelText('label-width', `Width (${unit})`);
      labelText('label-depth', `Mulch depth (${unit === 'ft' ? 'inches' : 'centimeters'})`);
      labelText('label-bagSize', `Bag volume (${unit === 'ft' ? 'ft³' : 'liters'})`);
    }
    if (kind === 'stair') {
      const labelUnit = unit === 'in' ? 'inches' : 'centimeters';
      labelText('label-rise', `Total floor-to-floor rise (${labelUnit})`);
      labelText('label-riser', `Target riser height (${labelUnit})`);
      labelText('label-tread', `Tread depth (${labelUnit})`);
    }
    if (kind === 'fuel') {
      const metric = document.getElementById('system')?.value === 'metric';
      labelText('label-distance', `One-way trip distance (${metric ? 'km' : 'miles'})`);
      labelText('label-efficiency', `Fuel efficiency (${metric ? 'L/100 km' : 'mpg (US)'})`);
      labelText('label-price', `Fuel price per ${metric ? 'liter' : 'US gallon'}`);
    }
  };
  const convertUnitValues = (kind, from, to) => {
    if (!from || !to || from === to) return;
    const factor = from === 'ft' && to === 'm' ? 0.3048 : from === 'm' && to === 'ft' ? 1 / 0.3048 : null;
    const convert = (id, scale) => { const el = document.getElementById(id); if (el && el.value !== '') el.value = String(Number(el.value) * scale); };
    if (['concrete','gravel'].includes(kind) && factor) ['length','width','depth'].forEach(id => convert(id, factor));
    if (['area','volume'].includes(kind) && factor) ['a','b','c'].forEach(id => convert(id, factor));
    if (kind === 'paint' && factor) {
      ['width','height'].forEach(id => convert(id, factor));
      convert('openings', factor * factor);
      convert('coverage', from === 'ft' ? (0.09290304 / 3.785411784) : (3.785411784 / 0.09290304));
    }
    if (kind === 'drywall' && factor) {
      ['length','height','sheetWidth','sheetHeight'].forEach(id => convert(id, factor));
      convert('openings', factor * factor);
    }
    if (kind === 'mulch' && factor) {
      ['length','width'].forEach(id => convert(id, factor));
      convert('depth', from === 'ft' ? 2.54 : 1 / 2.54);
      convert('bagSize', from === 'ft' ? 28.316846592 : 1 / 28.316846592);
    }
    if (kind === 'stair') {
      const scale = from === 'in' && to === 'cm' ? 2.54 : from === 'cm' && to === 'in' ? 1 / 2.54 : 1;
      ['rise','riser','tread'].forEach(id => convert(id, scale));
    }
    if (kind === 'fuel') {
      if (from === 'us' && to === 'metric') {
        convert('distance', 1.609344);
        const e = document.getElementById('efficiency');
        if (e && Number(e.value) > 0) e.value = String(235.214583 / Number(e.value));
        convert('price', 1 / 3.785411784);
      } else if (from === 'metric' && to === 'us') {
        convert('distance', 1 / 1.609344);
        const e = document.getElementById('efficiency');
        if (e && Number(e.value) > 0) e.value = String(235.214583 / Number(e.value));
        convert('price', 3.785411784);
      }
    }
  };

  const readParams = (kind) => {
    const params = {};
    (fieldIds[kind] || []).forEach((id) => {
      const el = document.getElementById(id);
      if (el) params[id] = el.value;
    });
    return params;
  };
  const renderResult = (result) => {
    const main = document.getElementById('result-main');
    const details = document.getElementById('result-details');
    const note = document.getElementById('result-note');
    if (!main || !details || !note) return;
    if (result.error) {
      main.textContent = 'Check your inputs';
      details.textContent = result.error;
      note.textContent = '';
      return;
    }
    main.textContent = result.main;
    details.textContent = (result.details || []).join('\n');
    note.textContent = result.note || '';
  };
  const init = () => {
    const kind = document.body?.dataset?.calculator;
    if (!kind || !calculators[kind]) return;
    const form = document.getElementById('calc-form');
    if (!form) return;
    const calculate = () => renderResult(calculators[kind](readParams(kind)));
    let previousUnit = (document.getElementById('unit') || document.getElementById('system'))?.value || '';
    form.addEventListener('submit', (event) => { event.preventDefault(); calculate(); });
    form.querySelectorAll('input, select').forEach((el) => {
      el.addEventListener('input', () => {
        if (kind === 'area' || kind === 'volume') updateShapeLabels(kind);
        if (['paint','drywall','mulch','concrete','gravel','fuel','stair'].includes(kind)) updateUnitLabels(kind);
        calculate();
      });
      el.addEventListener('change', () => {
        if ((el.id === 'unit' || (kind === 'fuel' && el.id === 'system')) && previousUnit && previousUnit !== el.value) {
          convertUnitValues(kind, previousUnit, el.value);
          previousUnit = el.value;
        }
        if (kind === 'area' || kind === 'volume') updateShapeLabels(kind);
        if (['paint','drywall','mulch','concrete','gravel','fuel','stair'].includes(kind)) updateUnitLabels(kind);
        calculate();
      });
    });
    if (kind === 'area' || kind === 'volume') updateShapeLabels(kind);
    if (['paint','drywall','mulch','concrete','gravel','fuel','stair'].includes(kind)) updateUnitLabels(kind);
    calculate();
  };
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }
})();
