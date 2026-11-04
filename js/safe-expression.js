/* Small, restricted expression parser for the on-screen calculators. */
(function (root) {
  'use strict';

  const SCIENTIFIC_FUNCTIONS = Object.freeze({
    'Math.sin': Math.sin,
    'Math.cos': Math.cos,
    'Math.tan': Math.tan,
    'Math.sqrt': Math.sqrt,
    'Math.log10': Math.log10,
    'Math.abs': Math.abs
  });
  const SCIENTIFIC_CONSTANTS = Object.freeze({
    'Math.PI': Math.PI,
    'Math.E': Math.E
  });

  function tokenize(source, scientific) {
    const tokens = [];
    let index = 0;
    while (index < source.length) {
      if (/\s/.test(source[index])) { index += 1; continue; }
      const rest = source.slice(index);
      const number = rest.match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);
      if (number) {
        tokens.push({ type: 'number', value: Number(number[0]) });
        index += number[0].length;
        continue;
      }
      if (scientific) {
        const identifier = rest.match(/^Math\.(?:sin|cos|tan|sqrt|log10|abs|PI|E)(?![A-Za-z0-9_$])/);
        if (identifier) {
          tokens.push({ type: 'identifier', value: identifier[0] });
          index += identifier[0].length;
          continue;
        }
      }
      const operator = rest.match(/^(?:\*\*|[+\-*/()])/);
      if (operator) {
        tokens.push({ type: 'operator', value: operator[0] });
        index += operator[0].length;
        continue;
      }
      throw new Error('Invalid token');
    }
    return tokens;
  }

  function evaluate(source, scientific) {
    if (typeof source !== 'string' || !source.trim()) throw new Error('Empty expression');
    const tokens = tokenize(source, scientific);
    let position = 0;
    const peek = () => tokens[position];
    const take = (value) => {
      if (peek() && peek().value === value) { position += 1; return true; }
      return false;
    };

    function primary() {
      const token = peek();
      if (!token) throw new Error('Unexpected end');
      if (token.type === 'number') { position += 1; return token.value; }
      if (token.type === 'identifier') {
        position += 1;
        if (Object.prototype.hasOwnProperty.call(SCIENTIFIC_CONSTANTS, token.value)) {
          return SCIENTIFIC_CONSTANTS[token.value];
        }
        const fn = SCIENTIFIC_FUNCTIONS[token.value];
        if (!fn || !take('(')) throw new Error('Invalid function');
        const argument = expression();
        if (!take(')')) throw new Error('Missing closing parenthesis');
        return fn(argument);
      }
      if (take('(')) {
        const value = expression();
        if (!take(')')) throw new Error('Missing closing parenthesis');
        return value;
      }
      throw new Error('Expected a number or parenthesis');
    }

    function power() {
      const left = primary();
      if (take('**')) return Math.pow(left, unary());
      return left;
    }

    function unary() {
      if (take('+')) return unary();
      if (take('-')) return -unary();
      return power();
    }

    function multiplicative() {
      let value = unary();
      while (peek() && (peek().value === '*' || peek().value === '/')) {
        const operator = tokens[position++].value;
        const right = unary();
        value = operator === '*' ? value * right : value / right;
      }
      return value;
    }

    function additive() {
      let value = multiplicative();
      while (peek() && (peek().value === '+' || peek().value === '-')) {
        const operator = tokens[position++].value;
        const right = multiplicative();
        value = operator === '+' ? value + right : value - right;
      }
      return value;
    }

    function expression() { return additive(); }

    const result = expression();
    if (position !== tokens.length) throw new Error('Unexpected token');
    return result;
  }

  root.SafeExpression = Object.freeze({
    evaluateStandard: (source) => evaluate(source, false),
    evaluateScientific: (source) => evaluate(source, true)
  });
})(typeof window !== 'undefined' ? window : globalThis);
