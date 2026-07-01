import { units } from "./data/units.js";
import { qa } from "./data/qa.js";
import { tf } from "./data/tf.js";
import { choices } from "./data/choices.js";
import { routes } from "./data/routes.js";
import { dictionary } from "./data/dictionary.js";

const $=q=>document.querySelector(q), $$=q=>[...document.querySelectorAll(q)];
const LS="chemquest-organic-v7";
let state=JSON.parse(localStorage.getItem(LS)||'{"tries":{},"correct":{},"wrong":{},"bookmarks":{},"selectedUnit":"u01"}');
let sets={qa:[],tf:[],choice:[],route:[]}, idx=0;

function key(type,id){return type+":"+id}
function allItems(){return [...qa.map(x=>({...x,type:"qa"})),...tf.map(x=>({...x,type:"tf"})),...choices.map(x=>({...x,type:"choice"})),...routes.map(x=>({...x,type:"route"}))]}
function byUnit(mode,unit){const src={qa,tf,choice:choices,route:routes}[mode];return src.filter(x=>x.unit===unit)}
function unitCounts(unit){return {qa:byUnit("qa",unit).length, tf:byUnit("tf",unit).length, choice:byUnit("choice",unit).length, route:byUnit("route",unit).length}}
function stats(unit){
  const items=allItems().filter(x=>x.unit===unit), tries=items.filter(x=>state.tries[key(x.type,x.id)]).length, correct=items.filter(x=>state.correct[key(x.type,x.id)]).length;
  const rate=tries?Math.round(correct/tries*100):0; let label="未習得"; if(tries>0)label=rate>=90?"完成":rate>=70?"定着":"練習中";
  return {total:items.length,tries,correct,rate,label}
}
function overall(){const tries=Object.keys(state.tries).length, correct=Object.keys(state.correct).length, weak=Object.keys(state.wrong).length, book=Object.keys(state.bookmarks||{}).length, rate=tries?Math.round(correct/tries*100):0;return{tries,correct,weak,book,rate}}
function shuffle(a){return [...a].sort(()=>Math.random()-.5)}
function limit(list){const n=$("#countSelect")?.value||"5"; return n==="all"?shuffle(list):shuffle(list).slice(0,Number(n))}
function save(){localStorage.setItem(LS,JSON.stringify(state));renderAll()}
function renderSummary(){const o=overall();$("#overallRate").textContent=o.rate+"%";$("#donut").style.setProperty("--p",o.rate+"%");$("#tryCount").textContent=o.tries;$("#correctCount").textContent=o.correct;$("#weakCount").textContent=o.weak;$("#bookCount").textContent=o.book;$("#totalCount").textContent=allItems().length}
function renderUnits(){
  const select = $("#unitSelect");
  const optionsHtml = units.map(u=>`<option value="${u.id}">${u.title}</option>`).join("");
  if(select.innerHTML !== optionsHtml){ select.innerHTML = optionsHtml; }
  if(!units.some(u=>u.id===state.selectedUnit)){ state.selectedUnit = units[0].id; }
  select.value = state.selectedUnit;

  $("#unitCards").innerHTML=units.map((u,i)=>{const s=stats(u.id),c=unitCounts(u.id);const selected=u.id===state.selectedUnit?" selected":"";return `<article class="unit-card ${u.color}${selected}" data-id="${u.id}"><div class="num">${i+1}</div><div class="unit-icon">${u.icon}</div><h3>${u.title}</h3><p>${u.desc}</p><div class="counts"><span>一答 ${c.qa}</span><span>正誤 ${c.tf}</span><span>選択 ${c.choice}</span><span>製法 ${c.route}</span></div><div class="quick-starts"><button data-quick="qa">一答</button><button data-quick="tf">正誤</button><button data-quick="choice">選択</button><button data-quick="route">製法</button></div><button class="start-main" data-quick="choice">この単元を始める →</button><div><div class="progress-label">習熟度　${s.rate}%</div><div class="bar"><div style="width:${s.rate}%"></div></div></div><div class="badge">${s.label}</div></article>`}).join("");

  $("#unitCards").querySelectorAll(".unit-card").forEach(el=>el.addEventListener("click",(ev)=>{
    const unitId = el.dataset.id;
    const mode = ev.target?.dataset?.quick || "choice";
    setSelectedUnit(unitId);
    start(mode, null, unitId);
  }));

  $("#unitList").innerHTML=units.map((u,i)=>{const s=stats(u.id),c=unitCounts(u.id);return `<article class="unit-row ${u.id===state.selectedUnit?"selected":""}" data-id="${u.id}"><div class="num">${i+1}</div><div><h3>${u.icon} ${u.title}</h3><p>${u.short}｜一答${c.qa}・正誤${c.tf}・選択${c.choice}・製法${c.route}</p><div class="bar"><div style="width:${s.rate}%"></div></div></div><b>${s.rate}%</b></article>`}).join("");
  $("#unitList").querySelectorAll(".unit-row").forEach(el=>el.addEventListener("click",()=>{
    const unitId = el.dataset.id;
    setSelectedUnit(unitId);
    start("choice", null, unitId);
  }));
}
function setSelectedUnit(unitId){
  if(!units.some(u=>u.id===unitId)) return;
  state.selectedUnit = unitId;
  const select = $("#unitSelect");
  if(select) select.value = unitId;
  localStorage.setItem(LS,JSON.stringify(state));
}
function showPage(p){$$(".page").forEach(x=>x.classList.remove("active"));$("#"+p).classList.add("active");$$(".nav").forEach(n=>n.classList.toggle("active",n.dataset.page===p))}
function mark(type,item,ok){const k=key(type,item.id);state.tries[k]=true;if(ok){state.correct[k]=true;delete state.wrong[k]}else{delete state.correct[k];state.wrong[k]=true}localStorage.setItem(LS,JSON.stringify(state));renderSummary();renderRecords();renderUnits()}
function bookmark(type,item){const k=key(type,item.id);if(state.bookmarks[k])delete state.bookmarks[k];else state.bookmarks[k]=true;save()}
function start(mode, customList=null, unitOverride=null){
  const unitId = unitOverride || $("#unitSelect")?.value || state.selectedUnit;
  setSelectedUnit(unitId);
  sets[mode]=customList?customList:limit(byUnit(mode,state.selectedUnit));
  idx=0;
  showPage(mode);
  if(mode==="qa")showQa();
  if(mode==="tf")showTf();
  if(mode==="choice")showChoice();
  if(mode==="route")showRoute();
}
function startWeak(){const items=allItems().filter(x=>state.wrong[key(x.type,x.id)]);startMixed(items)}
function startBook(){const items=allItems().filter(x=>state.bookmarks?.[key(x.type,x.id)]);startMixed(items)}
function startMixed(items){if(!items.length){alert("対象の問題がありません。");return}const first=items[0].type;const list=items.filter(x=>x.type===first);if(first==="choice")start("choice",list);if(first==="qa")start("qa",list);if(first==="tf")start("tf",list);if(first==="route")start("route",list)}
function showQa(){const q=sets.qa[idx];if(!q)return;$("#qaUnitTitle").textContent=units.find(u=>u.id===q.unit).title;$("#qaProgress").textContent=`${idx+1} / ${sets.qa.length}`;$("#qaQuestion").textContent=q.q;$("#answerBox").classList.add("hidden");$("#qaJudge").classList.add("hidden");$("#answerBox").innerHTML="";renderQaChoices(q)}
function renderQaChoices(q){const opts=shuffle(q.choices||[]);$("#qaChoices").innerHTML=opts.map(c=>`<button class="choice">${c}</button>`).join("");$("#qaChoices").querySelectorAll(".choice").forEach(btn=>btn.addEventListener("click",()=>{const ok=btn.textContent===q.a;$("#qaChoices").querySelectorAll(".choice").forEach(b=>{if(b.textContent===q.a)b.classList.add("correct");else if(b===btn)b.classList.add("wrong");b.disabled=true});mark("qa",q,ok);$("#answerBox").classList.remove("hidden");$("#qaJudge").classList.remove("hidden");$("#answerBox").innerHTML=`<b>答え：</b>${q.a}<br><br><b>解説：</b>${q.exp}`}))}
function showQaAnswer(){const q=sets.qa[idx];$("#answerBox").classList.remove("hidden");$("#qaJudge").classList.remove("hidden");$("#answerBox").innerHTML=`<b>答え：</b>${q.a}<br><br><b>解説：</b>${q.exp}`}
function nextQa(){if(idx<sets.qa.length-1){idx++;showQa()}else{showPage("home");renderAll()}}
function prevQa(){if(idx>0){idx--;showQa()}}
function showTf(){const q=sets.tf[idx];if(!q)return;$("#tfUnitTitle").textContent=units.find(u=>u.id===q.unit).title;$("#tfProgress").textContent=`${idx+1} / ${sets.tf.length}`;$("#tfQuestion").textContent=q.text;$("#tfFeedback").textContent=""}
function answerTf(ans){const q=sets.tf[idx],ok=ans===q.answer;mark("tf",q,ok);$("#tfFeedback").textContent=(ok?"正解！ ":"不正解。 ")+q.exp}
function nextTf(){if(idx<sets.tf.length-1){idx++;showTf()}else{showPage("home");renderAll()}}
function prevTf(){if(idx>0){idx--;showTf()}}
function renderChoiceCommon(item, container, handler){const randomized=shuffle(item.choices||[]);container.innerHTML=randomized.map(c=>`<button class="choice">${c}</button>`).join("");container.querySelectorAll(".choice").forEach(btn=>btn.addEventListener("click",()=>handler(btn,item)))}
function showChoice(){const q=sets.choice[idx];if(!q)return;$("#choiceUnitTitle").textContent=units.find(u=>u.id===q.unit).title;$("#choiceProgress").textContent=`${idx+1} / ${sets.choice.length}`;$("#choiceQuestion").textContent=q.q;$("#choiceFeedback").textContent="";renderChoiceCommon(q,$("#choiceOptions"),answerChoice)}
function answerChoice(btn,q){const ok=btn.textContent===q.answer;mark("choice",q,ok);$("#choiceOptions").querySelectorAll(".choice").forEach(b=>{if(b.textContent===q.answer)b.classList.add("correct");else if(b===btn)b.classList.add("wrong");b.disabled=true});$("#choiceFeedback").textContent=(ok?"正解！ ":"不正解。 ")+q.exp}
function nextChoice(){if(idx<sets.choice.length-1){idx++;showChoice()}else{showPage("home");renderAll()}}
function prevChoice(){if(idx>0){idx--;showChoice()}}
function showRoute(){const r=sets.route[idx];if(!r)return;$("#routeUnitTitle").textContent=units.find(u=>u.id===r.unit).title;$("#routeProgress").textContent=`${idx+1} / ${sets.route.length}`;$("#routeQuestion").textContent=r.q;$("#routeFeedback").textContent="";let opts=shuffle([r.answer,...routes.filter(x=>x.unit===r.unit&&x.to!==r.answer).map(x=>x.to)]);opts=[...new Set(opts)];if(opts.length<4){opts=[...new Set([...opts,...routes.filter(x=>x.to!==r.answer).map(x=>x.to)])]};opts=opts.slice(0,4);if(!opts.includes(r.answer))opts[0]=r.answer;const item={...r,choices:shuffle(opts),answer:r.answer};renderChoiceCommon(item,$("#routeChoices"),answerRoute)}
function answerRoute(btn,r){const ok=btn.textContent===r.answer;mark("route",r,ok);$("#routeChoices").querySelectorAll(".choice").forEach(b=>{if(b.textContent===r.answer)b.classList.add("correct");else if(b===btn)b.classList.add("wrong");b.disabled=true});$("#routeFeedback").textContent=(ok?"正解！ ":"不正解。 ")+r.exp}
function nextRoute(){if(idx<sets.route.length-1){idx++;showRoute()}else{showPage("home");renderAll()}}
function prevRoute(){if(idx>0){idx--;showRoute()}}
function renderRecords(){const rows=units.map(u=>{const s=stats(u.id);return `<tr><td>${u.title}</td><td>${s.correct}</td><td>${s.tries}</td><td>${s.rate}%</td><td>${s.total}</td></tr>`}).join("");$("#recordRows").innerHTML=rows;const flagged=allItems().filter(x=>state.wrong[key(x.type,x.id)]||state.bookmarks?.[key(x.type,x.id)]);$("#weakList").innerHTML=flagged.length?flagged.map(x=>`<article class="weak-card"><b>${units.find(u=>u.id===x.unit)?.title||""}</b><p>${x.q||x.text}</p><small>${x.exp||""}</small></article>`).join(""):""}
function renderDict(){const w=($("#dictSearch").value||"").trim();const list=dictionary.filter(d=>!w||`${d.term}${d.category}${d.formula}${d.desc}`.includes(w));$("#dictGrid").innerHTML=list.map(d=>`<article class="dict-card"><span class="tag">${d.category}</span><h3>${d.term}</h3><p><b>${d.formula}</b></p><p>${d.desc}</p></article>`).join("")}
function renderMap(){const preset={"酢酸ナトリウム":[100,80],"メタン":[300,80],"クロロメタン":[500,80],"ジクロロメタン":[700,80],"クロロホルム":[900,80],"四塩化炭素":[1100,80],"炭化カルシウム":[100,180],"アセチレン":[300,180],"ベンゼン":[500,210],"エチレン":[100,330],"エタノール":[300,330],"アセトアルデヒド":[520,330],"酢酸":[740,330],"酢酸エチル":[960,330],"ポリエチレン":[300,450],"ジエチルエーテル":[520,450],"アセトン":[520,560],"ニトロベンゼン":[700,210],"アニリン":[900,210],"塩化ベンゼンジアゾニウム":[900,330],"アゾ染料":[1100,330],"フェノール＋アセトン":[700,560],"フェノール":[700,680],"トルエン":[900,560],"安息香酸":[1100,560],"サリチル酸":[900,680],"アセチルサリチル酸":[1100,680],"PET":[300,680],"ナイロン66":[520,680],"ポリ塩化ビニル":[100,560],"ポリスチレン":[100,680]};const nodes={},names=[...new Set(routes.flatMap(r=>[r.from,r.to]))];names.forEach((n,i)=>nodes[n]=preset[n]||[120+(i%6)*180,120+Math.floor(i/6)*120]);let html='<div class="stage">';routes.forEach(r=>{const a=nodes[r.from],b=nodes[r.to];if(!a||!b)return;const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy),ang=Math.atan2(dy,dx)*180/Math.PI;html+=`<div class="map-line" style="left:${a[0]}px;top:${a[1]}px;width:${len}px;transform:rotate(${ang}deg)"></div><div class="map-label" data-id="${r.id}" style="left:${(a[0]+b[0])/2}px;top:${(a[1]+b[1])/2}px">${r.condition}</div>`});names.forEach(n=>html+=`<div class="map-node ${["エチレン","ベンゼン","酢酸ナトリウム","炭化カルシウム"].includes(n)?"root":""}" data-name="${n}" style="left:${nodes[n][0]}px;top:${nodes[n][1]}px">${n}</div>`);html+='</div>';$("#mapCanvas").innerHTML=html;$("#mapCanvas").querySelectorAll(".map-label").forEach(el=>el.addEventListener("click",()=>{const r=routes.find(x=>x.id===el.dataset.id);$("#mapTitle").textContent=`${r.from} → ${r.to}`;$("#mapBody").innerHTML=`<b>条件：</b>${r.condition}<br><br>${r.exp}`}));$("#mapCanvas").querySelectorAll(".map-node").forEach(el=>el.addEventListener("click",()=>{const name=el.dataset.name,out=routes.filter(r=>r.from===name);$("#mapTitle").textContent=name;$("#mapBody").innerHTML=out.length?out.map(r=>`${r.condition} → ${r.to}`).join("<br>"):"ここから進む代表反応は未登録です。"}))}
function renderAll(){renderSummary();renderUnits();renderRecords();renderDict();renderMap()}
$$(".nav").forEach(n=>n.addEventListener("click",()=>showPage(n.dataset.page)));
$$("[data-start]").forEach(b=>b.addEventListener("click",()=>start(b.dataset.start,null,$("#unitSelect").value)));
$("#unitSelect").addEventListener("change",e=>{setSelectedUnit(e.target.value);renderUnits()});
$("#showAnswer").addEventListener("click",showQaAnswer);$("#qaGood").addEventListener("click",()=>{mark("qa",sets.qa[idx],true);nextQa()});$("#qaBad").addEventListener("click",()=>{mark("qa",sets.qa[idx],false);nextQa()});$("#qaPrev").addEventListener("click",prevQa);$("#qaBook").addEventListener("click",()=>bookmark("qa",sets.qa[idx]));
$("#trueBtn").addEventListener("click",()=>answerTf(true));$("#falseBtn").addEventListener("click",()=>answerTf(false));$("#tfNext").addEventListener("click",nextTf);$("#tfPrev").addEventListener("click",prevTf);$("#tfBook").addEventListener("click",()=>bookmark("tf",sets.tf[idx]));
$("#choiceNext").addEventListener("click",nextChoice);$("#choicePrev").addEventListener("click",prevChoice);$("#choiceBook").addEventListener("click",()=>bookmark("choice",sets.choice[idx]));$("#routeNext").addEventListener("click",nextRoute);$("#routePrev").addEventListener("click",prevRoute);$("#routeBook").addEventListener("click",()=>bookmark("route",sets.route[idx]));
$("#dictSearch").addEventListener("input",renderDict);
$("#resetTopBtn").addEventListener("click",()=>{if(confirm("記録をリセットしますか？")){state={tries:{},correct:{},wrong:{},bookmarks:{},selectedUnit:"u01"};save()}});
$("#weakStartBtn").addEventListener("click",startWeak);$("#bookStartBtn").addEventListener("click",startBook);
renderAll();
