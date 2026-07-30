var _=Object.defineProperty;var z=(t,e,s)=>e in t?_(t,e,{enumerable:!0,configurable:!0,writable:!0,value:s}):t[e]=s;var c=(t,e,s)=>z(t,typeof e!="symbol"?e+"":e,s);(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))o(n);new MutationObserver(n=>{for(const i of n)if(i.type==="childList")for(const d of i.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&o(d)}).observe(document,{childList:!0,subtree:!0});function s(n){const i={};return n.integrity&&(i.integrity=n.integrity),n.referrerPolicy&&(i.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?i.credentials="include":n.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function o(n){if(n.ep)return;n.ep=!0;const i=s(n);fetch(n.href,i)}})();function W(t,e){let s=null;e&&(s=document.createElement("button"),s.type="button",s.textContent="↻ Play again",Object.assign(s.style,{position:"fixed",left:"50%",bottom:"max(22px, env(safe-area-inset-bottom))",transform:"translateX(-50%)",display:"none",zIndex:"55",padding:"12px 24px",borderRadius:"999px",border:"none",background:"var(--accent)",color:"#10131c",font:"inherit",fontWeight:"800",fontSize:"1rem",boxShadow:"var(--shadow)",cursor:"pointer",touchAction:"manipulation",WebkitTapHighlightColor:"transparent"}),s.addEventListener("click",()=>{s.style.display="none",e()}),document.body.appendChild(s));const o=()=>{t.classList.contains("show")&&(t.classList.remove("show"),s&&(s.style.display="block"))};t.addEventListener("pointerdown",i=>{i.target===t&&o()}),window.addEventListener("keydown",i=>{i.key==="Escape"&&o()});const n=document.createElement("button");n.type="button",n.setAttribute("aria-label","Close"),n.textContent="✕",Object.assign(n.style,{position:"fixed",top:"max(14px, env(safe-area-inset-top))",right:"max(14px, env(safe-area-inset-right))",width:"40px",height:"40px",display:"grid",placeItems:"center",borderRadius:"10px",border:"1px solid var(--line)",background:"var(--bg-soft)",color:"var(--text)",font:"inherit",fontSize:"1.05rem",lineHeight:"1",cursor:"pointer",touchAction:"manipulation",WebkitTapHighlightColor:"transparent"}),n.addEventListener("click",o),t.appendChild(n)}const Y=Math.sqrt(765*255);function p(t){return Math.max(0,Math.min(255,Math.round(t)))}function J(t,e){const s=t.r-e.r,o=t.g-e.g,n=t.b-e.b;return Math.sqrt(s*s+o*o+n*n)}function K(t,e){return Math.max(0,100-J(t,e)/Y*100)}function X(t){return"#"+[t.r,t.g,t.b].map(e=>p(e).toString(16).padStart(2,"0")).join("").toUpperCase()}function O(t){return`rgb(${p(t.r)}, ${p(t.g)}, ${p(t.b)})`}function x(t){return(.299*t.r+.587*t.g+.114*t.b)/255>.55?"#10131c":"#ffffff"}function Q(t){const e=()=>Math.floor(t()*256);let s={r:e(),g:e(),b:e()};if(Math.max(s.r,s.g,s.b)-Math.min(s.r,s.g,s.b)<40){const n=["r","g","b"][Math.floor(t()*3)];s={...s,[n]:p(s[n]+(t()<.5?90:-90))}}return s}function q(){return Q(Math.random)}const H="chromatic.v2",C={endlessBest:0,muted:!1};function Z(){try{const t=localStorage.getItem(H);if(!t)return structuredClone(C);const e=JSON.parse(t);return{endlessBest:e.endlessBest??0,muted:e.muted??!1}}catch{return structuredClone(C)}}function B(t){try{localStorage.setItem(H,JSON.stringify(t))}catch{}}const tt={easy:{label:"Easy",threshold:90},normal:{label:"Normal",threshold:94},hard:{label:"Hard",threshold:97}},k=3;class et{constructor(){c(this,"difficulty","normal");c(this,"target");c(this,"guess",{r:128,g:128,b:128});c(this,"level",1);c(this,"lives",k);c(this,"score",0);c(this,"finished",!1);c(this,"lastResult",null);c(this,"store");this.store=Z(),this.target=q(),this.startEndless()}get threshold(){return tt[this.difficulty].threshold}startEndless(){this.finished=!1,this.level=1,this.lives=k,this.score=0,this.guess={r:128,g:128,b:128},this.nextEndlessTarget()}nextEndlessTarget(){this.target=q()}setDifficulty(e){this.difficulty=e}setGuess(e){this.guess={...this.guess,...e}}submit(){const e=Math.round(K(this.guess,this.target)*10)/10,s=e>=this.threshold,o=this.commitEndless(e,s);return this.lastResult=o,o}commitEndless(e,s){return s?(this.score+=Math.round(e)+this.level*5,this.level+=1,this.nextEndlessTarget(),this.guess={r:128,g:128,b:128},{accuracy:e,passed:!0,gameOver:!1}):(this.lives-=1,this.lives<=0?(this.finished=!0,this.score>this.store.endlessBest&&(this.store.endlessBest=this.score,B(this.store)),{accuracy:e,passed:!1,gameOver:!0}):(this.nextEndlessTarget(),this.guess={r:128,g:128,b:128},{accuracy:e,passed:!1,gameOver:!1}))}}async function st(t){try{return await navigator.clipboard.writeText(t),!0}catch{try{const e=document.createElement("textarea");e.value=t,e.style.position="fixed",e.style.opacity="0",document.body.appendChild(e),e.select();const s=document.execCommand("copy");return document.body.removeChild(e),s}catch{return!1}}}function nt(t,e,s){return["Chromatic · Endless",`Score ${t} · reached level ${e}`,`Best ${s} 🏆`,"","How many can you match?"].join(`
`)}let h=null,T=!1;function rt(){if(T)return null;try{return h=h??new(window.AudioContext||window.webkitAudioContext),h.state==="suspended"&&h.resume(),h}catch{return null}}function N(t){T=t}function R(){return T}function m(t,e=.14,s={}){const o=rt();if(!o)return;const{type:n="sine",vol:i=.22,attack:d=.01}=s,u=o.createOscillator(),y=o.createGain();u.type=n,u.frequency.value=t;const f=o.currentTime;y.gain.setValueAtTime(1e-4,f),y.gain.exponentialRampToValueAtTime(i,f+d),y.gain.exponentialRampToValueAtTime(1e-4,f+e),u.connect(y).connect(o.destination),u.start(f),u.stop(f+e+.02)}function ot(){m(300,.03,{type:"square",vol:.03})}function at(){[523.25,659.25,783.99].forEach((t,e)=>setTimeout(()=>m(t,.16,{type:"triangle",vol:.2}),e*70))}function it(){m(150,.24,{type:"sawtooth",vol:.18}),m(110,.28,{type:"square",vol:.1})}function ct(){[440,349.23,261.63,174.61].forEach((t,e)=>setTimeout(()=>m(t,.24,{type:"sine",vol:.2}),e*120))}const r=new et;N(r.store.muted);const lt={r:"Red",g:"Green",b:"Blue"},a=document.querySelector("#app");a.innerHTML=`
  <div class="topbar">
    <a class="back" href="../../index.html">← Arcade</a>
    <h1 class="title">🌈 Chromatic</h1>
    <button class="icon-btn" id="mute" title="Toggle sound"></button>
  </div>

  <div class="controls">
    <div class="diff" id="diff">
      <button class="diff-btn" data-diff="easy">Easy</button>
      <button class="diff-btn active" data-diff="normal">Normal</button>
      <button class="diff-btn" data-diff="hard">Hard</button>
    </div>
  </div>

  <div class="hud" id="hud"></div>

  <div class="match">
    <div class="swatch target" id="targetSwatch">
      <span class="caption">Target</span>
    </div>
    <div class="swatch you" id="youSwatch">
      <span class="caption">You</span>
      <span class="hexlabel" id="youHex">#808080</span>
    </div>
  </div>

  <div class="sliders">
    ${["r","g","b"].map(t=>`
      <div class="slider-row ${t}">
        <span class="lab">${t.toUpperCase()}</span>
        <input type="range" min="0" max="255" value="128" id="s-${t}" aria-label="${lt[t]}" />
        <span class="val" id="v-${t}">128</span>
      </div>`).join("")}
  </div>

  <div class="actions">
    <button class="btn" id="submit">Submit</button>
  </div>
  <p class="hint" id="hint"></p>

  <div class="overlay" id="overlay">
    <div class="modal" id="modal"></div>
  </div>

  <div class="toast" id="toast"></div>
`;const I=a.querySelector("#diff"),dt=a.querySelector("#hud"),M=a.querySelector("#targetSwatch"),$=a.querySelector("#youSwatch"),g=a.querySelector("#youHex"),D=a.querySelector("#submit"),ut=a.querySelector("#hint"),v=a.querySelector("#overlay");W(v,vt);const b=a.querySelector("#modal"),S=a.querySelector("#toast"),F=a.querySelector("#mute"),w={r:a.querySelector("#s-r"),g:a.querySelector("#s-g"),b:a.querySelector("#s-b")},ft={r:a.querySelector("#v-r"),g:a.querySelector("#v-g"),b:a.querySelector("#v-b")};function E(t){S.textContent=t,S.classList.add("show"),window.setTimeout(()=>S.classList.remove("show"),1600)}function G(){F.textContent=R()?"🔇":"🔊"}function ht(){dt.innerHTML=`
    <div class="pill"><span class="k">Level</span><span class="v">${r.level}</span></div>
    <div class="pill"><span class="k">Score</span><span class="v">${r.score}</span></div>
    <div class="pill"><span class="k">Lives</span><span class="v hearts">${"❤️".repeat(r.lives)}${"🖤".repeat(Math.max(0,3-r.lives))}</span></div>
    <div class="pill"><span class="k">Best</span><span class="v">${r.store.endlessBest}</span></div>
  `}function pt(){M.style.background=O(r.target);const t=M.querySelector(".caption");t.style.color=x(r.target)}function P(){const t=r.guess;$.style.background=O(t);const e=$.querySelector(".caption");e.style.color=x(t),e.style.background="transparent",g.textContent=X(t),g.style.color=x(t),g.style.background="transparent",["r","g","b"].forEach(s=>{w[s].value=String(t[s]),ft[s].textContent=String(t[s])})}function j(){I.querySelectorAll(".diff-btn").forEach(t=>{t.classList.toggle("active",t.dataset.diff===r.difficulty)})}function U(){ut.textContent=`Reach ${r.threshold}% to clear the round. Miss and you lose a life.`}function l(){j(),ht(),pt(),P(),U(),D.disabled=r.finished}function L(){v.classList.remove("show")}function mt(){const t=r.store.endlessBest;b.innerHTML=`
    <h2>Game Over</h2>
    <div class="ring" style="--p:100"><span>${r.score}</span></div>
    <p class="hint" style="margin:0">Reached level ${r.level} · Best ${t} 🏆</p>
    <div class="row">
      <button class="btn ghost" id="m-share">Share</button>
      <button class="btn" id="m-retry">Play again</button>
    </div>
  `,v.classList.add("show"),b.querySelector("#m-share").onclick=async()=>{const e=await st(nt(r.score,r.level,t));E(e?"Result copied to clipboard!":"Could not copy")},b.querySelector("#m-retry").onclick=()=>{L(),r.startEndless(),l()}}let A=0;["r","g","b"].forEach(t=>{w[t].addEventListener("input",()=>{r.setGuess({[t]:Number(w[t].value)});const e=performance.now();e-A>45&&(ot(),A=e),P()})});function V(){if(r.finished)return;const t=r.submit();t.gameOver?(ct(),l(),window.setTimeout(mt,300)):t.passed?(at(),E(`✅ ${t.accuracy.toFixed(0)}% — level ${r.level}!`),l()):(it(),E(`❌ ${t.accuracy.toFixed(0)}% — needed ${r.threshold}%`),l())}D.addEventListener("click",V);document.addEventListener("keydown",t=>{t.key==="Enter"&&!r.finished&&V()});I.querySelectorAll(".diff-btn").forEach(t=>{t.addEventListener("click",()=>{r.setDifficulty(t.dataset.diff),j(),U()})});function vt(){L(),r.startEndless(),l()}v.addEventListener("click",t=>{t.target===v&&L()});F.addEventListener("click",()=>{const t=!R();N(t),r.store.muted=t,B(r.store),G()});G();l();
