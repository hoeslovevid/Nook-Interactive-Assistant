const {PROVIDERS}=require('./studio');
function recommend({task='quick',localOnly=false,maxCost='',inputTokens=4000,outputTokens=1000}={},state={}){
 if(!['quick','coding','writing','images'].includes(task))throw Error('Choose a task.');const cap=maxCost===''||maxCost==null?null:Number(maxCost);if(cap!=null&&(!Number.isFinite(cap)||cap<0||cap>100))throw Error('Enter a per-reply estimate limit between $0 and $100.');
 inputTokens=Math.max(100,Math.min(100000,Math.round(Number(inputTokens)||4000)));outputTokens=Math.max(100,Math.min(10000,Math.round(Number(outputTokens)||1000)));
 const {models={},keys={},roles={},health={},connections={},rates={},usage=[],lock=''}=state,rows=[];
 for(const provider of PROVIDERS){const local=['nook','ollama','lmstudio'].includes(provider);if(local&&provider!=='nook'&&!connections[provider]?.ok&&!health[provider]?.chat)continue;if(provider==='custom'&&!connections.custom?.ok&&!keys.custom)continue;if(localOnly&&!local||lock&&provider!==lock||provider==='nook'&&!health.nook?.ready||!local&&provider!=='custom'&&!keys[provider])continue;
  const candidates=new Set([models[provider],...(provider==='nook'?(health.nook.models||[]):[]),...Object.values(roles).filter(r=>r?.provider===provider).map(r=>r.model)]);
  for(const model of candidates){if(typeof model!=='string'||!model||provider==='nook'&&health.nook.models&&!health.nook.models.includes(model))continue;const detail=health[provider]?.details?.[model]||{},role=roles[task],matched=role?.provider===provider&&role.model===model;if(task==='images'&&detail.vision!==true||detail.contextWindow&&detail.contextWindow<inputTokens+outputTokens)continue;
   const rate=rates[provider+':'+model],known=Number.isFinite(rate?.input)&&Number.isFinite(rate?.output)&&rate.input>=0&&rate.output>=0,cost=local?0:known?(inputTokens*rate.input+outputTokens*rate.output)/1e6:null;if(cap!=null&&(cost==null||cost>cap))continue;
   const times=usage.filter(u=>u.provider===provider&&u.model===model&&u.ok&&Number.isFinite(u.ms)).slice(0,20).map(u=>u.ms).sort((a,b)=>a-b),latency=times.length?times[Math.floor(times.length/2)]:health[provider]?.model===model?health[provider]?.latency:null;
   const reasons=[matched?'Your assigned task model':'Configured model',local?'Runs on this PC':cost==null?'Price not entered':`Estimated $${cost.toFixed(4)} for this token budget`,Number.isFinite(latency)?`Recorded response ${Math.round(latency)} ms`:'Response time unmeasured',detail.contextWindow?`${detail.contextWindow} token context`:'Context size unreported'];
   rows.push({provider,model,local,cost,latency:Number.isFinite(latency)?latency:null,vision:detail.vision??null,contextWindow:detail.contextWindow||null,reasons,score:(matched?100:0)+(task==='quick'&&Number.isFinite(latency)?30/(1+latency/1000):0)+(task==='coding'&&detail.tools===true?10:0)+(localOnly&&local?10:0)});
  }
 }
 return {task,inputTokens,outputTokens,maxCost:cap,rows:rows.sort((a,b)=>b.score-a.score||(a.cost??Infinity)-(b.cost??Infinity)).map(({score,...r})=>r).slice(0,16),note:'Estimates use your entered prices and token budget. Actual output, provider charges and response times can differ. Unknown prices are excluded when a spending limit is set. Applying a choice never sends a message.'};
}
module.exports={recommend};
