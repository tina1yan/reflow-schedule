const {test}=require('node:test');
const assert=require('node:assert/strict');
const R=require('./engine.js');
const cp=x=>JSON.parse(JSON.stringify(x));
function invariant(events,req,result,protect=true){
 assert.ok(result.events);R.validate(result.events);assert.equal(result.events.length,events.length+1);
 for(const e of events){const n=result.events.find(n=>n.id===e.id);assert.ok(n);for(const key of ['duration','title','earliest','latest','priority','type'])assert.equal(n[key],e[key]);if(e.type==='hard'||(protect&&e.priority>=req.priority))assert.equal(n.start,e.start);}
 assert.ok(result.request.start>=req.earliest);assert.ok(result.request.start+req.duration<=req.latest);
 assert.equal(result.score,events.reduce((s,e)=>s+R.cost(e,result.events.find(n=>n.id===e.id).start),0));
}
test('work example inserts 60 minutes without losing or overlapping events',()=>{const p=cp(R.presets.work),before=JSON.stringify(p);const r=R.solve(p.events,p.request);invariant(p.events,p.request,r);assert.equal(r.status,'optimal');assert.ok(r.changes.length>0);assert.equal(JSON.stringify(p),before);console.log('work result',r.score,r.changes.map(c=>`${c.before.title}: ${R.time(c.before.start)} -> ${R.time(c.after.start)}`),r.nodes);});
test('personal scenario preserves all commitments',()=>{const p=R.presets.personal;invariant(p.events,p.request,R.solve(p.events,p.request));});
test('hard anchors yield infeasible rather than fake success',()=>{const p=R.presets.tight;assert.equal(R.solve(p.events,p.request).status,'infeasible');});
test('new event fits exact gap with zero movement cost',()=>{const req={id:'r',title:'test',type:'hard',start:540,earliest:540,latest:600,duration:60,priority:3};const r=R.solve([],req);assert.equal(r.score,0);assert.equal(r.request.start,540);});
test('time-window, malformed, duplicate and overlap inputs are rejected',()=>{const p=cp(R.presets.work);assert.throws(()=>R.validate([...p.events,p.events[0]]));assert.throws(()=>R.solve(p.events,{...p.request,duration:75,latest:630}));assert.throws(()=>R.validate([{...p.events[0],start:541}]));assert.throws(()=>R.validate([{...p.events[0],title:''}]));assert.throws(()=>R.validate([{...p.events[0],priority:NaN}]));assert.throws(()=>R.validate([{...p.events[0],id:'x'}, {...p.events[0],id:'y'}]));assert.throws(()=>R.solve(p.events,{...p.request,id:'a'}));});
test('same-priority protection can be relaxed but hard anchors never move',()=>{const e={id:'e',title:'move',type:'soft',start:540,duration:60,earliest:540,latest:720,priority:4};const q={...e,id:'q',type:'hard',latest:600};assert.equal(R.solve([e],q).status,'infeasible');const r=R.solve([e],q,{protect:false});invariant([e],q,r,false);assert.equal(r.events.find(n=>n.id==='e').start,600);});
test('search exhaustion is not incorrectly called infeasible',()=>{const p=R.presets.work;assert.equal(R.solve(p.events,p.request,{maxNodes:0}).status,'limit');});
test('aggregate overload is rejected',()=>{const p=cp(R.presets.tight);p.events.forEach(e=>{e.type='elastic';e.priority=1;e.earliest=540;e.latest=1080;});const r=R.solve(p.events,{...p.request,earliest:540,latest:1080});assert.equal(r.status,'infeasible');assert.match(r.reason,/not enough time/);});
test('small exhaustive oracle agrees with optimizer on 72 varied cases',()=>{
 let checked=0;
 for(const kind of ['soft','elastic'])for(let duration of [15,30])for(let qStart=540;qStart<=615;qStart+=15)for(let priority of [1,2,3]){
  const e={id:'e',title:'one',type:kind,start:540,duration,earliest:540,latest:660,priority};
  const q={id:'q',title:'new',type:'hard',start:qStart,duration:30,earliest:qStart,latest:qStart+30,priority:4};
  let expected=Infinity;for(let s=540;s+duration<=660;s+=15)if(!R.overlap({...e,start:s},q))expected=Math.min(expected,R.cost(e,s));
  const r=R.solve([e],q);assert.equal(r.score,expected);invariant([e],q,r);checked++;
 }assert.equal(checked,72);
});
test('JSON serialization preserves a solved day',()=>{const p=R.presets.work;const r=R.solve(p.events,p.request);const restored=JSON.parse(JSON.stringify({schema:1,preset:'work',events:r.events}));assert.deepEqual(R.validate(restored.events),r.events);});
