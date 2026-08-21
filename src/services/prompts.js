// Keep this list intentionally structural. Color-only directions make an image
// editor preserve the existing haircut and merely tint the portrait, which is
// the opposite of the product promise.
const hairstyleTemplates = [
  ['Short Transformations','Classic Textured Pixie','a clearly short textured pixie cut, cropped around the ears and nape, with a softly piecey top and a natural feminine hairline'],
  ['Short Transformations','Soft Bixie Cut','a visible bixie transformation between a pixie and bob, with short tapered sides and nape, a fuller layered crown, and longer face-framing pieces'],
  ['Bob Collection','Chin-Length French Bob','a chin-length French bob with a clearly defined compact silhouette, softly curved ends, and a light eyebrow-length fringe'],
  ['Bob Collection','Sleek Angled Bob','a sleek angled bob that is shorter at the nape and visibly longer toward the jaw, with a clean side part and polished straight structure'],
  ['Medium Collection','Blunt Collarbone Lob','a blunt collarbone-length long bob with a strong even perimeter, minimal internal layering, a center part, and natural salon movement'],
  ['Medium Collection','Shoulder-Length Shag','a shoulder-length modern shag with clearly visible choppy layers, crown volume, textured ends, and soft curtain bangs'],
  ['Medium Collection','Curly Layered Midi','a medium-length rounded layered haircut styled in defined natural curls, with balanced volume, visible face-framing, and a distinctly different silhouette'],
  ['Long Collection','Long Butterfly Layers','long butterfly layers with dramatic short-to-long face-framing sections, airy crown volume, and flowing layered ends while retaining believable density'],
  ['Long Collection','Long U-Shaped Layers','a long U-shaped haircut with a clearly visible rounded perimeter, long cascading layers, and a smooth center-parted salon finish'],
  ['Statement Collection','Modern Soft Wolf Cut','a modern soft wolf cut with a visibly layered crown, tapered length, separated textured ends, and long curtain bangs; fashionable but wearable']
];

export function buildGenerationJobs(lead, targetCount=10, model='') {
  const selected=hairstyleTemplates.slice(0,Math.min(targetCount,hairstyleTemplates.length));
  return selected.map(([category,styleName,direction], index) => {
    const prompt = [
      `Change only the haircut of the person in the input portrait to ${direction}.`,
      'This must be an obvious structural haircut transformation: replace the existing hair silhouette and visibly change the relevant length, outline, layers, fringe, parting, and volume so it unmistakably matches the requested haircut. Do not return the original hairstyle with only small styling or color changes.',
      `Adapt the haircut naturally to the person's ${lead.texture||'natural'} hair texture and realistic density. Keep it salon-realistic, wearable, and anatomically believable.`,
      'LOCK THE ORIGINAL HAIR COLOR: preserve exactly the original roots, base color, highlights, undertone, and gray pattern. Do not recolor, tint, brighten, darken, add highlights, or change hair saturation.',
      'LOCK THE PERSON AND PHOTO: preserve the exact same identity, facial structure, eyes, eyebrows, nose, lips, teeth, jawline, ears, skin tone, skin texture, apparent age, expression, makeup, body, pose, clothing, camera crop, perspective, lighting, and background.',
      'Especially do not change lip shape or lip color. Do not beautify, retouch skin, reshape the face, change makeup, add accessories, create a wig-like hairline, or apply a color filter to the image.',
      'The output must look like the same untouched photograph after only a professional haircut change.'
    ].join(' ');
    return { category, style_name:styleName, prompt, sort_order:index+1, model };
  });
}
