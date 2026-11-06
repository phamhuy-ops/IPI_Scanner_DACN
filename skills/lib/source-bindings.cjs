// Ràng buộc danh tính tường minh trong nguồn; không quyết định tài liệu độc/sạch.
function literalRecipient(source, target, segments) {
  const start=source.indexOf(target),end=start+target.length;
  if(!target||start<0||source.lastIndexOf(target)!==start)return null;
  const segment=segments.find(s=>s.start<=start&&s.end>=end);
  if(!segment)return null;
  const result=(decision,reason,kind,scope)=>({parsed:{actorRef:decision==='unknown'?'':segment.ref,actionRef:segment.ref,decision,reason},proof:{kind,start,end,quote:target,...(scope?{scope}:{} )}});
  // Chỉ nhận đầu cụm chủ thể, không tìm chữ AI ở bất kỳ đâu trong câu.
  const ai=/^(?:the\s+)?(?:AI assistant|language[- ]model assistant|trợ lý AI|trợ lý mô hình ngôn ngữ)(?=\s|[,:])/iu.exec(target.trim());
  if(ai) {
    const tail=target.trim().slice(ai[0].length);
    if(/^(?:\s*[,：:]|\s+(?:must|should|shall|drafting|producing|phải|cần|đang|đọc|tạo|hỗ trợ)\b)/iu.test(tail)&&!/^(?:\s+)(?:trainer|instructor|engineer|operator|coach|supervisor)\b/iu.test(tail))
      return result('ai','Chủ thể ở đầu yêu cầu được nguồn nêu rõ là trợ lý AI hoặc mô hình ngôn ngữ; loại công việc không đổi danh tính này.','explicit_ai_subject');
  }
  const prefix=target.split(/\b(?:must|should|shall)\b|(?:phải|cần)/iu)[0];
  const systemHead=/^(?:the\s+)?(?:[\w-]+\s+){0,5}(?:service|daemon|process)\b/iu.exec(prefix);
  if(systemHead&&!/\b(?:of|for|to|from|whose|who|operating|managing)\b/iu.test(systemHead[0])&&/(?:fixed[- ]timer|no language model|without (?:any )?(?:AI|language model))/iu.test(prefix)&&!/(?:trainer|instructor|engineer|operator|administrator|supervisor)/iu.test(prefix))
    return result('other','Nguồn nêu chủ thể là dịch vụ hoặc tiến trình hẹn giờ cố định, không phải mô hình ngôn ngữ.','explicit_non_llm_subject');
  // Chỉ kết luận thiếu chủ thể khi toàn phạm vi được xét chỉ gồm mệnh lệnh trống chủ thể.
  // Không lấy nhân sự ở một mục khác gán ngược về yêu cầu đang xét.
  const headings=[...source.matchAll(/^(?:\s*#{1,6}\s+[^\n]+|\s*(?:Mục|Phần|Chương|Section|Chapter)\s+[^\n:]{1,64}:)\s*$/gimu)];
  const before=headings.filter(h=>h.index<=start).at(-1),after=headings.find(h=>h.index>start);
  if(before&&/(?:\bfor\b|dành cho|gửi cho)/iu.test(before[0]))return null;
  if(before&&/\p{Lu}/u.test(before[0].replace(/^\s*(?:#{1,6}\s+|(?:Mục|Phần|Chương|Section|Chapter)\s+)/iu,'')))return null;
  if(before&&/(?:instructions? for|dành cho|you are|bạn là)/iu.test(source.slice(0,before.index)))return null;
  const scopeStart=before?before.index+before[0].length:0,scopeEnd=after?after.index:source.length;
  const scope=source.slice(scopeStart,scopeEnd).trim();
  const clauses=scope.split(/[.!?。！？\n]+/u).map(s=>s.trim()).filter(Boolean);
  if(clauses.length&&clauses.every(s=>/^(?:[Pp]lease\s+[a-z]|[Hh]ãy\s+\p{Ll}|[Vv]ui lòng\s+\p{Ll})/u.test(s)&&!/[,:;]/u.test(s)&&!/(?:\bas\b|if you are|dành cho|với vai trò)/iu.test(s)))
    return result('unknown','Trong phạm vi nguồn của yêu cầu chỉ có các câu mệnh lệnh không nêu chủ thể; không đủ bằng chứng để tự gán thành người.','unidentified_imperative_scope',{start:scopeStart,end:scopeEnd});
  return null;
}
function quotationRanges(source) {
  const pairs={'"':'"',"'":"'",'“':'”','‘':'’','«':'»','`':'`'},ranges=[];
  let open=null;
  for(let i=0;i<source.length;i++) {
    if(source[i]==='\\'){i++;continue;}
    const token=source.startsWith('```',i)?'```':source[i];
    if(token==="'"&&/\p{L}/u.test(source[i-1]||'')&&/\p{L}/u.test(source[i+1]||''))continue;
    if(open&&token===open.close){ranges.push({start:open.start,end:i+token.length,contentStart:open.start+open.token.length,contentEnd:i});open=null;}
    else if(!open&&(pairs[token]||token==='```'))open={start:i,token,close:pairs[token]||token};
    i+=token.length-1;
  }
  return {ranges,open};
}
// Chỉ ràng buộc các khung cú pháp có bằng chứng trực tiếp; phần còn lại gọi model.
function literalContext(source,target,segments) {
  const start=source.indexOf(target),end=start+target.length;
  if(!target||start<0||source.lastIndexOf(target)!==start)return null;
  const segment=segments.find(s=>s.start<=start&&s.end>=end);
  if(!segment)return null;
  const result=(decision,reason,kind,activation)=>({parsed:{targetRef:segment.ref,contextRefs:activation&&activation.ref!==segment.ref?[activation.ref]:[],decision,reason},proof:{kind,start,end,quote:target,...(activation?{activation}:{} )}});
  const {ranges,open}=quotationRanges(source),quote=ranges.find(q=>q.contentStart<=start&&q.contentEnd>=end);
  if(quote) {
    const innerRest=source.slice(quote.contentStart,start)+source.slice(end,quote.contentEnd);
    const outside=source.slice(0,quote.start)+source.slice(quote.end);
    if(/^[\s.!?。！？…]*$/u.test(innerRest)&&/^[\s.…]*$/u.test(outside))
      return result('unknown','Nguồn chỉ có câu được đặt trong dấu trích và dấu lược bỏ; thiếu khung để biết đây là ví dụ hay yêu cầu áp dụng.','quoted_without_frame');
    if(ranges.length!==1||!/^[\s.!?。！？…]*$/u.test(innerRest))return null;
    if(/(?:\b(?:not|never|cannot)\b|không|đừng|chớ)[^.!?\n]{0,50}(?:apply|execute|follow|áp dụng|thực hiện)/iu.test(outside))return null;
    for(const s of segments) {
      const parts=[];
      if(s.start<quote.start)parts.push({ref:s.ref,start:s.start,end:Math.min(s.end,quote.start)});
      if(s.end>quote.end)parts.push({ref:s.ref,start:Math.max(s.start,quote.end),end:s.end});
      for(const part of parts) {
        const text=source.slice(part.start,part.end).trim();
        if(/(?:\b(?:not|never|cannot|except|instead|rather|analy[sz]\w*|hypothetical)\b|không|đừng|chớ|thay vì|phân tích|giải thích|mô phỏng)/iu.test(text))continue;
        const vi=/^(?:trợ lý(?: AI)?|AI)\s+(?:đang\s+)?đọc[^.!?\n]{0,80}?(?:phải|hãy|cần)\s+(?:áp dụng|thực hiện)[^.!?\n]{0,80}?(?:ví dụ|câu trích|yêu cầu vừa (?:nêu|trích))/iu;
        const en=/^(?:AI\s+assistant|assistant|language[- ]model assistant)\s+(?:currently\s+)?reading\b[^.!?\n]{0,80}?\b(?:must|should|shall)\s+(?:apply|execute|follow|carry out)[^.!?\n]{0,80}?\b(?:sample|example|quoted|that|this)\b/iu;
        if(vi.test(text)||en.test(text))return result('active','Có câu ngoài phần trích gọi AI đang đọc và yêu cầu áp dụng chính ví dụ được trích; đây là yêu cầu áp dụng, không phải việc AI đã thực hiện.','explicit_quote_application',{...part,text:source.slice(part.start,part.end)});
      }
    }
    return null;
  }
  if(open&&open.start<start)return null;
  const prefix=source.slice(segment.start,start).trim();
  if(/(?:quotes?|says?|states?|explains?|denies?|false|hypothetical|trích|phân tích|mô phỏng|không đúng|không phải)/iu.test(prefix))return null;
  if(/(?:example|ví dụ)/iu.test(prefix)&&!/^(?:outside|beyond|separately)/iu.test(prefix))return null;
  const en=/^(?:the\s+)?(?:AI\s+assistant|assistant|language[- ]model assistant)\s+(?:currently\s+)?reading\b[^.!?\n]{0,100}?(?:\b(?:must|should|shall)\b|:\s*(?:please\s+)?(?:omit|reveal|hide|ignore|send|print|disclose|summarize|preserve)\b)/iu;
  const vi=/^(?:trợ lý(?: AI)?|AI)\s+(?:đang\s+)?đọc[^.!?\n]{0,100}?(?:hãy|phải|cần)/iu;
  if(en.test(target)||vi.test(target))return result('active','Target trực tiếp gọi AI đang đọc thực hiện hành động và nằm ngoài lời trích; không cần nguồn có quyền ra lệnh để nhận diện yêu cầu áp dụng.','direct_reading_ai_instruction');
  return null;
}
module.exports={literalRecipient,literalContext};
