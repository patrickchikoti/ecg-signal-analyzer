const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const spec = document.getElementById("spectrum");
const sctx = spec.getContext("2d");

canvas.width = 520;
canvas.height = 220;

spec.width = 520;
spec.height = 120;

let running = false;
let x = 0;
let signal = [];
let bpm = 75;

let currentState = "NORMAL";

// 🔊 SOUND (WORKING VERSION)
let audioCtx = null;
let intervalSound = null;

function startSound(state) {

    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (intervalSound) clearInterval(intervalSound);

    let speed = 800;
    if (state === "WARNING") speed = 500;
    if (state === "CRITICAL") speed = 250;

    intervalSound = setInterval(() => {

        let osc = audioCtx.createOscillator();
        let gain = audioCtx.createGain();

        osc.type = "sine";
        osc.frequency.value = 600;

        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);

    }, speed);
}

// ECG SIGNAL
function ecg(i) {

    let cycle = i % 120;

    if (i % 200 === 0) {
        let arr = [50, 75, 110, 140];
        bpm = arr[Math.floor(Math.random() * arr.length)];
    }

    if (cycle < 10) return 10;
    if (cycle < 20) return -10;
    if (cycle < 30) return 80;
    if (cycle < 40) return -15;

    return 15 + (Math.random() * 6 - 3);
}

// RISK
function riskIndex(bpm) {
    let score = 0;
    if (bpm < 60) score += 40;
    if (bpm > 100) score += 40;
    if (bpm < 40 || bpm > 130) score += 30;
    return Math.min(100, score);
}

// ALARM
function alarmState(bpm) {
    if (bpm < 40 || bpm > 130) return "CRITICAL";
    if (bpm < 60 || bpm > 100) return "WARNING";
    return "NORMAL";
}

// GRID
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

// SPECTRUM
function drawSpectrum() {

    sctx.fillStyle = "black";
    sctx.fillRect(0, 0, spec.width, spec.height);

    sctx.fillStyle = "#00e6ff";

    let data = signal.slice(-60);

    for (let i = 0; i < data.length; i++) {
        let h = Math.abs(data[i]) * 1.2;
        sctx.fillRect(i * 8, spec.height - h, 5, h);
    }
}

// DRAW
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
    let alarm = alarmState(bpm);

    document.getElementById("bpm").innerText = "BPM: " + bpm;
    document.getElementById("risk").innerText = "Risk Index: " + risk;

    let alarmEl = document.getElementById("alarm");
    alarmEl.innerText = "Alarm: " + alarm;

    // 🎨 COLORS
    if (alarm === "NORMAL") {
        alarmEl.style.color = "lime";
    } else if (alarm === "WARNING") {
        alarmEl.style.color = "yellow";
    } else {
        alarmEl.style.color = "red";
    }

    // 🔊 SOUND CHANGE
    if (alarm !== currentState) {
        currentState = alarm;
        startSound(alarm);
    }

    drawSpectrum();

    requestAnimationFrame(draw);
}

// START/STOP
function toggle() {

    running = !running;

    if (running) {
        startSound(currentState);
        draw();
    } else {
        clearInterval(intervalSound);
    }
}

// PDF EXPORT (WORKING)
function exportPDF() {

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    let risk = riskIndex(bpm);
    let alarm = alarmState(bpm);
    let now = new Date();

    doc.setFontSize(16);
    doc.text("HOSPITAL ECG BIOMEDICAL REPORT", 20, 20);

    doc.setFontSize(11);

    doc.text("Patient Name: xxxxxxxxx", 20, 40);
    doc.text("Hospital Name: xxxxxxxxx", 20, 50);
    doc.text("Medical Doctor: xxxxxxxxx", 20, 60);
    doc.text("Biomedical Engineer: xxxxxxxxx", 20, 70);

    doc.text("Department: ICU", 20, 85);
    doc.text("Bed Number: xxxx", 20, 95);

    doc.text("Heart Rate (BPM): " + bpm, 20, 110);
    doc.text("Risk Index: " + risk + "/100", 20, 120);
    doc.text("Condition: " + alarm, 20, 130);

    let action =
        alarm === "CRITICAL"
            ? "IMMEDIATE ICU INTERVENTION REQUIRED"
            : alarm === "WARNING"
            ? "Close monitoring required"
            : "Patient stable";

    doc.text("Immediate Action: " + action, 20, 150);

    doc.text("Date: " + now.toLocaleDateString(), 20, 170);
    doc.text("Time: " + now.toLocaleTimeString(), 20, 180);

    doc.save("ECG_Report.pdf");
}
