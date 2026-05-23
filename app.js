// app.js (全自動連線版)
// 1. 這裡填你的 LiveKit 伺服器網址（就是 wss:// 那串）
const LIVEKIT_SERVER_URL = "wss://whisper-tour-p-2sa9vdmag8m.livekit.cloud";

// 2. 這裡「暫時」留空，等一下 Vercel 噴煙火後，我們再來填！
const VERCEL_BACKEND_URL = "https://whisper-tour-mmm4goduf-102005shawn-techs-projects.vercel.ap/api/token";

let currentRoom = null;
let currentRoomCode = "";
let countInterval = null;
let waveInterval = null;

function switchScreen(screenNum) {
    document.getElementById('screen-1').classList.add('hidden');
    document.getElementById('screen-2').classList.add('hidden');
    document.getElementById('screen-3').classList.add('hidden');
    document.getElementById('screen-tourist-live').classList.add('hidden');
    if (screenNum === 1) document.getElementById('screen-1').classList.remove('hidden');
    if (screenNum === 2) document.getElementById('screen-2').classList.remove('hidden');
    if (screenNum === 3) document.getElementById('screen-3').classList.remove('hidden');
    if (screenNum === 'tourist-live') document.getElementById('screen-tourist-live').classList.remove('hidden');
}

function toScreen3() {
    switchScreen(3);
    const chkRandom = document.getElementById('chkRandomCode').checked;
    currentRoomCode = chkRandom ? Math.floor(1000 + Math.random() * 9000).toString() : "1111"; 
    document.getElementById('displayRoomCode').innerText = currentRoomCode;
}

async function connectAsGuide() {
    try {
        if (VERCEL_BACKEND_URL === "WAITING_FOR_VERCEL_URL") {
            return alert("抱歉，翔哥，你的 VERCEL_BACKEND_URL 還沒填入正確的後端網址喔！");
        }
        document.getElementById('txStatusText').innerText = "FETCHING TOKEN...";
        const response = await fetch(`${VERCEL_BACKEND_URL}?room=${currentRoomCode}&identity=Guide_Leader&isGuide=true`);
        const data = await response.json();
        if (data.error) throw new Error(data.error);

        document.getElementById('txStatusText').innerText = "CONNECTING...";
        currentRoom = new LiveKitClient.Room();
        await currentRoom.connect(LIVEKIT_SERVER_URL, data.token);
        
        document.getElementById('txStatusText').innerText = "STANDBY (守聽)";
        const btn = document.getElementById('mainMicBtn');
        btn.disabled = false;
        btn.className = "w-44 h-44 bg-slate-900 text-cyan-400 rounded-full flex flex-col items-center justify-center border-[12px] border-slate-950 shadow-2xl shadow-cyan-950/20 border-cyan-950/40 cursor-pointer select-none transition-all duration-75";
        document.getElementById('micEmoji').innerText = "🎙️";
        document.getElementById('micBtnText').innerText = "按住發話";
        document.getElementById('micBtnText').className = "text-xs font-black mt-3 tracking-widest uppercase text-cyan-400";
        document.getElementById('guideTip').innerHTML = "無線電已上線！<br>按住按鈕發話，放開自動靜音。";
        startListenerCountLoop();
    } catch (err) {
        alert("導遊連線失敗: " + err.message);
        document.getElementById('txStatusText').innerText = "DISCONNECTED";
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
    document.getElementById('micBtnText').className = "text-xs font-black mt-3 tracking-widest uppercase text-white";
    document.getElementById('txSignalLight').className = "w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_10px_#ef4444]";
    document.getElementById('txStatusText').innerText = "TRANSMIT (TX)";
    document.getElementById('txStatusText').className = "text-[11px] font-bold text-red-500 tracking-widest font-mono";
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
    document.getElementById('micBtnText').className = "text-xs font-black mt-3 tracking-widest uppercase text-cyan-400";
    document.getElementById('txSignalLight').className = "w-2.5 h-2.5 rounded-full bg-slate-600";
    document.getElementById('txStatusText').innerText = "STANDBY (守聽)";
    document.getElementById('txStatusText').className = "text-[11px] font-bold text-slate-400 tracking-widest font-mono";
    await currentRoom.localParticipant.setMicrophoneEnabled(false);
}

async function enterTouristChannel() {
    const code = document.getElementById('inputRoomCode').value.trim();
    const nick = document.getElementById('inputNickname').value.trim();
    if (!code || !nick) return alert('請輸入房號與暱稱！');
    if (VERCEL_BACKEND_URL === "WAITING_FOR_VERCEL_URL") {
        return alert("抱歉，你的 VERCEL_BACKEND_URL 還沒填入正確的後端網址喔！");
    }

    document.getElementById('liveRoomInfo').innerText = `CH: ${code}`;
    document.getElementById('liveNickInfo').innerText = `USER: ${nick}`;
    switchScreen('tourist-live');

    try {
        document.getElementById('rxStatus').innerText = "正在獲取通行證...";
        const response = await fetch(`${VERCEL_BACKEND_URL}?room=${code}&identity=${encodeURIComponent(nick)}&isGuide=false`);
        const data = await response.json();
        if (data.error) throw new Error(data.error);

        document.getElementById('rxStatus').innerText = "正在建立語音連線...";
        currentRoom = new LiveKitClient.Room();
        
        currentRoom.on(LiveKitClient.RoomEvent.TrackSubscribed, (track) => {
            if (track.kind === 'audio') {
                track.attach();
                document.getElementById('rxStatus').innerText = "🔊 導遊正在發話...";
                document.getElementById('rxStatus').className = "text-base font-bold text-cyan-400 tracking-wide animate-pulse";
                toggleWaveAnimation(true);
            }
        });

        currentRoom.on(LiveKitClient.RoomEvent.TrackUnsubscribed, (track) => {
            if (track.kind === 'audio') {
                document.getElementById('rxStatus').innerText = "頻道安靜中 (STANDBY)";
                document.getElementById('rxStatus').className = "text-base font-bold text-slate-500 tracking-wide";
                toggleWaveAnimation(false);
            }
        });

        await currentRoom.connect(LIVEKIT_SERVER_URL, data.token);
        document.getElementById('rxStatus').innerText = "頻道安靜中 (STANDBY)";
        document.getElementById('rxSubStatus').innerText = "已成功進入無線電頻道";
    } catch (err) {
        alert("遊客連線失敗: " + err.message);
        switchScreen(2);
    }
}

function startListenerCountLoop() {
    countInterval = setInterval(() => {
        if (currentRoom) {
            const count = currentRoom.participants.size;
            document.getElementById('displayListenerCount').innerHTML = `${count} <span class="text-xs font-normal text-slate-500">人</span>`;
        }
    }, 2000);
}

function toggleWaveAnimation(run) {
    const spans = document.querySelectorAll('#liveWave span');
    clearInterval(waveInterval);
    if (run) {
        waveInterval = setInterval(() => {
            spans.forEach(s => {
                s.style.height = `${Math.floor(Math.random() * 30) + 8}px`;
                s.className = "w-1 bg-cyan-400 rounded-full transition-all duration-75 shadow-[0_0_10px_rgba(34,211,238,0.5)]";
            });
        }, 100);
    } else {
        spans.forEach(s => {
            s.style.height = `6px`;
            s.className = "w-1 bg-slate-800 rounded-full transition-all duration-150";
        });
    }
}

function leaveRoom() {
    if (currentRoom) {
        currentRoom.disconnect();
        currentRoom = null;
    }
    clearInterval(countInterval);
    toggleWaveAnimation(false);
    switchScreen(1);
}