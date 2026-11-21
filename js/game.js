import { saveDecisionLog, saveStageScore } from "./firebase-config.js";

// สถานะหลักของแอปพลิเคชัน
const state = {
  anonymousId: "",
  stageData: null,
  currentNodeId: null,
  visitedCount: 0,
  totalNodesEstimate: 1,
  score: 0,
  maxScore: 0,
  decisions: [],
  nodeStartTime: null,
  pendingNextNodeId: null
};

// อ้างอิง DOM Elements
const screens = {
  login: document.getElementById("screen-login"),
  menu: document.getElementById("screen-menu"),
  game: document.getElementById("screen-game"),
  summary: document.getElementById("screen-summary")
};

const el = {
  loginForm: document.getElementById("login-form"),
  anonymousInput: document.getElementById("anonymous-id"),
  loginError: document.getElementById("login-error"),
  menuUserId: document.getElementById("menu-user-id"),
  btnLogout: document.getElementById("btn-logout"),
  btnBackMenu: document.getElementById("btn-back-menu"),
  gameStageTitle: document.getElementById("game-stage-title"),
  gameLocationLabel: document.getElementById("game-location-label"),
  gameProgressText: document.getElementById("game-progress-text"),
  gameProgressBar: document.getElementById("game-progress-bar"),
  gameUserId: document.getElementById("game-user-id"),
  vnStage: document.getElementById("vn-stage"),
  vnContextTag: document.getElementById("vn-context-tag"),
  vnCharacterContainer: document.getElementById("vn-character-container"),
  vnDialogueBox: document.getElementById("vn-dialogue-box"),
  vnSpeakerName: document.getElementById("vn-speaker-name"),
  vnEmotionTag: document.getElementById("vn-emotion-tag"),
  vnDialogueText: document.getElementById("vn-dialogue-text"),
  btnNext: document.getElementById("btn-next"),
  vnChoicesBox: document.getElementById("vn-choices-box"),
  vnChoicesPrompt: document.getElementById("vn-choices-prompt"),
  vnChoicesList: document.getElementById("vn-choices-list"),
  vnFeedbackBox: document.getElementById("vn-feedback-box"),
  feedbackBadge: document.getElementById("feedback-badge"),
  feedbackScoreChip: document.getElementById("feedback-score-chip"),
  feedbackReaction: document.getElementById("feedback-reaction"),
  feedbackDhamma: document.getElementById("feedback-dhamma"),
  btnFeedbackContinue: document.getElementById("btn-feedback-continue"),
  summaryStageTitle: document.getElementById("summary-stage-title"),
  summarySyncStatus: document.getElementById("summary-sync-status"),
  summaryScoreValue: document.getElementById("summary-score-value"),
  summaryPercent: document.getElementById("summary-percent"),
  summaryLevelDesc: document.getElementById("summary-level-desc"),
  summaryDecisionsList: document.getElementById("summary-decisions-list"),
  summaryDebriefingList: document.getElementById("summary-debriefing-list"),
  btnReplayStage: document.getElementById("btn-replay-stage"),
  btnSummaryMenu: document.getElementById("btn-summary-menu")
};

// สลับหน้าจอ
function showScreen(screenKey) {
  Object.values(screens).forEach((s) => s.classList.remove("active"));
  screens[screenKey].classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// สร้างภาพตัวละคร SVG 2 มิติ (รองรับการเปลี่ยนเป็นไฟล์รูปภาพจริงผ่าน imageUrl ใน JSON ภายหลังได้)
function renderCharacterVisual(characterId, emotion = "ปกติ", imageUrl = "") {
  el.vnCharacterContainer.innerHTML = "";
  if (!characterId || characterId === "narrator") return;

  if (imageUrl) {
    const img = document.createElement("img");
    img.src = imageUrl;
    img.alt = characterId;
    el.vnCharacterContainer.appendChild(img);
    return;
  }

  const palettes = {
    tonkla: { robe: "#d97706", inner: "#b45309", skin: "#f6d5b0", label: "สามเณรต้นกล้า" },
    keng: { robe: "#c2410c", inner: "#9a3412", skin: "#efc79c", label: "สามเณรเก่ง" },
    monk: { robe: "#92400e", inner: "#78350f", skin: "#e8be94", label: "พระอาจารย์" },
    junior: { robe: "#ea580c", inner: "#c2410c", skin: "#f8dcc0", label: "สามเณรรุ่นน้อง" }
  };

  const p = palettes[characterId] || palettes.tonkla;

  // ปรับสีหน้าตามอารมณ์
  let mouthPath = "M88 106 Q100 114 112 106"; // ยิ้มอ่อนโยน
  if (emotion === "กังวล" || emotion === "ตกใจ") {
    mouthPath = "M92 110 Q100 104 108 110";
  } else if (emotion === "โกรธ" || emotion === "หงุดหงิด") {
    mouthPath = "M88 112 L112 108";
  } else if (emotion === "ครุ่นคิด") {
    mouthPath = "M92 108 L108 108";
  }

  const svg = `
    <svg viewBox="0 0 200 240" width="200" height="240" aria-label="${p.label}">
      <!-- ลำตัวและจีวร -->
      <path d="M35 240 C38 175 62 150 100 150 C138 150 162 175 165 240 Z" fill="${p.robe}" />
      <path d="M55 162 L145 240 L95 240 L45 185 Z" fill="${p.inner}" opacity="0.55" />
      <!-- คอและศีรษะ -->
      <rect x="86" y="130" width="28" height="26" rx="10" fill="${p.skin}" />
      <circle cx="100" cy="92" r="44" fill="${p.skin}" />
      <!-- หู -->
      <circle cx="56" cy="95" r="8" fill="${p.skin}" />
      <circle cx="144" cy="95" r="8" fill="${p.skin}" />
      <!-- ตา -->
      <circle cx="84" cy="88" r="4.5" fill="#1e293b" />
      <circle cx="116" cy="88" r="4.5" fill="#1e293b" />
      <!-- คิ้ว -->
      <path d="M74 78 Q84 74 93 78" stroke="#475569" stroke-width="3" fill="none" stroke-linecap="round" />
      <path d="M107 78 Q116 74 126 78" stroke="#475569" stroke-width="3" fill="none" stroke-linecap="round" />
      <!-- ปาก -->
      <path d="${mouthPath}" stroke="#7c2d12" stroke-width="3.2" fill="none" stroke-linecap="round" />
    </svg>
  `;
  el.vnCharacterContainer.innerHTML = svg;
}

// โหลดข้อมูลด่านจากไฟล์ JSON
async function loadStage(stageId) {
  try {
    const response = await fetch(`data/${stageId}.json`);
    if (!response.ok) {
      throw new Error(`ไม่พบไฟล์ข้อมูลด่าน data/${stageId}.json`);
    }
    const data = await response.json();

    state.stageData = data;
    state.currentNodeId = data.startNode;
    state.visitedCount = 0;
    state.totalNodesEstimate = Object.keys(data.nodes).length;
    state.score = 0;
    state.maxScore = data.maxScore;
    state.decisions = [];
    state.pendingNextNodeId = null;

    el.gameStageTitle.textContent = data.title;
    el.gameUserId.textContent = state.anonymousId;
    showScreen("game");
    renderNode(state.currentNodeId);
  } catch (err) {
    alert(`ไม่สามารถโหลดด่านได้: ${err.message}\n(หมายเหตุ: กรุณาเปิดผ่าน Web Server เช่น VS Code Live Server)`);
  }
}

// แสดงผลโหนดปัจจุบันตามโครงสร้าง JSON
function renderNode(nodeId) {
  const node = state.stageData.nodes[nodeId];
  if (!node) {
    finishStage();
    return;
  }

  state.currentNodeId = nodeId;
  state.visitedCount += 1;
  state.nodeStartTime = Date.now();

  // อัปเดตแถบความคืบหน้า
  const percent = Math.min(95, Math.round((state.visitedCount / state.totalNodesEstimate) * 100));
  el.gameProgressText.textContent = `ความคืบหน้า ${percent}%`;
  el.gameProgressBar.style.width = `${percent}%`;

  // อัปเดตฉากหลังและบริบท
  el.vnStage.className = `vn-stage ${node.background || "bg-temple"}`;
  el.vnContextTag.textContent = `บริบท: ${node.context || "ทั่วไป"}`;
  el.gameLocationLabel.textContent = `สถานที่: ${node.location || "-"}`;

  // แสดงตัวละคร
  renderCharacterVisual(node.characterId, node.emotion, node.imageUrl || "");

  // ซ่อนกล่องอื่นๆ ก่อนแสดงกล่องที่ตรงประเภท
  el.vnFeedbackBox.classList.add("hidden");
  el.vnChoicesBox.classList.add("hidden");
  el.vnDialogueBox.classList.remove("hidden");

  // แสดงบทสนทนา
  el.vnSpeakerName.textContent = node.speaker || "ผู้บรรยาย";
  el.vnDialogueText.textContent = node.text;

  if (node.emotion) {
    el.vnEmotionTag.textContent = node.emotion;
    el.vnEmotionTag.classList.remove("hidden");
  } else {
    el.vnEmotionTag.classList.add("hidden");
  }

  // กรณีเป็นโหนดตัวเลือก (Branching Moral Dilemma)
  if (node.type === "choice") {
    el.btnNext.classList.add("hidden");
    el.vnChoicesBox.classList.remove("hidden");
    el.vnChoicesPrompt.textContent = node.prompt || "ท่านจะตัดสินใจอย่างไรในสถานการณ์นี้?";
    el.vnChoicesList.innerHTML = "";

    node.choices.forEach((choice) => {
      const btn = document.createElement("button");
      btn.className = "choice-btn";
      btn.textContent = choice.text;
      btn.addEventListener("click", () => handleChoiceSelect(node, choice));
      el.vnChoicesList.appendChild(btn);
    });
  } else {
    // กรณีเป็นโหนดบทสนทนาปกติหรือจุดบรรจบ (Bottleneck)
    el.btnNext.classList.remove("hidden");
    el.btnNext.textContent = node.next === "END" ? "สรุปผลการเรียนรู้ท้ายด่าน →" : "ดำเนินการต่อ →";
  }
}

// จัดการเมื่อผู้เรียนเลือกคำตอบ (บันทึก Log Data + แสดง Immediate Feedback)
async function handleChoiceSelect(node, choice) {
  const timeSpentSec = Math.max(1, Math.round((Date.now() - state.nodeStartTime) / 1000));
  state.score += choice.score;
  state.pendingNextNodeId = choice.next;

  const decisionRecord = {
    context: node.context,
    dilemmaTitle: node.dilemmaTitle || node.location,
    choiceId: choice.id,
    choiceText: choice.text,
    score: choice.score,
    maxChoiceScore: 3,
    preceptStatus: choice.preceptStatus,
    timeSpentSec
  };
  state.decisions.push(decisionRecord);

  // บันทึก Log Data ลง Firebase Cloud Firestore (ไม่บล็อกหน้าจอผู้เล่น)
  saveDecisionLog({
    anonymousId: state.anonymousId,
    stageId: state.stageData.stageId,
    nodeId: node.id,
    context: node.context,
    choiceId: choice.id,
    choiceText: choice.text,
    score: choice.score,
    preceptStatus: choice.preceptStatus,
    timeSpentSec
  });

  // แสดงผลตอบรับทันที (Immediate Feedback)
  el.vnDialogueBox.classList.add("hidden");
  el.vnChoicesBox.classList.add("hidden");
  el.vnFeedbackBox.classList.remove("hidden");

  // ปรับสีหน้าตัวละครตามปฏิกิริยา
  if (choice.reactionCharacterId) {
    renderCharacterVisual(choice.reactionCharacterId, choice.reactionEmotion || "ปกติ");
  }

  el.feedbackBadge.textContent = choice.preceptStatus;
  el.feedbackBadge.className = "feedback-badge";
  if (choice.score >= 3) {
    el.feedbackBadge.classList.add("high");
  } else if (choice.score >= 1) {
    el.feedbackBadge.classList.add("mid");
  } else {
    el.feedbackBadge.classList.add("low");
  }

  el.feedbackScoreChip.textContent = `+${choice.score} คะแนน`;
  el.feedbackReaction.textContent = choice.feedbackReaction;
  el.feedbackDhamma.textContent = choice.feedbackDhamma;
}

// จบด่านและแสดงหน้าสรุปบทเรียน (Debriefing) + บันทึกคะแนน E1
async function finishStage() {
  el.gameProgressText.textContent = "ความคืบหน้า 100%";
  el.gameProgressBar.style.width = "100%";

  const percentage = Math.round((state.score / state.maxScore) * 100);

  el.summaryStageTitle.textContent = state.stageData.title;
  el.summaryScoreValue.textContent = `${state.score}/${state.maxScore}`;
  el.summaryPercent.textContent = `${percentage}%`;

  if (percentage >= 80) {
    el.summaryLevelDesc.textContent =
      "ยอดเยี่ยมมาก ท่านสามารถพิจารณาเจตนาและประยุกต์ใช้หลักศีลข้อ 1 คู่กับเมตตากรุณาได้อย่างเหมาะสมในทุกบริบท";
  } else if (percentage >= 50) {
    el.summaryLevelDesc.textContent =
      "อยู่ในเกณฑ์ดี ท่านหลีกเลี่ยงการเบียดเบียนโดยตรงได้ แต่ยังมีบางสถานการณ์ที่สามารถแสดงความเมตตากรุณาและการช่วยเหลือเชิงรุกได้มากขึ้น";
  } else {
    el.summaryLevelDesc.textContent =
      "ควรทบทวนเพิ่มเติม ลองพิจารณาผลกระทบของเจตนาและการกระทำทั้งทางกาย วาจา และสื่อออนไลน์ร่วมกับเพื่อนและพระอาจารย์ในการอภิปราย";
  }

  // แสดงรายการทบทวนการตัดสินใจ
  el.summaryDecisionsList.innerHTML = "";
  state.decisions.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "decision-review-item";
    div.innerHTML = `
      <div class="decision-review-head">
        <span>สถานการณ์ที่ ${index + 1} (${item.context}): ${item.dilemmaTitle}</span>
        <span>${item.score}/${item.maxChoiceScore} คะแนน</span>
      </div>
      <p><strong>ทางเลือกที่ตัดสินใจ:</strong> ${item.choiceText}</p>
      <p><strong>ผลการประเมิน:</strong> ${item.preceptStatus}</p>
    `;
    el.summaryDecisionsList.appendChild(div);
  });

  // แสดงคำถาม Debriefing สำหรับห้องเรียน
  el.summaryDebriefingList.innerHTML = "";
  state.stageData.debriefingQuestions.forEach((q) => {
    const li = document.createElement("li");
    li.textContent = q;
    el.summaryDebriefingList.appendChild(li);
  });

  el.summarySyncStatus.textContent = "กำลังบันทึกคะแนนระหว่างเรียน (E1) ลงฐานข้อมูล...";
  showScreen("summary");

  // บันทึกคะแนน E1 ลง Firestore
  const result = await saveStageScore({
    anonymousId: state.anonymousId,
    stageId: state.stageData.stageId,
    stageTitle: state.stageData.title,
    totalScore: state.score,
    maxScore: state.maxScore,
    percentage,
    decisionsSummary: state.decisions
  });

  if (result.saved && result.mode === "firestore") {
    el.summarySyncStatus.textContent = "บันทึกคะแนน E1 และประวัติการตัดสินใจลง Firebase Firestore เรียบร้อยแล้ว";
  } else if (result.saved && result.mode === "local") {
    el.summarySyncStatus.textContent = "โหมดทดสอบออฟไลน์: บันทึกคะแนนลงเครื่องเรียบร้อยแล้ว (รอเชื่อมต่อ Firebase Config)";
  } else {
    el.summarySyncStatus.textContent = "ไม่สามารถเชื่อมต่อฐานข้อมูลได้ชั่วคราว กรุณาตรวจสอบอินเทอร์เน็ตหรือสิทธิ์ Firestore";
  }
}

// ==================== Event Listeners ====================
el.loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const rawId = el.anonymousInput.value.trim().toUpperCase();
  const idPattern = /^[A-Z0-9_-]{3,12}$/;

  if (!idPattern.test(rawId)) {
    el.loginError.textContent = "กรุณากรอกรหัสประจำตัวภาษาอังกฤษและตัวเลข 3–12 ตัวอักษร เช่น S001";
    el.loginError.classList.remove("hidden");
    return;
  }

  el.loginError.classList.add("hidden");
  state.anonymousId = rawId;
  sessionStorage.setItem("vn_anonymous_id", rawId);
  el.menuUserId.textContent = rawId;
  showScreen("menu");
});

el.btnLogout.addEventListener("click", () => {
  sessionStorage.removeItem("vn_anonymous_id");
  state.anonymousId = "";
  el.anonymousInput.value = "";
  showScreen("login");
});

document.querySelectorAll(".btn-start-stage").forEach((btn) => {
  btn.addEventListener("click", () => {
    const stageId = btn.getAttribute("data-stage");
    loadStage(stageId);
  });
});

el.btnBackMenu.addEventListener("click", () => {
  if (confirm("ต้องการกลับสู่หน้าเลือกด่านหรือไม่? ความคืบหน้าของด่านปัจจุบันจะไม่ถูกบันทึกเป็นคะแนน E1")) {
    showScreen("menu");
  }
});

el.btnNext.addEventListener("click", () => {
  const currentNode = state.stageData.nodes[state.currentNodeId];
  if (!currentNode || currentNode.next === "END") {
    finishStage();
  } else {
    renderNode(currentNode.next);
  }
});

el.btnFeedbackContinue.addEventListener("click", () => {
  if (!state.pendingNextNodeId || state.pendingNextNodeId === "END") {
    finishStage();
  } else {
    renderNode(state.pendingNextNodeId);
  }
});

el.btnReplayStage.addEventListener("click", () => {
  if (state.stageData) {
    loadStage(state.stageData.stageId);
  }
});

el.btnSummaryMenu.addEventListener("click", () => {
  showScreen("menu");
});

// ตรวจสอบ session เดิมหากมีการรีเฟรชหน้าเว็บ
const savedSessionId = sessionStorage.getItem("vn_anonymous_id");
if (savedSessionId) {
  state.anonymousId = savedSessionId;
  el.menuUserId.textContent = savedSessionId;
  showScreen("menu");
}
