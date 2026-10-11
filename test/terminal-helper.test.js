const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),net=require('node:net'),crypto=require('node:crypto');
const {terminalLink}=require('../lib/terminal'),{focusLinkedTerminal}=require('../lib/terminal-focus');
test('terminal metadata accepts only typed, bounded links',async()=>{
  assert.equal(terminalLink({host:'editor',id:'-'.repeat(36),token:'a'.repeat(64)}),null);
  assert.equal(terminalLink({host:'wt',title:'arbitrary command'}),null);
  assert.equal(terminalLink({host:'wt',title:'Nook · aabbccddeeff'}).host,'wt');
  assert.equal(await focusLinkedTerminal({id:'../../outside',token:'bad'}),false);
});
test('editor helper focuses only its authenticated terminal and cleans up on close',{skip:process.platform!=='win32'},async()=>{
  let command,closed,options,shown=0,server;const subscriptions=[];
  const vscode={commands:{registerCommand:(_id,handler)=>{command=handler;return{dispose(){}};}},window:{
    createTerminal:input=>{options=input;return terminal;},onDidCloseTerminal:handler=>{closed=handler;return{dispose(){}};},showErrorMessage:message=>{throw new Error(message);}
  }};
  const terminal={show:()=>shown++}, sandbox={module:{exports:{}},process,Buffer,require:id=>id==='vscode'?vscode:id==='node:net'?{createServer:handler=>(server=net.createServer(handler))}:require(id)};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../terminal-helper/extension.js'),'utf8'),sandbox);
  sandbox.module.exports.activate({subscriptions});command();
  if(!server.listening)await new Promise(resolve=>server.once('listening',resolve));
  const link={host:'editor',id:options.env.NOOK_TERMINAL_ID,token:options.env.NOOK_TERMINAL_TOKEN,pid:0};
  assert.equal(await focusLinkedTerminal({...link,token:crypto.randomBytes(32).toString('hex')}),false);assert.equal(shown,1);
  assert.equal(await focusLinkedTerminal(link),true);assert.equal(shown,2);
  closed(terminal);for(const item of subscriptions)item.dispose();assert.equal(await focusLinkedTerminal(link),false);
});
