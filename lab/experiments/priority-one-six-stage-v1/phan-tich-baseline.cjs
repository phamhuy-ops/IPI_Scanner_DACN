const fs=require('node:fs'), assert=require('node:assert/strict'), path=require('node:path');
const dir=path.resolve(process.argv[2]??'benchmark/results/round-one-eval-RTE04X');
const read=name=>JSON.parse(fs.readFileSync(path.join(dir,name)));
const summary=read('summary.json'), manifest=read('manifest.json'), rows=read('cases.json');
const selected=new Map(manifest.cases.map(row=>[row.id,row]));
assert.equal(selected.size,manifest.cases.length);
assert.equal(new Set(rows.map(row=>row.id)).size,rows.length);
const cases=rows.map(row=>{
 const expected=selected.get(row.id);
 assert(expected && expected.expected_label===row.label,row.id);
 const state=row.state;
 const reasons=[];
 if(row.processing!=='completed') reasons.push(row.processing);
 if(row.chunk_coverage && row.chunk_coverage.jointly_reviewed<row.chunk_coverage.total) reasons.push('thiếu_độ_bao_phủ');
 if(row.label==='malicious'){
  const spans=row.gold_spans;
  if(spans.some(span=>!span.survives_extraction)) reasons.push('span_không_qua_trích_xuất');
  if(spans.some(span=>span.survives_extraction&&!span.in_selected_chunks)) reasons.push('span_ngoài_tập_chọn');
  if(row.rule_prediction==='benign') reasons.push('không_có_tín_hiệu_prefilter');
  if(row.verdict!=='ipi_detected'){
   for(const role of ['detector','verifier']){
    if(!state.suspicions.some(s=>s[role]?.stance==='confirmed')) reasons.push(role+'_chưa_xác_nhận');
   }
  }
 } else if(row.verdict==='ipi_detected') reasons.push('báo_nhầm');
 if(state.suspicions.some(s=>s.conflicts?.length)) reasons.push('mâu_thuẫn_cùng_vai_trò');
 if(state.batchFailures?.some(f=>f.code==='invalid_citation'&&f.recovery!=='recovered')) reasons.push('lỗi_trích_dẫn');
 if(row.verdict==='needs_review') reasons.push('cần_xem_xét');
 return {id:row.id,label:row.label,verdict:row.verdict,group_id:expected.group_id,reasons};
});
const complete=summary.status==='complete'&&rows.length===selected.size;
console.log(JSON.stringify({complete,selected:selected.size,observed:rows.length,counts:cases.flatMap(x=>x.reasons).reduce((o,k)=>(o[k]=(o[k]??0)+1,o),{}),cases},null,2));
