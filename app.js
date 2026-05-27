const LIVEKIT_SERVER_URL = "wss://whisper-tour-enlho56l.livekit.cloud";

const VERCEL_BACKEND_URL =
"https://whisper-tour-bo977594i-102005shawn-techs-projects.vercel.app/api/token";

let currentRoom = null;
let currentRoomCode = "";

/* 畫面切換 */
function switchScreen(screenNum) {

  document.getElementById("screen-1").classList.add("hidden");
  document.getElementById("screen-2").classList.add("hidden");
  document.getElementById("screen-3").classList.add("hidden");

  document.getElementById(`screen-${screenNum}`)
    .classList.remove("hidden");
}

/* 導遊畫面 */
function toGuideScreen() {

  switchScreen(3);

  currentRoomCode =
    Math.floor(1000 + Math.random() * 9000).toString();

  document.getElementById("displayRoomCode").innerText =
    currentRoomCode;
}

/* 導遊連線 */
async function connectAsGuide() {

  try {

    document.getElementById("txStatusText").innerText =
      "取得 Token 中...";

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

    await currentRoom.connect(
      LIVEKIT_SERVER_URL,
      data.token
    );

    document.getElementById("txStatusText").innerText =
      "已連線";

    document.getElementById("mainMicBtn").disabled = false;

  } catch (err) {

    console.error(err);

    alert("導遊連線失敗：" + err.message);
  }
}

/* 開始說話 */
async function startTransmission() {

  if (!currentRoom) return;

  try {

    await currentRoom.localParticipant
      .setMicrophoneEnabled(true);

    document.getElementById("txStatusText").innerText =
      "正在說話...";

  } catch (err) {

    console.error(err);
  }
}

/* 停止說話 */
async function stopTransmission() {

  if (!currentRoom) return;

  try {

    await currentRoom.localParticipant
      .setMicrophoneEnabled(false);

    document.getElementById("txStatusText").innerText =
      "待機中";

  } catch (err) {

    console.error(err);
  }
}

/* 遊客加入 */
async function enterTouristChannel() {

  try {

    const roomCode =
      document.getElementById("inputRoomCode").value;

    const nickname =
      document.getElementById("inputNickname").value || "遊客";

    document.getElementById("rxStatus").innerText =
      "正在加入頻道...";

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

          document.getElementById("rxStatus").innerText =
            "正在收聽導遊";
        }
      }
    );

    await currentRoom.connect(
      LIVEKIT_SERVER_URL,
      data.token
    );

    document.getElementById("rxStatus").innerText =
      "已加入頻道";

  } catch (err) {

    console.error(err);

    alert("加入失敗：" + err.message);
  }
}