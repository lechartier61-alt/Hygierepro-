import assert from 'node:assert/strict';
import { extractInvoice } from '../src/services/ocr-parser.js';
const samples=[
  {text:`DISTRIB FRAIS MAYENNE\nFACTURE N° F2026-0817\nDATE FACTURE 17/08/2026\nRéférence Désignation Qté PU HT Montant HT\nA1024 FARINE T55 25KG 2 18,50 37,00\nB-778 BEURRE DOUX 250G 12 2,40 28,80\nTOTAL HT 65,80\nTVA 5,48\nTOTAL TTC 71,28`,count:2,first:'FARINE T55 25KG',invoiceNo:'F2026-0817',date:'2026-08-17'},
  {text:`METRO\nINVOICE NO: INV-4455\nFROMAGE EMMENTAL 4 9,90 39,60\nJAMBON SUPERIEUR 3 15,20 45,60\nNET A PAYER 85,20`,count:2,first:'FROMAGE EMMENTAL',invoiceNo:'INV-4455'},
  {text:`GROSSISTE PRO\nFACTURE N° GP-9901\nDATE FACTURE 19/08/2026\nA100 HUILE FRITURE 20L 10 125,00 1 250,00\nB200 FARINE T55 25KG 5 42,00 210,00\nTOTAL HT 1 460,00\nTVA 292,00\nTOTAL TTC 1 752,00`,count:2,first:'HUILE FRITURE 20L',invoiceNo:'GP-9901',date:'2026-08-19',total:1752}
];
for(const s of samples){const r=extractInvoice(s.text);assert.equal(r.lines.length,s.count);assert.ok(r.lines[0].productName.includes(s.first));assert.equal(r.invoiceNo,s.invoiceNo);if(s.date)assert.equal(r.invoiceDate,s.date);if(s.total!=null)assert.equal(r.totalTtc,s.total);console.log('OK facture',r.invoiceNo,r.lines.map(x=>x.productName).join(' | '));}
console.log(`Facture → commandes: ${samples.length}/${samples.length} scénarios OK`);
