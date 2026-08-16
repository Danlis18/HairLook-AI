(() => {
  const root = document.querySelector('#flowContent');
  if (!root) return;

  function enhanceMultiSelect() {
    const title = root.querySelector('.quiz-title');
    const grid = root.querySelector('.choice-grid');
    if (!title || !grid) return;

    const text = title.textContent.trim().toLowerCase();
    const isGoals = text.includes('what would you most like your new hairstyle') ||
      text.includes('o que você mais gostaria que seu novo penteado');
    if (!isGoals) return;

    grid.classList.add('multi-select-grid');
    grid.querySelectorAll('.choice-card').forEach((card) => {
      card.classList.add('multi-select-choice');
      if (!card.querySelector('.multi-select-indicator')) {
        const indicator = document.createElement('span');
        indicator.className = 'multi-select-indicator';
        indicator.setAttribute('aria-hidden', 'true');
        card.appendChild(indicator);
      }
    });
  }

  const observer = new MutationObserver(() => requestAnimationFrame(enhanceMultiSelect));
  observer.observe(root, { childList: true, subtree: true });
  enhanceMultiSelect();
})();
