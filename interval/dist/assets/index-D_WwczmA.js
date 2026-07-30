var G=Object.defineProperty;var j=(e,t,s)=>t in e?G(e,t,{enumerable:!0,configurable:!0,writable:!0,value:s}):e[t]=s;var c=(e,t,s)=>j(e,typeof t!="symbol"?t+"":t,s);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))l(r);new MutationObserver(r=>{for(const o of r)if(o.type==="childList")for(const a of o.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&l(a)}).observe(document,{childList:!0,subtree:!0});function s(r){const o={};return r.integrity&&(o.integrity=r.integrity),r.referrerPolicy&&(o.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?o.credentials="include":r.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function l(r){if(r.ep)return;r.ep=!0;const o=s(r);fetch(r.href,o)}})();const q="interval.v1",w={bestScore:0,muted:!1};function F(){try{const e=localStorage.getItem(q);return e?{...w,...JSON.parse(e)}:{...w}}catch{return{...w}}}function E(e){try{localStorage.setItem(q,JSON.stringify(e))}catch{}}const h=[{name:"Minor 2nd",short:"m2",semis:1},{name:"Major 2nd",short:"M2",semis:2},{name:"Minor 3rd",short:"m3",semis:3},{name:"Major 3rd",short:"M3",semis:4},{name:"Perfect 4th",short:"P4",semis:5},{name:"Perfect 5th",short:"P5",semis:7},{name:"Major 6th",short:"M6",semis:9},{name:"Octave",short:"P8",semis:12}],T=3,x=55,V=64;class _{constructor(){c(this,"score",0);c(this,"lives",T);c(this,"streak",0);c(this,"rootMidi",60);c(this,"current",h[0]);c(this,"finished",!1);c(this,"weak",{});c(this,"store");this.store=F()}get best(){return this.store.bestScore}start(){this.score=0,this.lives=T,this.streak=0,this.finished=!1,this.nextRound()}nextRound(){let t=h[0],s=-1;for(let l=0;l<4;l++){const r=h[Math.floor(Math.random()*h.length)],o=Math.random()+(this.weak[r.semis]??0)*.7;o>s&&(s=o,t=r)}this.current=t,this.rootMidi=Math.floor(Math.random()*(V-x+1))+x}answer(t){if(t===this.current.semis)return this.score+=10+this.streak*2,this.streak+=1,{correct:!0,gameOver:!1,newBest:!1};if(this.weak[this.current.semis]=(this.weak[this.current.semis]??0)+1,this.streak=0,this.lives-=1,this.lives<=0){this.finished=!0;const s=this.score>this.store.bestScore;return s&&(this.store.bestScore=this.score,E(this.store)),{correct:!1,gameOver:!0,newBest:s}}return{correct:!1,gameOver:!1,newBest:!1}}}let p=null,L=!1;function D(){if(L)return null;try{return p=p??new(window.AudioContext||window.webkitAudioContext),p.state==="suspended"&&p.resume(),p}catch{return null}}function C(e){L=e}function A(){return L}function f(e){return 440*Math.pow(2,(e-69)/12)}function u(e,t,s,l=.28){const r=D();if(!r)return;const o=r.currentTime+t,a=r.createOscillator(),m=r.createOscillator(),d=r.createGain();a.type="triangle",m.type="sine",a.frequency.value=e,m.frequency.value=e*2,d.gain.setValueAtTime(1e-4,o),d.gain.exponentialRampToValueAtTime(l,o+.02),d.gain.exponentialRampToValueAtTime(1e-4,o+s),a.connect(d),m.connect(d),d.connect(r.destination),a.start(o),m.start(o),a.stop(o+s+.03),m.stop(o+s+.03)}function H(e,t){u(f(e),0,.62),u(f(e+t),.66,.7)}function J(){u(f(72),0,.16,.22),u(f(76),.08,.2,.18)}function K(){u(150,0,.24,.16),u(120,.02,.28,.1)}function U(){[67,64,60,55].forEach((e,t)=>u(f(e),t*.14,.24,.2))}function W(e,t,s){return["Interval 🎹 ear training",`Score ${e}`,s?"🏆 New best!":`Best ${t}`,"","Can you name what you hear?"].join(`
`)}async function X(e){try{return await navigator.clipboard.writeText(e),!0}catch{try{const t=document.createElement("textarea");t.value=e,t.style.position="fixed",t.style.opacity="0",document.body.appendChild(t),t.select();const s=document.execCommand("copy");return document.body.removeChild(t),s}catch{return!1}}}const n=new _;C(n.store.muted);const i=document.querySelector("#app");i.innerHTML=`
  <div class="topbar">
    <a class="back" href="../../index.html">← Arcade</a>
    <h1 class="title">🎹 Interval</h1>
    <button class="icon-btn" id="mute" title="Toggle sound"></button>
  </div>

  <div class="hud">
    <div class="pill"><span class="k">Score</span><span class="v" id="score">0</span></div>
    <div class="pill"><span class="k">Streak</span><span class="v" id="streak">0</span></div>
    <div class="pill"><span class="k">Lives</span><span class="v hearts" id="lives">❤️❤️❤️</span></div>
    <div class="pill"><span class="k">Best</span><span class="v" id="best">0</span></div>
  </div>

  <div class="play-area">
    <button class="play-btn" id="play">▶</button>
    <div class="replay"><button id="replay">🔁 Replay</button></div>
  </div>

  <div class="options" id="options">
    ${h.map(e=>`<button class="opt" data-semis="${e.semis}"><span>${e.name}</span><span class="short">${e.short}</span></button>`).join("")}
  </div>

  <p class="center hint" id="hint">Press play, listen to the two notes, then pick the interval.</p>

  <div class="overlay" id="overlay"><div class="modal" id="modal"></div></div>
  <div class="toast" id="toast"></div>
`;const Y=i.querySelector("#score"),z=i.querySelector("#streak"),Q=i.querySelector("#lives"),Z=i.querySelector("#best"),y=i.querySelector("#play"),ee=i.querySelector("#replay"),v=i.querySelector("#options"),N=i.querySelector("#hint"),g=i.querySelector("#overlay"),S=i.querySelector("#modal"),b=i.querySelector("#toast"),$=i.querySelector("#mute");let M=!1;const te=["C","C♯","D","D♯","E","F","F♯","G","G♯","A","A♯","B"];function O(e){return te[e%12]+(Math.floor(e/12)-1)}function se(e){b.textContent=e,b.classList.add("show"),setTimeout(()=>b.classList.remove("show"),1500)}function B(){$.textContent=A()?"🔇":"🔊"}function R(){Y.textContent=String(n.score),z.textContent=String(n.streak),Q.textContent="❤️".repeat(n.lives)+"🖤".repeat(Math.max(0,3-n.lives)),Z.textContent=String(n.best)}function k(){y.classList.remove("pulse"),y.offsetWidth,y.classList.add("pulse"),H(n.rootMidi,n.current.semis)}function re(){v.querySelectorAll(".opt").forEach(e=>e.classList.remove("correct","wrong"))}function P(e=!0){M=!1,n.nextRound(),re(),v.classList.remove("locked"),N.textContent="Listen, then pick the interval you heard.",e&&window.setTimeout(k,250)}function oe(e,t){if(M)return;M=!0,v.classList.add("locked");const s=n.answer(e);v.querySelector(`.opt[data-semis="${n.current.semis}"]`).classList.add("correct"),s.correct||t.classList.add("wrong"),s.correct?J():K(),N.textContent=`${n.current.name}: ${O(n.rootMidi)} → ${O(n.rootMidi+n.current.semis)}`,R(),s.gameOver?window.setTimeout(()=>ne(s.newBest),700):window.setTimeout(()=>P(!0),850)}function ne(e){U();const t=n.store.bestScore;S.innerHTML=`
    <h2>Out of lives</h2>
    <p class="sub">Score</p>
    <div class="big">${n.score}</div>
    <p class="sub">Best ${t}</p>
    ${e?'<p class="newbest">🏆 New best!</p>':""}
    <div class="row">
      <button class="btn ghost" id="m-share">Share</button>
      <button class="btn" id="m-again">Play again</button>
    </div>
  `,g.classList.add("show"),S.querySelector("#m-share").onclick=async()=>{const s=await X(W(n.score,t,e));se(s?"Result copied!":"Could not copy")},S.querySelector("#m-again").onclick=()=>{g.classList.remove("show"),I()}}function I(){g.classList.remove("show"),n.start(),R(),P(!1)}v.querySelectorAll(".opt").forEach(e=>{e.addEventListener("click",()=>oe(Number(e.dataset.semis),e))});y.addEventListener("click",k);ee.addEventListener("click",k);$.addEventListener("click",()=>{const e=!A();C(e),n.store.muted=e,E(n.store),B()});B();I();
