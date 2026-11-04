(() => {
  'use strict';

  const inputCor = document.getElementById('cor');
  const campoHex = document.getElementById('hex');
  const campoRgb = document.getElementById('rgb');
  const botao = document.getElementById('btn-copiar');
  const aviso = document.getElementById('aviso');
  let timerAviso;

  function hexParaRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
  }

  function atualizar() {
    const hex = inputCor.value.toUpperCase();
    campoHex.value = hex;
    campoRgb.value = hexParaRgb(hex);
  }

  function mostrarAviso(texto, erro = false) {
    aviso.textContent = texto;
    aviso.style.color = erro ? '#d93025' : '';
    clearTimeout(timerAviso);
    timerAviso = setTimeout(() => { aviso.textContent = ''; }, 2000);
  }

  /** Alternativa para contextos sem Clipboard API (ex.: file://). */
  function copiarFallback() {
    campoHex.select();
    const ok = document.execCommand('copy');
    campoHex.setSelectionRange(0, 0);
    return ok;
  }

  async function copiar() {
    const hex = campoHex.value;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(hex);
      } else if (!copiarFallback()) {
        throw new Error('copy');
      }
      mostrarAviso(`${hex} copiado!`);
    } catch {
      mostrarAviso('Não foi possível copiar. Selecione o código e copie manualmente.', true);
    }
  }

  inputCor.addEventListener('input', atualizar);
  botao.addEventListener('click', copiar);

  const abas = document.querySelectorAll('.widget-tab');
  abas.forEach((aba) => aba.addEventListener('click', () => {
    abas.forEach((a) => { const on = a === aba; a.classList.toggle('is-active', on); a.setAttribute('aria-selected', on); });
  }));

  atualizar();
})();
