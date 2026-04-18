const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

canvas.width = 520;
canvas.height = 220;

// ================= STATE =================
let running = false;
let x = 0;

let signal = [];
let bpm = 0;
let lastPeak = Date.now();

let currentState = "NORMAL";

// ================= AUDIO =================
const alarmSound = document.getElementById("alarmSound");

// set default ringtone
function setRingtone() {
    alarmSound.src = document.getElementById("ringtoneSelect").value;
}
setRingtone();

document.getElementById("ringtoneSelect").addEventListener("change", setRingtone);

// unlock audio ONLY ON USER CLICK
function unlockAudio() {
    alarmSound.play().then(() => {
        alarmSound.pause();
        alarmSound.currentTime = 0;
    }).catch(() => {});
}

// ================= ECG =================
function ecg(i) {

    let cycle = i % 100;
    let value = Math.random() * 5;

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

    return value;
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

// ================= SOUND (ONLY ON CHANGE) =================
function playAlarm(state) {

    if (state === currentState) return; // 🔥 prevents spam sound

    currentState = state;

    alarmSound.pause();
    alarmSound.currentTime = 0;

    if (state === "NORMAL") {
        alarmSound.volume = 0.3;
    }

    if (state === "WARNING") {
        alarmSound.volume = 0.6;
    }

    if (state === "CRITICAL") {
        alarmSound.volume = 1.0;
    }

    alarmSound.play().catch(() => {});
}

// ================= DRAW =================
function draw() {

    if (!running) return;

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

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
    let alarm = alarmState(bpm);

    document.getElementById("bpm").innerText = "BPM: " + (bpm || "--");
    document.getElementById("risk").innerText = "Risk: " + risk;
    document.getElementById("alarm").innerText = "Alarm: " + alarm;

    playAlarm(alarm);

    requestAnimationFrame(draw);
}

// ================= CONTROLS =================
function toggle() {

    running = !running;

    if (running) {
        unlockAudio(); // 🔥 CRITICAL FIX
        draw();
    }
}

// ================= PDF (FIXED) =================
function exportPDF() {

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    let risk = riskIndex(bpm);
    let alarm = alarmState(bpm);

    doc.text("ECG REPORT", 20, 20);
    doc.text("BPM: " + bpm, 20, 40);
    doc.text("Risk: " + risk, 20, 50);
    doc.text("Condition: " + alarm, 20, 60);

    doc.save("ECG_Report.pdf");
}
