const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitFor(check,label,{timeout=5000,interval=25}={}) {
  const end=Date.now()+timeout;let last;
  while(Date.now()<end){try{if(await check())return;}catch(error){last=error;}await pause(interval);}
  throw Error(label+(last?' · '+last.message:''));
}
async function waitForDesktop(BrowserWindow) {
  await waitFor(async()=>{
    const windows=BrowserWindow.getAllWindows().filter(w=>!w.isDestroyed());
    const settings=windows.find(w=>w.webContents.getURL().endsWith('settings.html'));
    const notch=windows.find(w=>w.webContents.getURL().endsWith('index.html'));
    if(!settings||!notch||settings.webContents.isLoading()||notch.webContents.isLoading())return false;
    const ready=await Promise.all([
      settings.webContents.executeJavaScript('Boolean(window.nook&&window.NookTour&&typeof showPage==="function"&&document.querySelector("#project-spaces"))'),
      notch.webContents.executeJavaScript('Boolean(window.nook&&typeof state!=="undefined"&&state?.hub&&document.querySelector("#chat-form"))')
    ]);
    if(!ready.every(Boolean))return false;
    await Promise.all([settings,notch].map(w=>w.webContents.executeJavaScript('document.fonts.ready.then(()=>true)')));
    return true;
  },'The settings window and notch did not finish starting',{timeout:20000,interval:50});
}
module.exports={waitFor,waitForDesktop};
