(() => {
  const replacements = [
    [/\bwithin\s+72\s+hours\b/gi, 'within 15 minutes'],
    [/\bin\s+up\s+to\s+72\s+hours\b/gi, 'in up to 15 minutes'],
    [/\bup\s+to\s+72\s+hours\b/gi, 'up to 15 minutes'],
    [/\b72\s*hours\b/gi, '15 minutes'],
    [/\bem\s+até\s+72\s*horas\b/gi, 'em até 15 minutos'],
    [/\bdentro\s+de\s+72\s*horas\b/gi, 'em até 15 minutos'],
    [/\baté\s+72\s*horas\b/gi, 'até 15 minutos'],
    [/\b72\s*horas\b/gi, '15 minutos'],
    [/\b72h\b/gi, '15 min']
  ];

  function replaceText(value) {
    let next = value;
    for (const [pattern, replacement] of replacements) next = next.replace(pattern, replacement);
    return next;
  }

  function normalize(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      const next = replaceText(root.nodeValue || '');
      if (next !== root.nodeValue) root.nodeValue = next;
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const next = replaceText(node.nodeValue || '');
      if (next !== node.nodeValue) node.nodeValue = next;
    }
  }

  function start() {
    normalize(document.body);
    const observer = new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes) normalize(node);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
