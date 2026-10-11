const fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto');
const {normalize,profileSettings}=require('./experience');
function createExperienceStore(directory) {
  const file=path.join(directory,'experience.json');let settings=normalize(),profiles=[],active='';
  try {const data=JSON.parse(fs.readFileSync(file,'utf8'));settings=normalize(data.settings);profiles=Array.isArray(data.profiles)?data.profiles.filter(p=>p&&typeof p.id==='string'&&typeof p.name==='string'&&p.settings&&typeof p.settings==='object').slice(0,12):[];active=profiles.some(p=>p.id===data.active)?data.active:'';}catch{}
  const write=()=>{fs.mkdirSync(directory,{recursive:true});const temp=file+'.tmp';fs.writeFileSync(temp,JSON.stringify({settings,profiles,active}));fs.renameSync(temp,file);};
  return {snapshot:()=>({settings:{...settings},profiles:profiles.map(({id,name})=>({id,name})),active}),save(patch){settings=normalize({...settings,...patch});write();return this.snapshot();},recent(provider,model){settings=normalize({...settings,recents:[provider+':'+model,...settings.recents.filter(id=>id!==provider+':'+model)]});write();},
    create(name,state){if(profiles.length>=12)throw new Error('Keep up to twelve workspace profiles.');if(typeof name!=='string'||!name.trim()||name.length>40)throw new Error('Enter a profile name of up to 40 characters.');const profile={id:randomUUID(),name:name.trim(),settings:profileSettings(state)};profiles.push(profile);active=profile.id;write();return this.snapshot();},
    get(id){const p=profiles.find(p=>p.id===id);if(!p)throw new Error('Choose a saved profile.');return JSON.parse(JSON.stringify(p.settings));},activate(id){if(!profiles.some(p=>p.id===id))throw new Error('Choose a saved profile.');active=id;write();},remove(id){profiles=profiles.filter(p=>p.id!==id);if(active===id)active='';write();return this.snapshot();}
  };
}
module.exports={createExperienceStore};
