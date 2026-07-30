var j=Object.defineProperty;var P=(e,t,n)=>t in e?j(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n;var v=(e,t,n)=>P(e,typeof t!="symbol"?t+"":t,n);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))a(s);new MutationObserver(s=>{for(const i of s)if(i.type==="childList")for(const c of i.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&a(c)}).observe(document,{childList:!0,subtree:!0});function n(s){const i={};return s.integrity&&(i.integrity=s.integrity),s.referrerPolicy&&(i.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?i.credentials="include":s.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function a(s){if(s.ep)return;s.ep=!0;const i=n(s);fetch(s.href,i)}})();function F(e,t){let n=null;t&&(n=document.createElement("button"),n.type="button",n.textContent="↻ Play again",Object.assign(n.style,{position:"fixed",left:"50%",bottom:"max(22px, env(safe-area-inset-bottom))",transform:"translateX(-50%)",display:"none",zIndex:"55",padding:"12px 24px",borderRadius:"999px",border:"none",background:"var(--accent)",color:"#10131c",font:"inherit",fontWeight:"800",fontSize:"1rem",boxShadow:"var(--shadow)",cursor:"pointer",touchAction:"manipulation",WebkitTapHighlightColor:"transparent"}),n.addEventListener("click",()=>{n.style.display="none",t()}),document.body.appendChild(n));const a=()=>{e.classList.contains("show")&&(e.classList.remove("show"),n&&(n.style.display="block"))};e.addEventListener("pointerdown",i=>{i.target===e&&a()}),window.addEventListener("keydown",i=>{i.key==="Escape"&&a()});const s=document.createElement("button");s.type="button",s.setAttribute("aria-label","Close"),s.textContent="✕",Object.assign(s.style,{position:"fixed",top:"max(14px, env(safe-area-inset-top))",right:"max(14px, env(safe-area-inset-right))",width:"40px",height:"40px",display:"grid",placeItems:"center",borderRadius:"10px",border:"1px solid var(--line)",background:"var(--bg-soft)",color:"var(--text)",font:"inherit",fontSize:"1.05rem",lineHeight:"1",cursor:"pointer",touchAction:"manipulation",WebkitTapHighlightColor:"transparent"}),s.addEventListener("click",a),e.appendChild(s)}const E="digitspan.v1";function z(){try{const e=localStorage.getItem(E);if(!e)return{best:{},muted:!1};const t=JSON.parse(e);return{best:t.best??{},muted:t.muted??!1}}catch{return{best:{},muted:!1}}}function C(e){try{localStorage.setItem(E,JSON.stringify(e))}catch{}}class G{constructor(){v(this,"mode","forward");v(this,"sequence",[]);v(this,"store");this.store=z()}get level(){return this.sequence.length}get best(){return this.store.best[this.mode]??0}setMode(t){this.mode=t}reset(){this.sequence=[]}addDigit(){this.sequence.push(Math.floor(Math.random()*10))}expected(){return this.mode==="reverse"?[...this.sequence].reverse():this.sequence}check(t){const n=this.expected();return t.length!==n.length?!1:n.every((a,s)=>a===t[s])}flashDuration(){return Math.max(450,800-this.sequence.length*15)}recordBest(){const t=this.sequence.length-1;return t>(this.store.best[this.mode]??0)?(this.store.best[this.mode]=t,C(this.store),!0):!1}}let p=null,q=!1;const K=[60,62,64,65,67,69,71,72,74,76];function V(){if(q)return null;try{return p=p??new(window.AudioContext||window.webkitAudioContext),p.state==="suspended"&&p.resume(),p}catch{return null}}function M(e){q=e}function $(){return q}function A(e){return 440*Math.pow(2,(e-69)/12)}function h(e,t,n,a){const s=V();if(!s)return;const i=s.createOscillator(),c=s.createGain();i.type=n,i.frequency.value=e;const u=s.currentTime;c.gain.setValueAtTime(1e-4,u),c.gain.exponentialRampToValueAtTime(a,u+.02),c.gain.exponentialRampToValueAtTime(1e-4,u+t),i.connect(c).connect(s.destination),i.start(u),i.stop(u+t+.02)}function J(e){h(A(K[e%10]),.32,"sine",.24)}function Y(){h(660,.05,"triangle",.12)}function _(){[72,76,79].forEach((e,t)=>setTimeout(()=>h(A(e),.16,"triangle",.2),t*70))}function X(){h(150,.28,"sawtooth",.18),h(110,.32,"square",.1)}function Q(e,t,n,a){return["Digit Span 🔢",`Recalled ${e} digits (${t})`,a?"🏆 New best!":`Best ${n}`,"","How many can you hold in mind?"].join(`
`)}async function U(e){try{return await navigator.clipboard.writeText(e),!0}catch{try{const t=document.createElement("textarea");t.value=e,t.style.position="fixed",t.style.opacity="0",document.body.appendChild(t),t.select();const n=document.execCommand("copy");return document.body.removeChild(t),n}catch{return!1}}}const o=new G;M(o.store.muted);const r=document.querySelector("#app");r.innerHTML=`
  <div class="topbar">
    <a class="back" href="../../index.html">← Arcade</a>
    <h1 class="title">🔢 Digit Span</h1>
    <button class="icon-btn" id="mute" title="Toggle sound"></button>
  </div>

  <div class="controls">
    <div class="toggle" id="modeToggle">
      <button data-mode="forward" class="active">Forward</button>
      <button data-mode="reverse">Reverse</button>
    </div>
  </div>

  <div class="hud">
    <div class="pill"><span class="k">Span</span><span class="v" id="span">0</span></div>
    <div class="pill"><span class="k">Best</span><span class="v" id="best">0</span></div>
  </div>

  <div class="stage" id="stage">
    <div class="msg" id="msg">Memorise the digits, then type them back.</div>
  </div>

  <div class="center" id="startWrap">
    <button class="btn" id="startBtn">Start</button>
  </div>

  <div class="keypad hidden locked" id="keypad">
    ${[1,2,3,4,5,6,7,8,9].map(e=>`<button class="key" data-k="${e}">${e}</button>`).join("")}
    <button class="key" data-k="back" aria-label="Delete">⌫</button>
    <button class="key" data-k="0">0</button>
    <button class="key enter" data-k="enter" aria-label="Submit">✓</button>
  </div>

  <p class="center hint" id="hint">Reverse mode: type the digits backwards.</p>

  <div class="overlay" id="overlay"><div class="modal" id="modal"></div></div>
  <div class="toast" id="toast"></div>
`;const f=r.querySelector("#modeToggle"),Z=r.querySelector("#span"),ee=r.querySelector("#best"),m=r.querySelector("#stage"),O=r.querySelector("#msg"),te=r.querySelector("#startWrap"),se=r.querySelector("#startBtn"),S=r.querySelector("#keypad"),D=r.querySelector("#hint"),y=r.querySelector("#overlay");F(y,()=>L());const w=r.querySelector("#modal"),x=r.querySelector("#toast"),H=r.querySelector("#mute");let d=[],l=!1;const T=e=>new Promise(t=>setTimeout(t,e));function ne(e){x.textContent=e,x.classList.add("show"),setTimeout(()=>x.classList.remove("show"),1500)}function B(){H.textContent=$()?"🔇":"🔊"}function g(){Z.textContent=String(o.level),ee.textContent=String(o.best)}function b(e){S.classList.toggle("hidden",!e),S.classList.toggle("locked",!e)}function k(e=!1){const t=d.join(" ");m.innerHTML=`
    <div>
      <div class="entry${e?" bad":""}">${t||"&nbsp;"}</div>
      <div class="dots">${o.sequence.map((n,a)=>`<span class="d ${a<d.length?"filled":""}"></span>`).join("")}</div>
    </div>`}async function oe(){l=!1,b(!1);const e=o.flashDuration();for(const t of o.sequence)m.innerHTML=`<div class="digit show">${t}</div>`,J(t),await T(e),m.innerHTML='<div class="digit">&nbsp;</div>',await T(220);d=[],k(),O.textContent="",b(!0),l=!0,D.textContent="Type all the digits, then press ✓ (or Enter)."}function R(){o.addDigit(),g(),O.textContent="Watch…",m.innerHTML='<div class="msg">Watch…</div>',oe()}function I(e){l&&(d.length>=o.sequence.length||(d.push(e),Y(),k()))}function N(){l&&(d.pop(),k())}function ie(){o.check(d)?(_(),ae(),window.setTimeout(R,500)):(X(),k(!0),re())}function ae(){m.innerHTML='<div class="digit" style="color:var(--accent)">✓</div>'}function re(){l=!1,b(!1);const e=o.sequence.length-1,t=o.recordBest();g(),f.classList.remove("locked"),w.innerHTML=`
    <h2>Missed it!</h2>
    <p class="sub">You recalled</p>
    <div class="big">${e}</div>
    <p class="sub">digits · ${o.mode} · Best ${o.best}</p>
    <p class="seqline">Sequence: ${o.expected().join(" ")}</p>
    ${t?'<p class="newbest">🏆 New best!</p>':""}
    <div class="row">
      <button class="btn ghost" id="m-share">Share</button>
      <button class="btn" id="m-again">Play again</button>
    </div>
  `,y.classList.add("show"),w.querySelector("#m-share").onclick=async()=>{const n=await U(Q(e,o.mode,o.best,t));ne(n?"Result copied!":"Could not copy")},w.querySelector("#m-again").onclick=()=>{y.classList.remove("show"),L()}}function L(){y.classList.remove("show"),te.classList.add("hidden"),f.classList.add("locked"),o.reset(),g(),R()}S.querySelectorAll(".key").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.k;t==="back"?N():t==="enter"?W():I(Number(t))})});document.addEventListener("keydown",e=>{e.key>="0"&&e.key<="9"?I(Number(e.key)):e.key==="Backspace"?N():e.key==="Enter"&&W()});function W(){!l||d.length!==o.sequence.length||(l=!1,b(!1),ie())}f.querySelectorAll("button").forEach(e=>{e.addEventListener("click",()=>{f.classList.contains("locked")||(o.setMode(e.dataset.mode),f.querySelectorAll("button").forEach(t=>t.classList.remove("active")),e.classList.add("active"),g(),D.textContent=o.mode==="reverse"?"Reverse mode: type the digits backwards.":"Forward mode: type the digits in order.")})});se.addEventListener("click",L);H.addEventListener("click",()=>{const e=!$();M(e),o.store.muted=e,C(o.store),B()});B();g();
