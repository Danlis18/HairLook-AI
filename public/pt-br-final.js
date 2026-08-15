(() => {
  document.documentElement.lang='pt-BR';
  const titles={
    '/':'PremiumHairstyles AI — Encontre seu próximo penteado',
    '/product':'Detalhes do Produto — PremiumHairstyles AI',
    '/price':'Preço — PremiumHairstyles AI',
    '/personal-plan':'Seu Plano Personalizado — PremiumHairstyles AI',
    '/signin':'Acesso Privado — PremiumHairstyles AI',
    '/dashboard':'Seu Pedido — PremiumHairstyles AI',
    '/terms':'Termos de Serviço — PremiumHairstyles AI',
    '/privacy':'Política de Privacidade — PremiumHairstyles AI',
    '/refund':'Política de Reembolso — PremiumHairstyles AI',
    '/license':'Licença e Uso Aceitável — PremiumHairstyles AI',
    '/cookies':'Cookies e Armazenamento — PremiumHairstyles AI',
    '/contact':'Suporte ao Cliente — PremiumHairstyles AI',
    '/about':'Sobre — PremiumHairstyles AI'
  };
  if(titles[location.pathname])document.title=titles[location.pathname];
  const descriptions={
    '/':'Consultoria privada de penteados com quiz, foto e sugestões personalizadas. Pagamento único e entrega dos resultados no e-mail verificado em até 72 horas.',
    '/product':'Detalhes da Coleção Personalizada de Penteados da PremiumHairstyles AI, incluindo preço, entrega, privacidade, limitações e suporte.',
    '/price':'Preço da PremiumHairstyles AI no Brasil: oferta promocional de R$ 36,50 em pagamento único, sem assinatura.'
  };
  const meta=document.querySelector('meta[name="description"]');if(meta&&descriptions[location.pathname])meta.content=descriptions[location.pathname];

  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  nodes.forEach(n=>{
    const t=n.nodeValue||'';
    if(t.trim()==='USD')n.nodeValue=t.replace('USD','BRL');
    else if(t.includes('$6.99 USD'))n.nodeValue=t.replaceAll('$6.99 USD','R$ 36,50');
    else if(t.includes('$24.99 USD'))n.nodeValue=t.replaceAll('$24.99 USD','R$ 129,90');
  });
})();
