document.addEventListener('click', event => {
  const button = event.target.closest('[data-close-dialog]');
  if (button) button.closest('dialog')?.close();
});
