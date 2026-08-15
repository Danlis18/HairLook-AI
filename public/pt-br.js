// Brazilian Portuguese storefront localization for the active production version.
// The previous English/USD storefront is preserved on the `english-usd-snapshot` branch.
(() => {
  const BRL_CURRENT = 'R$ 36,50';
  const BRL_OLD = 'R$ 129,90';
  const BRL_SAVING = 'R$ 93,40';

  document.documentElement.lang = 'pt-BR';

  const exact = new Map([
    ['Product','Produto'],['Product Details','Detalhes do produto'],['Product details','Detalhes do produto'],['Price','Preço'],['Support','Suporte'],['How It Works','Como funciona'],['Hairstyles','Penteados'],['Results','Resultados'],['FAQ','Dúvidas'],['Sign In','Entrar'],['Find My Style','Encontrar meu estilo'],['Find My Best Hairstyle','Encontrar meu melhor penteado'],['View Product Details','Ver detalhes do produto'],
    ['Your private hair consultation','Sua consultoria de cabelo personalizada'],['Find the hairstyle','Encontre o penteado'],['that feels like you.','que combina com você.'],['Explore flattering cuts, lengths and colors on your own photo before you make the change. Thoughtful style directions, personalized previews, one simple purchase.','Explore cortes, comprimentos e cores que combinam com você usando a sua própria foto antes de mudar o visual. Sugestões personalizadas, prévias realistas e uma única compra.'],
    ['Verified email delivery','Entrega no e-mail verificado'],['Results within 72 hours','Resultados em até 72 horas'],['one-time','pagamento único'],['one-time purchase','compra única'],['No subscription','Sem assinatura'],['Private photos','Fotos privadas'],['Paddle secure checkout','Checkout seguro com Paddle'],
    ['Personal style direction','Direção de estilo personalizada'],['Polished & simple','Elegante e simples'],['Texture & movement','Textura e movimento'],['One photo.','Uma foto.'],['Then a guided collection built around the cuts, colors and maintenance level you want to explore.','Depois, montamos uma seleção guiada com cortes, cores e nível de manutenção que você deseja explorar.'],
    ['Style inspiration','Inspiração de estilo'],['A personalized collection with useful range.','Uma seleção personalizada com opções que fazem sentido para você.'],['Your style directions can explore easy-care everyday options, bolder changes and gray-friendly color ideas around the preferences you choose.','Suas sugestões podem incluir opções práticas para o dia a dia, mudanças mais marcantes e ideias de cor que valorizam fios grisalhos, sempre com base nas suas preferências.'],
    ['Polished & Sleek','Polido e elegante'],['Clean · refined','Limpo · sofisticado'],['Natural Volume','Volume natural'],['Textured · confident','Texturizado · marcante'],['Soft Curls','Cachos suaves'],['Movement · relaxed','Movimento · leve'],['Textured Shoulder','Textura nos ombros'],['Natural · modern','Natural · moderno'],['Color Directions','Direções de cor'],['Brunette · blonde · gray','Morena · loira · grisalha'],
    ['See the experience','Veja como funciona'],['From style questions to a personalized hairstyle order.','Das suas respostas a uma seleção personalizada de penteados.'],['The guided consultation collects the details that matter for your requested look while keeping your photo and order tied to your verified email.','A consultoria guiada reúne as informações mais importantes para o visual desejado e mantém sua foto e pedido vinculados ao seu e-mail verificado.'],
    ['Built around you','Feito para você'],['More like a stylist conversation. Less like a random generator.','Mais parecido com uma conversa com um stylist. Menos como um gerador aleatório.'],['We use your stated preferences — texture, length, color, maintenance level, bangs, gray options and style personality — to prepare useful hairstyle directions.','Usamos suas preferências de textura, comprimento, cor, rotina, franja e estilo para preparar sugestões de penteados realmente úteis.'],
    ['Preference-led recommendations','Recomendações baseadas nas suas preferências'],['Wearable color directions','Cores pensadas para a vida real'],['Real-life maintenance matters','Sua rotina também importa'],
    ['Personal style consultation','Consultoria de estilo personalizada'],['Who are we creating this look for?','Para quem estamos criando este visual?'],['This helps us phrase your consultation naturally. It never changes the price.','Isso nos ajuda a personalizar a consultoria. O preço não muda.'],['Woman','Mulher'],['Man','Homem'],['Prefer not to say','Prefiro não informar'],
    ['What is your age range?','Qual é a sua faixa etária?'],['We use this only as style context — never for pricing or eligibility.','Usamos isso apenas como contexto de estilo, nunca para alterar preço ou elegibilidade.'],['Under 35','Menos de 35'],
    ['How long is your hair right now?','Qual é o comprimento atual do seu cabelo?'],['Choose the closest match. It gives the edit a more believable starting point.','Escolha a opção mais próxima. Isso ajuda a criar uma prévia mais realista.'],['Very short','Muito curto'],['Short','Curto'],['Medium','Médio'],['Long','Longo'],['Very long','Muito longo'],
    ['What length would you love to explore?','Qual comprimento você gostaria de experimentar?'],['There is no commitment — you are choosing directions to preview.','Sem compromisso: você está apenas escolhendo opções para visualizar.'],['Shorter','Mais curto'],['About the same','Mais ou menos o mesmo'],['Longer','Mais longo'],['Not sure — show me what suits me','Não tenho certeza — mostre o que combina comigo'],['Not sure','Não tenho certeza'],
    ['How would you describe your natural hair texture?','Como você descreveria a textura natural do seu cabelo?'],['Pick the texture that is closest on a typical day.','Escolha a textura mais próxima do seu cabelo no dia a dia.'],['Straight','Liso'],['Wavy','Ondulado'],['Curly','Cacheado'],['Coily','Crespo'],
    ['What would you most like your new hairstyle to do for you?','O que você mais gostaria que seu novo penteado fizesse por você?'],['Choose up to four priorities. These are used to shape the collection.','Escolha até quatro prioridades. Elas serão usadas para montar suas sugestões.'],['Add volume','Dar mais volume'],['Look fresher','Deixar o visual mais leve'],['Feel more modern','Ficar mais moderno'],['Be easier to maintain','Ser mais fácil de cuidar'],['Easy to maintain','Fácil de manter'],['Frame my face','Valorizar o rosto'],['Try something completely new','Experimentar algo totalmente novo'],['Something new','Algo novo'],['Blend gray naturally','Disfarçar os grisalhos naturalmente'],['Blend gray','Misturar os grisalhos'],['Look more elegant','Ficar mais elegante'],['More elegant','Mais elegante'],
    ['How much time do you like to spend styling your hair?','Quanto tempo você gosta de gastar arrumando o cabelo?'],['A beautiful recommendation is only useful if it fits your routine.','Uma boa recomendação só funciona se combinar com a sua rotina.'],['5 minutes or less','5 minutos ou menos'],['10–15 minutes','10–15 minutos'],["I don't mind styling",'Não me importo de arrumar'],['Salon-finished look','Visual com acabamento de salão'],
    ['Step 1 of 7','Etapa 1 de 7'],['Continue','Continuar'],['Continue →','Continuar →'],['Back','Voltar'],['Complete profile →','Finalizar perfil →'],
    ['Your hairstyle directions','Suas sugestões de penteados'],['Styles worth exploring for you.','Penteados que vale a pena explorar para você.'],['Continue with these ideas →','Continuar com essas ideias →'],['← Back','← Voltar'],['Preview image','Prévia'],['The order is personalized from your quiz answers; these example cards are style directions, not your final generated results.','A ordem é personalizada com base nas suas respostas. Estas imagens são referências de estilo, não os seus resultados finais.'],
    ['Upload one clear photo.','Envie uma foto nítida.'],['One last step','Última etapa'],['Use a portrait where your face and current hair are visible. We re-encode the image before private storage and use it only for the hairstyle workflow described in our Privacy Policy.','Use uma foto em que seu rosto e seu cabelo atual estejam visíveis. A imagem é processada antes de ser armazenada de forma privada e usada apenas para preparar o seu pedido, conforme nossa Política de Privacidade.'],['Face clearly visible','Rosto claramente visível'],['Good natural lighting','Boa iluminação natural'],['Looking toward the camera','Olhando para a câmera'],['See good and bad photo examples','Ver exemplos de fotos boas e ruins'],['Drag a photo here','Arraste uma foto aqui'],['or choose from your device','ou escolha no seu dispositivo'],['Choose another','Escolher outra'],['Use this photo →','Usar esta foto →'],
    ['Private delivery','Entrega privada'],['Where should we send your results?','Para qual e-mail devemos enviar seus resultados?'],['We use your email for secure access to this hairstyle collection and order-related messages.','Usamos seu e-mail para acesso seguro ao pedido e para enviar mensagens relacionadas à compra.'],['Email address','Endereço de e-mail'],['Send verification code →','Enviar código de verificação →'],['Sending verification code…','Enviando código de verificação…'],['I agree to the','Eu concordo com os'],['Terms','Termos'],['Privacy Policy','Política de Privacidade'],['Refund Policy','Política de Reembolso'],
    ['Confirm your email','Confirme seu e-mail'],['Please confirm your email','Confirme seu e-mail'],['We deliver your results and order updates to this address.','Enviaremos seus resultados e atualizações do pedido para este endereço.'],['Edit','Editar'],['Confirm email →','Confirmar e-mail →'],['Preparing…','Preparando…'],['Enter verification code','Digite o código de verificação'],['We sent a 6-digit code to','Enviamos um código de 6 dígitos para'],['Verify email →','Verificar e-mail →'],['Resend code','Reenviar código'],['Change email','Alterar e-mail'],
    ['Preparing your order','Preparando seu pedido'],['Putting your preferences together.','Organizando suas preferências.'],['Your quiz, verified email and photo are being prepared for secure checkout.','Suas respostas, e-mail verificado e foto estão sendo preparados para o checkout seguro.'],['Preferences saved','Preferências salvas'],['Photo ready','Foto pronta'],['Email verified','E-mail verificado'],['Your order','Seu pedido'],['Personalized Hairstyle Collection','Coleção Personalizada de Penteados'],['One-time purchase','Compra única'],['After payment is confirmed, we review your photo and style profile, prepare your personalized hairstyle visualizations, and deliver them to your verified email.','Após a confirmação do pagamento, analisamos sua foto e suas preferências, preparamos suas visualizações personalizadas de penteados e enviamos tudo para o seu e-mail verificado.'],['Personalized hairstyle previews','Prévias personalizadas de penteados'],['Multiple lengths & directions','Vários comprimentos e estilos'],['Color variations','Variações de cor'],['Gray-friendly options when requested','Opções para cabelos grisalhos quando solicitado'],['Style recommendations','Recomendações de estilo'],['Delivered to your verified email','Entrega no seu e-mail verificado'],['Limited promotional offer','Oferta promocional limitada'],['One-time payment','Pagamento único'],['No subscription · no renewal','Sem assinatura · sem renovação'],['Secure checkout by Paddle','Checkout seguro com Paddle'],['Paddle handles payment processing, tax and fraud protection.','A Paddle processa o pagamento, impostos aplicáveis e proteção contra fraude.'],['Private & secure','Privado e seguro'],['Your photo remains private and is used only for your order.','Sua foto permanece privada e é usada apenas para o seu pedido.'],['Before you pay','Antes de pagar'],['View full product details','Ver todos os detalhes do produto'],['Continue to Secure Checkout →','Continuar para o checkout seguro →'],['Payment is accepted only after verified server-side confirmation from Paddle.','O pagamento só é considerado confirmado após a validação do servidor pela Paddle.'],
    ['Simple one-time pricing.','Preço simples e pagamento único.'],['Regular price','Preço normal'],['Current promotional price','Preço promocional atual'],['Billing type','Tipo de cobrança'],['Subscription','Assinatura'],['None','Nenhuma'],['Delivery','Entrega'],['Within 72 hours after confirmed payment','Em até 72 horas após a confirmação do pagamento'],['Payment provider','Meio de pagamento'],['Start consultation →','Iniciar consultoria →'],['View product details','Ver detalhes do produto'],
    ['What you are buying','O que você está comprando'],['What is included','O que está incluído'],['What you need to provide','O que você precisa enviar'],['Important limitations','Limitações importantes'],['Photo privacy','Privacidade da foto'],['License and permitted use','Licença e uso permitido'],['Refunds and support','Reembolsos e suporte'],['Paddle and your purchase','Paddle e sua compra'],['Customer Support','Suporte ao cliente'],['License & Acceptable Use','Licença e Uso Aceitável'],['Cookie & Storage Notice','Cookies e Armazenamento'],
    ['Legal','Jurídico'],['Terms of Service','Termos de Serviço'],['The product','O produto'],['Price and billing','Preço e cobrança'],['Paddle as Merchant of Record','Paddle como Merchant of Record'],['Your order information','Informações do seu pedido'],['Your portrait','Sua foto'],['Visualization limitations','Limitações das visualizações'],['Refunds and mandatory rights','Reembolsos e direitos obrigatórios'],['Service availability','Disponibilidade do serviço'],['Acceptable use','Uso aceitável'],['Contact','Contato'],
    ['Information we collect','Informações que coletamos'],['How we use your information','Como usamos suas informações'],['How your photo is handled','Como sua foto é tratada'],['No biometric identification','Sem identificação biométrica'],['Email verification and delivery','Verificação de e-mail e entrega'],['Payments','Pagamentos'],['Storage and retention','Armazenamento e retenção'],['Service providers','Prestadores de serviço'],['Security','Segurança'],['Analytics and browser storage','Analytics e armazenamento no navegador'],['Your choices and rights','Seus direitos e escolhas'],['Children','Crianças'],
    ['Paddle handles the transaction','A Paddle processa a transação'],['If your order is not delivered','Se o seu pedido não for entregue'],['If there is a material product problem','Se houver um problema relevante com o produto'],['Personalized digital results','Resultados digitais personalizados'],['Duplicate or incorrect charges','Cobranças duplicadas ou incorretas'],['How to request a refund','Como solicitar um reembolso'],['Mandatory consumer rights','Direitos obrigatórios do consumidor'],
    ['Your personalized results','Seus resultados personalizados'],['Your portrait and rights','Sua foto e seus direitos'],['Platform content','Conteúdo da plataforma'],['Prohibited uses','Usos proibidos'],['No exclusivity or professional guarantee','Sem exclusividade ou garantia profissional'],['Third-party services','Serviços de terceiros'],['Termination','Suspensão e encerramento'],
    ['Essential session cookies','Cookies essenciais de sessão'],['Session and local browser storage','Sessão e armazenamento local do navegador'],['Analytics','Analytics'],['Payment provider','Provedor de pagamento'],['Advertising cookies','Cookies de publicidade'],['Your controls','Seus controles'],
    ['Secure & private','Seguro e privado'],['Open your private results.','Acesse seus resultados privados.'],['Send secure sign-in link →','Enviar link seguro de acesso →'],['Check your email','Confira seu e-mail'],['Open my private order','Abrir meu pedido privado'],['Back to PremiumHairstyles AI','Voltar para PremiumHairstyles AI'],
    ['Confirming payment','Confirmando pagamento'],['Thank you. Your order is confirmed.','Obrigado. Seu pedido foi confirmado.'],['Your personalized hairstyle results are now being prepared and will be sent to your verified email within 72 hours.','Seus resultados personalizados estão sendo preparados e serão enviados para o seu e-mail verificado em até 72 horas.'],['Please keep this page open while we confirm your payment.','Mantenha esta página aberta enquanto confirmamos o pagamento.']
  ]);

  const paragraphMap = new Map([
    ['A one-time personalized digital hairstyle visualization service built from your own portrait and style preferences.','Um serviço digital personalizado de visualização de penteados, criado a partir da sua própria foto e das suas preferências de estilo.'],
    ['PremiumHairstyles AI is a personalized digital service. You complete a guided hair-style consultation, upload one clear portrait, verify your email address, and place a one-time order. We review the information tied to your order and prepare a personalized set of hairstyle visualizations based on the length, texture, color, maintenance and style directions you selected.','PremiumHairstyles AI é um serviço digital personalizado. Você responde a uma consultoria guiada de estilo, envia uma foto nítida, verifica seu e-mail e realiza uma compra única. Analisamos as informações do seu pedido e preparamos uma seleção personalizada de visualizações de penteados com base no comprimento, textura, cor, rotina e direções de estilo que você escolheu.'],
    ['After payment is confirmed by our payment provider, your order enters our private preparation queue. Your personalized hairstyle results are delivered to your verified email within 72 hours. This is not an instant-generation purchase.','Após a confirmação do pagamento pelo nosso provedor, seu pedido entra em nossa fila privada de preparação. Seus resultados personalizados são enviados ao e-mail verificado em até 72 horas. Este não é um serviço de geração instantânea.'],
    ['You need one clear, front-facing portrait where your face and current hair are visible, plus accurate answers to the style consultation. You must also provide an email address you can access and verify before checkout.','Você precisa enviar uma foto frontal e nítida em que seu rosto e cabelo atual estejam visíveis, além de responder corretamente à consultoria de estilo. Também é necessário informar um e-mail ao qual você tenha acesso e verificá-lo antes do pagamento.'],
    ['The delivered images are hairstyle visualizations for planning and inspiration. They are not a medical or biometric assessment, and they do not guarantee that a salon result will look identical. Hair condition, texture, lighting, dye history, stylist technique and other real-world factors can change the final result.','As imagens entregues são visualizações de penteados para planejamento e inspiração. Elas não constituem avaliação médica ou biométrica e não garantem que o resultado em salão será idêntico. Condição do cabelo, textura, iluminação, histórico de coloração, técnica do profissional e outros fatores podem alterar o resultado real.'],
    ['Your portrait is stored in private storage and accessed only as needed to prepare and support your order. PremiumHairstyles AI does not need your card number and does not store full payment-card details. Retention and deletion practices are described in our Privacy Policy.','Sua foto é armazenada de forma privada e acessada apenas quando necessário para preparar e dar suporte ao seu pedido. A PremiumHairstyles AI não precisa do número do seu cartão e não armazena os dados completos do cartão. As práticas de retenção e exclusão estão descritas em nossa Política de Privacidade.'],
    ['Refunds and consumer withdrawal rights are handled in accordance with applicable law and Paddle\'s buyer/refund process. If the paid service is not delivered as described or you have a billing issue, contact us promptly so we can investigate and help.','Reembolsos e direitos de arrependimento são tratados conforme a legislação aplicável e o processo de suporte/reembolso da Paddle. Se o serviço pago não for entregue conforme descrito ou houver um problema de cobrança, entre em contato conosco para que possamos investigar e ajudar.'],
    ['Our order process is conducted by our online reseller Paddle.com. Paddle.com is the Merchant of Record for all our orders. Paddle processes the payment transaction and buyer-facing payment/refund process. PremiumHairstyles AI remains responsible for preparing and delivering the personalized hairstyle service described on this page.','Nosso processo de compra é realizado pela revendedora online Paddle.com. A Paddle.com atua como Merchant of Record em nossos pedidos, processando o pagamento e o atendimento relacionado a cobrança e reembolso. A PremiumHairstyles AI continua responsável por preparar e entregar o serviço personalizado de penteados descrito nesta página.']
  ]);

  function translateString(input) {
    if (!input) return input;
    let out = input;
    if (exact.has(out.trim())) {
      const leading = out.match(/^\s*/)?.[0] || '';
      const trailing = out.match(/\s*$/)?.[0] || '';
      return leading + exact.get(out.trim()) + trailing;
    }
    for (const [en,pt] of paragraphMap) if (out.includes(en)) out = out.replace(en,pt);
    out = out.replace(/\$24\.99\s*USD/g, BRL_OLD)
      .replace(/\$24\.99/g, BRL_OLD)
      .replace(/\$6\.99\s*USD/g, BRL_CURRENT)
      .replace(/\$6\.99/g, BRL_CURRENT)
      .replace(/Save \$18\s*·\s*72% OFF/gi, `Economize ${BRL_SAVING} · 72% OFF`)
      .replace(/72% OFF/gi, '72% OFF')
      .replace(/\bUSD\b/g, 'BRL');
    return out;
  }

  function translateTextNode(node) {
    if (!node.nodeValue || !node.nodeValue.trim()) return;
    const next = translateString(node.nodeValue);
    if (next !== node.nodeValue) node.nodeValue = next;
  }

  function translateElement(root = document) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) return translateTextNode(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || ['SCRIPT','STYLE','CODE','PRE'].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes=[]; while(walker.nextNode()) nodes.push(walker.currentNode); nodes.forEach(translateTextNode);
    root.querySelectorAll?.('[placeholder]').forEach(el => { el.placeholder = translateString(el.placeholder); });
    root.querySelectorAll?.('[aria-label]').forEach(el => { const v=el.getAttribute('aria-label'); if(v) el.setAttribute('aria-label',translateString(v)); });
  }

  function applyBrazilPrice() {
    document.querySelectorAll('[data-price]').forEach(el => { el.textContent='36,50'; });
    document.querySelectorAll('.price-currency').forEach(el => { el.textContent='BRL'; });
    document.querySelectorAll('.price-old,.product-price .old,.old-price').forEach(el => { el.textContent=BRL_OLD; });
    document.querySelectorAll('.checkout-sale-badge,.sale-callout').forEach(el => { el.textContent=`Economize ${BRL_SAVING} · 72% OFF`; });
    document.querySelectorAll('.current-price').forEach(el => {
      if (el.textContent.includes('$') || el.textContent.includes('6.99')) el.textContent=BRL_CURRENT;
    });
    document.querySelectorAll('.sale-current').forEach(el => { el.textContent=BRL_CURRENT; });
  }

  const titleMap = {
    'Product Details — PremiumHairstyles AI':'Detalhes do Produto — PremiumHairstyles AI',
    'Price — PremiumHairstyles AI':'Preço — PremiumHairstyles AI',
    'Terms of Service — HairLook AI':'Termos de Serviço — PremiumHairstyles AI',
    'Privacy Policy — HairLook AI':'Política de Privacidade — PremiumHairstyles AI',
    'Refund Policy — HairLook AI':'Política de Reembolso — PremiumHairstyles AI',
    'License & Acceptable Use — HairLook AI':'Licença e Uso Aceitável — PremiumHairstyles AI',
    'Cookie & Storage Notice — HairLook AI':'Cookies e Armazenamento — PremiumHairstyles AI',
    'Your Personal Hair Plan — PremiumHairstyles AI':'Seu Plano Personalizado — PremiumHairstyles AI'
  };
  if (titleMap[document.title]) document.title=titleMap[document.title];

  translateElement(document.body);
  applyBrazilPrice();

  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'characterData') translateTextNode(record.target);
      record.addedNodes.forEach(node => {
        if (node.nodeType===Node.TEXT_NODE) translateTextNode(node);
        else if (node.nodeType===Node.ELEMENT_NODE) translateElement(node);
      });
    }
    applyBrazilPrice();
  });
  observer.observe(document.body,{subtree:true,childList:true,characterData:true});

  // Keep BRL display synchronized with runtime config when available.
  fetch('/api/config',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(cfg=>{
    if(!cfg)return;
    const amount=Number(cfg.priceDisplayUsd||36.5);
    const formatted=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(amount);
    document.querySelectorAll('[data-price]').forEach(el=>{el.textContent=amount.toFixed(2).replace('.',',');});
    document.querySelectorAll('.sale-current').forEach(el=>{el.textContent=formatted;});
  }).catch(()=>{});
})();
