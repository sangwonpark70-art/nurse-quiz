// 실행 점검 — npm i jsdom 후 node tools/smoke.js
// 앱을 가상 브라우저로 띄워 전 문항을 실제로 열고 채점·기록·결과·탭을 확인한다.
"use strict";
const fs = require("fs"), path = require("path");
const {JSDOM} = require("jsdom");
const ROOT = path.join(__dirname, "..");
let html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
html = html.replace(/<script src="(bank\/[^"]+)"><\/script>/g, (m, f) => "<script>" + fs.readFileSync(path.join(ROOT, f), "utf8") + "</script>");
const dom = new JSDOM(html, {runScripts: "dangerously", url: "http://localhost/", pretendToBeVisual: true, beforeParse(win) { win.scrollTo = () => {}; }});
const w = dom.window, d = w.document, nq = w.__nq;
const bank = nq.BANK; let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log("✗", m); } };
ok(bank.length > 0, "문항 0개");
// 전체 풀이: 짝수 번째는 정답, 홀수 번째는 오답 클릭
nq.pick.subj = "전체"; nq.pick.mode = "all"; nq.pick.n = 30; nq.pick.timer = true;
const rounds = Math.ceil(bank.length / 30); const seenIds = new Set();
for (let r = 0; r < rounds; r++) {
  nq.pick.mode = "new"; d.getElementById("go").click();
  let k = 0;
  while (d.querySelector(".opt")) {
    const opts = [...d.querySelectorAll(".opt")];
    ok(opts.length === 5, "선지 5개 아님");
    const ask = d.querySelector(".ask").textContent;
    const q = bank.find(x => x.ask === ask); ok(q, "문항을 찾을 수 없음: " + ask);
    seenIds.add(q.id);
    const texts = opts.map(o => o.querySelector("span:last-child").textContent);
    ok([...texts].sort().join("|") === [...q.ch].sort().join("|"), q.id + " 선지 내용 불일치");
    if (q.t === "combo") ok(texts.join("|") === q.ch.join("|"), q.id + " combo 순서가 섞임");
    const right = texts.indexOf(q.ch[q.a]);
    const pickIdx = k % 2 === 0 ? right : (right + 1) % 5;
    opts[pickIdx].click();
    ok(opts[right].classList.contains("ok"), q.id + " 정답 표시 없음");
    ok(!!d.querySelector(".ex"), q.id + " 해설 없음");
    const st = nq.S().first[q.id]; ok(st && st.ok === (k % 2 === 0), q.id + " 첫 풀이 기록 오류");
    d.getElementById("next").click(); k++;
  }
  ok(/\d+ \/ \d+/.test(d.querySelector(".big").textContent), "결과 화면 없음");
  d.getElementById("home").click();
}
ok(seenIds.size === bank.length, "열리지 않은 문항 " + (bank.length - seenIds.size) + "개");
// 처음 보는 문항 소진 후 재풀이는 복습으로 기록
nq.pick.mode = "all"; nq.pick.n = 10; d.getElementById("go").click();
const a1 = d.querySelector(".ask").textContent, q1 = bank.find(x => x.ask === a1);
const before = JSON.stringify(nq.S().first[q1.id]);
d.querySelector(".opt").click();
ok(JSON.stringify(nq.S().first[q1.id]) === before, "복습이 첫 풀이 기록을 덮어씀");
ok(d.querySelector(".tag") && d.querySelector("#after .tag").textContent === "복습", "복습 표시 없음");
// 신고
d.getElementById("flag").click(); d.getElementById("fnote").value = "테스트"; d.getElementById("fsave").click();
ok(nq.S().flags[q1.id] && nq.S().flags[q1.id].note === "테스트", "신고 저장 안 됨");
d.getElementById("quit").click(); d.getElementById("home") && d.getElementById("home").click();
// 저장소 유지
const saved = JSON.parse(w.localStorage.getItem("nq_v1"));
ok(Object.keys(saved.first).length === bank.length, "localStorage 첫 풀이 개수");
// 탭
["wrong", "stats", "more", "home"].forEach(v => { d.querySelector('#tabs button[data-v="' + v + '"]').click(); ok(d.getElementById("app").innerHTML.length > 50, v + " 탭 비어 있음"); });
// 합치기: 다른 기기 기록과 합쳐도 줄지 않음
const other = {first: {ZZ001: {ok: true, ts: 1}}, last: {}, wrong: {}, flags: {}, log: [{id: "ZZ001", ok: 1, f: 1, ts: 1}]};
const m = nq.merge(nq.S(), other);
ok(Object.keys(m.first).length === bank.length + 1 && m.log.length === nq.S().log.length + 1, "합치기 결과 이상");
const m2 = nq.merge(m, m); ok(m2.log.length === m.log.length, "합치기 중복 제거 실패");
// 화면 코드에 개인 이름이 없는지
ok(!/박서윤|박상원|cjelynn|@gmail|sangwonpark70@/.test(fs.readFileSync(path.join(ROOT, "index.html"), "utf8")), "화면 코드에 개인 정보");
console.log("문항 " + bank.length + "개 열림·채점 확인 · " + (fail ? "FAIL " + fail : "PASS"));
process.exit(fail ? 1 : 0);
