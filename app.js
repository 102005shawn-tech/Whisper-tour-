// app.js (古典相容 - 無痛嚙合終極版)
const LIVEKIT_SERVER_URL = "wss://whisper-tour-enlho56l.livekit.cloud";
const VERCEL_BACKEND_URL = "https://whisper-tour-drab.vercel.app/api/token";

let currentRoom = null;
let currentRoomCode = "";
let countInterval = null;
let waveInterval = null;

// 畫面切換控制
window.switchScreen = function(screenNum) {
    document.getElementById('screen-1').style.display = "none";
    document.getElementById('screen-2').style.display = "none";
    document.getElementById('screen-3').style.display = "none";
    document.getElementById('screen-4').style.display = "none";
    document.getElementById('screen-tourist-live').style.display = "none";

    if (screenNum === 1) document.getElementById('screen-1').style.display = "block";
    if (screenNum === 2) document.getElementById('screen-2').style.display = "block";
    if (screenNum === 3) document.getElementById('screen-3').style.display = "block";
    if (screenNum === 4) document.getElementById('screen-4').style.display = "block";
    if (screenNum === 'tourist-live') document.getElementById('screen-tourist-live').style.display = "block";
}

// 導遊端：房號初始化生成
window.toScreen3 = function() {
    switchScreen(3);
    const chkRandom = document.getElementById('chkRandomCode').checked;
    currentRoomCode = chkRandom ? Math.floor(1000 + Math.random() * 9000).toString() : "1111"; 
    document.getElementById('displayRoomCode').innerText = currentRoomCode;
}

// 📢 導遊端：獲取 Token 並連線至基地台
window.connectAsGuide = async function() {
    try {
        document.getElementById('txStatusText').innerText = "FETCHING TOKEN...";
        const response = await fetch(`${VERCEL_BACKEND_URL}?room=${currentRoomCode}&identity=Guide_Leader&isGuide=true`);
        const data = await response.json();
        if (data.error) throw new Error(data.error);

        document.getElementById('txStatusText').innerText = "CONNECTING...";
        
        const LK = window.LiveKitClient;
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

// 導遊按住麥克風發話
window.startTransmission = async function(e) {
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

// 導遊放開麥克風靜音
window.stopTransmission = async function(e) {
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

// 🎧 遊客端：登入並守聽頻道
window.enterTouristChannel = async function() {
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
        const LK = window.LiveKitClient;
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
    } catch (err) {
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

window.leaveRoom = function() {
    if (currentRoom) { currentRoom.disconnect(); currentRoom = null; }
    clearInterval(countInterval);
    toggleWaveAnimation(false);
    switchScreen(1);
}