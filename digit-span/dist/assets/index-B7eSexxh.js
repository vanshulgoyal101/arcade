var j=Object.defineProperty;var W=(e,t,o)=>t in e?j(e,t,{enumerable:!0,configurable:!0,writable:!0,value:o}):e[t]=o;var v=(e,t,o)=>W(e,typeof t!="symbol"?t+"":t,o);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))a(s);new MutationObserver(s=>{for(const i of s)if(i.type==="childList")for(const c of i.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&a(c)}).observe(document,{childList:!0,subtree:!0});function o(s){const i={};return s.integrity&&(i.integrity=s.integrity),s.referrerPolicy&&(i.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?i.credentials="include":s.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function a(s){if(s.ep)return;s.ep=!0;const i=o(s);fetch(s.href,i)}})();const x="digitspan.v1";function F(){try{const e=localStorage.getItem(x);if(!e)return{best:{},muted:!1};const t=JSON.parse(e);return{best:t.best??{},muted:t.muted??!1}}catch{return{best:{},muted:!1}}}function M(e){try{localStorage.setItem(x,JSON.stringify(e))}catch{}}class G{constructor(){v(this,"mode","forward");v(this,"sequence",[]);v(this,"store");this.store=F()}get level(){return this.sequence.length}get best(){return this.store.best[this.mode]??0}setMode(t){this.mode=t}reset(){this.sequence=[]}addDigit(){this.sequence.push(Math.floor(Math.random()*10))}expected(){return this.mode==="reverse"?[...this.sequence].reverse():this.sequence}check(t){const o=this.expected();return t.length!==o.length?!1:o.every((a,s)=>a===t[s])}flashDuration(){return Math.max(450,800-this.sequence.length*15)}recordBest(){const t=this.sequence.length-1;return t>(this.store.best[this.mode]??0)?(this.store.best[this.mode]=t,M(this.store),!0):!1}}let f=null,L=!1;const K=[60,62,64,65,67,69,71,72,74,76];function V(){if(L)return null;try{return f=f??new(window.AudioContext||window.webkitAudioContext),f.state==="suspended"&&f.resume(),f}catch{return null}}function E(e){L=e}function $(){return L}function C(e){return 440*Math.pow(2,(e-69)/12)}function m(e,t,o,a){const s=V();if(!s)return;const i=s.createOscillator(),c=s.createGain();i.type=o,i.frequency.value=e;const u=s.currentTime;c.gain.setValueAtTime(1e-4,u),c.gain.exponentialRampToValueAtTime(a,u+.02),c.gain.exponentialRampToValueAtTime(1e-4,u+t),i.connect(c).connect(s.destination),i.start(u),i.stop(u+t+.02)}function J(e){m(C(K[e%10]),.32,"sine",.24)}function Y(){m(660,.05,"triangle",.12)}function _(){[72,76,79].forEach((e,t)=>setTimeout(()=>m(C(e),.16,"triangle",.2),t*70))}function z(){m(150,.28,"sawtooth",.18),m(110,.32,"square",.1)}function Q(e,t,o,a){return["Digit Span 🔢",`Recalled ${e} digits (${t})`,a?"🏆 New best!":`Best ${o}`,"","How many can you hold in mind?"].join(`
`)}async function U(e){try{return await navigator.clipboard.writeText(e),!0}catch{try{const t=document.createElement("textarea");t.value=e,t.style.position="fixed",t.style.opacity="0",document.body.appendChild(t),t.select();const o=document.execCommand("copy");return document.body.removeChild(t),o}catch{return!1}}}const n=new G;E(n.store.muted);const r=document.querySelector("#app");r.innerHTML=`
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
`;const h=r.querySelector("#modeToggle"),X=r.querySelector("#span"),Z=r.querySelector("#best"),p=r.querySelector("#stage"),B=r.querySelector("#msg"),ee=r.querySelector("#startWrap"),te=r.querySelector("#startBtn"),q=r.querySelector("#keypad"),D=r.querySelector("#hint"),S=r.querySelector("#overlay"),k=r.querySelector("#modal"),w=r.querySelector("#toast"),O=r.querySelector("#mute");let d=[],l=!1;const T=e=>new Promise(t=>setTimeout(t,e));function se(e){w.textContent=e,w.classList.add("show"),setTimeout(()=>w.classList.remove("show"),1500)}function A(){O.textContent=$()?"🔇":"🔊"}function g(){X.textContent=String(n.level),Z.textContent=String(n.best)}function y(e){q.classList.toggle("hidden",!e),q.classList.toggle("locked",!e)}function b(e=!1){const t=d.join(" ");p.innerHTML=`
    <div>
      <div class="entry${e?" bad":""}">${t||"&nbsp;"}</div>
      <div class="dots">${n.sequence.map((o,a)=>`<span class="d ${a<d.length?"filled":""}"></span>`).join("")}</div>
    </div>`}async function ne(){l=!1,y(!1);const e=n.flashDuration();for(const t of n.sequence)p.innerHTML=`<div class="digit show">${t}</div>`,J(t),await T(e),p.innerHTML='<div class="digit">&nbsp;</div>',await T(220);d=[],b(),B.textContent="",y(!0),l=!0,D.textContent="Type all the digits, then press ✓ (or Enter)."}function H(){n.addDigit(),g(),B.textContent="Watch…",p.innerHTML='<div class="msg">Watch…</div>',ne()}function N(e){l&&(d.length>=n.sequence.length||(d.push(e),Y(),b()))}function R(){l&&(d.pop(),b())}function oe(){n.check(d)?(_(),ie(),window.setTimeout(H,500)):(z(),b(!0),re())}function ie(){p.innerHTML='<div class="digit" style="color:var(--accent)">✓</div>'}function re(){l=!1,y(!1);const e=n.sequence.length-1,t=n.recordBest();g(),h.classList.remove("locked"),k.innerHTML=`
    <h2>Missed it!</h2>
    <p class="sub">You recalled</p>
    <div class="big">${e}</div>
    <p class="sub">digits · ${n.mode} · Best ${n.best}</p>
    <p class="seqline">Sequence: ${n.expected().join(" ")}</p>
    ${t?'<p class="newbest">🏆 New best!</p>':""}
    <div class="row">
      <button class="btn ghost" id="m-share">Share</button>
      <button class="btn" id="m-again">Play again</button>
    </div>
  `,S.classList.add("show"),k.querySelector("#m-share").onclick=async()=>{const o=await U(Q(e,n.mode,n.best,t));se(o?"Result copied!":"Could not copy")},k.querySelector("#m-again").onclick=()=>{S.classList.remove("show"),I()}}function I(){S.classList.remove("show"),ee.classList.add("hidden"),h.classList.add("locked"),n.reset(),g(),H()}q.querySelectorAll(".key").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.k;t==="back"?R():t==="enter"?P():N(Number(t))})});document.addEventListener("keydown",e=>{e.key>="0"&&e.key<="9"?N(Number(e.key)):e.key==="Backspace"?R():e.key==="Enter"&&P()});function P(){!l||d.length!==n.sequence.length||(l=!1,y(!1),oe())}h.querySelectorAll("button").forEach(e=>{e.addEventListener("click",()=>{h.classList.contains("locked")||(n.setMode(e.dataset.mode),h.querySelectorAll("button").forEach(t=>t.classList.remove("active")),e.classList.add("active"),g(),D.textContent=n.mode==="reverse"?"Reverse mode: type the digits backwards.":"Forward mode: type the digits in order.")})});te.addEventListener("click",I);O.addEventListener("click",()=>{const e=!$();E(e),n.store.muted=e,M(n.store),A()});A();g();
