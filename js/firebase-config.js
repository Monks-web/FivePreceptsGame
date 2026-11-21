// การเชื่อมต่อ Firebase Cloud Firestore (Modular SDK v10)
// นำค่า Config จาก Firebase Console > Project Settings มาแทนที่ด้านล่าง
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const isConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY";

let db = null;
if (isConfigured) {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
}

/**
 * บันทึกประวัติการตัดสินใจรายข้อ (Log Data) ลง Collection: game_logs
 * หากยังไม่ได้ตั้งค่า Firebase จะสำรองข้อมูลลง localStorage เพื่อให้ทดสอบระบบได้ทันที
 */
export async function saveDecisionLog(logPayload) {
  const record = {
    ...logPayload,
    clientTimestamp: new Date().toISOString()
  };

  if (!db) {
    const localLogs = JSON.parse(localStorage.getItem("vn_local_game_logs") || "[]");
    localLogs.push(record);
    localStorage.setItem("vn_local_game_logs", JSON.stringify(localLogs));
    return { mode: "local", saved: true };
  }

  try {
    const docRef = await addDoc(collection(db, "game_logs"), {
      ...logPayload,
      timestamp: serverTimestamp()
    });
    return { mode: "firestore", saved: true, id: docRef.id };
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการบันทึก game_logs:", error);
    return { mode: "firestore", saved: false, error: error.message };
  }
}

/**
 * บันทึกคะแนนระหว่างเรียน (E1) ท้ายด่าน ลง Collection: e1_scores
 */
export async function saveStageScore(scorePayload) {
  const record = {
    ...scorePayload,
    clientTimestamp: new Date().toISOString()
  };

  if (!db) {
    const localScores = JSON.parse(localStorage.getItem("vn_local_e1_scores") || "[]");
    localScores.push(record);
    localStorage.setItem("vn_local_e1_scores", JSON.stringify(localScores));
    return { mode: "local", saved: true };
  }

  try {
    const docRef = await addDoc(collection(db, "e1_scores"), {
      ...scorePayload,
      completedAt: serverTimestamp()
    });
    return { mode: "firestore", saved: true, id: docRef.id };
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการบันทึก e1_scores:", error);
    return { mode: "firestore", saved: false, error: error.message };
  }
}
