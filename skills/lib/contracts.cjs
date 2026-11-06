// Hợp đồng nguồn dùng chung giữa phép đo thành phần và nhánh tích hợp.
const assert=require('node:assert/strict');
function sourceSegments(text) {
  const segments=[]; let buffer='', start=0;
  for(const ch of text) {
    buffer+=ch;
    if(/[\n.!?。！？;]/u.test(ch)||buffer.length>=240) {
      segments.push({ref:'s'+segments.length,text:buffer,start,end:start+buffer.length});
      start+=buffer.length; buffer='';
    }
  }
  if(buffer)segments.push({ref:'s'+segments.length,text:buffer,start,end:start+buffer.length});
  if(segments.map(s=>s.text).join('')!==text)throw Error('source_coverage_changed');
  return segments;
}
function compactSourceSegments(text) {
  const compact=[];
  for(const segment of sourceSegments(text)) {
    const previous=compact.at(-1);
    if(previous && (/^\s+$/u.test(segment.text)||/^\s+$/u.test(previous.text))) {
      previous.text+=segment.text; previous.end=segment.end;
    } else compact.push({...segment});
  }
  return compact.map((segment,index)=>({...segment,ref:'s'+index}));
}
function resolveReferences(parsed, segments, values) {
  if(Object.keys(parsed).sort().join(',')!=='actionRef,actorRef,decision,reason'||!values.includes(parsed.decision)||typeof parsed.reason!=='string'||[...parsed.reason].length<20||!segments.some(s=>s.ref===parsed.actionRef)||(parsed.decision==='unknown'?parsed.actorRef!=='':!segments.some(s=>s.ref===parsed.actorRef)))throw Error('invalid_schema_or_evidence');
  return {actor:segments.find(s=>s.ref===parsed.actorRef)||null,action:segments.find(s=>s.ref===parsed.actionRef)};
}
function targetReference(text, segments, target) {
  const start=typeof target==='string'&&target.length?text.indexOf(target):-1;
  if(start<0||text.lastIndexOf(target)!==start)throw Error('target_not_unique_in_source');
  const found=segments.find(s=>s.start<=start&&s.end>=start+target.length);
  if(!found)throw Error('target_crosses_segments');
  return found.ref;
}
function resolveEvidenceReview(parsed, segments, values=['supported','contradicted','insufficient']) {
  if(Object.keys(parsed).sort().join(',')!=='decision,evidenceRefs,reason'||!values.includes(parsed.decision)||typeof parsed.reason!=='string'||[...parsed.reason].length<20||!Array.isArray(parsed.evidenceRefs)||parsed.evidenceRefs.length<1||parsed.evidenceRefs.length>3||new Set(parsed.evidenceRefs).size!==parsed.evidenceRefs.length||parsed.evidenceRefs.some(ref=>!segments.some(s=>s.ref===ref)))throw Error('invalid_schema_or_evidence');
  return parsed.evidenceRefs.map(ref=>segments.find(s=>s.ref===ref));
}
function transferTargetRequest(template,segments,targetText,baselineBody,candidateBody=baselineBody) {
 const request=structuredClone(template),source=segments.map(s=>s.text).join(''),targetRef=targetReference(source,segments,targetText);
 assert(request.messages[0].content.includes(baselineBody),'transfer_prompt_missing');
 request.messages[0].content=request.messages[0].content.replace(baselineBody,candidateBody);
 request.messages[1].content=JSON.stringify({segments:segments.map(s=>({ref:s.ref,text:s.text})),targetRef});
 if(request.format.properties.contextRefs)Object.assign(request,boundContextRequest(request,segments,targetRef));
 else {request.format.properties.actorRef.enum=['',...segments.map(s=>s.ref)];request.format.properties.actionRef.enum=segments.map(s=>s.ref);}
 return request;
}
function completeContextReason(reason) {
 if(typeof reason!=='string'||!/^[^.!?\n]{20,380}[.!?]$/u.test(reason))return false;
 let depth=0;for(const char of reason){if(char==='(')depth++;if(char===')'&&--depth<0)return false;}return depth===0;
}
function resolveBriefContext(parsed,segments,targetRef) {
 const resolved=resolveBoundContext(parsed,segments,targetRef);
 if(!completeContextReason(parsed.reason))throw Error('incomplete_context_reason');return resolved;
}
function applyReasonRepair(original,repaired,segments,targetRef) {
 if(!repaired||Object.keys(repaired).join(',')!=='reason')throw Error('invalid_reason_repair');
 const parsed={...original,reason:repaired.reason};return {parsed,resolved:resolveBriefContext(parsed,segments,targetRef)};
}
function transferEvidenceRequest(template, input, baselineBody, candidateBody=baselineBody) {
  const request=structuredClone(template);
  assert(request.messages[0].content.includes(baselineBody),'transfer_prompt_missing');
  request.messages[0].content=request.messages[0].content.replace(baselineBody,candidateBody);
  request.messages[1].content=JSON.stringify(input);
  request.format.properties.evidenceRefs.items.enum=input.evidence.map(s=>s.ref);
  return request;
}
function boundContextRequest(template, segments, targetRef) {
  const refs=segments.map(s=>s.ref).filter(ref=>ref!==targetRef);
  return {...template,messages:[{...template.messages[0],content:template.messages[0].content.replace('evidenceRefs phải gồm targetRef và phần nguồn hỗ trợ cách dùng (tối đa ba ref).','targetRef phải bằng target được cấp; contextRefs chỉ chứa đoạn ngữ cảnh khác target (tối đa hai ref).')},template.messages[1]],format:{type:'object',properties:{targetRef:{type:'string',enum:[targetRef]},contextRefs:{type:'array',items:{type:'string',enum:refs.length?refs:['']},minItems:0,maxItems:refs.length?2:0},decision:template.format.properties.decision,reason:{type:'string',minLength:20,maxLength:400}},required:['targetRef','contextRefs','decision','reason'],additionalProperties:false}};
}
function resolveBoundContext(parsed, segments, targetRef) {
  if(!parsed||typeof parsed.reason!=='string'||[...parsed.reason].length>400||Object.keys(parsed).sort().join(',')!=='contextRefs,decision,reason,targetRef'||parsed.targetRef!==targetRef||!Array.isArray(parsed.contextRefs)||parsed.contextRefs.some(ref=>ref===targetRef||!segments.some(s=>s.ref===ref)))throw Error('invalid_bound_evidence');
  return resolveEvidenceReview({decision:parsed.decision,evidenceRefs:[parsed.targetRef,...parsed.contextRefs],reason:parsed.reason},segments,['active','descriptive','unknown']);
}
function resolveEvidenceNames(parsed, segments, key='decision', allowed=['supported','opposite_evidence','missing_evidence']) {
  if(!['decision','sourceRelation'].includes(key)||!parsed||Object.keys(parsed).sort().join(',')!==[key,'evidenceRefs','reason'].sort().join(','))throw Error('invalid_evidence_names');
  const labels={supported:'supported',opposite_evidence:'contradicted',contradicted:'contradicted',missing_evidence:'insufficient'};
  if(!allowed.includes(parsed[key])||!Object.prototype.hasOwnProperty.call(labels,parsed[key]))throw Error('unknown_evidence_name');
  const normalized={decision:labels[parsed[key]],evidenceRefs:parsed.evidenceRefs,reason:parsed.reason};
  return {normalized,resolved:resolveEvidenceReview(normalized,segments)};
}
module.exports={resolveEvidenceNames,sourceSegments,compactSourceSegments,resolveReferences,targetReference,resolveEvidenceReview,boundContextRequest,resolveBoundContext,completeContextReason,resolveBriefContext,applyReasonRepair,transferTargetRequest,transferEvidenceRequest};
