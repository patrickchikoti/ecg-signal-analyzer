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

// ================= STATE =================
let running = false;
let x = 0;

let signal = [];
let bpm = 0;
let lastPeak = Date.now();

let history = [];

// stability system (1 minute behavior)
let lastStableAlarm = "NORMAL";
let changeCounter = 0;

// ================= AUDIO (REAL PHONE RINGTONE STYLE) =================
let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let toneLoop = null;

function playRingTone(freq1, freq2) {

    let t = audioCtx.currentTime;

    let osc1 = audioCtx.createOscillator();
    let gain1 = audioCtx.createGain();

    osc1.type = "sine";
    osc1.frequency.value = freq1;

    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);

    gain1.gain.setValueAtTime(0.0001, t);
    gain1.gain.exponentialRampToValueAtTime(0.07, t + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);

    osc1.start(t);
    osc1.stop(t + 0.3);

    let osc2 = audioCtx.createOscillator();
    let gain2 = audioCtx.createGain();

    osc2.type = "sine";
    osc2.frequency.value = freq2;

    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);

    gain2.gain.setValueAtTime(0.0001, t + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.05, t + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);

    osc2.start(t + 0.15);
    osc2.stop(t + 0.45);
}

// ringtone loop system
function startSound(state) {

    if (toneLoop) clearInterval(toneLoop);

    let freq1 = 520;
    let freq2 = 660;
    let speed = 2000;

    if (state === "WARNING") {
        freq1 = 580;
        freq2 = 720;
        speed = 1600;
    }

    if (state === "CRITICAL") {
        freq1 = 650;
        freq2 = 820;
        speed = 1200;
    }

    toneLoop = setInterval(() => {
        playRingTone(freq1, freq2);
    }, speed);
}

// ================= ECG =================
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

// ================= REAL MEDICAL PDF =================
function exportPDF() {

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    let risk = riskIndex(bpm);
    let alarm = lastStableAlarm;

    let now = new Date();

    // HEADER
    doc.setFontSize(16);
    doc.text("HOSPITAL ECG DIAGNOSTIC REPORT", 20, 20);

    doc.setFontSize(11);

    // PATIENT SECTION
    doc.text("PATIENT INFORMATION", 20, 40);
    doc.text("Name: xxxxxxxxxxxxxxxxx", 20, 50);
    doc.text("Age: xx", 20, 58);
    doc.text("Sex: xx", 20, 66);
    doc.text("Hospital: xxxxxxxxxxxxxxxxx", 20, 74);
    doc.text("Department: ICU", 20, 82);
    doc.text("Bed Number: xxxx", 20, 90);

    // MEDICAL TEAM
    doc.text("MEDICAL TEAM", 20, 105);
    doc.text("Doctor: xxxxxxxxxxxxxxxxx", 20, 113);
    doc.text("Biomedical Technician: xxxxxxxxxxxxx", 20, 121);

    // VITAL SIGNS
    doc.text("CLINICAL DATA", 20, 136);
    doc.text(`Heart Rate (BPM): ${bpm || "N/A"}`, 20, 144);
    doc.text(`Risk Index: ${risk}/100`, 20, 152);
    doc.text(`Condition: ${alarm}`, 20, 160);

    // INTERPRETATION
    doc.text("INTERPRETATION", 20, 175);

    let interpretation =
        alarm === "NORMAL"
            ? "Patient is stable. No immediate intervention required."
            : alarm === "WARNING"
            ? "Abnormal rhythm detected. Continuous monitoring recommended."
            : "CRITICAL CONDITION: Immediate medical intervention required in ICU.";

    doc.text(interpretation, 20, 183);

    // ACTION
    doc.text("IMMEDIATE ACTION", 20, 198);
    doc.text(
        alarm === "CRITICAL"
            ? "Activate emergency response protocol."
            : alarm === "WARNING"
            ? "Increase monitoring frequency and reassess."
            : "Continue routine monitoring.",
        20,
        206
    );

    // FOOTER
    doc.text(`Date: ${now.toLocaleDateString()}`, 20, 220);
    doc.text(`Time: ${now.toLocaleTimeString()}`, 20, 228);

    doc.text("Generated by ECG Biomedical Analyzer System", 20, 240);

    doc.save("ECG_Patient_Report.pdf");
}

// ================= DRAW =================
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
    let rawAlarm = alarmState(bpm);

    // 1-minute stability (~180 frames)
    if (rawAlarm !== lastStableAlarm) {
        changeCounter++;
        if (changeCounter > 180) {
            lastStableAlarm = rawAlarm;
            changeCounter = 0;
        }
    } else {
        changeCounter = 0;
    }

    let alarm = lastStableAlarm;

    history.push({ bpm, risk, alarm });
    if (history.length > 200) history.shift();

    document.getElementById("bpm").innerText = "BPM: " + (bpm || "--");
    document.getElementById("risk").innerText = "Risk Index: " + risk;

    let alarmEl = document.getElementById("alarm");
    alarmEl.innerText = "Alarm: " + alarm;

    alarmEl.style.color =
        alarm === "CRITICAL" ? "red" :
        alarm === "WARNING" ? "orange" : "#00ff88";

    startSound(alarm);

    drawSpectrum();

    requestAnimationFrame(draw);
}

// ================= CONTROLS =================
function toggle() {
    running = !running;
    if (running) {
        audioCtx.resume();
        draw();
    } else {
        clearInterval(toneLoop);
    }
}

function switchPatient() {
    signal = [];
    bpm = 0;
    history = [];
}
