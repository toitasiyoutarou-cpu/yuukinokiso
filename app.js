import { units } from "./data/units.js";
import { qa } from "./data/qa.js";
import { tf } from "./data/tf.js";
import { routes } from "./data/routes.js";
import { dictionary } from "./data/dictionary.js";

const $=q=>document.querySelector(q), $$=q=>[...document.querySelectorAll(q)];
const LS="chemquest-organic-selfstudy-v1";
let state=JSON.parse(localStorage.getItem(LS)||'{"tries":{},"correct":{},"wrong":{},"selectedUnit":"u01"}');
let qaSet=[],tfSet=[],routeSet=[],idx=0,mode="qa";

function key(type,id){return type+":"+id}
function allItems(){return [...qa.map(x=>({...x,type:"qa"})),...tf.map(x=>({...x,type:"tf"})),...routes.map(x=>({...x,type:"route"}))]}
function save(){localStorage.setItem(LS,JSON.stringify(state));renderAll()}
function unitItems(unit){return allItems().filter(x=>x.unit===unit)}
function stats(unit){
  const items=unitItems(unit), tries=items.filter(x=>state.tries[key(x.type,x.id)]).length, correct=items.filter(x=>state.correct[key(x.type,x.id)]).length;
  const rate=tries?Math.round(correct/tries*100):0; let label="未習得"; if(tries>0)label=rate>=90?"完成":rate>=70?"定着":"練習中";
  return {total:items.length,tries,correct,rate,label}
}
function overall(){
  const tries=Object.keys(state.tries).length, correct=Object.keys(state.correct).length, rate=tries?Math.round(correct/tries*100):0, weak=Object.keys(state.wrong).length;
  return {tries,correct,rate,weak}
}
function shuffle(a){return [...a].sort(()=>Math.random()-.5)}
function limit(list){const n=$("#countSelect")?.value||"5"; return n==="all"?shuffle(list):shuffle(list).slice(0,Number(n))}
function renderSummary(){
  const o=overall(); $("#overallRate").textContent=o.rate+"%"; $("#donut").style.setProperty("--p",o.rate+"%");
  $("#tryCount").textContent=o.tries; $("#correctCount").textContent=o.correct; $("#weakCount").textContent=o.weak; $("#totalCount").textContent=allItems().length;
}
function renderUnits(){
  $("#unitSelect").innerHTML=units.map(u=>`<option value="${u.id}">${u.title}</option>`).join(""); $("#unitSelect").value=state.selectedUnit;
  $("#unitCards").innerHTML=units.map((u,i)=>{const s=stats(u.id);return `<article class="unit-card ${u.color}" data-id="${u.id}"><div class="num">${i+1}</div><div class="unit-icon">${u.icon}</div><h3>${u.title}</h3><p>${u.desc}</p><div><div class="progress-label">習熟度　${s.rate}%</div><div class="bar"><div style="width:${s.rate}%"></div></div></div><div class="badge">${s.label}</div></article>`}).join("");
  $("#unitCards").querySelectorAll(".unit-card").forEach(el=>el.addEventListener("click",()=>{state.selectedUnit=el.dataset.id;$("#unitSelect").value=state.selectedUnit;save()}));
  $("#unitList").innerHTML=units.map((u,i)=>{const s=stats(u.id);return `<article class="unit-row" data-id="${u.id}"><div class="num">${i+1}</div><div><h3>${u.icon} ${u.title}</h3><p>${u.short}｜${u.desc}</p><div class="bar"><div style="width:${s.rate}%"></div></div></div><b>${s.rate}%</b></article>`}).join("");
  $("#unitList").querySelectorAll(".unit-row").forEach(el=>el.addEventListener("click",()=>{state.selectedUnit=el.dataset.id;start("qa")}));
}
function showPage(p){$$(".page").forEach(x=>x.classList.remove("active"));$("#"+p).classList.add("active");$$(".nav").forEach(n=>n.classList.toggle("active",n.dataset.page===p))}
function mark(type,item,ok){
  const k=key(type,item.id); state.tries[k]=true;
  if(ok){state.correct[k]=true;delete state.wrong[k]}else{delete state.correct[k];state.wrong[k]=true}
  localStorage.setItem(LS,JSON.stringify(state)); renderSummary(); renderRecords(); renderUnits();
}
function start(m){
  state.selectedUnit=$("#unitSelect").value||state.selectedUnit; mode=m; idx=0;
  if(m==="qa"){qaSet=limit(qa.filter(x=>x.unit===state.selectedUnit));showPage("qa");showQa()}
  if(m==="tf"){tfSet=limit(tf.filter(x=>x.unit===state.selectedUnit));showPage("tf");showTf()}
  if(m==="route"){routeSet=limit(routes.filter(x=>x.unit===state.selectedUnit));showPage("route");showRoute()}
}
function showQa(){
  const q=qaSet[idx]; if(!q)return; const u=units.find(x=>x.id===q.unit);
  $("#qaUnitTitle").textContent=u.title; $("#qaProgress").textContent=`${idx+1} / ${qaSet.length}`; $("#qaQuestion").textContent=q.q;
  $("#answerBox").classList.add("hidden"); $("#qaJudge").classList.add("hidden"); $("#answerBox").innerHTML="";
}
function showQaAnswer(){
  const q=qaSet[idx]; $("#answerBox").classList.remove("hidden"); $("#qaJudge").classList.remove("hidden");
  $("#answerBox").innerHTML=`<b>答え：</b>${q.a}<br><br><b>解説：</b>${q.exp}`;
}
function nextQa(){if(idx<qaSet.length-1){idx++;showQa()}else{showPage("home");renderAll()}}
function showTf(){
  const q=tfSet[idx]; if(!q)return; const u=units.find(x=>x.id===q.unit);
  $("#tfUnitTitle").textContent=u.title; $("#tfProgress").textContent=`${idx+1} / ${tfSet.length}`; $("#tfQuestion").textContent=q.text; $("#tfFeedback").textContent="";
}
function answerTf(ans){
  const q=tfSet[idx], ok=ans===q.answer; mark("tf",q,ok); $("#tfFeedback").textContent=(ok?"正解！ ":"不正解。 ")+q.exp;
}
function nextTf(){if(idx<tfSet.length-1){idx++;showTf()}else{showPage("home");renderAll()}}
function showRoute(){
  const r=routeSet[idx]; if(!r)return; const u=units.find(x=>x.id===r.unit);
  $("#routeUnitTitle").textContent=u.title; $("#routeProgress").textContent=`${idx+1} / ${routeSet.length}`; $("#routeQuestion").textContent=r.q; $("#routeFeedback").textContent="";
  const choices=shuffle([r.answer,...routes.filter(x=>x.to!==r.answer).map(x=>x.to)]).slice(0,4);
  if(!choices.includes(r.answer))choices[Math.floor(Math.random()*4)]=r.answer;
  $("#routeChoices").innerHTML=shuffle(choices).map(c=>`<button class="choice">${c}</button>`).join("");
  $("#routeChoices").querySelectorAll(".choice").forEach(btn=>btn.addEventListener("click",()=>answerRoute(btn,r)));
}
function answerRoute(btn,r){
  const ok=btn.textContent===r.answer; mark("route",r,ok);
  $("#routeChoices").querySelectorAll(".choice").forEach(b=>{if(b.textContent===r.answer)b.classList.add("correct");else if(b===btn)b.classList.add("wrong");b.disabled=true});
  $("#routeFeedback").textContent=(ok?"正解！ ":"不正解。 ")+r.exp;
}
function nextRoute(){if(idx<routeSet.length-1){idx++;showRoute()}else{showPage("home");renderAll()}}
function renderRecords(){
  const rows=units.map(u=>{const s=stats(u.id);return `<tr><td>${u.title}</td><td>${s.correct}</td><td>${s.tries}</td><td>${s.rate}%</td></tr>`}).join("");
  $("#recordRows").innerHTML=rows; $("#recordRowsHome").innerHTML=rows;
  const wrong=allItems().filter(x=>state.wrong[key(x.type,x.id)]);
  $("#weakList").innerHTML=wrong.length?wrong.map(x=>`<article class="weak-card"><b>${units.find(u=>u.id===x.unit)?.title||""}</b><p>${x.q||x.text}</p><small>${x.exp}</small></article>`).join(""):"";
}
function renderDict(){
  const w=($("#dictSearch").value||"").trim();
  const list=dictionary.filter(d=>!w||`${d.term}${d.category}${d.formula}${d.desc}`.includes(w));
  $("#dictGrid").innerHTML=list.map(d=>`<article class="dict-card"><span class="tag">${d.category}</span><h3>${d.term}</h3><p><b>${d.formula}</b></p><p>${d.desc}</p></article>`).join("");
}
function renderMap(){
  const preset={"酢酸ナトリウム":[100,80],"メタン":[300,80],"炭化カルシウム":[100,185],"アセチレン":[300,185],"エチレン":[100,310],"エタノール":[300,300],"アセトアルデヒド":[510,300],"酢酸":[720,300],"酢酸エチル":[930,300],"ポリエチレン":[300,420],"ジエチルエーテル":[510,420],"ベンゼン":[100,530],"ニトロベンゼン":[310,530],"アニリン":[520,530],"アゾ染料":[730,530],"フェノール":[310,640],"トルエン":[520,640],"安息香酸":[730,640]};
  const mapRoutes=routes.filter(r=>["製法","総合ルート","置換","酸化","還元","重合","エステル"].some(t=>r.tags?.includes(t)));
  const names=[...new Set(mapRoutes.flatMap(r=>[r.from,r.to]))], nodes={}; names.forEach((n,i)=>nodes[n]=preset[n]||[120+i*160,120]);
  let html='<div class="stage">';
  mapRoutes.forEach(r=>{const a=nodes[r.from],b=nodes[r.to]; if(!a||!b)return; const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy),ang=Math.atan2(dy,dx)*180/Math.PI; html+=`<div class="map-line" style="left:${a[0]}px;top:${a[1]}px;width:${len}px;transform:rotate(${ang}deg)"></div><div class="map-label" data-id="${r.id}" style="left:${(a[0]+b[0])/2}px;top:${(a[1]+b[1])/2}px">${r.condition}</div>`});
  names.forEach(n=>html+=`<div class="map-node ${["エチレン","ベンゼン","酢酸ナトリウム","炭化カルシウム"].includes(n)?"root":""}" data-name="${n}" style="left:${nodes[n][0]}px;top:${nodes[n][1]}px">${n}</div>`);
  html+='</div>'; $("#mapCanvas").innerHTML=html;
  $("#mapCanvas").querySelectorAll(".map-label").forEach(el=>el.addEventListener("click",()=>{const r=routes.find(x=>x.id===el.dataset.id);$("#mapTitle").textContent=`${r.from} → ${r.to}`;$("#mapBody").innerHTML=`<b>条件：</b>${r.condition}<br><br>${r.exp}`}));
  $("#mapCanvas").querySelectorAll(".map-node").forEach(el=>el.addEventListener("click",()=>{const name=el.dataset.name,out=mapRoutes.filter(r=>r.from===name);$("#mapTitle").textContent=name;$("#mapBody").innerHTML=out.length?out.map(r=>`${r.condition} → ${r.to}`).join("<br>"):"ここから進む代表反応は未登録です。"}));
}
function renderAll(){renderSummary();renderUnits();renderRecords();renderDict();renderMap()}
$$(".nav").forEach(n=>n.addEventListener("click",()=>showPage(n.dataset.page)));
$("#unitSelect").addEventListener("change",e=>{state.selectedUnit=e.target.value;save()});
$("#startQa").addEventListener("click",()=>start("qa")); $("#startTf").addEventListener("click",()=>start("tf")); $("#startRoute").addEventListener("click",()=>start("route"));
$("#showAnswer").addEventListener("click",showQaAnswer); $("#qaGood").addEventListener("click",()=>{mark("qa",qaSet[idx],true);nextQa()}); $("#qaBad").addEventListener("click",()=>{mark("qa",qaSet[idx],false);nextQa()});
$("#trueBtn").addEventListener("click",()=>answerTf(true)); $("#falseBtn").addEventListener("click",()=>answerTf(false)); $("#tfNext").addEventListener("click",nextTf); $("#routeNext").addEventListener("click",nextRoute);
$("#dictSearch").addEventListener("input",renderDict);
$("#resetBtn").addEventListener("click",()=>{if(confirm("記録をリセットしますか？")){state={tries:{},correct:{},wrong:{},selectedUnit:"u01"};save()}});
renderAll();
