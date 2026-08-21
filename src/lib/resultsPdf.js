import sharp from 'sharp';

const CANVAS_WIDTH=1240;
const CANVAS_HEIGHT=1754;
const PDF_WIDTH=595.28;
const PDF_HEIGHT=841.89;

const PT_STYLE_NAMES={
  'Classic Textured Pixie':'Pixie Clássico Texturizado',
  'Soft Bixie Cut':'Corte Bixie Suave',
  'Chin-Length French Bob':'Bob Francês na Altura do Queixo',
  'Sleek Angled Bob':'Bob Angulado Elegante',
  'Blunt Collarbone Lob':'Lob Reto na Altura da Clavícula',
  'Shoulder-Length Shag':'Shag na Altura dos Ombros',
  'Curly Layered Midi':'Midi Cacheado em Camadas',
  'Long Butterfly Layers':'Camadas Borboleta Longas',
  'Long U-Shaped Layers':'Camadas Longas em Formato U',
  'Modern Soft Wolf Cut':'Wolf Cut Moderno e Suave'
};
const PT_CATEGORIES={
  'Short Transformations':'Transformações Curtas',
  'Bob Collection':'Coleção Bob',
  'Medium Collection':'Cortes Médios',
  'Long Collection':'Cortes Longos',
  'Statement Collection':'Cortes Marcantes'
};

function xml(value=''){
  return String(value).replace(/[&<>"']/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'
  }[char]));
}

function localizedCopy(locale='en'){
  if(locale==='pt-BR')return {
    eyebrow:'COLEÇÃO PERSONALIZADA',
    title:'Suas 10 novas possibilidades',
    subtitle:'Pré-visualizações de cortes criadas a partir da sua foto.',
    coverNoteLines:['Use esta coleção para','comparar formatos,','comprimentos e camadas','com seu cabeleireiro.'],
    style:'CORTE',
    footer:'Visualização por IA · O resultado real pode variar conforme textura, condição do cabelo e técnica profissional.'
  };
  return {
    eyebrow:'PERSONALIZED COLLECTION',
    title:'Your 10 new possibilities',
    subtitle:'Haircut previews created from your uploaded portrait.',
    coverNoteLines:['Use this collection to compare','shapes, lengths and layers with','your professional stylist.'],
    style:'HAIRCUT',
    footer:'AI visualization · Real-world results can vary with hair texture, condition and professional technique.'
  };
}

async function coverPage(firstImage,locale,total){
  const copy=localizedCopy(locale);
  const portrait=await sharp(firstImage,{failOn:'error'})
    .rotate()
    .resize({width:650,height:880,fit:'cover',position:'attention'})
    .jpeg({quality:86,chromaSubsampling:'4:4:4'})
    .toBuffer();
  const overlay=Buffer.from(`<svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <rect width="1240" height="1754" fill="#f7f3eb"/>
    <circle cx="1130" cy="110" r="250" fill="#dce8df"/>
    <circle cx="92" cy="1640" r="210" fill="#eadfc7" opacity=".72"/>
    <text x="96" y="130" font-family="Arial, sans-serif" font-size="25" font-weight="700" letter-spacing="4" fill="#52705f">${xml(copy.eyebrow)}</text>
    <text x="96" y="244" font-family="Georgia, serif" font-size="76" fill="#18372d">${xml(copy.title)}</text>
    <text x="99" y="310" font-family="Arial, sans-serif" font-size="29" fill="#617068">${xml(copy.subtitle)}</text>
    <rect x="80" y="390" width="680" height="936" rx="34" fill="#ffffff" stroke="#ded6ca" stroke-width="2"/>
    <rect x="770" y="470" width="382" height="314" rx="28" fill="#18372d"/>
    <text x="814" y="535" font-family="Arial, sans-serif" font-size="18" font-weight="700" letter-spacing="1.6" fill="#cfe0d7">PREMIUMHAIRSTYLES</text>
    <text x="814" y="572" font-family="Arial, sans-serif" font-size="15" font-weight="700" letter-spacing="3" fill="#9eb5a8">AI COLLECTION</text>
    <text x="814" y="682" font-family="Georgia, serif" font-size="112" fill="#ffffff">${total}</text>
    <text x="814" y="735" font-family="Arial, sans-serif" font-size="24" fill="#dbe8e0">${locale==='pt-BR'?'cortes diferentes':'distinct haircuts'}</text>
    <text x="790" y="920" font-family="Arial, sans-serif" font-size="27" fill="#405047">${copy.coverNoteLines.map((line,index)=>`<tspan x="790" dy="${index?46:0}">${xml(line)}</tspan>`).join('')}</text>
    <text x="96" y="1640" font-family="Arial, sans-serif" font-size="21" fill="#708078">premium-hairstyles.com</text>
  </svg>`);
  return sharp({create:{width:CANVAS_WIDTH,height:CANVAS_HEIGHT,channels:3,background:'#f7f3eb'}})
    .composite([{input:overlay,top:0,left:0},{input:portrait,top:418,left:95}])
    .jpeg({quality:86,chromaSubsampling:'4:4:4'})
    .toBuffer();
}

async function hairstylePage(image,result,index,total,locale){
  const copy=localizedCopy(locale);
  const portrait=await sharp(image,{failOn:'error'})
    .rotate()
    .resize({width:930,height:1240,fit:'contain',background:'#e9e4da'})
    .jpeg({quality:88,chromaSubsampling:'4:4:4'})
    .toBuffer();
  const rawTitle=result.style_name||`Style ${index}`;
  const rawCategory=result.category||'Personalized';
  const displayTitle=locale==='pt-BR'?(PT_STYLE_NAMES[rawTitle]||rawTitle):rawTitle;
  const title=xml(displayTitle);
  const titleFontSize=displayTitle.length>36?42:displayTitle.length>28?50:60;
  const category=xml(locale==='pt-BR'?(PT_CATEGORIES[rawCategory]||rawCategory):rawCategory);
  const overlay=Buffer.from(`<svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <rect width="1240" height="1754" fill="#fcfaf6"/>
    <rect x="0" y="0" width="1240" height="18" fill="#18372d"/>
    <text x="78" y="104" font-family="Arial, sans-serif" font-size="22" font-weight="700" letter-spacing="3" fill="#52705f">${xml(copy.style)} ${String(index).padStart(2,'0')} / ${String(total).padStart(2,'0')}</text>
    <text x="78" y="184" font-family="Georgia, serif" font-size="${titleFontSize}" fill="#18372d">${title}</text>
    <text x="82" y="231" font-family="Arial, sans-serif" font-size="22" fill="#7b6e5d">${category}</text>
    <rect x="60" y="275" width="1120" height="1330" rx="34" fill="#f3efe7" stroke="#ded6ca" stroke-width="2"/>
    <text x="78" y="1688" font-family="Arial, sans-serif" font-size="17" fill="#77817b">${xml(copy.footer)}</text>
  </svg>`);
  return sharp({create:{width:CANVAS_WIDTH,height:CANVAS_HEIGHT,channels:3,background:'#fcfaf6'}})
    .composite([{input:overlay,top:0,left:0},{input:portrait,top:320,left:155}])
    .jpeg({quality:86,chromaSubsampling:'4:4:4'})
    .toBuffer();
}

function streamObject(dictionary,stream){
  return Buffer.concat([
    Buffer.from(`<< ${dictionary} /Length ${stream.length} >>\nstream\n`),
    stream,
    Buffer.from('\nendstream')
  ]);
}

function assemblePdf(pageImages){
  const objectCount=2+pageImages.length*3;
  const objects=new Array(objectCount+1);
  const pageIds=[];
  objects[1]=Buffer.from('<< /Type /Catalog /Pages 2 0 R >>');
  for(let index=0;index<pageImages.length;index+=1){
    const pageId=3+index*3;
    const contentId=pageId+1;
    const imageId=pageId+2;
    const imageName=`Im${index+1}`;
    pageIds.push(pageId);
    objects[pageId]=Buffer.from(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_WIDTH} ${PDF_HEIGHT}] /Resources << /XObject << /${imageName} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    const drawing=Buffer.from(`q\n${PDF_WIDTH} 0 0 ${PDF_HEIGHT} 0 0 cm\n/${imageName} Do\nQ`);
    objects[contentId]=streamObject('',drawing);
    objects[imageId]=streamObject(`/Type /XObject /Subtype /Image /Width ${CANVAS_WIDTH} /Height ${CANVAS_HEIGHT} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`,pageImages[index]);
  }
  objects[2]=Buffer.from(`<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map(id=>`${id} 0 R`).join(' ')}] >>`);

  const header=Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n','binary');
  const chunks=[header];
  const offsets=new Array(objectCount+1).fill(0);
  let offset=header.length;
  for(let id=1;id<=objectCount;id+=1){
    const chunk=Buffer.concat([Buffer.from(`${id} 0 obj\n`),objects[id],Buffer.from('\nendobj\n')]);
    offsets[id]=offset;
    chunks.push(chunk);
    offset+=chunk.length;
  }
  const xrefOffset=offset;
  const xref=Buffer.from(`xref\n0 ${objectCount+1}\n0000000000 65535 f \n${offsets.slice(1).map(value=>`${String(value).padStart(10,'0')} 00000 n `).join('\n')}\ntrailer\n<< /Size ${objectCount+1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);
  chunks.push(xref);
  return Buffer.concat(chunks);
}

export async function buildResultsPdf({results,locale='en',loadImage}){
  const available=(results||[]).filter(result=>!result.deleted_at).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
  if(!available.length)throw new Error('No result images are available for PDF generation');
  const sourceImages=[];
  for(const result of available)sourceImages.push(await loadImage(result));
  const pages=[await coverPage(sourceImages[0],locale,available.length)];
  for(let index=0;index<available.length;index+=1){
    pages.push(await hairstylePage(sourceImages[index],available[index],index+1,available.length,locale));
  }
  return assemblePdf(pages);
}
