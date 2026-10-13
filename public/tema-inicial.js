/* Aplica o tema salvo antes da primeira pintura, para a tela não piscar. */
try {
  var t = localStorage.getItem('pl-theme');
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
} catch (e) {}
