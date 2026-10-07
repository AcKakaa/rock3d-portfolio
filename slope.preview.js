(() => {
  'use strict';
  const section=document.getElementById('industry');if(!section)return;
  const id=name=>document.getElementById(name),ns='http://www.w3.org/2000/svg';
  const angleInput=id('slope-angle'),ruInput=id('slope-ru'),replay=id('slope-replay'),exportButton=id('slope-export');
  let data,current,loaded=false,timer=null,replayCount=0;
  const make=(tag,attrs={},content)=>{const el=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attrs))el.setAttribute(key,String(value));if(content!==undefined)el.textContent=content;return el;};
  const label=(x,y,content,attrs={})=>make('text',{x,y,fill:'#8fa59a','font-size':12,'font-family':'Segoe UI, Microsoft YaHei, sans-serif',...attrs},content);
  const color=f=>f<1?'#ef977e':f<1.2?'#e7bd80':'#97dbb5';
  const project=(x,y)=>[65+x*7.3,334-y*7.3];
  const pathFrom=points=>'M'+points.map(p=>p.join(',')).join('L');
  const ground=(x,angle)=>Math.max(0,Math.min(data.config.height_m,data.config.height_m-(x-data.config.crest_x_m)*Math.tan(angle*Math.PI/180)));
  const circlePoints=(circle,segments=80)=>Array.from({length:segments+1},(_,j)=>{const x=circle.start_x+(circle.end_x-circle.start_x)*j/segments;const y=circle.cy-Math.sqrt(Math.max(0,circle.radius_m**2-(x-circle.cx)**2));return project(x,y);});
  function stopReplay(){if(timer!==null)clearInterval(timer);timer=null;replay.setAttribute('aria-pressed','false');replay.textContent='▷ 回放滑面搜索';if(window.__slopePreview)window.__slopePreview.replaying=false;}
  function chooseCase(angle,ru){stopReplay();angleInput.value=angle;ruInput.value=ru;current=data.cases.find(c=>c.angle_deg===Number(angle)&&Math.abs(c.ru-Number(ru))<1e-8);if(!current)return;draw();}
  function drawSection(limit=null){
    const svg=id('slope-section');svg.replaceChildren();
    const circles=data.geometry_catalog[String(current.angle_deg)];
    const count=limit===null?circles.length:Math.min(limit,circles.length);
    const values=current.fos_values.slice(0,count);
    const min=Math.min(...values),criticalIndex=values.indexOf(min),critical=circles[criticalIndex];
    const defs=make('defs');
    const pattern=make('pattern',{id:'slope-soil-pattern',width:39,height:30,patternUnits:'userSpaceOnUse'});
    pattern.append(make('path',{d:'M1 21 13 7 25 23 38 10M13 7 16 29M25 23 0 28',fill:'none',stroke:'#416950','stroke-width':.6,opacity:.36}));defs.append(pattern);svg.append(defs);
    // Equal horizontal and vertical physical scales: 7.3 SVG units per metre.
    for(let x=0;x<=110;x+=10){const [px]=project(x,0);svg.append(make('line',{x1:px,y1:65,x2:px,y2:444,stroke:'#22362c','stroke-width':.6}),label(px,466,x,{'text-anchor':'middle','font-size':11}));}
    for(let y=-10;y<=30;y+=10){const [,py]=project(0,y);svg.append(make('line',{x1:65,y1:py,x2:868,y2:py,stroke:'#22362c','stroke-width':.6}),label(51,py+4,y,{'text-anchor':'end','font-size':11}));}
    svg.append(label(68,46,'高程 / m',{'font-size':12}),label(868,487,'水平距离 / m',{'text-anchor':'end','font-size':12}));
    const toe=data.config.crest_x_m+data.config.height_m/Math.tan(current.angle_deg*Math.PI/180);
    const surface=[project(0,25),project(18,25),project(toe,0),project(110,0)];
    const polygon=[...surface,project(110,-15),project(0,-15)];
    const boundary=pathFrom(polygon)+'Z';
    svg.append(make('path',{d:boundary,fill:'#173728',stroke:'none'}),make('path',{d:boundary,fill:'url(#slope-soil-pattern)',stroke:'none'}));
    const criticalPoints=circlePoints(critical);
    const topPoints=Array.from({length:81},(_,j)=>{const x=critical.start_x+(critical.end_x-critical.start_x)*j/80;return project(x,ground(x,current.angle_deg));});
    svg.append(make('path',{d:pathFrom([...topPoints,...criticalPoints.slice().reverse()])+'Z',fill:color(min),'fill-opacity':.09}));
    // Saved numerical candidate results, selectively thinned for legibility.
    const candidateLayer=make('g',{'data-role':'candidates'});
    const stride=Math.max(1,Math.floor(count/56));
    for(let i=0;i<count;i+=stride){if(i===criticalIndex)continue;const curve=make('path',{d:pathFrom(circlePoints(circles[i],55)),fill:'none',stroke:color(current.fos_values[i]),'stroke-width':.9,'stroke-opacity':.20,'data-candidate-index':i,'data-fos':current.fos_values[i]});curve.append(make('title',{},`${circles[i].id} · FoS ${current.fos_values[i].toFixed(4)}`));candidateLayer.append(curve);}
    svg.append(candidateLayer);
    const sliceGroup=make('g',{stroke:color(min),'stroke-opacity':.24,'stroke-width':.7});
    for(let j=0;j<16;j++){const x=critical.start_x+(critical.end_x-critical.start_x)*(j+.5)/16;const y=critical.cy-Math.sqrt(critical.radius_m**2-(x-critical.cx)**2);const [px,py]=project(x,y),[,topY]=project(x,ground(x,current.angle_deg));sliceGroup.append(make('line',{x1:px,y1:topY,x2:px,y2:py}));}svg.append(sliceGroup);
    svg.append(make('path',{d:pathFrom(surface),fill:'none',stroke:'#a7dcb8','stroke-width':2.2,'stroke-linejoin':'round'}));
    const criticalPath=make('path',{d:pathFrom(criticalPoints),fill:'none',stroke:color(min),'stroke-width':3.2,'stroke-linecap':'round','data-critical-id':critical.id,'data-critical-fos':min});
    criticalPath.append(make('title',{},`${critical.id} · 当前候选中最低 FoS ${min.toFixed(4)}`));svg.append(criticalPath);
    for(const endpoint of [criticalPoints[0],criticalPoints[criticalPoints.length-1]])svg.append(make('circle',{cx:endpoint[0],cy:endpoint[1],r:4,fill:color(min),stroke:'#102017','stroke-width':2}));
    const mid=criticalPoints[Math.floor(criticalPoints.length*.6)];
    const callX=Math.min(790,Math.max(360,mid[0]+15)),callY=Math.min(420,Math.max(278,mid[1]+48));
    svg.append(make('path',{d:`M${mid[0]},${mid[1]}L${callX-5},${callY-5}`,fill:'none',stroke:color(min),'stroke-width':.8}),make('rect',{x:callX-5,y:callY-25,width:163,height:43,rx:4,fill:'#10241c',stroke:'#4f6450','stroke-width':.7}),label(callX+5,callY-9,`FoS ${min.toFixed(3)} · 最低滑面`,{fill:color(min),'font-size':13}),label(callX+5,callY+8,'当前圆弧搜索范围',{'font-size':10}));
    const [,crestY]=project(0,25),[angleLabelX,angleLabelY]=project(82,24);
    svg.append(label(92,crestY-15,'均质堆积体',{'font-size':13,fill:'#b6d5bf'}),label(angleLabelX,angleLabelY,`β = ${current.angle_deg}°`,{fill:'#9bd6b0','font-size':15}));
    svg.append(make('line',{x1:34,y1:crestY,x2:34,y2:334,stroke:'#5c8570','stroke-width':.8,'stroke-dasharray':'3 4'}),label(30,(crestY+334)/2,'25 m',{'font-size':12,transform:`rotate(-90 30 ${(crestY+334)/2})`,'text-anchor':'middle'}));
    if(current.ru>0){const [px,py]=project(89,8);svg.append(label(px,py,`rᵤ = ${current.ru.toFixed(1)}`,{fill:'#89bad3','font-size':15}),label(px,py+20,'指定孔压工况',{'font-size':10,fill:'#7398ae'}));}
    svg.setAttribute('aria-label',`合成 ${current.angle_deg} 度边坡，孔压比 ${current.ru}，当前 ${count} 条候选滑面最低安全系数 ${min.toFixed(3)}`);
    id('slope-search-status').textContent=`${count} / ${circles.length} 条候选滑面`;
    id('slope-search-status').title='计数为已求解圆弧；部分候选曲线抽样显示，最低滑面完整显示。';
    id('slope-fos').textContent=min.toFixed(2);id('slope-fos').style.color=color(min);
    id('slope-fos-label').textContent=limit===null?'搜索范围内最小安全系数':'已回放候选中的最小安全系数';
    window.__slopePreview.displayedCandidates=count;window.__slopePreview.displayedMinimum=min;window.__slopePreview.displayedCriticalId=critical.id;
  }
  function frameChart(svg,title,xLabel,yLabel,xticks,yticks,xMap,yMap){
    svg.replaceChildren();svg.append(label(42,14,title,{'font-size':10}));
    yticks.forEach(v=>{const y=yMap(v);svg.append(make('line',{x1:42,y1:y,x2:356,y2:y,stroke:'#2b3f32','stroke-width':.6}),label(34,y+3,v,{'text-anchor':'end','font-size':10}));});
    xticks.forEach(v=>svg.append(label(xMap(v),182,v,{'text-anchor':'middle','font-size':10})));
    svg.append(label(356,202,xLabel,{'text-anchor':'end','font-size':10}));
    svg.setAttribute('data-x-label',xLabel);svg.setAttribute('data-y-label',yLabel);
  }
  function drawMaterial(){
    const psd=id('slope-psd-chart');const x=d=>42+(Math.log10(d)-1)/(Math.log10(1200)-1)*314,y=p=>165-p/100*140;
    frameChart(psd,'累计质量通过率 / %','粒径 / mm（对数刻度）','累计质量通过率 / %',[10,100,1000],[0,50,100],x,y);
    psd.append(make('path',{d:pathFrom(data.psd.map(p=>[x(p.diameter_mm),y(p.mass_passing_percent)])),fill:'none',stroke:'#94e3bf','stroke-width':2}));
    const dx=x(data.config.material.d50_mm);
    psd.append(make('line',{x1:42,y1:y(50),x2:dx,y2:y(50),stroke:'#c8cf91','stroke-width':.9,'stroke-dasharray':'3 3'}),make('line',{x1:dx,y1:y(50),x2:dx,y2:165,stroke:'#c8cf91','stroke-width':.9,'stroke-dasharray':'3 3'}),make('circle',{cx:dx,cy:y(50),r:3,fill:'#d7dba8'}),label(dx+9,y(50)-9,'D50',{'font-size':10,fill:'#d7dba8'}));
    const chart=id('slope-strength-chart'),sx=v=>42+v/600*314,sy=v=>165-v/600*140;
    frameChart(chart,'抗剪强度 τ / kPa','有效法向应力 σ′ / kPa','抗剪强度 τ / kPa',[0,200,400,600],[0,200,400,600],sx,sy);
    chart.append(make('path',{d:pathFrom(data.strength_curve.map(p=>[sx(p.sigma_kpa),sy(p.tau_kpa)])),fill:'none',stroke:'#94e3bf','stroke-width':2}));
    const sample=current.critical_slices.filter((_,i)=>i%8===0);
    sample.forEach(p=>{if(p.sigma<=600&&p.tau<=600)chart.append(make('circle',{cx:sx(p.sigma),cy:sy(p.tau),r:2.8,fill:color(current.fos_min),'data-stress':p.sigma,'data-strength':p.tau}));});
    chart.append(label(350,29,'● 当前滑面条分',{'text-anchor':'end','font-size':9,fill:color(current.fos_min)}));
  }
  function comparison(){
    const container=id('slope-comparison');container.replaceChildren();
    const names={baseline:'基准工况',wet:'孔压升高',flattened:'坡角减缓'};
    data.config.presets.forEach(p=>{const c=data.cases.find(item=>item.angle_deg===p.angle_deg&&Math.abs(item.ru-p.ru)<1e-8);const div=document.createElement('div');div.className='slope-compare-item';div.dataset.preset=p.id;div.dataset.fos=c.fos_min;
      const name=document.createElement('span');name.textContent=names[p.id];const value=document.createElement('strong');value.textContent=c.fos_min.toFixed(2);value.style.color=color(c.fos_min);
      const track=document.createElement('div');track.className='bar-track';const bar=document.createElement('i');bar.style.width=`${Math.min(100,c.fos_min/2*100)}%`;bar.style.background=color(c.fos_min);track.append(bar);div.append(name,value,track);container.append(div);});
  }
  function draw(){
    window.__slopePreview.key=current.key;window.__slopePreview.fos=current.fos_min;window.__slopePreview.criticalIndex=current.critical_index;
    id('slope-angle-value').textContent=`${current.angle_deg}°`;id('slope-ru-value').textContent=current.ru.toFixed(1);
    let presetId=null;
    for(const p of data.config.presets)if(p.angle_deg===current.angle_deg&&Math.abs(p.ru-current.ru)<1e-8)presetId=p.id;
    document.querySelectorAll('[data-slope-preset]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.slopePreset===presetId)));
    const names={baseline:'基准工况 · 低孔压比',wet:'孔压升高 · 材料与坡角不变',flattened:'坡角减缓 · 材料与孔压比不变'};
    id('slope-response').textContent=names[presetId]||'自定义受控工况';
    id('slope-conclusion').textContent=current.fos_min<1?'该模型中，可用抗剪能力低于平衡需求。':'该模型中，可用抗剪能力高于平衡需求。';
    drawSection();drawMaterial();
  }
  function replaySearch(){
    if(timer!==null){stopReplay();drawSection();return;}
    replayCount=1;drawSection(replayCount);replay.setAttribute('aria-pressed','true');replay.textContent='Ⅱ 暂停回放';window.__slopePreview.replaying=true;
    const total=data.geometry_catalog[String(current.angle_deg)].length;
    timer=setInterval(()=>{replayCount=Math.min(total,replayCount+Math.ceil(total/22));drawSection(replayCount);if(replayCount>=total){stopReplay();drawSection();}},220);
  }
  function exportRecord(){
    const circle=data.geometry_catalog[String(current.angle_deg)][current.critical_index];
    const report={source:data.scope,field_validation:false,uses_research_data:false,method:data.method,units:{length:'m',stress:'kPa',unit_weight:'kN/m3',angle:'degree',fos:'dimensionless'},
      assumptions:data.config.limitations,material:data.config.material,equivalent_strength_kpa:data.equivalent_strength_kpa,scenario:current,critical_circle:circle,search:data.config.search,
      notes:'Synthetic geometry and literature-inspired material; finite circular search. Not field stability certification or formal Rock3D PSD.'};
    const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`Rock3D_SLOPE_SIM_${current.angle_deg}deg_ru${current.ru.toFixed(1)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
  }
  function openZoom(){
    stopReplay();drawSection();
    const clone=id('slope-section').cloneNode(true);clone.id='slope-section-zoomed';
    const pattern=clone.querySelector('#slope-soil-pattern');if(pattern)pattern.id='slope-soil-pattern-zoomed';
    clone.querySelectorAll('[fill="url(#slope-soil-pattern)"]').forEach(el=>el.setAttribute('fill','url(#slope-soil-pattern-zoomed)'));
    id('slope-zoom-content').replaceChildren(clone);id('slope-zoom-content').dataset.zoomed='false';
    id('slope-zoom-toggle').setAttribute('aria-pressed','false');id('slope-zoom-toggle').textContent='放大至 2 倍';
    id('slope-zoom-caption').textContent=`坡角 ${current.angle_deg}° · rᵤ ${current.ru.toFixed(1)} · 最低 FoS ${current.fos_min.toFixed(3)}`;
    id('slope-zoom-dialog').showModal();
  }
  async function load(){if(loaded)return;loaded=true;
    try{const response=await fetch('assets/slope_v1/slope_results.json');if(!response.ok)throw new Error('results unavailable');data=await response.json();
      if(data.scope!=='SYNTHETIC_SLOPE_SCENARIO_V1'||data.uses_research_data!==false||data.cases.length!==20)throw new Error('simulation scope mismatch');
      window.__slopePreview={loaded:true,scope:data.scope,caseCount:data.cases.length,replaying:false};
      comparison();chooseCase(34,.1);angleInput.disabled=false;ruInput.disabled=false;replay.disabled=false;exportButton.disabled=false;id('slope-zoom-open').disabled=false;
      document.querySelectorAll('[data-slope-preset]').forEach(button=>{button.disabled=false;button.addEventListener('click',()=>{const preset=data.config.presets.find(p=>p.id===button.dataset.slopePreset);chooseCase(preset.angle_deg,preset.ru);});});
      angleInput.addEventListener('input',()=>chooseCase(Number(angleInput.value),Number(ruInput.value)));ruInput.addEventListener('input',()=>chooseCase(Number(angleInput.value),Number(ruInput.value)));
      replay.addEventListener('click',replaySearch);exportButton.addEventListener('click',exportRecord);
      id('slope-zoom-open').addEventListener('click',openZoom);id('slope-zoom-toggle').addEventListener('click',()=>{const enabled=id('slope-zoom-content').dataset.zoomed!=='true';id('slope-zoom-content').dataset.zoomed=String(enabled);id('slope-zoom-toggle').setAttribute('aria-pressed',String(enabled));id('slope-zoom-toggle').textContent=enabled?'适应窗口':'放大至 2 倍';});
      id('slope-loading').hidden=true;id('slope-loading').style.display='none';
      document.addEventListener('visibilitychange',()=>{if(document.hidden){stopReplay();drawSection();}});
      if('IntersectionObserver'in window)new IntersectionObserver(entries=>{if(!entries[0].isIntersecting&&timer!==null){stopReplay();drawSection();}}).observe(section);
    }catch(error){window.__slopePreview={loaded:false,error:error.message};id('slope-loading').textContent='仿真结果暂未载入，请刷新页面。';id('slope-search-status').textContent='未载入';id('slope-fos').textContent='—';}
  }
  if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();load();}},{rootMargin:'500px'});observer.observe(section);}else load();
})();
