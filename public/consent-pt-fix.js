// Portuguese localization for the consent copy rendered dynamically by app.js.
(function localizeConsentToPortuguese(){
  const apply=()=>{
    const consent=document.querySelector('#flowContent .consent span');
    if(!consent)return;
    consent.innerHTML='Concordo com os <a href="/terms" target="_blank">Termos</a> e com a <a href="/privacy" target="_blank">Política de Privacidade</a>. Entendo que minha foto será processada de forma privada e armazenada temporariamente para criar os resultados de penteados.';
  };
  apply();
  const root=document.querySelector('#flowContent');
  if(root)new MutationObserver(apply).observe(root,{childList:true,subtree:true});
})();
