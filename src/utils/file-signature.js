const TYPES=[
  {mime:'image/jpeg',ext:'.jpg',test:b=>b.length>=3&&b[0]===0xff&&b[1]===0xd8&&b[2]===0xff},
  {mime:'image/png',ext:'.png',test:b=>b.length>=8&&b.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))},
  {mime:'image/webp',ext:'.webp',test:b=>b.length>=12&&b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP'},
  {mime:'application/pdf',ext:'.pdf',test:b=>b.length>=5&&b.toString('ascii',0,5)==='%PDF-'},
  {mime:'video/mp4',ext:'.mp4',test:b=>b.length>=12&&b.toString('ascii',4,8)==='ftyp'},
  {mime:'video/webm',ext:'.webm',test:b=>b.length>=4&&b[0]===0x1a&&b[1]===0x45&&b[2]===0xdf&&b[3]===0xa3}
];
export function detectFileType(buffer){
  const b=Buffer.isBuffer(buffer)?buffer:Buffer.from(buffer||[]);
  return TYPES.find(t=>t.test(b))||null;
}
export function validateFileBuffer(buffer,allowedMimes){
  const type=detectFileType(buffer);
  if(!type||!allowedMimes.includes(type.mime)){
    const e=new Error('Le contenu réel du fichier n’est pas dans un format autorisé.');
    e.code='INVALID_FILE_SIGNATURE';
    throw e;
  }
  return type;
}
