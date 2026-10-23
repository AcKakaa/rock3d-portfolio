(() => {
  'use strict';
  const comparison=document.getElementById('comparison');
  document.getElementById('comparison-slider').addEventListener('input',event=>comparison.style.setProperty('--split',`${event.target.value}%`));
  const videoDialog=document.getElementById('video-dialog'),video=document.getElementById('showcase-video');
  document.querySelectorAll('[data-open-video]').forEach(button=>button.addEventListener('click',()=>{
    const source=video.querySelector('source');
    if(!source.getAttribute('src')){source.src=source.dataset.src;video.load();}
    videoDialog.showModal();video.play().catch(()=>{});
  }));
  document.getElementById('open-measurement').addEventListener('click',()=>document.getElementById('measurement-dialog').showModal());
  document.querySelectorAll('dialog').forEach(dialog=>{
    dialog.querySelector('[data-close-dialog]').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}});
    dialog.addEventListener('close',()=>{if(dialog===videoDialog)video.pause();});
  });
  videoDialog.addEventListener('cancel',()=>video.pause());

  const canvas=document.getElementById('rock-canvas'),panel=document.getElementById('model-view');
  const pauseButton=document.getElementById('rotation-toggle');
  const tabs=[...document.querySelectorAll('[data-stage]')];
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  let yaw=-.53,elevation=.48,stage=3,paused=motion.matches,visible=true,drag=null,ready=false;
  const state=window.__rockPreview={loaded:false,stage,paused,yaw,elevation,frames:0};
  function updatePause(){pauseButton.setAttribute('aria-pressed',String(paused));pauseButton.setAttribute('aria-label',paused?'开始模型自动旋转':'暂停模型自动旋转');pauseButton.innerHTML=`<span aria-hidden="true">${paused?'▷':'Ⅱ'}</span>`;state.paused=paused;}
  updatePause();pauseButton.addEventListener('click',()=>{paused=!paused;updatePause();});
  motion.addEventListener('change',()=>{paused=motion.matches;updatePause();});
  const captions=['参考视角的可见表面','加入第一个互补视角','加入第二个互补视角','多视角表面整合'];
  tabs.forEach(button=>button.addEventListener('click',()=>{
    stage=Number(button.dataset.stage);state.stage=stage;
    tabs.forEach(tab=>tab.setAttribute('aria-pressed',String(tab===button)));
    document.getElementById('stage-caption').textContent=captions[stage];
  }));
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;});observer.observe(panel);
  canvas.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;drag={x:event.clientX,y:event.clientY};canvas.setPointerCapture(event.pointerId);paused=true;updatePause();
  });
  canvas.addEventListener('pointermove',event=>{if(!drag)return;yaw+=(event.clientX-drag.x)*.009;elevation=Math.min(1.35,Math.max(-.35,elevation+(event.clientY-drag.y)*.008));drag={x:event.clientX,y:event.clientY};state.yaw=yaw;state.elevation=elevation;});
  const stopDrag=()=>{drag=null;};canvas.addEventListener('pointerup',stopDrag);canvas.addEventListener('pointercancel',stopDrag);
  canvas.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();paused=true;updatePause();yaw+=event.key==='ArrowLeft'?-.12:event.key==='ArrowRight'?.12:0;elevation=Math.min(1.35,Math.max(-.35,elevation+(event.key==='ArrowUp'?.1:event.key==='ArrowDown'?-.1:0)));state.yaw=yaw;state.elevation=elevation;});
  function fallback(reason){ready=false;state.loaded=false;state.fallback=String(reason);panel.classList.remove('ready');document.getElementById('viewer-hint-text').textContent='已核验的多视角可见表面';canvas.tabIndex=-1;pauseButton.hidden=true;tabs.forEach(tab=>{tab.disabled=true;});}
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();fallback('WebGL context lost');});
  async function initialize(){
    try {
      const gl=canvas.getContext('webgl',{alpha:true,antialias:true,preserveDrawingBuffer:true});
      if(!gl)throw new Error('WebGL unavailable');
      const derivatives=!!gl.getExtension('OES_standard_derivatives');
      const vertexSource=`precision highp float;
        attribute vec3 aPosition;attribute vec3 aNormal;attribute float aStage;attribute vec3 aBary;
        uniform float uYaw;uniform float uElevation;uniform float uAspect;uniform float uFit;uniform vec2 uOffset;
        varying vec3 vNormal;varying float vStage;varying vec3 vBary;
        void main(){float c=cos(uYaw),s=sin(uYaw),ce=cos(uElevation),se=sin(uElevation);
          vec3 side=vec3(-s,c,0.0),up=vec3(-se*c,-se*s,ce),back=vec3(-ce*c,-ce*s,-se);
          vec3 p=vec3(dot(aPosition,side),dot(aPosition,up),dot(aPosition,back)-4.2);
          float f=2.05;gl_Position=vec4(p.x*f/uAspect,p.y*f,p.z*(-1.004)-.2004,-p.z);
          gl_Position.xy=(gl_Position.xy+uOffset*gl_Position.w)*uFit;
          vNormal=vec3(dot(aNormal,side),dot(aNormal,up),dot(aNormal,back));vStage=aStage;vBary=aBary;}`;
      const fragmentSource=(derivatives?'#extension GL_OES_standard_derivatives : enable\n':'')+`precision highp float;
        uniform float uStage;varying vec3 vNormal;varying float vStage;varying vec3 vBary;
        void main(){if(vStage>uStage+.1)discard;
          vec3 color=vStage<.5?vec3(.275,.824,.753):vStage<1.5?vec3(.851,.722,.431):vStage<2.5?vec3(.494,.627,.776):vec3(.686,.549,.729);
          float light=.48+.52*abs(dot(normalize(vNormal),normalize(vec3(.35,.65,.75))));
          ${derivatives?'vec3 edges=smoothstep(vec3(0.0),fwidth(vBary)*.65,vBary);float wire=min(min(edges.x,edges.y),edges.z);light*=.84+.16*wire;':''}
          gl_FragColor=vec4(color*light,1.0);}`;
      function shader(type,source){const sh=gl.createShader(type);gl.shaderSource(sh,source);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(sh));return sh;}
      const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertexSource));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragmentSource));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));gl.useProgram(program);
      const response=await fetch('assets/preview/cal061-surface.bin');if(!response.ok)throw new Error(`Model HTTP ${response.status}`);
      const data=new Float32Array(await response.arrayBuffer());if(data.length!==12613*3*10)throw new Error('Display model size mismatch');
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
      for(const [name,size,offset] of [['aPosition',3,0],['aNormal',3,3],['aStage',1,6],['aBary',3,7]]){const loc=gl.getAttribLocation(program,name);if(loc>=0){gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,40,offset*4);}}
      const uniforms={yaw:gl.getUniformLocation(program,'uYaw'),elevation:gl.getUniformLocation(program,'uElevation'),aspect:gl.getUniformLocation(program,'uAspect'),stage:gl.getUniformLocation(program,'uStage'),fit:gl.getUniformLocation(program,'uFit'),offset:gl.getUniformLocation(program,'uOffset')};
      gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.clearColor(0,0,0,0);
      const stageCounts=[0,0,0,0];for(let i=6;i<data.length;i+=30)stageCounts[data[i]]++;state.stageCounts=stageCounts;
      state.loaded=true;ready=true;state.vertices=data.length/10;state.derivatives=derivatives;panel.classList.add('ready');
      let last=performance.now(),lastRender=0,previousKey='';
      function render(now){
        const delta=Math.min((now-last)/1000,.06);last=now;
        if(ready&&visible&&!document.hidden){
          if(!paused&&!drag&&!videoDialog.open){yaw+=delta*.11;state.yaw=yaw;}
          const rect=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,1.8);
          const width=Math.round(rect.width*dpr),height=Math.round(rect.height*dpr);
          const key=[yaw,elevation,stage,width,height].join(',');
          if(key===previousKey||now-lastRender<30){requestAnimationFrame(render);return;}
          previousKey=key;lastRender=now;
          if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
          // Fit the entire saved union, without hiding or filtering any faces.
          // Only the display projection and framing change.
          const c=Math.cos(yaw),s=Math.sin(yaw),ce=Math.cos(elevation),se=Math.sin(elevation),aspect=rect.width/rect.height;
          let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
          for(let i=0;i<data.length;i+=10){const x=data[i],y=data[i+1],z=data[i+2],depth=4.2+ce*c*x+ce*s*y+se*z;
            const px=(-s*x+c*y)*2.05/(depth*aspect),py=(-se*c*x-se*s*y+ce*z)*2.05/depth;
            minX=Math.min(minX,px);maxX=Math.max(maxX,px);minY=Math.min(minY,py);maxY=Math.max(maxY,py);
          }
          const fit=Math.min(1.6/(maxX-minX),1.48/(maxY-minY));
          gl.viewport(0,0,canvas.width,canvas.height);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
          gl.uniform1f(uniforms.yaw,yaw);gl.uniform1f(uniforms.elevation,elevation);gl.uniform1f(uniforms.aspect,aspect);gl.uniform1f(uniforms.stage,stage);gl.uniform1f(uniforms.fit,fit);gl.uniform2f(uniforms.offset,-(minX+maxX)/2,-(minY+maxY)/2+.04/fit);gl.drawArrays(gl.TRIANGLES,0,data.length/10);state.frames++;
          if(gl.getError()!==gl.NO_ERROR){fallback('WebGL render error');return;}
        }
        requestAnimationFrame(render);
      }
      requestAnimationFrame(render);
    }catch(error){fallback(error.message);}
  }
  initialize();
})();
