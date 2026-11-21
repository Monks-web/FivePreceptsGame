import { saveDecisionLog, saveStageScore } from "./firebase-config.js";

const state = {
  anonymousId: "",
  stageData: null,
  currentNodeId: null,
  visitedCount: 0,
  totalNodesEstimate: 1,
  score: 0,
  maxScore: 9,
  decisions: [],
  nodeStartTime: null,
  pendingNextNodeId: null,
  soundEnabled: true,
  isTyping: false,
  typingTimer: null,
  fullCurrentText: ""
};

// จับคู่ตัวละครทั้งหมดกับไฟล์ภาพในโฟลเดอร์ assets/
const CHARACTER_IMAGES = {
  tonkla: "assets/tonkla.png",
  keng: "assets/keng.png",
  monk: "assets/monk.png",
  junior: "assets/junior.png"
};

// โหลดภาพทั้งหมดล่วงหน้าตั้งแต่เปิดหน้าเว็บเพื่อลดอาการกระตุกตอนเปลี่ยนฉาก
const PRELOAD_ASSETS = [
  "assets/bg-cover.jpg",
  "assets/bg-temple.jpg",
  "assets/bg-school.jpg",
  "assets/bg-online.jpg",
  "assets/bg-dhamma.jpg",
  "assets/tonkla.png",
  "assets/keng.png",
  "assets/monk.png",
  "assets/junior.png"
];

PRELOAD_ASSETS.forEach((src) => {
  const img = new Image();
  img.src = src;
});

// ระบบเสียงประกอบเบาๆ ด้วย Web Audio API
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(freq, duration = 0.08, type = "sine", volume = 0.05) {
  if (!state.soundEnabled) return;
  if (audioCtx.state === "suspended") audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

// เสียงแจ้งเตือนแชท "ติ๊ง!" สำหรับบริบทสื่อออนไลน์
function playChatPing() {
  playTone(880, 0.09, "sine", 0.06);
  setTimeout(() => playTone(1174.66, 0.14, "sine", 0.06), 85);
}

function playFeedbackSound(score) {
  if (score >= 3) {
    playTone(523.25, 0.12, "sine", 0.07);
    setTimeout(() => playTone(659.25, 0.14, "sine", 0.07), 100);
    setTimeout(() => playTone(783.99, 0.25, "sine", 0.08), 200);
  } else if (score >= 1) {
    playTone(440, 0.15, "triangle", 0.06);
  } else {
    playTone(260, 0.22, "sawtooth", 0.04);
  }
}

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
  btnSoundToggle: document.getElementById("btn-sound-toggle"),
  gameStageTitle: document.getElementById("game-stage-title"),
  gameLocationLabel: document.getElementById("game-location-label"),
  gameProgressText: document.getElementById("game-progress-text"),
  gameProgressBar: document.getElementById("game-progress-bar"),
  meritBarFill: document.getElementById("merit-bar-fill"),
  meritScoreText: document.getElementById("merit-score-text"),
  gameUserId: document.getElementById("game-user-id"),
  vnStage: document.getElementById("vn-stage"),
  vnContextTag: document.getElementById("vn-context-tag"),
  floatingScore: document.getElementById("floating-score"),
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

function showScreen(screenKey) {
  Object.values(screens).forEach((s) => s.classList.remove("active"));
  screens[screenKey].classList.add("active");
  if (screenKey === "menu") renderStageBadges();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ==================== ระบบสะสมดาวและตรา "ผ่านแล้ว" ในหน้าเลือกด่าน ====================
function getUserProgress() {
  if (!state.anonymousId) return {};
  return JSON.parse(localStorage.getItem(`vn_progress_${state.anonymousId}`) || "{}");
}

function saveStageStars(stageId, percentage) {
  if (!state.anonymousId) return;
  const progress = getUserProgress();
  const stars = percentage >= 80 ? 3 : percentage >= 50 ? 2 : 1;
  const prevStars = progress[stageId]?.stars || 0;

  progress[stageId] = {
    completed: true,
    stars: Math.max(prevStars, stars),
    bestPercent: Math.max(progress[stageId]?.bestPercent || 0, percentage)
  };
  localStorage.setItem(`vn_progress_${state.anonymousId}`, JSON.stringify(progress));
}

function renderStageBadges() {
  const progress = getUserProgress();
  document.querySelectorAll(".btn-start-stage").forEach((btn) => {
    const stageId = btn.getAttribute("data-stage");
    const card = btn.closest(".stage-card");
    if (!card) return;

    const oldRow = card.querySelector(".stage-progress-row");
    if (oldRow) oldRow.remove();

    const info = progress[stageId];
    if (info && info.completed) {
      const starStr = "⭐".repeat(info.stars) + "☆".repeat(3 - info.stars);
      const row = document.createElement("div");
      row.className = "stage-progress-row";
      row.innerHTML = `
        <span class="stage-stars" title="คะแนนสูงสุด ${info.bestPercent}%">${starStr}</span>
        <span class="stage-done-pill">ผ่านแล้ว ✓</span>
      `;
      card.insertBefore(row, btn);
    }
  });
}

function updateMeritHUD() {
  const pct = Math.round((state.score / state.maxScore) * 100);
  el.meritBarFill.style.width = `${pct}%`;
  el.meritScoreText.textContent = `${state.score}/${state.maxScore}`;
}

function triggerFloatingScore(score) {
  el.floatingScore.textContent = score > 0 ? `+${score} ✨` : "0 คะแนน";
  el.floatingScore.classList.remove("hidden");
  el.floatingScore.style.animation = "none";
  void el.floatingScore.offsetWidth;
  el.floatingScore.style.animation = "floatUpFade 1.4s ease forwards";
}

function getEmotionAnimClass(emotion) {
  if (["โกรธ", "หงุดหงิด", "ตกใจ"].includes(emotion)) return "char-shake";
  if (["ครุ่นคิด", "กังวล"].includes(emotion)) return "char-think";
  return "char-idle";
}

function buildFallbackSVG(characterId, emotion = "ปกติ") {
  const palettes = {
    tonkla: { robe: "#d97706", inner: "#b45309", skin: "#f6d5b0" },
    keng: { robe: "#c2410c", inner: "#9a3412", skin: "#efc79c" },
    monk: { robe: "#92400e", inner: "#78350f", skin: "#e8be94" },
    junior: { robe: "#ea580c", inner: "#c2410c", skin: "#f8dcc0" }
  };
  const p = palettes[characterId] || palettes.tonkla;
  let mouthPath = "M88 106 Q100 115 112 106";
  if (emotion === "กังวล" || emotion === "ตกใจ") mouthPath = "M92 111 Q100 103 108 111";
  else if (emotion === "โกรธ" || emotion === "หงุดหงิด") mouthPath = "M88 112 L112 107";

  return `
    <svg class="${getEmotionAnimClass(emotion)}" viewBox="0 0 200 250" width="240" height="300">
      <path d="M30 250 C34 180 60 152 100 152 C140 152 166 180 170 250 Z" fill="${p.robe}" />
      <path d="M52 164 L148 250 L94 250 L42 188 Z" fill="${p.inner}" opacity="0.6" />
      <rect x="86" y="130" width="28" height="28" rx="10" fill="${p.skin}" />
      <circle cx="100" cy="92" r="45" fill="${p.skin}" />
      <circle cx="84" cy="88" r="5" fill="#1e293b" />
      <circle cx="116" cy="88" r="5" fill="#1e293b" />
      <path d="${mouthPath}" stroke="#7c2d12" stroke-width="3.2" fill="none" stroke-linecap="round" />
    </svg>`;
}

function renderCharacterVisual(characterId, emotion = "ปกติ", imageUrl = "") {
  el.vnCharacterContainer.innerHTML = "";
  if (!characterId || characterId === "narrator") return;

  const animClass = getEmotionAnimClass(emotion);
  const finalImageUrl = imageUrl || CHARACTER_IMAGES[characterId];

  if (finalImageUrl) {
    const img = document.createElement("img");
    img.src = finalImageUrl;
    img.alt = characterId;
    img.className = animClass;
    img.onerror = () => {
      el.vnCharacterContainer.innerHTML = buildFallbackSVG(characterId, emotion);
    };
    el.vnCharacterContainer.appendChild(img);
    return;
  }

  el.vnCharacterContainer.innerHTML = buildFallbackSVG(characterId, emotion);
}

function typeText(text, onComplete) {
  clearInterval(state.typingTimer);
  state.isTyping = true;
  state.fullCurrentText = text;
  el.vnDialogueText.textContent = "";
  let i = 0;

  state.typingTimer = setInterval(() => {
    if (i < text.length) {
      el.vnDialogueText.textContent += text.charAt(i);
      if (i % 4 === 0) playTone(540, 0.02, "sine", 0.014);
      i++;
    } else {
      clearInterval(state.typingTimer);
      state.isTyping = false;
      if (onComplete) onComplete();
    }
  }, 20);
}

function finishTypingImmediately() {
  if (!state.isTyping) return;
  clearInterval(state.typingTimer);
  state.isTyping = false;
  el.vnDialogueText.textContent = state.fullCurrentText;
}

async function loadStage(stageId) {
  try {
    const response = await fetch(`data/${stageId}.json`);
    if (!response.ok) throw new Error(`ไม่พบไฟล์ data/${stageId}.json`);
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
    updateMeritHUD();
    showScreen("game");
    renderNode(state.currentNodeId);
  } catch (err) {
    alert(`ไม่สามารถโหลดด่านได้: ${err.message}`);
  }
}

function renderNode(nodeId) {
  const node = state.stageData.nodes[nodeId];
  if (!node) {
    finishStage();
    return;
  }

  state.currentNodeId = nodeId;
  state.visitedCount += 1;
  state.nodeStartTime = Date.now();

  const percent = Math.min(95, Math.round((state.visitedCount / state.totalNodesEstimate) * 100));
  el.gameProgressText.textContent = `${percent}%`;
  el.gameProgressBar.style.width = `${percent}%`;

  const bgClass = node.background || "bg-temple";
  el.vnStage.className = `vn-stage ${bgClass}`;

  el.vnContextTag.textContent = `บริบท: ${node.context || "ทั่วไป"}`;
  el.gameLocationLabel.textContent = `สถานที่: ${node.location || "-"}`;

  renderCharacterVisual(node.characterId, node.emotion, node.imageUrl || "");

  el.vnFeedbackBox.classList.add("hidden");
  el.vnChoicesBox.classList.add("hidden");
  el.vnDialogueBox.classList.remove("hidden");

  // สลับเป็นหน้าต่างแชทจำลอง (LINE) อัตโนมัติในบริบทสื่อออนไลน์
  const isChatScene = node.context === "สื่อออนไลน์" && node.speaker !== "ผู้บรรยาย";
  el.vnDialogueBox.classList.toggle("chat-mode", isChatScene);
  if (isChatScene) {
    playChatPing();
    el.vnSpeakerName.textContent = `💬 ${node.speaker}`;
  } else {
    el.vnSpeakerName.textContent = node.speaker || "ผู้บรรยาย";
  }

  if (node.emotion) {
    el.vnEmotionTag.textContent = node.emotion;
    el.vnEmotionTag.classList.remove("hidden");
  } else {
    el.vnEmotionTag.classList.add("hidden");
  }

  if (node.type === "choice") {
    el.btnNext.textContent = "เลือกทางเดิน ▶";
  } else {
    el.btnNext.textContent = node.next === "END" ? "ดูสรุปผลท้ายด่าน ▶" : "ดำเนินการต่อ ▶";
  }
  typeText(node.text);
}

function openChoicesModal(node) {
  el.vnChoicesBox.classList.remove("hidden");
  el.vnChoicesPrompt.textContent = node.prompt || "ท่านจะตัดสินใจอย่างไรในสถานการณ์นี้?";
  el.vnChoicesList.innerHTML = "";
  const letters = ["A", "B", "C", "D"];

  // สุ่มสลับลำดับตัวเลือกทุกครั้ง (Fisher-Yates Shuffle)
  const shuffledChoices = [...node.choices];
  for (let i = shuffledChoices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledChoices[i], shuffledChoices[j]] = [shuffledChoices[j], shuffledChoices[i]];
  }

  shuffledChoices.forEach((choice, idx) => {
    const btn = document.createElement("button");
    btn.className = "choice-btn";
    btn.innerHTML = `<span class="choice-key">${letters[idx] || idx + 1}</span><span>${choice.text}</span>`;
    btn.addEventListener("click", () => handleChoiceSelect(node, choice));
    el.vnChoicesList.appendChild(btn);
  });
}

async function handleChoiceSelect(node, choice) {
  const timeSpentSec = Math.max(1, Math.round((Date.now() - state.nodeStartTime) / 1000));
  state.score += choice.score;
  state.pendingNextNodeId = choice.next;

  playFeedbackSound(choice.score);
  updateMeritHUD();
  triggerFloatingScore(choice.score);

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

  el.vnChoicesBox.classList.add("hidden");
  el.vnFeedbackBox.classList.remove("hidden");

  if (choice.reactionCharacterId) {
    renderCharacterVisual(choice.reactionCharacterId, choice.reactionEmotion || "ปกติ");
  }

  el.feedbackBadge.textContent = choice.preceptStatus;
  el.feedbackBadge.className = "feedback-badge";
  if (choice.score >= 3) el.feedbackBadge.classList.add("high");
  else if (choice.score >= 1) el.feedbackBadge.classList.add("mid");
  else el.feedbackBadge.classList.add("low");

  el.feedbackScoreChip.textContent = `+${choice.score} คะแนน`;
  el.feedbackReaction.textContent = choice.feedbackReaction;
  el.feedbackDhamma.textContent = choice.feedbackDhamma;
}

async function finishStage() {
  el.gameProgressText.textContent = "100%";
  el.gameProgressBar.style.width = "100%";

  const percentage = Math.round((state.score / state.maxScore) * 100);
  saveStageStars(state.stageData.stageId, percentage);

  el.summaryStageTitle.textContent = state.stageData.title;
  el.summaryScoreValue.textContent = `${state.score}/${state.maxScore}`;
  el.summaryPercent.textContent = `${percentage}%`;

  if (percentage >= 80) {
    el.summaryLevelDesc.textContent =
      "ยอดเยี่ยมมาก ท่านสามารถพิจารณาเจตนาและประยุกต์ใช้หลักศีลคู่กับเบญจธรรมได้อย่างเหมาะสมในทุกบริบท";
  } else if (percentage >= 50) {
    el.summaryLevelDesc.textContent =
      "อยู่ในเกณฑ์ดี ท่านหลีกเลี่ยงการละเมิดศีลโดยตรงได้ แต่ยังมีบางสถานการณ์ที่สามารถแสดงคุณธรรมเชิงรุกได้มากขึ้น";
  } else {
    el.summaryLevelDesc.textContent =
      "ควรทบทวนเพิ่มเติม ลองพิจารณาผลกระทบของเจตนาและการกระทำร่วมกับเพื่อนและพระอาจารย์ในการอภิปราย";
  }

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

  el.summaryDebriefingList.innerHTML = "";
  state.stageData.debriefingQuestions.forEach((q) => {
    const li = document.createElement("li");
    li.textContent = q;
    el.summaryDebriefingList.appendChild(li);
  });

  el.summarySyncStatus.textContent = "กำลังบันทึกคะแนนระหว่างเรียน (E1) ลงฐานข้อมูล...";
  showScreen("summary");

  const result = await saveStageScore({
    anonymousId: state.anonymousId,
    stageId: state.stageData.stageId,
    stageTitle: state.stageData.title,
    totalScore: state.score,
    maxScore: state.maxScore,
    percentage,
    decisionsSummary: state.decisions
  });

  if (result.saved) {
    el.summarySyncStatus.textContent = "บันทึกคะแนน E1 และประวัติการตัดสินใจลง Firebase Firestore เรียบร้อยแล้ว";
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

  playTone(660, 0.1, "sine", 0.06);
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

el.btnSoundToggle.addEventListener("click", () => {
  state.soundEnabled = !state.soundEnabled;
  el.btnSoundToggle.textContent = state.soundEnabled ? "🔊" : "🔇";
});

document.querySelectorAll(".btn-start-stage").forEach((btn) => {
  btn.addEventListener("click", () => {
    playTone(580, 0.08, "sine", 0.06);
    loadStage(btn.getAttribute("data-stage"));
  });
});

el.btnBackMenu.addEventListener("click", () => {
  if (confirm("ต้องการกลับสู่หน้าเลือกด่านหรือไม่? ความคืบหน้าของด่านปัจจุบันจะไม่ถูกบันทึก")) {
    clearInterval(state.typingTimer);
    showScreen("menu");
  }
});

el.vnDialogueBox.addEventListener("click", (e) => {
  if (e.target.closest("#btn-next")) return;
  if (state.isTyping) finishTypingImmediately();
});

el.btnNext.addEventListener("click", () => {
  if (state.isTyping) {
    finishTypingImmediately();
    return;
  }
  playTone(520, 0.06, "sine", 0.05);
  const currentNode = state.stageData.nodes[state.currentNodeId];
  if (!currentNode) return;

  if (currentNode.type === "choice") {
    openChoicesModal(currentNode);
  } else if (currentNode.next === "END") {
    finishStage();
  } else {
    renderNode(currentNode.next);
  }
});

el.btnFeedbackContinue.addEventListener("click", () => {
  playTone(520, 0.06, "sine", 0.05);
  if (!state.pendingNextNodeId || state.pendingNextNodeId === "END") {
    finishStage();
  } else {
    renderNode(state.pendingNextNodeId);
  }
});

el.btnReplayStage.addEventListener("click", () => {
  if (state.stageData) loadStage(state.stageData.stageId);
});

el.btnSummaryMenu.addEventListener("click", () => {
  showScreen("menu");
});

const savedSessionId = sessionStorage.getItem("vn_anonymous_id");
if (savedSessionId) {
  state.anonymousId = savedSessionId;
  el.menuUserId.textContent = savedSessionId;
  showScreen("menu");
}
