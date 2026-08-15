(() => {
  const formatBrl = value => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(value||36.5));
  const current = 36.50;
  const compare = 129.90;
  const saving = compare-current;

  function ensureLeanQuizPayload(){
    try{
      if(typeof answers==='undefined' || !answers)return;
      if(!answers.currentColor)answers.currentColor='Não informado';
      if(!Array.isArray(answers.desiredColors))answers.desiredColors=[];
      if(!answers.stylePersonality)answers.stylePersonality='Não informado';
      if(!answers.bangsPreference)answers.bangsPreference='Não informado';
      if(!answers.grayPreference)answers.grayPreference='Não informado';
      if(typeof saveQuiz==='function')saveQuiz();
    }catch{}
  }

  function fixPrices(){
    document.querySelectorAll('[data-price]').forEach(el=>{el.textContent=current.toFixed(2).replace('.',',');});
    document.querySelectorAll('.price-currency').forEach(el=>{el.textContent='BRL';});
    document.querySelectorAll('.price-old,.product-price .old,.old-price').forEach(el=>{el.textContent=formatBrl(compare);});
    document.querySelectorAll('.checkout-sale-badge,.sale-callout').forEach(el=>{el.textContent=`Economize ${formatBrl(saving)} · 72% OFF`;});
    document.querySelectorAll('.sale-current').forEach(el=>{el.textContent=formatBrl(current);});
    document.querySelectorAll('.product-price .current').forEach(el=>{el.textContent=formatBrl(current);});
    document.querySelectorAll('.current-price').forEach(el=>{el.textContent=formatBrl(current);});
    document.querySelectorAll('.sale-current-line .price').forEach(el=>{el.innerHTML=`R$ <span data-price>${current.toFixed(2).replace('.',',')}</span>`;});
  }

  function polishBrazilCopy(){
    const replacements = new Map([
      ['Private customer access','Acesso privado do cliente'],
      ['Open your private order.','Acesse seu pedido privado.'],
      ['Enter the email used for your consultation. We’ll send one secure, time-limited sign-in link to that address.','Digite o e-mail usado na sua consultoria. Enviaremos um link seguro e temporário para esse endereço.'],
      ['We never reveal whether a specific email has an account.','Por privacidade, não informamos se um e-mail específico possui uma conta.'],
      ['Your secure link is ready.','Seu link seguro está pronto.'],
      ['We sent a private sign-in link to your email.','Enviamos um link privado de acesso para o seu e-mail.'],
      ['Open the email from PremiumHairstyles AI.','Abra o e-mail enviado pela PremiumHairstyles AI.'],
      ['Click “Open my private order”.','Clique em “Abrir meu pedido privado”.'],
      ['The link signs you in automatically — no password needed.','O link faz seu login automaticamente — sem senha.'],
      ['Use the newest link.','Use o link mais recente.'],
      ['For security, each link is time-limited and can only be used once.','Por segurança, cada link expira e pode ser usado apenas uma vez.'],
      ['This link is magic — no password needed.','Este é um link seguro de acesso — nenhuma senha é necessária.'],
      ['Send another link','Enviar outro link'],
      ['Please wait a moment.','Aguarde um momento.'],
      ['We’re securely confirming your payment. Keep this page open for a few seconds.','Estamos confirmando seu pagamento com segurança. Mantenha esta página aberta por alguns segundos.'],
      ['You do not need to refresh this page.','Não é necessário atualizar esta página.'],
      ['Back to home','Voltar ao início']
    ]);
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(n=>{const t=n.nodeValue?.trim();if(t&&replacements.has(t))n.nodeValue=n.nodeValue.replace(t,replacements.get(t));});
  }

  ensureLeanQuizPayload();
  fixPrices();
  polishBrazilCopy();

  const observer=new MutationObserver(()=>{
    ensureLeanQuizPayload();
    fixPrices();
    polishBrazilCopy();
  });
  observer.observe(document.body,{childList:true,subtree:true});
})();
