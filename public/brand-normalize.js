(() => {
  const BRAND='PremiumHairstyles AI';
  const oldPatterns=[/HairLook AI/g,/Premium-Hairstyles/g,/Premium Hairstyles AI/g];
  const normalizeText=value=>oldPatterns.reduce((v,re)=>v.replace(re,BRAND),String(value||''));
  const apply=()=>{
    document.title=BRAND;
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(node=>{const next=normalizeText(node.nodeValue);if(next!==node.nodeValue)node.nodeValue=next;});
    document.querySelectorAll('[aria-label],[alt],[title]').forEach(el=>{
      for(const attr of ['aria-label','alt','title']){
        const value=el.getAttribute(attr);if(value){const next=normalizeText(value);if(next!==value)el.setAttribute(attr,next);}
      }
    });
    document.querySelectorAll('meta[property="og:title"],meta[name="twitter:title"],meta[name="application-name"],meta[name="apple-mobile-web-app-title"]').forEach(meta=>meta.setAttribute('content',BRAND));
    document.querySelectorAll('meta[content]').forEach(meta=>{
      const value=meta.getAttribute('content');
      const next=normalizeText(value);
      if(next!==value)meta.setAttribute('content',next);
    });
  };
  apply();
  setTimeout(apply,250);
  setTimeout(apply,1000);
})();
