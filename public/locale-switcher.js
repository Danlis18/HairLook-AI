(() => {
  const current = document.documentElement.lang.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en';
  const labels = current === 'pt-BR'
    ? { group:'Selecionar idioma', en:'Inglês', pt:'Português' }
    : { group:'Choose language', en:'English', pt:'Portuguese' };

  const switcher = document.createElement('div');
  switcher.className = 'locale-switcher';
  switcher.setAttribute('role', 'group');
  switcher.setAttribute('aria-label', labels.group);
  switcher.innerHTML = `
    <button type="button" data-locale-choice="en" aria-label="${labels.en}" aria-pressed="${current === 'en'}">EN</button>
    <span aria-hidden="true"></span>
    <button type="button" data-locale-choice="pt-BR" aria-label="${labels.pt}" aria-pressed="${current === 'pt-BR'}">PT</button>`;

  switcher.addEventListener('click', event => {
    const button = event.target.closest('[data-locale-choice]');
    if (!button || button.getAttribute('aria-pressed') === 'true') return;
    const url = new URL(location.href);
    url.searchParams.set('lang', button.dataset.localeChoice);
    location.assign(`${url.pathname}${url.search}${url.hash}`);
  });

  const headerActions = document.querySelector('.site-header .header-actions');
  const minimalHeader = document.querySelector('.minimal-header .container');
  const authTopbar = document.querySelector('.auth-topbar');
  if (headerActions) headerActions.prepend(switcher);
  else if (minimalHeader) minimalHeader.append(switcher);
  else if (authTopbar) authTopbar.append(switcher);
  else {
    switcher.classList.add('locale-switcher-floating');
    document.body.append(switcher);
  }
})();
