(() => {
  'use strict';
  const root = document.querySelector('#journey');
  if (!root) return;
  const $ = s => root.querySelector(s);
  const steps = [...root.querySelectorAll('[data-journey-step]')];
  const play = $('#journey-play'), viewport = $('#journey-viewport');
  const svg = $('#journey-cal'), polygon = $('#journey-target'), label = $('#journey-target-label');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const content = [
    ['01 / FIELD CONTEXT', '先看现场，<br>再看每一块岩石。', '全景呈现堆积形态与现场环境；进入可搬移区（CAL），观察单块岩石的几何细节。', 'DJI_0151 / 现场总览', '点击框选区域，进入近景', '从堆积场景中，找到进一步观察的区域。', 'scene'],
    ['02 / INSTANCE SEGMENTATION', '从密集堆积，<br>到独立岩石实例。', '切换到 CAL 区近景。不同颜色区分已保存的识别实例，保留原始纹理，呈现密集目标的边界。', 'DJI_0277 / CAL 区近景', '点击 CAL_061，观察目标轮廓', '切换拍摄视角：DJI_0151 → DJI_0277 · 复用已保存识别结果。', 'cal'],
    ['03 / TARGET IDENTITY', '锁定 CAL_061，<br>保持目标身份一致。', '放大同一张近景原图，依据案例人工标注突出 CAL_061；以它为入口，关联其他视角中的可见表面。', 'DJI_0277 / CAL_061', '原图缩放 · 案例人工标注轮廓', '同一 DJI_0277 原图中的 CAL_061，轮廓与三维案例输入一致。', 'cal'],
    ['04 / MULTI-VIEW GEOMETRY', '从二维轮廓，<br>到三维可见表面。', '同一 CAL_061 在不同视角中贡献互补表面。颜色保留视角来源，几何结果可追踪至已有核验案例。', 'CAL_061 / 已核验三维表面', '颜色表示视角贡献', '复用已保存的多视角可见表面 · 可观看整合过程或操作首屏模型。', 'surface'],
  ];
  let manifest, step = 0, playing = false, timer = null, animation = 0;
  let box = [0,0,2400,1600];
  const state = window.__journeyPreview = {loaded:false, step:0, playing:false};
  function stop() {
    playing = false; state.playing = false;
    clearTimeout(timer); play.setAttribute('aria-pressed','false'); play.textContent = '▷ 播放过程';
  }
  function frameTo(target, animate) {
    cancelAnimationFrame(animation);
    const start = [...box], at = performance.now();
    const tick = now => {
      const t = animate && !reduced.matches ? Math.min((now-at)/1000,1) : 1;
      const ease = t*t*(3-2*t);
      box = t===1 ? [...target] : start.map((v,i)=>v+(target[i]-v)*ease);
      svg.setAttribute('viewBox',box.join(' ')); state.viewBox = [...box];
      if(t<1) animation=requestAnimationFrame(tick);
    };
    animation=requestAnimationFrame(tick);
  }
  function show(next, animate = true) {
    step = next; state.step = step; viewport.dataset.step = String(step);
    steps.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===step)));
    const [number,title,copy,camera,note,caption,layer] = content[step];
    $('#journey-step-number').textContent = number;
    $('#journey-story-title').innerHTML = title;
    $('#journey-story-copy').textContent = copy;
    $('#journey-camera').textContent = camera;
    $('#journey-visual-note').textContent = note;
    $('#journey-view-caption').textContent = caption;
    $('#journey-next').innerHTML = step===3 ? '重新查看 <span aria-hidden="true">↻</span>' : '下一步 <span aria-hidden="true">→</span>';
    root.querySelectorAll('[data-journey-layer]').forEach(el=>{
      const active=el.dataset.journeyLayer===layer;
      el.classList.toggle('is-active',active); el.setAttribute('aria-hidden',String(!active));
      el.inert = !active;
    });
    $('#journey-cal-recognition').style.opacity = step===1?'1':'0';
    const xs=manifest.target_polygon.map(p=>p[0]),ys=manifest.target_polygon.map(p=>p[1]);
    label.setAttribute('transform',step===2
      ? `translate(${manifest.target_crop[0]+manifest.target_crop[2]-160} ${manifest.target_crop[1]+15}) scale(0.5)`
      : `translate(${Math.min(...xs)+10} ${Math.min(...ys)-96})`);
    frameTo(step===2 ? manifest.target_crop : [0,0,2400,1600],animate && step===2);
  }
  function select(i) { if(!manifest)return; stop(); show(i); }
  steps.forEach((b,i)=>b.addEventListener('click',()=>select(i)));
  $('#journey-next').addEventListener('click',()=>select((step+1)%4));
  $('#journey-enter-region').addEventListener('click',()=>select(1));
  polygon.addEventListener('click',()=>select(2)); label.addEventListener('click',()=>select(2));
  $('#journey-video').addEventListener('click',()=>{stop();document.querySelector('[data-open-video]').click();});
  $('.journey-model-link').addEventListener('click',()=>{stop();document.querySelector('[data-stage="3"]').click();});
  function queue() {
    timer=setTimeout(()=>{
      if(!playing)return;
      if(step===3){stop();return;}
      show(step+1); queue();
    }, step===2?4200:3400);
  }
  play.addEventListener('click',()=>{
    if(!manifest)return;
    if(playing){stop();return;}
    if(step===3)show(0,false);
    playing=true;state.playing=true;play.textContent='Ⅱ 暂停过程';play.setAttribute('aria-pressed','true');queue();
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)stop();},{threshold:0}).observe(root);
  reduced.addEventListener('change',()=>{stop();if(manifest)show(step,false);});
  fetch('assets/journey_v1/journey_manifest.json').then(r=>{if(!r.ok)throw Error('manifest unavailable');return r.json();}).then(data=>{
    if(data.rock_id!=='CAL_061'||data.reference_camera!=='DJI_0277'||data.target_polygon.length!==68)throw Error('case mismatch');
    manifest=data;
    polygon.setAttribute('points',data.target_polygon.map(p=>p.join(',')).join(' '));
    const xs=data.target_polygon.map(p=>p[0]),ys=data.target_polygon.map(p=>p[1]);
    label.setAttribute('transform',`translate(${Math.min(...xs)+10} ${Math.min(...ys)-96})`);
    root.querySelectorAll('button[disabled]').forEach(b=>b.disabled=false);
    state.loaded=true;state.targetId=data.rock_id;state.sourceCamera=data.reference_camera;
    $('#journey-view-caption').setAttribute('aria-live','polite');show(0,false);
  }).catch(()=>{
    state.error='DISPLAY_ASSET_UNAVAILABLE';
    $('#journey-view-caption').textContent='过程素材暂未载入，可在下方查看已保存识别与三维成果。';
    $('#journey-enter-region').disabled=true;
  });
})();
