/* Reflow: a small, deterministic single-day constraint scheduler. */
(function(root){
  'use strict';
  const START=540, END=1080, STEP=15;
  const overlap=(a,b)=>a.start<b.start+b.duration && b.start<a.start+a.duration;
  const time=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
  function validateEvent(e){
    if(!e || typeof e.id!=='string' || !e.id || e.id.length>100 || typeof e.title!=='string' || !e.title.trim() || e.title.length>80) throw Error('Use an event title between 1 and 80 characters.');
    if(!['hard','soft','elastic'].includes(e.type)) throw Error('Unknown event type.');
    for(const k of ['start','duration','earliest','latest']) if(!Number.isInteger(e[k]) || e[k]%STEP!==0) throw Error('Times and durations must use 15-minute increments.');
    if(e.duration<15 || e.duration>540 || e.earliest<START || e.latest>END || e.start<e.earliest || e.start+e.duration>e.latest) throw Error('Events must fit inside 09:00–18:00 and their allowed window.');
    if(!Number.isInteger(e.priority)||e.priority<1||e.priority>5) throw Error('Priority must be an integer from 1 to 5.');
    return e;
  }
  function validate(events){
    if(!Array.isArray(events)||events.length>12) throw Error('This playground supports up to 12 events.');
    const ids=new Set();
    events.forEach(e=>{validateEvent(e);if(ids.has(e.id))throw Error('Duplicate event ID.');ids.add(e.id);});
    for(let i=0;i<events.length;i++)for(let j=i+1;j<events.length;j++)if(overlap(events[i],events[j]))throw Error(`${events[i].title} overlaps ${events[j].title}. Adjust the existing plan first.`);
    return events;
  }
  function cost(e,start){return start===e.start?0: e.priority*(e.type==='soft'?3:1)*(4+Math.abs(start-e.start)/STEP);}
  function solve(events,request,opts={}){
    validate(events);validateEvent(request);
    if(events.length>=12)throw Error('The playground supports 12 events. Remove one before adding another.');
    if(events.some(e=>e.id===request.id))throw Error('The new event ID already exists.');
    const protectedEvent=e=>e.type==='hard'||(opts.pinned||[]).includes(e.id)||(opts.protect!==false&&e.priority>=request.priority);
    const fixed=events.filter(protectedEvent), flex=events.filter(e=>!protectedEvent(e));
    let best=null,nodes=0,limited=false;
    const maxNodes=opts.maxNodes??250000;
    const candidates=[];
    for(let s=request.earliest;s+request.duration<=request.latest;s+=STEP){
      const r={...request,start:s};if(!fixed.some(e=>overlap(e,r)))candidates.push(r);
    }
    if(!candidates.length)return {status:'infeasible',reason:'Fixed or protected events block every slot in this window. Widen the window or review your protection rules.',nodes:0};
    if(events.reduce((sum,e)=>sum+e.duration,0)+request.duration>END-START)return {status:'infeasible',reason:'There is not enough time in the day. Reflow cannot create time: shorten the new event or choose another day.',nodes:0};
    function visit(todo,placed,score,r){
      if(++nodes>maxNodes){limited=true;return;}
      if(best&&score>=best.score)return;
      if(!todo.length){best={score,events:[...placed].sort((a,b)=>a.start-b.start),request:r};return;}
      let chosen=null,domain=null;
      for(const e of todo){
        const slots=[];
        for(let s=e.earliest;s+e.duration<=e.latest;s+=STEP){const c={...e,start:s};if(!placed.some(p=>overlap(c,p)))slots.push(s);}
        if(!slots.length)return;
        if(!domain||slots.length<domain.length){chosen=e;domain=slots;}
      }
      domain.sort((a,b)=>cost(chosen,a)-cost(chosen,b)||a-b);
      const rest=todo.filter(e=>e.id!==chosen.id);
      for(const s of domain){visit(rest,[...placed,{...chosen,start:s}],score+cost(chosen,s),r);if(limited)return;}
    }
    for(const r of candidates){visit(flex,[...fixed,r],0,r);if(limited||best?.score===0)break;}
    if(!best)return {status:limited?'limit':'infeasible',reason:limited?'The search limit was reached before a plan was found. Narrow the flexible windows or use fewer events. This does not prove that no plan exists.':'No plan fits all events within these windows and protection rules. No existing event was removed or shortened.',nodes};
    const changes=events.map(e=>({before:e,after:best.events.find(p=>p.id===e.id)})).filter(c=>c.before.start!==c.after.start);
    return {...best,status:limited?'feasible':'optimal',changes,nodes,protectedCount:fixed.length};
  }
  function event(id,title,start,duration,type,earliest,latest,priority){return {id,title,start,duration,type,earliest,latest,priority};}
  const presets={
    work:{name:'A busy workday',caption:'Make room for an unexpected opportunity.',events:[event('a','Team standup',540,30,'hard',540,570,5),event('b','Write the proposal',570,90,'elastic',570,1020,2),event('c','Project review',660,60,'soft',600,1080,3),event('d','Lunch, protected',720,60,'hard',720,780,5),event('e','Research & notes',810,90,'elastic',780,1080,1),event('f','Client check-in',900,30,'hard',900,930,5),event('g','Inbox & wrap-up',960,60,'elastic',840,1080,1)],request:event('request','An interview opportunity',600,60,'hard',600,720,4)},
    personal:{name:'A little breathing room',caption:'Your life deserves a good time slot, too.',events:[event('a','A slow breakfast',540,60,'hard',540,600,5),event('b','Learn something new',600,90,'elastic',600,1080,2),event('c','Life admin',690,30,'elastic',600,1080,1),event('d','Lunch',720,60,'hard',720,780,5),event('e','A side project',780,120,'soft',780,1080,3),event('f','Go for a walk',960,60,'elastic',900,1080,2)],request:event('request','Coffee with friends',600,60,'hard',600,720,4)},
    tight:{name:'A genuinely full day',caption:'Sometimes the right answer is not today.',events:[event('a','Fixed meeting A',540,180,'hard',540,720,5),event('b','Lunch',720,60,'hard',720,780,5),event('c','Fixed meeting B',780,180,'hard',780,960,5),event('d','Protected delivery time',960,120,'elastic',960,1080,4)],request:event('request','One more urgent meeting',600,60,'hard',600,960,5)}
  };
  const api={START,END,STEP,time,overlap,cost,validate,validateEvent,solve,presets};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Reflow=api;
})(typeof globalThis!=='undefined'?globalThis:this);
