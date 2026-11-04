(() => {
  'use strict';

  const visor = document.getElementById('calc-visor');

  // Máquina de estados simples (sem eval)
  const estado = { atual: '0', anterior: null, operador: null, sobrescrever: false, erro: false };

  /** Funções de cálculo seguras: cada operador mapeia para uma função pura. */
  const operacoes = {
    '+': (a, b) => a + b,
    '-': (a, b) => a - b,
    '*': (a, b) => a * b,
    '/': (a, b) => (b === 0 ? NaN : a / b),
  };

  function formatar(n) {
    if (!Number.isFinite(n)) return 'Erro';
    // Evita ruído de ponto flutuante (0.1 + 0.2)
    return String(parseFloat(n.toPrecision(12)));
  }

  function renderizar() {
    const texto = estado.atual.replace('.', ',');
    visor.textContent = texto;
    visor.classList.toggle('is-long', texto.length > 11);
  }

  function limpar() {
    Object.assign(estado, { atual: '0', anterior: null, operador: null, sobrescrever: false, erro: false });
  }

  function digitar(d) {
    if (estado.erro) limpar();
    if (estado.sobrescrever || estado.atual === '0') {
      estado.atual = d;
      estado.sobrescrever = false;
    } else if (estado.atual.replace(/[-.]/g, '').length < 15) {
      estado.atual += d;
    }
  }

  function ponto() {
    if (estado.erro) limpar();
    if (estado.sobrescrever) { estado.atual = '0'; estado.sobrescrever = false; }
    if (!estado.atual.includes('.')) estado.atual += '.';
  }

  function apagar() {
    if (estado.erro || estado.sobrescrever) return;
    estado.atual = estado.atual.length > 1 && estado.atual !== '-0' ? estado.atual.slice(0, -1) : '0';
    if (estado.atual === '-') estado.atual = '0';
  }

  function calcular() {
    if (estado.operador === null || estado.anterior === null) return null;
    return operacoes[estado.operador](estado.anterior, parseFloat(estado.atual));
  }

  function definirResultado(r) {
    if (!Number.isFinite(r)) {
      Object.assign(estado, { atual: 'Erro', anterior: null, operador: null, erro: true, sobrescrever: true });
    } else {
      estado.atual = formatar(r);
    }
  }

  function operador(op) {
    if (estado.erro) return;
    // Encadeia: 2 + 3 + ... calcula o parcial antes de trocar o operador
    if (estado.operador && !estado.sobrescrever) {
      definirResultado(calcular());
      if (estado.erro) return;
    }
    estado.anterior = parseFloat(estado.atual);
    estado.operador = op;
    estado.sobrescrever = true;
  }

  function igual() {
    if (estado.erro || estado.operador === null) return;
    definirResultado(calcular());
    if (!estado.erro) {
      estado.anterior = null;
      estado.operador = null;
      estado.sobrescrever = true;
    }
  }

  function tratar(tipo, valor) {
    if (tipo === 'num') digitar(valor);
    else if (tipo === 'op') operador(valor);
    else if (valor === 'ponto') ponto();
    else if (valor === 'igual') igual();
    else if (valor === 'apagar') apagar();
    else if (valor === 'limpar') limpar();
    renderizar();
  }

  document.querySelector('.calc-grid').addEventListener('click', (e) => {
    const b = e.target.closest('.calc-btn');
    if (!b) return;
    const { num, op, acao } = b.dataset;
    if (num !== undefined) tratar('num', num);
    else if (op !== undefined) tratar('op', op);
    else tratar('acao', acao);
  });

  // Teclado
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    if (/^[0-9]$/.test(k)) tratar('num', k);
    else if (k in operacoes) tratar('op', k);
    else if (k === '.' || k === ',') tratar('acao', 'ponto');
    else if (k === 'Enter' || k === '=') { e.preventDefault(); tratar('acao', 'igual'); }
    else if (k === 'Backspace') tratar('acao', 'apagar');
    else if (k === 'Escape' || k === 'c' || k === 'C') tratar('acao', 'limpar');
  });

  const abas = document.querySelectorAll('.widget-tab');
  abas.forEach((aba) => aba.addEventListener('click', () => {
    abas.forEach((a) => { const on = a === aba; a.classList.toggle('is-active', on); a.setAttribute('aria-selected', on); });
  }));

  renderizar();
})();
