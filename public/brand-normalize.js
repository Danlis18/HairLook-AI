(() => {
  const BRAND='PremiumHairstyles AI';
  const SUPPORT='support@mail.premium-hairstyle.com';
  const oldPatterns=[/HairLook AI/g,/Premium-Hairstyles/g,/Premium Hairstyles AI/g];
  const normalizeText=value=>{
    let v=oldPatterns.reduce((out,re)=>out.replace(re,BRAND),String(value||''));
    v=v.replace(/Paddle/g,'Hotmart');
    v=v.replace(/Hotmart como Merchant of Record/g,'Hotmart como plataforma de pagamento');
    v=v.replace(/A Hotmart é o Merchant of Record/g,'A Hotmart processa o pagamento');
    v=v.replace(/A Hotmart atua como Merchant of Record/g,'A Hotmart atua como plataforma de pagamento');
    v=v.replace(/que atua como Merchant of Record/g,'que processa o pagamento');
    v=v.replace(/Merchant of Record/g,'processamento de pagamento');
    v=v.replace(/support@mail\.premium-hairstyles\.com/g,SUPPORT);
    v=v.replace(/support@premium-hairstyle\.com/g,SUPPORT);
    v=v.replace(/premium\.hairstyle\.official@gmail\.com/g,SUPPORT);
    v=v.replace(/R\$\s*36,50/g,'R$ 36,49');
    return v;
  };
  const apply=()=>{
    document.title=BRAND;
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(node=>{const next=normalizeText(node.nodeValue);if(next!==node.nodeValue)node.nodeValue=next;});
    document.querySelectorAll('[aria-label],[alt],[title],[href]').forEach(el=>{
      for(const attr of ['aria-label','alt','title','href']){
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
