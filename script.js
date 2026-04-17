
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const spec = document.getElementById("spectrum");
const sctx = spec ? spec.getContext("2d") : null;

let running = false;
let x = 0;

let signal = [];
let bpm = 0;
let lastPeak = Date.now();

// 📊 ECG SIGNAL
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

// 📊 RISK INDEX (clinical logic)
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

// 🔊 SOUND SYSTEM
function playAlarm(state) {

    let audio = document.getElementById("alarmSound");

    if (state === "CRITICAL") {
        audio.play().catch(() => {});
    }
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
    let alarm = alarmState(bpm);

    // 📊 UI UPDATE
    document.getElementById("bpm").innerText = "BPM: " + (bpm || "--");

    document.getElementById("risk").innerText = "Risk Index: " + risk;

    let alarmEl = document.getElementById("alarm");
    alarmEl.innerText = "Alarm: " + alarm;

    // 🎨 COLOR ALERT (NO UI CHANGE, ONLY TEXT COLOR)
    if (alarm === "CRITICAL") {
        alarmEl.style.color = "red";
    } else if (alarm === "WARNING") {
        alarmEl.style.color = "orange";
    } else {
        alarmEl.style.color = "#00ff88";
    }

    // 🔊 SOUND TRIGGER
    playAlarm(alarm);

    requestAnimationFrame(draw);
}

// ▶️ CONTROLS
function toggle() {
    running = !running;
    if (running) draw();
}
