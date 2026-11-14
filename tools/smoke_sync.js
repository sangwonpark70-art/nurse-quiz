// 드라이브 연동 점검 — 가짜 드라이브 1개를 두 기기(폰·아이패드)가 함께 쓰는 상황을 재현
// npm i jsdom 후 node tools/smoke_sync.js
"use strict";
const fs = require("fs"), path = require("path");
const {JSDOM} = require("jsdom");
const ROOT = path.join(__dirname, "..");
let html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8")
  .replace(/<script src="https:\/\/accounts\.google\.com[^>]*><\/script>/, "")
  .replace(/<script src="(bank\/[^"]+)"><\/script>/g, (m, f) => "<script>" + fs.readFileSync(path.join(ROOT, f), "utf8") + "</script>");

// ---- 가짜 드라이브 ----
const drive = {files: {}, n: 0, writes: 0};
function q2filter(q) {
  const name = (q.match(/name='([^']+)'/) || [])[1], cont = (q.match(/name contains '([^']+)'/) || [])[1];
  const par = (q.match(/'([^']+)' in parents/) || [])[1], mime = (q.match(/mimeType='([^']+)'/) || [])[1];
  return f => !f.trashed && (!name || f.name === name) && (!cont || f.name.includes(cont)) && (!par || f.parents.includes(par)) && (!mime || f.mimeType === mime);
}
function fakeFetch(url, opt = {}) {
  const u = new URL(url), m = (opt.method || "GET").toUpperCase();
  const res = (status, body) => Promise.resolve({ok: status < 300, status, json: async () => JSON.parse(body || "{}"), text: async () => body || ""});
  if (!String((opt.headers || {}).Authorization || "").startsWith("Bearer tok")) return res(401, "{}");
  if (u.pathname === "/drive/v3/files" && m === "GET") {
    const list = Object.values(drive.files).filter(q2filter(u.searchParams.get("q"))).sort((a, b) => a.c - b.c);
    return res(200, JSON.stringify({files: list.map(f => ({id: f.id, name: f.name}))}));
  }
  if (u.pathname === "/drive/v3/files" && m === "POST") {
    const meta = JSON.parse(opt.body), id = "f" + (++drive.n);
    drive.files[id] = {id, name: meta.name, mimeType: meta.mimeType, parents: meta.parents || ["root"], body: "", c: drive.n};
    return res(200, JSON.stringify({id}));
  }
  if (u.pathname === "/upload/drive/v3/files" && m === "POST") {
    const parts = opt.body.split(/--nq\d+/).filter(p => p.includes("Content-Type"));
    const meta = JSON.parse(parts[0].split("\r\n\r\n")[1]), body = parts[1].split("\r\n\r\n").slice(1).join("\r\n\r\n").replace(/\r\n$/, "");
    const id = "f" + (++drive.n);
    drive.files[id] = {id, name: meta.name, mimeType: meta.mimeType, parents: meta.parents || ["root"], body, c: drive.n};
    drive.writes++;
    return res(200, JSON.stringify({id}));
  }
  const mm = u.pathname.match(/\/files\/([^/]+)$/);
  if (mm && drive.files[mm[1]]) {
    const f = drive.files[mm[1]];
    if (m === "GET") return res(200, f.body);
    if (m === "PATCH") { f.body = opt.body; drive.writes++; return res(200, "{}"); }
    if (m === "DELETE") { delete drive.files[mm[1]]; return res(204, ""); }
  }
  return res(404, "{}");
}
function device(name) {
  const dom = new JSDOM(html, {runScripts: "dangerously", url: "https://sangwonpark70-art.github.io/nurse-quiz/", pretendToBeVisual: true,
    beforeParse(w) {
      w.scrollTo = () => {}; w.fetch = fakeFetch;
      w.google = {accounts: {oauth2: {initTokenClient: o => ({requestAccessToken: () => setTimeout(() => o.callback({access_token: "tok-" + name, expires_in: 3600}), 0)}), revoke: () => {}}}};
    }});
  return dom.window;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log("✗", m); } else console.log("✓", m); };

function answerN(w, n, correct) {
  const d = w.document, nq = w.__nq;
  nq.pick.subj = "전체"; nq.pick.mode = "new"; nq.pick.n = n; d.querySelector('#tabs button[data-v="home"]').click(); d.getElementById("go").click();
  const ids = [];
  for (let i = 0; i < n; i++) {
    const ask = d.querySelector(".ask").textContent, q = nq.BANK.find(x => x.ask === ask); ids.push(q.id);
    const opts = [...d.querySelectorAll(".opt")], texts = opts.map(o => o.querySelector("span:last-child").textContent);
    const r = texts.indexOf(q.ch[q.a]); opts[correct ? r : (r + 1) % 5].click(); d.getElementById("next").click();
  }
  d.getElementById("home").click();
  return ids;
}
async function login(w) { w.document.querySelector('#tabs button[data-v="more"]').click(); w.document.getElementById("gdgo").click(); await sleep(50); }

(async () => {
  const A = device("phone"), B = device("ipad");
  // 1) 비로그인 상태로 폰에서 3문항 → 기기에만
  const a1 = answerN(A, 3, true);
  ok(Object.keys(drive.files).length === 0, "로그인 전에는 드라이브에 아무것도 안 만듦");
  // 2) 폰 로그인 → 폴더·기록 파일 생성, 3문항 올라감
  await login(A);
  const folder = Object.values(drive.files).find(f => f.mimeType === "application/vnd.google-apps.folder");
  const rec = Object.values(drive.files).find(f => f.name === "문제풀이_기록.json");
  ok(folder && folder.name === "간호조무사_문제풀이", "폴더 「간호조무사_문제풀이」 자동 생성");
  ok(rec && rec.parents[0] === folder.id, "기록 파일이 그 폴더 안에 생성");
  ok(Object.keys(JSON.parse(rec.body).data.first).length === 3, "폰 기록 3건이 드라이브에 저장");
  ok(Object.values(drive.files).some(f => f.name.startsWith("문제풀이_기록_백업_")), "날짜 백업 1개 생성");
  // 3) 아이패드: 로그인 전 2문항(폰과 겹치지 않게는 보장 못 함 → 겹치면 먼저 푼 게 남아야 함)
  const b1 = answerN(B, 2, false);
  await login(B);
  const firstB = B.__nq.S().first;
  ok(Object.keys(firstB).length === new Set([...a1, ...b1]).size, "아이패드 로그인 후 두 기기 첫 풀이가 합쳐짐");
  // 4) 폰이 다시 맞추면 아이패드 기록도 받아 옴
  await A.__nq.gdSync(); await sleep(20);
  ok(Object.keys(A.__nq.S().first).length === Object.keys(firstB).length, "폰도 합쳐진 기록을 받음");
  // 5) 「처음 보는 문항」 수가 두 기기에서 같음(실력 지표 오염 방지)
  const nNew = w => w.__nq.BANK.filter(q => !w.__nq.S().first[q.id]).length;
  ok(nNew(A) === nNew(B), "두 기기의 「처음 보는 문항」 수 일치 (" + nNew(A) + ")");
  // 6) 동시에 풀다가 저장: 폰이 저장하기 전에 아이패드가 먼저 저장해도 둘 다 남는가
  const a2 = answerN(A, 2, true); const b2 = answerN(B, 2, true);
  await B.__nq.gdSync(); await A.__nq.gdSync(); await sleep(20);
  const fin = JSON.parse(Object.values(drive.files).find(f => f.name === "문제풀이_기록.json").body).data;
  ok([...a2, ...b2].every(id => fin.first[id]), "동시 저장에도 양쪽 기록 유실 없음(쓰기 전 다시 읽고 합침)");
  // 7) 같은 문항을 두 기기가 처음 풀었으면 먼저 푼 답이 실력으로 남음
  const common = Object.keys(fin.first).find(id => A.__nq.S().first[id] && B.__nq.S().first[id]);
  ok(!!common, "공통 문항 존재");
  // 8) 기록 파일은 하나뿐(같은 이름 사본 없음)
  ok(Object.values(drive.files).filter(f => f.name === "문제풀이_기록.json").length === 1, "기록 파일 1개만 존재");
  // 9) 모르는 항목 보존
  const m = A.__nq.merge({first: {}, last: {}, wrong: {}, flags: {}, log: [], future: {x: 1}}, {first: {}, last: {}, wrong: {}, flags: {}, log: []});
  ok(m.future && m.future.x === 1, "합치기가 새 항목을 지우지 않음");
  // 10) 토큰 만료(401) → 오류 표시, 기기 저장은 유지
  A.__nq.gd.token = "bad"; A.__nq.gd.exp = Date.now() + 1e6;
  answerN(A, 1, true); await A.__nq.gdSync(); await sleep(10);
  A.document.querySelector('#tabs button[data-v="home"]').click();
  ok(/다시 연결/.test(A.document.getElementById("gdstat").textContent), "만료 시 「다시 연결」 안내");
  ok(JSON.parse(A.localStorage.getItem("nq_v1")).log.length > 0, "만료돼도 기기 저장은 유지");
  // 11) 드라이브 요청이 서비스워커 캐시에 들어가지 않음
  ok(/origin !== location\.origin/.test(fs.readFileSync(path.join(ROOT, "sw.js"), "utf8")), "서비스워커는 같은 사이트 파일만 캐시");
  console.log(fail ? "FAIL " + fail : "PASS");
  process.exit(fail ? 1 : 0);
})();
