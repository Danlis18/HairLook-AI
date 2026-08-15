(() => {
  // Run after app.js + email-flow-fix.js. Keep the consultation concise.
  const removeQuestion = (key) => {
    const i = questions.findIndex(q => q.key === key);
    if (i >= 0) questions.splice(i, 1);
  };
  removeQuestion('maintenanceLevel');
  if (step >= questions.length) { step = 0; saveQuiz(); }

  // Replace numeric badges with simple visual symbols.
  const age = questions.find(q => q.key === 'ageRange');
  if (age) {
    const marks = ['○','◔','◑','◕','●'];
    age.options = age.options.map((o,i) => [o[0],o[1],marks[i]]);
  }
  const length = questions.find(q => q.key === 'currentLength');
  if (length) {
    const marks = ['▰','▰▰','≈','∿','〰'];
    length.options = length.options.map((o,i) => [o[0],o[1],marks[i]]);
  }

  const style = document.createElement('style');
  style.textContent = `
    /* All normal quiz choices: icon left, text right. */
    .choice-grid .choice-card:not(.visual-choice){
      display:flex!important;
      flex-direction:row!important;
      align-items:center!important;
      justify-content:flex-start!important;
      gap:14px!important;
      text-align:left!important;
    }
    .choice-grid .choice-card:not(.visual-choice) .choice-icon{
      flex:0 0 44px!important;
      width:44px!important;
      height:44px!important;
      margin:0!important;
      display:grid!important;
      place-items:center!important;
      line-height:1!important;
      font-size:16px!important;
    }
    .choice-grid .choice-card:not(.visual-choice) strong{
      margin:0!important;
      flex:1 1 auto!important;
    }
    .recommend-card{aspect-ratio:1/1!important;background:#e5ebe3!important;}
    .recommend-card img{width:100%!important;height:100%!important;object-fit:cover!important;object-position:center!important;display:block!important;}
    .recommend-card.is-missing{display:block!important;}
    .recommend-card.is-missing::before{display:none!important;}
  `;
  document.head.appendChild(style);

  const women = [
    ['A-Line Bob','18406-preview-724799389243-2026-04-09_22_01_05.avif'],
    ['Bixie','18414-preview-475839738317-2026-04-09_22_01_05.avif'],
    ['Bob — Disheveled','18419-preview-829366516517-2026-04-09_22_01_05.avif'],
    ['Bob — With Bangs','18422-preview-477573488853-2026-04-09_22_01_05.avif'],
    ['Bob — Without Bangs','18425-preview-729741919462-2026-04-09_22_01_05.avif'],
    ['Bouncy Curls','18429-preview-825187553872-2026-04-09_22_01_05.avif']
  ];
  const men = [
    ['Classic Taper','18432-preview-742181861362-2026-04-09_22_01_05.avif'],
    ['Textured Crop','18433-preview-734827644337-2026-04-09_22_01_05.avif'],
    ['Modern Quiff','18434-preview-334865328755-2026-04-09_22_01_05.avif'],
    ['Crew Cut','18437-preview-892193312582-2026-04-09_22_01_05.avif'],
    ['French Crop','18440-preview-314826365635-2026-04-09_22_01_05.avif'],
    ['Medium Flow','18443-preview-177851835729-2026-04-09_22_01_05.avif'],
    ['Slick Back','18444-preview-327176111471-2026-04-09_22_01_05.avif']
  ];

  const recommendationCard = ([name,file]) => `
    <article class="recommend-card">
      <img src="/media/${encodeURIComponent(file)}" alt="${esc(name)} hairstyle preview" loading="eager" decoding="async">
      <div class="recommend-name">${esc(name)}</div>
    </article>`;

  showProfileComplete = function showFixedRecommendations(){
    phase='recommendations';
    updateProgress();
    flowFooter.style.display='none';
    const isMan=String(answers.gender||'').toLowerCase()==='man';
    const catalog=isMan?men:women;
    answers.recommendedStyles=catalog.map(x=>x[0]);
    saveQuiz();
    flowContent.innerHTML=`<section class="recommend-stage quiz-stage">
      <div class="recommend-head">
        <div class="quiz-kicker">Suas sugestões de penteados</div>
        <h2 class="quiz-title">Penteados que vale a pena explorar para você.</h2>
        <p class="quiz-help">Com base nas suas respostas, estas são boas direções para começar. As prévias finais do seu pedido serão preparadas usando a sua própria foto.</p>
      </div>
      <div class="recommend-shell"><div class="recommend-grid">${catalog.map(recommendationCard).join('')}</div></div>
      <div class="recommend-actions">
        <button type="button" class="btn btn-secondary" id="recommendBack">← Voltar</button>
        <button type="button" class="btn btn-primary" id="recommendContinue">Continuar com essas ideias →</button>
      </div>
    </section>`;
    $('#recommendBack',flowContent)?.addEventListener('click',()=>{phase='quiz';step=questions.length-1;goToStep(renderQuiz,'back');});
    $('#recommendContinue',flowContent)?.addEventListener('click',()=>goToStep(showUpload));
    track('hairstyle_recommendations_view',{gender:answers.gender||'unknown',top:answers.recommendedStyles});
  };
})();
