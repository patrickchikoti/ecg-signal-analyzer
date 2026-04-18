
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
let spectrumData = [];

let bpm = 0;
let lastPeak = Date.now();

let currentState = "NORMAL";

// ================= AUDIO (CONTINUOUS BEEP) =================
let audioCtx;
let beepInterval = null;

function startBeep(state) {

    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (beepInterval) clearInterval(beepInterval);

    let freq = 500;

    if (state === "WARNING") freq = 800;
    if (state === "CRITICAL") freq = 1100;

    beepInterval = setInterval(() => {

        let osc = audioCtx.createOscillator();
        let gain = audioCtx.createGain();

        osc.type = "sine";
        osc.frequency.value = freq;

        gain.gain.value = 0.05;

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);

    }, state === "CRITICAL" ? 300 : 600);
}

// ================= ECG SIGNAL =================
function ecg(i) {

    let cycle = i % 120;

    let value = 0;

    if (cycle < 10) value = 10;
    else if (cycle < 20) value = -10;

    else if (cycle < 30) {

        value = 80;

        let now = Date.now();
        let diff = now - lastPeak;

        if (diff > 300 && diff < 2000) {
            bpm = Math.round(60000 / diff);
        }

        lastPeak = now;
    }

    else if (cycle < 40) value = -15;
    else value = 15;

    return value + (Math.random() * 6 - 3);
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

    let data = signal.slice(-60);

    for (let i = 0; i < data.length; i++) {
        let h = Math.abs(data[i]) * 1.2;
        sctx.fillRect(i * 8, spec.height - h, 5, h);
    }
}

// ================= DRAW ECG =================
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

    document.getElementById("bpm").innerText = "BPM: " + (bpm || "--");
    document.getElementById("risk").innerText = "Risk Index: " + risk;
    document.getElementById("alarm").innerText = "Alarm: " + alarm;

    // update sound continuously when state changes
    if (alarm !== currentState) {
        currentState = alarm;
        startBeep(alarm);
    }

    drawSpectrum();

    requestAnimationFrame(draw);
}

// ================= CONTROLS =================
function toggle() {

    running = !running;

    if (running) {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        draw();
    }
}

// ================= PDF =================
function exportPDF() {

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    let risk = riskIndex(bpm);
    let alarm = alarmState(bpm);

    let now = new Date();

    doc.setFontSize(16);
    doc.text("HOSPITAL ECG REPORT", 20, 20);

    doc.setFontSize(11);

    doc.text("Patient: xxxxxxxxx", 20, 40);
    doc.text("Hospital: xxxxxxxxx", 20, 50);
    doc.text("Doctor: xxxxxxxxx", 20, 60);
    doc.text("Technician: xxxxxxxxx", 20, 70);

    doc.text("Department: ICU", 20, 85);
    doc.text("Bed: xxxx", 20, 95);

    doc.text("BPM: " + (bpm || "N/A"), 20, 110);
    doc.text("Risk: " + risk, 20, 120);
    doc.text("Condition: " + alarm, 20, 130);

    let action =
        alarm === "CRITICAL"
            ? "IMMEDIATE ICU ACTION REQUIRED"
            : alarm === "WARNING"
            ? "Close monitoring required"
            : "Patient stable";

    doc.text("Action: " + action, 20, 150);

    doc.text("Date: " + now.toLocaleDateString(), 20, 170);
    doc.text("Time: " + now.toLocaleTimeString(), 20, 180);

    doc.save("ECG_Report.pdf");
}
