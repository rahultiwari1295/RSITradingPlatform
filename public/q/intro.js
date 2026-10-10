(function(){
"use strict";
var host=document.getElementById("film-host"),tpl=document.getElementById("film-tpl");if(!host||!tpl)return;var root=host.attachShadow({mode:"open"});root.appendChild(tpl.content.cloneNode(true));var film=root.getElementById("film");if(!film)return;
function syncTheme(){var t=document.documentElement.getAttribute("data-theme");if(t)host.setAttribute("data-theme",t);else host.removeAttribute("data-theme")}syncTheme();new MutationObserver(syncTheme).observe(document.documentElement,{attributes:true,attributeFilter:["data-theme"]});
var RM=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
var clamp=function(v,a,b){return Math.max(a,Math.min(b,v))},rng=function(p,a,b){return clamp((p-a)/(b-a),0,1)},ease=function(t){return t*t*(3-2*t)},eo=function(t){return 1-Math.pow(1-t,3)};
var $=function(s,r){return (r||root).querySelector(s)},$$=function(s,r){return Array.prototype.slice.call((r||root).querySelectorAll(s))};
var vh=innerHeight,vw=innerWidth,sm=0,mx=0,my=0,tmx=0,tmy=0,alive=true;
var bar=$("#fbar"),ph=$("#ph"),aHero=$("#aHero"),aHint=$("#aHint"),cards=$$(".fc",film);

/* pillars (Trent sample from the DNA page) */
var PIL=[["Quality",86,"var(--buy)"],["Growth",92,"var(--cyan)"],["Value",34,"var(--amber)"],["Momentum",84,"var(--violet)"],["Safety",76,"var(--pink)"],["Ownership",72,"var(--buy)"]];
var pcs=$("#pcs");
PIL.forEach(function(p,i){var d=document.createElement("div");d.className="pc";d.style.setProperty("--c",p[2]);d.style.setProperty("--v",p[1]);
  d.innerHTML='<div class="pc-in" style="--d:'+(-i*.9)+'s"><small>'+p[0]+'<b>'+p[1]+'</b></small><i><s></s></i></div>';pcs.appendChild(d)});
var pcEls=$$(".pc",film);
/* illustrative 20 trades: 11 winners summing +16.2R, 9 losers at -1R  => +0.36R average */
var R20=[-1,.4,-1,2,.6,-1,2,-1,.8,2.4,-1,.5,2,-1,1.2,2.3,-1,-1,2,-1],rb=$("#rbars");
R20.forEach(function(r){var i=document.createElement("i");var up=r>0;i.style.setProperty("--h",up?(r/2.4*100):42);i.style.setProperty("--c",up?"var(--buy)":"var(--sell)");rb.appendChild(i)});
var rEls=$$("i",rb);

function measure(){vh=film.clientHeight;vw=film.clientWidth}
addEventListener("resize",measure);window.__filmReplay=function(){location.reload()};
if(!RM)addEventListener("pointermove",function(e){if(e.pointerType==="mouse"){tmx=e.clientX/innerWidth-.5;tmy=e.clientY/innerHeight-.5}});

function reveals(s,p){
  $$("[data-r]",s).forEach(function(el){
    var a=el.getAttribute("data-r").split(",").map(Number),t=eo(rng(p,a[0],a[1])),o=0;
    var oo=el.getAttribute("data-o");if(oo){var b=oo.split(",").map(Number);o=ease(rng(p,b[0],b[1]))}
    var k=t*(1-o);el.style.opacity=k.toFixed(3);
    el.style.transform="translate3d(0,"+(((1-t)*36)-(o*30)).toFixed(1)+"px,0) scale("+(0.97+0.03*t).toFixed(3)+")";
    el.style.filter=(1-k)>.02?"blur("+((1-k)*10).toFixed(1)+"px)":"none"})}

var scn=$$(".scn",film),U={};
U.sA=function(s,p){
  var t=ease(rng(p,.05,.36)),shrink=ease(rng(p,.5,.78));
  ph.style.transform="translate(-50%,-50%) translate3d("+(mx*-14).toFixed(1)+"px,"+(((1-t)*vh*.82)+shrink*vh*(vw<600?.07:0)+my*-10).toFixed(1)+"px,0) perspective(1400px) rotateX("+(((1-t)*42)+my*-4).toFixed(2)+"deg) rotateY("+((mx*10)+(1-t)*-14).toFixed(2)+"deg) scale("+(.7+.3*t-shrink*.1).toFixed(3)+")";
  ph.style.setProperty("--gl",(p*160-20).toFixed(0));ph.style.setProperty("--dr",ease(rng(p,.22,.5)).toFixed(3));
  var o=ease(rng(p,.08,.3));aHero.style.opacity=(1-o).toFixed(3);aHero.style.transform="translate3d(0,"+(-o*60).toFixed(1)+"px,0) scale("+(1+o*.22).toFixed(3)+")";aHero.style.filter=o>.02?"blur("+(o*14).toFixed(1)+"px)":"none";
  aHint.style.opacity=(1-rng(p,0,.04)).toFixed(2);
  var e=ease(rng(p,.5,.86)),W=Math.min(vw,1100)/2,H=vh/2,out=ease(rng(p,.93,1));
  cards.forEach(function(c,i){var x=+c.dataset.x,y=+c.dataset.y,z=+c.dataset.z,r=+c.dataset.rot,st=ease(rng(p,.5+i*.035,.86));
    var nar=vw<600,tx=x*(nar?.74:1)*W*st+mx*z*.22,ty=y*(nar&&y>.6?.8:1)*H*st+my*z*.18;
    c.style.opacity=(st*(1-out)).toFixed(3);
    c.style.transform="translate(-50%,-50%) translate3d("+tx.toFixed(1)+"px,"+ty.toFixed(1)+"px,"+(z*st).toFixed(0)+"px) rotate("+(r*st).toFixed(2)+"deg) scale("+(.35+.65*st+z/1200*st).toFixed(3)+")"});
  ph.style.opacity=(1-out).toFixed(3);
};
U.sB=function(s,p){
  var g=ease(rng(p,.1,.78)),rw=$("#ringwrap");
  $("#rfg").style.strokeDashoffset=(565.5*(1-.757*g)).toFixed(1);
  $("#sc").textContent=Math.round(76*g);
  var R=Math.min(Math.min(vw,820)*.42,vh*.33),base=-Math.PI/2;
  pcEls.forEach(function(el,i){var st=ease(rng(p,.12+i*.085,.3+i*.085)),a=base+i*Math.PI*2/6,ex=Math.cos(a)*R*(vw<600?.6:1.35),ey=Math.sin(a)*R*.98;
    el.style.opacity=st.toFixed(3);el.style.transform="translate3d("+((ex*st)+mx*(10+i*3)).toFixed(1)+"px,"+((ey*st)+my*(8+i*2)).toFixed(1)+"px,"+(st*60).toFixed(0)+"px) scale("+(.4+.6*st).toFixed(3)+")";
    el.style.setProperty("--k",st.toFixed(3));$("s",el).style.setProperty("--k",st.toFixed(3))});
  rw.style.transform="translate3d(0,0,0) scale("+(.82+.18*ease(rng(p,0,.2))).toFixed(3)+")";
  rw.style.opacity=(ease(rng(p,0,.1))*(1-ease(rng(p,.92,1)))).toFixed(3);
};
U.sC=function(s,p){
  var a=eo(rng(p,.1,.5));
  $("#n1").textContent=Math.round(54*a)+"%";$("#n2").textContent="₹"+Math.round(36*a);$("#n3").textContent=Math.round(423*a);
  $(".stats3",s).style.transform="translate3d(0,"+(-ease(rng(p,.5,.7))*vh*.06).toFixed(1)+"px,0)";
  rEls.forEach(function(el,i){var k=ease(rng(p,.42+i*.012,.62+i*.012));el.style.setProperty("--k",k.toFixed(3))});
  $(".stats3",s).style.opacity=(ease(rng(p,0,.1))).toFixed(3);
};
U.sD=function(s,p){var o=$("#orb");o.style.transform="scale("+(.5+.7*ease(rng(p,0,.7))).toFixed(3)+") rotate("+(p*160).toFixed(0)+"deg)";o.style.opacity=(.15+.5*ease(rng(p,0,.5))).toFixed(3)};

function loop(){
  if(!alive)return;
  sm+=(film.scrollTop-sm)*(RM?1:.13);mx+=(tmx-mx)*.07;my+=(tmy-my)*.07;
  var tot=film.scrollHeight-vh;bar.style.transform="scaleX("+(tot>0?clamp(sm/tot,0,1):0).toFixed(4)+")";
  var aur=$(".f-aur",film);aur.style.transform="translate3d("+(mx*-40).toFixed(1)+"px,"+(-sm*.12).toFixed(1)+"px,0)";
  scn.forEach(function(s){var h=s.offsetHeight-vh,p=clamp((sm-s.offsetTop)/h,0,1);if(sm<s.offsetTop-vh||sm>s.offsetTop+s.offsetHeight)return;U[s.id](s,p);reveals(s,p)});
  requestAnimationFrame(loop)}
function leave(){if(!alive)return;alive=false;film.classList.add("gone");try{document.dispatchEvent(new CustomEvent("film:leave"))}catch(e){}setTimeout(function(){host.hidden=true},1200)}
$("#fskip").addEventListener("click",leave);$("#fenter").addEventListener("click",leave);
film.addEventListener("keydown",function(e){if(e.key==="Escape")leave()});
measure();loop();
try{film.focus({preventScroll:true})}catch(e){}
})();
