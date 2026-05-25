// app.js (終極咬合無Bug版)
// 1. 🟢 修正為你最新截圖上的正確 LiveKit 基地台網址
const LIVEKIT_SERVER_URL = "wss://whisper-tour-enlho56l.livekit.cloud";
const VERCEL_BACKEND_URL = "https://whisper-tour-drab.vercel.app/api/token";

let currentRoom = null;
let currentRoomCode = "";
let countInterval = null;
let waveInterval = null;

function switchScreen(screenNum) {
    document.getElementById('screen-1').className = "hidden";
    document.getElementById('screen-2').className = "hidden";
    document.getElementById('screen-3').className = "hidden";
    document.getElementById('screen-4').className = "hidden";
    document.getElementById('screen-tourist-live').className = "hidden";

    if (screenNum === 1) document.getElementById('screen-1').className = "block space-y-8";
    if (screenNum === 2) document.getElementById('screen-2').className = "block space-y-6";
    if (screenNum === 3) document.getElementById('screen-3').className = "block space-y-6";
    if (screenNum === 4) document.getElementById('screen-4').className = "block space-y-8 text-center";
    if (screenNum === 'tourist-live') document.getElementById('screen-tourist-live').className = "block space-y-8 text-center";
}

function toScreen3() {
    switchScreen(3);
    const chkRandom = document.getElementById('chkRandomCode').checked;
    currentRoomCode = chkRandom ? Math.floor(1000 + Math.random() * 9000).toString() : "1111"; 
    document.getElementById('displayRoomCode').innerText = currentRoomCode;
}

async function connectAsGuide() {
    try {
        document.getElementById('txStatusText').innerText = "FETCHING TOKEN...";
        const response = await fetch(`${VERCEL_BACKEND_URL}?room=${currentRoomCode}&identity=Guide_Leader&isGuide=true`);
        const data = await response.json();
        if (data.error) throw new Error(data.error);

        document.getElementById('txStatusText').innerText = "CONNECTING...";
        
        // 🟢 【保險關鍵】如果瀏覽器不認 window，改用最安全的全局域抓取通訊模組
        const LK = window.LiveKitClient || LiveKitClient;
        if (!LK) throw new Error("晶片模組加載失敗，請刷新重試！");

        currentRoom = new LK.Room();
        await currentRoom.connect(LIVEKIT_SERVER_URL, data.token);
        
        document.getElementById('txStatusText').innerText = "STANDBY (守聽)";
        const btn = document.getElementById('mainMicBtn');
        btn.disabled = false;
        btn.className = "w-44 h-44 bg-slate-900 text-cyan-400 rounded-full flex flex-col items-center justify-center border-[12px] border-slate-950 shadow-2xl cursor-pointer select-none";
        document.getElementById('micEmoji').className = "text-4xl filter-none opacity-100";
        document.getElementById('micBtnText').innerText = "按住發話";
        document.getElementById('guideTip').innerHTML = "無線電已連線！<br>按住大按鈕說話。";

        startListenerCountLoop();
    } catch (err) {
        alert("導遊端通訊初始化失敗: " + err.message);
        leaveRoom();
    }
}

async function startTransmission(e) {
    if(e) e.preventDefault();
    if (!currentRoom) return;
    const btn = document.getElementById('mainMicBtn');
    btn.style.backgroundColor = "#ef4444";
    btn.style.borderColor = "#7f1d1d";
    document.getElementById('micEmoji').innerText = "🔴";
    document.getElementById('micBtnText').innerText = "正在發話";
    document.getElementById('txSignalLight').className = "w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_10px_#ef4444]";
    document.getElementById('txStatusText').innerText = "TRANSMIT (TX)";
    
    await currentRoom.localParticipant.setMicrophoneEnabled(true);
}

async function stopTransmission(e) {
    if(e) e.preventDefault();
    if (!currentRoom) return;
    const btn = document.getElementById('mainMicBtn');
    btn.style.backgroundColor = "#030712";
    btn.style.borderColor = "#020617";
    document.getElementById('micEmoji').innerText = "🎙️";
    document.getElementById('micBtnText').innerText = "按住發話";
    document.getElementById('txSignalLight').className = "w-2.5 h-2.5 rounded-full bg-slate-600";
    document.getElementById('txStatusText').innerText = "STANDBY (守聽)";
    
    await currentRoom.localParticipant.setMicrophoneEnabled(false);
}

async function enterTouristChannel() {
    let code = document.getElementById('inputRoomCode').value.trim();
    let nick = document.getElementById('inputNickname').value.trim();

    if (!nick) nick = "Kevin";
    if (!code) return alert('請輸入房號！');

    document.getElementById('liveRoomInfo').innerText = `CH: ${code}`;
    document.getElementById('liveNickInfo').innerText = `USER: ${nick}`;
    switchScreen('tourist-live');

    try {
        document.getElementById('rxStatus').innerText = "正在獲取安全通行證...";
        const response = await fetch(`${VERCEL_BACKEND_URL}?room=${code}&identity=${encodeURIComponent(nick)}&isGuide=false`);
        const data = await response.json();
        if (data.error) throw new Error(data.error);

        document.getElementById('rxStatus').innerText = "正在接入對講頻道...";
        const LK = window.LiveKitClient || LiveKitClient;
        currentRoom = new LK.Room();
        
        currentRoom.on(LK.RoomEvent.TrackSubscribed, (track) => {
            if (track.kind === 'audio') {
                track.attach();
                document.getElementById('rxStatus').innerText = "🔊 導遊正在發話...";
                toggleWaveAnimation(true);
            }
        });

        currentRoom.on(LK.RoomEvent.TrackUnsubscribed, (track) => {
            if (track.kind === 'audio') {
                document.getElementById('rxStatus').innerText = "頻道安靜中 (STANDBY)";
                toggleWaveAnimation(false);
            }
        });

        await currentRoom.connect(LIVEKIT_SERVER_URL, data.token);
        document.getElementById('rxStatus').innerText = "頻道安靜中 (STANDBY)";
        alert("遊客連線失敗: " + err.message);
        switchScreen(2);
    }
}

function startListenerCountLoop() {
    countInterval = setInterval(() => {
        if (currentRoom) {
            const count = currentRoom.participants.size;
            document.getElementById('displayListenerCount').innerText = count;
        }
    }, 2000);
}

function toggleWaveAnimation(run) {
    const spans = document.querySelectorAll('#liveWave span');
    clearInterval(waveInterval);
    if (run) {
        waveInterval = setInterval(() => {
            spans.forEach(s => { s.style.height = `${Math.floor(Math.random() * 32) + 8}px`; });
        }, 100);
    } else {
        spans.forEach(s => { s.style.height = `6px`; });
    }
}

function leaveRoom() {
    if (currentRoom) { currentRoom.disconnect(); currentRoom = null; }
    clearInterval(countInterval);
    toggleWaveAnimation(false);
    switchScreen(1);
}