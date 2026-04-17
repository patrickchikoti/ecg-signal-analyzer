
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

// 🔊 SOUND ENGINE (SOFT + CHEERFUL)
let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let alarmInterval = null;

let currentAlarm = "NORMAL";
let lastStableAlarm = "NORMAL";
let changeTimer = 0;

// 🎵 SOFT SOUND
function playTone(freq, duration = 0.08) {

    let osc = audioCtx.createOscillator();
    let gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.frequency.value = freq;
    osc.type = "triangle";

    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, audioCtx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

// 🔁 CONTINUOUS DOUBLE BEEP
function startAlarmLoop(state) {

    if (alarmInterval) clearInterval(alarmInterval);

    currentAlarm = state;

    let speed, freq;

    if (state === "CRITICAL") {
        speed = 600;
        freq = 950;
    } 
    else if (state === "WARNING") {
        speed = 900;
        freq = 750;
    } 
    else {
        speed = 1400;
        freq = 600;
    }

    alarmInterval = setInterval(() => {
        playTone(freq);
        setTimeout(() => playTone(freq * 1.1), 120);
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
        if (changeTimer > 15) {
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

    // 🎨 COLOR ALERT
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

    // 📊 DRAW SPECTRUM
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
