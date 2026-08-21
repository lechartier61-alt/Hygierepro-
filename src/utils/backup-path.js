const months=['01-janvier','02-fevrier','03-mars','04-avril','05-mai','06-juin','07-juillet','08-aout','09-septembre','10-octobre','11-novembre','12-decembre'];

export function backupDateParts(value){
  const d=value instanceof Date?value:new Date(value||Date.now());
  const safe=Number.isNaN(d.getTime())?new Date():d;
  const year=String(safe.getUTCFullYear());
  const month=months[safe.getUTCMonth()];
  const day=String(safe.getUTCDate()).padStart(2,'0');
  return {year,month,day,path:`annees/${year}/${month}/${day}`};
}

export function safeBackupName(value,fallback='element'){
  const s=String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^[.-]+|[.-]+$/g,'').slice(0,100);
  return s||fallback;
}

export function isoFileStamp(value){
  const d=value instanceof Date?value:new Date(value||Date.now());
  const safe=Number.isNaN(d.getTime())?new Date():d;
  return safe.toISOString().replace(/[:.]/g,'-');
}
