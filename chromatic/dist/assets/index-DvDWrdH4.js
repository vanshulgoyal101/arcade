var Z=Object.defineProperty;var tt=(t,e,s)=>e in t?Z(t,e,{enumerable:!0,configurable:!0,writable:!0,value:s}):t[e]=s;var l=(t,e,s)=>tt(t,typeof e!="symbol"?e+"":e,s);(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))n(r);new MutationObserver(r=>{for(const i of r)if(i.type==="childList")for(const c of i.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&n(c)}).observe(document,{childList:!0,subtree:!0});function s(r){const i={};return r.integrity&&(i.integrity=r.integrity),r.referrerPolicy&&(i.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?i.credentials="include":r.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function n(r){if(r.ep)return;r.ep=!0;const i=s(r);fetch(r.href,i)}})();const et=Math.sqrt(765*255);function m(t){return Math.max(0,Math.min(255,Math.round(t)))}function st(t,e){const s=t.r-e.r,n=t.g-e.g,r=t.b-e.b;return Math.sqrt(s*s+n*n+r*r)}function at(t,e){return Math.max(0,100-st(t,e)/et*100)}function M(t){return"#"+[t.r,t.g,t.b].map(e=>m(e).toString(16).padStart(2,"0")).join("").toUpperCase()}function S(t){return`rgb(${m(t.r)}, ${m(t.g)}, ${m(t.b)})`}function T(t){return(.299*t.r+.587*t.g+.114*t.b)/255>.55?"#10131c":"#ffffff"}function nt(t){let e=2166136261;for(let s=0;s<t.length;s++)e^=t.charCodeAt(s),e=Math.imul(e,16777619);return e>>>0}function rt(t){let e=t;return function(){e|=0,e=e+1831565813|0;let s=Math.imul(e^e>>>15,1|e);return s=s+Math.imul(s^s>>>7,61|s)^s,((s^s>>>14)>>>0)/4294967296}}function P(t){const e=()=>Math.floor(t()*256);let s={r:e(),g:e(),b:e()};if(Math.max(s.r,s.g,s.b)-Math.min(s.r,s.g,s.b)<40){const r=["r","g","b"][Math.floor(t()*3)];s={...s,[r]:m(s[r]+(t()<.5?90:-90))}}return s}function ot(t){return P(rt(nt(t)))}function D(){return P(Math.random)}function v(t=new Date){const e=t.getFullYear(),s=String(t.getMonth()+1).padStart(2,"0"),n=String(t.getDate()).padStart(2,"0");return`${e}-${s}-${n}`}function it(t=new Date){const e=new Date(t);return e.setDate(e.getDate()-1),v(e)}const I="chromatic.v2",x={daily:{day:"",bestAccuracy:0,done:!1,streak:0,lastPlayed:"",maxStreak:0},endlessBest:0,muted:!1};function lt(){try{const t=localStorage.getItem(I);if(!t)return structuredClone(x);const e=JSON.parse(t);return{daily:{...x.daily,...e.daily},endlessBest:e.endlessBest??0,muted:e.muted??!1}}catch{return structuredClone(x)}}function q(t){try{localStorage.setItem(I,JSON.stringify(t))}catch{}}const ct={easy:{label:"Easy",threshold:90},normal:{label:"Normal",threshold:94},hard:{label:"Hard",threshold:97}},O=3;class dt{constructor(){l(this,"mode","daily");l(this,"difficulty","normal");l(this,"target");l(this,"guess",{r:128,g:128,b:128});l(this,"level",1);l(this,"lives",O);l(this,"score",0);l(this,"finished",!1);l(this,"lastResult",null);l(this,"store");this.store=lt(),this.target=D(),this.startDaily()}get threshold(){return ct[this.difficulty].threshold}get dailyAlreadyDone(){return this.store.daily.day===v()&&this.store.daily.done}startDaily(){this.mode="daily",this.finished=this.dailyAlreadyDone,this.target=ot("chromatic-"+v()),this.guess={r:128,g:128,b:128},this.lastResult=this.finished?{accuracy:this.store.daily.bestAccuracy,passed:!0,gameOver:!0}:null}startEndless(){this.mode="endless",this.finished=!1,this.level=1,this.lives=O,this.score=0,this.guess={r:128,g:128,b:128},this.nextEndlessTarget()}nextEndlessTarget(){this.target=D()}setDifficulty(e){this.difficulty=e}setGuess(e){this.guess={...this.guess,...e}}submit(){const e=Math.round(at(this.guess,this.target)*10)/10,s=e>=this.threshold;let n;return this.mode==="daily"?n=this.commitDaily(e):n=this.commitEndless(e,s),this.lastResult=n,n}commitDaily(e){const s=v(),n=this.store.daily;n.day!==s&&(n.day=s,n.bestAccuracy=0,n.done=!1),n.bestAccuracy=Math.max(n.bestAccuracy,e),n.done=!0;const r=n.lastPlayed===it(),i=n.lastPlayed===s;let c=!1;return i||(n.streak=r?n.streak+1:1,n.lastPlayed=s,n.maxStreak=Math.max(n.maxStreak,n.streak),c=!0),q(this.store),this.finished=!0,{accuracy:e,passed:!0,gameOver:!0,gainedStreak:c}}commitEndless(e,s){return s?(this.score+=Math.round(e)+this.level*5,this.level+=1,this.nextEndlessTarget(),this.guess={r:128,g:128,b:128},{accuracy:e,passed:!0,gameOver:!1}):(this.lives-=1,this.lives<=0?(this.finished=!0,this.score>this.store.endlessBest&&(this.store.endlessBest=this.score,q(this.store)),{accuracy:e,passed:!1,gameOver:!0}):(this.nextEndlessTarget(),this.guess={r:128,g:128,b:128},{accuracy:e,passed:!1,gameOver:!1}))}}async function G(t){try{return await navigator.clipboard.writeText(t),!0}catch{try{const e=document.createElement("textarea");e.value=t,e.style.position="fixed",e.style.opacity="0",document.body.appendChild(e),e.select();const s=document.execCommand("copy");return document.body.removeChild(e),s}catch{return!1}}}function ut(t){const e=Math.round(t/100*5),s=[];for(let n=0;n<5;n++)n<e?s.push(t>=97?"🟩":t>=90?"🟨":"🟧"):s.push("⬛");return s.join("")}function yt(t,e){return[`Chromatic ${v()}`,`Match ${t.toFixed(1)}%  ${ut(t)}`,`Streak ${e} 🔥`,"","Can you match the colour?"].join(`
`)}function ht(t,e,s){return["Chromatic · Endless",`Score ${t} · reached level ${e}`,`Best ${s} 🏆`,"","How many can you match?"].join(`
`)}let p=null,A=!1;function ft(){if(A)return null;try{return p=p??new(window.AudioContext||window.webkitAudioContext),p.state==="suspended"&&p.resume(),p}catch{return null}}function Y(t){A=t}function j(){return A}function u(t,e=.14,s={}){const n=ft();if(!n)return;const{type:r="sine",vol:i=.22,attack:c=.01}=s,h=n.createOscillator(),b=n.createGain();h.type=r,h.frequency.value=t;const f=n.currentTime;b.gain.setValueAtTime(1e-4,f),b.gain.exponentialRampToValueAtTime(i,f+c),b.gain.exponentialRampToValueAtTime(1e-4,f+e),h.connect(b).connect(n.destination),h.start(f),h.stop(f+e+.02)}function pt(){u(300,.03,{type:"square",vol:.03})}function mt(t){const e=Math.round(t/100*24),s=261.63;u(s*Math.pow(2,e/12),.3,{type:"triangle",vol:.22}),u(s*Math.pow(2,(e+4)/12),.26,{type:"sine",vol:.1})}function vt(){[523.25,659.25,783.99].forEach((t,e)=>setTimeout(()=>u(t,.16,{type:"triangle",vol:.2}),e*70))}function gt(){u(150,.24,{type:"sawtooth",vol:.18}),u(110,.28,{type:"square",vol:.1})}function bt(){[440,349.23,261.63,174.61].forEach((t,e)=>setTimeout(()=>u(t,.24,{type:"sine",vol:.2}),e*120))}const a=new dt;Y(a.store.muted);const St={r:"Red",g:"Green",b:"Blue"},o=document.querySelector("#app");o.innerHTML=`
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
        <input type="range" min="0" max="255" value="128" id="s-${t}" aria-label="${St[t]}" />
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
`;const U=o.querySelector("#tabs"),L=o.querySelector("#diff"),B=o.querySelector("#hud"),H=o.querySelector("#targetSwatch"),N=o.querySelector("#youSwatch"),$=o.querySelector("#youHex"),K=o.querySelector("#submit"),F=o.querySelector("#hint"),g=o.querySelector("#overlay"),y=o.querySelector("#modal"),E=o.querySelector("#toast"),V=o.querySelector("#mute"),C={r:o.querySelector("#s-r"),g:o.querySelector("#s-g"),b:o.querySelector("#s-b")},wt={r:o.querySelector("#v-r"),g:o.querySelector("#v-g"),b:o.querySelector("#v-b")};function w(t){E.textContent=t,E.classList.add("show"),window.setTimeout(()=>E.classList.remove("show"),1600)}function _(){V.textContent=j()?"🔇":"🔊"}function kt(){if(a.mode==="daily"){const t=a.store.daily;B.innerHTML=`
      <div class="pill"><span class="k">Streak</span><span class="v">${t.streak} 🔥</span></div>
      <div class="pill"><span class="k">Best day</span><span class="v">${t.maxStreak}</span></div>
      <div class="pill"><span class="k">Today</span><span class="v">${t.done?t.bestAccuracy.toFixed(0)+"%":"—"}</span></div>
    `}else B.innerHTML=`
      <div class="pill"><span class="k">Level</span><span class="v">${a.level}</span></div>
      <div class="pill"><span class="k">Score</span><span class="v">${a.score}</span></div>
      <div class="pill"><span class="k">Lives</span><span class="v hearts">${"❤️".repeat(a.lives)}${"🖤".repeat(Math.max(0,3-a.lives))}</span></div>
      <div class="pill"><span class="k">Best</span><span class="v">${a.store.endlessBest}</span></div>
    `}function xt(){H.style.background=S(a.target);const t=H.querySelector(".caption");t.style.color=T(a.target)}function J(){const t=a.guess;N.style.background=S(t);const e=N.querySelector(".caption");e.style.color=T(t),e.style.background="transparent",$.textContent=M(t),$.style.color=T(t),$.style.background="transparent",["r","g","b"].forEach(s=>{C[s].value=String(t[s]),wt[s].textContent=String(t[s])})}function X(){U.querySelectorAll(".tab").forEach(t=>{t.classList.toggle("active",t.dataset.mode===a.mode)}),L.classList.toggle("disabled",a.mode==="daily"),L.querySelectorAll(".diff-btn").forEach(t=>{t.classList.toggle("active",t.dataset.diff===a.difficulty)})}function z(){a.mode==="daily"?F.textContent=a.finished?"You already played today. Come back tomorrow, or try Endless!":"Match today’s colour as closely as you can — you get one shot. (Difficulty applies to Endless.)":F.textContent=`Reach ${a.threshold}% to clear the round. Miss and you lose a life.`}function d(){X(),kt(),xt(),J(),z(),K.disabled=a.finished}function k(){g.classList.remove("show")}function $t(t){const e=a.store.daily;y.innerHTML=`
    <h2>${t>=97?"Incredible! 🎯":t>=90?"So close! 🌈":"Nice try!"}</h2>
    <div class="ring" style="--p:${t}"><span>${t.toFixed(0)}%</span></div>
    <div class="reveal">
      <div>
        <div class="box" style="background:${S(a.target)}"></div>
        <div class="lab">Target ${M(a.target)}</div>
      </div>
      <div>
        <div class="box" style="background:${S(a.guess)}"></div>
        <div class="lab">You ${M(a.guess)}</div>
      </div>
    </div>
    <p class="hint" style="margin:0">Streak ${e.streak} 🔥 · Best streak ${e.maxStreak}</p>
    <div class="row">
      <button class="btn ghost" id="m-share">Share</button>
      <button class="btn" id="m-endless">Play Endless</button>
    </div>
  `,g.classList.add("show"),y.querySelector("#m-share").onclick=async()=>{const s=await G(yt(t,e.streak));w(s?"Result copied to clipboard!":"Could not copy")},y.querySelector("#m-endless").onclick=()=>{k(),W("endless")}}function Et(){const t=a.store.endlessBest;y.innerHTML=`
    <h2>Game Over</h2>
    <div class="ring" style="--p:100"><span>${a.score}</span></div>
    <p class="hint" style="margin:0">Reached level ${a.level} · Best ${t} 🏆</p>
    <div class="row">
      <button class="btn ghost" id="m-share">Share</button>
      <button class="btn" id="m-retry">Play again</button>
    </div>
  `,g.classList.add("show"),y.querySelector("#m-share").onclick=async()=>{const e=await G(ht(a.score,a.level,t));w(e?"Result copied to clipboard!":"Could not copy")},y.querySelector("#m-retry").onclick=()=>{k(),a.startEndless(),d()}}let R=0;["r","g","b"].forEach(t=>{C[t].addEventListener("input",()=>{a.setGuess({[t]:Number(C[t].value)});const e=performance.now();e-R>45&&(pt(),R=e),J()})});function Q(){if(a.finished)return;const t=a.submit();if(a.mode==="daily"){d(),mt(t.accuracy),window.setTimeout(()=>$t(t.accuracy),350);return}t.gameOver?(bt(),d(),window.setTimeout(Et,300)):t.passed?(vt(),w(`✅ ${t.accuracy.toFixed(0)}% — level ${a.level}!`),d()):(gt(),w(`❌ ${t.accuracy.toFixed(0)}% — needed ${a.threshold}%`),d())}K.addEventListener("click",Q);document.addEventListener("keydown",t=>{t.key==="Enter"&&!a.finished&&Q()});U.querySelectorAll(".tab").forEach(t=>{t.addEventListener("click",()=>W(t.dataset.mode))});L.querySelectorAll(".diff-btn").forEach(t=>{t.addEventListener("click",()=>{a.setDifficulty(t.dataset.diff),X(),z()})});function W(t){k(),t==="daily"?a.startDaily():a.startEndless(),d()}g.addEventListener("click",t=>{t.target===g&&k()});V.addEventListener("click",()=>{const t=!j();Y(t),a.store.muted=t,q(a.store),_()});_();d();
