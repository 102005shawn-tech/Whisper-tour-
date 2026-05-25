// app.js (全自動連線商業版 - 生產環境無誤版)
// 1. 填入你們專案的 LiveKit 官方基地台網址
const LIVEKIT_SERVER_URL = "wss://whisper-tour-enlho56l.livekit.cloud";

// 2. 🟢 【核心修正】已經幫你完美換成剛剛抓到的乾淨 Production 網址！
const VERCEL_BACKEND_URL = "https://whisper-tour-drab.vercel.app/api/token";

let currentRoom = null;
let currentRoomCode = "";
let countInterval = null;
let waveInterval = null;

// 切換畫面控制常式
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

// 導遊端：房號初始化生成邏輯
function toScreen3() {
    switchScreen(3);
    const chkRandom = document.getElementById('chkRandomCode').checked;
    currentRoomCode = chkRandom ? Math.floor(1000 + Math.random() * 9000).toString() : "1111"; 
    document.getElementById('displayRoomCode').innerText = currentRoomCode;
}

// 📢 導遊發話端自動獲取 Token 並登入基地台
async function connectAsGuide() {
    try {
        document.getElementById('txStatusText').innerText = "FETCHING TOKEN...";
        
        // 向 Vercel 秘密中心申請具備發話權限的導遊通行證
        const response = await fetch(`${VERCEL_BACKEND_URL}?room=${currentRoomCode}&identity=Guide_Leader&isGuide=true`);
        const data = await response.json();
        if (data.error) throw new Error(data.error);

        document.getElementById('txStatusText').innerText = "CONNECTING...";
        currentRoom = new LiveKitClient.Room();
        
        // 連結至基地台
        await currentRoom.connect(LIVEKIT_SERVER_URL, data.token);
        
        // 成功連線，解鎖發話大按鈕的視覺外觀
        document.getElementById('txStatusText').innerText = "STANDBY (守聽)";
        const btn = document.getElementById('mainMicBtn');
        btn.disabled = false;
        btn.className = "w-44 h-44 bg-slate-900 text-cyan-400 rounded-full flex flex-col items-center justify-center border-[12px] border-slate-950 shadow-2xl shadow-cyan-950/20 border-cyan-950/40 cursor-pointer select-none transition-all duration-75 active:scale-95";
        document.getElementById('micEmoji').className = "text-4xl filter-none opacity-100 transition-all";
        document.getElementById('micBtnText').innerText = "按住發話";
        document.getElementById('micBtnText').className = "text-xs font-black mt-3 tracking-widest uppercase text-cyan-400";
        document.getElementById('guideTip').innerHTML = "無線電已連線！<br>按住大按鈕說話，放開按鈕自動靜音。";

        // 開啟定時監聽在線人數迴圈
        startListenerCountLoop();
    } catch (err) {
        alert("導遊端通訊初始化失敗: " + err.message);
        leaveRoom();
    }
}

// 按住麥克風：開啟硬體發話、變更為高警示紅色視覺
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
    
    // 開啟麥克風硬體
    await currentRoom.localParticipant.setMicrophoneEnabled(true);
}

// 放開麥克風：關閉發話、切回酷炫守聽黑藍色視覺
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
    
    // 關閉麥克風硬體
    await currentRoom.localParticipant.setMicrophoneEnabled(false);
}

// 🎧 遊客接收端自動登入與動態接收邏輯
async function enterTouristChannel() {
    let code = document.getElementById('inputRoomCode').value.trim();
    let nick = document.getElementById('inputNickname').value.trim();

    // 🟢 【細節要求】如果遊客欄位空白，自動補上 Kevin 作為預設名稱
    if (!nick) {
        nick = "Kevin";
    }
    if (!code) return alert('請輸入 4 位數房號！');

    document.getElementById('liveRoomInfo').innerText = `CH: ${code}`;
    document.getElementById('liveNickInfo').innerText = `USER: ${nick}`;
    switchScreen('tourist-live');

    try {
        document.getElementById('rxStatus').innerText = "正在獲取安全通行證...";
        
        // 向 Vercel 後端申請「僅能收聽、不允許發話」的遊客通行證
        const response = await fetch(`${VERCEL_BACKEND_URL}?room=${code}&identity=${encodeURIComponent(nick)}&isGuide=false`);
        const data = await response.json();
        if (data.error) throw new Error(data.error);

        document.getElementById('rxStatus').innerText = "正在接入加密對講頻道...";
        currentRoom = new LiveKitClient.Room();
        
        // 核心監聽：當導遊在遠端開麥發話時，自動掛載音訊並跳動聲波
        currentRoom.on(LiveKitClient.RoomEvent.TrackSubscribed, (track) => {
            if (track.kind === 'audio') {
                track.attach();
                document.getElementById('rxStatus').innerText = "🔊 導遊正在發話...";
                document.getElementById('rxStatus').className = "text-base font-bold text-cyan-400 tracking-wide animate-pulse";
                toggleWaveAnimation(true);
            }
        });

        // 核心監聽：當導遊放開麥克風時，自動切斷聲波，回到靜音守聽
        currentRoom.on(LiveKitClient.RoomEvent.TrackUnsubscribed, (track) => {
            if (track.kind === 'audio') {
                document.getElementById('rxStatus').innerText = "頻道安靜中 (STANDBY)";
                document.getElementById('rxStatus').className = "text-base font-bold text-slate-500 tracking-wide";
                toggleWaveAnimation(false);
            }
        });

        // 執行連線
        await currentRoom.connect(LIVEKIT_SERVER_URL, data.token);
        document.getElementById('rxStatus').innerText = "頻道安靜中 (STANDBY)";
        document.getElementById('rxSubStatus').innerText = "已成功進入無線電頻道，守聽中";
    } catch (err) {
        alert("遊客連線失敗: " + err.message);
        switchScreen(2);
    }
}

// 導遊端計數器迴圈
function startListenerCountLoop() {
    countInterval = setInterval(() => {
        if (currentRoom) {
            // 計算目前房間內除了導遊以外的總人數
            const count = currentRoom.participants.size;
            document.getElementById('displayListenerCount').innerHTML = `${count} <span class="text-xs font-normal text-slate-500">人</span>`;
        }
    }, 2000);
}

// 遊客端藍綠色聲波隨機跳動視覺動畫
function toggleWaveAnimation(run) {
    const spans = document.querySelectorAll('#liveWave span');
    clearInterval(waveInterval);
    if (run) {
        waveInterval = setInterval(() => {
            spans.forEach(s => {
                s.style.height = `${Math.floor(Math.random() * 32) + 8}px`;
                s.className = "w-1 bg-cyan-400 rounded-full transition-all duration-75 shadow-[0_0_10px_rgba(34,211,238,0.6)]";
            });
        }, 100);
    } else {
        spans.forEach(s => {
            s.style.height = `6px`;
            s.className = "w-1 bg-slate-800 rounded-full transition-all duration-150";
        });
    }
}

// 安全斷開無線電連線並撤回首頁
function leaveRoom() {
    if (currentRoom) {
        currentRoom.disconnect();
        currentRoom = null;
    }
    clearInterval(countInterval);
    toggleWaveAnimation(false);
    switchScreen(1);
}