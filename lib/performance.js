function aggregateMetrics(metrics) {
  return {cpu:Math.max(0,metrics.reduce((sum,p)=>sum+(Number(p.cpu?.percentCPUUsage)||0),0)),memoryMB:metrics.reduce((sum,p)=>sum+(Number(p.memory?.workingSetSize)||0),0)/1024,processes:metrics.length};
}
function backgroundDelay({battery=false,suspended=false,idle=false}={}){return suspended?600000:battery||idle?300000:120000;}
module.exports={aggregateMetrics,backgroundDelay};
