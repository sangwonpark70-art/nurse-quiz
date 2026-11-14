// 문항 검사기 — node tools/validate.js [--control] [--textbook 파일.txt]
//  · index.html에 연결된 bank/*.js 를 실제로 읽어 검사한다(연결 빠진 파일도 잡힘)
//  · --control : 대조군(tools/control_bad.js)이 모두 잡히는지 먼저 확인
//  · --textbook: 교재 원문과 25자 이상 겹치는 문장을 경고(공개 저장소 — 원문 복사 방지)
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..");
const SUBJECTS = ["해부생리", "기초약리", "기초영양", "기본간호", "모성간호", "지역사회"];
const PREFIX = {해부생리: "AP", 기초약리: "PH", 기초영양: "NU", 기본간호: "FN", 모성간호: "MO", 지역사회: "CH"};
const SRC = ["기초간호과학", "기본간호실무", "병원간호실무Ⅰ", "병원간호실무Ⅱ", "지역사회간호", "의료관계법규", "의학용어"];
const TYPES = ["basic", "neg", "case", "combo"];
const LET = ["가", "나", "다", "라", "마"];

function checkOne(q, seenId) {
  const E = [], e = (code, msg) => E.push(code + " " + msg);
  const req = ["id","subject","unit","t","level","tags","scene","items","ask","ch","a","ex","src","page","date","rv","ver"];
  req.forEach(k => { if (!(k in q)) e("FIELD", "필드 없음: " + k); });
  if (E.length) return E;
  if (!/^[A-Z]{2}\d{3}$/.test(q.id)) e("ID", "id 형식");
  if (seenId[q.id]) e("DUPID", "id 중복"); seenId[q.id] = 1;
  if (!SUBJECTS.includes(q.subject)) e("SUBJ", "과목 목록 밖: " + q.subject);
  else if (!q.id.startsWith(PREFIX[q.subject])) e("ID", "과목 접두 불일치");
  if (!TYPES.includes(q.t)) e("TYPE", "유형: " + q.t);
  if (![1,2,3].includes(q.level)) e("LEVEL", "level 1~3");
  if (!Array.isArray(q.tags) || !q.tags.length || q.tags.some(t => typeof t !== "string" || !t.trim())) e("TAGS", "tags 1개 이상");
  if (typeof q.unit !== "string" || !q.unit.trim()) e("UNIT", "unit 비어 있음");
  if (typeof q.ask !== "string" || q.ask.trim().length < 5) e("ASK", "물음 비어 있음");
  if (!Array.isArray(q.ch) || q.ch.length !== 5) e("CH5", "선지는 정확히 5개");
  else {
    if (q.ch.some(c => typeof c !== "string" || !c.trim())) e("CHEMPTY", "빈 선지");
    if (new Set(q.ch.map(c => c.trim())).size !== 5) e("CHDUP", "같은 선지 중복");
  }
  if (!Number.isInteger(q.a) || q.a < 0 || q.a > 4) e("ANS", "정답 범위 0~4");
  if (typeof q.ex !== "string" || !q.ex.startsWith("정답:")) e("EX", "해설은 「정답:」으로 시작");
  else if (/[①②③④⑤]|\d\s*번(은|이|과|의|\s|$)|선지\s*\d/.test(q.ex)) e("EXNUM", "해설에 선지 번호 언급(섞이면 틀림)");
  if (!SRC.includes(q.src)) e("SRC", "교재명 목록 밖: " + q.src);
  if (!Array.isArray(q.page) || !q.page.length || q.page.some(p => !Number.isInteger(p) || p < 1 || p > 400)) e("PAGE", "쪽수 정수 배열 필요");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(q.date)) e("DATE", "date 형식");
  if (typeof q.rv !== "boolean") e("RV", "rv true/false");
  if (!Number.isInteger(q.ver) || q.ver < 1) e("VER", "ver 1 이상");
  if (q.t === "case" && (typeof q.scene !== "string" || q.scene.trim().length < 20)) e("SCENE", "case는 상황 지문 필요");
  if (q.t !== "case" && q.scene !== "") e("SCENE", "case가 아니면 scene은 \"\"");
  if (q.t === "neg" && !/(않|틀린|잘못|아닌|부적절)/.test(q.ask)) e("NEG", "neg인데 물음에 부정 표현 없음");
  if (q.t === "combo") {
    if (!Array.isArray(q.items) || q.items.length < 3) e("ITEMS", "combo 보기 3개 이상");
    else if (Array.isArray(q.ch) && q.ch.length === 5 && Number.isInteger(q.a) && typeof q.ex === "string") {
      const L = LET.slice(0, q.items.length);
      q.items.forEach((s, i) => { if (!s.startsWith(L[i] + ".")) e("ITEMS", "보기는 「가.」「나.」로 시작"); });
      const ok = L.filter(l => new RegExp("○\\s*" + l + "[.\\s]").test(q.ex));
      const ng = L.filter(l => new RegExp("✕\\s*" + l + "[.\\s]").test(q.ex));
      if (ok.length + ng.length !== L.length) e("COMBOEX", "해설에 보기마다 ○/✕ 판정 필요 (○ 가. 형식)");
      else {
        const norm = s => s.replace(/\s/g, "").split(",").sort().join(",");
        if (norm(q.ch[q.a]) !== ok.sort().join(",")) e("COMBOANS", "정답 조합 ≠ 해설의 ○ 보기");
      }
      q.ch.forEach(c => { if (!/^[가나다라마](\s*,\s*[가나다라마])*$/.test(c.trim())) e("COMBOCH", "combo 선지는 「가, 나」 형식"); });
    }
  } else if (Array.isArray(q.items) && q.items.length) e("ITEMS", "combo가 아니면 items는 []");
  if (q.t !== "combo" && typeof q.ex === "string") {
    const marks = (q.ex.match(/^[○✕]/gm) || []).length;
    if (marks !== 5) e("EXMARK", "해설 줄머리 ○/✕ 5개 필요 (현재 " + marks + ")");
    else if (((q.ex.match(/^○/gm) || []).length !== (q.t === "neg" ? 4 : 1))) e("EXMARK", q.t === "neg" ? "neg는 ○ 4개(옳은 진술)·✕ 1개(정답)" : "○ 정확히 1개");
    else {
      const ml = q.ex.split("\n").filter(l => /^[○✕]/.test(l));
      const odd = ml.findIndex(l => l.startsWith(q.t === "neg" ? "✕" : "○"));
      if (odd !== q.a) e("EXPOS", "해설 판정 줄 위치(" + odd + ") ≠ 정답 a(" + q.a + ")");
    }
  }
  return E;
}

function loadBank() {
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const files = [...html.matchAll(/<script src="(bank\/[^"]+\.js)"><\/script>/g)].map(m => m[1]);
  const onDisk = fs.readdirSync(path.join(ROOT, "bank")).filter(f => f.endsWith(".js")).map(f => "bank/" + f);
  const missing = onDisk.filter(f => !files.includes(f));
  const ctx = {window: {}}; vm.createContext(ctx);
  files.forEach(f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx, {filename: f}));
  return {bank: ctx.window.QBANK || [], files, missing};
}

function textbookOverlap(bank, tbFile) {
  const norm = s => s.replace(/\s+/g, "");
  const tb = norm(fs.readFileSync(tbFile, "utf8"));
  const W = [];
  bank.forEach(q => {
    [q.scene, q.ask, ...q.ch, ...q.items, q.ex].forEach(s => {
      const n = norm(s || "");
      for (let i = 0; i + 25 <= n.length; i += 5) if (tb.includes(n.slice(i, i + 25))) { W.push(q.id + " 교재 원문과 25자 이상 겹침: " + n.slice(i, i + 25)); break; }
    });
  });
  return W;
}

function run(bank, label) {
  const seen = {}, errs = {};
  bank.forEach((q, i) => { const E = checkOne(q, seen); if (E.length) errs[q.id || ("#" + i)] = E; });
  return errs;
}

const args = process.argv.slice(2);
let fail = false;
if (args.includes("--control")) {
  const bad = require("./control_bad.js");
  let caught = 0;
  bad.forEach(c => { const E = checkOne(c.q, {}); const hit = E.some(x => x.startsWith(c.expect + " ")); if (hit) caught++; else { fail = true; console.log("✗ 대조군 놓침:", c.name, "기대", c.expect, "실제", E); } });
  console.log("대조군 " + caught + "/" + bad.length + " 검출");
}
const {bank, files, missing} = loadBank();
if (missing.length) { fail = true; console.log("✗ index.html에 연결 안 된 문항 파일:", missing.join(", ")); }
const errs = run(bank);
Object.keys(errs).forEach(id => { fail = true; errs[id].forEach(m => console.log("✗", id, m)); });
// 물음 중복(공백·문장부호 무시)
const askSeen = {};
bank.forEach(q => { const k = (q.ask + (q.scene || "")).replace(/[\s.,?·]/g, ""); if (askSeen[k]) { fail = true; console.log("✗ 물음 중복:", askSeen[k], q.id); } askSeen[k] = q.id; });
// 분포
const by = (f) => bank.reduce((o, q) => (o[f(q)] = (o[f(q)] || 0) + 1, o), {});
console.log("파일:", files.join(", "), "· 문항", bank.length);
console.log("과목:", JSON.stringify(by(q => q.subject)));
console.log("유형:", JSON.stringify(by(q => q.t)), "· 난이도:", JSON.stringify(by(q => q.level)));
SUBJECTS.forEach(s => {
  const qs = bank.filter(q => q.subject === s); if (!qs.length) return;
  const pos = [0,1,2,3,4].map(i => qs.filter(q => q.a === i).length);
  const mx = Math.max(...pos) / qs.length;
  console.log(s + " 정답 위치:", pos.join("/"), mx > 0.3 ? "⚠ 한 위치 30% 초과" : "");
});
const ti = args.indexOf("--textbook");
if (ti >= 0) { const W = textbookOverlap(bank, args[ti + 1]); W.forEach(w => console.log("⚠", w)); console.log("교재 원문 겹침 경고:", W.length); }
console.log(fail ? "FAIL" : "PASS");
process.exit(fail ? 1 : 0);
