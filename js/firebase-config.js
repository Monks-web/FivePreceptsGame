// การเชื่อมต่อ Firebase Cloud Firestore (Modular SDK v10 ผ่าน CDN สำหรับเว็บเบราว์เซอร์)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCPZfEYK2cLUizLnb9ORpCJmF9gzHN998U",
  authDomain: "fivepreceptsgame.firebaseapp.com",
  projectId: "fivepreceptsgame",
  storageBucket: "fivepreceptsgame.firebasestorage.app",
  messagingSenderId: "587040625445",
  appId: "1:587040625445:web:6a76f0be1230b778d180cc",
  measurementId: "G-E88SCHB9ZW"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * บันทึกประวัติการตัดสินใจรายข้อ (Log Data) ลง Collection: game_logs
 */
export async function saveDecisionLog(logPayload) {
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
