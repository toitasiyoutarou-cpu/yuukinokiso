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
  $("#unitList").querySelectorAll(".unit-row").forEach(el=>el.addEventListener("click",()=>{const unitId=el.dataset.id;setSelectedUnit(unitId);start("choice",null,unitId)}));
}
function setSelectedUnit(unitId){
  if(!units.some(u=>u.id===unitId)) return;
  state.selectedUnit = unitId;
  const select = $("#unitSelect");
  if(select) select.value = unitId;
  localStorage.setItem(LS,JSON.stringify(state));
}
function showPage(p){
  $$(".page").forEach(x=>x.classList.remove("active"));
  $("#"+p).classList.add("active");
  $$(".nav").forEach(n=>n.classList.toggle("active",n.dataset.page===p));
  if(p==="home" || p==="units"){ renderUnits(); }
}
function mark(type,item,ok){const k=key(type,item.id);state.tries[k]=true;if(ok){state.correct[k]=true;delete state.wrong[k]}else{delete state.correct[k];state.wrong[k]=true}localStorage.setItem(LS,JSON.stringify(state));renderSummary();renderRecords();renderUnits()}
function bookmark(type,item){const k=key(type,item.id);if(state.bookmarks[k])delete state.bookmarks[k];else state.bookmarks[k]=true;save()}
function start(mode, customList=null, unitOverride=null){
  const unitId = unitOverride || $("#unitSelect")?.value || state.selectedUnit;
  setSelectedUnit(unitId);
  let pool = customList ? customList : byUnit(mode,state.selectedUnit);

  // 製法が0問の単元で左バーから押した場合は、同じ単元の選択問題へ自動で逃がす
  if(!pool.length && mode==="route"){
    const alt = byUnit("choice", state.selectedUnit);
    if(alt.length){
      alert("この単元には製法クイズがまだ少ないため、選択問題を開きます。");
      mode = "choice";
      pool = alt;
    }
  }

  if(!pool.length){
    alert("この単元には、この形式の問題がまだありません。単元カードの問題数を確認してください。");
    showPage("home");
    return;
  }

  sets[mode] = customList ? pool : limit(pool);
  idx = 0;
  showPage(mode);
  if(mode==="qa") showQa();
  if(mode==="tf") showTf();
  if(mode==="choice") showChoice();
  if(mode==="route") showRoute();
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
function showRoute(){
  const r = sets.route[idx];
  if(!r){
    $("#routeUnitTitle").textContent = "製法・反応ルート";
    $("#routeProgress").textContent = "0 / 0";
    $("#routeQuestion").textContent = "この単元には製法クイズがありません。単元カードの「選択」または「一答」から始めてください。";
    $("#routeChoices").innerHTML = "";
    $("#routeFeedback").textContent = "";
    return;
  }
  const unit = units.find(u=>u.id===r.unit);
  $("#routeUnitTitle").textContent = unit ? unit.title : "製法・反応ルート";
  $("#routeProgress").textContent = `${idx+1} / ${sets.route.length}`;
  $("#routeQuestion").textContent = r.q || `${r.from}を「${r.condition}」すると何ができる？`;
  $("#routeFeedback").textContent = "";

  let opts = [r.answer, ...routes.filter(x=>x.unit===r.unit && x.to!==r.answer).map(x=>x.to)];
  opts = [...new Set(opts)];
  if(opts.length < 4){
    opts = [...new Set([...opts, ...routes.filter(x=>x.to!==r.answer).map(x=>x.to)])];
  }
  opts = opts.slice(0,4);
  if(!opts.includes(r.answer)) opts[0] = r.answer;
  const item = {...r, choices:shuffle(opts), answer:r.answer};
  renderChoiceCommon(item,$("#routeChoices"),answerRoute);
}
function answerRoute(btn,r){const ok=btn.textContent===r.answer;mark("route",r,ok);$("#routeChoices").querySelectorAll(".choice").forEach(b=>{if(b.textContent===r.answer)b.classList.add("correct");else if(b===btn)b.classList.add("wrong");b.disabled=true});$("#routeFeedback").textContent=(ok?"正解！ ":"不正解。 ")+r.exp}
function nextRoute(){if(idx<sets.route.length-1){idx++;showRoute()}else{showPage("home");renderAll()}}
function prevRoute(){if(idx>0){idx--;showRoute()}}
function renderRecords(){const rows=units.map(u=>{const s=stats(u.id);return `<tr><td>${u.title}</td><td>${s.correct}</td><td>${s.tries}</td><td>${s.rate}%</td><td>${s.total}</td></tr>`}).join("");$("#recordRows").innerHTML=rows;const flagged=allItems().filter(x=>state.wrong[key(x.type,x.id)]||state.bookmarks?.[key(x.type,x.id)]);$("#weakList").innerHTML=flagged.length?flagged.map(x=>`<article class="weak-card"><b>${units.find(u=>u.id===x.unit)?.title||""}</b><p>${x.q||x.text}</p><small>${x.exp||""}</small></article>`).join(""):""}
function renderDict(){const w=($("#dictSearch").value||"").trim();const list=dictionary.filter(d=>!w||`${d.term}${d.category}${d.formula}${d.desc}`.includes(w));$("#dictGrid").innerHTML=list.map(d=>`<article class="dict-card"><span class="tag">${d.category}</span><h3>${d.term}</h3><p><b>${d.formula}</b></p><p>${d.desc}</p></article>`).join("")}
function renderMap(){
  const groups = [
    {
      title:"脂肪族：エチレン系列",
      y:70,
      nodes:[
        ["炭化カルシウム",90,70],["アセチレン",270,70],["エチレン",450,70],["エタノール",630,70],["アセトアルデヒド",850,70],["酢酸",1060,70],["酢酸エチル",1270,70],
        ["ポリエチレン",450,190],["ジエチルエーテル",630,190],["アセトン",850,190]
      ]
    },
    {
      title:"芳香族：ベンゼン系列",
      y:340,
      nodes:[
        ["ベンゼン",90,360],["クロロベンゼン",300,300],["ベンゼンスルホン酸",300,420],["ニトロベンゼン",520,360],["アニリン",740,360],["塩化ベンゼンジアゾニウム",1000,300],["アゾ染料",1260,300],
        ["フェノール",740,500],["安息香酸",1000,500],["サリチル酸",1260,500],["アセチルサリチル酸",1500,500]
      ]
    },
    {
      title:"高分子・天然高分子",
      y:650,
      nodes:[
        ["塩化ビニル",90,690],["ポリ塩化ビニル",300,690],["スチレン",520,690],["ポリスチレン",740,690],["PET",1000,690],["ナイロン66",1260,690],
        ["グルコース",90,820],["デンプン",300,820],["セルロース",520,820],["アミノ酸",740,820],["タンパク質",1000,820]
      ]
    }
  ];

  const nodes = {};
  groups.forEach(g=>g.nodes.forEach(([name,x,y])=>{nodes[name]=[x,y]}));

  let html = '<div class="stage clear-map">';
  groups.forEach(g=>{
    html += `<div class="map-group-title" style="left:30px;top:${g.y-55}px">${g.title}</div>`;
  });

  routes.forEach(r=>{
    const a = nodes[r.from], b = nodes[r.to];
    if(!a || !b) return;
    const dx=b[0]-a[0], dy=b[1]-a[1], len=Math.hypot(dx,dy), ang=Math.atan2(dy,dx)*180/Math.PI;
    html += `<div class="map-line" style="left:${a[0]}px;top:${a[1]}px;width:${len}px;transform:rotate(${ang}deg)"></div>`;
    html += `<div class="map-label" data-id="${r.id}" style="left:${(a[0]+b[0])/2}px;top:${(a[1]+b[1])/2}px">${r.condition}</div>`;
  });

  Object.entries(nodes).forEach(([name,pos])=>{
    const root = ["炭化カルシウム","エチレン","ベンゼン","グルコース","アミノ酸"].includes(name) ? "root" : "";
    html += `<div class="map-node ${root}" data-name="${name}" style="left:${pos[0]}px;top:${pos[1]}px">${name}</div>`;
  });
  html += '</div>';

  $("#mapCanvas").innerHTML = html;
  $("#mapCanvas").querySelectorAll(".map-label").forEach(el=>el.addEventListener("click",()=>{
    const r=routes.find(x=>x.id===el.dataset.id);
    if(!r) return;
    $("#mapTitle").textContent=`${r.from} → ${r.to}`;
    $("#mapBody").innerHTML=`<b>条件：</b>${r.condition}<br><br>${r.exp || ""}`;
  }));
  $("#mapCanvas").querySelectorAll(".map-node").forEach(el=>el.addEventListener("click",()=>{
    const name=el.dataset.name;
    const out=routes.filter(r=>r.from===name);
    const inc=routes.filter(r=>r.to===name);
    $("#mapTitle").textContent=name;
    $("#mapBody").innerHTML=
      `<b>ここから進む反応</b><br>${out.length?out.map(r=>`${r.condition} → ${r.to}`).join("<br>"):"なし"}<br><br>`+
      `<b>ここに来る反応</b><br>${inc.length?inc.map(r=>`${r.from} → ${r.condition}`).join("<br>"):"なし"}`;
  }));
}
function renderAll(){renderSummary();renderUnits();renderRecords();renderDict();renderMap()}
$$(".nav").forEach(n=>n.addEventListener("click",()=>{
  const page = n.dataset.page;
  const unitId = $("#unitSelect")?.value || state.selectedUnit;
  if(page==="qa"){ start("qa", null, unitId); return; }
  if(page==="tf"){ start("tf", null, unitId); return; }
  if(page==="choice"){ start("choice", null, unitId); return; }
  if(page==="route"){ start("route", null, unitId); return; }
  showPage(page);
}));
$$("[data-start]").forEach(b=>b.addEventListener("click",()=>start(b.dataset.start,null,$("#unitSelect").value)));
$("#unitSelect").addEventListener("change",e=>{setSelectedUnit(e.target.value);renderUnits()});
$("#showAnswer").addEventListener("click",showQaAnswer);$("#qaGood").addEventListener("click",()=>{mark("qa",sets.qa[idx],true);nextQa()});$("#qaBad").addEventListener("click",()=>{mark("qa",sets.qa[idx],false);nextQa()});$("#qaPrev").addEventListener("click",prevQa);$("#qaBook").addEventListener("click",()=>bookmark("qa",sets.qa[idx]));
$("#trueBtn").addEventListener("click",()=>answerTf(true));$("#falseBtn").addEventListener("click",()=>answerTf(false));$("#tfNext").addEventListener("click",nextTf);$("#tfPrev").addEventListener("click",prevTf);$("#tfBook").addEventListener("click",()=>bookmark("tf",sets.tf[idx]));
$("#choiceNext").addEventListener("click",nextChoice);$("#choicePrev").addEventListener("click",prevChoice);$("#choiceBook").addEventListener("click",()=>bookmark("choice",sets.choice[idx]));$("#routeNext").addEventListener("click",nextRoute);$("#routePrev").addEventListener("click",prevRoute);$("#routeBook").addEventListener("click",()=>bookmark("route",sets.route[idx]));
$("#dictSearch").addEventListener("input",renderDict);
$("#resetTopBtn").addEventListener("click",()=>{if(confirm("記録をリセットしますか？")){state={tries:{},correct:{},wrong:{},bookmarks:{},selectedUnit:"u01"};save()}});
$("#weakStartBtn").addEventListener("click",startWeak);$("#bookStartBtn").addEventListener("click",startBook);
renderAll();
