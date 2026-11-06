// Bộ gọi thử nghiệm: chỉ nguồn/target đi vào ba skill, không có nhãn benchmark.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const c=require('./contracts.cjs'),bindings=require('./source-bindings.cjs');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
// Gộp đúng các đoạn giao target, giữ mọi ký tự và offset; không cắt hoặc đoán lại target.
function segmentsForTarget(source,target) {
 const start=source.indexOf(target),end=start+target.length;
 if(!target||start<0||source.lastIndexOf(target)!==start)throw Error('target_not_unique_in_source');
 const segments=c.compactSourceSegments(source),first=segments.findIndex(s=>s.end>start),last=segments.findIndex(s=>s.end>=end);
 if(first<0||last<0)throw Error('target_outside_source');
 if(first!==last)segments.splice(first,last-first+1,{ref:'merged',start:segments[first].start,end:segments[last].end,text:source.slice(segments[first].start,segments[last].end),integrationMerged:true});
 const result=segments.map((s,i)=>({...s,ref:'s'+i}));
 if(result.map(s=>s.text).join('')!==source)throw Error('source_coverage_changed');return result;
}
function createSkillReviewer({configFile=path.join(__dirname,'../frozen/integration-v2.json'),transport,onCall=()=>{}}={}) {
  const bytes=fs.readFileSync(configFile),config=JSON.parse(bytes),configurationHash=sha(bytes);
  for(const [file,key]of [['contracts.cjs','contractsSha256'],['source-bindings.cjs','bindingsSha256'],['runtime.cjs','runtimeSha256']])
    if(sha(fs.readFileSync(path.join(__dirname,file)))!==config[key])throw Error('Mã skill khác cấu hình đã khóa: '+file);
  async function chat(request,deadline,stage) {
    const started=Date.now();let response,error;
    try {
      if(deadline<=Date.now())throw Error('Hết ngân sách skill.');
      if(transport)response=await transport(request,deadline,stage);
      else {const r=await fetch('http://127.0.0.1:11434/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(Math.max(1,deadline-Date.now()))});if(!r.ok)throw Error('HTTP '+r.status);response=await r.json();}
      if(response.done_reason==='length')throw Error('output_truncated');
      return JSON.parse(response.message.content);
    }catch(e){error=String(e);throw e;}finally{onCall({stage,request,response,error,latencyMs:Date.now()-started});}
  }
  async function slot(name,source,target,segments,deadline,claim) {
    const p=config.profiles[name],targetRef=c.targetReference(source,segments,target);
    const bound=segments.some(s=>s.integrationMerged)?null:name==='ipi-instruction-recipient'?bindings.literalRecipient(source,target,segments)
      :name==='ipi-command-context'?bindings.literalContext(source,target,segments):null;
    let parsed,normalized,resolved;
    if(bound)parsed=bound.parsed;
    else {
      const request=name==='ipi-evidence-review'?c.transferEvidenceRequest(p.request,{evidence:segments.map(({ref,text})=>({ref,text})),claim},p.body)
        :c.transferTargetRequest(p.request,segments,target,p.body);
      if(name==='ipi-command-context')request.format.properties.reason=structuredClone(p.request.format.properties.reason);
      parsed=await chat(request,deadline,name);
      if(name==='ipi-command-context') {
        c.resolveBoundContext(parsed,segments,targetRef);
        if(!c.completeContextReason(parsed.reason)) {
          const repair=structuredClone(config.reasonRepairTemplate);
          repair.messages[1].content=JSON.stringify({source:JSON.parse(request.messages[1].content),draftReason:parsed.reason});
          parsed=c.applyReasonRepair(parsed,await chat(repair,deadline,'context-reason-repair'),segments,targetRef).parsed;
        }
      }
    }
    if(name==='ipi-instruction-recipient') {const refs=c.resolveReferences(parsed,segments,['ai','human','other','unknown']);if(parsed.actionRef!==targetRef)throw Error('wrong_target');resolved=[refs.actor,refs.action].filter(Boolean);normalized=parsed;}
    else if(name==='ipi-command-context'){resolved=c.resolveBriefContext(parsed,segments,targetRef);normalized=parsed;}
    else {const value=c.resolveEvidenceNames(parsed,segments,'decision',p.request.format.properties.decision.enum);normalized=value.normalized;resolved=value.resolved;}
    return {decision:normalized.decision,reason:normalized.reason,references:[...new Map(resolved.map(r=>[r.ref,r])).values()].map(({text,start,end})=>({text,start,end})),origin:bound?'source-binding':'model',...(bound?{proof:bound.proof}:{})};
  }
  const reviewer=async({source,target,deadline})=>{
    const result={status:'error'};
    try {
      const segments=segmentsForTarget(source,target);c.targetReference(source,segments,target);
      result.recipient=await slot('ipi-instruction-recipient',source,target,segments,deadline);
      result.context=await slot('ipi-command-context',source,target,segments,deadline);
      const claims={direct_reading_ai_instruction:'Nguồn trực tiếp yêu cầu trợ lý AI đang đọc thực hiện hành động trong đoạn: '+JSON.stringify(target),
        explicit_quote_application:'Ngoài câu trích, nguồn yêu cầu AI đang đọc áp dụng chính câu trích đó.',
        quoted_without_frame:'Nguồn chỉ gồm câu trong dấu trích và không cung cấp khung ngữ cảnh để biết cách dùng nó.'};
      // Claim là phát biểu về nguồn, không phải nhãn tấn công hay kết luận của Detector/Verifier.
      const claim=claims[result.context.proof?.kind]||result.context.reason;
      result.evidence=await slot('ipi-evidence-review',source,target,segments,deadline,claim);
      result.status='complete';
    }catch(error){result.error=String(error);}
    return result;
  };
  return {reviewer,configurationHash,config};
}
module.exports={createSkillReviewer,segmentsForTarget};
