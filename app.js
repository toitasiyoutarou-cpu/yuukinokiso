import { maps } from "./data/reactions.js";
import { terms } from "./data/terms.js";
import { flashcards } from "./data/flashcards.js";
import { ctQuestions } from "./data/ctquestions.js";

const $ = (q)=>document.querySelector(q);
const $$ = (q)=>[...document.querySelectorAll(q)];
const LS = "chemquest-organic-progress-v2";
let progress = JSON.parse(localStorage.getItem(LS) || '{"correct":{},"wrong":{},"unlocked":{},"streak":0}');
let currentMap = maps[0];
let currentFlash = null;
let currentCt = null;
let showAll = false;

function save(){ localStorage.setItem(LS, JSON.stringify(progress)); updateStats(); }
function allMapReactions(){ return maps.flatMap(m=>m.reactions.map(r=>({...r,source:"map",mapTitle:m.title}))); }
function allItems(){
  return [
    ...flashcards.map(x=>({...x,source:"flash"})),
    ...ctQuestions.map(x=>({...x,source:"ct"})),
    ...allMapReactions()
  ];
}
function key(item){ return `${item.source}:${item.id}`; }
function updateStats(){
  const total = allItems().length;
  const correct = Object.keys(progress.correct || {}).length;
  const wrong = Object.keys(progress.wrong || {}).length;
  const pct = total ? Math.round(correct/total*100) : 0;
  $("#masteryText").textContent = pct + "%";
  $("#masteryBar").style.width = pct + "%";
  $("#correctCount").textContent = correct;
  $("#wrongCount").textContent = wrong;
  $("#streakCount").textContent = progress.streak || 0;
  renderCategoryStats();
}
function categoriesFor(items){
  return ["すべて", ...new Set(items.map(x=>x.category || "その他"))];
}
function fillSelect(sel, cats){
  sel.innerHTML = cats.map(c=>`<option value="${c}">${c}</option>`).join("");
}
function choose(list){ return list[Math.floor(Math.random()*list.length)] || list[0]; }
function mark(item, ok){
  const k = key(item);
  if(ok){
    progress.correct[k] = true;
    delete progress.wrong[k];
    progress.streak = (progress.streak || 0) + 1;
    if(item.source==="map"){ progress.unlocked[item.id] = true; }
  }else{
    progress.wrong[k] = true;
    progress.streak = 0;
  }
  save();
}
function switchMode(mode){
  $$(".tab").forEach(b=>b.classList.toggle("active", b.dataset.mode===mode));
  $$(".mode").forEach(m=>m.classList.remove("active"));
  $("#" + mode + "Mode").classList.add("active");
  if(mode==="flash") nextFlash();
  if(mode==="ct") nextCt();
  if(mode==="review") renderReview();
  if(mode==="home") renderCategoryStats();
}
function initTabs(){
  $$(".tab").forEach(btn=>btn.addEventListener("click",()=>switchMode(btn.dataset.mode)));
  $$(".jump").forEach(el=>el.addEventListener("click",()=>switchMode(el.dataset.mode)));
}
function renderCategoryStats(){
  const holder = $("#categoryStats");
  if(!holder) return;
  const cats = [...new Set(allItems().map(x=>x.category || "その他"))];
  holder.innerHTML = cats.map(cat=>{
    const items = allItems().filter(x=>(x.category || "その他")===cat);
    const done = items.filter(x=>progress.correct[key(x)]).length;
    const pct = items.length ? Math.round(done/items.length*100) : 0;
    return `<div class="cat-row"><small><b>${cat}</b><span>${pct}%</span></small><div class="mini-meter"><div style="width:${pct}%"></div></div><small><span>${done}/${items.length}</span><span>完了</span></small></div>`;
  }).join("");
}
function initFlash(){
  fillSelect($("#flashCategory"), categoriesFor(flashcards));
  $("#newFlashBtn").addEventListener("click", nextFlash);
  $("#showAnswerBtn").addEventListener("click", showFlashAnswer);
  $("#flashCorrectBtn").addEventListener("click",()=>{ mark(currentFlash,true); nextFlash(); });
  $("#flashWrongBtn").addEventListener("click",()=>{ mark(currentFlash,false); nextFlash(); });
}
function nextFlash(){
  const cat = $("#flashCategory").value || "すべて";
  const pool = flashcards.filter(x=>cat==="すべて" || x.category===cat);
  currentFlash = choose(pool);
  $("#flashMeta").textContent = `${currentFlash.category} / 一問一答`;
  $("#flashQuestion").textContent = currentFlash.q;
  $("#flashAnswerBox").classList.add("hidden");
  $("#flashAnswerBox").innerHTML = "";
  $("#flashCorrectBtn").classList.add("hidden");
  $("#flashWrongBtn").classList.add("hidden");
}
function showFlashAnswer(){
  $("#flashAnswerBox").classList.remove("hidden");
  $("#flashAnswerBox").innerHTML = `<b>答え：</b>${currentFlash.a}<br><br><b>解説：</b>${currentFlash.exp}`;
  $("#flashCorrectBtn").classList.remove("hidden");
  $("#flashWrongBtn").classList.remove("hidden");
}
function initCt(){
  fillSelect($("#ctCategory"), categoriesFor(ctQuestions));
  $("#nextCtBtn").addEventListener("click", nextCt);
}
function nextCt(){
  const cat = $("#ctCategory").value || "すべて";
  const pool = ctQuestions.filter(x=>cat==="すべて" || x.category===cat);
  currentCt = choose(pool);
  $("#ctMeta").textContent = `${currentCt.category} / ★${currentCt.difficulty} / ${currentCt.type}`;
  $("#ctQuestion").textContent = currentCt.q;
  $("#ctFeedback").textContent = "";
  $("#ctChoices").innerHTML = currentCt.choices.map((c,i)=>`<button class="choice" data-i="${i}">${c}</button>`).join("");
  $("#ctChoices").querySelectorAll(".choice").forEach(btn=>btn.addEventListener("click",()=>answerCt(btn)));
}
function answerCt(btn){
  const i = Number(btn.dataset.i);
  const ok = i === currentCt.answer;
  $("#ctChoices").querySelectorAll(".choice").forEach(b=>{
    const bi = Number(b.dataset.i);
    if(bi === currentCt.answer) b.classList.add("correct");
    else if(b === btn) b.classList.add("wrong");
    b.disabled = true;
  });
  $("#ctFeedback").textContent = ok ? `正解！ ${currentCt.exp}` : `不正解。正解は「${currentCt.choices[currentCt.answer]}」。${currentCt.exp}`;
  mark(currentCt, ok);
}
function initMapSelect(){
  const sel = $("#mapSelect");
  sel.innerHTML = maps.map(m=>`<option value="${m.id}">${m.title}</option>`).join("");
  sel.addEventListener("change",()=>{ currentMap = maps.find(m=>m.id===sel.value); renderMap(); });
}
function isUnlocked(r){
  if(showAll) return true;
  if(progress.unlocked?.[r.id] || progress.correct?.[`map:${r.id}`]) return true;
  return r.from === currentMap.root;
}
function computeNodes(map){
  const names = [...new Set([map.root, ...map.reactions.flatMap(r=>[r.from,r.to])])];
  const level = {[map.root]:0};
  let changed = true;
  while(changed){
    changed = false;
    for(const r of map.reactions){
      if(level[r.from] !== undefined && (level[r.to] === undefined || level[r.to] > level[r.from]+1)){
        level[r.to] = level[r.from]+1; changed = true;
      }
    }
  }
  names.forEach(n=>{ if(level[n]===undefined) level[n]=1; });
  const groups = {};
  names.forEach(n => (groups[level[n]] ||= []).push(n));
  const nodes = {};
  const xGap = 185;
  Object.entries(groups).forEach(([lv, arr])=>{
    arr.forEach((n,i)=>{
      const x = 90 + Number(lv)*xGap;
      const y = 85 + i*(420/Math.max(arr.length-1,1)) + (arr.length===1?190:0);
      nodes[n] = {name:n,x,y,level:Number(lv)};
    });
  });
  return nodes;
}
function renderMap(){
  const canvas = $("#mapCanvas");
  const nodes = computeNodes(currentMap);
  let html = `<div class="map-stage">`;
  for(const r of currentMap.reactions){
    const a=nodes[r.from], b=nodes[r.to];
    const dx=b.x-a.x, dy=b.y-a.y, len=Math.sqrt(dx*dx+dy*dy);
    const angle=Math.atan2(dy,dx)*180/Math.PI;
    html += `<div class="line" style="left:${a.x}px;top:${a.y}px;width:${len}px;transform:rotate(${angle}deg)"></div>`;
    html += `<div class="edge-label" data-rid="${r.id}" style="left:${(a.x+b.x)/2}px;top:${(a.y+b.y)/2}px">${r.condition}</div>`;
  }
  Object.values(nodes).forEach(n=>{
    const incoming = currentMap.reactions.find(r=>r.to===n.name);
    const locked = incoming && !isUnlocked(incoming);
    const done = incoming && progress.correct?.[`map:${incoming.id}`];
    const cls = `node ${n.name===currentMap.root?'root':''} ${done?'done':''} ${locked?'locked':''}`;
    html += `<div class="${cls}" data-node="${n.name}" style="left:${n.x}px;top:${n.y}px">${locked?'？？？':n.name}<small>${done?'MASTER':n.name===currentMap.root?'START':'tap'}</small></div>`;
  });
  html += `</div>`;
  canvas.innerHTML = html;
  canvas.querySelectorAll(".edge-label").forEach(el=>el.addEventListener("click",()=>showReaction(el.dataset.rid)));
  canvas.querySelectorAll(".node").forEach(el=>el.addEventListener("click",()=>showNode(el.dataset.node)));
}
function showNode(name){
  const out = currentMap.reactions.filter(r=>r.from===name);
  const inc = currentMap.reactions.filter(r=>r.to===name);
  $("#detailTitle").textContent = name;
  $("#detailBody").innerHTML = `
    <strong>ここから進む反応</strong><br>${out.map(r=>`・${r.condition} → ${isUnlocked(r)?r.to:"？？？"}`).join("<br>") || "なし"}
    <br><br><strong>ここに来る反応</strong><br>${inc.map(r=>`・${r.from} --${r.condition}→ ${name}`).join("<br>") || "なし"}
  `;
  $("#quizBox").classList.add("hidden");
}
function showReaction(id){
  const r = currentMap.reactions.find(x=>x.id===id);
  $("#detailTitle").textContent = `${r.from} → ${isUnlocked(r)?r.to:"？？？"}`;
  $("#detailBody").innerHTML = `<b>条件・試薬：</b>${r.condition}<br><br>${r.note}`;
  renderInlineQuiz(r);
}
function renderInlineQuiz(r){
  const box = $("#quizBox");
  box.classList.remove("hidden");
  box.innerHTML = `<h3>${r.question}</h3><div class="choices">${r.choices.map(c=>`<button class="choice">${c}</button>`).join("")}</div><p class="feedback"></p>`;
  box.querySelectorAll(".choice").forEach(btn=>btn.addEventListener("click",()=>answerMap(btn, r, box.querySelector(".feedback"))));
}
function answerMap(btn, r, feedback){
  const item = {...r, source:"map"};
  const ok = btn.textContent === r.answer;
  btn.classList.add(ok ? "correct" : "wrong");
  feedback.textContent = ok ? "正解！マップが解放されました。" : `不正解。正解は「${r.answer}」。`;
  mark(item, ok);
  renderMap();
}
function renderTerms(filter=""){
  const f = filter.trim();
  const list = terms.filter(t=>!f || `${t.category}${t.term}${t.formula}${t.desc}`.includes(f));
  $("#termGrid").innerHTML = list.map(t=>`<article class="term-card"><span class="badge">${t.category}</span><h3>${t.term}</h3><p><b>${t.formula}</b></p><p>${t.desc}</p></article>`).join("");
}
function renderReview(){
  const ids = Object.keys(progress.wrong || {});
  const items = allItems().filter(x=>ids.includes(key(x)));
  $("#reviewList").innerHTML = items.length ? items.map(x=>{
    const question = x.q || x.question;
    const answer = x.a || x.answer || (x.choices ? x.choices[x.answer] : "");
    const exp = x.exp || x.note || "";
    return `<div class="review-item"><span class="badge">${x.category || "その他"}</span><br><b>${question}</b><br>答え：${answer}<br><small>${exp}</small></div>`;
  }).join("") : "現在、苦手問題はありません。";
}
$("#resetBtn").addEventListener("click",()=>{ if(confirm("進捗をリセットしますか？")){progress={correct:{},wrong:{},unlocked:{},streak:0};showAll=false;save();renderMap();renderReview();}});
$("#unlockAllBtn").addEventListener("click",()=>{showAll=!showAll; $("#unlockAllBtn").textContent = showAll ? "解放表示を戻す" : "表示だけ全開"; renderMap();});
$("#termSearch").addEventListener("input",e=>renderTerms(e.target.value));

initTabs(); initFlash(); initCt(); initMapSelect(); renderMap(); renderTerms(); updateStats();
