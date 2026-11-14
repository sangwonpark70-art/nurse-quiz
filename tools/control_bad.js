// 대조군: 일부러 틀린 문항. 검사기가 각각을 expect 코드로 잡아야 한다.
"use strict";
const good = () => ({
  id: "MO900", subject: "모성간호", unit: "대조군", t: "basic", level: 1, tags: ["대조"],
  scene: "", items: [], ask: "대조군 물음으로 옳은 것은?",
  ch: ["가1", "가2", "가3", "가4", "가5"], a: 2,
  ex: "정답: 가3\n✕ 가1\n✕ 가2\n○ 가3\n✕ 가4\n✕ 가5",
  src: "병원간호실무Ⅱ", page: [40], date: "2026-11-15", rv: false, ver: 1
});
const mk = (name, expect, f) => { const q = good(); f(q); return {name, expect, q}; };
module.exports = [
  mk("필드 누락", "FIELD", q => delete q.tags),
  mk("과목 오타", "SUBJ", q => q.subject = "모성 간호"),
  mk("선지 4개", "CH5", q => q.ch.pop()),
  mk("선지 중복", "CHDUP", q => q.ch[4] = "가1"),
  mk("정답 범위", "ANS", q => q.a = 5),
  mk("해설 시작", "EX", q => q.ex = q.ex.replace("정답:", "답:")),
  mk("해설 번호 언급", "EXNUM", q => q.ex += "\n함정: 3번은 헷갈림"),
  mk("○ 2개", "EXMARK", q => q.ex = q.ex.replace("✕ 가1", "○ 가1")),
  mk("판정 위치≠정답", "EXPOS", q => q.a = 1),
  mk("교재명 오타", "SRC", q => q.src = "병원간호실무2"),
  mk("쪽수 없음", "PAGE", q => q.page = []),
  mk("id 접두", "ID", q => q.id = "AP900"),
  mk("case 지문 없음", "SCENE", q => q.t = "case"),
  mk("neg 부정 표현 없음", "NEG", q => { q.t = "neg"; q.ex = "정답: 가3\n○ 가1\n○ 가2\n✕ 가3\n○ 가4\n○ 가5"; }),
  mk("combo 정답≠○", "COMBOANS", q => { q.t = "combo"; q.items = ["가. a", "나. b", "다. c", "라. d"]; q.ch = ["가, 나", "가, 다", "나, 라", "다, 라", "가, 나, 다, 라"]; q.a = 0; q.ex = "정답: 가, 다\n○ 가. a\n✕ 나. b\n○ 다. c\n✕ 라. d"; }),
  mk("level 범위", "LEVEL", q => q.level = 4),
];
