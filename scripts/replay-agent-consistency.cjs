// Phát lại raw response đã lưu để kiểm tra cổng mâu thuẫn, không gọi model.
const fs = require('node:fs'), path = require('node:path');
const crypto = require('node:crypto');
const { makeBenchmarkDirectory } = require('./check-engines.js');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'benchmark/results/agent-flow-nv9OXO');
const read = name => JSON.parse(fs.readFileSync(path.join(source,name),'utf8'));
async function main(){
  const out=makeBenchmarkDirectory('consistency-replay-');
  const plan=read('giao-thuc.json'), old=read('cases.json'), calls=read('model-calls.json');
  const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  const files = ['scripts/replay-agent-consistency.cjs', 'scripts/check-engines.js', 'src/types.ts', 'src/ai/agents/slmClient.ts', 'src/ai/agents/slmResponse.ts', 'src/ai/agents/slmCatalog.ts',
    ...fs.readdirSync(path.join(root,'src/ai/agents/document')).filter(file=>file.endsWith('.ts')).map(file=>'src/ai/agents/document/'+file)];
  const codeHashes = Object.fromEntries(files.map(file=>[file,digest(path.join(root,file))]));
  for (const file of files) { const dest=path.join(out,'source-snapshot',file+'.snapshot');fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,file),dest); }
  const {runIpiDocScan}=require('../engine/scanner/ipi-doc-scan');
  const {createServer}=await import('vite');
  const server=await createServer({configFile:false,root,server:{middlewareMode:true,hmr:false},optimizeDeps:{noDiscovery:true},appType:'custom'});
  const rows=[];let current,queue;
  fs.mkdirSync(path.join(out,'input'));
  try{
    const {runIpiDocumentPipeline}=await server.ssrLoadModule('/src/ai/agents/document/ipiPipeline.ts');
    globalThis.owaspWorkbench={scanIpiDoc:(files,scanProfile)=>runIpiDocScan(files,{scanProfile}),aiFetch:async payload=>{
      if(!payload.url.includes('/chat/completions'))return{ok:true,status:200,body:'{}'};
      const call=queue.shift();
      if(!call||JSON.parse(payload.body).model!==call.request.model)throw Error(`Replay sai thứ tự: ${current.id}`);
      return{ok:call.status>=200&&call.status<300,status:call.status,body:call.response||'',error:call.error};
    }};
    for(const item of plan.cases){
      current=item;queue=calls.filter(call=>call.case_id===item.id);
      const file=path.join(out,'input','document'+item.format);fs.writeFileSync(file,item.text);
      const state=await runIpiDocumentPipeline({filePaths:[file],scanProfile:'balanced',fixModel:'gemma3:1b',checkModel:'qwen2.5-coder:1.5b'});
      if(queue.length)throw Error(`Replay chưa dùng đủ response: ${item.id}`);
      const previous=old.find(row=>row.id===item.id);
      rows.push({id:item.id,before_verdict:previous.verdict,after_verdict:state.check?.verdict,before_processing:previous.processing,after_processing:state.processingStatus,
        conflicts:state.suspicions.filter(row=>row.conflicts?.length),state});
    }
    const summary={source:path.relative(root,source),cases:rows.length,raw_responses:calls.length,model_calls:0,
      command:'node scripts/replay-agent-consistency.cjs',code_sha256:codeHashes,
      input_sha256:Object.fromEntries(['giao-thuc.json','cases.json','model-calls.json'].map(file=>[file,digest(path.join(source,file))])),
      verdict_changes:rows.filter(row=>row.before_verdict!==row.after_verdict).map(row=>row.id),
      processing_changes:rows.filter(row=>row.before_processing!==row.after_processing).map(row=>row.id),
      conflict_cases:rows.filter(row=>row.conflicts.length).map(row=>row.id),
      truncated_output_cases:rows.filter(row=>row.state.batchFailures?.some(failure=>failure.code==='output_truncated')).map(row=>row.id),
      failure_codes:rows.flatMap(row=>row.state.batchFailures||[]).reduce((out,failure)=>{out[failure.code]=(out[failure.code]||0)+1;return out;},{}),
      all_conflicting_suspicions_unresolved:rows.every(row=>row.conflicts.every(item=>item.status==='unresolved')),
      limitation:'Replay kiểm chính sách với đầu ra cũ, không phải đo mới năng lực model hoặc holdout độc lập.'};
    fs.writeFileSync(path.join(out,'cases.json'),JSON.stringify(rows,null,2));
    fs.writeFileSync(path.join(out,'tong-hop.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify({out,...summary}));
  }finally{delete globalThis.owaspWorkbench;await server.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
