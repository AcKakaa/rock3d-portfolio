/* Engineering concept only. All geometry, classes and checkpoints are synthetic. */
(() => {
  'use strict';
  const canvas=document.getElementById('survey-canvas');
  if(!canvas) return;
  const ctx=canvas.getContext('2d');
  if(!ctx) { canvas.setAttribute('aria-label','当前浏览器不支持合成场景绘制；可在下方选择示例点并填写记录。'); return; }
  const $=id=>document.getElementById(id);
  const colors=['#619eba','#e0b168','#92e6c9','#c47780','#a48cc9','#b99a7b'];
  const tasks=[
    {id:'P01',name:'谱形相近区',x:-.42,y:-.27,classes:'页岩 / 硫化物类',reason:'检查谱形差异，并结合现场岩性描述核实。'},
    {id:'P02',name:'类别边界区',x:.51,y:.19,classes:'镁铁质 / 长英质火山岩',reason:'记录接触关系；必要时复查边界混合与采样尺度。'},
    {id:'P03',name:'表面差异区',x:-.78,y:.18,classes:'风化残积物 / 硅质岩',reason:'对照风化与遮阴情况，补充现场照片及样品描述。'}
  ];
  let selected=0,layer='lithology',yaw=-.48,width=700,height=460;
  const notes=tasks.map(()=>({draft:'',saved:null}));
  let pinPositions=[];
  function elevation(x,y) {
    const r=Math.sqrt((x/1.07)**2+(y/.86)**2);
    return Math.floor(Math.min(r,1)*5)/5*.45-.25;
  }
  const mesh=[];
  for(let j=0;j<75;j++) for(let i=0;i<89;i++) {
    const x=(i/88*2-1)*1.08, y=(j/74*2-1)*.87;
    if((x/1.08)**2+(y/.87)**2>1) continue;
    const k=x<-.46?(y>.05?0:1):x<.04?(y>-.12?3:2):(y>.15?5:4);
    const noise=Math.sin(i*2.17+j*1.13)*.004;
    mesh.push({x,y,z:elevation(x,y)+noise,k,shade:.6+.28*(Math.sin(i*3.1+j*7.1)*.5+.5)});
  }
  function project(x,y,z) {
    const rx=x*Math.cos(yaw)-y*Math.sin(yaw),ry=x*Math.sin(yaw)+y*Math.cos(yaw);
    const scale=Math.min(width*.365,height*.79);
    return {x:width*.5+rx*scale,y:height*.52+ry*scale*.48-z*scale*.85,depth:ry};
  }
  function path(points,stroke,lineWidth=1,dash=[]) {
    ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
    ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth;ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([]);
  }
  function render() {
    ctx.clearRect(0,0,width,height);
    for(let t=-1.25;t<=1.251;t+=.25) {
      path([project(t,-1.1,-.31),project(t,1.1,-.31)],'#294c393f');
      path([project(-1.25,t,-.31),project(1.25,t,-.31)],'#294c393f');
    }
    const points=mesh.map(p=>({...p,...project(p.x,p.y,p.z)})).sort((a,b)=>a.depth-b.depth);
    const radius=Math.max(1.1,Math.min(width/300,2.5));
    for(const p of points) {
      ctx.globalAlpha=p.shade;
      ctx.fillStyle=layer==='lithology'?colors[p.k]:'#b1ab91';
      ctx.fillRect(p.x-radius*.6,p.y-radius*.4,radius*1.4,radius*.9);
    }
    ctx.globalAlpha=1;
    for(let ring=1;ring<=5;ring++) {
      const r=ring/5, z=r*.45-.25;
      const line=[];
      for(let i=0;i<=120;i++) {
        const a=i/120*Math.PI*2;line.push(project(Math.cos(a)*1.07*r,Math.sin(a)*.86*r,z));
      }
      path(line,layer==='lithology'?'#a3c9aa45':'#d6cfb164',.9);
    }
    pinPositions=tasks.map((task,i)=>{
      const p=project(task.x,task.y,elevation(task.x,task.y)+.008),saved=notes[i].saved!==null;
      ctx.strokeStyle=i===selected?'#e9d39c':'#89b79b';ctx.lineWidth=i===selected?2:1;
      ctx.beginPath();ctx.ellipse(p.x,p.y,14,7,0,0,Math.PI*2);ctx.stroke();
      path([{x:p.x,y:p.y-2},{x:p.x,y:p.y-31}],saved?'#92e6c9':'#edbc7a',1.3);
      ctx.fillStyle=i===selected?'#e6c58c':'#183b28';ctx.strokeStyle='#bdd3ac';
      ctx.beginPath();ctx.arc(p.x,p.y-39,10,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.fillStyle=i===selected?'#17301e':'#d8ecd8';ctx.textAlign='center';ctx.font='bold 9px Consolas,monospace';ctx.fillText(String(i+1),p.x,p.y-36);
      ctx.fillStyle='#d6e5d7';ctx.font='9px Consolas,monospace';ctx.fillText(task.id,p.x,p.y-56);
      return {x:p.x,y:p.y-35,index:i};
    });
    const origin={x:width-53,y:47};
    path([origin,{x:origin.x+24,y:origin.y-8}],'#96c4aa');path([origin,{x:origin.x-17,y:origin.y-10}],'#7797b7');path([origin,{x:origin.x,y:origin.y-27}],'#bbaa84');
    ctx.font='8px Consolas,monospace';ctx.fillStyle='#a0bba8';ctx.textAlign='center';ctx.fillText('X',origin.x+29,origin.y-8);ctx.fillText('Y',origin.x-21,origin.y-10);ctx.fillText('Z',origin.x,origin.y-32);
  }
  function resize() {
    const box=canvas.parentElement.getBoundingClientRect();width=box.width;height=box.height;
    const dpr=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);render();
  }
  function choose(i) {
    notes[selected].draft=$('survey-note').value;
    selected=i;const task=tasks[i];
    document.querySelectorAll('[data-survey-task]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.surveyTask)===i)));
    $('survey-point-id').textContent=task.id+' / DEMO CHECKPOINT';
    $('survey-point-name').textContent=task.name;
    $('survey-point-coordinates').textContent=`示意 X ${task.x.toFixed(2)} / Y ${task.y.toFixed(2)} · 无物理单位`;
    $('survey-point-classes').textContent=task.classes;$('survey-point-reason').textContent=task.reason;
    $('survey-note').value=notes[i].draft;
    $('survey-message').textContent=notes[i].saved!==null?'此点已有模拟记录；可修改后再次保存。':'记录仅保留在当前页面，刷新后清除。';
    render();
  }
  document.querySelectorAll('[data-survey-task]').forEach(b=>b.addEventListener('click',()=>choose(Number(b.dataset.surveyTask))));
  document.querySelectorAll('[data-survey-layer]').forEach(b=>b.addEventListener('click',()=>{
    layer=b.dataset.surveyLayer;document.querySelectorAll('[data-survey-layer]').forEach(k=>k.setAttribute('aria-pressed',String(k===b)));render();
  }));
  $('survey-note').addEventListener('input',()=>{notes[selected].draft=$('survey-note').value;});
  $('survey-save').addEventListener('click',()=>{
    const text=$('survey-note').value.trim();
    if(!text) {$('survey-message').textContent='请先填写示例复核意见，再保存。';$('survey-note').focus();return;}
    notes[selected].draft=$('survey-note').value;notes[selected].saved=text;
    const button=document.querySelector(`[data-survey-task="${selected}"]`);button.classList.add('recorded');button.querySelector('small').textContent='已记录';
    $('survey-count').textContent=`${notes.filter(n=>n.saved!==null).length} / 3 已记录`;
    $('survey-message').textContent='模拟记录已保存；不代表现场核验完成。';render();
  });
  $('survey-export').addEventListener('click',()=>{
    const records=tasks.map((task,i)=>({id:task.id,name:task.name,synthetic_coordinates:{x:task.x,y:task.y,physical_unit:null},
      illustrative_candidates:task.classes,illustrative_review_focus:task.reason,
      status:notes[i].saved===null?'not_recorded':'example_note_recorded',saved_note:notes[i].saved}));
    const payload={type:'engineering_concept_simulation',synthetic_data:true,real_site_connected:false,
      warning:'合成场景和人工构造示例；不是实际调查、现场核验或找矿结论。仅导出已保存记录，不包含未保存草稿。',records};
    const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download='synthetic_outcrop_review_demo.json';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    $('survey-message').textContent='已导出模拟记录；文件内已标注合成数据与应用边界。';
  });
  $('survey-reset-view').addEventListener('click',()=>{yaw=-.48;render();});
  let drag=null;
  canvas.addEventListener('pointerdown',e=>{drag={startX:e.clientX,lastX:e.clientX,startY:e.clientY,moved:false};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{
    if(!drag)return;
    if(Math.abs(e.clientX-drag.startX)>4)drag.moved=true;
    yaw+=(e.clientX-drag.lastX)*.008;drag.lastX=e.clientX;render();
  });
  canvas.addEventListener('pointerup',e=>{
    if(drag&&!drag.moved) {
      const box=canvas.getBoundingClientRect(),x=e.clientX-box.left,y=e.clientY-box.top;
      const nearest=pinPositions.reduce((best,p)=>Math.hypot(p.x-x,p.y-y)<Math.hypot(best.x-x,best.y-y)?p:best);
      if(Math.hypot(nearest.x-x,nearest.y-y)<28) choose(nearest.index);
    }
    drag=null;
  });
  canvas.addEventListener('pointercancel',()=>{drag=null;});
  canvas.addEventListener('lostpointercapture',()=>{drag=null;});
  canvas.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();yaw+=e.key==='ArrowLeft'?-.12:.12;render();}});
  new ResizeObserver(resize).observe(canvas.parentElement);
  choose(0);resize();
})();
