// app.js (OpenAI 骨架 + 手機觸控防禦完全體)
const LIVEKIT_SERVER_URL = "wss://whisper-tour-enlho56l.livekit.cloud";
const VERCEL_BACKEND_URL = "https://whisper-tour-drab.vercel.app/api/token";

let currentRoom = null;
let currentRoomCode = "";

/* 畫面切換 */
function switchScreen(screenNum) {
  document.getElementById("screen-1").classList.add("hidden");
  document.getElementById("screen-2").classList.add("hidden");
  document.getElementById("screen-3").classList.add("hidden");

  document.getElementById(`screen-${screenNum}`).classList.remove("hidden");
}

/* 導遊畫面 */
function toGuideScreen() {
  switchScreen(3);
  currentRoomCode = Math.floor(1000 + Math.random() * 9000).toString();
  document.getElementById("displayRoomCode").innerText = currentRoomCode;
}

/* 導遊連線 */
async function connectAsGuide() {
  try {
    document.getElementById("txStatusText").innerText = "取得 Token 中...";

    const response = await fetch(
      `${VERCEL_BACKEND_URL}?room=${currentRoomCode}&identity=Guide&isGuide=true`
    );

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    const LK = window.LivekitClient || window.LiveKitClient;

    if (!LK) {
      throw new Error("LiveKit SDK 載入失敗");
    }

    currentRoom = new LK.Room();

    await currentRoom.connect(LIVEKIT_SERVER_URL, data.token);

    document.getElementById("txStatusText").innerText = "已連線 (待機中)";
    document.getElementById("mainMicBtn").disabled = false;
    
    // 連線成功後，把按鈕背景稍微亮一下，提醒導遊可以按了
    document.getElementById("mainMicBtn").classList.remove("bg-gray-800");
    document.getElementById("mainMicBtn").classList.add("bg-gray-700", "text-cyan-400");

  } catch (err) {
    console.error(err);
    alert("導遊連線失敗：" + err.message);
  }
}

/* 開始說話 (完美對齊電腦滑鼠與手機手指事件) */
async function startTransmission(e) {
  // 🟢 核心防禦：如果是手機觸控，強行阻止手機彈出複製選單，逼麥克風清醒！
  if (e && e.preventDefault) {
    e.preventDefault();
  }
  
  if (!currentRoom) return;

  try {
    await currentRoom.localParticipant.setMicrophoneEnabled(true);
    document.getElementById("txStatusText").innerText = "正在說話...";
    
    // 🎨 發話視覺反饋：按鈕變紅
    const btn = document.getElementById("mainMicBtn");
    btn.style.backgroundColor = "#ef4444";
  } catch (err) {
    console.error(err);
  }
}

/* 停止說話 */
async function stopTransmission(e) {
  if (e && e.preventDefault) {
    e.preventDefault();
  }
  
  if (!currentRoom) return;

  try {
    await currentRoom.localParticipant.setMicrophoneEnabled(false);
    document.getElementById("txStatusText").innerText = "待機中";
    
    // 🎨 恢復灰色
    const btn = document.getElementById("mainMicBtn");
    btn.style.backgroundColor = "#374151"; // Tailwind bg-gray-700
  } catch (err) {
    console.error(err);
  }
}

/* 遊客加入 */
async function enterTouristChannel() {
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

    currentRoom.on(LK.RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === "audio") {
        track.attach();
        document.getElementById("rxStatus").innerText = "正在收聽導遊";
      }
    });

    await currentRoom.connect(LIVEKIT_SERVER_URL, data.token);
    document.getElementById("rxStatus").innerText = "已加入頻道 (聽眾常駐)";

  } catch (err) {
    console.error(err);
    alert("加入失敗：" + err.message);
  }
}

// 🟢 最終防線：把所有函數強制註冊到最高級 window，保證 HTML 的 onclick/ontouch 100% 抓得到
window.toGuideScreen = toGuideScreen;
window.switchScreen = switchScreen;
window.connectAsGuide = connectAsGuide;
window.startTransmission = startTransmission;
window.stopTransmission = stopTransmission;
window.enterTouristChannel = enterTouristChannel;
