const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {extractDocumentText}=require('../../../engine/document/extractors/document-text-extractor');
const {scanTextForIpi}=require('../../../engine/prefilter/document-prefilter');
const {runIpiDocScan}=require('../../../engine/scanner/ipi-doc-scan');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const base=path.resolve('benchmark/results/round-one-eval-RTE04X');
const observations=require(path.join(base,'cases.json'));
const manifest=require(path.join(base,'manifest.json'));
const notes=require('./dieu-kien-prefilter.json');
(async()=>{
 const cases=[];
 for(const item of manifest.cases.filter(row=>row.expected_label==='malicious')){
  const file=path.join(base,item.id+item.format);
  assert.equal(hash(fs.readFileSync(file)),item.input_sha256,item.id);
  const extracted=await extractDocumentText(file);assert(extracted.ok,item.id);
  const views=(extracted.views??[{id:'extracted-text',text:extracted.text}]).map(view=>({
   id:view.id, spans_present:item.gold_spans.map(span=>view.text.includes(span)),
   off:scanTextForIpi(view.text,file).map(r=>r.ruleId),
   on:scanTextForIpi(view.text,file,'',{includeSummaryOverrideCandidates:true}).map(r=>r.ruleId),
  }));
  const [off,on]=await Promise.all([false,true].map(includeSummaryOverrideCandidates=>runIpiDocScan([file],{scanProfile:'balanced',includeSummaryOverrideCandidates})));
  const old=observations.find(r=>r.id===item.id);
  const progress=old.state.reviewProgress;
  const joint=old.state.scanResult.metadata.semanticChunks.filter(c=>progress.detectorReviewedChunkIds.includes(c.chunkId)&&progress.verifierReviewedChunkIds.includes(c.chunkId));
  cases.push({id:item.id,format:item.format,group:item.group_id,evidence_summary:item.label_basis,views,
   jointly_reviewed:item.gold_spans.every(span=>joint.some(c=>c.text.includes(span))),
   off:off.findings.map(r=>r.ruleId),on:on.findings.map(r=>r.ruleId),
   condition:notes[cases.length]});
 }
 assert.equal(cases.length,25);
 assert(cases.every(c=>c.views.some(v=>v.spans_present.every(Boolean))&&c.jointly_reviewed&&c.off.length===0));
 assert.deepEqual(cases.filter(c=>c.on.length).map(c=>c.id),['doc-24','doc-25']);
 console.log(JSON.stringify({baseline:'round-one-eval-RTE04X',cases},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
