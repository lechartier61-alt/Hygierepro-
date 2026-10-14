export const LEGAL_VERSIONS=Object.freeze({
  cgv:'2026-08-24',
  cgu:'2026-08-24',
  dpa:'2026-08-24',
  privacy:'2026-08-24'
});

export const REQUIRED_LEGAL_DOCUMENTS=Object.freeze(['cgv','cgu','dpa','privacy']);

export async function legalAcceptanceState(client,userId){
  const {rows}=await client.query(`SELECT document_type,document_version,accepted_at FROM legal_acceptances WHERE user_id=$1`,[userId]);
  const latest=new Map(rows.map(x=>[x.document_type,x]));
  const missing=REQUIRED_LEGAL_DOCUMENTS.filter(type=>latest.get(type)?.document_version!==LEGAL_VERSIONS[type]);
  return {complete:missing.length===0,missing,versions:LEGAL_VERSIONS};
}

export async function saveLegalAcceptances(client,{organizationId,userId,ip,userAgent}){
  for(const type of REQUIRED_LEGAL_DOCUMENTS){
    await client.query(`INSERT INTO legal_acceptances(organization_id,user_id,document_type,document_version,ip,user_agent)
      VALUES($1,$2,$3,$4,$5,$6)
      ON CONFLICT(user_id,document_type,document_version) DO NOTHING`,
      [organizationId,userId,type,LEGAL_VERSIONS[type],ip||null,String(userAgent||'').slice(0,500)]);
  }
}
