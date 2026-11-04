(() => {
  'use strict';

  const DURACAO_ROLETA = 400; // ms
  const INTERVALO = 40;       // ms entre cada número exibido

  const inputMin = document.getElementById('minimo');
  const inputMax = document.getElementById('maximo');
  const botao = document.getElementById('btn-gerar');
  const visor = document.getElementById('visor');
  const erro = document.getElementById('erro');
  const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Retorna mensagem de erro ou string vazia se válido. */
  function validar(min, max) {
    if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max)) {
      return 'Informe números inteiros válidos.';
    }
    if (min >= max) {
      return 'O valor mínimo deve ser menor que o máximo.';
    }
    return '';
  }

  /** Inteiro aleatório entre min e max, ambos inclusivos. */
  function gerarAleatorio(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function mostrar(valor) {
    const texto = String(valor);
    visor.textContent = texto;
    visor.classList.toggle('is-long', texto.length > 6);
  }

  /** Efeito de roleta: troca o número rapidamente e para no resultado final. */
  function girar(min, max, final) {
    if (reduzirMovimento) {
      mostrar(final);
      return;
    }
    botao.disabled = true;
    const timer = setInterval(() => mostrar(gerarAleatorio(min, max)), INTERVALO);
    setTimeout(() => {
      clearInterval(timer);
      mostrar(final);
      botao.disabled = false;
    }, DURACAO_ROLETA);
  }

  function aoGerar() {
    const min = parseInt(inputMin.value, 10);
    const max = parseInt(inputMax.value, 10);
    const mensagem = validar(min, max);

    erro.textContent = mensagem;
    if (mensagem) return;

    girar(min, max, gerarAleatorio(min, max));
  }

  botao.addEventListener('click', aoGerar);
  [inputMin, inputMax].forEach((el) =>
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') aoGerar(); })
  );

  /* Abas: alterna o estado visual/ARIA */
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
