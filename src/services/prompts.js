const templates = [
  ['Recommended','Soft Layered Lob','shoulder-length softly layered lob with natural movement and subtle face-framing'],
  ['Recommended','Polished Shoulder Layers','polished shoulder-length layers with gentle volume and a refined silhouette'],
  ['Recommended','Modern Soft Bob','modern soft bob with movement, not blunt, flattering and natural'],
  ['Recommended','Airy Face-Framing Layers','airy face-framing layers with realistic volume and salon-finished texture'],
  ['Recommended','Elegant Long Layers','elegant long layers with controlled movement and healthy realistic ends'],
  ['Recommended','Textured Collarbone Cut','collarbone cut with subtle texture and soft dimensional movement'],
  ['Recommended','Soft Side Part','soft side-parted style with natural lift at the crown'],
  ['Recommended','Refined Midi Cut','refined medium-length cut with balanced shape and easy sophistication'],
  ['Modern Layers','Modern Shag-Lite','subtle modern shag-inspired layers, sophisticated rather than edgy'],
  ['Modern Layers','Feathered Midi Layers','feathered medium layers with light movement around the face'],
  ['Modern Layers','Soft Butterfly Layers','soft butterfly-inspired layers with restrained volume'],
  ['Modern Layers','Long Face Frame','long layers with face-framing pieces and realistic natural texture'],
  ['Modern Layers','Tapered Shoulder Cut','tapered shoulder-length cut with polished movement'],
  ['Modern Layers','Modern Rounded Layers','rounded medium layers with controlled salon volume'],
  ['Easy-Care','Easy Soft Bob','easy-care soft bob that air-dries naturally and keeps a polished shape'],
  ['Easy-Care','Low-Maintenance Lob','low-maintenance long bob with subtle layers and natural finish'],
  ['Easy-Care','Simple Shoulder Cut','simple shoulder-length cut with minimal styling required'],
  ['Easy-Care','Soft Taper','soft tapered medium cut with clean shape and realistic everyday styling'],
  ['Easy-Care','Natural Midi','natural medium-length style with effortless movement'],
  ['Color Directions','Warm Brunette Dimension','same haircut with warm brunette dimensional color and subtle natural highlights'],
  ['Color Directions','Cool Brunette Dimension','same haircut with cool brunette dimensional color and natural depth'],
  ['Color Directions','Soft Honey Blonde','same haircut with soft honey blonde dimension, realistic salon color'],
  ['Color Directions','Auburn Glow','same haircut with refined auburn-copper dimension, realistic and elegant'],
  ['Color Directions','Champagne Blonde','same haircut with muted champagne blonde dimension and natural roots'],
  ['Gray-Friendly','Soft Gray Blend','same haircut with elegant soft gray blending and dimensional natural silver'],
  ['Gray-Friendly','Natural Silver','same haircut preserving natural silver-gray tones with healthy shine'],
  ['Gray-Friendly','Brunette Gray Blend','same haircut with brunette base and softly blended gray strands'],
  ['Bolder Options','Confident Pixie-Bob','sophisticated pixie-bob hybrid with soft edges and flattering volume'],
  ['Bolder Options','Chic French Bob','chic soft French bob, refined and wearable, with natural texture'],
  ['Bolder Options','Statement Layers','confident layered transformation with visible movement while remaining elegant']
];

function preferredColors(lead){
  const v=lead.desired_colors;
  if(Array.isArray(v)&&v.length)return v.join(', ');
  return 'natural, believable salon color';
}

export function buildGenerationJobs(lead, targetCount=30, model='') {
  return templates.slice(0,targetCount).map(([category,styleName,direction], index) => {
    const prompt = [
      'Edit only the hairstyle and hair color of the person in the input portrait.',
      `Create: ${direction}.`,
      `User context: age range ${lead.age_range||'adult'}; natural texture ${lead.texture||'unspecified'}; current length ${lead.current_length||'unspecified'}; desired length ${lead.desired_length||'open'}; desired colors ${preferredColors(lead)}; style personality ${lead.style_personality||'balanced'}; styling maintenance ${lead.maintenance_level||'moderate'}; bangs preference ${lead.bangs_preference||'open'}; gray preference ${lead.gray_preference||'not specified'}; goals ${(lead.style_goals||[]).join(', ')||'flattering and wearable'}.`,
      'Preserve the same person and identity: do not change facial features, eyes, nose, mouth, jawline, skin tone, apparent age, body, pose, camera angle, lighting, clothing, or background.',
      'Keep realistic hairline placement, believable strand detail, natural scalp coverage, and salon-realistic color. Avoid wigs, plastic texture, beauty retouching, face reshaping, age reduction, or changing ethnicity.',
      'The result should look like a realistic preview this exact person could show to a professional stylist.'
    ].join(' ');
    return { category, style_name:styleName, prompt, sort_order:index+1, model };
  });
}
