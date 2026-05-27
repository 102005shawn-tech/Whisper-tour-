// app.js (OpenAI 骨架 + 跨域與環境變數終極修復)
const LIVEKIT_SERVER_URL = "wss://whisper-tour-enlho56l.livekit.cloud";

// 🟢 修正一：強迫切回 Production 正式版網址，拒絕 Vercel 自動生成的 Preview 亂碼網址，彻底解決 CORS 阻擋！
const VERCEL_BACKEND_URL = "https://whisper-tour-drab.vercel.app/api/token";

let currentRoom = null;
let currentRoomCode = "";

/* 畫面切換 */
function switchScreen(screenNum) {
  // 🟢 修正二：保險除錯，確保畫面 4 與 5 也能被正確隱藏與切換
  const screens = ["screen-1", "screen-2", "screen-3", "screen-4", "screen-tourist-live"];
  screens.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add("hidden");
  });

  const targetScreen = screenNum === 'tourist-live' ? "screen-tourist-live" : `screen-${screenNum}`;
  const targetEl = document.getElementById(targetScreen);
  if (targetEl) targetEl.classList.remove("hidden");
}

/* 導遊畫面 */
window.toGuideScreen = function() {
  switchScreen(3);
  currentRoomCode = Math.floor(1000 + Math.random() * 9000).toString();
  document.getElementById("displayRoomCode").innerText = currentRoomCode;
}

/* 導遊連線 */
window.connectAsGuide = async function() {
  try {
    document.getElementById("txStatusText").innerText = "取得 Token 中...";

    const response = await fetch(
      `${VERCEL_BACKEND_URL}?room=${currentRoomCode}&identity=Guide&isGuide=true`
    );

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    document.getElementById("txStatusText").innerText = "連線基地台中...";

    const LK = window.LivekitClient || window.LiveKitClient;

    if (!LK) {
      throw new Error("LiveKit SDK 載入失敗");
    }

    currentRoom = new LK.Room();

    await currentRoom.connect(
      LIVEKIT_SERVER_URL,
      data.token
    );

    document.getElementById("txStatusText").innerText = "已連線 (待機中)";
    document.getElementById("mainMicBtn").disabled = false;

  } catch (err) {
    console.error(err);
    alert("導遊連線失敗：" + err.message);
  }
}

/* 開始說話 */
window.startTransmission = async function() {
  if (!currentRoom) return;
  try {
    await currentRoom.localParticipant.setMicrophoneEnabled(true);
    document.getElementById("txStatusText").innerText = "正在說話...";
  } catch (err) {
    console.error(err);
  }
}

/* 停止說話 */
window.stopTransmission = async function() {
  if (!currentRoom) return;
  try {
    await currentRoom.localParticipant.setMicrophoneEnabled(false);
    document.getElementById("txStatusText").innerText = "待機中";
  } catch (err) {
    console.error(err);
  }
}

/* 遊客加入 */
window.enterTouristChannel = async function() {
  try {
    const roomCode = document.getElementById("inputRoomCode").value;
    const nickname = document.getElementById("inputNickname").value || "遊客";

    document.getElementById("rxStatus").innerText = "正在加入頻道...";

    const response = await fetch(
      `${VERCEL_BACKEND_URL}?room=${roomCode}&identity=${nickname}&isGuide=false`
    );

    const data = await response.json();

    const LK = window.LivekitClient || window.LiveKitClient;

    currentRoom = new LK.Room();

    currentRoom.on(
      LK.RoomEvent.TrackSubscribed,
      (track) => {
        if (track.kind === "audio") {
          track.attach();
          document.getElementById("rxStatus").innerText = "正在收聽導遊";
        }
      }
    );

    await currentRoom.connect(
      LIVEKIT_SERVER_URL,
      data.token
    );

    document.getElementById("rxStatus").innerText = "已加入頻道";

  } catch (err) {
    console.error(err);
    alert("加入失敗：" + err.message);
  }
}

// 🟢 修正三：保險機制，將函數掛載到 window 上，確保傳統 HTML 的 onclick 絕對抓得到
window.switchScreen = switchScreen;