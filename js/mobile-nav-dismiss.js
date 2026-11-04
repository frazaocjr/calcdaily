/* Close the mobile section menu whenever a visitor clicks outside it. */
document.addEventListener('click', (event) => {
  const target = event.target;
  document.querySelectorAll('.mobile-nav-dropdown[open]').forEach((menu) => {
    const clickedMenuLink = target instanceof Element ? target.closest('.mobile-nav-options a') : null;
    const clickedInsideMenu = target instanceof Node && menu.contains(target);
    if (!clickedInsideMenu || clickedMenuLink) {
      menu.removeAttribute('open');
    }
  });
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  document.querySelectorAll('.mobile-nav-dropdown[open]').forEach((menu) => {
    menu.removeAttribute('open');
    const summary = menu.querySelector(':scope > summary');
    if (summary) summary.focus();
  });
});
