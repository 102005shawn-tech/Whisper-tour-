// app.js (終極外觀復刻 + 物理強制監聽完全體)
const LIVEKIT_SERVER_URL = "wss://whisper-tour-enlho56l.livekit.cloud";
const VERCEL_BACKEND_URL = "https://whisper-tour-drab.vercel.app/api/token";

let currentRoom = null;
let currentRoomCode = "";

/* 畫面切換控制 */
window.switchScreen = function(screenNum) {
  document.getElementById("screen-1").style.display = "none";
  document.getElementById("screen-2").style.display = "none";
  document.getElementById("screen-3").style.display = "none";

  if (screenNum === 1) document.getElementById("screen-1").style.display = "block";
  if (screenNum === 2) document.getElementById("screen-2").style.display = "block";
  if (screenNum === 3) document.getElementById("screen-3").style.display = "block";
}

/* 導遊初始化畫面 */
window.toGuideScreen = function() {
  switchScreen(3);
  currentRoomCode = Math.floor(1000 + Math.random() * 9000).toString();
  document.getElementById("displayRoomCode").innerText = currentRoomCode;
  
  // 重設按鈕回初始狀態
  const btn = document.getElementById("mainMicBtn");
  btn.disabled = true;
  btn.style.backgroundColor = "#020617";
  btn.style.borderColor = "#0f172a";
  btn.style.cursor = "not-allowed";
  btn.style.opacity = "0.4";
  document.getElementById("micEmoji").className = "text-5xl filter grayscale opacity-30";
  document.getElementById("micBtnText").innerText = "等待連線";
  document.getElementById("txStatusText").innerText = "未連線";
  document.getElementById("txSignalLight").className = "w-2.5 h-2.5 rounded-full bg-slate-600";
}

/* 📢 導遊連線基地台 */
window.connectAsGuide = async function() {
  try {
    document.getElementById("txStatusText").innerText = "GET TOKEN...";
    document.getElementById("txSignalLight").className = "w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]";

    const response = await fetch(
      `${VERCEL_BACKEND_URL}?room=${currentRoomCode}&identity=Guide&isGuide=true`
    );

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    document.getElementById("txStatusText").innerText = "CONNECTING...";

    const LK = window.LiveKitClient || window.LivekitClient || LiveKitClient;

    if (!LK) {
      throw new Error("LiveKit SDK 載入失敗，請刷新重試");
    }

    currentRoom = new LK.Room();

    await currentRoom.connect(LIVEKIT_SERVER_URL, data.token);

    // 🟢 連線成功：解鎖高級按鈕樣式
    document.getElementById("txStatusText").innerText = "STANDBY (守聽)";
    document.getElementById("txSignalLight").className = "w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]";
    
    const btn = document.getElementById("mainMicBtn");
    btn.disabled = false;
    btn.style.opacity = "1";
    btn.style.cursor = "pointer";
    btn.style.backgroundColor = "#090d16";
    btn.style.borderColor = "#1e293b";
    
    document.getElementById("micEmoji").className = "text-5xl filter-none opacity-100";
    document.getElementById("micBtnText").innerText = "按住說話";
    document.getElementById("micBtnText").className = "text-xs font-black mt-3 text-cyan-400 tracking-wider";
    document.getElementById("guideTip").innerHTML = "基地台連線成功！<br><span class='text-emerald-400 font-bold'>現在可以長按🎙️對講了！</span>";

    // 🔌 【核心暴力焊槍】在連線成功、按鈕啟用的這一瞬間，直接用最強硬的底層事件綁定，強行接通手機神經元！
    btn.onmousedown = startTransmission;
    btn.onmouseup = stopTransmission;
    btn.ontouchstart = startTransmission;
    btn.ontouchend = stopTransmission;

  } catch (err) {
    console.error(err);
    document.getElementById("txStatusText").innerText = "連線失敗";
    document.getElementById("txSignalLight").className = "w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]";
    alert("導遊連線失敗：" + err.message);
  }
}

/* 🔴 開始說話 (強制攔截所有干擾) */
async function startTransmission(e) {
  if (e) {
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
  }
  if (!currentRoom) return;

  try {
    await currentRoom.localParticipant.setMicrophoneEnabled(true);
    document.getElementById("txStatusText").innerText = "TRANSMIT (TX)";
    document.getElementById("txSignalLight").className = "w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_12px_#ef4444]";
    
    const btn = document.getElementById("mainMicBtn");
    btn.style.backgroundColor = "#7f1d1d"; 
    btn.style.borderColor = "#ef4444";     
    document.getElementById("micBtnText").innerText = "正在發話";
    document.getElementById("micBtnText").className = "text-xs font-black mt-3 text-red-400 tracking-wider";
  } catch (err) {
    console.error(err);
  }
}

/* 🟢 停止說話 */
async function stopTransmission(e) {
  if (e) {
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
  }
  if (!currentRoom) return;

  try {
    await currentRoom.localParticipant.setMicrophoneEnabled(false);
    document.getElementById("txStatusText").innerText = "STANDBY (守聽)";
    document.getElementById("txSignalLight").className = "w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]";
    
    const btn = document.getElementById("mainMicBtn");
    btn.style.backgroundColor = "#090d16";
    btn.style.borderColor = "#1e293b";
    document.getElementById("micBtnText").innerText = "按住說話";
    document.getElementById("micBtnText").className = "text-xs font-black mt-3 text-cyan-400 tracking-wider";
  } catch (err) {
    console.error(err);
  }
}

/* 🎧 遊客加入頻道 */
window.enterTouristChannel = async function() {
  try {
    const roomCode = document.getElementById("inputRoomCode").value.trim();
    const nickname = document.getElementById("inputNickname").value.trim() || "遊客";

    if (!roomCode) return alert('請輸入房號！');

    document.getElementById("rxStatus").innerText = "正在獲取安全通行證...";

    const response = await fetch(
      `${VERCEL_BACKEND_URL}?room=${roomCode}&identity=${encodeURIComponent(nickname)}&isGuide=false`
    );

    const data = await response.json();
    
    document.getElementById("rxStatus").innerText = "正在接入對講頻道...";
    const LK = window.LiveKitClient || window.LivekitClient || LiveKitClient;

    currentRoom = new LK.Room();

    currentRoom.on(LK.RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === "audio") {
        track.attach();
        document.getElementById("rxStatus").innerText = "🔊 導遊正在發話...";
      }
    });
    
    currentRoom.on(LK.RoomEvent.TrackUnsubscribed, (track) => {
      if (track.kind === "audio") {
        document.getElementById("rxStatus").innerText = "已加入頻道 (待機中)";
      }
    });

    await currentRoom.connect(LIVEKIT_SERVER_URL, data.token);
    document.getElementById("rxStatus").innerText = "已加入頻道 (待機中)";

  } catch (err) {
    console.error(err);
    document.getElementById("rxStatus").innerText = "連線失敗";
    alert("加入失敗：" + err.message);
  }
}
