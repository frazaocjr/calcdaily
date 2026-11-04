function copyPageUrl() {
  navigator.clipboard.writeText(window.location.href).then(() => {
    const toast = document.getElementById('share-toast');
    if (toast) {
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2000);
    }
  });
}