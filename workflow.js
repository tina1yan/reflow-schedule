(function(root){
'use strict';
const R=typeof module!=='undefined'&&module.exports?require('./engine.js'):root.Reflow;
const clone=x=>JSON.parse(JSON.stringify(x));
const people={avery:{name:'Avery',role:'Design',initials:'AV'},jordan:{name:'Jordan',role:'Product',initials:'JO'},sam:{name:'Sam',role:'Engineering',initials:'SA'}};
function make(events,request,options={}){
 const original=clone(options.original||request),counters=clone(options.counters||{}),pins=[...new Set(options.pins||[])];
 const earliest=Math.max(original.earliest,...Object.values(counters).map(c=>c.earliest));
 const latest=Math.min(original.latest,...Object.values(counters).map(c=>c.latest));
 const revision=options.revision||1;
 let r;
 if(latest-earliest<original.duration)r={status:'infeasible',reason:'The requested participant windows do not share a long enough slot. No changes were applied.'};
 else r=R.solve(events,{...original,start:earliest,earliest,latest},{protect:options.protect!==false,pinned:pins});
 const affected=[...new Set([...(original.participants||[]),...(r.changes||[]).flatMap(c=>c.before.participants||[])])].filter(id=>people[id]);
 return {...r,base:clone(events),original,protect:options.protect!==false,counters,pins,revision,recipients:affected,responses:Object.fromEntries(affected.map(id=>[id,'pending'])),notified:false,applied:false};
}
function notify(p){if(!p.events||p.applied)throw Error('Find a valid proposal first.');if(p.notified)return p;return {...p,notified:true};}
function accept(p,id,revision){if(revision!==p.revision)throw Error('This response belongs to an older proposal.');if(!p.notified||!p.events||p.applied||!p.recipients.includes(id))throw Error('No current proposal is waiting for this participant.');return {...p,responses:{...p.responses,[id]:'accepted'}};}
function counter(p,id,window){
 if(!p.notified||p.applied||!(p.original.participants||[]).includes(id))throw Error('Only an invited participant can request a new meeting window.');
 for(const n of [window.earliest,window.latest])if(!Number.isInteger(n)||n%15!==0||n<540||n>1080)throw Error('Choose a window within 09:00–18:00 in 15-minute increments.');
 if(window.latest-window.earliest<p.original.duration)throw Error('The window must fit the full meeting duration.');
 const counters={...p.counters,[id]:window};
 // A counter may move outside the original requested window, but all participant counters remain binding.
 const original={...p.original,earliest:Math.min(p.original.earliest,window.earliest),latest:Math.max(p.original.latest,window.latest)};
 return make(p.base,original,{original,counters,pins:p.pins,protect:p.protect,revision:p.revision+1});
}
function keepOriginal(p,id){
 if(!p.notified||p.applied||!p.recipients.includes(id))throw Error('No pending response for this participant.');
 const ids=(p.changes||[]).filter(c=>(c.before.participants||[]).includes(id)).map(c=>c.before.id);
 if(!ids.length)throw Error('This participant has no existing meeting being moved.');
 return make(p.base,p.original,{original:p.original,counters:p.counters,pins:[...p.pins,...ids],protect:p.protect,revision:p.revision+1});
}
function ready(p){return !!p?.events&&!p.applied&&(p.recipients.length===0||(p.notified&&p.recipients.every(id=>p.responses[id]==='accepted')));}
function apply(p,current){if(!ready(p))throw Error('All affected participants must accept this revision first.');if(JSON.stringify(current)!==JSON.stringify(p.base))throw Error('The calendar changed. Calculate a fresh proposal.');return clone(p.events);}
const api={people,make,notify,accept,counter,keepOriginal,ready,apply};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ReflowWorkflow=api;
})(typeof globalThis!=='undefined'?globalThis:this);
