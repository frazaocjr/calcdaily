(() => {
  'use strict';

  const CORES = ['Vermelho', 'Laranja', 'Amarelo', 'Verde', 'Azul', 'Roxo']; // 60° cada, no sentido horário a partir do topo
  const FATIA = 360 / CORES.length;
  const DURACAO = 3000; // ms

  const roleta = document.getElementById('roleta');
  const botao = document.getElementById('btn-girar');
  const resultado = document.getElementById('resultado');
  const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let rotacao = 0;

  /** O ponteiro fica no topo (0°). A fatia sob ele depende da rotação acumulada. */
  function corSelecionada(graus) {
    const anguloNoPonteiro = (360 - (graus % 360)) % 360;
    return CORES[Math.floor(anguloNoPonteiro / FATIA)];
  }

  function finalizar() {
    resultado.textContent = `Cor selecionada: ${corSelecionada(rotacao)}`;
    botao.disabled = false;
  }

  function girar() {
    botao.disabled = true;
    resultado.textContent = 'Girando...';

    // 4 a 7 voltas completas + ângulo final aleatório
    rotacao += 360 * (4 + Math.floor(Math.random() * 4)) + Math.random() * 360;

    if (reduzirMovimento) {
      roleta.style.transition = 'none';
      roleta.style.transform = `rotate(${rotacao}deg)`;
      finalizar();
      return;
    }

    roleta.style.transition = `transform ${DURACAO}ms cubic-bezier(0.17, 0.67, 0.21, 1)`;
    roleta.style.transform = `rotate(${rotacao}deg)`;
    setTimeout(finalizar, DURACAO + 50);
  }

  botao.addEventListener('click', girar);

  const abas = document.querySelectorAll('.widget-tab');
  abas.forEach((aba) => aba.addEventListener('click', () => {
    abas.forEach((a) => { const on = a === aba; a.classList.toggle('is-active', on); a.setAttribute('aria-selected', on); });
  }));
})();
