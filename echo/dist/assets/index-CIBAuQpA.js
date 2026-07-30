var V=Object.defineProperty;var Y=(t,e,s)=>e in t?V(t,e,{enumerable:!0,configurable:!0,writable:!0,value:s}):t[e]=s;var c=(t,e,s)=>Y(t,typeof e!="symbol"?e+"":e,s);(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))o(a);new MutationObserver(a=>{for(const i of a)if(i.type==="childList")for(const f of i.addedNodes)f.tagName==="LINK"&&f.rel==="modulepreload"&&o(f)}).observe(document,{childList:!0,subtree:!0});function s(a){const i={};return a.integrity&&(i.integrity=a.integrity),a.referrerPolicy&&(i.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?i.credentials="include":a.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function o(a){if(a.ep)return;a.ep=!0;const i=s(a);fetch(a.href,i)}})();const P="echo.v2";function M(t,e){return`${t?"strict":"forgiving"}-${e}`}function J(){try{const t=localStorage.getItem(P);if(!t)return{best:{},muted:!1};const e=JSON.parse(t);return{best:e.best??{},muted:e.muted??!1}}catch{return{best:{},muted:!1}}}function A(t){try{localStorage.setItem(P,JSON.stringify(t))}catch{}}class Q{constructor(){c(this,"strict",!1);c(this,"pads",4);c(this,"sequence",[]);c(this,"inputIndex",0);c(this,"lives",3);c(this,"store");this.store=J()}get level(){return this.sequence.length}get best(){return this.store.best[M(this.strict,this.pads)]??0}setStrict(e){this.strict=e}setPads(e){this.pads=e}reset(){this.sequence=[],this.inputIndex=0,this.lives=this.strict?1:3}addStep(){this.sequence.push(Math.floor(Math.random()*this.pads)),this.inputIndex=0}stepDuration(){return Math.max(180,480-this.sequence.length*16)}gapDuration(){return Math.max(80,180-this.sequence.length*6)}press(e){return e===this.sequence[this.inputIndex]?(this.inputIndex+=1,this.inputIndex>=this.sequence.length?"complete":"ok"):(this.lives-=1,this.lives<=0?"wrong-over":(this.inputIndex=0,"wrong-alive"))}recordBest(){const e=this.sequence.length-1,s=M(this.strict,this.pads);return e>(this.store.best[s]??0)?(this.store.best[s]=e,A(this.store),!0):!1}}let g=null,C=!1;function U(){if(C)return null;try{return g=g??new(window.AudioContext||window.webkitAudioContext),g.state==="suspended"&&g.resume(),g}catch{return null}}function N(t){C=t}function O(){return C}function W(t,e=.14,s={}){const o=U();if(!o)return;const{type:a="sine",vol:i=.22,attack:f=.01}=s,v=o.createOscillator(),S=o.createGain();v.type=a,v.frequency.value=t;const m=o.currentTime;S.gain.setValueAtTime(1e-4,m),S.gain.exponentialRampToValueAtTime(i,m+f),S.gain.exponentialRampToValueAtTime(1e-4,m+e),v.connect(S).connect(o.destination),v.start(m),v.stop(m+e+.02)}const w=[261.63,329.63,392,523.25,440,293.66];function p(t,e,s,o){W(t,e,{type:s,vol:o})}function I(t,e=.32){p(w[t%w.length],e,"sine",.25),p(w[t%w.length]*2,e*.8,"triangle",.06)}function _(){p(140,.35,"sawtooth",.2),p(90,.4,"square",.12)}function z(){[523.25,659.25,783.99].forEach((t,e)=>setTimeout(()=>p(t,.18,"triangle",.18),e*60))}function X(){[440,349.23,261.63,174.61].forEach((t,e)=>setTimeout(()=>p(t,.24,"sine",.2),e*120))}async function Z(t){try{return await navigator.clipboard.writeText(t),!0}catch{try{const e=document.createElement("textarea");e.value=t,e.style.position="fixed",e.style.opacity="0",document.body.appendChild(e),e.select();const s=document.execCommand("copy");return document.body.removeChild(e),s}catch{return!1}}}function tt(t,e,s,o,a){const i=[e?"Strict":"Forgiving",`${s}-pad`].join(" · ");return["Echo 🔊",`Reached level ${t}  (${i})`,a?"🏆 New best!":`Best ${o}`,"","How long is your memory?"].join(`
`)}const n=new Q;N(n.store.muted);const r=document.querySelector("#app");r.innerHTML=`
  <div class="topbar">
    <a class="back" href="../../index.html">← Arcade</a>
    <h1 class="title">🔊 Echo</h1>
    <button class="icon-btn" id="mute" title="Toggle sound"></button>
  </div>

  <div class="toggles">
    <div class="toggle" id="modeToggle">
      <button data-strict="false" class="active">Forgiving</button>
      <button data-strict="true">Strict</button>
    </div>
    <div class="toggle" id="padToggle">
      <button data-pads="4" class="active">4 pads</button>
      <button data-pads="6">6 pads</button>
    </div>
  </div>

  <div class="hud">
    <div class="pill"><span class="k">Level</span><span class="v" id="level">0</span></div>
    <div class="pill"><span class="k">Lives</span><span class="v hearts" id="lives">❤️❤️❤️</span></div>
    <div class="pill"><span class="k">Best</span><span class="v" id="best">0</span></div>
  </div>

  <div class="pads p4" id="pads"></div>

  <div class="center">
    <p class="status" id="status">Press Start and watch the pattern.</p>
    <button class="btn" id="startBtn">Start</button>
    <p class="hint" id="hint"></p>
  </div>

  <div class="overlay" id="overlay">
    <div class="modal" id="modal"></div>
  </div>
  <div class="toast" id="toast"></div>
`;const T=r.querySelector("#modeToggle"),E=r.querySelector("#padToggle"),d=r.querySelector("#pads"),et=r.querySelector("#level"),st=r.querySelector("#lives"),nt=r.querySelector("#best"),q=r.querySelector("#status"),at=r.querySelector("#hint"),B=r.querySelector("#startBtn"),k=r.querySelector("#overlay"),x=r.querySelector("#modal"),L=r.querySelector("#toast"),F=r.querySelector("#mute");let u=!1,h=!1;const y=t=>new Promise(e=>setTimeout(e,t));function ot(t){L.textContent=t,L.classList.add("show"),setTimeout(()=>L.classList.remove("show"),1500)}function D(){F.textContent=O()?"🔇":"🔊"}function b(){T.querySelectorAll("button").forEach(t=>{t.classList.toggle("active",t.dataset.strict==="true"===n.strict)}),E.querySelectorAll("button").forEach(t=>{t.classList.toggle("active",Number(t.dataset.pads)===n.pads)}),T.classList.toggle("locked",h),E.classList.toggle("locked",h)}function l(){et.textContent=String(n.level);const t=n.strict?1:3;st.textContent="❤️".repeat(n.lives)+"🖤".repeat(Math.max(0,t-n.lives)),nt.textContent=String(n.best)}function $(){d.className=`pads p${n.pads}`,d.innerHTML="";for(let t=0;t<n.pads;t++){const e=document.createElement("button");e.className=`pad c${t}`,e.setAttribute("aria-label",`pad ${t+1}`),e.addEventListener("pointerdown",()=>rt(t)),d.appendChild(e)}}function H(t){for(let e=0;e<6;e++){const s=document.createElement("span");s.className="spark",t.appendChild(s);const o=Math.PI*2*e/6+Math.random()*.5,a=40+Math.random()*30;s.animate([{transform:"translate(-50%, -50%) scale(1)",opacity:.9},{transform:`translate(calc(-50% + ${Math.cos(o)*a}px), calc(-50% + ${Math.sin(o)*a}px)) scale(0)`,opacity:0}],{duration:450,easing:"ease-out"}),setTimeout(()=>s.remove(),460)}}function R(t){return d.children[t]}async function it(t,e){const s=R(t);s.classList.add("lit"),I(t,e/1e3),H(s),await y(e),s.classList.remove("lit"),await y(n.gapDuration())}async function G(){u=!1,d.classList.add("locked"),q.textContent="Watch…",await y(500);const t=n.stepDuration();for(const e of n.sequence)await it(e,t);u=!0,d.classList.remove("locked"),q.textContent="Your turn — repeat it!"}function j(){n.addStep(),l(),G()}async function rt(t){if(!u)return;const e=R(t);e.classList.add("lit"),I(t,.22),H(e),setTimeout(()=>e.classList.remove("lit"),180);const s=n.press(t);if(s!=="ok"){if(s==="complete"){u=!1,q.textContent="Nice! 🎉",z(),await y(650),j();return}if(s==="wrong-alive"){u=!1,_(),l(),q.textContent=`Oops! ${n.lives} ${n.lives===1?"life":"lives"} left — watch again.`,await y(900),G();return}ct()}}function ct(){u=!1,h=!1,X();const t=n.sequence.length-1,e=n.recordBest();b(),l(),x.innerHTML=`
    <h2>Game Over</h2>
    <p class="sub">You remembered</p>
    <div class="big">${t}</div>
    <p class="sub">steps · ${n.strict?"Strict":"Forgiving"} · ${n.pads}-pad · Best ${n.best}</p>
    ${e?'<p class="newbest">🏆 New best!</p>':""}
    <div class="row">
      <button class="btn ghost" id="m-share">Share</button>
      <button class="btn" id="m-again">Play again</button>
    </div>
  `,k.classList.add("show"),x.querySelector("#m-share").onclick=async()=>{const s=await Z(tt(t,n.strict,n.pads,n.best,e));ot(s?"Result copied!":"Could not copy")},x.querySelector("#m-again").onclick=()=>{k.classList.remove("show"),K()}}function K(){k.classList.remove("show"),h=!0,n.reset(),$(),b(),l(),B.classList.add("hidden"),at.textContent=n.strict?"Strict: one mistake ends the run.":"Forgiving: 3 lives — a slip just replays the pattern.",j()}T.querySelectorAll("button").forEach(t=>{t.addEventListener("click",()=>{h||(n.setStrict(t.dataset.strict==="true"),n.reset(),b(),l())})});E.querySelectorAll("button").forEach(t=>{t.addEventListener("click",()=>{h||(n.setPads(Number(t.dataset.pads)),$(),b(),l())})});F.addEventListener("click",()=>{const t=!O();N(t),n.store.muted=t,A(n.store),D()});B.addEventListener("click",K);D();b();l();$();
