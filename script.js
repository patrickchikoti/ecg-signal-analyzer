const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const spec = document.getElementById("spectrum");
const sctx = spec ? spec.getContext("2d") : null;

canvas.width = 520;
canvas.height = 220;

if (spec) {
    spec.width = 520;
    spec.height = 120;
}

let running = false;
let x = 0;

let signal = [];
let bpm = 0;
let lastPeak = Date.now();

// 🔊 GOOGLE-STYLE SOUND ENGINE
let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let alarmInterval = null;

let currentAlarm = "NORMAL";
let lastStableAlarm = "NORMAL";
let changeTimer = 0;

// 🎵 GOOGLE-LIKE CHIME (2-tone)
function playChime(baseFreq = 520) {

    let t = audioCtx.currentTime;

    let osc1 = audioCtx.createOscillator();
    let gain1 = audioCtx.createGain();

    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);

    osc1.frequency.value = baseFreq;
    osc1.type = "sine";

    gain1.gain.setValueAtTime(0.0001, t);
    gain1.gain.exponentialRampToValueAtTime(0.08, t + 0.03);
    gain1.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);

    osc1.start(t);
    osc1.stop(t + 0.25);

    // second tone (higher pitch)
    let osc2 = audioCtx.createOscillator();
    let gain2 = audioCtx.createGain();

    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);

    osc2.frequency.value = baseFreq * 1.5;

    gain2.gain.setValueAtTime(0.0001, t + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.06, t + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);

    osc2.start(t + 0.1);
    osc2.stop(t + 0.35);
}

// 🔁 LOOP (CALM + SMART)
function startAlarmLoop(state) {

    if (alarmInterval) clearInterval(alarmInterval);

    currentAlarm = state;

    let speed = 2000;
    let baseFreq = 520;

    if (state === "WARNING") {
        speed = 1500;
        baseFreq = 580;
    } 
    else if (state === "CRITICAL") {
        speed = 1000;
        baseFreq = 650;
    }

    alarmInterval = setInterval(() => {
        playChime(baseFreq);
    }, speed);
}

// 🫀 ECG SIGNAL
function ecg(i) {

    let noise = (Math.random() - 0.5) * 8;
    let cycle = i % 100;

    let value = 0;

    if (cycle < 10) value = 10;
    else if (cycle < 20) value = -8;

    else if (cycle < 30) {

        value = 80;

        let now = Date.now();
        let diff = now - lastPeak;

        if (diff > 300 && diff < 2000) {
            bpm = Math.round(60000 / diff);
        }

        lastPeak = now;
    }

    else if (cycle < 40) value = -10;
    else value = 20;

    return value + noise;
}

// 📊 RISK INDEX
function riskIndex(bpm) {

    if (!bpm) return 0;

    let score = 0;

    if (bpm < 60) score += 40;
    if (bpm > 100) score += 40;
    if (bpm < 40 || bpm > 130) score += 30;

    return Math.min(100, score);
}

// 🚨 ALARM STATE
function alarmState(bpm) {

    if (!bpm) return "No Data";

    if (bpm < 40 || bpm > 130) return "CRITICAL";
    if (bpm < 60 || bpm > 100) return "WARNING";

    return "NORMAL";
}

// 🎨 GRID
function grid() {

    ctx.strokeStyle = "#003344";

    for (let i = 0; i < canvas.width; i += 20) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
    }

    for (let j = 0; j < canvas.height; j += 20) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(canvas.width, j);
        ctx.stroke();
    }
}

// 📊 SPECTRUM
function drawSpectrum() {

    if (!sctx) return;

    sctx.fillStyle = "black";
    sctx.fillRect(0, 0, spec.width, spec.height);

    sctx.fillStyle = "#00e6ff";

    let data = signal.slice(-50);

    for (let i = 0; i < data.length; i++) {
        let h = Math.abs(data[i]) * 1.5;
        sctx.fillRect(i * 10, spec.height - h, 6, h);
    }
}

// 🫀 DRAW LOOP
function draw() {

    if (!running) return;

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    grid();

    let value = ecg(x);

    signal.push(value);

    if (signal.length > canvas.width) {
        signal.shift();
    }

    ctx.beginPath();
    ctx.strokeStyle = "#00ff66";

    for (let i = 0; i < signal.length; i++) {
        ctx.lineTo(i, canvas.height / 2 - signal[i]);
    }

    ctx.stroke();

    x++;

    // 📊 CALCULATIONS
    let risk = riskIndex(bpm);
    let rawAlarm = alarmState(bpm);

    // 🧠 STABILITY FIX
    if (rawAlarm !== lastStableAlarm) {
        changeTimer++;
        if (changeTimer > 20) {
            lastStableAlarm = rawAlarm;
            changeTimer = 0;
        }
    } else {
        changeTimer = 0;
    }

    let alarm = lastStableAlarm;

    // 📊 UI UPDATE
    document.getElementById("bpm").innerText = "BPM: " + (bpm || "--");
    document.getElementById("risk").innerText = "Risk Index: " + risk;

    let alarmEl = document.getElementById("alarm");
    alarmEl.innerText = "Alarm: " + alarm;

    if (alarm === "CRITICAL") {
        alarmEl.style.color = "red";
    } 
    else if (alarm === "WARNING") {
        alarmEl.style.color = "orange";
    } 
    else {
        alarmEl.style.color = "#00ff88";
    }

    // 🔊 SOUND UPDATE
    if (alarm !== currentAlarm) {
        startAlarmLoop(alarm);
    }

    drawSpectrum();

    requestAnimationFrame(draw);
}

// ▶️ CONTROLS
function toggle() {
    running = !running;

    if (running) {
        audioCtx.resume();
        startAlarmLoop("NORMAL");
        draw();
    } else {
        if (alarmInterval) clearInterval(alarmInterval);
    }
}

// 👤 SWITCH PATIENT
function switchPatient() {
    signal = [];
    bpm = 0;
}
