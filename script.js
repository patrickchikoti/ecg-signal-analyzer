
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const spec = document.getElementById("spectrum");
const sctx = spec.getContext("2d");

canvas.width = 520;
canvas.height = 220;

spec.width = 520;
spec.height = 120;

// ================= STATE =================
let running = false;
let x = 0;

let signal = [];
let bpm = 0;
let lastPeak = Date.now();

let history = [];

// alarm stability (1 minute rule)
let currentState = "NORMAL";
let changeCounter = 0;

// ================= AUDIO =================
const alarmSound = document.getElementById("alarmSound");

// ensure user interaction allows audio
function unlockAudio() {
    alarmSound.play().then(() => {
        alarmSound.pause();
        alarmSound.currentTime = 0;
    }).catch(() => {});
}

// ringtone behavior
function playRingtone(state) {

    if (!alarmSound) return;

    if (state === currentState && !alarmSound.paused) return;

    currentState = state;

    alarmSound.pause();
    alarmSound.currentTime = 0;

    if (state === "NORMAL") {
        alarmSound.playbackRate = 1.0;
        alarmSound.volume = 0.3;
    }

    if (state === "WARNING") {
        alarmSound.playbackRate = 1.05;
        alarmSound.volume = 0.6;
    }

    if (state === "CRITICAL") {
        alarmSound.playbackRate = 1.2;
        alarmSound.volume = 1.0;
    }

    alarmSound.play().catch(() => {});
}

// ================= ECG SIGNAL =================
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

// ================= RISK =================
function riskIndex(bpm) {

    if (!bpm) return 0;

    let score = 0;

    if (bpm < 60) score += 40;
    if (bpm > 100) score += 40;
    if (bpm < 40 || bpm > 130) score += 30;

    return Math.min(100, score);
}

// ================= ALARM =================
function alarmState(bpm) {

    if (!bpm) return "NORMAL";

    if (bpm < 40 || bpm > 130) return "CRITICAL";
    if (bpm < 60 || bpm > 100) return "WARNING";

    return "NORMAL";
}

// ================= GRID =================
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

// ================= SPECTRUM =================
function drawSpectrum() {

    sctx.fillStyle = "black";
    sctx.fillRect(0, 0, spec.width, spec.height);

    sctx.fillStyle = "#00e6ff";

    let data = signal.slice(-50);

    for (let i = 0; i < data.length; i++) {
        let h = Math.abs(data[i]) * 1.5;
        sctx.fillRect(i * 10, spec.height - h, 6, h);
    }
}

// ================= PDF EXPORT =================
function exportPDF() {

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    let risk = riskIndex(bpm);
    let alarm = currentState;

    let now = new Date();

    doc.setFontSize(16);
    doc.text("ECG BIOMEDICAL REPORT", 20, 20);

    doc.setFontSize(11);

    doc.text("PATIENT: xxxxxxxxx", 20, 40);
    doc.text("HOSPITAL: xxxxxxxxx", 20, 50);
    doc.text("DEPARTMENT: ICU", 20, 60);
    doc.text("BED NO: xxxx", 20, 70);
    doc.text("DOCTOR: xxxxxxxxx", 20, 80);
    doc.text("TECHNICIAN: xxxxxxxxx", 20, 90);

    doc.text("CLINICAL DATA", 20, 110);
    doc.text(`BPM: ${bpm || "N/A"}`, 20, 120);
    doc.text(`Risk Index: ${risk}`, 20, 130);
    doc.text(`Condition: ${alarm}`, 20, 140);

    let action =
        alarm === "NORMAL"
            ? "Stable condition"
            : alarm === "WARNING"
            ? "Monitor closely"
            : "URGENT ICU ACTION REQUIRED";

    doc.text("ACTION: " + action, 20, 160);

    doc.text(`DATE: ${now.toLocaleDateString()}`, 20, 180);
    doc.text(`TIME: ${now.toLocaleTimeString()}`, 20, 190);

    doc.save("ECG_Report.pdf");
}

// ================= LOOP =================
function draw() {

    if (!running) return;

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    grid();

    let value = ecg(x);
    signal.push(value);

    if (signal.length > canvas.width) signal.shift();

    ctx.beginPath();
    ctx.strokeStyle = "#00ff66";

    for (let i = 0; i < signal.length; i++) {
        ctx.lineTo(i, canvas.height / 2 - signal[i]);
    }

    ctx.stroke();

    x++;

    let risk = riskIndex(bpm);
    let raw = alarmState(bpm);

    // 1-minute stability (~180 frames)
    if (raw !== currentState) {
        changeCounter++;
        if (changeCounter > 180) {
            currentState = raw;
            changeCounter = 0;
        }
    } else {
        changeCounter = 0;
    }

    history.push({ bpm, risk, currentState });

    document.getElementById("bpm").innerText = "BPM: " + (bpm || "--");
    document.getElementById("risk").innerText = "Risk Index: " + risk;
    document.getElementById("alarm").innerText = "Alarm: " + currentState;

    // 🔊 SOUND
    playRingtone(currentState);

    drawSpectrum();

    requestAnimationFrame(draw);
}

// ================= CONTROLS =================
function toggle() {
    running = !running;

    if (running) {
        unlockAudio();
        draw();
    }
}

function switchPatient() {
    signal = [];
    bpm = 0;
    history = [];
}
