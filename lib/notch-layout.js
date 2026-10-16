function dimensions({mode,width=620,peekWidth=240,height=360,zoom=1,maxWidth=1920,maxHeight=1080}){
 const z=Number.isFinite(zoom)?Math.max(.5,Math.min(3,zoom)):1,open=mode==='open';const w=mode==='asleep'?140:open?width:peekWidth,h=mode==='asleep'?4:open?height:48;
 return {width:Math.max(1,Math.min(Math.round((w+(mode==='asleep'?0:44))*z),maxWidth)),height:Math.max(1,Math.min(Math.round((h+(mode==='asleep'?0:28))*z),maxHeight))};
}
module.exports={dimensions};
