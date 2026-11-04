(() => {
  'use strict';

  const DURACAO = 600;   // ms de animação
  const INTERVALO = 100; // ms entre alternâncias
  const moeda = document.getElementById('moeda');
  const botao = document.getElementById('btn-lancar');
  const resultado = document.getElementById('resultado-moeda');
  const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Sorteia o lado da moeda. */
  function sortearLado() {
    return Math.random() < 0.5 ? '👑 HEADS' : '🪙 TAILS';
  }

  function lancar() {
    const final = sortearLado();
    if (reduzirMovimento) {
      moeda.textContent = final;
      if (resultado) resultado.textContent = `It's ${final.replace(/[^a-zA-Z]/g, '')}!`;
      return;
    }
    botao.disabled = true;
    moeda.classList.add('is-spinning');
    if (resultado) resultado.textContent = "Flipping...";

    let atual = moeda.textContent;
    const timer = setInterval(() => {
      atual = atual.includes('HEADS') ? '🪙 TAILS' : '👑 HEADS';
      moeda.textContent = atual;
    }, INTERVALO);

    setTimeout(() => {
      clearInterval(timer);
      moeda.classList.remove('is-spinning');
      moeda.textContent = final;
      if (resultado) {
        const textoLimpo = final.includes('HEADS') ? 'Heads' : 'Tails';
        resultado.textContent = `It's ${textoLimpo}!`;
      }
      botao.disabled = false;
    }, DURACAO);
  }

  if (botao && moeda) {
    botao.addEventListener('click', lancar);
  }

  /* Abas: estado visual/ARIA */
  const abas = document.querySelectorAll('.widget-tab');
  abas.forEach((aba) =>
    aba.addEventListener('click', () => {
      abas.forEach((a) => {
        const ativa = a === aba;
        a.classList.toggle('is-active', ativa);
        a.setAttribute('aria-selected', ativa);
      });
    })
  );
})();