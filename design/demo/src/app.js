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

IC.back='<path d="M15 5l-7 7 7 7"/>';IC.share='<path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>';IC.copy='<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>';

/* ---------- data (sample, clearly labelled) ---------- */
/* p100 = average profit per ₹100 risked, from the measured study (+0.36R weekly, +0.16R daily). */
var CONF={W:{label:"Proven in testing",win:54,hit:27,n:423,p100:36,col:"var(--up)"},
          D:{label:"Promising, not yet proven",win:46,hit:27,n:1945,p100:16,col:"var(--warn)"}};
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
 {sym:"CIPLA",name:"Cipla",tf:"W",entry:1480,stop:1395,exit:1590,opened:"11 Aug",closed:"22 Sep",why:"Stop moved up, closed in profit"},
 {sym:"LT",name:"Larsen & Toubro",tf:"D",entry:3610,stop:3480,exit:3480,opened:"15 Sep",closed:"24 Sep",why:"Stop loss hit"},
 {sym:"INFY",name:"Infosys",tf:"D",entry:1712,stop:1655,exit:1655,opened:"9 Sep",closed:"17 Sep",why:"Stop loss hit"},
 {sym:"ITC",name:"ITC Ltd",tf:"D",entry:462,stop:448,exit:448,opened:"3 Sep",closed:"12 Sep",why:"Stop loss hit"},
 {sym:"DLF",name:"DLF Ltd",tf:"D",entry:842,stop:801,exit:801,opened:"29 Aug",closed:"9 Sep",why:"Stop loss hit"},
 {sym:"IRFC",name:"Indian Railway Finance",tf:"D",entry:142.4,stop:133.9,exit:133.9,opened:"21 Aug",closed:"4 Sep",why:"Stop loss hit"},
 {sym:"BAJFINANCE",name:"Bajaj Finance",tf:"D",entry:7240,stop:6890,exit:6890,opened:"12 Aug",closed:"28 Aug",why:"Stop loss hit"}
];
CLOSED.forEach(function(c){c.R=(c.exit-c.entry)/(c.entry-c.stop);c.pct=(c.exit/c.entry-1)*100-0.25;c.id=c.sym.toLowerCase()});
var PIL=["Quality","Growth","Value","Momentum","Safety","Ownership"],PILW=[.22,.2,.15,.13,.2,.1],PCOL=["var(--p1)","var(--p2)","var(--p3)","var(--p4)","var(--p5)","var(--p6)"];
var PILD=["How much it earns on the money put in","How fast sales and profit are growing","Is the share price fair for what you get","Are buyers already pushing the price up","How much debt, and can it survive a bad year","Do the owners and big funds keep holding"];
var PILGOOD=["It earns strong returns on the money put into it.","Sales and profits have grown steadily for years.","The share price looks fair for what you get.","Buyers are already pushing the price up.","Little debt, so it can ride out a bad year.","Owners and big funds are holding on."];
var PILBAD=["It earns thin returns for its size.","Growth has slowed or been uneven.","The share price is expensive for what you get today.","The price trend is weak right now.","Debt is heavy, so a bad year would hurt.","Big holders have been selling."];
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
  var pr=22+q[5]*.45;d.own=[["Promoters (owners)",pr,"var(--p1)"],["Foreign funds",(100-pr)*.38,"var(--p2)"],["Indian funds",(100-pr)*.34,"var(--p5)"],["Public",(100-pr)*.28,"var(--p6)"]];
});
function xrOf(s){s=String(s).toUpperCase();for(var i=0;i<XR.length;i++)if(XR[i].sym===s)return XR[i];return null}
function sigOf(s){for(var i=0;i<SIGS.length;i++)if(SIGS[i].sym===s)return SIGS[i];return null}
function tone(s){return s>=75?{c:"var(--up)",t:"Strong",k:"buy"}:s>=50?{c:"var(--warn)",t:"Mixed",k:"warn"}:{c:"var(--dn)",t:"Weak",k:"sell"}}
function verdict(s){return s>=75?"A strong business. Its numbers support holding through dips.":s>=50?"A decent business with a few gaps. Buy a little less than usual.":"Weak numbers. Any chart signal here carries more risk. Keep it small or skip it."}
var PAT=[
 {id:"dixon",sym:"DIXON",name:"Dixon Technologies",stage:"Breakout",tf:"D",level:15760,now:16215,tests:4,months:5},
 {id:"bel",sym:"BEL",name:"Bharat Electronics",stage:"Breakout",tf:"D",level:410.5,now:421.9,tests:3,months:4},
 {id:"hal",sym:"HAL",name:"Hindustan Aeronautics",stage:"Near",tf:"W",level:5150,now:5080,tests:3,months:7},
 {id:"cipla",sym:"CIPLA",name:"Cipla",stage:"Near",tf:"D",level:1612,now:1588,tests:5,months:3},
 {id:"lt",sym:"LT",name:"Larsen & Toubro",stage:"Retest",tf:"D",level:3655,now:3672,tests:4,months:6},
 {id:"tatapower",sym:"TATAPOWER",name:"Tata Power",stage:"Forming",tf:"W",level:468,now:441,tests:2,months:9},
 {id:"kpit",sym:"KPITTECH",name:"KPIT Technologies",stage:"Forming",tf:"D",level:1840,now:1702,tests:2,months:2}
];
var STG={Breakout:{cls:"buy",say:"Closed above its ceiling",n:2,ex:"Price just closed above a level it could not cross before."},Near:{cls:"hold",say:"Just under its ceiling",n:27,ex:"Price is close to the level. Be ready, not in."},Retest:{cls:"warn",say:"Back at the old ceiling",n:18,ex:"Price broke out, then came back to the old level."},Forming:{cls:"",say:"Still taking shape",n:130,ex:"A ceiling is forming. Nothing to do yet."}};
function patOdds(p){
  if(p.stage==="Breakout")return CONF[p.tf];
  return {none:true,text:p.stage==="Near"?"Odds apply once it breaks out. Until then, just watch.":p.stage==="Retest"?"Retests have not shown a proven edge in our tests. Watch only.":"Too early to judge. No odds yet."}
}
function p100(c){return "₹"+c.p100+" per ₹100 risked"}

var HOLD0=[{sym:"TRENT",qty:12,avg:6890},{sym:"TITAN",qty:20,avg:3340},{sym:"SBIN",qty:150,avg:780},{sym:"INFY",qty:40,avg:1620},{sym:"BEL",qty:300,avg:298}];
var S={view:"home",xf:"all",xq:"",sigTab:0,pf:"All",holdings:null,edit:false,detail:null};
try{var sv=localStorage.getItem("qs-demo-holdings");if(sv){var pv=JSON.parse(sv);if(Array.isArray(pv)&&pv.length)S.holdings=pv}}catch(e){}
if(!S.holdings)S.holdings=HOLD0.slice();
function saveH(){try{localStorage.setItem("qs-demo-holdings",JSON.stringify(S.holdings))}catch(e){}}

/* ---------- small pieces ---------- */
function chev(){return ic("chev",17,2.4).replace("<svg",'<svg class="chev"')}
function ring(score,size,w){
  var r=(size-w)/2,c=2*Math.PI*r,t=tone(score);
  return '<svg class="mini-ring" width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'" role="img" aria-label="X-Ray score '+score+'"><circle cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" fill="none" stroke="var(--track)" stroke-width="'+w+'"/><circle class="rg" data-c="'+c+'" data-v="'+score+'" cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" fill="none" stroke="'+t.c+'" stroke-width="'+w+'" stroke-linecap="round" stroke-dasharray="'+c+'" stroke-dashoffset="'+(RM?c*(1-score/100):c)+'" transform="rotate(-90 '+size/2+' '+size/2+')" style="transition:stroke-dashoffset 1.2s cubic-bezier(.2,.9,.2,1)"/><text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle" fill="var(--fg)" font-family="-apple-system,BlinkMacSystemFont,Inter,sans-serif" font-weight="700" font-size="'+Math.round(size*.33)+'">'+score+'</text></svg>'
}
function rail(lo,hi,mark,now,ll,rl,ml){
  var e=clamp((mark-lo)/(hi-lo)*100,0,100),n=clamp((now-lo)/(hi-lo)*100,0,100);
  return '<div class="rail" style="--e:'+e.toFixed(1)+'%"><div class="tk"></div>'+(ml?'<i class="mk" style="left:'+e.toFixed(1)+'%"></i><span style="left:'+clamp(e,16,84).toFixed(1)+'%">'+ml+'</span>':'')+'<i class="nw" style="left:'+n.toFixed(1)+'%"></i><span class="l">'+ll+'</span><span class="r">'+rl+'</span></div>'
}
function actPill(a){return a==="BUY"?'<span class="pill buy">Buy</span>':a==="EXIT"?'<span class="pill sell">Sell now</span>':'<span class="pill hold">Hold</span>'}
function tfPill(tf){return '<span class="pill">'+(tf==="W"?"Weekly chart":"Daily chart")+'</span>'}
function sh(t,small,right){return '<div class="sh"><h2>'+t+'</h2>'+(small?'<small>'+small+'</small>':'')+(right||'')+'</div>'}
function words(t,hl){var i=0;return t.split(" ").map(function(w){var g=hl&&hl.indexOf(w.replace(/[.,?]/g,""))>=0;return '<span class="w'+(g?' g':'')+'" style="--i:'+(i++)+'">'+w+'</span>'}).join(" ")}
function cnt(v,fmt,txt){return '<b class="num" data-count="'+v+'" data-fmt="'+fmt+'">'+(RM?txt:fmtv(0,fmt))+'</b>'}
function fmtv(v,f){return f==="pct"?Math.round(v)+"%":f==="rs"?"₹"+Math.round(v):f==="inr"?inr(v):Math.round(v).toLocaleString("en-IN")}

/* ---------- hero art (animated, decorative) ---------- */
function bl(a,b,c){return '<div class="bl" style="--c1:'+a+'"></div><div class="bl" style="--c2:'+b+'"></div><div class="bl" style="--c3:'+c+'"></div>'}
var ART={
 home:function(){var pts=[];for(var x=0;x<=340;x+=10){var y=150-x*.22+Math.sin(x/17)*12+(x>230?-(x-230)*.35:0);pts.push(x+","+y.toFixed(1))}
  return bl("var(--ax)","var(--ai)","var(--pt)")+'<div class="dots"></div><svg class="bg" viewBox="0 0 340 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><polyline class="drawloop" pathLength="1" points="'+pts.join(" ")+'" fill="none" stroke="var(--fg)" stroke-opacity=".35" stroke-width="2" stroke-linejoin="round"/></svg>'+
  '<div class="chipf" style="left:6%;top:12%;animation-delay:-1s">'+ring(76,32,3.5)+'<div>Stock X-Ray<small>Trent · strong company</small></div></div>'+
  '<div class="chipf" style="right:5%;top:40%;animation-delay:-3s"><span class="dot" style="background:var(--up);width:9px;height:9px"></span><div>AI Call · Buy<small>TRENT near ₹7,420</small></div></div>'+
  '<div class="chipf" style="left:12%;bottom:10%;animation-delay:-4.6s"><svg width="44" height="24" viewBox="0 0 44 24" aria-hidden="true"><path d="M2 20L9 15 15 18 22 11 28 14 34 10 42 2" fill="none" stroke="var(--pt)" stroke-width="2" stroke-linecap="round"/><path d="M2 9H42" stroke="var(--pt)" stroke-dasharray="2 3"/></svg><div>Pattern Call<small>DIXON broke out</small></div></div>'},
 xray:function(){var o="",at=0,arcs="";for(var i=0;i<60;i++){var a=i*6*Math.PI/180,l=i%5?3:6;o+='<line x1="'+(100+Math.cos(a)*(96-l)).toFixed(1)+'" y1="'+(100+Math.sin(a)*(96-l)).toFixed(1)+'" x2="'+(100+Math.cos(a)*96).toFixed(1)+'" y2="'+(100+Math.sin(a)*96).toFixed(1)+'" stroke="var(--fg)" stroke-opacity="'+(i%5?.25:.6)+'" stroke-width="1"/>'}
  var v=[86,92,34,84,76,72];PILW.forEach(function(w,i){var L=w*100-2,f=L*v[i]/100;arcs+='<circle cx="100" cy="100" r="78" pathLength="100" fill="none" stroke="var(--track)" stroke-width="9" stroke-dasharray="'+L+' '+(100-L)+'" stroke-dashoffset="'+(-at+25)+'"/><circle class="arcin" style="--l:'+f.toFixed(1)+';--i:'+i+'" cx="100" cy="100" r="78" pathLength="100" fill="none" stroke="'+PCOL[i]+'" stroke-width="9" stroke-linecap="round" stroke-dashoffset="'+(-at+25)+'"/>';at+=w*100});
  return bl("var(--ax)","var(--p2)","var(--p4)")+'<div class="dots"></div><svg viewBox="0 0 200 200" style="position:absolute;left:50%;top:50%;height:88%;transform:translate(-50%,-50%)" aria-hidden="true"><g class="spin">'+o+'</g>'+arcs+'<text x="100" y="104" text-anchor="middle" font-family="-apple-system,Inter,sans-serif" font-size="42" font-weight="750" fill="var(--fg)">76</text><text x="100" y="126" text-anchor="middle" font-family="-apple-system,Inter,sans-serif" font-size="11" font-weight="600" fill="var(--dim)">X-RAY SCORE</text></svg><div class="scan"></div>'},
 calls:function(){var pts=[];for(var x=0;x<=320;x+=8){var y=x<170?118+Math.sin(x/11)*9+Math.cos(x/5)*3:118-(x-170)*.42+Math.sin(x/9)*5;pts.push(x+","+y.toFixed(1))}var ex=170,ey=118;
  return bl("var(--ai)","var(--p2)","var(--ai)")+'<div class="dots"></div><svg class="bg" viewBox="0 0 340 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'+
  '<line x1="0" x2="340" y1="48" y2="48" stroke="var(--up)" stroke-dasharray="4 5" stroke-opacity=".8"/><text x="330" y="40" text-anchor="end" font-size="10" font-weight="600" fill="var(--up)" font-family="-apple-system,Inter,sans-serif">TARGET</text>'+
  '<line x1="0" x2="340" y1="160" y2="160" stroke="var(--dn)" stroke-dasharray="4 5" stroke-opacity=".8"/><text x="330" y="176" text-anchor="end" font-size="10" font-weight="600" fill="var(--dn)" font-family="-apple-system,Inter,sans-serif">STOP LOSS</text>'+
  '<polyline class="drawloop" pathLength="1" points="'+pts.join(" ")+'" fill="none" stroke="var(--ai)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>'+
  '<g class="popin" style="transform-origin:'+ex+'px '+ey+'px"><circle cx="'+ex+'" cy="'+ey+'" r="5" fill="var(--ai)"/><rect x="'+(ex-24)+'" y="'+(ey-34)+'" width="48" height="22" rx="11" fill="var(--ai)"/><text x="'+ex+'" y="'+(ey-19)+'" text-anchor="middle" font-size="11" font-weight="700" fill="var(--bg)" font-family="-apple-system,Inter,sans-serif">BUY</text></g>'+
  '<path class="twk" d="M60 40l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="var(--ai)"/><path class="twk" style="animation-delay:-1.4s" d="M285 92l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="var(--fg)" opacity=".7"/></svg>'},
 patterns:function(){var b="",tops=[136,120,128,104,96,110,92,86,100,90,84,88,82,80,58,40],x=18,i;for(i=0;i<16;i++){var up=i>=14,h=170-tops[i];b+='<rect class="pbar2'+(up?' glowb':'')+'" style="--i:'+i+'" x="'+x+'" y="'+tops[i]+'" width="12" height="'+h+'" rx="3" fill="'+(up?"var(--pt)":"var(--fg)")+'" fill-opacity="'+(up?1:.22)+'"/>';x+=19.5}
  return bl("var(--pt)","var(--p4)","var(--pt)")+'<div class="dots"></div><svg class="bg" viewBox="0 0 340 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'+b+'<line class="dash" x1="0" x2="340" y1="78" y2="78" stroke="var(--pt)" stroke-width="2"/><text x="12" y="70" font-size="10.5" font-weight="700" fill="var(--pt)" font-family="-apple-system,Inter,sans-serif">CEILING</text></svg>'},
 portfolio:function(){var seg=[[27,"var(--p1)"],[26,"var(--p2)"],[19,"var(--p5)"],[15,"var(--p3)"],[13,"var(--p4)"]],at=0,c="";seg.forEach(function(s){c+='<circle cx="100" cy="100" r="62" pathLength="100" fill="none" stroke="'+s[1]+'" stroke-width="18" stroke-dasharray="'+(s[0]-1.5)+' '+(101.5-s[0])+'" stroke-dashoffset="'+(-at)+'"/>';at+=s[0]});
  return bl("var(--pf)","var(--p1)","var(--p5)")+'<div class="dots"></div><svg viewBox="0 0 200 200" style="position:absolute;left:50%;top:50%;height:86%;transform:translate(-50%,-50%)" aria-hidden="true"><g class="spin" style="animation-duration:60s">'+c+'</g><text x="100" y="98" text-anchor="middle" font-family="-apple-system,Inter,sans-serif" font-size="22" font-weight="750" fill="var(--fg)">₹4.87L</text><text x="100" y="118" text-anchor="middle" font-family="-apple-system,Inter,sans-serif" font-size="10.5" font-weight="600" fill="var(--dim)">5 HOLDINGS</text></svg>'+
  '<div class="chipf" style="left:5%;top:14%;animation-delay:-2s"><span class="dot" style="background:var(--up)"></span>TRENT +10.5%</div><div class="chipf" style="right:5%;bottom:14%;animation-delay:-4s"><span class="dot" style="background:var(--ai)"></span>2 live AI calls</div>'}
};
function hero(key,acc,label,icon,ey,h,hl,lede,extra){
  return '<header class="nav">'+(icon?ic(icon,17,2.2):'')+label+'</header><div class="hero"><div class="art">'+ART[key]()+'</div><div class="hcopy"><p class="ey'+(icon?'':' n')+'">'+(icon?ic(icon,16,2.2):'')+ey+'</p><h1 class="ht">'+words(h,hl)+'</h1><p class="lede" style="--i:'+h.split(" ").length+'">'+lede+'</p>'+(extra||'')+'</div></div>'
}

/* ---------- HOME ---------- */
function topCall(g){
  var c=CONF[g.tf],ch=(g.now/g.entry-1)*100;
  return '<article class="card top press jl" data-act="sig" data-id="'+g.id+'" tabindex="0" role="button" aria-label="Open the plan for '+g.sym+'">'+
   '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px"><div style="min-width:0"><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">'+actPill(g.action)+tfPill(g.tf)+'</div><div class="sym">'+g.sym+'</div><div class="t2" style="font-size:15px">'+esc(g.name)+'</div></div>'+
   '<div class="rt"><small class="dim" style="font-size:12px">Price now</small><b class="num" style="font-size:20px">'+px(g.now)+'</b><small class="num up">'+sgn(ch)+' since the call</small></div></div>'+
   '<p class="quote">It just broke above a price it could not cross for months, and the bigger trend agrees.</p>'+
   '<div class="lv3"><div><small>Buy near</small><b class="num">'+px(g.entry)+'</b></div><div><small>Exit if it falls to</small><b class="num dn">'+px(g.stop)+'</b></div><div><small>Take profit at</small><b class="num up">'+px(g.target)+'</b></div></div>'+
   rail(g.stop,g.target,g.entry,g.now,"Exit","Profit","Bought")+
   '<div class="foot"><span><span class="dot" style="background:'+c.col+';margin-right:8px"></span><b>'+c.label+'</b> · '+c.win+'% of '+c.n+' similar trades made money</span><span class="lnk" style="--acc:var(--ai);flex:none">Full plan'+ic("chev",15,2.6)+'</span></div></article>'
}
function homeHtml(){
  function prod(icon,col,name,txt,meta,to){return '<button class="row prod" data-act="go" data-to="'+to+'"><span class="ico" style="--c:'+col+'">'+ic(icon,21,2.1)+'</span><div class="grow"><h3>'+name+'</h3><p>'+txt+'</p><div class="meta" style="--c:'+col+'">'+meta+'</div></div>'+chev()+'</button>'}
  function mini(g){var c=CONF[g.tf];return '<button class="row ind" data-act="sig" data-id="'+g.id+'"><span class="av">'+g.sym.slice(0,2)+'</span><div class="grow"><div class="t1">'+g.sym+actPill(g.action)+'</div><div class="t2">'+(g.tf==="W"?"Weekly":"Daily")+' chart · '+c.win+'% of similar trades made money</div></div>'+chev()+'</button>'}
  return '<div class="inner" style="--acc:var(--ax)">'+hero("home","","Today","","<span class='live'><i></i>Markets closed · Sample data</span>","Find what is worth buying today.",["worth","buying"],
   "QuantSync does the research for you. It checks the company, reads the chart and looks at years of history, then shows you the few trades worth your money.",
   '<div class="hstats hx" style="--i:9"><div>'+cnt(1445,"int","1,445")+'<small>stocks checked every day</small></div><div>'+cnt(3,"int","3")+'<small>open buy calls</small></div><div>'+cnt(54,"pct","54%")+'<small>of tested trades made money</small></div></div>')+
  '<section class="sec en">'+sh("Today’s top call","Proven in testing")+topCall(SIGS[0])+'</section>'+
  '<section class="sec en">'+sh("Three ways to find a trade")+'<div class="list jl">'+
    prod("xray","var(--ax)","Stock X-Ray","Is it a good company? Search any stock and get one score from 0 to 100.","Start with any name you know","xray")+
    prod("ai","var(--ai)","AI Calls","When to buy and when to sell. Every call shows where to get out if it goes wrong.","3 open buy calls today","calls")+
    prod("pat","var(--pt)","Pattern Calls","For chart lovers. Breakouts found in every chart, ranked by how often they worked before.","27 stocks close to a breakout","patterns")+
    prod("pie","var(--pf)","Portfolio","Type in what you own. We check each stock and warn you early.","5 stocks tracked","portfolio")+
  '</div></section>'+
  '<section class="sec en">'+sh("Also worth a look","Promising, not yet proven")+'<div class="list jl">'+mini(SIGS[1])+mini(SIGS[2])+'</div><p class="note">These daily-chart calls did well in testing but have not yet passed our full proof test, so buy a smaller amount.</p></section>'+
  '<section class="sec en"><button class="btn soft w" data-act="replay">'+ic("play",15,2.2)+' Replay the launch film</button><p class="note" style="text-align:center">Demo with sample prices. Not investment advice.</p></section></div>'
}

/* ---------- STOCK X-RAY ---------- */
function xrRows(list){
  if(!list.length)return '<div class="card pad" style="text-align:center"><h3>No match in the demo</h3><p class="mu" style="margin:6px 0 0;font-size:15px">The live app covers every NSE stock. Here, try TRENT, Infosys or banks.</p></div>';
  return '<div class="list jl">'+list.map(function(d){var t=tone(d.score),sg=sigOf(d.sym);
   return '<button class="row ind" data-act="xr" data-sym="'+d.sym+'">'+ring(d.score,42,4.5)+'<div class="grow"><div class="t1">'+d.sym+'<span class="pill '+t.k+'">'+t.t+'</span>'+(sg?actPill(sg.action):'')+'</div><div class="t2">'+esc(d.name)+' · '+d.sec+'</div></div>'+chev()+'</button>'}).join("")+'</div>'
}
function xrFilter(){var f=S.xf;return XR.filter(function(d){return f==="all"||(f==="strong"&&d.score>=75)||(f==="mixed"&&d.score>=50&&d.score<75)||(f==="weak"&&d.score<50)}).sort(function(a,b){return b.score-a.score})}
function xrayHtml(){
  var top=XR.slice().sort(function(a,b){return b.score-a.score}).slice(0,6),F=[["all","All"],["strong","Strong"],["mixed","Mixed"],["weak","Weak"]];
  return '<div class="inner" style="--acc:var(--ax)">'+hero("xray","","Stock X-Ray","xray","Stock X-Ray","Is it a good company? Find out in seconds.",["good","company?"],
   "Search any stock. X-Ray runs six checks a careful analyst would, and gives you one score from 0 to 100.",
   '<div class="srch hx" style="--i:10;margin-top:18px"><label class="sbox">'+ic("search",22,2.3)+'<span class="sr">Search a company</span><input id="xq" type="search" autocomplete="off" placeholder="Search a company" value="'+esc(S.xq)+'"></label><div class="sug" id="sug" hidden></div></div><div class="chips hx" style="--i:11;margin-top:12px">'+["TRENT","Infosys","Defence","Banks","Retail"].map(function(q){return '<button class="chip" data-act="xqf" data-q="'+q+'">'+q+'</button>'}).join("")+'</div>')+
  '<section class="sec en">'+sh("What one X-Ray tells you")+'<div class="steps"><div><i>1</i><b>Health score</b><small>One number made from six checks.</small></div><div><i>2</i><b>Five years</b><small>Sales and profit, year by year.</small></div><div><i>3</i><b>Who owns it</b><small>Owners, big funds and the public.</small></div></div></section>'+
  '<section class="sec en">'+sh("Strongest companies today")+'<div class="scroller">'+top.map(function(d){var t=tone(d.score);return '<button class="fcard press" data-act="xr" data-sym="'+d.sym+'">'+ring(d.score,48,5)+'<div><b>'+d.sym+'</b><small>'+d.sec+'</small></div><span class="pill '+t.k+'" style="align-self:flex-start">'+t.t+'</span></button>'}).join("")+'</div></section>'+
  '<section class="sec en">'+sh("Browse all")+'<div class="seg" data-n="4" id="xseg" role="group" aria-label="Filter by score"><span class="knob"></span>'+F.map(function(f){return '<button data-act="xf" data-f="'+f[0]+'" aria-pressed="'+(S.xf===f[0])+'">'+f[1]+'</button>'}).join("")+'</div><div id="xlist">'+xrRows(xrFilter())+'</div><p class="note">Demo scores and figures. The live app covers every NSE stock.</p></section></div>'
}
function sugHtml(q){
  q=q.trim().toLowerCase();if(!q)return "";
  var m=XR.filter(function(d){return d.sym.toLowerCase().indexOf(q)>=0||d.name.toLowerCase().indexOf(q)>=0||d.sec.toLowerCase().indexOf(q)>=0||(q.indexOf("bank")===0&&d.sec==="Banking")});
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
    if(i===n-1)o+='<text class="v" x="'+(x+bw/2).toFixed(1)+'" y="'+(h-pb-bh-6).toFixed(1)+'" text-anchor="middle">'+fmt(s[i])+'</text>'});
    o+='<text x="'+cx.toFixed(1)+'" y="'+(h-6)+'" text-anchor="middle">'+l+'</text>'});
  return o+'</svg>'
}
function waterfall(d){
  var R=d.rev[4],op=R*d.opm/100,np=d.np[4],tax=np*.33,di=op-np-tax;
  var S_=[["Sales",0,R,"var(--p2)"],["Costs",op,R,"var(--dn)"],["Op. profit",0,op,"var(--p2)"],["Interest etc.",op-di,op,"var(--dn)"],["Tax",np,np+tax,"var(--dn)"],["Net profit",0,np,"var(--up)"]];
  var W=340,h=210,m=R*1.08,o='<svg class="svgc" viewBox="0 0 '+W+' '+h+'" role="img" aria-label="From sales to net profit">';
  S_.forEach(function(s,i){var x=4+i*56,y1=20+(1-s[2]/m)*162,y2=20+(1-s[1]/m)*162;
    o+='<rect class="b" x="'+x+'" y="'+y1.toFixed(1)+'" width="44" height="'+Math.max(3,y2-y1).toFixed(1)+'" rx="4" fill="'+s[3]+'" opacity=".9" style="transition-delay:'+(i*90)+'ms"/><text class="v" x="'+(x+22)+'" y="'+(y1-6).toFixed(1)+'" text-anchor="middle">'+(s[3]==="var(--dn)"?"−":"")+Math.round(s[2]-s[1]).toLocaleString("en-IN")+'</text><text x="'+(x+22)+'" y="'+(h-6)+'" text-anchor="middle">'+s[0]+'</text>'});
  return o+'</svg>'
}
function pbar(back,title){return '<div class="pbar"><button class="bk" data-act="back" aria-label="Back to '+back+'">'+ic("back",22,2.4)+back+'</button><span class="tt">'+title+'</span><button class="sb" data-act="share" aria-label="Share this page">'+ic("share",18,2.2)+'</button></div>'}
function xrPage(d){
  var t=tone(d.score),sg=sigOf(d.sym),ord=d.p.map(function(v,i){return [v,i]}).sort(function(a,b){return b[0]-a[0]});
  var FY=["FY22","FY23","FY24","FY25","FY26"];
  return '<div class="inner" style="--acc:var(--ax)">'+pbar("X-Ray",d.sym)+
  '<div class="dhead play"><p class="ey">'+ic("xray",16,2.2)+'Stock X-Ray report · '+d.sec+'</p><h1>'+words(esc(d.name),[])+'</h1></div>'+
  '<div class="card pad jl en"><div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><span class="price num">'+px(d.price)+'</span><b class="num '+(d.chg>=0?"up":"dn")+'">'+sgn(d.chg,2)+' today</b></div>'+
   rail(d.lo,d.hi,d.price,d.price,"1-year low "+px(d.lo),"1-year high "+px(d.hi),"")+
   '<div class="dial"><div>'+dialSvg(d)+'</div><div class="c"><b class="num" data-count="'+d.score+'" data-fmt="int">'+(RM?d.score:0)+'</b><span>X-Ray score out of 100</span></div></div>'+
   '<p style="text-align:center;margin:6px 0 12px"><span class="pill '+t.k+'">'+t.t+' company</span></p><p class="quote" style="text-align:center;margin:0 auto 16px;max-width:30ch">'+verdict(d.score)+'</p>'+
   '<ul class="leg">'+d.p.map(function(v,i){return '<li><i style="background:'+PCOL[i]+'"></i><span>'+PIL[i]+'<small>'+PILD[i]+'</small></span><b class="num">'+v+'<span> /100</span></b></li>'}).join("")+'</ul></div>'+
  '<div class="g2">'+
  '<section class="sec en">'+sh("In short")+'<div class="card pad"><ul class="why"><li>'+ic("check",18,2.6,"var(--up)")+'<span><b style="color:var(--fg)">'+PIL[ord[0][1]]+'.</b> '+PILGOOD[ord[0][1]]+'</span></li><li>'+ic("check",18,2.6,"var(--up)")+'<span><b style="color:var(--fg)">'+PIL[ord[1][1]]+'.</b> '+PILGOOD[ord[1][1]]+'</span></li><li>'+ic("warn",18,2.2,"var(--warn)")+'<span><b style="color:var(--fg)">Watch '+PIL[ord[5][1]].toLowerCase()+'.</b> '+PILBAD[ord[5][1]]+'</span></li></ul></div></section>'+
  '<section class="sec en">'+sh("Key facts")+'<div class="list kv"><span>Company size<small>Total value of all shares</small></span><b class="num">'+cr(d.mcap)+'</b><span>Price to earnings<small>Years of profit you pay for</small></span><b class="num">'+d.pe.toFixed(1)+'</b><span>Return on capital<small>Profit on money put in</small></span><b class="num">'+d.roce.toFixed(1)+'%</b><span>Debt to equity<small>Below 0.5 is comfortable</small></span><b class="num">'+d.de.toFixed(2)+'</b><span>Dividend yield<small>Cash paid out each year</small></span><b class="num">'+d.dy.toFixed(1)+'%</b></div></section>'+
  '<section class="sec en">'+sh("Who owns it")+'<div class="card pad"><div class="own">'+d.own.map(function(o,i){return '<i style="width:'+o[1].toFixed(1)+'%;background:'+o[2]+';transition-delay:'+(i*80)+'ms"></i>'}).join("")+'</div><div class="lg2">'+d.own.map(function(o){return '<span><i style="background:'+o[2]+'"></i>'+o[0]+'<b class="num">'+o[1].toFixed(1)+'%</b></span>'}).join("")+'</div></div></section>'+
  '<section class="sec en">'+sh("From sales to profit","Last year · ₹ crore")+'<div class="card pad">'+waterfall(d)+'</div></section>'+
  '<section class="sec en span">'+sh("Five years","₹ crore")+'<div class="card pad"><div style="display:flex;gap:16px;margin-bottom:10px;font-size:13px;color:var(--mu)"><span><span class="dot" style="background:var(--p2);margin-right:6px"></span>Sales</span><span><span class="dot" style="background:var(--up);margin-right:6px"></span>Net profit</span></div>'+barsSvg(FY,[d.rev,d.np],["var(--p2)","var(--up)"],function(v){return Math.round(v).toLocaleString("en-IN")})+'</div></section></div>'+
  (sg?'<button class="btn w acc en" style="--acc:var(--ai)" data-act="sig" data-id="'+sg.id+'">'+ic("ai",17,2.2)+' See the AI call on '+sg.sym+'</button>':'<p class="note">No live AI call on this stock today.</p>')+
  '<p class="note">Demo figures, not real company data. X-Ray never changes a trade call. It tells you how much to trust the company behind the chart.</p></div>'
}

/* ---------- AI CALLS ---------- */
function sigCard(g){
  var c=CONF[g.tf],ch=(g.now/g.entry-1)*100;
  return '<button class="card pad press jl en" style="display:block;width:100%;text-align:left" data-act="sig" data-id="'+g.id+'"><div style="display:flex;align-items:flex-start;gap:12px"><div class="grow"><div class="t1" style="font-size:18px">'+g.sym+actPill(g.action)+tfPill(g.tf)+'</div><div class="t2">'+esc(g.name)+' · '+g.state+'</div></div><div class="rt"><b class="num">'+px(g.now)+'</b><small class="num '+(ch>=0?"up":"dn")+'">'+sgn(ch)+'</small></div></div>'+
  rail(g.stop,g.target,g.entry,g.now,"Exit "+px(g.stop),"Profit "+px(g.target),"Bought")+
  '<div class="odds"><span><span class="dot" style="background:'+c.col+';margin-right:7px"></span>'+c.label+'</span><b>'+c.win+'% made money</b></div></button>'
}
function closedRow(c){
  var win=c.R>0.05;
  return '<button class="row ind" data-act="sigc" data-id="'+c.id+'"><span class="ico sm" style="--c:'+(win?"var(--up)":"var(--dn)")+'">'+ic(win?"check":"x",17,2.6)+'</span><div class="grow"><div class="t1">'+c.sym+'<span class="pill">'+(c.tf==="W"?"Weekly":"Daily")+'</span></div><div class="t2">'+c.why+' · '+c.opened+' to '+c.closed+'</div></div><div class="rt"><b class="num '+(win?"up":"dn")+'">'+sgn(c.pct)+'</b><small class="dim">'+(win?"profit":"loss")+'</small></div></button>'
}
function callsHtml(){
  var wins=CLOSED.filter(function(c){return c.R>0.05}),tot=CLOSED.length,avgW=wins.reduce(function(a,c){return a+c.pct},0)/wins.length,ls=CLOSED.filter(function(c){return c.R<=0.05}),avgL=ls.reduce(function(a,c){return a+c.pct},0)/ls.length;
  var body=S.sigTab===0?'<div class="g2">'+SIGS.map(sigCard).join("")+'</div>':
   '<div class="proof jl en"><div><b class="num">'+wins.length+' of '+tot+'</b><small>trades made money</small></div><div><b class="num up">'+sgn(avgW)+'</b><small>average winning trade</small></div><div><b class="num dn">'+sgn(avgL)+'</b><small>average losing trade</small></div></div><div class="list jl en">'+CLOSED.map(closedRow).join("")+'</div><p class="note">Sample record. Losses stay small because every call has an exit price. Wins are bigger. That is the pattern to look for.</p>';
  return '<div class="inner" style="--acc:var(--ai)">'+hero("calls","","AI Calls","ai","AI Calls","Know when to buy, and when to sell.",["buy,","sell."],
   "Our AI tests several strategies on years of NSE history and only calls the ones that held up. Every call tells you where to buy, where to get out if it goes wrong, and where to take profit.",
   '<div class="hstats hx" style="--i:10;margin-top:18px"><div>'+cnt(54,"pct","54%")+'<small>of tested trades made money</small></div><div>'+cnt(36,"rs","₹36")+'<small>average profit per ₹100 risked</small></div><div>'+cnt(423,"int","423")+'<small>past trades checked</small></div></div><p class="note hx" style="--i:11;margin-top:10px">Weekly-chart calls, 2019 to 2026, after costs.</p>')+
  '<div class="seg en" data-n="2" id="sseg" role="group" aria-label="Which calls"><span class="knob"></span><button data-act="sigtab" data-i="0" aria-pressed="'+(S.sigTab===0)+'">Open calls · '+SIGS.length+'</button><button data-act="sigtab" data-i="1" aria-pressed="'+(S.sigTab===1)+'">Closed · '+tot+'</button></div>'+
  '<div id="sbody" class="sec">'+body+'</div></div>'
}
function callPage(g,closed){
  var c=CONF[g.tf],risk=g.entry-g.stop,end=closed?g.exit:g.now;
  var why=closed?["Bought when the price closed clearly above its old ceiling.","The exit price sat just under that ceiling, so a failed breakout cost a known, small amount.",g.R>0.05?"The price rose and the trade closed with a profit of "+sgn(g.pct)+".":"The price fell to the exit price. The loss was the planned amount, no more."]:
   g.action==="EXIT"?["The price reached the profit target.","Selling now locks in the gain. The plan said to sell here.","Take the profit and look for the next trade."]:
   g.action==="HOLD"?["The price is between the buy price and the target.","Keep the exit price where it is. Do not lower it.","If the price closes below the exit price, this becomes a sell."]:
   ["It closed above "+px(g.level)+", a price it could not cross before, by a clear margin.","It is near its 1-year high, so few people are waiting to sell at a loss.","The long-term trend is up too."];
  return '<div class="inner" style="--acc:var(--ai)">'+pbar("AI Calls",g.sym)+
  '<div class="dhead play"><p class="ey">'+ic("ai",16,2.2)+'AI Call · '+(g.tf==="W"?"Weekly":"Daily")+' chart</p><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><h1>'+words(g.sym,[])+'</h1>'+(closed?'<span class="pill '+(g.R>0.05?"buy":"sell")+'">'+(g.R>0.05?"Profit ":"Loss ")+sgn(g.pct)+'</span>':actPill(g.action))+'</div><p class="lede" style="margin-top:4px">'+esc(g.name)+'</p></div>'+
  '<div class="card jl en" style="padding:12px"><canvas class="chart" id="chart" aria-label="Price chart with buy, exit and target prices"></canvas><p class="note" style="padding:8px 6px 2px">Drag across the chart to read prices. Sample series.</p></div>'+
  '<div class="g2"><div class="list kv en"><span>Buy near</span><b class="num">'+px(g.entry)+'</b><span>Exit if it falls to<small>Stop loss, decided in advance</small></span><b class="num dn">'+px(g.stop)+'</b><span>Take profit at<small>Twice what you risk</small></span><b class="num up">'+px(g.target)+'</b><span>'+(closed?"Closed at":"Price now")+'</span><b class="num">'+px(end)+'</b><span>Risk per share</span><b class="num">'+px(risk)+' ('+(risk/g.entry*100).toFixed(1)+'%)</b></div>'+
  '<section class="sec en">'+sh("Why the AI called it")+'<div class="card pad"><ul class="why">'+why.map(function(w){return '<li>'+ic("check",18,2.6,"var(--up)")+'<span>'+w+'</span></li>'}).join("")+'</ul></div></section></div>'+
  '<section class="sec en">'+sh("How reliable is this?")+'<div class="card pad"><div style="display:flex;align-items:center;gap:8px;font-weight:600"><span class="dot" style="background:'+c.col+'"></span>'+c.label+'</div>'+
   '<div style="display:grid;gap:14px;margin-top:16px"><div><div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:7px"><span class="mu">Similar trades that made money</span><b class="num">'+c.win+'%</b></div><div class="bar" style="--w:'+c.win+'%;--c:var(--up)"><i></i></div></div><div><div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:7px"><span class="mu">Reached the full profit target</span><b class="num">'+c.hit+'%</b></div><div class="bar" style="--w:'+c.hit+'%;--c:var(--ai)"><i></i></div></div></div>'+
   '<p class="mu" style="margin:16px 0 0;font-size:15px;line-height:1.45">On average these trades made <b style="color:var(--fg)">'+p100(c)+'</b>, after costs, across '+c.n.toLocaleString("en-IN")+' similar '+(g.tf==="W"?"weekly":"daily")+'-chart trades since 2019. '+(g.tf==="D"?"Good, but not yet past our full proof test, so buy a smaller amount.":"It passed our proof test in both older and newer years.")+'</p></div></section>'+
  '<section class="sec en">'+sh("Timeline")+'<div class="card pad"><div class="tl"><div style="--c:var(--pf)"><b>Setup found</b><br>The price kept stopping at '+px(g.level)+'.</div><div style="--c:var(--up)"><b>Breakout · '+g.opened+'</b><br>It closed above that price. Bought at '+px(g.entry)+'.</div><div style="--c:'+(closed?(g.R>0.05?"var(--up)":"var(--dn)"):"var(--warn)")+'"><b>'+(closed?g.why+" · "+g.closed:g.state)+'</b><br>'+(closed?'Result '+sgn(g.pct)+' after costs.':'Price now '+px(g.now)+'.')+'</div></div></div></section>'+
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
  var s=patSeries(p),W=320,n=s.length,mn=Math.min.apply(null,s)*.985,mx=Math.max(Math.max.apply(null,s),p.level)*1.02,cw=W-(big?54:8);
  function X(i){return (i/(n-1)*cw).toFixed(1)}function Y(v){return (6+(1-(v-mn)/(mx-mn))*(H-14)).toFixed(1)}
  var d=s.map(function(v,i){return (i?"L":"M")+X(i)+","+Y(v)}).join(""),ly=Y(p.level),id="pg"+p.id+(big?"b":"");
  var o='<svg class="spark" viewBox="0 0 '+W+' '+H+'" style="height:'+H+'px" preserveAspectRatio="none" role="img" aria-label="'+p.stage+' pattern on '+p.sym+'"><defs><linearGradient id="'+id+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--pt)" stop-opacity=".22"/><stop offset="1" stop-color="var(--pt)" stop-opacity="0"/></linearGradient></defs>'+
   '<path class="ar" d="'+d+'L'+X(n-1)+','+H+'L0,'+H+'Z" fill="url(#'+id+')"/><line class="dash" x1="0" x2="'+cw+'" y1="'+ly+'" y2="'+ly+'" stroke="var(--pt)" stroke-width="1.3" vector-effect="non-scaling-stroke"/>'+
   '<path class="ln" pathLength="1" d="'+d+'" fill="none" stroke="var(--fg)" stroke-width="1.8" stroke-linejoin="round"/><circle cx="'+X(n-1)+'" cy="'+Y(s[n-1])+'" r="3.5" fill="var(--pt)"/>';
  if(big)o+='<text x="'+(W-48)+'" y="'+(+ly+4)+'" font-size="11" font-weight="600" fill="var(--pt)" font-family="-apple-system,Inter,sans-serif">'+px(p.level).replace("₹","")+'</text>';
  return o+'</svg>'
}
function gapTxt(p){var g=(p.now/p.level-1)*100;return g>=0?sgn(g)+" above":Math.abs(g).toFixed(1)+"% below"}
function patCard(p){
  var st=STG[p.stage],o=patOdds(p),gap=(p.now/p.level-1)*100;
  return '<button class="card pcard press jl en" data-act="pat" data-id="'+p.id+'"><div class="top2"><div class="grow"><div class="t1" style="font-size:18px">'+p.sym+'<span class="pill '+st.cls+'">'+p.stage+'</span>'+tfPill(p.tf)+'</div><div class="t2">'+st.say+' · hit it '+p.tests+' times in '+p.months+' months</div></div><div class="rt"><b class="num">'+px(p.now)+'</b><small class="num '+(gap>=0?"up":"mu")+'">'+gapTxt(p)+'</small></div></div>'+
  patSvg(p,74,false)+
  '<div class="odds">'+(o.none?'<span>'+o.text+'</span>':'<span><span class="dot" style="background:'+o.col+';margin-right:7px"></span>'+o.label+'</span><b>'+o.win+'% of '+o.n.toLocaleString("en-IN")+' made money</b>')+'</div></button>'
}
function patternsHtml(){
  var F=["All","Breakout","Near","Retest","Forming"],list=PAT.filter(function(p){return S.pf==="All"||p.stage===S.pf});
  return '<div class="inner" style="--acc:var(--pt)">'+hero("patterns","","Pattern Calls","pat","Pattern Calls","Love charts? Catch breakouts early.",["breakouts"],
   "We scan every liquid NSE chart for a price ceiling about to break, then show how often the same pattern worked before.",
   '<div class="steps hx" style="--i:9;margin-top:18px"><div><i>1</i><b>Spot</b><small>A price the stock keeps failing to cross.</small></div><div><i>2</i><b>Match</b><small>Compared with 35,000+ past setups.</small></div><div><i>3</i><b>Rank</b><small>Real odds shown. Weak setups flagged.</small></div></div>')+
  '<div class="chips en" role="group" aria-label="Filter by stage">'+F.map(function(f){return '<button class="chip" data-act="pf" data-f="'+f+'" aria-pressed="'+(S.pf===f)+'">'+f+(f!=="All"?' <b class="num">'+STG[f].n+'</b>':'')+'</button>'}).join("")+'</div>'+
  (S.pf!=="All"?'<p class="note en">'+STG[S.pf].ex+'</p>':'')+
  '<div id="plist" class="g2">'+list.map(patCard).join("")+'</div><p class="note">Counts come from today’s scan. The cards are samples.</p></div>'
}
function patPage(p){
  var st=STG[p.stage],o=patOdds(p),sg=sigOf(p.sym);
  var todo={Breakout:["This is the buy moment. Buy at the next day’s opening price.","Set your exit just under the old ceiling. If the price falls back there, the idea was wrong.","Take profit at twice what you risk."],
   Near:["Be ready, not in. Nothing to do until it closes clearly above "+px(p.level)+".","Set a price alert at the ceiling.","Odds apply only once it breaks out."],
   Retest:["The price broke out, then came back to the old ceiling.","Some call this a second chance, but our tests have not shown it works better than the first buy.","Watch only. No call until there is a proven edge."],
   Forming:["The ceiling is still being tested. No setup yet.","Check back when the price gets close to it.","Nothing to do today."]}[p.stage];
  return '<div class="inner" style="--acc:var(--pt)">'+pbar("Patterns",p.sym)+
  '<div class="dhead play"><p class="ey">'+ic("pat",16,2.2)+'Pattern Call · '+(p.tf==="W"?"Weekly":"Daily")+' chart</p><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><h1>'+words(p.sym,[])+'</h1><span class="pill '+st.cls+'">'+p.stage+'</span></div><p class="lede" style="margin-top:4px">'+esc(p.name)+'. '+st.ex+'</p></div>'+
  '<div class="card pad jl en">'+patSvg(p,200,true)+'<p class="note" style="padding:8px 0 0">Dashed line: the ceiling at '+px(p.level)+'. Sample series.</p></div>'+
  '<div class="g2"><div class="list kv en"><span>Ceiling price</span><b class="num">'+px(p.level)+'</b><span>Price now</span><b class="num">'+px(p.now)+'</b><span>Distance</span><b class="num">'+gapTxt(p)+'</b><span>Times it hit the ceiling</span><b class="num">'+p.tests+' in '+p.months+' months</b></div>'+
  '<section class="sec en">'+sh("How often this worked")+'<div class="card pad">'+(o.none?'<p class="quote" style="margin:0">'+o.text+'</p>':
   '<div style="display:flex;align-items:center;gap:8px;font-weight:600"><span class="dot" style="background:'+o.col+'"></span>'+o.label+'</div><div style="display:grid;gap:14px;margin-top:16px"><div><div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:7px"><span class="mu">Similar past setups that made money</span><b class="num">'+o.win+'%</b></div><div class="bar" style="--w:'+o.win+'%;--c:var(--up)"><i></i></div></div><div><div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:7px"><span class="mu">Reached the full profit target</span><b class="num">'+o.hit+'%</b></div><div class="bar" style="--w:'+o.hit+'%;--c:var(--pt)"><i></i></div></div></div><p class="mu" style="margin:16px 0 0;font-size:15px">Average '+p100(o)+', after costs, over '+o.n.toLocaleString("en-IN")+' similar breakouts since 2019.</p>')+'</div></section></div>'+
  '<section class="sec en">'+sh("What to do")+'<div class="card pad"><ul class="why">'+todo.map(function(w){return '<li>'+ic("check",18,2.6,"var(--pt)")+'<span>'+w+'</span></li>'}).join("")+'</ul></div></section>'+
  (sg?'<button class="btn w acc en" style="--acc:var(--ai)" data-act="sig" data-id="'+sg.id+'">'+ic("ai",17,2.2)+' Open the AI call on '+sg.sym+'</button>':'')+
  (xrOf(p.sym)?'<button class="btn w soft en" data-act="xr" data-sym="'+p.sym+'">'+ic("xray",17,2.2)+' X-Ray the company</button>':'')+
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
  var c=holdCalc(),R=c.rows.slice().sort(function(a,b){return b.v-a.v}),tpl=c.tv-c.ti,checks=[],big=R[0];
  if(big&&big.v/c.tv>.3)checks.push(["warn","var(--warn)","One stock is "+(big.v/c.tv*100).toFixed(0)+"% of your money","A bad day in "+esc(big.h.sym)+" would hurt a lot."]);
  var weak=R.filter(function(r){var d=xrOf(r.h.sym);return d&&d.score<50});
  if(weak.length)checks.push(["shield","var(--dn)",weak.map(function(r){return esc(r.h.sym)}).join(", ")+" scores under 50","Check the company before buying more."]);
  var act=R.filter(function(r){return sigOf(r.h.sym)});
  if(act.length)checks.push(["ai","var(--ai)",act.length+" of your stocks have a live AI call",act.map(function(r){return esc(r.h.sym)+" ("+sigOf(r.h.sym).action.toLowerCase()+")"}).join(", ")]);
  if(!checks.length)checks.push(["check","var(--up)","Nothing flagged","Your mix looks reasonable."]);
  var rows=R.map(function(r){var d=xrOf(r.h.sym),sg=sigOf(r.h.sym),t=d?tone(d.score):null;
   return '<div class="row ind"><span class="av">'+esc(r.h.sym.slice(0,2))+'</span><button class="grow" style="text-align:left" data-act="'+(d?"xr":"none")+'" data-sym="'+esc(r.h.sym)+'"><div class="t1">'+esc(r.h.sym)+(d?'<span class="pill '+t.k+'">X-Ray '+d.score+'</span>':'')+(sg?actPill(sg.action):'')+'</div><div class="t2 num">'+r.h.qty+' shares at '+px(r.h.avg)+(r.known?'':' · price not in demo')+'</div></button><div class="rt"><b class="num">'+inr(r.v)+'</b><small class="num '+(r.pl>=0?"up":"dn")+'">'+sgn(r.plp)+'</small></div>'+(S.edit?'<button class="x" style="margin-left:4px;background:color-mix(in srgb,var(--dn) 16%,transparent);color:var(--dn)" data-act="rm" data-i="'+r.i+'" aria-label="Remove '+esc(r.h.sym)+'">'+ic("x",15,2.6)+'</button>':'')+'</div>'}).join("");
  return '<div class="inner" style="--acc:var(--pf)">'+hero("portfolio","","Portfolio","pie","Portfolio","Everything you own, checked every day.",["checked"],
   "Add your stocks by hand. We X-Ray each company and tell you if an AI call is live on it. Saved only on this device.","")+
  '<div class="card pad jl en"><p class="ey n" style="margin-bottom:6px">Current value</p><div class="price num" data-count="'+Math.round(c.tv)+'" data-fmt="inr">'+inr(RM?c.tv:0)+'</div><div style="display:flex;gap:18px;flex-wrap:wrap;margin-top:12px;font-size:15px"><span class="num '+(tpl>=0?"up":"dn")+'">'+(tpl>=0?"+":"−")+inr(Math.abs(tpl))+' <span class="dim">total gain</span></span><span class="num '+(c.day>=0?"up":"dn")+'">'+(c.day>=0?"+":"−")+inr(Math.abs(c.day))+' <span class="dim">today</span></span></div>'+
   '<div class="own" style="margin-top:20px">'+R.map(function(r,i){return '<i style="width:'+(r.v/c.tv*100).toFixed(1)+'%;background:'+PAL[i%6]+';transition-delay:'+(i*80)+'ms"></i>'}).join("")+'</div><div class="lg2">'+R.map(function(r,i){return '<span><i style="background:'+PAL[i%6]+'"></i>'+esc(r.h.sym)+'<b class="num">'+(r.v/c.tv*100).toFixed(0)+'%</b></span>'}).join("")+'</div></div>'+
  '<section class="sec en">'+sh("Daily check")+'<div class="list jl">'+checks.map(function(k){return '<div class="row ind"><span class="ico sm" style="--c:'+k[1]+'">'+ic(k[0],17,2.3)+'</span><div class="grow"><div class="t1">'+k[2]+'</div><div class="t2">'+k[3]+'</div></div></div>'}).join("")+'</div></section>'+
  '<section class="sec en">'+sh("Your stocks","",'<span style="display:flex;gap:8px"><button class="btn sm soft" data-act="edit">'+(S.edit?"Done":"Edit")+'</button><button class="btn sm acc" data-act="add">'+ic("plus",15,2.6)+' Add</button></span>')+'<div class="list jl">'+rows+'</div></section>'+
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
    hl(Y(g.level),pf,"Ceiling",[4,4]);hl(yT,up,"Profit target",[2,3]);hl(yS,dn,"Stop loss",[2,3]);
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
    if(Math.abs(s.v)<.02&&Math.abs(s.x-s.t)<.002){s.x=s.t;s.v=0;SPR.splice(i,1);s.on(s.x);if(s.done)s.done()}else s.on(s.x)}
}

/* ---------- mount ---------- */
var TABS=[["home","Home","home","var(--fg)"],["xray","X-Ray","xray","var(--ax)"],["calls","AI Calls","ai","var(--ai)"],["patterns","Patterns","pat","var(--pt)"],["portfolio","Portfolio","pie","var(--pf)"]];
var BUILD={home:homeHtml,xray:xrayHtml,calls:callsHtml,patterns:patternsHtml,portfolio:portfolioHtml};
var device=$("#device"),screens=$("#screens"),tabs=$("#dock"),page=$("#page"),scrim=$("#scrim"),modal=$("#modal"),SCR={};
TABS.forEach(function(v,i){var s=document.createElement("section");s.className="screen";s.id="s-"+v[0];s.setAttribute("aria-label",v[1]);screens.appendChild(s);
  SCR[v[0]]={el:s,i:i,sp:new Spring(0,240,30,function(x){s.style.transform=x?"translate3d("+x.toFixed(2)+"px,0,0)":"";s.style.opacity=(1-Math.min(Math.abs(x)/70,1)).toFixed(3)})}});
tabs.innerHTML='<span class="tpill" id="tpill"></span>'+TABS.map(function(v){return '<button class="tab" data-act="go" data-to="'+v[0]+'" aria-label="'+v[1]+'">'+ic(v[2],24,1.9)+'<span>'+v[1]+'</span></button>'}).join("");
var pill=$("#tpill"),pillS=new Spring(0,280,24,function(x){pill.style.transform="translateX("+(x*100).toFixed(2)+"%)"});

/* ---------- reveal: inner animations (rings, arcs, bars, counters, line draws) ---------- */
var IO=null;
function observe(root){
  if(IO)IO.disconnect();var els=$$(".en,.card,.list,.hero,.hstats,.spark",root);
  if(RM||!("IntersectionObserver" in window)){els.forEach(reveal);return}
  IO=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){reveal(e.target);IO.unobserve(e.target)}})},{root:root,threshold:.15});
  els.forEach(function(e){IO.observe(e)})
}
function reveal(el){
  if(el.classList.contains("vis"))return;el.classList.add("vis");
  $$(".rg",el).forEach(function(c){c.setAttribute("stroke-dashoffset",+c.getAttribute("data-c")*(1-+c.getAttribute("data-v")/100))});
  $$(".arc",el).forEach(function(c){c.setAttribute("stroke-dasharray",c.getAttribute("data-l")+" 100")});
  $$("[data-count]",el).forEach(countUp);
}
function countUp(n){
  if(n._c)return;n._c=1;var to=+n.getAttribute("data-count"),f=n.getAttribute("data-fmt")||"int",t0=performance.now()+200;
  if(RM){n.textContent=fmtv(to,f);return}
  (function s(t){var k=clamp((t-t0)/1300,0,1),e=1-Math.pow(1-k,4);n.textContent=fmtv(to*e,f);if(k<1)requestAnimationFrame(s)})(t0)
}
function segKnob(root){$$(".seg",root).forEach(function(s){var n=+s.getAttribute("data-n"),i=0;$$("button",s).forEach(function(b,j){if(b.getAttribute("aria-pressed")==="true")i=j});var k=$(".knob",s);k.style.width="calc((100% - 6px)/"+n+")";
  if(!s._s)s._s=new Spring(i,300,24,function(x){var kk=$(".knob",s);if(kk)kk.style.transform="translateX("+(x*100).toFixed(2)+"%)"});
  if(s._prev==null)s._s.set(i);else s._s.to(i);s._prev=i})}

/* ---------- scroll-linked entrance: blocks rise and settle as they enter, then stay crisp ---------- */
var EN=[],enT0=0;
function cacheEn(root){EN=$$(".en",root);enT0=performance.now();EN.forEach(function(e){e._k=-1})}
function entrance(sc,now){
  if(RM)return;var sr=sc.getBoundingClientRect(),vh=sr.height,idx=0;
  EN.forEach(function(el){var r=el.getBoundingClientRect(),top=r.top-sr.top;
    var ps=clamp((vh-top)/(vh*.3),0,1),pt=1;if(top<vh){pt=clamp((now-enT0-260-idx*90)/650,0,1);idx++}
    var p=Math.min(ps,pt),e=1-Math.pow(1-p,3);if(Math.abs(e-el._k)<.002)return;el._k=e;
    if(e>=.999){el.style.transform="";el.style.opacity=""}else{el.style.transform="translate3d(0,"+((1-e)*54).toFixed(1)+"px,0) scale("+(.93+.07*e).toFixed(4)+")";el.style.opacity=e.toFixed(3)}})
}

/* ---------- jelly: cards lag behind fast scrolls and spring back ---------- */
var JL=[],lastSt=0,vel=0,lastSc=null;
function cacheJelly(root){JL=$$(".jl",root).map(function(el){return {el:el,x:0,v:0}})}
function jelly(sc,dt){
  if(sc!==lastSc){lastSc=sc;lastSt=sc.scrollTop}
  var st=sc.scrollTop,raw=st-lastSt;lastSt=st;vel=lerp(vel,raw,.5);if(RM)return;
  var sr=sc.getBoundingClientRect(),vh=sr.height,mid=vh*.5;
  JL.forEach(function(j){var r=j.el.getBoundingClientRect(),c=r.top-sr.top+r.height/2;if(c<-300||c>vh+300){if(j.x){j.x=0;j.v=0;j.el.style.translate=""}return}
    var f=.25+Math.min(Math.abs(c-mid)/vh,1)*.75,t=clamp(vel*f*.9,-22,22),a=-320*(j.x-t)-22*j.v;j.v+=a*dt;j.x+=j.v*dt;
    var rx=Math.round(j.x);j.el.style.translate=rx?"0 "+rx+"px":""});
}

/* ---------- tabs ---------- */
function render(v,keep){
  var el=SCR[v].el,st=el.scrollTop,seg=$$(".seg",el).map(function(s){return [s._s,s._prev]});
  el.innerHTML=BUILD[v]();
  $$(".seg",el).forEach(function(s,i){if(seg[i]&&seg[i][0]){s._s=seg[i][0];s._prev=seg[i][1];s._s.on=function(x){var kk=$(".knob",s);if(kk)kk.style.transform="translateX("+(x*100).toFixed(2)+"%)"}}});
  segKnob(el);
  if(keep){el.scrollTop=st;$$(".en,.card,.list,.hero,.hstats,.spark",el).forEach(reveal);$$(".en",el).forEach(function(e){e._k=1})}
  if(!pageOpen()){observe(el);cacheJelly(el);if(!keep)cacheEn(el);else EN=$$(".en",el)}
  if(v==="xray")bindSearch();
}
function show(v,instant){
  var prev=S.view,pi=SCR[prev]?SCR[prev].i:0,ni=SCR[v].i,dir=ni>pi?1:ni<pi?-1:0;
  S.view=v;S.edit=false;render(v,false);var n=SCR[v];n.el.scrollTop=0;n.el.classList.add("on");n.el.style.zIndex=2;
  var h=$(".hero",n.el);if(h&&!RM){h.classList.remove("play");void h.offsetWidth;h.classList.add("play")}
  if(dir&&!instant&&prev!==v){n.sp.set(70*dir);n.sp.to(0);var o=SCR[prev];o.el.style.zIndex=1;o.sp.to(-70*dir,null,function(){if(S.view!==prev){o.el.classList.remove("on");o.sp.set(0)}})}
  else Object.keys(SCR).forEach(function(k){if(k!==v){SCR[k].el.classList.remove("on");SCR[k].sp.set(0)}});
  $$(".tab",tabs).forEach(function(b){if(b.getAttribute("data-to")===v)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current")});
  tabs.style.setProperty("--t",TABS[ni][3]);if(instant)pillS.set(ni);else pillS.to(ni)
}

/* ---------- detail pages: own URL (#xray-TRENT, #call-trent, #closed-maruti, #pattern-dixon) ---------- */
var PARENT={xray:["xray","X-Ray"],call:["calls","AI Calls"],closed:["calls","AI Calls"],pattern:["patterns","Patterns"]};
var pgS=new Spring(1,230,28,function(x){var W=device.clientWidth;page.style.transform=x?"translate3d("+(x*W).toFixed(1)+"px,0,0)":"";var o=1-clamp(x,0,1);
  screens.style.transform=o?"translate3d("+(-o*W*.26).toFixed(1)+"px,0,0)":"";screens.style.filter=o>.01?"brightness("+(1-.35*o).toFixed(3)+")":"";
  tabs.style.transform="translateX(-50%) translateY("+(o*130).toFixed(1)+"px)";page.style.boxShadow=o?"":"none"});
pgS.set(1);
function pageOpen(){return page.style.visibility==="visible"&&pgS.t===0}
function findItem(kind,id){
  if(kind==="xray")return xrOf(id);
  if(kind==="call")return SIGS.filter(function(s){return s.id===id.toLowerCase()})[0];
  if(kind==="closed"){var c=CLOSED.filter(function(x){return x.id===id.toLowerCase()})[0];return c?Object.assign({},c,{level:c.entry*.99,target:c.entry+2*(c.entry-c.stop),action:"BUY",state:"Closed",bars:0}):null}
  if(kind==="pattern")return PAT.filter(function(x){return x.id===id.toLowerCase()})[0];
}
function skeleton(back){return '<div class="inner">'+pbar(back,"")+'<div class="dhead"><div class="sk" style="height:14px;width:38%"></div><div class="sk" style="height:46px;width:66%;margin-top:10px"></div></div><div class="sk" style="height:300px;border-radius:24px"></div><div class="g2"><div class="sk" style="height:200px;border-radius:22px"></div><div class="sk" style="height:200px;border-radius:22px"></div></div></div>'}
var pageTimer=null;
function openDetail(kind,id,first){
  var it=findItem(kind,id),par=PARENT[kind];if(!it){location.replace("#"+par[0]);return}
  var key=kind+"-"+id;if(S.detail===key&&pageOpen())return;S.detail=key;stopChart();
  page.innerHTML=skeleton(par[1]);page.scrollTop=0;page.style.visibility="visible";
  if(!pageOpen()){if(first)pgS.set(0);else pgS.to(0,0)}
  clearTimeout(pageTimer);
  pageTimer=setTimeout(function(){
    page.innerHTML=kind==="xray"?xrPage(it):kind==="pattern"?patPage(it):callPage(it,kind==="closed");
    if(kind==="call"||kind==="closed")startChart(it,kind==="closed");
    observe(page);cacheJelly(page);cacheEn(page);var b=$(".bk",page);if(b&&!first)b.focus({preventScroll:true})
  },RM?0:420)
}
function closePage(){S.detail=null;stopChart();clearTimeout(pageTimer);pgS.to(1,0,function(){page.style.visibility="hidden";page.innerHTML="";var el=SCR[S.view].el;observe(el);cacheJelly(el);EN=$$(".en",el)})}
(function(){ /* edge swipe back */
  var x0=null,lx=0,lt=0,v=0,W=1;
  page.addEventListener("pointerdown",function(e){var r=page.getBoundingClientRect();if(e.clientX-r.left>28||e.pointerType==="mouse")return;x0=e.clientX;lx=x0;lt=performance.now();W=r.width;v=0;var i=SPR.indexOf(pgS);if(i>=0)SPR.splice(i,1)});
  page.addEventListener("pointermove",function(e){if(x0===null)return;var now=performance.now(),dx=Math.max(0,e.clientX-x0);v=(e.clientX-lx)/Math.max(1,now-lt)*1000/W;lx=e.clientX;lt=now;pgS.x=dx/W;pgS.on(pgS.x)});
  function end(){if(x0===null)return;x0=null;if(pgS.x>.35||v>1.1)go(PARENT[S.detail.split("-")[0]][0]);else pgS.to(0,v)}
  page.addEventListener("pointerup",end);page.addEventListener("pointercancel",end);
})();

/* ---------- router ---------- */
function parse(){
  var h=decodeURIComponent((location.hash||"").slice(1)),m=h.match(/^(xray|call|closed|pattern)-([A-Za-z0-9_.~-]+)$/);
  if(m)return {tab:PARENT[m[1]][0],kind:m[1],id:m[2]};
  for(var i=0;i<TABS.length;i++)if(TABS[i][0]===h)return {tab:h};return {tab:"home"}
}
function route(first){
  var r=parse();
  if(r.kind){if(S.view!==r.tab||first)show(r.tab,true);openDetail(r.kind,r.id,first)}
  else{if(page.style.visibility==="visible")closePage();if(S.view!==r.tab||first)show(r.tab,first)}
}
function go(h){if(location.hash==="#"+h)route(false);else location.hash=h}
window.addEventListener("hashchange",function(){route(false)});

/* ---------- share + add modals ---------- */
function shareLink(){var h="#"+(S.detail||S.view),base="";try{if(document.referrer&&/^https:\/\/claude\.ai\//.test(document.referrer))base=document.referrer.split("#")[0]}catch(e){}if(!base)base=location.href.split("#")[0];return base+h}
function openShare(){
  var link=shareLink();
  modal.innerHTML='<h2>Share this page</h2><p class="mu" style="margin:6px 0 0;font-size:15px">Anyone with the link lands right on this page.</p><div class="share"><input id="shl" readonly value="'+esc(link)+'" aria-label="Link to this page"><button class="btn acc" id="shc" style="--acc:var(--fg)">'+ic("copy",17,2.2)+' Copy</button></div><p class="note" style="margin-top:10px">Page code: <b class="num" style="color:var(--fg)">#'+esc(S.detail||S.view)+'</b></p><button class="btn soft w" style="margin-top:14px" data-act="mclose">Done</button>';
  modal.classList.add("open");scrim.classList.add("on");
  $("#shc").addEventListener("click",function(){var i=$("#shl"),b=$("#shc");function ok(){b.innerHTML=ic("check",17,2.6)+" Copied"}
    try{navigator.clipboard.writeText(i.value).then(ok,function(){i.select()})}catch(e){i.select()}})
}
function openAdd(){
  modal.innerHTML='<h2>Add a stock you own</h2><p class="mu" style="margin:6px 0 0;font-size:15px">Type what you bought. You can remove it any time.</p>'+
  '<form id="addf" novalidate><div class="fld"><label for="f-sym">Stock symbol</label><input id="f-sym" type="text" list="syms" placeholder="e.g. DIXON" autocomplete="off" autocapitalize="characters" style="text-transform:uppercase"><datalist id="syms">'+XR.map(function(d){return '<option value="'+d.sym+'">'}).join("")+'</datalist></div>'+
  '<div class="fld"><label for="f-qty">How many shares</label><input id="f-qty" inputmode="numeric" placeholder="10"></div><div class="fld"><label for="f-avg">Average price you paid (₹)</label><input id="f-avg" inputmode="decimal" placeholder="1500"></div>'+
  '<p class="err" id="f-err" role="alert"></p><div style="display:flex;gap:10px"><button type="button" class="btn soft" data-act="mclose" style="flex:1">Cancel</button><button type="submit" class="btn acc" style="flex:1;--acc:var(--pf)">Add</button></div></form>';
  modal.classList.add("open");scrim.classList.add("on");
  setTimeout(function(){var f=$("#f-sym");if(f)f.focus({preventScroll:true})},450);
  $("#addf").addEventListener("submit",function(e){e.preventDefault();
    var sym=$("#f-sym").value.trim().toUpperCase().replace(/[^A-Z0-9&-]/g,""),q=Math.floor(+$("#f-qty").value),a=+$("#f-avg").value,er=$("#f-err");
    if(!sym){er.textContent="Enter a stock symbol.";return}if(!(q>0)){er.textContent="Enter 1 or more shares.";return}if(!(a>0)){er.textContent="Enter the price you paid per share.";return}
    var ex=S.holdings.filter(function(h){return h.sym===sym})[0];
    if(ex){var tq=ex.qty+q;ex.avg=(ex.avg*ex.qty+a*q)/tq;ex.qty=tq}else S.holdings.push({sym:sym,qty:q,avg:a});
    saveH();closeModal();render("portfolio",true)})
}
function closeModal(){modal.classList.remove("open");scrim.classList.remove("on")}

/* ---------- X-Ray search ---------- */
var hintT=null;
function bindSearch(){
  var inp=$("#xq"),sug=$("#sug");if(!inp)return;
  var hints=["Search a company","Try TRENT","Try “defence”","Try Infosys","Try “banks”"],hi=0,ci=0,del=false;clearTimeout(hintT);
  function tick(){if(!document.body.contains(inp))return;if(document.activeElement===inp||inp.value){inp.placeholder="Search a company";hintT=setTimeout(tick,900);return}
    var w=hints[hi];if(!del){ci++;if(ci>=w.length){del=true;inp.placeholder=w;hintT=setTimeout(tick,1600);return}}else{ci--;if(ci<=0){del=false;hi=(hi+1)%hints.length}}
    inp.placeholder=w.slice(0,ci)+(ci<w.length?"▏":"");hintT=setTimeout(tick,del?28:62)}
  if(!RM)hintT=setTimeout(tick,1600);
  function upd(){var h=sugHtml(inp.value);sug.innerHTML=h;sug.hidden=!h;if(h&&!RM&&sug.animate)sug.animate([{opacity:0,transform:"scale(.97) translateY(-6px)"},{opacity:1,transform:"none"}],{duration:260,easing:"cubic-bezier(.2,.9,.2,1)"})}
  inp.addEventListener("input",function(){S.xq=inp.value;upd()});
  inp.addEventListener("keydown",function(e){if(e.key==="Enter"){var b=$("[data-act=xr]",sug);if(b)b.click()}});
  inp.addEventListener("focus",upd);
}
document.addEventListener("pointerdown",function(e){var s=$("#sug");if(s&&!(e.target.closest&&e.target.closest(".srch")))s.hidden=true},true);

/* ---------- events ---------- */
document.addEventListener("click",function(e){
  var t=e.target.closest("[data-act]");if(!t)return;var a=t.getAttribute("data-act");
  if(a==="go")go(t.getAttribute("data-to"));
  else if(a==="sig")go("call-"+t.getAttribute("data-id"));
  else if(a==="sigc")go("closed-"+t.getAttribute("data-id"));
  else if(a==="xr"){var s=$("#sug");if(s)s.hidden=true;go("xray-"+t.getAttribute("data-sym"))}
  else if(a==="pat")go("pattern-"+t.getAttribute("data-id"));
  else if(a==="back")go(PARENT[(S.detail||"xray-").split("-")[0]][0]);
  else if(a==="share")openShare();
  else if(a==="xf"){S.xf=t.getAttribute("data-f");$$("#xseg button").forEach(function(b){b.setAttribute("aria-pressed",b===t)});segKnob(SCR.xray.el);$("#xlist").innerHTML=xrRows(xrFilter());$$("#xlist .list").forEach(reveal);cacheJelly(SCR.xray.el)}
  else if(a==="xqf"){var i=$("#xq");i.value=t.getAttribute("data-q");S.xq=i.value;i.dispatchEvent(new Event("input"));i.focus({preventScroll:true})}
  else if(a==="sigtab"){S.sigTab=+t.getAttribute("data-i");render("calls",true)}
  else if(a==="pf"){S.pf=t.getAttribute("data-f");render("patterns",true)}
  else if(a==="add")openAdd();
  else if(a==="edit"){S.edit=!S.edit;render("portfolio",true)}
  else if(a==="mclose")closeModal();
  else if(a==="rm"){S.holdings.splice(+t.getAttribute("data-i"),1);saveH();render("portfolio",true)}
  else if(a==="replay"){try{location.hash="";location.reload()}catch(err){}}
});
document.addEventListener("keydown",function(e){
  if(e.key==="Escape"){if(modal.classList.contains("open"))closeModal();else if(pageOpen())$(".bk",page)&&$(".bk",page).click()}
  if((e.key==="Enter"||e.key===" ")&&e.target.getAttribute&&e.target.getAttribute("role")==="button"){e.preventDefault();e.target.click()}
});
scrim.addEventListener("click",closeModal);
$("#themeBtn").addEventListener("click",function(){var r=document.documentElement,dark=(r.getAttribute("data-theme")||(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"))==="dark";r.setAttribute("data-theme",dark?"light":"dark")});
window.addEventListener("resize",function(){pgS.on(pgS.x)});

/* ---------- frame loop ---------- */
var lt0=performance.now();
function frame(now){
  var dt=clamp((now-lt0)/1000,0,1/30);lt0=now;stepSprings(dt);
  if(device.scrollLeft||device.scrollTop){device.scrollLeft=0;device.scrollTop=0}var se=document.scrollingElement;if(se&&(se.scrollLeft||se.scrollTop)){se.scrollLeft=0;se.scrollTop=0}
  var sc=page.style.visibility==="visible"?page:SCR[S.view].el,st=sc.scrollTop;
  jelly(sc,dt);entrance(sc,now);
  if(sc===page){var pb=$(".pbar",page);if(pb)pb.classList.toggle("sc",st>60)}
  else{var nav=$(".nav",sc);if(nav)nav.style.opacity=clamp((st-230)/40,0,1).toFixed(2);
    if(!RM&&st<700){var art=$(".hero .art",sc),hc=$(".hero .hcopy",sc);
      if(art)art.style.transform=st>0?"translate3d(0,"+(st*.42).toFixed(1)+"px,0) scale("+(1+st/1600).toFixed(4)+")":(st<0?"scale("+(1-st/500).toFixed(4)+")":"");if(art)art.style.opacity=(1-clamp(st/380,0,1)).toFixed(3);
      if(hc){hc.style.transform=st>0?"translate3d(0,"+(st*.14).toFixed(1)+"px,0)":"";hc.style.opacity=(1-clamp((st-120)/360,0,1)).toFixed(3)}}}
  requestAnimationFrame(frame)
}
/* shared links skip the launch film */
if(location.hash&&location.hash.length>1){var fh=document.getElementById("film-host");if(fh)fh.parentNode.removeChild(fh)}
route(true);requestAnimationFrame(frame);
})();
