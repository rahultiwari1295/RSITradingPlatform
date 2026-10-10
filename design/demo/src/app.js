(function(){
"use strict";
var RM=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
var $=function(s,r){return (r||document).querySelector(s)};
var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function inr(n,d){return "₹"+Number(n).toLocaleString("en-IN",{minimumFractionDigits:d||0,maximumFractionDigits:d||0})}
function px(n){return n>=1000?inr(n,0):inr(n,1)}
function sgn(n,d){return (n>=0?"+":"")+n.toFixed(d==null?1:d)+"%"}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function lerp(a,b,t){return a+(b-a)*t}

/* ---------- icons ---------- */
var IC={
 home:'<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
 dna:'<path d="M7 3c0 5 10 5 10 9s-10 4-10 9"/><path d="M17 3c0 5-10 5-10 9s10 4 10 9"/><path d="M8.5 6.5h7M8.5 17.5h7"/>',
 sig:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
 radar:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><path d="M12 12l6.5-6.5"/>',
 pie:'<path d="M12 3v9h9"/><path d="M21 12A9 9 0 1 1 12 3"/>',
 chev:'<path d="M9 5l7 7-7 7"/>',check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',x:'<path d="M6 6l12 12M18 6L6 18"/>',shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
 star:'<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>',
 trend:'<path d="M3 17l6-6 4 4 8-9"/><path d="M15 6h6v6"/>',
 tag:'<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.2"/>',
 users:'<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6"/><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M18.5 14.5c1.7.8 2.5 2.6 2.5 5.5"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 flag:'<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
 eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
 undo:'<path d="M9 7L4 12l5 5"/><path d="M4 12h10a6 6 0 0 1 0 12"/>',
 play:'<path d="M7 4l13 8-13 8z"/>'
};
function ic(n,s,c,w){return '<svg width="'+(s||20)+'" height="'+(s||20)+'" viewBox="0 0 24 24" fill="none" stroke="'+(c||"currentColor")+'" stroke-width="'+(w||2)+'" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+IC[n]+'</svg>'}
var G={blue:"linear-gradient(145deg,#5AB0FF,#0A6CFF)",green:"linear-gradient(145deg,#5EE08A,#12A150)",purple:"linear-gradient(145deg,#C57BFF,#7B3FE4)",pink:"linear-gradient(145deg,#FF7AA8,#E2275E)",orange:"linear-gradient(145deg,#FFB340,#FF7A00)",teal:"linear-gradient(145deg,#6EE0F0,#0AA3C2)",indigo:"linear-gradient(145deg,#8C8BFF,#4B49E0)",red:"linear-gradient(145deg,#FF7A6E,#E02E24)",grey:"linear-gradient(145deg,#A5A5B0,#6E6E7A)"};
function tile(i,g,sz,lg){return '<span class="tile'+(lg?' lg':'')+'" style="background:'+G[g]+'">'+ic(i,sz||19,"#fff",2.1)+'</span>'}
var GKEYS=["blue","green","purple","pink","orange","teal","indigo"];

/* ---------- sample data (clearly sample) ---------- */
var CONF={W:{label:"Validated edge",win:54,hit:27,n:423,r:0.36,cls:"t-buy",col:"var(--buy)"},
          D:{label:"Promising, not yet proven",win:46,hit:27,n:1945,r:0.16,cls:"t-amb",col:"var(--amber)"}};
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
var PIL=["Quality","Growth","Value","Momentum","Safety","Ownership"];
var PILI=["star","trend","tag","sig","shield","users"],PILG=["blue","green","orange","pink","teal","purple"];
var PILW=[.22,.2,.15,.13,.2,.1];
var PILD=["Does the business earn strong returns on the money put into it?","Are sales and profits growing, and for how long?","Is the price fair for what you get?","Are buyers already pushing it up?","How much debt does it carry, and can it cope with a bad year?","Do promoters and big funds hold on, or are they selling?"];
var DNA=[
 {sym:"TRENT",name:"Trent Ltd",sec:"Retail",p:[86,92,34,84,76,72]},
 {sym:"TITAN",name:"Titan Company",sec:"Consumer",p:[84,78,36,74,82,80]},
 {sym:"BEL",name:"Bharat Electronics",sec:"Defence",p:[80,76,52,82,88,74]},
 {sym:"ITC",name:"ITC Ltd",sec:"FMCG",p:[78,58,66,60,92,70]},
 {sym:"INFY",name:"Infosys",sec:"IT services",p:[82,60,58,52,94,66]},
 {sym:"DIXON",name:"Dixon Technologies",sec:"Electronics",p:[72,90,28,86,62,64]},
 {sym:"SBIN",name:"State Bank of India",sec:"Banking",p:[66,64,72,58,50,60]},
 {sym:"VIKRTEX",name:"Vikram Textiles (sample)",sec:"Textiles",p:[34,40,58,28,26,38]}
];
DNA.forEach(function(d){d.score=Math.round(d.p.reduce(function(a,v,i){return a+v*PILW[i]},0))});
var PX={TRENT:7612,TITAN:3598,BEL:421.9,ITC:451,INFY:1688,DIXON:16215,SBIN:861,VIKRTEX:23.4,POLYCAB:6962,MARUTI:12900,HAL:5080};
var DAY={TRENT:1.4,TITAN:.6,BEL:2.1,ITC:-.3,INFY:-.8,DIXON:2.4,SBIN:.2,VIKRTEX:-1.9};
function dnaOf(s){for(var i=0;i<DNA.length;i++)if(DNA[i].sym===s)return DNA[i];return null}
function sigOf(s){for(var i=0;i<SIGS.length;i++)if(SIGS[i].sym===s)return SIGS[i];return null}
function tone(score){return score>=75?{c:"var(--buy)",t:"Strong",g:"green"}:score>=50?{c:"var(--amber)",t:"Mixed",g:"orange"}:{c:"var(--sell)",t:"Weak",g:"red"}}
function verdict(s){return s>=75?"A strong company. Its numbers support holding through dips.":s>=50?"A decent company with a few gaps. Keep position sizes a little smaller.":"Weak fundamentals. A chart signal here carries more risk. Keep it small or skip it."}
function pilTone(v){return v>=70?"Strong":v>=45?"Okay":"Weak"}
function toneTag(t){return '<span class="tag '+(t.t==="Strong"?"t-buy":t.t==="Mixed"?"t-amb":"t-sell")+'">'+t.t+'</span>'}

var HOLD0=[{sym:"TRENT",qty:12,avg:6890},{sym:"TITAN",qty:20,avg:3340},{sym:"SBIN",qty:150,avg:780},{sym:"INFY",qty:40,avg:1620},{sym:"BEL",qty:300,avg:298}];
var S={view:"home",dnaF:"all",dnaQ:"",sigTab:0,holdings:null,edit:false};
try{var sv=localStorage.getItem("qs-demo-holdings");if(sv){var pv=JSON.parse(sv);if(Array.isArray(pv)&&pv.length)S.holdings=pv}}catch(e){}
if(!S.holdings)S.holdings=HOLD0.slice();
function saveH(){try{localStorage.setItem("qs-demo-holdings",JSON.stringify(S.holdings))}catch(e){}}

/* ---------- svg pieces ---------- */
function ring(score,size,w,white){
  var r=(size-w)/2,c=2*Math.PI*r,t=tone(score),col=white?"#fff":t.c;
  return '<svg class="ringsv" width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'" role="img" aria-label="DNA score '+score+' of 100" style="flex:none"><circle cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" fill="none" stroke="'+(white?"rgba(255,255,255,.28)":"var(--track)")+'" stroke-width="'+w+'"/><circle class="rg" data-c="'+c+'" data-v="'+score+'" cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" fill="none" stroke="'+col+'" stroke-width="'+w+'" stroke-linecap="round" stroke-dasharray="'+c+'" stroke-dashoffset="'+(RM?c*(1-score/100):c)+'" transform="rotate(-90 '+size/2+' '+size/2+')"/><text x="50%" y="51%" text-anchor="middle" dominant-baseline="middle" fill="'+(white?"#fff":"var(--fg)")+'" font-family="-apple-system,BlinkMacSystemFont,Inter,system-ui,sans-serif" font-weight="800" font-size="'+Math.round(size*.34)+'">'+score+'</text></svg>'
}
function radarSvg(p){
  var N=p.length,C=130,R=82,pts=[],grid="",ax="",lab="";
  for(var g=1;g<=4;g++){var q=[];for(var i=0;i<N;i++){var a=-Math.PI/2+i*2*Math.PI/N;q.push((C+Math.cos(a)*R*g/4).toFixed(1)+","+(C+Math.sin(a)*R*g/4).toFixed(1))}grid+='<polygon points="'+q.join(" ")+'" fill="none" stroke="var(--line)"/>'}
  for(var i=0;i<N;i++){var a=-Math.PI/2+i*2*Math.PI/N,v=p[i]/100;pts.push((C+Math.cos(a)*R*v).toFixed(1)+","+(C+Math.sin(a)*R*v).toFixed(1));ax+='<line x1="'+C+'" y1="'+C+'" x2="'+(C+Math.cos(a)*R).toFixed(1)+'" y2="'+(C+Math.sin(a)*R).toFixed(1)+'" stroke="var(--line)"/>';
    var lx=C+Math.cos(a)*(R+26),ly=C+Math.sin(a)*(R+17);lab+='<text x="'+lx.toFixed(1)+'" y="'+ly.toFixed(1)+'" text-anchor="middle" dominant-baseline="middle" font-size="12" font-weight="600" fill="var(--mu)" font-family="-apple-system,BlinkMacSystemFont,Inter,system-ui,sans-serif">'+PIL[i]+'</text>'}
  return '<svg viewBox="0 0 260 260" width="100%" style="max-width:300px;display:block;margin:0 auto" role="img" aria-label="Six pillar radar chart">'+grid+ax+'<polygon points="'+pts.join(" ")+'" fill="color-mix(in srgb,var(--violet) 30%,transparent)" stroke="var(--violet)" stroke-width="2.5" stroke-linejoin="round" style="transform-origin:130px 130px;'+(RM?'':'animation:grow .9s cubic-bezier(.2,.9,.2,1.1) both')+'"/>'+lab+'</svg>'
}
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hash(s){var h=7;for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return h}
function rulerHtml(g){
  var lo=g.stop,hi=g.target,span=hi-lo,e=(g.entry-lo)/span*100,n=clamp((g.now-lo)/span*100,0,100);
  return '<div class="ruler" style="--e:'+e.toFixed(1)+'%"><div class="trk"></div><i style="left:'+e.toFixed(1)+'%"></i><div class="now" style="left:'+n.toFixed(1)+'%"></div>'+
   '<span class="lab" style="left:0">Stop '+px(g.stop)+'</span><span class="lab" style="right:0">Target '+px(g.target)+'</span><span class="lab b" style="left:'+clamp(e,12,88).toFixed(1)+'%">Entry</span></div>'
}
function actTag(a){return a==="BUY"?'<span class="tag t-buy">Buy</span>':a==="EXIT"?'<span class="tag t-sell">Sell / exit</span>':'<span class="tag t-hold">Hold</span>'}
function actG(a){return a==="BUY"?"green":a==="EXIT"?"red":"blue"}
function info(icon,g,color,html){return '<div class="info" style="--c:'+color+'">'+tile(icon,g,19)+'<p>'+html+'</p></div>'}
function page(title,ey,h,lede,g1,g2,body){
  return '<div class="inner in"><div class="glow" style="--g1:'+g1+';--g2:'+g2+'"></div><header class="nav"><b>'+title+'</b></header><div class="lt"><p class="ey">'+ey+'</p><h1>'+h+'</h1>'+(lede?'<p class="lede">'+lede+'</p>':'')+'</div>'+body+'</div>'
}
function sh(t,small,right){return '<div class="sh"><h2>'+t+'</h2>'+(small?'<small>'+small+'</small>':'')+(right||'')+'</div>'}

/* ---------- screens ---------- */
function pickCard(g){
  var c=CONF[g.tf],risk=g.entry-g.stop,sh_=Math.floor(1000000*0.01/risk);
  return '<article class="wgt wg-trade fl press" data-act="sig" data-id="'+g.id+'" tabindex="0" role="button" aria-label="Open plan for '+g.sym+'">'+
  '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px"><div><small class="k">Best trade today · '+(g.tf==="W"?"Weekly chart":"Daily chart")+'</small><div class="big" style="margin-top:8px">'+g.sym+'</div><div style="margin-top:4px;font-size:15px;color:rgba(255,255,255,.88)">'+esc(g.name)+'</div></div><div style="text-align:right"><span class="tag" style="font-size:13px;padding:3px 11px">BUY</span><div class="num" style="margin-top:10px;font:600 15px var(--font)">Now '+px(g.now)+'</div></div></div>'+
  '<p class="sent">Buy near <b class="num">'+px(g.entry)+'</b>. If it falls to <b class="num">'+px(g.stop)+'</b>, leave. Aim for <b class="num">'+px(g.target)+'</b>.</p>'+
  '<div class="lv"><div class="glass"><small>Buy at</small><b class="num">'+px(g.entry)+'</b></div><div class="glass"><small>Stop</small><b class="num">'+px(g.stop)+'</b></div><div class="glass"><small>Target</small><b class="num">'+px(g.target)+'</b></div></div>'+
  rulerHtml(g)+
  '<p style="margin-top:6px;font-size:15px;line-height:1.4;color:rgba(255,255,255,.92)">With ₹10 lakh and a 1% risk limit, that is <b class="num">'+sh_+' shares</b>. You risk about <b class="num">'+inr(sh_*risk)+'</b> to make about <b class="num">'+inr(sh_*risk*2)+'</b>.</p>'+
  '<div class="foot"><span><span class="dot" style="background:#9BFFC1;margin-right:7px"></span><b>'+c.label+'</b> · '+c.win+'% of '+c.n.toLocaleString("en-IN")+' similar trades won</span><span style="flex:none;display:flex;align-items:center;gap:2px;font-weight:700">Plan '+ic("chev",16,"#fff",2.4)+'</span></div></article>'
}
function homeHtml(){
  var t=SIGS[0],o1=SIGS[1],o2=SIGS[2];
  function mini(g){var c=CONF[g.tf];return '<button class="cell" data-act="sig" data-id="'+g.id+'">'+tile("sig",actG(g.action),19)+'<div class="grow"><div class="ttl"><span class="s">'+g.sym+'</span>'+actTag(g.action)+'<span class="tag '+c.cls+'">'+(g.tf==="W"?"Weekly · Validated":"Daily · Unproven")+'</span></div><div class="sub num">Buy '+px(g.entry)+' · Stop '+px(g.stop)+' · Target '+px(g.target)+'</div></div>'+ic("chev",18,"currentColor",2.4).replace('<svg','<svg class="chev"')+'</button>'}
  function story(no,g,grad,title,txt,go,to){return '<button class="story press" style="background:'+grad+'" data-act="go" data-to="'+to+'"><span class="no">Step '+no+'</span><h3>'+title+'</h3><p>'+txt+'</p><span class="go">'+go+' '+ic("chev",16,"#fff",2.6)+'</span></button>'}
  var body=
  '<div class="chips"><span class="chip"><span class="dot" style="background:var(--buy)"></span>NIFTY 50 <b class="num" style="color:var(--fg)">24,812</b><span class="up num">+0.42%</span></span><span class="chip">183 setups tracked</span><span class="chip">1 validated buy</span></div>'+
  '<section class="sec">'+pickCard(t)+'</section>'+
  '<section class="sec">'+sh("Also worth a look","Promising, not yet proven")+'<div class="grp fl">'+mini(o1)+mini(o2)+'</div><p class="note">Daily breakouts are positive in testing but fall just short of our proof bar. They show up here with honest odds, and you decide the size.</p></section>'+
  '<section class="sec">'+sh("New here? Start with these")+'<div class="carousel">'+
   story(1,"","linear-gradient(150deg,#8C5CFF,#C23BA8)","Check the company","DNA is a report card from 0 to 100. Higher means a sturdier business.","Open DNA","dna")+
   story(2,"","linear-gradient(150deg,#12A150,#0A8FA8)","See the call","AI watches charts and says when to buy, hold or sell. Every call has a stop and a target.","Open Signals","signals")+
   story(3,"","linear-gradient(150deg,#E2275E,#FF7A00)","Spot breakouts early","Radar is for chart lovers. It shows stocks close to breaking out of a ceiling.","Open Radar","radar")+
   story(4,"","linear-gradient(150deg,#0A6CFF,#6A3FE0)","Track what you own","Type in your holdings. We check each one against DNA and live signals.","Open Portfolio","portfolio")+
  '</div></section>'+
  '<section class="sec"><article class="wgt wg-odds fl"><small class="k">How honest are the odds?</small><h2 style="margin:6px 0 14px;font:800 24px/1.15 var(--font);letter-spacing:-.02em">Measured, not promised.</h2><div class="stats3"><div class="stile"><small>Won</small><b>54%</b></div><div class="stile"><small>Hit +2R</small><b>27%</b></div><div class="stile"><small>Avg trade</small><b>+0.36R</b></div></div><p style="margin-top:14px;font-size:15px;line-height:1.4;color:rgba(255,255,255,.92)">Weekly breakouts, 423 similar trades since 2019, after costs. Losses are capped at 1R. Winners can run to 2R and beyond. <b>R</b> is the amount you risk, so +2R is twice that.</p></article></section>'+
  '<section class="sec"><button class="btn soft" data-act="replay">'+ic("play",16,"currentColor",2.2)+' Replay the launch film</button><p class="note" style="text-align:center">Demo with sample prices. Not investment advice.</p></section>';
  return page("Today","Sunday, 11 October · Sample data","Today","One strong trade, two to watch, and a few things to check before you buy.","var(--indigo)","var(--pink)",body)
}
function dnaRows(){
  var q=S.dnaQ.trim().toLowerCase();
  var list=DNA.filter(function(d){
    if(S.dnaF==="strong"&&d.score<75)return false; if(S.dnaF==="mixed"&&(d.score<50||d.score>=75))return false; if(S.dnaF==="weak"&&d.score>=50)return false;
    return !q||d.sym.toLowerCase().indexOf(q)>=0||d.name.toLowerCase().indexOf(q)>=0||d.sec.toLowerCase().indexOf(q)>=0}).sort(function(a,b){return b.score-a.score});
  if(!list.length)return '<div class="card pad" style="text-align:center"><h3>No match</h3><p class="mu" style="margin:6px 0 0;font-size:15px">Try a different name, or clear the filter.</p></div>';
  return '<div class="grp">'+list.map(function(d){var t=tone(d.score),sg=sigOf(d.sym);
   return '<button class="cell" data-act="dna" data-sym="'+d.sym+'">'+ring(d.score,48,5)+'<div class="grow"><div class="ttl"><span class="s">'+d.sym+'</span>'+toneTag(t)+(sg?actTag(sg.action):'')+'</div><div class="sub">'+esc(d.name)+' · '+d.sec+'</div></div>'+ic("chev",18,"currentColor",2.4).replace('<svg','<svg class="chev"')+'</button>'}).join("")+'</div>'
}
function dnaHtml(){
  var F=[["all","All"],["strong","Strong"],["mixed","Mixed"],["weak","Weak"]];
  var body=info("shield","purple","var(--violet)","<b>DNA is a report card for a company.</b> We score six things from 0 to 100 and blend them. High score: sturdy. Low score: risky, even if the chart looks good.")+
  '<div class="search">'+ic("search",18,"var(--dim)",2.2)+'<label class="sr" for="dq">Search companies</label><input id="dq" type="search" placeholder="Search a stock or sector" value="'+esc(S.dnaQ)+'" autocomplete="off"></div>'+
  '<div class="chips" role="group" aria-label="Filter by score">'+F.map(function(f){return '<button class="chip" data-act="dnaf" data-f="'+f[0]+'" aria-pressed="'+(S.dnaF===f[0])+'">'+f[1]+'</button>'}).join("")+'</div>'+
  '<div id="dnaList">'+dnaRows()+'</div><p class="note">Sample scores for the demo.</p>';
  return page("DNA","Company health check","Is this a good business?","","var(--violet)","var(--blue)",body)
}
function sigCard(g){
  var c=CONF[g.tf],ch=(g.now/g.entry-1)*100;
  return '<button class="card press fl" style="display:block;width:100%;padding:16px" data-act="sig" data-id="'+g.id+'"><div style="display:flex;align-items:center;gap:12px">'+tile("sig",actG(g.action),19)+'<div class="grow"><div class="ttl"><span class="s">'+g.sym+'</span>'+actTag(g.action)+'<span class="tag t-vio">'+(g.tf==="W"?"Weekly":"Daily")+'</span></div><div class="sub">'+g.state+' · opened '+g.opened+'</div></div><div class="rt"><b class="num">'+px(g.now)+'</b><small class="num '+(ch>=0?"up":"down")+'">'+sgn(ch)+'</small></div></div>'+rulerHtml(g)+
  '<div class="conf"><span class="dot" style="background:'+c.col+'"></span><span>'+c.label+' · '+c.win+'% won</span></div></button>'
}
function closedRow(c){
  var win=c.R>0.05,col=win?"var(--buy)":"var(--sell)";
  return '<button class="cell" data-act="sigc" data-id="'+c.id+'">'+tile(win?"check":"x",win?"green":"red",19)+'<div class="grow"><div class="ttl"><span class="s">'+c.sym+'</span><span class="tag '+(win?"t-buy":"t-sell")+'">'+(win?"Won":"Lost")+'</span><span class="tag t-vio">'+(c.tf==="W"?"Weekly":"Daily")+'</span></div><div class="sub">'+c.why+' · '+c.opened+' to '+c.closed+'</div></div><div class="rt"><b class="num" style="color:'+col+'">'+sgn(c.pct)+'</b><small class="num dimc">'+(c.R>=0?"+":"")+c.R.toFixed(1)+'R</small></div></button>'
}
function signalsHtml(){
  var wins=CLOSED.filter(function(c){return c.R>0.05}).length,tot=CLOSED.length,sumR=CLOSED.reduce(function(a,c){return a+c.R},0);
  var openPL=SIGS.filter(function(g){return g.action!=="EXIT"}).reduce(function(a,g){return a+(g.now/g.entry-1)*100},0)/3;
  var body;
  if(S.sigTab===0){
    body='<div class="stats3 fl"><div class="stile"><small>Open</small><b>'+SIGS.length+'</b></div><div class="stile"><small>Avg move</small><b class="up">'+sgn(openPL)+'</b></div><div class="stile"><small>Sell now</small><b class="down">1</b></div></div><div class="sec">'+SIGS.map(sigCard).join("")+'</div>';
  }else{
    var avgW=CLOSED.filter(function(c){return c.R>0.05}).reduce(function(a,c){return a+c.pct},0)/wins,avgL=CLOSED.filter(function(c){return c.R<=0.05}).reduce(function(a,c){return a+c.pct},0)/(tot-wins);
    body='<div class="wgt wg-val fl" style="display:flex;gap:18px;align-items:center"><div style="flex:none">'+ring(Math.round(wins/tot*100),92,10,true)+'</div><div style="min-width:0"><h3 style="font:800 21px/1.2 var(--font)">'+wins+' of '+tot+' trades won</h3><p style="margin-top:6px;font-size:15px;line-height:1.4;color:rgba(255,255,255,.92)">Wins averaged <b class="num">'+sgn(avgW)+'</b>, losses <b class="num">'+sgn(avgL)+'</b>. Net result <b class="num">'+(sumR>=0?"+":"")+sumR.toFixed(1)+'R</b>.</p></div></div><div class="grp">'+CLOSED.map(closedRow).join("")+'</div><p class="note">Sample record, shown to explain the format. Losing small and winning bigger is the pattern to look for.</p>';
  }
  var b=info("sig","green","var(--buy)","<b>AI reads the chart and gives a plain call.</b> Every call comes with where to get out if you are wrong (the stop) and the odds from past trades. Tap any card for the full plan.")+
  '<div class="seg" data-i="'+S.sigTab+'" role="group" aria-label="Signal list"><span class="knob"></span><button data-act="sigtab" data-i="0" aria-pressed="'+(S.sigTab===0)+'">Active trades</button><button data-act="sigtab" data-i="1" aria-pressed="'+(S.sigTab===1)+'">Closed trades</button></div>'+body;
  return page("AI Signals","Buy · Hold · Sell","What should I do with this stock?","","var(--buy)","var(--blue)",b)
}
function radarHtml(){
  function g(i,gr,t,tc,d){return '<div class="cell">'+tile(i,gr,19)+'<div class="grow"><div class="ttl"><span class="tag '+tc+'">'+t+'</span></div><div class="sub" style="font-size:15px;margin-top:5px">'+d+'</div></div></div>'}
  var b=info("radar","pink","var(--pink)","<b>Radar already exists in the main app,</b> so it is not rebuilt here. This page shows the words it uses, so the rest of the demo reads clearly.")+
  '<div class="grp fl">'+g("clock","grey","Forming","t-mut","A price pattern is still taking shape. Nothing to do yet.")+g("eye","blue","Near","t-hold","Price is just under a ceiling. Be ready, not in.")+g("sig","green","Breakout","t-buy","Price closed clearly above the ceiling. This is the entry moment.")+g("undo","orange","Retest","t-amb","Price came back to touch the old ceiling. Often a second chance, but it has not been shown to beat the first.")+g("flag","red","Failed","t-sell","Price fell back under the ceiling. The idea is wrong. Leave.")+'</div>';
  return page("Radar","For chart lovers","Stocks about to break out.","","var(--pink)","var(--amber)",b)
}
function holdCalc(){
  var rows=S.holdings.map(function(h,i){var p=PX[h.sym]!=null?PX[h.sym]:h.avg,v=p*h.qty,inv=h.avg*h.qty;return {i:i,h:h,p:p,v:v,inv:inv,pl:v-inv,plp:(p/h.avg-1)*100,known:PX[h.sym]!=null}});
  var tv=rows.reduce(function(a,r){return a+r.v},0),ti=rows.reduce(function(a,r){return a+r.inv},0);
  var day=rows.reduce(function(a,r){return a+r.v*((DAY[r.h.sym]||0)/100)},0);
  return {rows:rows,tv:tv,ti:ti,day:day}
}
var PAL=["var(--indigo)","var(--blue)","var(--buy)","var(--amber)","var(--pink)","var(--violet)"];
function portfolioHtml(){
  var c=holdCalc(),R=c.rows.slice().sort(function(a,b){return b.v-a.v});
  var circ=2*Math.PI*52,off=0,arcs="",leg="";
  R.forEach(function(r,i){var f=r.v/c.tv,len=f*circ;arcs+='<circle cx="70" cy="70" r="52" fill="none" stroke="'+PAL[i%6]+'" stroke-width="16" stroke-dasharray="'+Math.max(len-2,0).toFixed(1)+' '+circ.toFixed(1)+'" stroke-dashoffset="'+(-off).toFixed(1)+'" transform="rotate(-90 70 70)"/>';off+=len;
    leg+='<div style="display:flex;align-items:center;gap:8px;font-size:15px"><span class="dot" style="background:'+PAL[i%6]+'"></span><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis">'+esc(r.h.sym)+'</span><b class="num">'+(f*100).toFixed(0)+'%</b></div>'});
  var notes=[],big=R[0];
  if(big&&big.v/c.tv>.3)notes.push(["warn","orange","var(--amber)",'One stock is '+(big.v/c.tv*100).toFixed(0)+'% of your money ('+esc(big.h.sym)+'). A bad day there hurts a lot.']);
  var weak=R.filter(function(r){var d=dnaOf(r.h.sym);return d&&d.score<50});
  if(weak.length)notes.push(["shield","red","var(--sell)",weak.map(function(r){return esc(r.h.sym)}).join(", ")+' scores under 50 on DNA. Check the company before adding more.']);
  var act=R.filter(function(r){return sigOf(r.h.sym)});
  if(act.length)notes.push(["sig","blue","var(--blue)",act.length+' of your stocks have a live AI call: '+act.map(function(r){return esc(r.h.sym)+' ('+sigOf(r.h.sym).action.toLowerCase()+')'}).join(", ")+'.']);
  if(!notes.length)notes.push(["check","green","var(--buy)",'Nothing flagged. Spread looks reasonable.']);
  var rowsH=R.map(function(r){var d=dnaOf(r.h.sym),sg=sigOf(r.h.sym),t=d?tone(d.score):null,gk=GKEYS[Math.abs(hash(r.h.sym))%GKEYS.length];
   return '<div class="cell"><span class="tile" style="background:'+G[gk]+';font:800 15px var(--font)">'+esc(r.h.sym.charAt(0))+'</span><button class="grow" data-act="'+(d?"dna":"none")+'" data-sym="'+esc(r.h.sym)+'"><div class="ttl"><span class="s">'+esc(r.h.sym)+'</span>'+(d?'<span class="tag '+(t.t==="Strong"?"t-buy":t.t==="Mixed"?"t-amb":"t-sell")+'">DNA '+d.score+'</span>':'')+(sg?actTag(sg.action):'')+'</div><div class="sub num">'+r.h.qty+' × '+px(r.h.avg)+(r.known?'':' · price not in demo')+'</div></button><div class="rt"><b class="num">'+inr(r.v)+'</b><small class="num '+(r.pl>=0?"up":"down")+'">'+(r.pl>=0?"+":"-")+inr(Math.abs(r.pl))+' · '+sgn(r.plp)+'</small></div>'+(S.edit?'<button class="done" style="margin:0;background:color-mix(in srgb,var(--sell) 18%,transparent);color:var(--sell)" data-act="rm" data-i="'+r.i+'" aria-label="Remove '+esc(r.h.sym)+'">'+ic("x",16,"currentColor",2.6)+'</button>':'')+'</div>'}).join("");
  var tpl=c.tv-c.ti;
  var b='<article class="wgt wg-val fl"><small class="k">Current value</small><div class="big num" style="margin-top:8px;font-size:40px" data-count="'+Math.round(c.tv)+'">'+inr(c.tv)+'</div><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px"><div class="stile" style="flex:1;min-width:130px"><small>Overall</small><b class="num" style="font-size:19px">'+(tpl>=0?"+":"-")+inr(Math.abs(tpl))+'</b></div><div class="stile" style="flex:1;min-width:130px"><small>Today</small><b class="num" style="font-size:19px">'+(c.day>=0?"+":"-")+inr(Math.abs(c.day))+'</b></div></div></article>'+
  '<div class="card pad fl" style="display:flex;gap:20px;align-items:center;flex-wrap:wrap"><svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label="Allocation by stock" style="flex:none;margin:0 auto">'+arcs+'</svg><div style="flex:1;min-width:150px;display:flex;flex-direction:column;gap:10px">'+leg+'</div></div>'+
  '<section class="sec">'+sh("Health check")+notes.map(function(n){return info(n[0],n[1],n[2],n[3])}).join("")+'</section>'+
  '<section class="sec">'+sh("Holdings","",'<span style="display:flex;gap:8px"><button class="btn sm soft" data-act="edit">'+(S.edit?"Done":"Edit")+'</button><button class="btn sm" data-act="add">'+ic("plus",16,"#fff",2.6)+' Add</button></span>')+'<div class="grp">'+rowsH+'</div></section>'+
  '<p class="note">Prices are sample values. Stocks outside the demo list use your buy price. Saved in this browser only.</p>';
  return page("Portfolio","You type it in, we watch it","What do I own?","","var(--blue)","var(--indigo)",b)
}

/* ---------- details ---------- */
function grab(title){return '<div class="grab" id="grab"><b>'+title+'</b><button class="done" data-act="close" aria-label="Close">'+ic("x",16,"currentColor",2.6)+'</button></div>'}
function sigSheet(g,closed){
  var c=CONF[g.tf],risk=g.entry-g.stop,rp=risk/g.entry*100,end=closed?g.exit:g.now;
  var why=closed?["Entered when price closed clearly above the old ceiling.","Stop sat one ATR under that ceiling, so a failed breakout cost a known amount.",g.why==="Target hit"?"Price reached 2R, twice the amount risked, and the trade closed.":g.why==="Trailing stop"?"Price rose, the stop moved up behind it, and the trade closed with a gain.":"Price fell to the stop. The loss was the amount planned, no more."]:
   g.action==="EXIT"?["Price reached the 2R target at "+px(g.target)+".","Selling now locks in the gain. A stock can keep rising, but this plan said to sell here.","Nothing is owed to the stock. Take the profit and look for the next setup."]:
   g.action==="HOLD"?["Price is between the buy level and the target.","The stop stays at "+px(g.stop)+". Do not lower it.","If price closes under the stop, the AI will turn this into a sell."]:
   ["Closed above "+px(g.level)+", the ceiling it could not cross before, by more than 0.8 ATR (a decisive close).","It sits close to its 52-week high, so few holders are waiting to sell at a loss.","It trades above its long-term average, so the bigger trend agrees."];
  return grab(g.sym)+'<div class="inner" data-sheet-sig="'+g.id+'">'+
  '<div class="lt" style="padding-top:8px"><p class="ey">'+esc(g.name)+' · '+(g.tf==="W"?"Weekly":"Daily")+' chart</p><div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><h1>'+g.sym+'</h1>'+(closed?'<span class="tag '+(g.R>0.05?"t-buy":"t-sell")+'" style="font-size:14px">'+(g.R>0.05?"Won":"Lost")+' '+sgn(g.pct)+'</span>':actTag(g.action))+'</div></div>'+
  '<div class="card" style="padding:12px"><canvas class="chart" id="chart" aria-label="Price chart with entry, stop and target"></canvas><p class="note" style="padding:6px 6px 0">Drag across the chart to read prices. Sample series.</p></div>'+
  '<div class="grp kv"><span>Ceiling it broke</span><b class="num">'+px(g.level)+'</b><span>Buy at</span><b class="num">'+px(g.entry)+'</b><span>Stop (leave here)</span><b class="num down">'+px(g.stop)+'</b><span>Target (2R)</span><b class="num up">'+px(g.target)+'</b><span>'+(closed?"Closed at":"Now")+'</span><b class="num">'+px(end)+'</b><span>Risk per share</span><b class="num">'+px(risk)+' ('+rp.toFixed(1)+'%)</b></div>'+
  '<section class="sec">'+sh("Why the AI says so")+'<div class="card pad"><ul class="why">'+why.map(function(w){return '<li>'+tile("check","green",14,0)+'<span>'+w+'</span></li>'}).join("")+'</ul></div></section>'+
  '<section class="card pad"><h3>How reliable is this?</h3><div class="conf" style="margin:10px 0 14px"><span class="dot" style="background:'+c.col+'"></span><b style="color:var(--fg)">'+c.label+'</b></div>'+
   '<div class="stats3"><div class="stile" style="background:var(--cell2)"><small>Won</small><b>'+c.win+'%</b><div class="mini"><i style="width:'+c.win+'%;background:var(--buy)"></i></div></div><div class="stile" style="background:var(--cell2)"><small>Hit +2R</small><b>'+c.hit+'%</b><div class="mini"><i style="width:'+c.hit+'%;background:var(--violet)"></i></div></div><div class="stile" style="background:var(--cell2)"><small>Avg trade</small><b class="up">+'+c.r.toFixed(2)+'R</b></div></div>'+
   '<p class="mu" style="margin:14px 0 0;font-size:15px;line-height:1.4">Based on '+c.n.toLocaleString("en-IN")+' similar '+(g.tf==="W"?"weekly":"daily")+' breakouts since 2019, after costs. '+(g.tf==="D"?"This setup is positive but has not yet passed our proof bar, so treat it as a smaller bet.":"This setup passed our proof bar in both older and newer years.")+'</p></section>'+
  (closed?'':'<section class="card pad"><h3>How many shares?</h3><p class="mu" style="margin:6px 0 0;font-size:15px">Pick what you can afford to lose on this one trade.</p>'+
   '<div class="fld"><label for="cap">Your capital: <b class="num" id="capv" style="color:var(--fg)">₹10,00,000</b></label><input type="range" id="cap" min="200000" max="5000000" step="100000" value="1000000"></div>'+
   '<div class="fld" style="margin-top:6px"><label for="rk">Risk per trade: <b class="num" id="rkv" style="color:var(--fg)">1.0%</b></label><input type="range" id="rk" min="0.25" max="2" step="0.25" value="1"></div>'+
   '<div class="kv" style="margin:12px -18px -18px;border-radius:0"><span>Shares to buy</span><b class="num" id="shv">-</b><span>Money at risk</span><b class="num down" id="rsv">-</b><span>Money if target hits</span><b class="num up" id="gnv">-</b><span>Cost to buy</span><b class="num" id="cst">-</b></div></section>')+
  '<section class="sec">'+sh("Timeline")+'<div class="card pad"><div class="tl"><div style="--c:var(--blue)"><b>Setup found</b><br>Price pressed against '+px(g.level)+'.</div><div style="--c:var(--buy)"><b>Breakout</b> · '+g.opened+'<br>Closed above the ceiling. Entry '+px(g.entry)+'.</div><div style="--c:'+(closed?(g.R>0.05?"var(--buy)":"var(--sell)"):"var(--amber)")+'"><b>'+(closed?g.why:g.state)+'</b>'+(closed?' · '+g.closed:'')+'<br>'+(closed?'Result '+sgn(g.pct)+' after costs.':'Now '+px(g.now)+'.')+'</div></div></div></section>'+
  '<p class="note">Educational demo with sample prices. Not investment advice.</p></div>'
}
function dnaSheet(d){
  var t=tone(d.score),sg=sigOf(d.sym);
  var best=d.p.map(function(v,i){return [v,i]}).sort(function(a,b){return b[0]-a[0]});
  var grad=t.t==="Strong"?"linear-gradient(150deg,#0E8F63,#0A67D6 70%,#5B3FD8)":t.t==="Mixed"?"linear-gradient(150deg,#D9531E,#C2185B 70%,#7B2CBF)":"linear-gradient(150deg,#C2271B,#8A1C5B)";
  return grab("DNA")+'<div class="inner">'+
  '<div class="lt" style="padding-top:8px"><p class="ey">'+esc(d.name)+' · '+d.sec+'</p><h1>'+d.sym+'</h1></div>'+
  '<div class="wgt" style="background:'+grad+';display:flex;gap:18px;align-items:center"><div style="flex:none">'+ring(d.score,112,12,true)+'</div><div style="min-width:0"><span class="tag" style="font-size:13px">'+t.t+'</span><p class="sent" style="margin-top:10px;font-size:18px">'+verdict(d.score)+'</p></div></div>'+
  '<div class="card" style="padding:16px 10px 10px">'+radarSvg(d.p)+'<p class="note" style="text-align:center;padding:4px 0 4px">Six pillars, each scored 0 to 100.</p></div>'+
  '<section class="sec">'+sh("Pillar by pillar")+'<div class="grp">'+d.p.map(function(v,i){var tt=tone(v);return '<div class="cell" style="align-items:flex-start">'+tile(PILI[i],PILG[i],19)+'<div class="grow"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px"><h3>'+PIL[i]+'</h3><b class="num" style="color:'+tt.c+'">'+v+' · '+pilTone(v)+'</b></div><div class="mini"><i style="width:'+v+'%;background:'+tt.c+'"></i></div><p class="mu" style="margin:9px 0 0;font-size:14px;line-height:1.35">'+PILD[i]+'</p></div></div>'}).join("")+'</div></section>'+
  info("check","green","var(--buy)","<b>Strongest:</b> "+PIL[best[0][1]]+" ("+best[0][0]+"). <b>Weakest:</b> "+PIL[best[5][1]]+" ("+best[5][0]+").")+
  (sg?'<button class="btn" data-act="sig" data-id="'+sg.id+'">See the AI call for '+sg.sym+' '+ic("chev",16,"#fff",2.6)+'</button>':'<p class="note">No live AI call on this stock today.</p>')+
  '<p class="note">DNA never changes a trade call. It tells you how much to trust the company behind the chart.</p></div>'
}

/* ---------- chart ---------- */
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
  var ser=makeSeries(g,closed),dpr=Math.min(window.devicePixelRatio||1,3),ptr=-1,t0=performance.now(),raf=0,alive=true;
  var FONT='-apple-system,BlinkMacSystemFont,Inter,system-ui,sans-serif';
  function css(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim()}
  function draw(now){
    if(!alive)return; var W=cv.clientWidth,H=cv.clientHeight; if(!W){raf=requestAnimationFrame(draw);return}
    if(cv.width!==Math.round(W*dpr)){cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr)}
    var x=cv.getContext("2d");x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,W,H);
    var fg=css("--fg"),dim=css("--dim"),line=css("--line"),buy=css("--buy"),sell=css("--sell"),cy=css("--blue"),vio=css("--indigo");
    var pr=RM?1:clamp((now-t0)/1100,0,1),ease=1-Math.pow(1-pr,3);
    var mn=Math.min(g.stop,Math.min.apply(null,ser.v))*.992,mx=Math.max(g.target,Math.max.apply(null,ser.v))*1.008,pad={l:8,r:60,t:12,b:12},n=ser.v.length;
    function X(i){return pad.l+i/(n-1)*(W-pad.l-pad.r)} function Y(v){return pad.t+(1-(v-mn)/(mx-mn))*(H-pad.t-pad.b)}
    x.font="500 11px "+FONT;x.textBaseline="middle";
    for(var k=0;k<=4;k++){var gv=mn+(mx-mn)*k/4,gy=Y(gv);x.strokeStyle=line;x.lineWidth=.5;x.beginPath();x.moveTo(pad.l,gy);x.lineTo(W-pad.r,gy);x.stroke();x.fillStyle=dim;x.textAlign="left";x.fillText(gv>=1000?Math.round(gv).toLocaleString("en-IN"):gv.toFixed(1),W-pad.r+6,gy)}
    var yE=Y(g.entry),yS=Y(g.stop),yT=Y(g.target);
    x.globalAlpha=.13;x.fillStyle=buy;x.fillRect(X(ser.eI),yT,W-pad.r-X(ser.eI),yE-yT);x.fillStyle=sell;x.fillRect(X(ser.eI),yE,W-pad.r-X(ser.eI),yS-yE);x.globalAlpha=1;
    function hl(y,col,lab,dash){x.strokeStyle=col;x.lineWidth=1.5;x.setLineDash(dash||[]);x.beginPath();x.moveTo(pad.l,y);x.lineTo(W-pad.r,y);x.stroke();x.setLineDash([]);x.fillStyle=col;x.textAlign="left";x.font="700 11px "+FONT;x.fillText(lab,pad.l+4,y-7)}
    hl(Y(g.level),cy,"Ceiling",[5,4]);hl(yT,buy,"Target",[2,3]);hl(yS,sell,"Stop",[2,3]);
    var upto=Math.max(1,Math.floor((n-1)*ease));
    var gr=x.createLinearGradient(0,pad.t,0,H);gr.addColorStop(0,vio);gr.addColorStop(1,"transparent");
    x.beginPath();x.moveTo(X(0),H);for(var i=0;i<=upto;i++)x.lineTo(X(i),Y(ser.v[i]));x.lineTo(X(upto),H);x.closePath();x.globalAlpha=.24;x.fillStyle=gr;x.fill();x.globalAlpha=1;
    x.beginPath();for(var i=0;i<=upto;i++){i?x.lineTo(X(i),Y(ser.v[i])):x.moveTo(X(i),Y(ser.v[i]))}x.strokeStyle=fg;x.lineWidth=2;x.lineJoin="round";x.stroke();
    if(pr>=1){
      x.fillStyle=buy;x.beginPath();x.arc(X(ser.eI),Y(g.entry),5,0,7);x.fill();x.strokeStyle=css("--cell");x.lineWidth=2;x.stroke();
      x.fillStyle=fg;x.textAlign="center";x.font="700 11px "+FONT;x.fillText(closed?"Bought":"Buy",X(ser.eI),Y(g.entry)+17);
      var lx=X(n-1),ly=Y(ser.v[n-1]),pulse=RM?0:(now%1600)/1600;x.strokeStyle=cy;x.globalAlpha=1-pulse;x.lineWidth=2;x.beginPath();x.arc(lx,ly,5+pulse*12,0,7);x.stroke();x.globalAlpha=1;x.fillStyle=cy;x.beginPath();x.arc(lx,ly,5,0,7);x.fill();
    }
    if(ptr>=0){var pi=clamp(Math.round((ptr-pad.l)/(W-pad.l-pad.r)*(n-1)),0,n-1),px_=X(pi),py=Y(ser.v[pi]);x.strokeStyle=dim;x.lineWidth=1;x.beginPath();x.moveTo(px_,pad.t);x.lineTo(px_,H-pad.b);x.stroke();x.fillStyle=fg;x.beginPath();x.arc(px_,py,4,0,7);x.fill();
      var lab=(ser.v[pi]>=1000?Math.round(ser.v[pi]).toLocaleString("en-IN"):ser.v[pi].toFixed(1)),bw=x.measureText(lab).width+18,bx=clamp(px_-bw/2,pad.l,W-pad.r-bw);x.fillStyle=fg;x.beginPath();x.roundRect?x.roundRect(bx,pad.t,bw,22,11):x.rect(bx,pad.t,bw,22);x.fill();x.fillStyle=css("--bg");x.textAlign="left";x.font="700 12px "+FONT;x.fillText(lab,bx+9,pad.t+11)}
    raf=requestAnimationFrame(draw)
  }
  function mv(e){var r=cv.getBoundingClientRect();ptr=e.clientX-r.left}
  cv.addEventListener("pointermove",mv);cv.addEventListener("pointerdown",mv);cv.addEventListener("pointerleave",function(){ptr=-1});
  raf=requestAnimationFrame(draw);CH={stop:function(){alive=false;cancelAnimationFrame(raf)}}
}
function stopChart(){if(CH){CH.stop();CH=null}}
function bindCalc(g){
  var cap=$("#cap"),rk=$("#rk");if(!cap||!rk)return;
  function up(){var c=+cap.value,r=+rk.value,risk=g.entry-g.stop,sh_=Math.max(0,Math.floor(c*r/100/risk));
    $("#capv").textContent=inr(c);$("#rkv").textContent=r.toFixed(2).replace(/0$/,"")+"%";$("#shv").textContent=sh_.toLocaleString("en-IN");$("#rsv").textContent=inr(sh_*risk);$("#gnv").textContent=inr(sh_*risk*2);$("#cst").textContent=inr(sh_*g.entry)}
  cap.addEventListener("input",up);rk.addEventListener("input",up);up()
}

/* ---------- mount & navigation ---------- */
var VIEWS=[["home","Home","home","var(--blue)"],["dna","DNA","dna","var(--violet)"],["signals","Signals","sig","var(--buy)"],["radar","Radar","radar","var(--pink)"],["portfolio","Portfolio","pie","var(--amber)"]];
var BUILD={home:homeHtml,dna:dnaHtml,signals:signalsHtml,radar:radarHtml,portfolio:portfolioHtml};
var screens=$("#screens"),dock=$("#dock"),sheet=$("#sheet"),scrim=$("#scrim"),modal=$("#modal"),dirty=true;
VIEWS.forEach(function(v){var s=document.createElement("section");s.className="screen";s.id="s-"+v[0];s.setAttribute("aria-label",v[1]);screens.appendChild(s)});
dock.innerHTML='<span class="tpill" id="tpill"></span>'+VIEWS.map(function(v){return '<button class="tab" data-act="go" data-to="'+v[0]+'" aria-label="'+v[1]+'">'+ic(v[2],25,"currentColor",1.9)+'<span>'+v[1]+'</span></button>'}).join("");
function render(v,stagger){var el=$("#s-"+v),st=el.scrollTop;el.innerHTML=BUILD[v]();el.scrollTop=st;afterRender(el,stagger)}
function afterRender(el,stagger){
  if(stagger){$$(".inner>*",el).forEach(function(c,i){c.style.setProperty("--i",i)})}
  else{$$(".inner",el).forEach(function(n){n.classList.remove("in")})}
  $$(".rg",el).forEach(function(c){var tgt=+c.getAttribute("data-c")*(1-+c.getAttribute("data-v")/100);if(RM)return;c.style.transition="stroke-dashoffset 1.1s cubic-bezier(.2,.9,.2,1)";requestAnimationFrame(function(){requestAnimationFrame(function(){c.setAttribute("stroke-dashoffset",tgt)})})});
  dirty=true
}
function show(v){
  S.view=v;S.edit=false;$$(".screen").forEach(function(s){s.classList.toggle("on",s.id==="s-"+v)});
  var idx=0;$$(".tab",dock).forEach(function(b,i){if(b.getAttribute("data-to")===v){b.setAttribute("aria-current","page");idx=i}else b.removeAttribute("aria-current")});
  dock.style.setProperty("--t",VIEWS[idx][3]);$("#tpill").style.transform="translateX("+idx*100+"%)";
  render(v,true);var el=$("#s-"+v);el.scrollTop=0;countUp(el);dirty=true
}
function countUp(el){
  if(RM)return;$$("[data-count]",el).forEach(function(n){var to=+n.getAttribute("data-count"),t0=performance.now();(function f(t){var k=clamp((t-t0)/1000,0,1),e=1-Math.pow(1-k,4);n.textContent=inr(to*e);if(k<1)requestAnimationFrame(f)})(t0)})
}
function openSheet(html,after){sheet.innerHTML=html;sheet.scrollTop=0;sheet.style.transform="";sheet.classList.add("open");screens.classList.add("back");afterRender(sheet,false);if(after)after();setTimeout(function(){var b=$(".done",sheet);if(b)b.focus({preventScroll:true})},500)}
function closeSheet(){sheet.classList.remove("open","drag");sheet.style.transform="";screens.classList.remove("back");stopChart();modal.classList.remove("open");scrim.classList.remove("on")}
function openSig(id,closed){
  var g=null;if(closed){CLOSED.forEach(function(c){if(c.id===id){g=Object.assign({},c,{level:c.entry*.99,target:c.entry+2*(c.entry-c.stop),action:"BUY",state:"Closed"})}})}else{g=SIGS.filter(function(s){return s.id===id})[0]}
  if(!g)return;openSheet(sigSheet(g,closed),function(){startChart(g,closed);bindCalc(g)})
}
function openAdd(){
  modal.innerHTML='<h2>Add a holding</h2><p class="mu" style="margin:6px 0 0;font-size:15px">Type what you bought. You can remove it any time.</p>'+
  '<form id="addf" novalidate><div class="fld"><label for="f-sym">Stock symbol</label><input id="f-sym" type="text" list="syms" placeholder="e.g. DIXON" autocomplete="off" autocapitalize="characters" style="text-transform:uppercase"><datalist id="syms">'+DNA.map(function(d){return '<option value="'+d.sym+'">'}).join("")+'</datalist></div>'+
  '<div class="fld"><label for="f-qty">Quantity</label><input id="f-qty" inputmode="numeric" placeholder="10"></div><div class="fld"><label for="f-avg">Average buy price (₹)</label><input id="f-avg" inputmode="decimal" placeholder="1500"></div>'+
  '<p class="err" id="f-err" role="alert"></p><div style="display:flex;gap:10px"><button type="button" class="btn soft" data-act="mclose" style="flex:1">Cancel</button><button type="submit" class="btn" style="flex:1">Add to portfolio</button></div></form>';
  modal.classList.add("open");scrim.classList.add("on");
  setTimeout(function(){var f=$("#f-sym");if(f)f.focus({preventScroll:true})},500);
  $("#addf").addEventListener("submit",function(e){e.preventDefault();
    var sym=$("#f-sym").value.trim().toUpperCase().replace(/[^A-Z0-9&-]/g,""),q=Math.floor(+$("#f-qty").value),a=+$("#f-avg").value,er=$("#f-err");
    if(!sym){er.textContent="Enter a stock symbol.";return} if(!(q>0)){er.textContent="Quantity must be 1 or more.";return} if(!(a>0)){er.textContent="Enter the price you paid per share.";return}
    var ex=S.holdings.filter(function(h){return h.sym===sym})[0];
    if(ex){var tq=ex.qty+q;ex.avg=(ex.avg*ex.qty+a*q)/tq;ex.qty=tq}else S.holdings.push({sym:sym,qty:q,avg:a});
    saveH();closeModal();render("portfolio",false)})
}
function closeModal(){modal.classList.remove("open");if(!sheet.classList.contains("open"))scrim.classList.remove("on")}

document.addEventListener("click",function(e){
  var t=e.target.closest("[data-act]");if(!t)return;var a=t.getAttribute("data-act");
  if(a==="go"){if(sheet.classList.contains("open"))closeSheet();show(t.getAttribute("data-to"))}
  else if(a==="sig")openSig(t.getAttribute("data-id"),false);
  else if(a==="sigc")openSig(t.getAttribute("data-id"),true);
  else if(a==="dna"){var d=dnaOf(t.getAttribute("data-sym"));if(d)openSheet(dnaSheet(d))}
  else if(a==="close")closeSheet();
  else if(a==="dnaf"){S.dnaF=t.getAttribute("data-f");render("dna",false)}
  else if(a==="sigtab"){S.sigTab=+t.getAttribute("data-i");render("signals",false)}
  else if(a==="add")openAdd();
  else if(a==="edit"){S.edit=!S.edit;render("portfolio",false)}
  else if(a==="mclose")closeModal();
  else if(a==="rm"){S.holdings.splice(+t.getAttribute("data-i"),1);saveH();render("portfolio",false)}
  else if(a==="replay"){try{location.reload()}catch(err){}}
});
document.addEventListener("keydown",function(e){
  if(e.key==="Escape"){if(modal.classList.contains("open"))closeModal();else if(sheet.classList.contains("open"))closeSheet()}
  if((e.key==="Enter"||e.key===" ")&&e.target.classList&&e.target.classList.contains("wgt")&&e.target.getAttribute("role")==="button"){e.preventDefault();e.target.click()}
});
scrim.addEventListener("click",function(){if(modal.classList.contains("open"))closeModal();else closeSheet()});
document.addEventListener("input",function(e){if(e.target.id==="dq"){S.dnaQ=e.target.value;$("#dnaList").innerHTML=dnaRows();afterRender($("#dnaList"),false)}});
$("#themeBtn").addEventListener("click",function(){var r=document.documentElement,dark=(r.getAttribute("data-theme")||(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"))==="dark";r.setAttribute("data-theme",dark?"light":"dark");dirty=true});

/* swipe a sheet down to dismiss */
(function(){
  var sy=null,dy=0,t0=0;
  sheet.addEventListener("pointerdown",function(e){var g=e.target.closest&&e.target.closest("#grab");if(!g||e.target.closest(".done"))return;sy=e.clientY;dy=0;t0=performance.now();sheet.classList.add("drag");try{g.setPointerCapture(e.pointerId)}catch(x){}});
  sheet.addEventListener("pointermove",function(e){if(sy===null)return;dy=Math.max(0,e.clientY-sy);sheet.style.transform="translateY("+dy+"px)"});
  function end(){if(sy===null)return;var v=dy/Math.max(1,performance.now()-t0);sheet.classList.remove("drag");sy=null;if(dy>120||v>.6)closeSheet();else sheet.style.transform=""}
  sheet.addEventListener("pointerup",end);sheet.addEventListener("pointercancel",end);
})();

/* ---------- depth engine: material nav, parallax glow, floating cards, pointer sheen ---------- */
function activeScroller(){return sheet.classList.contains("open")?sheet:$("#s-"+S.view)}
function offY(el,root){var y=0;while(el&&el!==root){y+=el.offsetTop;el=el.offsetParent}return y}
var lastTop=-1,lastKey="";
function frame(){
  var sc=activeScroller(),st=sc.scrollTop,vh=sc.clientHeight,key=sc.id+S.view;
  if(!RM&&(dirty||st!==lastTop||key!==lastKey)){
    lastTop=st;lastKey=key;dirty=false;
    var inner=$(".inner",sc);
    if(inner){
      var nav=$(".nav",inner),lt=$(".lt",inner),gl=$(".glow",inner);
      if(nav){var b=clamp((st-40)/26,0,1);nav.style.opacity=b.toFixed(2);nav.style.pointerEvents=b>.5?"auto":"none"}
      if(lt&&!sc.classList.contains("sheet")){var k=st<0?clamp(-st/500,0,.25):0;lt.style.transform=k?"scale("+(1+k).toFixed(3)+")":"";}
      if(gl)gl.style.transform="translate3d(0,"+Math.round(-st*.35)+"px,0)";
      var mid=st+vh*.5;
      $$(".fl",sc).forEach(function(el){var c=offY(el,inner)+el.offsetHeight/2,d=clamp((c-mid)/vh,-1,1),ad=Math.abs(d);
        el.style.translate="0 "+Math.round(d*-9)+"px";el.style.setProperty("--lf",(1-Math.min(ad*1.3,1)).toFixed(2))});
    }
  }
  requestAnimationFrame(frame)
}
document.addEventListener("scroll",function(){dirty=true},true);
window.addEventListener("resize",function(){dirty=true});
document.addEventListener("pointermove",function(e){
  if(RM||e.pointerType!=="mouse")return;var h=e.target.closest&&e.target.closest(".wgt");
  if(h){var r=h.getBoundingClientRect();h.style.setProperty("--gx",((e.clientX-r.left)/r.width*100).toFixed(0)+"%");h.style.setProperty("--gy",((e.clientY-r.top)/r.height*100).toFixed(0)+"%")}
});
var st0=document.createElement("style");st0.textContent="@keyframes grow{from{transform:scale(.3);opacity:0}to{transform:scale(1);opacity:1}}";document.head.appendChild(st0);
show("home");requestAnimationFrame(frame);
})();
