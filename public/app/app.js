/* QuantSync Lab — shared shell, icons, charts, motion. Demo data only. */
(function(){
const d=document, RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
d.documentElement.classList.add('js');

/* ---------- icons (24px stroke) ---------- */
const P={
 today:'<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
 matches:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><path d="M12 12 19 5"/>',
 strategies:'<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
 scanner:'<path d="M4 6h10M4 12h6M4 18h9"/><circle cx="17" cy="15" r="3.5"/><path d="m19.6 17.6 2.4 2.4"/><path d="M17 3v3M20 6h-3"/>',
 patterns:'<path d="M5 3v18M5 7h0M10 6v12M15 9v9M20 4v10"/><rect x="3.5" y="8" width="3" height="6" rx=".6"/><rect x="8.5" y="9" width="3" height="5" rx=".6"/><rect x="13.5" y="11" width="3" height="4" rx=".6"/><rect x="18.5" y="6" width="3" height="5" rx=".6"/>',
 xray:'<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 14l3-3 3 2 4-5"/>',
 portfolio:'<rect x="3" y="6" width="18" height="14" rx="2.5"/><path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6M3 12h18"/>',
 bell:'<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10.3 20a1.9 1.9 0 0 0 3.4 0"/>',
 spark:'<path d="M12 3c.6 3.9 2.1 5.4 6 6-3.9.6-5.4 2.1-6 6-.6-3.9-2.1-5.4-6-6 3.9-.6 5.4-2.1 6-6z" fill="currentColor" stroke="none"/><path d="M19 15c.3 1.7.9 2.3 2.5 2.5-1.6.3-2.2.9-2.5 2.5-.3-1.6-.9-2.2-2.5-2.5 1.6-.2 2.2-.8 2.5-2.5z" fill="currentColor" stroke="none"/>',
 play:'<path d="M7 4.5v15l12-7.5z" fill="currentColor"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
 back:'<path d="M15 5 8 12l7 7"/>',
 chev:'<path d="m9 5 7 7-7 7"/>',
 check:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
 copy:'<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
 moon:'<path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z"/>',
 more:'<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>',
 flask:'<path d="M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3"/><path d="M7 15h10"/>',
 x:'<path d="M6 6l12 12M18 6 6 18"/>',
 shield:'<path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
 warn:'<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 trend:'<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
 save:'<path d="M5 3h11l3 3v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M7 3v5h8V3M7 21v-7h10v7"/>',
 undo:'<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
 arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
 filter:'<path d="M3 5h18l-7 8.5V20l-4-2v-4.5z"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
 lock:'<rect x="4" y="10" width="16" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
 trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
 edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/>'
};
const icon=(n,s=20,w=1.9)=>`<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]||''}</svg>`;
const LOGO='<svg class="mk" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="var(--brand)"/><path d="M7 20.5 12.5 15l4 3.5L25 10" fill="none" stroke="var(--brand-ink)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="25" cy="10" r="2.6" fill="var(--ai-fill)"/></svg>';

/* ---------- theme ---------- */
const root=d.documentElement;
try{const t=localStorage.getItem('qs-theme'); if(t) root.dataset.theme=t;}catch(e){}
function isDark(){return root.dataset.theme?root.dataset.theme==='dark':matchMedia('(prefers-color-scheme: dark)').matches}
function toggleTheme(){const n=isDark()?'light':'dark'; root.dataset.theme=n; try{localStorage.setItem('qs-theme',n)}catch(e){} d.querySelectorAll('[data-theme-btn]').forEach(b=>b.setAttribute('aria-checked',isDark()));
  d.dispatchEvent(new Event('qs-theme'));}

/* ---------- shell: a website, not a dashboard ----------
   Four places: Home · QuantSync AI · X-Ray · Build. Everything else lives in the footer and the account sheet. */
const NAV=[['home','Home','index.html','today'],['ai','QuantSync AI','ai.html','spark'],['xray','X-Ray','xray.html','xray'],['build','Build','scanner.html','scanner']];
const GROUP={index:'home',today:'home',ai:'ai',xray:'xray',scanner:'build',strategies:'build',strategy:'build',matches:'build'};
const BUILD=[['scanner','New scan','scanner.html'],['strategies','Strategies','strategies.html'],['matches','My watchlist','matches.html']];
const SW=()=>`<button class="tsw" type="button" role="switch" data-theme-btn aria-checked="${isDark()}" aria-label="Night mode"><span class="k">${icon('sun',14)}${icon('moon',14)}</span></button>`;
function shell(){
  const page=d.body.dataset.page; if(!page) return;
  const cur=GROUP[page]||'';
  d.body.classList.add('site');
  const top=d.createElement('header'); top.className='nav';
  top.innerHTML=`<div class="nav-in"><a class="brand" href="index.html" aria-label="QuantSync AI home">${LOGO}<span>QuantSync</span><em>AI</em></a>
    <nav class="links" aria-label="Main">${NAV.slice(1).map(([id,l,h])=>`<a href="${h}" ${cur===id?'aria-current="page"':''}>${l}</a>`).join('')}</nav>
    <span class="sp"></span>${SW()}<span class="acct" id="qs-acct"></span></div>`;
  const tb=d.createElement('nav'); tb.className='tabbar'; tb.setAttribute('aria-label','Main');
  tb.innerHTML=NAV.map(([id,l,h,ic])=>`<a href="${h}" ${cur===id?'aria-current="page"':''}>${icon(ic,21)}<span>${id==='ai'?'AI list':l}</span></a>`).join('')+`<button data-more ${!cur?'aria-current="page"':''}>${icon('user',21)}<span>Me</span></button>`;
  d.body.prepend(top); d.body.append(tb);
  const main=d.querySelector('.main');
  if(main&&cur==='build'){const sub=d.createElement('div');sub.className='bnav';sub.innerHTML=`<span>${icon('flask',15)}Build your own</span>`+BUILD.map(([id,l,h])=>`<a href="${h}" ${page===id||(page==='strategy'&&id==='strategies')?'aria-current="page"':''}>${l}</a>`).join('');main.prepend(sub)}
  if(main){const f=d.createElement('footer');f.className='sfoot';f.innerHTML=`<div class="sf-in"><a class="brand" href="index.html">${LOGO}<span>QuantSync</span><em>AI</em></a>
    <div class="sf-links"><a href="ai.html">QuantSync AI</a><a href="ai.html#record">Track record</a><a href="xray.html">Stock X-Ray</a><a href="patterns.html">Chart patterns</a><a href="portfolio.html">Portfolio</a><a href="strategies.html">Community strategies</a><a href="scanner.html">Build a scanner</a></div>
    <p>QuantSync is a research platform for Indian equities. Lists show stocks that met a strategy’s rules after the market closed. Nothing here is investment advice or a recommendation to buy or sell, and QuantSync is not a SEBI-registered investment adviser. Past results do not predict future results.</p></div>`;main.after(f)}
  // account sheet (phone "Me", and the avatar on desktop)
  const scr=d.createElement('div'); scr.className='scrim';
  const sh=d.createElement('div'); sh.className='sheet'; sh.setAttribute('role','dialog'); sh.setAttribute('aria-label','Account and more');
  sh.innerHTML=`<div class="grab"></div><div id="qs-user" class="user"></div><div class="list" style="margin-top:12px"><a href="matches.html">${icon('matches')}My watchlist</a><a href="strategies.html">${icon('strategies')}Strategies</a><a href="patterns.html">${icon('patterns')}Chart patterns</a><a href="portfolio.html">${icon('portfolio')}Portfolio</a></div>
    <div class="trow" style="display:flex;justify-content:space-between;align-items:center;padding:16px 4px 0;font-weight:600">Night mode ${SW()}</div>`;
  d.body.append(scr,sh);
  const open=()=>{scr.classList.add('on');sh.classList.add('on')},close=()=>{scr.classList.remove('on');sh.classList.remove('on')};
  tb.querySelector('[data-more]').onclick=open; scr.onclick=close; d.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  top.addEventListener('click',e=>{if(e.target.closest('[data-acct]'))open()});
  addEventListener('scroll',()=>top.classList.toggle('on',scrollY>8),{passive:true});
  userWidget();
}
function userWidget(){
  const QD=window.QD;if(!QD)return;
  const box=d.getElementById('qs-user'),acct=d.getElementById('qs-acct');
  const render=u=>{
    if(!u){
      if(acct){acct.innerHTML=`<button class="btn sm primary">Sign in</button>`;acct.firstChild.onclick=()=>QD.auth.signIn().catch(e=>toast(e.message))}
      if(box){box.innerHTML=`<span class="av" style="background:var(--sunk);color:var(--ink2)">${icon('user',16)}</span><div style="flex:1;min-width:0"><b>Not signed in</b><span>Save strategies and get alerts</span></div><button class="btn sm primary" id="qs-in">Sign in</button>`;d.getElementById('qs-in').onclick=()=>QD.auth.signIn().catch(e=>toast(e.message))}
      return}
    const nm=u.displayName||u.email||'You',ini=nm.split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase();
    const av=`<span class="av">${u.photoURL?`<img src="${u.photoURL}" alt="" style="width:100%;height:100%;border-radius:50%" referrerpolicy="no-referrer">`:QD.fmt.esc(ini)}</span>`;
    if(acct)acct.innerHTML=`<button class="avbtn" data-acct aria-label="Account">${av}</button>`;
    if(box){box.innerHTML=`${av}<div style="flex:1;min-width:0"><b style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${QD.fmt.esc(nm)}</b><span>Signed in</span></div><button class="btn sm" id="qs-out">Sign out</button>`;d.getElementById('qs-out').onclick=()=>QD.auth.signOut().then(()=>location.reload())}
  };
  QD.auth.onChange(render);QD.auth.init();
}
/* page states: loading skeleton, empty invitation, error with retry */
function state(el,kind,o={}){
  if(!el)return;
  if(kind==='loading'){el.innerHTML=`<div class="${o.flat?'':'rows'}" aria-busy="true">${Array.from({length:o.n||3},()=>`<div class="row"><div class="skel" style="width:38px;height:38px"></div><div class="grow" style="display:grid;gap:7px"><div class="skel" style="height:12px;width:42%"></div><div class="skel" style="height:10px;width:68%"></div></div></div>`).join('')}</div>`;return}
  const ic=kind==='error'?'warn':(o.icon||'info');
  el.innerHTML=`<div class="rows"><div style="padding:30px 22px;text-align:center;display:grid;gap:8px;justify-items:center"><span class="${kind==='error'?'dn':'mute'}">${icon(ic,26)}</span><b>${o.title||(kind==='error'?'This did not load':'Nothing here yet')}</b>${o.body?`<span class="small" style="max-width:52ch">${o.body}</span>`:''}${o.action?`<span data-act></span>`:''}</div></div>`;
  if(o.action){const b=d.createElement(o.href?'a':'button');b.className='btn sm '+(o.primary?'primary':'');b.textContent=o.action;if(o.href)b.href=o.href;else b.onclick=o.onAction;el.querySelector('[data-act]').replaceWith(b)}
}

/* ---------- utils ---------- */
function rng(seed){let s=seed>>>0||1;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return((s>>>0)%100000)/100000}}
function walk(n,seed,drift=.08,vol=1.2,start=100){const r=rng(seed);const o=[start];for(let i=1;i<n;i++){const g=(r()+r()+r()-1.5)*vol+drift;o.push(Math.max(1,o[i-1]*(1+g/100)))}return o}
const fmt={
  inr:v=>'₹'+v.toLocaleString('en-IN',{maximumFractionDigits:v<100?2:0}),
  pct:(v,dp=1)=>(v>0?'+':v<0?'−':'')+Math.abs(v).toFixed(dp)+'%',
  int:v=>Math.round(v).toLocaleString('en-IN')
};
function toast(msg){let t=d.querySelector('.toast');if(!t){t=d.createElement('div');t.className='toast';t.setAttribute('role','status');d.body.append(t)}t.textContent=msg;t.classList.add('on');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('on'),2600)}
function count(el,to,{dur=1200,dp=0,pre='',suf=''}={}){if(RM){el.textContent=pre+to.toFixed(dp)+suf;return}const t0=performance.now();const f=t=>{const k=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-k,3);el.textContent=pre+(to*e).toLocaleString('en-IN',{minimumFractionDigits:dp,maximumFractionDigits:dp})+suf;if(k<1)requestAnimationFrame(f)};requestAnimationFrame(f)}
function counters(scope=d){scope.querySelectorAll('[data-count]').forEach(el=>{const v=parseFloat(el.dataset.count);count(el,v,{dp:+(el.dataset.dp||0),pre:el.dataset.pre||'',suf:el.dataset.suf||''})})}
function bars(scope=d){requestAnimationFrame(()=>scope.querySelectorAll('.bar>i[data-w]').forEach(i=>i.style.width=i.dataset.w+'%'))}

/* ---------- line chart ----------
 series: [{data:[...], color:'var(--brand)', area:true, dash:false, label}] */
function line(el,series,o={}){
  const W=o.w||Math.max(300,el.clientWidth||720),H=Math.round((o.h||260)*(W<520&&!o.w?.82:1)),pl=o.pl??44,pr=o.pr??14,pt=o.pt??14,pb=o.pb??26;
  const all=series.flatMap(s=>s.data).filter(Number.isFinite);if(!all.length){el.innerHTML='';return}let mn=Math.min(...all),mx=Math.max(...all);const pad=(mx-mn)*.08||1;const lo0=mn>=0;mn-=pad;mx+=pad;if(lo0&&mn<0)mn=0;
  const n=Math.max(...series.map(s=>s.data.length));
  const X=i=>pl+(W-pl-pr)*i/Math.max(1,n-1),Y=v=>pt+(H-pt-pb)*(1-(v-mn)/(mx-mn));
  if(o.dates&&!o.xl)o.xl=timeTicks(o.dates,W<520?3:6);
  let g='';
  if(!o.bare){const ticks=4;for(let i=0;i<=ticks;i++){const v=mn+(mx-mn)*i/ticks,y=Y(v);g+=`<line class="gl" x1="${pl}" x2="${W-pr}" y1="${y}" y2="${y}"/><text class="ax" x="${pl-8}" y="${y+4}" text-anchor="end">${o.yfmt?o.yfmt(v):Math.round(v)}</text>`}
    (o.xl||[]).forEach(([i,t])=>{g+=`<text class="ax" x="${X(i)}" y="${H-6}" text-anchor="middle">${t}</text>`})}
  if(o.zero!=null){const y=Y(o.zero);g+=`<line x1="${pl}" x2="${W-pr}" y1="${y}" y2="${y}" stroke="var(--ink3)" stroke-dasharray="3 4" stroke-width="1"/>`}
  const id='g'+Math.random().toString(36).slice(2,8);let defs='';
  series.forEach((s,k)=>{const pts=s.data.map((v,i)=>[X(i),Y(v)]).filter(p=>Number.isFinite(p[1]));if(pts.length<2)return;const dd='M'+pts.map(p=>p[0].toFixed(1)+' '+p[1].toFixed(1)).join('L');
    if(s.area){defs+=`<linearGradient id="${id}${k}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${s.color}" stop-opacity=".22"/><stop offset="1" stop-color="${s.color}" stop-opacity="0"/></linearGradient>`;
      g+=`<path d="${dd}L${pts.at(-1)[0]} ${H-pb}L${pts[0][0]} ${H-pb}Z" fill="url(#${id}${k})" class="area" style="opacity:0;animation:fadeA .8s .6s forwards"/>`}
    g+=`<path class="ln ${RM||o.noanim?'':'draw'}" d="${dd}" stroke="${s.color}" ${s.dash?'stroke-dasharray="5 5"':''} stroke-width="${s.w||2.2}" style="animation-delay:${k*.15}s"/>`;
    if(!s.dash&&!o.nodot){const p=pts.at(-1);g+=`<circle cx="${p[0]}" cy="${p[1]}" r="4.5" fill="${s.color}" stroke="var(--surface)" stroke-width="2.5" style="opacity:0;animation:fadeA .3s ${1.4+k*.15}s forwards"/>`}});
  (o.marks||[]).forEach(m=>{g+=`<circle cx="${X(m.i)}" cy="${Y(series[0].data[m.i])}" r="${m.r||3.5}" fill="${m.c}" stroke="var(--surface)" stroke-width="1.5"/>`});
  el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${o.label||'Chart'}"><defs>${defs}</defs>${g}<line class="hair" x1="0" x2="0" y1="${pt}" y2="${H-pb}" stroke="var(--ink3)" stroke-width="1" opacity="0"/></svg>${o.tip?'<div class="tip"></div>':''}`;
  el.querySelectorAll('.draw').forEach(p=>{const L=p.getTotalLength();p.style.setProperty('--len',L)});
  if(o.tip){const svg=el.querySelector('svg'),tip=el.querySelector('.tip'),hair=el.querySelector('.hair');
    const mv=e=>{const r=svg.getBoundingClientRect();const x=(e.clientX-r.left)/r.width*W;const i=Math.max(0,Math.min(n-1,Math.round((x-pl)/(W-pl-pr)*(n-1))));
      hair.setAttribute('x1',X(i));hair.setAttribute('x2',X(i));hair.setAttribute('opacity',.5);
      tip.innerHTML=o.tip(i);tip.style.left=(X(i)/W*100)+'%';tip.style.top=(Y(series[0].data[i])/H*r.height)+'px';tip.classList.add('on')};
    svg.addEventListener('pointermove',mv);svg.addEventListener('pointerleave',()=>{tip.classList.remove('on');hair.setAttribute('opacity',0)})}
}
const st=d.createElement('style');st.textContent='@keyframes fadeA{to{opacity:1}}';d.head.append(st);
function spark(el,data,color){line(el,[{data,color,w:1.8}],{w:120,h:36,pl:2,pr:4,pt:4,pb:4,bare:true,nodot:true,noanim:true})}

function timeTicks(dates,k){const n=dates.length;if(n<2)return[];const out=[];const span=(new Date(dates[n-1])-new Date(dates[0]))/864e5;const f=span>500?{year:'numeric'}:span>80?{month:'short',year:'2-digit'}:{day:'numeric',month:'short'};let last='';for(let j=0;j<k;j++){const i=Math.round(j*(n-1)/(k-1));const t=new Date(String(dates[i]).slice(0,10)+'T00:00:00').toLocaleDateString('en-IN',f);if(t!==last){out.push([i,t]);last=t}}return out}

/* equity curve from analytics.equity [{d,v}] with optional benchmark [{d,v}] rebased to 100 on the first equity date,
   optional second series (e.g. AI version) and a shaded live region from liveFrom (YYYY-MM-DD) */
function equity(el,eq,o={}){
  if(!eq||eq.length<2){state(el,'empty',{title:'No closed trades yet',body:'The curve appears once trades have closed.'});return}
  const dates=eq.map(p=>p.d),vals=eq.map(p=>p.v);const series=[];
  let bench=null;
  if(o.bench&&o.bench.length>5){const bd=o.bench;let j=0,base=null;bench=dates.map(dt=>{while(j<bd.length-1&&bd[j+1].d<=dt)j++;const v=bd[j].d<=dt?bd[j].v:NaN;if(base==null&&Number.isFinite(v))base=v;return base?v/base*100:NaN});
    series.push({data:bench,color:'var(--ink3)',dash:true,w:1.5})}
  if(o.alt){const ad=o.alt.data;let j=0;const al=dates.map(dt=>{while(j<ad.length-1&&ad[j+1].d<=dt)j++;return ad[j]&&ad[j].d<=dt?ad[j].v:NaN});series.push({data:al,color:o.alt.color||'var(--ai-fill)',w:2})}
  series.push({data:vals,color:o.color||'var(--brand)',area:true});
  const amt=o.amount||100000;
  line(el,series,{h:o.h||270,dates,yfmt:v=>o.rupees===false?(v-100>=0?'+':'')+Math.round(v-100)+'%':'₹'+(v*amt/100/100000).toFixed(1)+'L',label:o.label||'Equity curve',
    tip:i=>`${new Date(dates[i]+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})} · ${o.name||'Strategy'} ${(vals[i]-100>=0?'+':'')}${(vals[i]-100).toFixed(1)}%${bench&&Number.isFinite(bench[i])?` · Nifty ${(bench[i]-100>=0?'+':'')}${(bench[i]-100).toFixed(1)}%`:''}`});
  if(o.liveFrom){const svg=el.querySelector('svg');if(!svg)return;const i0=dates.findIndex(dt=>dt>=o.liveFrom);if(i0<0)return;const vb=svg.viewBox.baseVal,pl=44,pr=14;const x0=pl+(vb.width-pl-pr)*i0/Math.max(1,dates.length-1);
    svg.insertAdjacentHTML('afterbegin',`<rect x="${x0}" y="14" width="${Math.max(2,vb.width-pr-x0)}" height="${vb.height-40}" fill="var(--up)" opacity=".09" rx="4"/><text x="${x0+6}" y="28" font-size="11" font-weight="700" fill="var(--up)">Live</text>`)}
}
/* vertical bars: vals [{v, c, l}] */
function vbars(el,vals,o={}){
  const W=o.w||Math.max(300,el.clientWidth||720),H=o.h||220,pl=o.pl??36,pr=6,pt=12,pb=26;const mx=Math.max(...vals.map(v=>Math.abs(v.v)),1)*(o.head||1.1);const mn=o.neg?-mx:0;
  const bw=(W-pl-pr)/vals.length;const Y=v=>pt+(H-pt-pb)*(1-(v-mn)/(mx-mn));let g='';
  if(!o.bare)for(let i=0;i<=4;i++){const v=mn+(mx-mn)*i/4,y=Y(v);g+=`<line class="gl" x1="${pl}" x2="${W-pr}" y1="${y}" y2="${y}"/><text class="ax" x="${pl-6}" y="${y+4}" text-anchor="end">${o.yfmt?o.yfmt(v):Math.round(v)}</text>`}
  vals.forEach((b,i)=>{const x=pl+bw*i+bw*(1-(o.gap||.62))/2,w=bw*(o.gap||.62),y0=Y(0),y1=Y(b.v);const y=Math.min(y0,y1),h=Math.max(1,Math.abs(y1-y0));
    g+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(4,w/3)}" fill="${b.c||'var(--brand)'}" style="transform-origin:${x+w/2}px ${y0}px;transform:scaleY(${RM?1:0});animation:grow .8s ${i*25}ms var(--ease) forwards"><title>${b.t||b.v}</title></rect>`;
    if(b.l&&(!o.every||i%o.every===0))g+=`<text class="ax" x="${x+w/2}" y="${H-7}" text-anchor="middle">${b.l}</text>`});
  el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${o.label||'Bar chart'}">${g}</svg>`;
}
st.textContent+='@keyframes grow{to{transform:scaleY(1)}}';

/* ring dial: parts [{v,c}] of 100 total */
function dial(el,score,parts,o={}){
  const R=80,C=2*Math.PI*R;let at=0,g='';
  for(let i=0;i<60;i++){const a=(i*6-90)*Math.PI/180,l=i%5?4:8;g+=`<line x1="${100+Math.cos(a)*(98-l)}" y1="${100+Math.sin(a)*(98-l)}" x2="${100+Math.cos(a)*98}" y2="${100+Math.sin(a)*98}" stroke="var(--line2)" stroke-width="${i%5?1:1.5}"/>`}
  g+=`<circle cx="100" cy="100" r="${R}" fill="none" stroke="var(--sunk)" stroke-width="13"/>`;
  parts.forEach((p,i)=>{const L=p.v/100*C;g+=`<circle cx="100" cy="100" r="${R}" fill="none" stroke="${p.c}" stroke-width="13" stroke-linecap="butt" stroke-dasharray="${RM?L:0} ${C}" stroke-dashoffset="${-at+C/4}" style="transition:stroke-dasharray 1.3s var(--ease) ${i*120}ms" data-l="${L}"/>`;at+=L+1.5});
  el.innerHTML=`<svg viewBox="0 0 200 200" role="img" aria-label="Health score ${score} out of 100">${g}<text x="100" y="104" text-anchor="middle" font-size="50" font-weight="800" fill="var(--ink)" font-family="var(--f)" letter-spacing="-2" class="num" data-dial>${RM?score:0}</text><text x="100" y="130" text-anchor="middle" font-size="12" fill="var(--ink3)" font-family="var(--f)" font-weight="600">out of 100</text></svg>`;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{el.querySelectorAll('[data-l]').forEach(c=>c.setAttribute('stroke-dasharray',c.dataset.l+' '+C));const t=el.querySelector('[data-dial]');if(!RM)count(t,score,{dur:1300})}));
}

/* segmented controls: data-seg group, buttons with data-v */
function segs(scope=d){scope.querySelectorAll('.seg').forEach(s=>s.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;s.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));s.dispatchEvent(new CustomEvent('change',{detail:b.dataset.v}))}))}

/* reveal on scroll (content visible at rest without JS; JS adds .pre only to below-fold) */
function reveal(){if(RM||!('IntersectionObserver' in window))return;const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');e.target.classList.remove('pre');io.unobserve(e.target)}}),{rootMargin:'0px 0px -8% 0px'});
  d.querySelectorAll('.reveal').forEach(el=>{if(el.getBoundingClientRect().top>innerHeight){el.classList.add('pre');io.observe(el)}})}

function sheet(id,open=true){const s=d.getElementById(id);let scr=d.querySelector('.scrim.own');if(!scr){scr=d.createElement('div');scr.className='scrim own';d.body.append(scr);scr.onclick=()=>d.querySelectorAll('.sheet.on').forEach(x=>{x.classList.remove('on');scr.classList.remove('on')})}
  s.classList.toggle('on',open);scr.classList.toggle('on',open);s.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>sheet(id,false))}

/* headline words rise in one by one; <em> words keep the gradient */
function splitTitles(scope=d){scope.querySelectorAll('.t-1:not([data-split])').forEach(h=>{h.dataset.split=1;let i=0;
  const wrap=t=>t.split(/(\s+)/).map(w=>/^\s+$/.test(w)||!w?w:`<span class="w" style="--i:${i++}">${w.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}</span>`).join('');
  h.innerHTML=[...h.childNodes].map(n=>n.nodeType===3?wrap(n.textContent):n.tagName==='BR'?'<br>':`<span class="w" style="--i:${i++}">${n.outerHTML}</span>`).join('')})}
window.QS={splitTitles,equity,state,timeTicks,icon,LOGO,rng,walk,fmt,toast,count,counters,bars,line,spark,vbars,dial,segs,sheet,isDark,toggleTheme,RM};
d.addEventListener('DOMContentLoaded',()=>{
  shell();
  d.querySelectorAll('[data-i]').forEach(el=>el.insertAdjacentHTML('afterbegin',icon(el.dataset.i,+(el.dataset.s||17))));
  d.addEventListener('click',e=>{if(e.target.closest('[data-theme-btn]'))toggleTheme()});
  splitTitles();
  segs();counters();bars();reveal();
  d.querySelectorAll('[data-toast]').forEach(b=>b.addEventListener('click',()=>toast(b.dataset.toast)));
});
})();
