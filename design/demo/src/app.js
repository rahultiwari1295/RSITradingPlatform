(function(){
"use strict";
var RM=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
var $=function(s,r){return (r||document).querySelector(s)};
var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function inr(n,d){return "₹"+Number(n).toLocaleString("en-IN",{minimumFractionDigits:d||0,maximumFractionDigits:d||0})}
function px(n){return n>=1000?inr(n,0):inr(n,1)}
function cr(n){return "₹"+Math.round(n).toLocaleString("en-IN")+" Cr"}
function sgn(n,d){return (n>=0?"+":"−")+Math.abs(n).toFixed(d==null?1:d)+"%"}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function lerp(a,b,t){return a+(b-a)*t}
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hash(s){var h=7;for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return h}

/* ---------- icons ---------- */
var IC={
 home:'<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
 xray:'<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M7 12h2.5l1.5-3 2 6 1.5-3H17"/>',
 ai:'<path d="M11 3l1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9z"/><path d="M18.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
 pat:'<path d="M3 18l4.5-4.5 3 2.5L15 10l2.5 2.5L21 8"/><path d="M3 6h18" stroke-dasharray="2.2 3"/>',
 pie:'<path d="M12 3v9h9"/><path d="M21 12A9 9 0 1 1 12 3"/>',
 chev:'<path d="M9 5l7 7-7 7"/>',check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',x:'<path d="M6 6l12 12M18 6L6 18"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
 shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',warn:'<path d="M12 4l9 16H3z"/><path d="M12 10v4.5M12 17.5v.2"/>',
 play:'<path d="M8 5l11 7-11 7z"/>',moon:'<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z"/>'
};
function ic(n,s,w,c){return '<svg width="'+(s||20)+'" height="'+(s||20)+'" viewBox="0 0 24 24" fill="none" stroke="'+(c||"currentColor")+'" stroke-width="'+(w||2)+'" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+IC[n]+'</svg>'}
function chev(){return ic("chev",17,2.4).replace("<svg",'<svg class="chev"')}

/* ---------- data (sample, clearly labelled) ---------- */
var CONF={W:{label:"Validated edge",win:54,hit:27,n:423,r:0.36,col:"var(--up)"},
          D:{label:"Promising, not yet proven",win:46,hit:27,n:1945,r:0.16,col:"var(--warn)"}};
var SIGS=[
 {id:"trent",sym:"TRENT",name:"Trent Ltd",action:"BUY",tf:"W",level:7390,entry:7420,stop:7010,target:8240,now:7612,opened:"6 Oct",bars:5,state:"Fresh breakout"},
 {id:"dixon",sym:"DIXON",name:"Dixon Technologies",action:"BUY",tf:"D",level:15760,entry:15840,stop:14920,target:17680,now:16215,opened:"8 Oct",bars:3,state:"Fresh breakout"},
 {id:"bel",sym:"BEL",name:"Bharat Electronics",action:"BUY",tf:"D",level:410.5,entry:412.6,stop:389.4,target:459,now:421.9,opened:"9 Oct",bars:2,state:"Fresh breakout"},
 {id:"titan",sym:"TITAN",name:"Titan Company",action:"HOLD",tf:"W",level:3310,entry:3340,stop:3105,target:3810,now:3598,opened:"29 Sep",bars:8,state:"Running"},
 {id:"polycab",sym:"POLYCAB",name:"Polycab India",action:"EXIT",tf:"D",level:6180,entry:6180,stop:5800,target:6940,now:6962,opened:"22 Sep",bars:13,state:"Target reached"}
];
var CLOSED=[
 {sym:"MARUTI",name:"Maruti Suzuki",tf:"W",entry:11800,stop:11250,exit:12900,opened:"4 Aug",closed:"19 Sep",why:"Target hit"},
 {sym:"SBIN",name:"State Bank of India",tf:"D",entry:812,stop:779,exit:878,opened:"2 Sep",closed:"26 Sep",why:"Target hit"},
 {sym:"HAL",name:"Hindustan Aeronautics",tf:"D",entry:4620,stop:4390,exit:5080,opened:"28 Aug",closed:"18 Sep",why:"Target hit"},
 {sym:"CIPLA",name:"Cipla",tf:"W",entry:1480,stop:1395,exit:1590,opened:"11 Aug",closed:"22 Sep",why:"Trailing stop"},
 {sym:"LT",name:"Larsen & Toubro",tf:"D",entry:3610,stop:3480,exit:3480,opened:"15 Sep",closed:"24 Sep",why:"Stop hit"},
 {sym:"INFY",name:"Infosys",tf:"D",entry:1712,stop:1655,exit:1655,opened:"9 Sep",closed:"17 Sep",why:"Stop hit"},
 {sym:"ITC",name:"ITC Ltd",tf:"D",entry:462,stop:448,exit:448,opened:"3 Sep",closed:"12 Sep",why:"Stop hit"},
 {sym:"DLF",name:"DLF Ltd",tf:"D",entry:842,stop:801,exit:801,opened:"29 Aug",closed:"9 Sep",why:"Stop hit"},
 {sym:"IRFC",name:"Indian Railway Finance",tf:"D",entry:142.4,stop:133.9,exit:133.9,opened:"21 Aug",closed:"4 Sep",why:"Stop hit"},
 {sym:"BAJFINANCE",name:"Bajaj Finance",tf:"D",entry:7240,stop:6890,exit:6890,opened:"12 Aug",closed:"28 Aug",why:"Stop hit"}
];
CLOSED.forEach(function(c){c.R=(c.exit-c.entry)/(c.entry-c.stop);c.pct=(c.exit/c.entry-1)*100-0.25;c.id=c.sym.toLowerCase()});
var PIL=["Quality","Growth","Value","Momentum","Safety","Ownership"],PILW=[.22,.2,.15,.13,.2,.1],PCOL=["var(--p1)","var(--p2)","var(--p3)","var(--p4)","var(--p5)","var(--p6)"];
var PILD=["Returns it earns on the money put in","Sales and profit growth, and for how long","Is the price fair for what you get","Are buyers already pushing it up","Debt, and how it copes with a bad year","Do promoters and big funds hold on"];
var PILGOOD=["It earns strong returns on the money put into it.","Sales and profits have grown steadily for years.","The price looks fair for what you get.","Buyers are already pushing the price up.","Little debt; it can ride out a bad year.","Promoters and big funds are holding on."];
var PILBAD=["Returns on capital are thin for its size.","Growth has slowed or been uneven.","The price is high for what you get today.","The price trend is weak right now.","Debt is heavy; a bad year would hurt.","Big holders have been trimming."];
var XR=[
 {sym:"TRENT",name:"Trent Ltd",sec:"Retail",p:[86,92,34,84,76,72]},
 {sym:"TITAN",name:"Titan Company",sec:"Consumer",p:[84,78,36,74,82,80]},
 {sym:"BEL",name:"Bharat Electronics",sec:"Defence",p:[80,76,52,82,88,74]},
 {sym:"ITC",name:"ITC Ltd",sec:"FMCG",p:[78,58,66,60,92,70]},
 {sym:"INFY",name:"Infosys",sec:"IT services",p:[82,60,58,52,94,66]},
 {sym:"DIXON",name:"Dixon Technologies",sec:"Electronics",p:[72,90,28,86,62,64]},
 {sym:"SBIN",name:"State Bank of India",sec:"Banking",p:[66,64,72,58,50,60]},
 {sym:"VIKRTEX",name:"Vikram Textiles (sample)",sec:"Textiles",p:[34,40,58,28,26,38]}
];
var PX={TRENT:7612,TITAN:3598,BEL:421.9,ITC:451,INFY:1688,DIXON:16215,SBIN:861,VIKRTEX:23.4,POLYCAB:6962,MARUTI:12900,HAL:5080};
var DAY={TRENT:1.4,TITAN:.6,BEL:2.1,ITC:-.3,INFY:-.8,DIXON:2.4,SBIN:.2,VIKRTEX:-1.9};
XR.forEach(function(d){
  d.score=Math.round(d.p.reduce(function(a,v,i){return a+v*PILW[i]},0));
  var r=rng(hash(d.sym)),q=d.p;
  d.price=PX[d.sym];d.chg=DAY[d.sym]||0;d.lo=d.price*(0.68+r()*.08);d.hi=d.price*(1.04+r()*.1);
  d.rev0=1500+r()*38000;d.g=3+q[1]*.17;d.npm=2+q[0]*.12;d.opm=d.npm+5+r()*5;
  d.rev=[0,1,2,3,4].map(function(i){return d.rev0*Math.pow(1+d.g/100,i)});d.np=d.rev.map(function(v,i){return v*(d.npm-1.5+i*.4)/100});
  d.pe=12+(100-q[2])*.62;d.mcap=d.np[4]*d.pe;d.roce=6+q[0]*.2;d.roe=d.roce*.82;d.de=Math.max(.02,(100-q[4])/110);d.dy=.2+q[2]*.02;
  var pr=22+q[5]*.45;d.own=[["Promoters",pr,"var(--p1)"],["Foreign funds",(100-pr)*.38,"var(--p2)"],["Indian funds",(100-pr)*.34,"var(--p5)"],["Public",(100-pr)*.28,"var(--p6)"]];
});
function xrOf(s){for(var i=0;i<XR.length;i++)if(XR[i].sym===s)return XR[i];return null}
function sigOf(s){for(var i=0;i<SIGS.length;i++)if(SIGS[i].sym===s)return SIGS[i];return null}
function tone(s){return s>=75?{c:"var(--up)",t:"Strong",k:"buy"}:s>=50?{c:"var(--warn)",t:"Mixed",k:"warn"}:{c:"var(--dn)",t:"Weak",k:"sell"}}
function verdict(s){return s>=75?"A strong business. Its numbers support holding through dips.":s>=50?"A decent business with a few gaps. Keep position sizes a little smaller.":"Weak numbers. Any chart signal here carries more risk. Keep it small or skip it."}

var PAT=[
 {id:"dixon",sym:"DIXON",name:"Dixon Technologies",stage:"Breakout",tf:"D",level:15760,now:16215,tests:4,months:5},
 {id:"bel",sym:"BEL",name:"Bharat Electronics",stage:"Breakout",tf:"D",level:410.5,now:421.9,tests:3,months:4},
 {id:"hal",sym:"HAL",name:"Hindustan Aeronautics",stage:"Near",tf:"W",level:5150,now:5080,tests:3,months:7},
 {id:"cipla",sym:"CIPLA",name:"Cipla",stage:"Near",tf:"D",level:1612,now:1588,tests:5,months:3},
 {id:"lt",sym:"LT",name:"Larsen & Toubro",stage:"Retest",tf:"D",level:3655,now:3672,tests:4,months:6},
 {id:"tatapower",sym:"TATAPOWER",name:"Tata Power",stage:"Forming",tf:"W",level:468,now:441,tests:2,months:9},
 {id:"kpit",sym:"KPITTECH",name:"KPIT Technologies",stage:"Forming",tf:"D",level:1840,now:1702,tests:2,months:2}
];
var STG={Breakout:{cls:"buy",say:"Closed above the ceiling",n:2},Near:{cls:"hold",say:"Just under the ceiling",n:27},Retest:{cls:"warn",say:"Back to test the old ceiling",n:18},Forming:{cls:"",say:"Still taking shape",n:130}};
function patOdds(p){
  if(p.stage==="Breakout")return CONF[p.tf];
  return {none:true,text:p.stage==="Near"?"Odds apply once it breaks out. Until then, watch.":p.stage==="Retest"?"Retests have not shown a proven edge yet. Watch only.":"Too early to judge. No odds yet."}
}

var HOLD0=[{sym:"TRENT",qty:12,avg:6890},{sym:"TITAN",qty:20,avg:3340},{sym:"SBIN",qty:150,avg:780},{sym:"INFY",qty:40,avg:1620},{sym:"BEL",qty:300,avg:298}];
var S={view:"home",xf:"all",xq:"",sigTab:0,pf:"All",holdings:null,edit:false};
try{var sv=localStorage.getItem("qs-demo-holdings");if(sv){var pv=JSON.parse(sv);if(Array.isArray(pv)&&pv.length)S.holdings=pv}}catch(e){}
if(!S.holdings)S.holdings=HOLD0.slice();
function saveH(){try{localStorage.setItem("qs-demo-holdings",JSON.stringify(S.holdings))}catch(e){}}

/* ---------- small pieces ---------- */
function ring(score,size,w){
  var r=(size-w)/2,c=2*Math.PI*r,t=tone(score);
  return '<svg class="mini-ring" width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'" role="img" aria-label="X-Ray score '+score+'"><circle cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" fill="none" stroke="var(--track)" stroke-width="'+w+'"/><circle class="rg" data-c="'+c+'" data-v="'+score+'" cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" fill="none" stroke="'+t.c+'" stroke-width="'+w+'" stroke-linecap="round" stroke-dasharray="'+c+'" stroke-dashoffset="'+(RM?c*(1-score/100):c)+'" transform="rotate(-90 '+size/2+' '+size/2+')" style="transition:stroke-dashoffset 1.2s cubic-bezier(.2,.9,.2,1)"/><text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle" fill="var(--fg)" font-family="-apple-system,BlinkMacSystemFont,Inter,sans-serif" font-weight="700" font-size="'+Math.round(size*.33)+'">'+score+'</text></svg>'
}
function rail(lo,hi,mark,now,ll,rl,ml){
  var e=clamp((mark-lo)/(hi-lo)*100,0,100),n=clamp((now-lo)/(hi-lo)*100,0,100);
  return '<div class="rail" style="--e:'+e.toFixed(1)+'%"><div class="tk"></div>'+(ml?'<i class="mk" style="left:'+e.toFixed(1)+'%"></i><span style="left:'+clamp(e,14,86).toFixed(1)+'%">'+ml+'</span>':'')+'<i class="nw" style="left:'+n.toFixed(1)+'%"></i><span class="l">'+ll+'</span><span class="r">'+rl+'</span></div>'
}
function actPill(a){return a==="BUY"?'<span class="pill buy">Buy</span>':a==="EXIT"?'<span class="pill sell">Sell now</span>':'<span class="pill hold">Hold</span>'}
function tfPill(tf){return '<span class="pill">'+(tf==="W"?"Weekly":"Daily")+'</span>'}
function head(icon,label,h,lede,neutral){return '<div class="halo"></div><header class="nav">'+(icon?ic(icon,17,2.2):'')+label+'</header><div class="hd rv"><p class="ey'+(neutral?' n':'')+'">'+(icon&&!neutral?ic(icon,16,2.2):'')+(neutral||label)+'</p><h1>'+h+'</h1>'+(lede?'<p class="lede">'+lede+'</p>':'')+'</div>'}
function sh(t,small,right){return '<div class="sh"><h2>'+t+'</h2>'+(small?'<small>'+small+'</small>':'')+(right||'')+'</div>'}
function rv(i){return ' rv" style="--d:'+i+'"'}

/* ---------- HOME ---------- */
function topCall(g){
  var c=CONF[g.tf],ch=(g.now/g.entry-1)*100;
  return '<article class="card top jl'+'" data-act="sig" data-id="'+g.id+'" tabindex="0" role="button" aria-label="Open the plan for '+g.sym+'">'+
   '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px"><div><div style="display:flex;gap:6px;margin-bottom:12px">'+actPill(g.action)+tfPill(g.tf)+'<span class="pill acc" style="--acc:var(--ai)">'+ic("ai",12,2.4)+'AI Call</span></div><div class="sym">'+g.sym+'</div><div class="t2" style="font-size:15px">'+esc(g.name)+'</div></div>'+
   '<div class="rt"><small class="dim" style="font-size:12px">Now</small><b class="num" style="font-size:20px">'+px(g.now)+'</b><small class="num up">'+sgn(ch)+' since entry</small></div></div>'+
   '<p class="quote">Broke above a price it had failed to cross for months. <b>The weekly trend agrees.</b></p>'+
   '<div class="lv3"><div><small>Entry</small><b class="num">'+px(g.entry)+'</b></div><div><small>Stop</small><b class="num dn">'+px(g.stop)+'</b></div><div><small>Target</small><b class="num up">'+px(g.target)+'</b></div></div>'+
   rail(g.stop,g.target,g.entry,g.now,"Stop","Target","Entry")+
   '<div class="foot"><span><span class="dot" style="background:'+c.col+';margin-right:8px"></span><b>'+c.label+'</b> · '+c.win+'% of '+c.n+' similar trades won</span><span class="lnk" style="--acc:var(--ai);flex:none">Plan'+ic("chev",15,2.6)+'</span></div></article>'
}
function homeHtml(){
  var t=SIGS[0];
  function prod(i,icon,col,name,txt,meta,to){return '<button class="row prod'+(i?'':'')+'" data-act="go" data-to="'+to+'"><span class="ico" style="--c:'+col+'">'+ic(icon,21,2.1)+'</span><div class="grow"><h3>'+name+'</h3><p>'+txt+'</p><div class="meta" style="--c:'+col+'">'+meta+'</div></div>'+chev()+'</button>'}
  function mini(g){var c=CONF[g.tf];return '<button class="row ind" data-act="sig" data-id="'+g.id+'"><span class="av">'+g.sym.slice(0,2)+'</span><div class="grow"><div class="t1">'+g.sym+actPill(g.action)+'</div><div class="t2">'+(g.tf==="W"?"Weekly":"Daily")+' breakout · '+c.win+'% won before</div></div><span class="pill warn">Unproven</span>'+chev()+'</button>'}
  return '<div class="inner" style="--acc:var(--fg)">'+head("","Today","Your market, in plain words.","QuantSync reads companies, charts and years of history for you, then tells you what is worth your money today.","Sunday, 11 October · Sample data")+
  '<section class="sec'+rv(1)+'>'+sh("Today’s top call","Weekly · validated")+topCall(t)+'</section>'+
  '<section class="sec'+rv(2)+'>'+sh("What QuantSync does")+'<div class="list jl">'+
    prod(0,"xray","var(--ax)","Stock X-Ray","Is this a good company? Search any stock and get one score from 0 to 100, built from six checks.","8 companies in the demo","xray")+
    prod(1,"ai","var(--ai)","AI Calls","When to buy, hold or sell. Our AI picks the strongest of several tested strategies, and every call has a stop.","3 open buys · 54% won (weekly)","signals")+
    prod(2,"pat","var(--pt)","Pattern Calls","For chart lovers. Breakout patterns found in every chart, ranked by how often the same pattern worked before.","27 stocks near a breakout","patterns")+
    prod(3,"pie","var(--pf)","Portfolio","Type in what you own. We X-Ray every holding and flag any live call on it.","5 holdings tracked","portfolio")+
  '</div></section>'+
  '<section class="sec'+rv(3)+'>'+sh("Also on today’s list","Promising, not yet proven")+'<div class="list jl">'+mini(SIGS[1])+mini(SIGS[2])+'</div><p class="note">Daily breakouts are positive in testing but just short of our proof bar. You see them with honest odds and decide the size.</p></section>'+
  '<section class="sec'+rv(4)+'><button class="btn soft w" data-act="replay">'+ic("play",15,2.2)+' Replay the launch film</button><p class="note" style="text-align:center">Demo with sample prices. Not investment advice.</p></section></div>'
}

/* ---------- STOCK X-RAY ---------- */
function xrRows(list){
  if(!list.length)return '<div class="card pad" style="text-align:center"><h3>No match in the demo</h3><p class="mu" style="margin:6px 0 0;font-size:15px">The live app covers every NSE stock. Here, try TRENT, Infosys or banks.</p></div>';
  return '<div class="list jl">'+list.map(function(d){var t=tone(d.score),sg=sigOf(d.sym);
   return '<button class="row ind" data-act="xr" data-sym="'+d.sym+'">'+ring(d.score,42,4.5)+'<div class="grow"><div class="t1">'+d.sym+'<span class="pill '+t.k+'">'+t.t+'</span>'+(sg?actPill(sg.action):'')+'</div><div class="t2">'+esc(d.name)+' · '+d.sec+'</div></div>'+chev()+'</button>'}).join("")+'</div>'
}
function xrFilter(){var f=S.xf;return XR.filter(function(d){return f==="all"||(f==="strong"&&d.score>=75)||(f==="mixed"&&d.score>=50&&d.score<75)||(f==="weak"&&d.score<50)}).sort(function(a,b){return b.score-a.score})}
function xrayHtml(){
  var top=XR.slice().sort(function(a,b){return b.score-a.score}).slice(0,5);
  var F=[["all","All"],["strong","Strong"],["mixed","Mixed"],["weak","Weak"]];
  return '<div class="inner" style="--acc:var(--ax)">'+head("xray","Stock X-Ray","See inside any company.","Type a name. In seconds you get a health score from 0 to 100, built from six checks a careful analyst would run.")+
  '<div class="srch'+rv(1)+'><label class="sbox">'+ic("search",22,2.3)+'<span class="sr">Search a company</span><input id="xq" type="search" autocomplete="off" placeholder="Search a company" value="'+esc(S.xq)+'"></label><div class="sug" id="sug" hidden></div></div>'+
  '<div class="chips'+rv(2)+'>'+["TRENT","Infosys","Defence","Banks","Retail"].map(function(q){return '<button class="chip" data-act="xqf" data-q="'+q+'">'+q+'</button>'}).join("")+'</div>'+
  '<section class="sec'+rv(3)+'>'+sh("What one X-Ray shows you")+'<div class="steps"><div><i>1</i><b>Health score</b><small>One number from six checks.</small></div><div><i>2</i><b>Five years</b><small>Sales, profit and margins.</small></div><div><i>3</i><b>Who owns it</b><small>Promoters, funds, public.</small></div></div></section>'+
  '<section class="sec'+rv(4)+'>'+sh("Strongest companies today")+'<div class="scroller">'+top.map(function(d){var t=tone(d.score);return '<button class="fcard" data-act="xr" data-sym="'+d.sym+'">'+ring(d.score,48,5)+'<div><b>'+d.sym+'</b><small>'+d.sec+'</small></div><span class="pill '+t.k+'" style="align-self:flex-start">'+t.t+'</span></button>'}).join("")+'</div></section>'+
  '<section class="sec'+rv(5)+'>'+sh("Browse")+'<div class="seg" data-n="4" id="xseg" role="group" aria-label="Filter by score"><span class="knob"></span>'+F.map(function(f){return '<button data-act="xf" data-f="'+f[0]+'" aria-pressed="'+(S.xf===f[0])+'">'+f[1]+'</button>'}).join("")+'</div><div id="xlist">'+xrRows(xrFilter())+'</div><p class="note">Demo scores and figures. The live app X-Rays every NSE stock.</p></section></div>'
}
function sugHtml(q){
  q=q.trim().toLowerCase();if(!q)return "";
  var m=XR.filter(function(d){return d.sym.toLowerCase().indexOf(q)>=0||d.name.toLowerCase().indexOf(q)>=0||d.sec.toLowerCase().indexOf(q)>=0||(q==="banks"&&d.sec==="Banking")});
  if(!m.length)return '<div class="row"><div class="grow"><div class="t1">No match in the demo</div><div class="t2">Try TRENT, Infosys, defence or banks.</div></div></div>';
  return m.slice(0,5).map(function(d){var t=tone(d.score);return '<button class="row ind" data-act="xr" data-sym="'+d.sym+'">'+ring(d.score,36,4)+'<div class="grow"><div class="t1">'+d.sym+'<span class="pill '+t.k+'">'+t.t+'</span></div><div class="t2">'+esc(d.name)+' · '+d.sec+'</div></div>'+chev()+'</button>'}).join("")
}
function dialSvg(d){
  var o="",at=0,gap=1.6,R=80;
  for(var i=0;i<100;i++){var a=(i*3.6-90)*Math.PI/180,l=i%10?3:6;o+='<line x1="'+(100+Math.cos(a)*(97-l)).toFixed(2)+'" y1="'+(100+Math.sin(a)*(97-l)).toFixed(2)+'" x2="'+(100+Math.cos(a)*97).toFixed(2)+'" y2="'+(100+Math.sin(a)*97).toFixed(2)+'" stroke="var(--dim)" stroke-width="'+(i%10?.5:.9)+'" opacity="'+(i%10?.45:.85)+'"/>'}
  PILW.forEach(function(w,i){var L=w*100-gap,v=L*d.p[i]/100;
    o+='<circle cx="100" cy="100" r="'+R+'" pathLength="100" fill="none" stroke="var(--track)" stroke-width="10" stroke-linecap="round" stroke-dasharray="'+L.toFixed(2)+' '+(100-L).toFixed(2)+'" stroke-dashoffset="'+(-at+25).toFixed(2)+'"/>';
    o+='<circle class="arc" data-l="'+v.toFixed(2)+'" cx="100" cy="100" r="'+R+'" pathLength="100" fill="none" stroke="'+PCOL[i]+'" stroke-width="10" stroke-linecap="round" stroke-dasharray="'+(RM?v.toFixed(2):"0")+' 100" stroke-dashoffset="'+(-at+25).toFixed(2)+'" style="transition:stroke-dasharray 1.2s cubic-bezier(.2,.9,.2,1) '+(i*90)+'ms"/>';at+=w*100});
  return '<svg viewBox="0 0 200 200" role="img" aria-label="Score made of six checks">'+o+'</svg>'
}
function barsSvg(labels,series,cols,fmt){
  var W=340,h=200,pb=24,pt=22,n=labels.length,k=series.length,max=Math.max.apply(null,series.reduce(function(a,s){return a.concat(s)},[]))*1.15,gw=W/n,bw=Math.min(22,gw/(k+1));
  var o='<svg class="svgc" viewBox="0 0 '+W+' '+h+'" role="img">';
  for(var i=0;i<=3;i++){var y=pt+(h-pt-pb)*i/3;o+='<line x1="0" x2="'+W+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>'}
  labels.forEach(function(l,i){var cx=gw*(i+.5);series.forEach(function(s,j){var bh=s[i]/max*(h-pt-pb),x=cx-(bw*k+(k-1)*4)/2+j*(bw+4);
    o+='<rect class="b" x="'+x.toFixed(1)+'" y="'+(h-pb-bh).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+bh.toFixed(1)+'" rx="4" fill="'+cols[j]+'" style="transition-delay:'+(i*70)+'ms"/>';
    if(i===n-1||k===1)o+='<text class="v" x="'+(x+bw/2).toFixed(1)+'" y="'+(h-pb-bh-6).toFixed(1)+'" text-anchor="middle">'+fmt(s[i])+'</text>'});
    o+='<text x="'+cx.toFixed(1)+'" y="'+(h-6)+'" text-anchor="middle">'+l+'</text>'});
  return o+'</svg>'
}
function waterfall(d){
  var R=d.rev[4],op=R*d.opm/100,np=d.np[4],tax=np*.33,di=op-np-tax;
  var S_=[["Sales",0,R,"var(--p2)"],["Costs",op,R,"var(--dn)"],["Op. profit",0,op,"var(--p2)"],["Dep. & int.",op-di,op,"var(--dn)"],["Tax",np,np+tax,"var(--dn)"],["Net profit",0,np,"var(--up)"]];
  var W=340,h=210,m=R*1.08,o='<svg class="svgc" viewBox="0 0 '+W+' '+h+'" role="img" aria-label="From sales to net profit">';
  S_.forEach(function(s,i){var x=4+i*56,y1=20+(1-s[2]/m)*162,y2=20+(1-s[1]/m)*162;
    o+='<rect class="b" x="'+x+'" y="'+y1.toFixed(1)+'" width="44" height="'+Math.max(3,y2-y1).toFixed(1)+'" rx="4" fill="'+s[3]+'" opacity=".9" style="transition-delay:'+(i*90)+'ms"/><text class="v" x="'+(x+22)+'" y="'+(y1-6).toFixed(1)+'" text-anchor="middle">'+(s[3]==="var(--dn)"?"−":"")+Math.round(s[2]-s[1]).toLocaleString("en-IN")+'</text><text x="'+(x+22)+'" y="'+(h-6)+'" text-anchor="middle">'+s[0]+'</text>'});
  return o+'</svg>'
}
function xrSheet(d){
  var t=tone(d.score),sg=sigOf(d.sym),ord=d.p.map(function(v,i){return [v,i]}).sort(function(a,b){return b[0]-a[0]});
  var FY=["FY22","FY23","FY24","FY25","FY26"];
  return grab(d.sym)+'<div class="inner" style="--acc:var(--ax)">'+
  '<div class="hd rv"><p class="ey">'+ic("xray",16,2.2)+'Stock X-Ray · '+d.sec+'</p><h1>'+esc(d.name)+'</h1></div>'+
  '<div class="card pad jl rv" style="--d:1"><div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><span class="price num">'+px(d.price)+'</span><b class="num '+(d.chg>=0?"up":"dn")+'">'+sgn(d.chg,2)+' today</b></div>'+
   rail(d.lo,d.hi,d.price,d.price,"52-week low "+px(d.lo),"High "+px(d.hi),"")+
   '<div class="dial"><div>'+dialSvg(d)+'</div><div class="c"><b class="num" data-count="'+d.score+'" data-plain="1">'+(RM?d.score:0)+'</b><span>X-Ray score</span></div></div>'+
   '<p style="text-align:center;margin:6px 0 14px"><span class="pill '+t.k+'">'+t.t+'</span></p><p class="quote" style="text-align:center;margin:0 auto 16px;max-width:30ch">'+verdict(d.score)+'</p>'+
   '<ul class="leg">'+d.p.map(function(v,i){return '<li><i style="background:'+PCOL[i]+'"></i><span>'+PIL[i]+'<small>'+PILD[i]+'</small></span><b class="num">'+v+'<span> /100</span></b></li>'}).join("")+'</ul></div>'+
  '<section class="sec rv">'+sh("In short")+'<div class="card pad"><ul class="why"><li>'+ic("check",18,2.6,"var(--up)")+'<span><b style="color:var(--fg)">Strength · '+PIL[ord[0][1]]+'.</b> '+PILGOOD[ord[0][1]]+'</span></li><li>'+ic("check",18,2.6,"var(--up)")+'<span><b style="color:var(--fg)">Strength · '+PIL[ord[1][1]]+'.</b> '+PILGOOD[ord[1][1]]+'</span></li><li>'+ic("warn",18,2.2,"var(--warn)")+'<span><b style="color:var(--fg)">Watch · '+PIL[ord[5][1]]+'.</b> '+PILBAD[ord[5][1]]+'</span></li></ul></div></section>'+
  '<section class="sec rv">'+sh("Key facts")+'<div class="list kv"><span>Market value</span><b class="num">'+cr(d.mcap)+'</b><span>Price to earnings</span><b class="num">'+d.pe.toFixed(1)+'</b><span>Return on capital</span><b class="num">'+d.roce.toFixed(1)+'%</b><span>Return on equity</span><b class="num">'+d.roe.toFixed(1)+'%</b><span>Debt to equity</span><b class="num">'+d.de.toFixed(2)+'</b><span>Dividend yield</span><b class="num">'+d.dy.toFixed(1)+'%</b></div></section>'+
  '<section class="sec rv">'+sh("Who owns it")+'<div class="card pad"><div class="own">'+d.own.map(function(o,i){return '<i style="width:'+o[1].toFixed(1)+'%;background:'+o[2]+';transition-delay:'+(i*80)+'ms"></i>'}).join("")+'</div><div class="lg2">'+d.own.map(function(o){return '<span><i style="background:'+o[2]+'"></i>'+o[0]+'<b class="num">'+o[1].toFixed(1)+'%</b></span>'}).join("")+'</div></div></section>'+
  '<section class="sec rv">'+sh("Sales to profit","FY26 · ₹ crore")+'<div class="card pad">'+waterfall(d)+'</div></section>'+
  '<section class="sec rv">'+sh("Five years","₹ crore")+'<div class="card pad"><div style="display:flex;gap:16px;margin-bottom:10px;font-size:13px;color:var(--mu)"><span><span class="dot" style="background:var(--p2);margin-right:6px"></span>Sales</span><span><span class="dot" style="background:var(--up);margin-right:6px"></span>Net profit</span></div>'+barsSvg(FY,[d.rev,d.np],["var(--p2)","var(--up)"],function(v){return Math.round(v).toLocaleString("en-IN")})+'</div></section>'+
  (sg?'<button class="btn w acc" style="--acc:var(--ai)" data-act="sig" data-id="'+sg.id+'">'+ic("ai",17,2.2)+' See the AI call on '+sg.sym+'</button>':'<p class="note">No live AI call on this stock today.</p>')+
  '<p class="note">Demo figures, not real company data. X-Ray never changes a trade call; it tells you how much to trust the company behind the chart.</p></div>'
}

/* ---------- AI CALLS ---------- */
function sigCard(g){
  var c=CONF[g.tf],ch=(g.now/g.entry-1)*100;
  return '<button class="card pad jl" style="display:block;width:100%;text-align:left" data-act="sig" data-id="'+g.id+'"><div style="display:flex;align-items:flex-start;gap:12px"><div class="grow"><div class="t1" style="font-size:18px">'+g.sym+actPill(g.action)+tfPill(g.tf)+'</div><div class="t2">'+esc(g.name)+' · '+g.state+'</div></div><div class="rt"><b class="num">'+px(g.now)+'</b><small class="num '+(ch>=0?"up":"dn")+'">'+sgn(ch)+'</small></div></div>'+
  rail(g.stop,g.target,g.entry,g.now,"Stop "+px(g.stop),"Target "+px(g.target),"Entry")+
  '<div class="odds"><span><span class="dot" style="background:'+c.col+';margin-right:7px"></span>'+c.label+'</span><b>'+c.win+'% won before</b></div></button>'
}
function closedRow(c){
  var win=c.R>0.05;
  return '<button class="row ind" data-act="sigc" data-id="'+c.id+'"><span class="ico sm" style="--c:'+(win?"var(--up)":"var(--dn)")+'">'+ic(win?"check":"x",17,2.6)+'</span><div class="grow"><div class="t1">'+c.sym+'<span class="pill">'+(c.tf==="W"?"Weekly":"Daily")+'</span></div><div class="t2">'+c.why+' · '+c.opened+' to '+c.closed+'</div></div><div class="rt"><b class="num '+(win?"up":"dn")+'">'+sgn(c.pct)+'</b><small class="num dim">'+(c.R>=0?"+":"−")+Math.abs(c.R).toFixed(1)+'R</small></div></button>'
}
function signalsHtml(){
  var wins=CLOSED.filter(function(c){return c.R>0.05}),tot=CLOSED.length,sumR=CLOSED.reduce(function(a,c){return a+c.R},0);
  var avgW=wins.reduce(function(a,c){return a+c.pct},0)/wins.length,lossL=CLOSED.filter(function(c){return c.R<=0.05}),avgL=lossL.reduce(function(a,c){return a+c.pct},0)/lossL.length;
  var body=S.sigTab===0?'<div class="sec">'+SIGS.map(sigCard).join("")+'</div>':
   '<div class="proof jl"><div><b class="num">'+wins.length+' of '+tot+'</b><small>trades won</small></div><div><b class="num up">'+sgn(avgW)+'</b><small>average win</small></div><div><b class="num dn">'+sgn(avgL)+'</b><small>average loss</small></div></div><div class="list jl">'+CLOSED.map(closedRow).join("")+'</div><p class="note">Sample record. Net '+(sumR>=0?"+":"−")+Math.abs(sumR).toFixed(1)+'R: lose small, win bigger. That is the pattern to look for.</p>';
  return '<div class="inner" style="--acc:var(--ai)">'+head("ai","AI Calls","The AI’s best calls. Nothing else.","Our AI tests several strategies on years of NSE history and only calls the ones with a measured edge. Every call comes with an entry, a stop and a target.")+
  '<section class="sec'+rv(1)+'><div class="proof"><div><b class="num" style="color:var(--ai)">54%</b><small>of trades won</small></div><div><b class="num">+0.36R</b><small>average per trade</small></div><div><b class="num">423</b><small>trades measured</small></div></div><p class="note">Weekly breakout calls, 2019 to 2026, after costs. R is the amount you risk.</p></section>'+
  '<div class="seg'+rv(2)+' data-n="2" id="sseg" role="group" aria-label="Which calls"><span class="knob"></span><button data-act="sigtab" data-i="0" aria-pressed="'+(S.sigTab===0)+'">Active · '+SIGS.length+'</button><button data-act="sigtab" data-i="1" aria-pressed="'+(S.sigTab===1)+'">Closed · '+tot+'</button></div>'+
  '<div id="sbody" class="sec'+rv(3)+'>'+body+'</div></div>'
}
function sigSheet(g,closed){
  var c=CONF[g.tf],risk=g.entry-g.stop,end=closed?g.exit:g.now;
  var why=closed?["Entered when price closed clearly above the old ceiling.","The stop sat one ATR under that ceiling, so a failed breakout cost a known amount.",g.why==="Target hit"?"Price reached 2R, twice the amount risked, and the trade closed.":g.why==="Trailing stop"?"Price rose, the stop followed it up, and the trade closed with a gain.":"Price fell to the stop. The loss was the amount planned, no more."]:
   g.action==="EXIT"?["Price reached the 2R target.","Selling now locks in the gain. The plan said to sell here.","Take the profit and look for the next setup."]:
   g.action==="HOLD"?["Price is between the entry and the target.","Keep the stop where it is. Do not lower it.","If price closes under the stop, this turns into a sell."]:
   ["Closed above "+px(g.level)+", a price it had failed to cross before, by a decisive margin.","It sits near its 52-week high, so few holders are waiting to sell at a loss.","It trades above its long-term average, so the bigger trend agrees."];
  return grab(g.sym)+'<div class="inner" style="--acc:var(--ai)">'+
  '<div class="hd rv"><p class="ey">'+ic("ai",16,2.2)+'AI Call · '+(g.tf==="W"?"Weekly":"Daily")+' chart</p><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><h1>'+g.sym+'</h1>'+(closed?'<span class="pill '+(g.R>0.05?"buy":"sell")+'">'+(g.R>0.05?"Won ":"Lost ")+sgn(g.pct)+'</span>':actPill(g.action))+'</div><p class="lede" style="margin-top:6px">'+esc(g.name)+'</p></div>'+
  '<div class="card jl rv" style="padding:12px;--d:1"><canvas class="chart" id="chart" aria-label="Price chart with entry, stop and target"></canvas><p class="note" style="padding:8px 6px 2px">Drag across the chart to read prices. Sample series.</p></div>'+
  '<div class="list kv rv"><span>Entry</span><b class="num">'+px(g.entry)+'</b><span>Stop · leave here</span><b class="num dn">'+px(g.stop)+'</b><span>Target · 2R</span><b class="num up">'+px(g.target)+'</b><span>'+(closed?"Closed at":"Now")+'</span><b class="num">'+px(end)+'</b><span>Risk per share</span><b class="num">'+px(risk)+' · '+(risk/g.entry*100).toFixed(1)+'%</b></div>'+
  '<section class="sec rv">'+sh("Why the AI called it")+'<div class="card pad"><ul class="why">'+why.map(function(w){return '<li>'+ic("check",18,2.6,"var(--up)")+'<span>'+w+'</span></li>'}).join("")+'</ul></div></section>'+
  '<section class="sec rv">'+sh("How reliable is this?")+'<div class="card pad"><div style="display:flex;align-items:center;gap:8px;font-weight:600"><span class="dot" style="background:'+c.col+'"></span>'+c.label+'</div>'+
   '<div style="display:grid;gap:14px;margin-top:16px"><div><div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:7px"><span class="mu">Trades that won</span><b class="num">'+c.win+'%</b></div><div class="bar" style="--w:'+c.win+'%;--c:var(--up)"><i></i></div></div><div><div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:7px"><span class="mu">Reached the full target</span><b class="num">'+c.hit+'%</b></div><div class="bar" style="--w:'+c.hit+'%;--c:var(--ai)"><i></i></div></div></div>'+
   '<p class="mu" style="margin:16px 0 0;font-size:14.5px;line-height:1.45">Average +'+c.r.toFixed(2)+'R per trade over '+c.n.toLocaleString("en-IN")+' similar '+(g.tf==="W"?"weekly":"daily")+' breakouts since 2019, after costs. '+(g.tf==="D"?"Positive, but not yet past our proof bar, so treat it as a smaller bet.":"It passed our proof bar in both older and newer years.")+'</p></div></section>'+
  '<section class="sec rv">'+sh("Timeline")+'<div class="card pad"><div class="tl"><div style="--c:var(--pf)"><b>Setup found</b><br>Price pressed against '+px(g.level)+'.</div><div style="--c:var(--up)"><b>Breakout · '+g.opened+'</b><br>Closed above the ceiling. Entry '+px(g.entry)+'.</div><div style="--c:'+(closed?(g.R>0.05?"var(--up)":"var(--dn)"):"var(--warn)")+'"><b>'+(closed?g.why+" · "+g.closed:g.state)+'</b><br>'+(closed?'Result '+sgn(g.pct)+' after costs.':'Now '+px(g.now)+'.')+'</div></div></div></section>'+
  '<p class="note">Educational demo with sample prices. Not investment advice.</p></div>'
}

/* ---------- PATTERN CALLS ---------- */
function patSeries(p){
  var n=60,r=rng(hash(p.sym+"p")),L=p.level,last=p.now/L,out=[],x=.9,tests=[],k;
  for(k=0;k<p.tests;k++)tests.push(Math.round(6+k*(n-20)/Math.max(1,p.tests-1||1)));
  for(var i=0;i<n;i++){var tgt=.915;tests.forEach(function(t){var d=i-t;if(d>-6&&d<=0)tgt=.915+(.99-.915)*(1+d/6);if(d>0&&d<5)tgt=.99-(d/5)*.06});
    x+=(tgt-x)*.35+(r()-.5)*.018;out.push(Math.min(x,.993))}
  function ramp(a,b,from,to){for(var i=a;i<=b;i++){var t=(i-a)/Math.max(1,b-a);out[i]=lerp(from,to,t*t*(3-2*t))+(r()-.5)*.006}}
  if(p.stage==="Forming")ramp(n-7,n-1,out[n-7],last);
  if(p.stage==="Near")ramp(n-10,n-1,out[n-10],last);
  if(p.stage==="Breakout"){ramp(n-11,n-5,out[n-11],.986);ramp(n-4,n-1,.996,last)}
  if(p.stage==="Retest"){ramp(n-20,n-13,out[n-20],.99);ramp(n-12,n-7,1.0,1.06);ramp(n-6,n-1,1.055,last)}
  out[n-1]=last;return out.map(function(v){return v*L})
}
function patSvg(p,H,big){
  var s=patSeries(p),W=320,n=s.length,mn=Math.min.apply(null,s)*.985,mx=Math.max(Math.max.apply(null,s),p.level)*1.02;
  function X(i){return (i/(n-1)*(W-(big?54:8))).toFixed(1)} function Y(v){return (6+(1-(v-mn)/(mx-mn))*(H-14)).toFixed(1)}
  var d=s.map(function(v,i){return (i?"L":"M")+X(i)+","+Y(v)}).join(""),ly=Y(p.level),id="pg"+p.id+(big?"b":"");
  var o='<svg class="spark" viewBox="0 0 '+W+' '+H+'" style="height:'+H+'px" preserveAspectRatio="none" role="img" aria-label="'+p.stage+' pattern on '+p.sym+'"><defs><linearGradient id="'+id+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--pt)" stop-opacity=".22"/><stop offset="1" stop-color="var(--pt)" stop-opacity="0"/></linearGradient></defs>'+
   '<path d="'+d+'L'+X(n-1)+','+H+'L0,'+H+'Z" fill="url(#'+id+')"/><line x1="0" x2="'+(W-(big?54:8))+'" y1="'+ly+'" y2="'+ly+'" stroke="var(--pt)" stroke-width="1.3" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"/>'+
   '<path d="'+d+'" fill="none" stroke="var(--fg)" stroke-width="1.8" stroke-linejoin="round" vector-effect="non-scaling-stroke"/><circle cx="'+X(n-1)+'" cy="'+Y(s[n-1])+'" r="3.5" fill="var(--pt)"/>';
  if(big)o+='<text x="'+(W-48)+'" y="'+(+ly+4)+'" font-size="11" font-weight="600" fill="var(--pt)" font-family="-apple-system,Inter,sans-serif">'+px(p.level).replace("₹","")+'</text>';
  return o+'</svg>'
}
function patCard(p){
  var st=STG[p.stage],o=patOdds(p),gap=(p.now/p.level-1)*100;
  return '<button class="card pcard jl" data-act="pat" data-id="'+p.id+'"><div class="top2"><div class="grow"><div class="t1" style="font-size:18px">'+p.sym+'<span class="pill '+st.cls+'">'+p.stage+'</span>'+tfPill(p.tf)+'</div><div class="t2">'+st.say+' · tested '+p.tests+' times in '+p.months+' months</div></div><div class="rt"><b class="num">'+px(p.now)+'</b><small class="num '+(gap>=0?"up":"mu")+'">'+(gap>=0?sgn(gap)+" above":Math.abs(gap).toFixed(1)+"% below")+'</small></div></div>'+
  patSvg(p,74,false)+
  '<div class="odds">'+(o.none?'<span>'+o.text+'</span>':'<span><span class="dot" style="background:'+o.col+';margin-right:7px"></span>'+o.label+'</span><b>'+o.win+'% of '+o.n.toLocaleString("en-IN")+' won</b>')+'</div></button>'
}
function patternsHtml(){
  var F=["All","Breakout","Near","Retest","Forming"];
  var list=PAT.filter(function(p){return S.pf==="All"||p.stage===S.pf});
  return '<div class="inner" style="--acc:var(--pt)">'+head("pat","Pattern Calls","For chart lovers: breakouts, ranked by the odds.","We scan every liquid NSE chart for a price ceiling that is about to break, then show how often the same pattern worked before.")+
  '<section class="sec'+rv(1)+'><div class="steps"><div><i>1</i><b>Spot</b><small>A ceiling price tested again and again.</small></div><div><i>2</i><b>Match</b><small>Compared with 35,000+ past setups.</small></div><div><i>3</i><b>Rank</b><small>Real odds shown. What never worked is flagged.</small></div></div></section>'+
  '<div class="chips'+rv(2)+' role="group" aria-label="Filter by stage">'+F.map(function(f){return '<button class="chip" data-act="pf" data-f="'+f+'" aria-pressed="'+(S.pf===f)+'">'+f+(f!=="All"?' <b class="num">'+STG[f].n+'</b>':'')+'</button>'}).join("")+'</div>'+
  '<div id="plist" class="sec'+rv(3)+'>'+list.map(patCard).join("")+'<p class="note">Counts come from today’s scan; the cards are samples.</p></div></div>'
}
function patSheet(p){
  var st=STG[p.stage],o=patOdds(p),sg=sigOf(p.sym),gap=(p.now/p.level-1)*100;
  var todo={Breakout:["The breakout is the entry moment. Entry is the next open.","Put the stop one ATR under the old ceiling. If price falls back there, the idea was wrong.","Aim for 2R, twice what you risk."],
   Near:["Be ready, not in. Nothing to do until a decisive close above "+px(p.level)+".","Set an alert at the ceiling.","Odds apply only once it breaks out."],
   Retest:["Price came back to the old ceiling after breaking it.","This is often called a second chance, but our tests have not shown it beats the first entry.","Watch only. No call until there is a proven edge."],
   Forming:["The ceiling is still being tested. No setup yet.","Come back when it is near the ceiling.","Nothing to do today."]}[p.stage];
  return grab(p.sym)+'<div class="inner" style="--acc:var(--pt)">'+
  '<div class="hd rv"><p class="ey">'+ic("pat",16,2.2)+'Pattern Call · '+(p.tf==="W"?"Weekly":"Daily")+' chart</p><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><h1>'+p.sym+'</h1><span class="pill '+st.cls+'">'+p.stage+'</span></div><p class="lede" style="margin-top:6px">'+esc(p.name)+' · '+st.say.toLowerCase()+'.</p></div>'+
  '<div class="card pad jl rv" style="--d:1">'+patSvg(p,190,true)+'<p class="note" style="padding:8px 0 0">Dashed line: the ceiling at '+px(p.level)+'. Sample series.</p></div>'+
  '<div class="list kv rv"><span>Ceiling</span><b class="num">'+px(p.level)+'</b><span>Price now</span><b class="num">'+px(p.now)+'</b><span>Distance</span><b class="num '+(gap>=0?"up":"")+'">'+(gap>=0?sgn(gap)+" above":Math.abs(gap).toFixed(1)+"% below")+'</b><span>Times tested</span><b class="num">'+p.tests+' in '+p.months+' months</b></div>'+
  '<section class="sec rv">'+sh("How often this worked")+'<div class="card pad">'+(o.none?'<p class="quote" style="margin:0">'+o.text+'</p>':
   '<div style="display:flex;align-items:center;gap:8px;font-weight:600"><span class="dot" style="background:'+o.col+'"></span>'+o.label+'</div><div style="display:grid;gap:14px;margin-top:16px"><div><div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:7px"><span class="mu">Similar past setups that won</span><b class="num">'+o.win+'%</b></div><div class="bar" style="--w:'+o.win+'%;--c:var(--up)"><i></i></div></div><div><div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:7px"><span class="mu">Reached the full 2R target</span><b class="num">'+o.hit+'%</b></div><div class="bar" style="--w:'+o.hit+'%;--c:var(--pt)"><i></i></div></div></div><p class="mu" style="margin:16px 0 0;font-size:14.5px">'+o.n.toLocaleString("en-IN")+' similar '+(p.tf==="W"?"weekly":"daily")+' breakouts since 2019, after costs.</p>')+'</div></section>'+
  '<section class="sec rv">'+sh("What to do")+'<div class="card pad"><ul class="why">'+todo.map(function(w){return '<li>'+ic("check",18,2.6,"var(--pt)")+'<span>'+w+'</span></li>'}).join("")+'</ul></div></section>'+
  (sg?'<button class="btn w acc" style="--acc:var(--ai)" data-act="sig" data-id="'+sg.id+'">'+ic("ai",17,2.2)+' Open the AI call on '+sg.sym+'</button>':'')+
  (xrOf(p.sym)?'<button class="btn w soft" data-act="xr" data-sym="'+p.sym+'">'+ic("xray",17,2.2)+' X-Ray the company</button>':'')+
  '<p class="note">Educational demo. Not investment advice.</p></div>'
}

/* ---------- PORTFOLIO ---------- */
function holdCalc(){
  var rows=S.holdings.map(function(h,i){var p=PX[h.sym]!=null?PX[h.sym]:h.avg,v=p*h.qty,inv=h.avg*h.qty;return {i:i,h:h,p:p,v:v,inv:inv,pl:v-inv,plp:(p/h.avg-1)*100,known:PX[h.sym]!=null}});
  var tv=rows.reduce(function(a,r){return a+r.v},0),ti=rows.reduce(function(a,r){return a+r.inv},0),day=rows.reduce(function(a,r){return a+r.v*((DAY[r.h.sym]||0)/100)},0);
  return {rows:rows,tv:tv,ti:ti,day:day}
}
var PAL=["var(--p1)","var(--p2)","var(--p5)","var(--p3)","var(--p4)","var(--p6)"];
function portfolioHtml(){
  var c=holdCalc(),R=c.rows.slice().sort(function(a,b){return b.v-a.v}),tpl=c.tv-c.ti;
  var checks=[],big=R[0];
  if(big&&big.v/c.tv>.3)checks.push(["warn","var(--warn)","One stock is "+(big.v/c.tv*100).toFixed(0)+"% of your money","A bad day in "+esc(big.h.sym)+" would hurt a lot."]);
  var weak=R.filter(function(r){var d=xrOf(r.h.sym);return d&&d.score<50});
  if(weak.length)checks.push(["shield","var(--dn)",weak.map(function(r){return esc(r.h.sym)}).join(", ")+" scores under 50","Check the company before adding more."]);
  var act=R.filter(function(r){return sigOf(r.h.sym)});
  if(act.length)checks.push(["ai","var(--ai)",act.length+" holdings have a live AI call",act.map(function(r){return esc(r.h.sym)+" ("+sigOf(r.h.sym).action.toLowerCase()+")"}).join(", ")]);
  if(!checks.length)checks.push(["check","var(--up)","Nothing flagged","Your spread looks reasonable."]);
  var rows=R.map(function(r){var d=xrOf(r.h.sym),sg=sigOf(r.h.sym),t=d?tone(d.score):null;
   return '<div class="row ind"><span class="av">'+esc(r.h.sym.slice(0,2))+'</span><button class="grow" style="text-align:left" data-act="'+(d?"xr":"none")+'" data-sym="'+esc(r.h.sym)+'"><div class="t1">'+esc(r.h.sym)+(d?'<span class="pill '+t.k+'">X-Ray '+d.score+'</span>':'')+(sg?actPill(sg.action):'')+'</div><div class="t2 num">'+r.h.qty+' × '+px(r.h.avg)+(r.known?'':' · price not in demo')+'</div></button><div class="rt"><b class="num">'+inr(r.v)+'</b><small class="num '+(r.pl>=0?"up":"dn")+'">'+sgn(r.plp)+'</small></div>'+(S.edit?'<button class="x" style="margin:0 0 0 4px;background:color-mix(in srgb,var(--dn) 16%,transparent);color:var(--dn)" data-act="rm" data-i="'+r.i+'" aria-label="Remove '+esc(r.h.sym)+'">'+ic("x",15,2.6)+'</button>':'')+'</div>'}).join("");
  return '<div class="inner" style="--acc:var(--pf)">'+head("pie","Portfolio","Everything you own, checked daily.","Add your holdings by hand. We X-Ray each company and flag any live AI call. Saved only in this browser.")+
  '<div class="card pad jl'+rv(1)+'><p class="ey n" style="margin-bottom:6px">Current value</p><div class="price num" data-count="'+Math.round(c.tv)+'">'+inr(RM?c.tv:0)+'</div><div style="display:flex;gap:18px;flex-wrap:wrap;margin-top:12px;font-size:15px"><span class="num '+(tpl>=0?"up":"dn")+'">'+(tpl>=0?"+":"−")+inr(Math.abs(tpl))+' <span class="dim">overall</span></span><span class="num '+(c.day>=0?"up":"dn")+'">'+(c.day>=0?"+":"−")+inr(Math.abs(c.day))+' <span class="dim">today</span></span></div>'+
   '<div class="own" style="margin-top:20px">'+R.map(function(r,i){return '<i style="width:'+(r.v/c.tv*100).toFixed(1)+'%;background:'+PAL[i%6]+';transition-delay:'+(i*80)+'ms"></i>'}).join("")+'</div><div class="lg2">'+R.map(function(r,i){return '<span><i style="background:'+PAL[i%6]+'"></i>'+esc(r.h.sym)+'<b class="num">'+(r.v/c.tv*100).toFixed(0)+'%</b></span>'}).join("")+'</div></div>'+
  '<section class="sec'+rv(2)+'>'+sh("Daily check")+'<div class="list jl">'+checks.map(function(k){return '<div class="row ind"><span class="ico sm" style="--c:'+k[1]+'">'+ic(k[0],17,2.3)+'</span><div class="grow"><div class="t1">'+k[2]+'</div><div class="t2">'+k[3]+'</div></div></div>'}).join("")+'</div></section>'+
  '<section class="sec'+rv(3)+'>'+sh("Holdings","",'<span style="display:flex;gap:8px"><button class="btn sm soft" data-act="edit">'+(S.edit?"Done":"Edit")+'</button><button class="btn sm acc" data-act="add">'+ic("plus",15,2.6)+' Add</button></span>')+'<div class="list jl">'+rows+'</div></section>'+
  '<p class="note">Prices are sample values. Stocks outside the demo use your buy price.</p></div>'
}

/* ---------- chart (AI call sheet) ---------- */
var CH=null;
function makeSeries(g,closed){
  var n=96,r=rng(hash(g.sym)),L=g.level,eI=closed?64:n-1-g.bars,end=closed?g.exit:g.now,
   K=[[0,.8*L],[Math.max(eI-36,4),.93*L],[eI-12,.975*L],[eI-1,.986*L],[eI,g.entry],[n-1,end]],out=[],j=0;
  for(var i=0;i<n;i++){while(j<K.length-2&&i>K[j+1][0])j++;var a=K[j],b=K[j+1],t=b[0]===a[0]?1:(i-a[0])/(b[0]-a[0]);
    var v=lerp(a[1],b[1],clamp(t,0,1))+(r()-.5)*L*(i<eI?.012:.014)*(i===eI||i===n-1?0:1);
    if(i<eI&&i>eI-40)v=Math.min(v,L*.996); if(i>=eI&&!closed)v=Math.max(v,g.stop*1.015); out.push(v)}
  return {v:out,eI:eI}
}
function startChart(g,closed){
  var cv=$("#chart");if(!cv)return;stopChart();
  var ser=makeSeries(g,closed),dpr=Math.min(window.devicePixelRatio||1,3),ptr=-1,t0=performance.now()+250,raf=0,alive=true,FONT='-apple-system,BlinkMacSystemFont,Inter,system-ui,sans-serif';
  function css(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim()}
  function draw(now){
    if(!alive)return;var W=cv.clientWidth,H=cv.clientHeight;if(!W){raf=requestAnimationFrame(draw);return}
    if(cv.width!==Math.round(W*dpr)){cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr)}
    var x=cv.getContext("2d");x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,W,H);
    var fg=css("--fg"),dim=css("--dim"),line=css("--line2"),up=css("--up"),dn=css("--dn"),ac=css("--ai"),pf=css("--pf");
    var pr=RM?1:clamp((now-t0)/1200,0,1),ease=1-Math.pow(1-pr,3);
    var mn=Math.min(g.stop,Math.min.apply(null,ser.v))*.992,mx=Math.max(g.target,Math.max.apply(null,ser.v))*1.008,pad={l:6,r:58,t:14,b:10},n=ser.v.length;
    function X(i){return pad.l+i/(n-1)*(W-pad.l-pad.r)}function Y(v){return pad.t+(1-(v-mn)/(mx-mn))*(H-pad.t-pad.b)}
    x.font="500 11px "+FONT;x.textBaseline="middle";
    for(var k=0;k<=4;k++){var gv=mn+(mx-mn)*k/4,gy=Y(gv);x.strokeStyle=line;x.lineWidth=.5;x.beginPath();x.moveTo(pad.l,gy);x.lineTo(W-pad.r,gy);x.stroke();x.fillStyle=dim;x.textAlign="left";x.fillText(gv>=1000?Math.round(gv).toLocaleString("en-IN"):gv.toFixed(1),W-pad.r+8,gy)}
    var yE=Y(g.entry),yS=Y(g.stop),yT=Y(g.target);
    x.globalAlpha=.1;x.fillStyle=up;x.fillRect(X(ser.eI),yT,W-pad.r-X(ser.eI),yE-yT);x.fillStyle=dn;x.fillRect(X(ser.eI),yE,W-pad.r-X(ser.eI),yS-yE);x.globalAlpha=1;
    function hl(y,col,lab,dash){x.strokeStyle=col;x.lineWidth=1.2;x.setLineDash(dash);x.beginPath();x.moveTo(pad.l,y);x.lineTo(W-pad.r,y);x.stroke();x.setLineDash([]);x.fillStyle=col;x.textAlign="left";x.font="600 11px "+FONT;x.fillText(lab,pad.l+4,y-8)}
    hl(Y(g.level),pf,"Ceiling",[4,4]);hl(yT,up,"Target",[2,3]);hl(yS,dn,"Stop",[2,3]);
    var upto=Math.max(1,Math.floor((n-1)*ease)),gr=x.createLinearGradient(0,pad.t,0,H);gr.addColorStop(0,ac);gr.addColorStop(1,"transparent");
    x.beginPath();x.moveTo(X(0),H);for(var i=0;i<=upto;i++)x.lineTo(X(i),Y(ser.v[i]));x.lineTo(X(upto),H);x.closePath();x.globalAlpha=.16;x.fillStyle=gr;x.fill();x.globalAlpha=1;
    x.beginPath();for(var i=0;i<=upto;i++){i?x.lineTo(X(i),Y(ser.v[i])):x.moveTo(X(i),Y(ser.v[i]))}x.strokeStyle=fg;x.lineWidth=1.8;x.lineJoin="round";x.stroke();
    if(pr>=1){x.fillStyle=up;x.beginPath();x.arc(X(ser.eI),Y(g.entry),4.5,0,7);x.fill();
      var lx=X(n-1),ly=Y(ser.v[n-1]),pulse=RM?0:(now%1800)/1800;x.strokeStyle=ac;x.globalAlpha=1-pulse;x.lineWidth=1.5;x.beginPath();x.arc(lx,ly,4+pulse*12,0,7);x.stroke();x.globalAlpha=1;x.fillStyle=ac;x.beginPath();x.arc(lx,ly,4.5,0,7);x.fill()}
    if(ptr>=0){var pi=clamp(Math.round((ptr-pad.l)/(W-pad.l-pad.r)*(n-1)),0,n-1),px_=X(pi),py=Y(ser.v[pi]);x.strokeStyle=dim;x.lineWidth=1;x.beginPath();x.moveTo(px_,pad.t);x.lineTo(px_,H-pad.b);x.stroke();x.fillStyle=fg;x.beginPath();x.arc(px_,py,4,0,7);x.fill();
      var lab=ser.v[pi]>=1000?Math.round(ser.v[pi]).toLocaleString("en-IN"):ser.v[pi].toFixed(1),bw=x.measureText(lab).width+18,bx=clamp(px_-bw/2,pad.l,W-pad.r-bw);x.fillStyle=fg;x.beginPath();if(x.roundRect)x.roundRect(bx,0,bw,22,11);else x.rect(bx,0,bw,22);x.fill();x.fillStyle=css("--bg");x.font="600 12px "+FONT;x.fillText(lab,bx+9,11)}
    raf=requestAnimationFrame(draw)}
  function mv(e){var r=cv.getBoundingClientRect();ptr=e.clientX-r.left}
  cv.addEventListener("pointermove",mv);cv.addEventListener("pointerdown",mv);cv.addEventListener("pointerleave",function(){ptr=-1});
  raf=requestAnimationFrame(draw);CH={stop:function(){alive=false;cancelAnimationFrame(raf)}}
}
function stopChart(){if(CH){CH.stop();CH=null}}

/* ======================= physics ======================= */
var SPR=[];
function Spring(x,k,c,on){this.x=x;this.t=x;this.v=0;this.k=k;this.c=c;this.on=on;this.done=null}
Spring.prototype.to=function(t,v,done){this.t=t;if(v!=null)this.v=v;this.done=done||null;if(RM){this.x=t;this.v=0;this.on(t);if(done)done();return}if(SPR.indexOf(this)<0)SPR.push(this)};
Spring.prototype.set=function(x){this.x=x;this.t=x;this.v=0;this.on(x);var i=SPR.indexOf(this);if(i>=0)SPR.splice(i,1)};
function stepSprings(dt){
  for(var i=SPR.length-1;i>=0;i--){var s=SPR[i],h=dt/4;
    for(var j=0;j<4;j++){var a=-s.k*(s.x-s.t)-s.c*s.v;s.v+=a*h;s.x+=s.v*h}
    if(Math.abs(s.v)<.02&&Math.abs(s.x-s.t)<.02){s.x=s.t;s.v=0;SPR.splice(i,1);s.on(s.x);if(s.done)s.done()}else s.on(s.x)}
}

/* ---------- mount ---------- */
var VIEWS=[["home","Home","home","var(--fg)"],["xray","X-Ray","xray","var(--ax)"],["signals","AI Calls","ai","var(--ai)"],["patterns","Patterns","pat","var(--pt)"],["portfolio","Portfolio","pie","var(--pf)"]];
var BUILD={home:homeHtml,xray:xrayHtml,signals:signalsHtml,patterns:patternsHtml,portfolio:portfolioHtml};
var screens=$("#screens"),tabs=$("#dock"),sheet=$("#sheet"),scrim=$("#scrim"),modal=$("#modal");
var SCR={};
VIEWS.forEach(function(v,i){var s=document.createElement("section");s.className="screen";s.id="s-"+v[0];s.setAttribute("aria-label",v[1]);screens.appendChild(s);
  SCR[v[0]]={el:s,i:i,sp:new Spring(0,230,30,function(x){s.style.transform=x?"translate3d("+x.toFixed(2)+"px,0,0)":"";s.style.opacity=(1-Math.min(Math.abs(x)/60,1)).toFixed(3)})}});
tabs.innerHTML='<span class="tpill" id="tpill"></span>'+VIEWS.map(function(v){return '<button class="tab" data-act="go" data-to="'+v[0]+'" aria-label="'+v[1]+'">'+ic(v[2],24,1.9)+'<span>'+v[1]+'</span></button>'}).join("");
var pill=$("#tpill"),pillS=new Spring(0,260,24,function(x){pill.style.transform="translateX("+(x*100).toFixed(2)+"%)"});

var IO=null;
function observe(root){
  if(IO)IO.disconnect();
  var els=$$(".rv,.card,.list",root);
  if(RM||!("IntersectionObserver" in window)){els.forEach(reveal);return}
  IO=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){reveal(e.target);IO.unobserve(e.target)}})},{root:root,threshold:.12});
  els.forEach(function(e){IO.observe(e)})
}
function reveal(el){
  if(el.classList.contains("vis"))return;el.classList.add("vis");
  $$(".rg",el).forEach(function(c){c.setAttribute("stroke-dashoffset",+c.getAttribute("data-c")*(1-+c.getAttribute("data-v")/100))});
  $$(".arc",el).forEach(function(c){c.setAttribute("stroke-dasharray",c.getAttribute("data-l")+" 100")});
  $$("[data-count]",el).forEach(countUp);
}
function countUp(n){
  if(n._c)return;n._c=1;var to=+n.getAttribute("data-count"),plain=n.hasAttribute("data-plain"),t0=performance.now();
  function f(t){var k=clamp((t-t0)/1100,0,1),e=1-Math.pow(1-k,4),v=to*e;n.textContent=plain?Math.round(v):inr(v);if(k<1)requestAnimationFrame(f)}
  if(RM){n.textContent=plain?to:inr(to);return}requestAnimationFrame(f)
}
function segKnob(root){$$(".seg",root).forEach(function(s){var n=+s.getAttribute("data-n"),bs=$$("button",s),i=0;bs.forEach(function(b,j){if(b.getAttribute("aria-pressed")==="true")i=j});var k=$(".knob",s);k.style.width="calc((100% - 6px)/"+n+")";
  if(!k._s){k._s=new Spring(i,300,26,function(x){k.style.transform="translateX("+(x*100).toFixed(2)+"%)"});k._s.set(i)}else k._s.to(i)})}
function render(v,keep){
  var el=SCR[v].el,st=el.scrollTop,old=$$(".seg .knob",el).map(function(k){return k._s});
  el.innerHTML=BUILD[v]();if(keep){el.scrollTop=st;$$(".rv,.card,.list",el).forEach(reveal)}
  $$(".seg .knob",el).forEach(function(k,i){if(old[i]){k._s=old[i];var on=k._s.on;k._s.on=function(x){k.style.transform="translateX("+(x*100).toFixed(2)+"%)"}}});
  segKnob(el);if(!keep)observe(el);cacheJelly(el);if(v==="xray")bindSearch();dirtyNav=true
}
function show(v){
  var prev=S.view,pi=SCR[prev]?SCR[prev].i:0,ni=SCR[v].i,dir=ni>pi?1:ni<pi?-1:0;
  S.view=v;S.edit=false;
  render(v,false);var n=SCR[v];n.el.scrollTop=0;n.el.classList.add("on");n.el.style.zIndex=2;
  if(dir&&prev!==v){n.sp.set(60*dir);n.sp.to(0);var o=SCR[prev];o.el.style.zIndex=1;o.sp.to(-60*dir,null,function(){if(S.view!==prev){o.el.classList.remove("on");o.sp.set(0)}})}
  else{Object.keys(SCR).forEach(function(k){if(k!==v){SCR[k].el.classList.remove("on")}})}
  $$(".tab",tabs).forEach(function(b){if(b.getAttribute("data-to")===v)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current")});
  tabs.style.setProperty("--t",VIEWS[ni][3]);pillS.to(ni);observe(n.el)
}

/* ---------- jelly list physics: cards lag behind fast scrolls and spring back ---------- */
var JL=[];
function cacheJelly(root){JL=$$(".jl",root).map(function(el){return {el:el,x:0,v:0}})}
var lastSt=0,vel=0;
function jelly(sc,dt){
  var st=sc.scrollTop,raw=(st-lastSt);lastSt=st;vel=lerp(vel,raw,.5);
  if(RM)return;var vh=sc.clientHeight,mid=vh*.5,sr=sc.getBoundingClientRect();
  JL.forEach(function(j){
    var r=j.el.getBoundingClientRect(),c=r.top-sr.top+r.height/2;if(c<-200||c>vh+200){if(j.x){j.x=0;j.v=0;j.el.style.translate=""}return}
    var f=.25+Math.min(Math.abs(c-mid)/vh,1)*.75,t=clamp(vel*f*.9,-22,22);
    var a=-320*(j.x-t)-22*j.v;j.v+=a*dt;j.x+=j.v*dt;
    var rx=Math.round(j.x);j.el.style.translate=rx?"0 "+rx+"px":""});
}

/* ---------- sheets with velocity-aware spring ---------- */
var shS=new Spring(1,210,27,function(p){var H=sheet.offsetHeight||800;sheet.style.transform="translate3d(0,"+(p*H).toFixed(1)+"px,0)";var o=1-clamp(p,0,1);screens.style.transform=o?"scale("+(1-.06*o).toFixed(4)+") translateY("+(8*o).toFixed(1)+"px)":"";screens.style.filter=o?"brightness("+(1-.38*o).toFixed(3)+")":"";screens.style.borderRadius=o?(30*o).toFixed(1)+"px":"";screens.style.overflow=o?"hidden":"";tabs.style.opacity=(1-o*.6).toFixed(2)});
shS.set(1);
function openSheet(html,after){sheet.innerHTML=html;sheet.scrollTop=0;sheet.style.visibility="visible";shS.to(0,0);observe(sheet);cacheJelly(sheet);if(after)after();setTimeout(function(){var b=$(".x",sheet);if(b)b.focus({preventScroll:true})},450)}
function closeSheet(v){stopChart();shS.to(1,v||0,function(){sheet.style.visibility="hidden";sheet.innerHTML="";var el=SCR[S.view].el;observe(el);cacheJelly(el)})}
function sheetOpen(){return sheet.style.visibility==="visible"&&shS.t===0}
function grab(t){return '<div class="grab" id="grab"><b>'+t+'</b><button class="x" data-act="close" aria-label="Close">'+ic("x",15,2.6)+'</button></div>'}
(function(){
  var y0=null,last=0,lt=0,v=0,H=1;
  sheet.addEventListener("pointerdown",function(e){var g=e.target.closest&&e.target.closest("#grab");if(!g||e.target.closest(".x"))return;y0=e.clientY;last=y0;lt=performance.now();v=0;H=sheet.offsetHeight;var i=SPR.indexOf(shS);if(i>=0)SPR.splice(i,1);try{g.setPointerCapture(e.pointerId)}catch(x){}});
  sheet.addEventListener("pointermove",function(e){if(y0===null)return;var now=performance.now(),dy=e.clientY-y0;v=(e.clientY-last)/Math.max(1,now-lt)*1000/H;last=e.clientY;lt=now;var p=dy<0?dy/H*.15:dy/H;shS.x=p;shS.on(p)});
  function end(){if(y0===null)return;y0=null;if(shS.x>.22||v>1.2)closeSheet(v);else shS.to(0,v)}
  sheet.addEventListener("pointerup",end);sheet.addEventListener("pointercancel",end);
})();
function openSig(id,closed){
  var g=null;if(closed){CLOSED.forEach(function(c){if(c.id===id)g=Object.assign({},c,{level:c.entry*.99,target:c.entry+2*(c.entry-c.stop),action:"BUY",state:"Closed",bars:0})})}else g=SIGS.filter(function(s){return s.id===id})[0];
  if(!g)return;openSheet(sigSheet(g,closed),function(){startChart(g,closed)})
}
function openAdd(){
  modal.innerHTML='<h2>Add a holding</h2><p class="mu" style="margin:6px 0 0;font-size:15px">Type what you bought. You can remove it any time.</p>'+
  '<form id="addf" novalidate><div class="fld"><label for="f-sym">Stock symbol</label><input id="f-sym" type="text" list="syms" placeholder="e.g. DIXON" autocomplete="off" autocapitalize="characters" style="text-transform:uppercase"><datalist id="syms">'+XR.map(function(d){return '<option value="'+d.sym+'">'}).join("")+'</datalist></div>'+
  '<div class="fld"><label for="f-qty">Quantity</label><input id="f-qty" inputmode="numeric" placeholder="10"></div><div class="fld"><label for="f-avg">Average buy price (₹)</label><input id="f-avg" inputmode="decimal" placeholder="1500"></div>'+
  '<p class="err" id="f-err" role="alert"></p><div style="display:flex;gap:10px"><button type="button" class="btn soft" data-act="mclose" style="flex:1">Cancel</button><button type="submit" class="btn acc" style="flex:1;--acc:var(--pf)">Add</button></div></form>';
  modal.classList.add("open");scrim.classList.add("on");
  setTimeout(function(){var f=$("#f-sym");if(f)f.focus({preventScroll:true})},450);
  $("#addf").addEventListener("submit",function(e){e.preventDefault();
    var sym=$("#f-sym").value.trim().toUpperCase().replace(/[^A-Z0-9&-]/g,""),q=Math.floor(+$("#f-qty").value),a=+$("#f-avg").value,er=$("#f-err");
    if(!sym){er.textContent="Enter a stock symbol.";return}if(!(q>0)){er.textContent="Quantity must be 1 or more.";return}if(!(a>0)){er.textContent="Enter the price you paid per share.";return}
    var ex=S.holdings.filter(function(h){return h.sym===sym})[0];
    if(ex){var tq=ex.qty+q;ex.avg=(ex.avg*ex.qty+a*q)/tq;ex.qty=tq}else S.holdings.push({sym:sym,qty:q,avg:a});
    saveH();closeModal();render("portfolio",true)})
}
function closeModal(){modal.classList.remove("open");scrim.classList.remove("on")}

/* ---------- X-Ray search: live suggestions + typed hints ---------- */
var hintT=null;
function bindSearch(){
  var inp=$("#xq"),sug=$("#sug");if(!inp)return;
  var hints=["Search a company","Try TRENT","Try “defence”","Try Infosys","Try “banks”"],hi=0,ci=0,del=false;
  clearTimeout(hintT);
  function tick(){if(!document.body.contains(inp))return;if(document.activeElement===inp||inp.value){inp.placeholder="Search a company";hintT=setTimeout(tick,900);return}
    var w=hints[hi];if(!del){ci++;if(ci>=w.length){del=true;hintT=setTimeout(tick,1600);inp.placeholder=w;return}}else{ci--;if(ci<=0){del=false;hi=(hi+1)%hints.length}}
    inp.placeholder=w.slice(0,ci)+(ci<w.length?"▏":"");hintT=setTimeout(tick,del?28:62)}
  if(!RM)hintT=setTimeout(tick,1400);
  function upd(){var h=sugHtml(inp.value);sug.innerHTML=h;sug.hidden=!h;if(h&&!RM){sug.animate([{opacity:0,transform:"scale(.97) translateY(-6px)"},{opacity:1,transform:"none"}],{duration:260,easing:"cubic-bezier(.2,.9,.2,1)"})}}
  inp.addEventListener("input",function(){S.xq=inp.value;upd()});
  inp.addEventListener("keydown",function(e){if(e.key==="Enter"){var b=$("[data-act=xr]",sug);if(b)b.click()}});
  inp.addEventListener("focus",upd);
  document.addEventListener("pointerdown",function(e){if(!e.target.closest(".srch"))sug.hidden=true},{capture:true});
}

/* ---------- events ---------- */
document.addEventListener("click",function(e){
  var t=e.target.closest("[data-act]");if(!t)return;var a=t.getAttribute("data-act");
  if(a==="go"){if(sheetOpen())closeSheet();show(t.getAttribute("data-to"))}
  else if(a==="sig")openSig(t.getAttribute("data-id"),false);
  else if(a==="sigc")openSig(t.getAttribute("data-id"),true);
  else if(a==="xr"){var d=xrOf(t.getAttribute("data-sym"));if(d){var s=$("#sug");if(s)s.hidden=true;openSheet(xrSheet(d))}}
  else if(a==="pat"){var p=PAT.filter(function(x){return x.id===t.getAttribute("data-id")})[0];if(p)openSheet(patSheet(p))}
  else if(a==="close")closeSheet();
  else if(a==="xf"){S.xf=t.getAttribute("data-f");$$("#xseg button").forEach(function(b){b.setAttribute("aria-pressed",b===t)});segKnob($("#s-xray"));$("#xlist").innerHTML=xrRows(xrFilter());$$("#xlist .list",document).forEach(reveal);cacheJelly(SCR.xray.el)}
  else if(a==="xqf"){var i=$("#xq");i.value=t.getAttribute("data-q");S.xq=i.value;i.dispatchEvent(new Event("input"));i.focus({preventScroll:true})}
  else if(a==="sigtab"){S.sigTab=+t.getAttribute("data-i");render("signals",true)}
  else if(a==="pf"){S.pf=t.getAttribute("data-f");render("patterns",true)}
  else if(a==="add")openAdd();
  else if(a==="edit"){S.edit=!S.edit;render("portfolio",true)}
  else if(a==="mclose")closeModal();
  else if(a==="rm"){S.holdings.splice(+t.getAttribute("data-i"),1);saveH();render("portfolio",true)}
  else if(a==="replay"){try{location.reload()}catch(err){}}
});
document.addEventListener("keydown",function(e){
  if(e.key==="Escape"){if(modal.classList.contains("open"))closeModal();else if(sheetOpen())closeSheet()}
  if((e.key==="Enter"||e.key===" ")&&e.target.getAttribute&&e.target.getAttribute("role")==="button"){e.preventDefault();e.target.click()}
});
scrim.addEventListener("click",closeModal);
$("#themeBtn").addEventListener("click",function(){var r=document.documentElement,dark=(r.getAttribute("data-theme")||(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"))==="dark";r.setAttribute("data-theme",dark?"light":"dark")});

/* ---------- frame loop ---------- */
var dirtyNav=true,lt0=performance.now();
function frame(now){
  var dt=clamp((now-lt0)/1000,0,1/30);lt0=now;
  stepSprings(dt);
  var sc=sheet.style.visibility==="visible"?sheet:SCR[S.view].el,st=sc.scrollTop;
  jelly(sc,dt);
  var inner=$(".inner",sc);
  if(inner){var nav=$(".nav",inner);if(nav){var b=clamp((st-70)/24,0,1);nav.style.opacity=b.toFixed(2)}
    var hd=$(".hd",inner);if(hd&&st<0)hd.style.transform="scale("+(1+clamp(-st/600,0,.2)).toFixed(3)+")";else if(hd&&hd.style.transform&&hd.classList.contains("vis"))hd.style.transform="";
    var ha=$(".halo",inner);if(ha)ha.style.transform="translate3d(0,"+Math.round(-st*.35)+"px,0)"}
  requestAnimationFrame(frame)
}
show("home");requestAnimationFrame(frame);
})();
