export function csvCell(value){
  let s=String(value??'');
  if(/^[=+\-@\t\r]/.test(s))s="'"+s;
  return `"${s.replace(/"/g,'""')}"`;
}
