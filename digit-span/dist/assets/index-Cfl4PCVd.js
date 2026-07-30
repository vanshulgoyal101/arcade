var P=Object.defineProperty;var W=(e,t,n)=>t in e?P(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n;var v=(e,t,n)=>W(e,typeof t!="symbol"?t+"":t,n);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))i(s);new MutationObserver(s=>{for(const r of s)if(r.type==="childList")for(const c of r.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&i(c)}).observe(document,{childList:!0,subtree:!0});function n(s){const r={};return s.integrity&&(r.integrity=s.integrity),s.referrerPolicy&&(r.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?r.credentials="include":s.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function i(s){if(s.ep)return;s.ep=!0;const r=n(s);fetch(s.href,r)}})();function F(e,t){const n=()=>{e.classList.contains("show")&&e.classList.remove("show")};e.addEventListener("pointerdown",s=>{s.target===e&&n()}),window.addEventListener("keydown",s=>{s.key==="Escape"&&n()});const i=document.createElement("button");i.type="button",i.setAttribute("aria-label","Close"),i.textContent="✕",Object.assign(i.style,{position:"fixed",top:"max(14px, env(safe-area-inset-top))",right:"max(14px, env(safe-area-inset-right))",width:"40px",height:"40px",display:"grid",placeItems:"center",borderRadius:"10px",border:"1px solid var(--line)",background:"var(--bg-soft)",color:"var(--text)",font:"inherit",fontSize:"1.05rem",lineHeight:"1",cursor:"pointer",touchAction:"manipulation",WebkitTapHighlightColor:"transparent"}),i.addEventListener("click",n),e.appendChild(i)}const T="digitspan.v1";function G(){try{const e=localStorage.getItem(T);if(!e)return{best:{},muted:!1};const t=JSON.parse(e);return{best:t.best??{},muted:t.muted??!1}}catch{return{best:{},muted:!1}}}function E(e){try{localStorage.setItem(T,JSON.stringify(e))}catch{}}class K{constructor(){v(this,"mode","forward");v(this,"sequence",[]);v(this,"store");this.store=G()}get level(){return this.sequence.length}get best(){return this.store.best[this.mode]??0}setMode(t){this.mode=t}reset(){this.sequence=[]}addDigit(){this.sequence.push(Math.floor(Math.random()*10))}expected(){return this.mode==="reverse"?[...this.sequence].reverse():this.sequence}check(t){const n=this.expected();return t.length!==n.length?!1:n.every((i,s)=>i===t[s])}flashDuration(){return Math.max(450,800-this.sequence.length*15)}recordBest(){const t=this.sequence.length-1;return t>(this.store.best[this.mode]??0)?(this.store.best[this.mode]=t,E(this.store),!0):!1}}let p=null,x=!1;const V=[60,62,64,65,67,69,71,72,74,76];function J(){if(x)return null;try{return p=p??new(window.AudioContext||window.webkitAudioContext),p.state==="suspended"&&p.resume(),p}catch{return null}}function C(e){x=e}function M(){return x}function $(e){return 440*Math.pow(2,(e-69)/12)}function f(e,t,n,i){const s=J();if(!s)return;const r=s.createOscillator(),c=s.createGain();r.type=n,r.frequency.value=e;const u=s.currentTime;c.gain.setValueAtTime(1e-4,u),c.gain.exponentialRampToValueAtTime(i,u+.02),c.gain.exponentialRampToValueAtTime(1e-4,u+t),r.connect(c).connect(s.destination),r.start(u),r.stop(u+t+.02)}function Y(e){f($(V[e%10]),.32,"sine",.24)}function _(){f(660,.05,"triangle",.12)}function z(){[72,76,79].forEach((e,t)=>setTimeout(()=>f($(e),.16,"triangle",.2),t*70))}function Q(){f(150,.28,"sawtooth",.18),f(110,.32,"square",.1)}function U(e,t,n,i){return["Digit Span 🔢",`Recalled ${e} digits (${t})`,i?"🏆 New best!":`Best ${n}`,"","How many can you hold in mind?"].join(`
`)}async function X(e){try{return await navigator.clipboard.writeText(e),!0}catch{try{const t=document.createElement("textarea");t.value=e,t.style.position="fixed",t.style.opacity="0",document.body.appendChild(t),t.select();const n=document.execCommand("copy");return document.body.removeChild(t),n}catch{return!1}}}const o=new K;C(o.store.muted);const a=document.querySelector("#app");a.innerHTML=`
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
`;const h=a.querySelector("#modeToggle"),Z=a.querySelector("#span"),ee=a.querySelector("#best"),m=a.querySelector("#stage"),A=a.querySelector("#msg"),te=a.querySelector("#startWrap"),se=a.querySelector("#startBtn"),S=a.querySelector("#keypad"),D=a.querySelector("#hint"),y=a.querySelector("#overlay");F(y);const w=a.querySelector("#modal"),q=a.querySelector("#toast"),O=a.querySelector("#mute");let d=[],l=!1;const L=e=>new Promise(t=>setTimeout(t,e));function ne(e){q.textContent=e,q.classList.add("show"),setTimeout(()=>q.classList.remove("show"),1500)}function B(){O.textContent=M()?"🔇":"🔊"}function g(){Z.textContent=String(o.level),ee.textContent=String(o.best)}function b(e){S.classList.toggle("hidden",!e),S.classList.toggle("locked",!e)}function k(e=!1){const t=d.join(" ");m.innerHTML=`
    <div>
      <div class="entry${e?" bad":""}">${t||"&nbsp;"}</div>
      <div class="dots">${o.sequence.map((n,i)=>`<span class="d ${i<d.length?"filled":""}"></span>`).join("")}</div>
    </div>`}async function oe(){l=!1,b(!1);const e=o.flashDuration();for(const t of o.sequence)m.innerHTML=`<div class="digit show">${t}</div>`,Y(t),await L(e),m.innerHTML='<div class="digit">&nbsp;</div>',await L(220);d=[],k(),A.textContent="",b(!0),l=!0,D.textContent="Type all the digits, then press ✓ (or Enter)."}function H(){o.addDigit(),g(),A.textContent="Watch…",m.innerHTML='<div class="msg">Watch…</div>',oe()}function R(e){l&&(d.length>=o.sequence.length||(d.push(e),_(),k()))}function N(){l&&(d.pop(),k())}function ie(){o.check(d)?(z(),re(),window.setTimeout(H,500)):(Q(),k(!0),ae())}function re(){m.innerHTML='<div class="digit" style="color:var(--accent)">✓</div>'}function ae(){l=!1,b(!1);const e=o.sequence.length-1,t=o.recordBest();g(),h.classList.remove("locked"),w.innerHTML=`
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
  `,y.classList.add("show"),w.querySelector("#m-share").onclick=async()=>{const n=await X(U(e,o.mode,o.best,t));ne(n?"Result copied!":"Could not copy")},w.querySelector("#m-again").onclick=()=>{y.classList.remove("show"),I()}}function I(){y.classList.remove("show"),te.classList.add("hidden"),h.classList.add("locked"),o.reset(),g(),H()}S.querySelectorAll(".key").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.k;t==="back"?N():t==="enter"?j():R(Number(t))})});document.addEventListener("keydown",e=>{e.key>="0"&&e.key<="9"?R(Number(e.key)):e.key==="Backspace"?N():e.key==="Enter"&&j()});function j(){!l||d.length!==o.sequence.length||(l=!1,b(!1),ie())}h.querySelectorAll("button").forEach(e=>{e.addEventListener("click",()=>{h.classList.contains("locked")||(o.setMode(e.dataset.mode),h.querySelectorAll("button").forEach(t=>t.classList.remove("active")),e.classList.add("active"),g(),D.textContent=o.mode==="reverse"?"Reverse mode: type the digits backwards.":"Forward mode: type the digits in order.")})});se.addEventListener("click",I);O.addEventListener("click",()=>{const e=!M();C(e),o.store.muted=e,E(o.store),B()});B();g();
