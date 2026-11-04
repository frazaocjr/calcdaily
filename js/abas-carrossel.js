/**
 * abas-carrossel.js — filtra os atalhos do carrossel por categoria.
 *
 * Marcação esperada (ver INTEGRACAO.md):
 *   [data-carrossel]                  contêiner (opcional: data-aba-inicial="jogos|ferramentas")
 *   [role="tab"][data-filtro="x"]     abas
 *   [data-categoria="x"]              itens do carrossel
 *
 * Sem dependências. Carregar com <script src="..." defer>.
 */
(() => {
  'use strict';

  const iniciar = (carrossel) => {
    const abas = [...carrossel.querySelectorAll('[role="tab"][data-filtro]')];
    const itens = [...carrossel.querySelectorAll('[data-categoria]')];
    if (!abas.length || !itens.length) return;

    const pista = carrossel.querySelector('.carrossel-pista');
    const filtrosValidos = abas.map((aba) => aba.dataset.filtro);

    const ativar = (filtro, focar = false) => {
      abas.forEach((aba) => {
        const ativa = aba.dataset.filtro === filtro;
        aba.setAttribute('aria-selected', String(ativa));
        aba.tabIndex = ativa ? 0 : -1;
        if (ativa && focar) aba.focus();
      });
      itens.forEach((item) => {
        item.hidden = item.dataset.categoria !== filtro;
      });
      if (pista) pista.scrollLeft = 0;
    };

    abas.forEach((aba, i) => {
      aba.addEventListener('click', () => ativar(aba.dataset.filtro));
      aba.addEventListener('keydown', (e) => {
        const passo = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (passo) {
          e.preventDefault();
          ativar(abas[(i + passo + abas.length) % abas.length].dataset.filtro, true);
        } else if (e.key === 'Home' || e.key === 'End') {
          e.preventDefault();
          ativar(abas[e.key === 'Home' ? 0 : abas.length - 1].dataset.filtro, true);
        }
      });
    });

    const inicial = carrossel.dataset.abaInicial;
    const selecionada = abas.find((aba) => aba.getAttribute('aria-selected') === 'true');
    ativar(filtrosValidos.includes(inicial) ? inicial : (selecionada || abas[0]).dataset.filtro);
  };

  const boot = () => document.querySelectorAll('[data-carrossel]').forEach(iniciar);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
