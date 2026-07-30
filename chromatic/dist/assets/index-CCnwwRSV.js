var Z=Object.defineProperty;var tt=(t,e,s)=>e in t?Z(t,e,{enumerable:!0,configurable:!0,writable:!0,value:s}):t[e]=s;var l=(t,e,s)=>tt(t,typeof e!="symbol"?e+"":e,s);(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))a(r);new MutationObserver(r=>{for(const i of r)if(i.type==="childList")for(const c of i.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&a(c)}).observe(document,{childList:!0,subtree:!0});function s(r){const i={};return r.integrity&&(i.integrity=r.integrity),r.referrerPolicy&&(i.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?i.credentials="include":r.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function a(r){if(r.ep)return;r.ep=!0;const i=s(r);fetch(r.href,i)}})();function et(t,e){const s=()=>{t.classList.contains("show")&&t.classList.remove("show")};t.addEventListener("pointerdown",r=>{r.target===t&&s()}),window.addEventListener("keydown",r=>{r.key==="Escape"&&s()});const a=document.createElement("button");a.type="button",a.setAttribute("aria-label","Close"),a.textContent="✕",Object.assign(a.style,{position:"fixed",top:"max(14px, env(safe-area-inset-top))",right:"max(14px, env(safe-area-inset-right))",width:"40px",height:"40px",display:"grid",placeItems:"center",borderRadius:"10px",border:"1px solid var(--line)",background:"var(--bg-soft)",color:"var(--text)",font:"inherit",fontSize:"1.05rem",lineHeight:"1",cursor:"pointer",touchAction:"manipulation",WebkitTapHighlightColor:"transparent"}),a.addEventListener("click",s),t.appendChild(a)}const st=Math.sqrt(765*255);function v(t){return Math.max(0,Math.min(255,Math.round(t)))}function at(t,e){const s=t.r-e.r,a=t.g-e.g,r=t.b-e.b;return Math.sqrt(s*s+a*a+r*r)}function nt(t,e){return Math.max(0,100-at(t,e)/st*100)}function M(t){return"#"+[t.r,t.g,t.b].map(e=>v(e).toString(16).padStart(2,"0")).join("").toUpperCase()}function S(t){return`rgb(${v(t.r)}, ${v(t.g)}, ${v(t.b)})`}function T(t){return(.299*t.r+.587*t.g+.114*t.b)/255>.55?"#10131c":"#ffffff"}function rt(t){let e=2166136261;for(let s=0;s<t.length;s++)e^=t.charCodeAt(s),e=Math.imul(e,16777619);return e>>>0}function ot(t){let e=t;return function(){e|=0,e=e+1831565813|0;let s=Math.imul(e^e>>>15,1|e);return s=s+Math.imul(s^s>>>7,61|s)^s,((s^s>>>14)>>>0)/4294967296}}function P(t){const e=()=>Math.floor(t()*256);let s={r:e(),g:e(),b:e()};if(Math.max(s.r,s.g,s.b)-Math.min(s.r,s.g,s.b)<40){const r=["r","g","b"][Math.floor(t()*3)];s={...s,[r]:v(s[r]+(t()<.5?90:-90))}}return s}function it(t){return P(ot(rt(t)))}function D(){return P(Math.random)}function g(t=new Date){const e=t.getFullYear(),s=String(t.getMonth()+1).padStart(2,"0"),a=String(t.getDate()).padStart(2,"0");return`${e}-${s}-${a}`}function lt(t=new Date){const e=new Date(t);return e.setDate(e.getDate()-1),g(e)}const I="chromatic.v2",k={daily:{day:"",bestAccuracy:0,done:!1,streak:0,lastPlayed:"",maxStreak:0},endlessBest:0,muted:!1};function ct(){try{const t=localStorage.getItem(I);if(!t)return structuredClone(k);const e=JSON.parse(t);return{daily:{...k.daily,...e.daily},endlessBest:e.endlessBest??0,muted:e.muted??!1}}catch{return structuredClone(k)}}function L(t){try{localStorage.setItem(I,JSON.stringify(t))}catch{}}const dt={easy:{label:"Easy",threshold:90},normal:{label:"Normal",threshold:94},hard:{label:"Hard",threshold:97}},O=3;class ut{constructor(){l(this,"mode","daily");l(this,"difficulty","normal");l(this,"target");l(this,"guess",{r:128,g:128,b:128});l(this,"level",1);l(this,"lives",O);l(this,"score",0);l(this,"finished",!1);l(this,"lastResult",null);l(this,"store");this.store=ct(),this.target=D(),this.startDaily()}get threshold(){return dt[this.difficulty].threshold}get dailyAlreadyDone(){return this.store.daily.day===g()&&this.store.daily.done}startDaily(){this.mode="daily",this.finished=this.dailyAlreadyDone,this.target=it("chromatic-"+g()),this.guess={r:128,g:128,b:128},this.lastResult=this.finished?{accuracy:this.store.daily.bestAccuracy,passed:!0,gameOver:!0}:null}startEndless(){this.mode="endless",this.finished=!1,this.level=1,this.lives=O,this.score=0,this.guess={r:128,g:128,b:128},this.nextEndlessTarget()}nextEndlessTarget(){this.target=D()}setDifficulty(e){this.difficulty=e}setGuess(e){this.guess={...this.guess,...e}}submit(){const e=Math.round(nt(this.guess,this.target)*10)/10,s=e>=this.threshold;let a;return this.mode==="daily"?a=this.commitDaily(e):a=this.commitEndless(e,s),this.lastResult=a,a}commitDaily(e){const s=g(),a=this.store.daily;a.day!==s&&(a.day=s,a.bestAccuracy=0,a.done=!1),a.bestAccuracy=Math.max(a.bestAccuracy,e),a.done=!0;const r=a.lastPlayed===lt(),i=a.lastPlayed===s;let c=!1;return i||(a.streak=r?a.streak+1:1,a.lastPlayed=s,a.maxStreak=Math.max(a.maxStreak,a.streak),c=!0),L(this.store),this.finished=!0,{accuracy:e,passed:!0,gameOver:!0,gainedStreak:c}}commitEndless(e,s){return s?(this.score+=Math.round(e)+this.level*5,this.level+=1,this.nextEndlessTarget(),this.guess={r:128,g:128,b:128},{accuracy:e,passed:!0,gameOver:!1}):(this.lives-=1,this.lives<=0?(this.finished=!0,this.score>this.store.endlessBest&&(this.store.endlessBest=this.score,L(this.store)),{accuracy:e,passed:!1,gameOver:!0}):(this.nextEndlessTarget(),this.guess={r:128,g:128,b:128},{accuracy:e,passed:!1,gameOver:!1}))}}async function G(t){try{return await navigator.clipboard.writeText(t),!0}catch{try{const e=document.createElement("textarea");e.value=t,e.style.position="fixed",e.style.opacity="0",document.body.appendChild(e),e.select();const s=document.execCommand("copy");return document.body.removeChild(e),s}catch{return!1}}}function ht(t){const e=Math.round(t/100*5),s=[];for(let a=0;a<5;a++)a<e?s.push(t>=97?"🟩":t>=90?"🟨":"🟧"):s.push("⬛");return s.join("")}function yt(t,e){return[`Chromatic ${g()}`,`Match ${t.toFixed(1)}%  ${ht(t)}`,`Streak ${e} 🔥`,"","Can you match the colour?"].join(`
`)}function ft(t,e,s){return["Chromatic · Endless",`Score ${t} · reached level ${e}`,`Best ${s} 🏆`,"","How many can you match?"].join(`
`)}let m=null,A=!1;function pt(){if(A)return null;try{return m=m??new(window.AudioContext||window.webkitAudioContext),m.state==="suspended"&&m.resume(),m}catch{return null}}function j(t){A=t}function Y(){return A}function u(t,e=.14,s={}){const a=pt();if(!a)return;const{type:r="sine",vol:i=.22,attack:c=.01}=s,f=a.createOscillator(),b=a.createGain();f.type=r,f.frequency.value=t;const p=a.currentTime;b.gain.setValueAtTime(1e-4,p),b.gain.exponentialRampToValueAtTime(i,p+c),b.gain.exponentialRampToValueAtTime(1e-4,p+e),f.connect(b).connect(a.destination),f.start(p),f.stop(p+e+.02)}function mt(){u(300,.03,{type:"square",vol:.03})}function vt(t){const e=Math.round(t/100*24),s=261.63;u(s*Math.pow(2,e/12),.3,{type:"triangle",vol:.22}),u(s*Math.pow(2,(e+4)/12),.26,{type:"sine",vol:.1})}function gt(){[523.25,659.25,783.99].forEach((t,e)=>setTimeout(()=>u(t,.16,{type:"triangle",vol:.2}),e*70))}function bt(){u(150,.24,{type:"sawtooth",vol:.18}),u(110,.28,{type:"square",vol:.1})}function St(){[440,349.23,261.63,174.61].forEach((t,e)=>setTimeout(()=>u(t,.24,{type:"sine",vol:.2}),e*120))}const n=new ut;j(n.store.muted);const xt={r:"Red",g:"Green",b:"Blue"},o=document.querySelector("#app");o.innerHTML=`
  <div class="topbar">
    <a class="back" href="../../index.html">← Arcade</a>
    <h1 class="title">🌈 Chromatic</h1>
    <button class="icon-btn" id="mute" title="Toggle sound"></button>
  </div>

  <div class="controls">
    <div class="tabs" id="tabs">
      <button class="tab active" data-mode="daily">Daily</button>
      <button class="tab" data-mode="endless">Endless</button>
    </div>
    <div class="diff disabled" id="diff">
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
        <input type="range" min="0" max="255" value="128" id="s-${t}" aria-label="${xt[t]}" />
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
`;const U=o.querySelector("#tabs"),q=o.querySelector("#diff"),H=o.querySelector("#hud"),B=o.querySelector("#targetSwatch"),N=o.querySelector("#youSwatch"),E=o.querySelector("#youHex"),K=o.querySelector("#submit"),R=o.querySelector("#hint"),y=o.querySelector("#overlay");et(y);const h=o.querySelector("#modal"),$=o.querySelector("#toast"),V=o.querySelector("#mute"),C={r:o.querySelector("#s-r"),g:o.querySelector("#s-g"),b:o.querySelector("#s-b")},wt={r:o.querySelector("#v-r"),g:o.querySelector("#v-g"),b:o.querySelector("#v-b")};function x(t){$.textContent=t,$.classList.add("show"),window.setTimeout(()=>$.classList.remove("show"),1600)}function _(){V.textContent=Y()?"🔇":"🔊"}function kt(){if(n.mode==="daily"){const t=n.store.daily;H.innerHTML=`
      <div class="pill"><span class="k">Streak</span><span class="v">${t.streak} 🔥</span></div>
      <div class="pill"><span class="k">Best day</span><span class="v">${t.maxStreak}</span></div>
      <div class="pill"><span class="k">Today</span><span class="v">${t.done?t.bestAccuracy.toFixed(0)+"%":"—"}</span></div>
    `}else H.innerHTML=`
      <div class="pill"><span class="k">Level</span><span class="v">${n.level}</span></div>
      <div class="pill"><span class="k">Score</span><span class="v">${n.score}</span></div>
      <div class="pill"><span class="k">Lives</span><span class="v hearts">${"❤️".repeat(n.lives)}${"🖤".repeat(Math.max(0,3-n.lives))}</span></div>
      <div class="pill"><span class="k">Best</span><span class="v">${n.store.endlessBest}</span></div>
    `}function Et(){B.style.background=S(n.target);const t=B.querySelector(".caption");t.style.color=T(n.target)}function J(){const t=n.guess;N.style.background=S(t);const e=N.querySelector(".caption");e.style.color=T(t),e.style.background="transparent",E.textContent=M(t),E.style.color=T(t),E.style.background="transparent",["r","g","b"].forEach(s=>{C[s].value=String(t[s]),wt[s].textContent=String(t[s])})}function z(){U.querySelectorAll(".tab").forEach(t=>{t.classList.toggle("active",t.dataset.mode===n.mode)}),q.classList.toggle("disabled",n.mode==="daily"),q.querySelectorAll(".diff-btn").forEach(t=>{t.classList.toggle("active",t.dataset.diff===n.difficulty)})}function W(){n.mode==="daily"?R.textContent=n.finished?"You already played today. Come back tomorrow, or try Endless!":"Match today’s colour as closely as you can — you get one shot. (Difficulty applies to Endless.)":R.textContent=`Reach ${n.threshold}% to clear the round. Miss and you lose a life.`}function d(){z(),kt(),Et(),J(),W(),K.disabled=n.finished}function w(){y.classList.remove("show")}function $t(t){const e=n.store.daily;h.innerHTML=`
    <h2>${t>=97?"Incredible! 🎯":t>=90?"So close! 🌈":"Nice try!"}</h2>
    <div class="ring" style="--p:${t}"><span>${t.toFixed(0)}%</span></div>
    <div class="reveal">
      <div>
        <div class="box" style="background:${S(n.target)}"></div>
        <div class="lab">Target ${M(n.target)}</div>
      </div>
      <div>
        <div class="box" style="background:${S(n.guess)}"></div>
        <div class="lab">You ${M(n.guess)}</div>
      </div>
    </div>
    <p class="hint" style="margin:0">Streak ${e.streak} 🔥 · Best streak ${e.maxStreak}</p>
    <div class="row">
      <button class="btn ghost" id="m-share">Share</button>
      <button class="btn" id="m-endless">Play Endless</button>
    </div>
  `,y.classList.add("show"),h.querySelector("#m-share").onclick=async()=>{const s=await G(yt(t,e.streak));x(s?"Result copied to clipboard!":"Could not copy")},h.querySelector("#m-endless").onclick=()=>{w(),Q("endless")}}function Mt(){const t=n.store.endlessBest;h.innerHTML=`
    <h2>Game Over</h2>
    <div class="ring" style="--p:100"><span>${n.score}</span></div>
    <p class="hint" style="margin:0">Reached level ${n.level} · Best ${t} 🏆</p>
    <div class="row">
      <button class="btn ghost" id="m-share">Share</button>
      <button class="btn" id="m-retry">Play again</button>
    </div>
  `,y.classList.add("show"),h.querySelector("#m-share").onclick=async()=>{const e=await G(ft(n.score,n.level,t));x(e?"Result copied to clipboard!":"Could not copy")},h.querySelector("#m-retry").onclick=()=>{w(),n.startEndless(),d()}}let F=0;["r","g","b"].forEach(t=>{C[t].addEventListener("input",()=>{n.setGuess({[t]:Number(C[t].value)});const e=performance.now();e-F>45&&(mt(),F=e),J()})});function X(){if(n.finished)return;const t=n.submit();if(n.mode==="daily"){d(),vt(t.accuracy),window.setTimeout(()=>$t(t.accuracy),350);return}t.gameOver?(St(),d(),window.setTimeout(Mt,300)):t.passed?(gt(),x(`✅ ${t.accuracy.toFixed(0)}% — level ${n.level}!`),d()):(bt(),x(`❌ ${t.accuracy.toFixed(0)}% — needed ${n.threshold}%`),d())}K.addEventListener("click",X);document.addEventListener("keydown",t=>{t.key==="Enter"&&!n.finished&&X()});U.querySelectorAll(".tab").forEach(t=>{t.addEventListener("click",()=>Q(t.dataset.mode))});q.querySelectorAll(".diff-btn").forEach(t=>{t.addEventListener("click",()=>{n.setDifficulty(t.dataset.diff),z(),W()})});function Q(t){w(),t==="daily"?n.startDaily():n.startEndless(),d()}y.addEventListener("click",t=>{t.target===y&&w()});V.addEventListener("click",()=>{const t=!Y();j(t),n.store.muted=t,L(n.store),_()});_();d();
