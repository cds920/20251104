const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// 엘리먼트
const chat = document.getElementById("chat");
const genBtn = document.getElementById("gen");
const todayBtn = document.getElementById("today");
const sendBtn = document.getElementById("sendBtn");
const userInput = document.getElementById("userInput");

// 폼 요소
const goal = document.getElementById("goal");
const days = document.getElementById("days");
const level = document.getElementById("level");
const equip = document.getElementById("equip");
const minutes = document.getElementById("minutes");
const injury = document.getElementById("injury");
const run = document.getElementById("run");

// 깔끔한 HTML 스키마 강제 (표/리스트 출력 보장)
const systemPrompt = `
당신은 한국어 헬스 코치다. 아래 HTML 스키마로만 답하라(마크다운 금지, 프리텍스트 금지).

<schema>
<section title="주간 분할 요약"><p>예: 4일 분할(상체-하체-휴식-푸시-풀)</p></section>
<section title="요일별 프로그램">
  <table>
    <thead><tr><th>요일</th><th>워밍업</th><th>운동 리스트</th><th>마무리</th></tr></thead>
    <tbody>
      <!-- 운동 리스트는 li로 표기, 각 항목에 세트×반복, 휴식, RPE 명시 -->
      <tr>
        <td>월</td><td>로잉 8–10분</td>
        <td><ul><li>덤벨 벤치프레스 — 4×8–10, 휴식 60초, RPE 7–8</li></ul></td>
        <td>가슴/어깨 스트레칭</td>
      </tr>
    </tbody>
  </table>
</section>
<section title="진행 방법(주차별)">
  <ul><li>2주차: 세트 동결, 중량 +2.5~5% 또는 RPE +1</li></ul>
</section>
<section title="안전/폼 키포인트">
  <ul><li>통증 발생 시 가동범위 축소·대체운동 사용</li></ul>
</section>
<section title="러닝 병행 팁(있으면)">
  <ul><li>하체 루틴 전후 24시간 고강도 러닝 피함</li></ul>
</section>
<section title="오늘 바로 시작 루틴">
  <table>
    <thead><tr><th>항목</th><th>내용</th></tr></thead>
    <tbody>
      <tr><td>총 소요</td><td>60분(워밍업 10 / 메인 45 / 마무리 5)</td></tr>
      <tr><td>메인</td><td><ul><li>예: 벤치 4×8–10, 로우 3×12–15…</li></ul></td></tr>
    </tbody>
  </table>
</section>
</schema>

규칙: 세트/반복/휴식/RPE 표기 통일. 사용자의 경험, 세션 시간, 장비, 부상 제약을 반영.
초급은 RPE 6–7, 중급은 7–9 범위. 출력은 반드시 schema의 HTML만 반환.
`;

const messages = [{ role: "system", content: systemPrompt }];

// UI helpers
const addMe = (text) => chat.insertAdjacentHTML("beforeend", `<div class="msg me"><pre style="margin:0;white-space:pre-wrap">${escape(text)}</pre></div>`);
const addBot = (html) => chat.insertAdjacentHTML("beforeend", `<div class="msg bot">${html}</div>`);
const loading = () => {
  const el = document.createElement("div");
  el.className = "msg bot";
  el.textContent = "생각 중...";
  chat.appendChild(el);
  chat.scrollTop = chat.scrollHeight;
  return el;
};
const escape = (s)=>s.replace(/[&<>"']/g,m=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m]));

// 프롬프트 생성
function buildPrompt(onlyToday=false){
  const meta = [
    `목표:${goal.value}`, `주당:${days.value}`, `경험:${level.value}`,
    `장비:${equip.value}`, `세션:${minutes.value}분`,
    injury.value?`부상:${injury.value}`:"", run.value?`러닝:${run.value}`:""
  ].filter(Boolean).join(", ");
  return onlyToday
    ? `다음 조건으로 '오늘 루틴만' schema로 출력: ${meta}`
    : `다음 조건으로 '주간 분할+요일별 프로그램'을 schema로 출력: ${meta}`;
}

// 공통 호출
async function ask(prompt){
  messages.push({ role:"user", content: prompt });
  addMe(prompt);
  const wait = loading();

  try{
    const res = await fetch("https://api.openai.com/v1/chat/completions",{
      method:"POST",
      headers:{ "Content-Type":"application/json", Authorization:`Bearer ${API_KEY}` },
      body: JSON.stringify({ model:"gpt-3.5-turbo", temperature:0.3, messages })
    });
    const data = await res.json();
    const out = data?.choices?.[0]?.message?.content || "응답을 불러오지 못했어요.";
    wait.remove();
    messages.push({ role:"assistant", content: out });
    addBot(out); // HTML 그대로 렌더링
    chat.scrollTop = chat.scrollHeight;
  }catch(err){
    wait.remove();
    addBot("<p>요청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.</p>");
    console.error(err);
  }
}

// 이벤트
genBtn.addEventListener("click", ()=> ask(buildPrompt(false)));
todayBtn.addEventListener("click", ()=> ask(buildPrompt(true)));
sendBtn.addEventListener("click", ()=>{
  const q = userInput.value.trim(); if(!q) return;
  userInput.value=""; ask(q);
});
userInput.addEventListener("keydown",(e)=>{ if(e.key==="Enter") sendBtn.click(); });
