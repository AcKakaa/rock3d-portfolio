(() => {
  'use strict';
  const data = window.PROJECT_DATA;
  const $ = (q) => document.querySelector(q);
  const $$ = (q) => [...document.querySelectorAll(q)];
  const pct = (v) => (v * 100).toFixed(2);

  const captions = {labels:'提供的 basic 岩性标签',R:'R · 原始反射率预测',Q:'Q · 连续统去除预测',S:'S · 归一化吸收形状预测'};
  $$('[data-view]').forEach(button => button.addEventListener('click', () => {
    const rep = button.dataset.view;
    $('#hero-view').src = `assets/view-${rep}.webp`;
    $('#hero-view').alt = `${captions[rep]}，裁切自保存的完整三维对照图`;
    $('#view-caption').textContent = captions[rep];
    $$('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  }));

  const names={R:'原始反射率',Q:'连续统去除',S:'归一化吸收'};
  function setScope(scope) {
    const internal = scope === 'internal', scores = data[scope], r = scores[0];
    $('#population-tag').textContent = internal ? 'n = 289,863 内部池点' : 'n = 2,573,213 测试点';
    $('#scope-heading').textContent = `原始反射率 R / ${internal ? '内部空间验证' : '官方共同测试'}`;
    $('#main-f1').innerHTML = `${pct(r.macro_f1)}<span>%</span>`;
    $('#main-oa').textContent = `${pct(r.oa)}%`;
    $('#main-iou').textContent = `${pct(r.miou)}%`;
    $('#scope-detail').textContent = internal ? '三折合并 OOF / 带缓冲空间块' : '原官方训练 / 测试划分';
    $('#metric-bars').innerHTML = scores.map(s => `<div class="metric-row"><span>${s.representation} · ${names[s.representation]}</span><div class="bar-track" role="img" aria-label="${s.representation} 宏F1 ${pct(s.macro_f1)}%"><div class="bar-fill" style="width:${pct(s.macro_f1)}%"></div></div><strong>${pct(s.macro_f1)}</strong></div>`).join('');
    $$('[data-scope]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.scope === scope)));
  }
  $$('[data-scope]').forEach(b => b.addEventListener('click', () => setScope(b.dataset.scope)));
  setScope('official');

  let representation = 'R', showSpread = true;
  function drawSpectrum() {
    const svg = $('#spectrum-chart'), wave = data.wavelengths;
    const series = ['sulphide','shale'].map(k => data.spectra[`train_${k}_${representation}_p10_p50_p90`]);
    const left=57, top=25, width=524, height=250;
    const low = representation==='R' ? .04 : .70, high=representation==='R' ? .30 : 1.02;
    const x = v => left+(v-wave[0])/(wave.at(-1)-wave[0])*width;
    const y = v => top+(high-v)/(high-low)*height;
    const line = a => a.map((v,i) => `${i?'L':'M'}${x(wave[i]).toFixed(2)},${y(v).toFixed(2)}`).join(' ');
    const polygon = (a,b) => line(a)+' '+[...b].reverse().map((v,j) => `L${x(wave[wave.length-1-j]).toFixed(2)},${y(v).toFixed(2)}`).join(' ')+' Z';
    const ticks = representation==='R' ? [.05,.10,.15,.20,.25,.30] : [.70,.80,.90,1.00];
    let html = '<title>训练区页岩与硫化物类的真实光谱统计</title>';
    html += ticks.map(t => `<path d="M${left},${y(t)}H${left+width}" class="svg-grid"/><text x="${left-10}" y="${y(t)+4}" text-anchor="end" class="svg-tick">${t.toFixed(2)}</text>`).join('');
    html += [2105,2150,2200,2250,2300,2350].map(t => `<text x="${x(t)}" y="${top+height+22}" text-anchor="middle" class="svg-tick">${t}</text>`).join('');
    html += `<text x="${left+width/2}" y="322" text-anchor="middle" class="svg-axis">波长 / nm</text><text x="${left}" y="12" class="svg-axis">${representation==='R'?'缩放反射率 R':'连续统去除比值 Q'}</text>`;
    series.forEach((a,i) => {
      const color = i ? '#bf9beb' : '#92e6c9';
      if(showSpread) html += `<path d="${polygon(a[0],a[2])}" fill="${color}" fill-opacity=".12"/>`;
    });
    series.forEach((a,i) => html += `<path d="${line(a[1])}" fill="none" stroke="${i?'#bf9beb':'#92e6c9'}" stroke-width="2.2" stroke-linejoin="round"/>`);
    svg.innerHTML=html;
    svg.setAttribute('aria-label', `训练区页岩与硫化物类的${representation==='R'?'原始反射率':'连续统去除'}逐波段中位曲线${showSpread?'及p10至p90类内范围':''}，来自保存统计`);
  }
  $$('[data-spectrum]').forEach(b => b.addEventListener('click', () => {
    representation=b.dataset.spectrum;
    $$('[data-spectrum]').forEach(k => k.setAttribute('aria-pressed', String(k===b)));
    drawSpectrum();
  }));
  $('#spread-toggle').addEventListener('click', () => {
    showSpread=!showSpread;
    $('#spread-toggle').setAttribute('aria-pressed', String(showSpread));
    $('#spread-toggle').textContent=showSpread?'隐藏类内范围':'显示类内范围';
    drawSpectrum();
  });
  drawSpectrum();

  const dialog=$('#image-dialog');
  $$('.image-open').forEach(button => button.addEventListener('click', () => {
    $('#dialog-title').textContent=button.dataset.title;
    $('#dialog-image').src=button.dataset.image;
    $('#dialog-image').alt=button.dataset.title;
    $('#dialog-caption').textContent=button.dataset.caption;
    $('#dialog-original').href=button.dataset.image;
    dialog.showModal();
  }));
  $('#dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', e => {
    if(e.target!==dialog) return;
    const box=dialog.getBoundingClientRect();
    if(e.clientX<box.left || e.clientX>box.right || e.clientY<box.top || e.clientY>box.bottom) dialog.close();
  });
})();
