const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const specCanvas = document.getElementById("spectrum");
const sctx = specCanvas.getContext("2d");

canvas.width = 520;
canvas.height = 220;

specCanvas.width = 520;
specCanvas.height = 120;

let running = false;
let x = 0;
let currentPatient = 0;

const patients = [
    { noise: 6 },
    { noise: 15 },
    { noise: 20 }
];

let signal = [];
let bpm = 0;
let lastPeak = Date.now();

// 🫀 ECG SIGNAL
function ecg(i) {

    let p = patients[currentPatient];

    let noise = (Math.random() - 0.5) * p.noise;
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

// 📊 SIMPLE FFT (approx)
function computeFFT(data) {

    let N = data.length;
    let result = [];

    for (let k = 0; k < 50; k++) {

        let re = 0;
        let im = 0;

        for (let n = 0; n < N; n++) {
            let angle = (2 * Math.PI * k * n) / N;
            re += data[n] * Math.cos(angle);
            im -= data[n] * Math.sin(angle);
        }

        result.push(Math.sqrt(re * re + im * im));
    }

    return result;
}

// 🎨 DRAW FFT
function drawSpectrum() {

    let fft = computeFFT(signal.slice(-100));

    sctx.fillStyle = "black";
    sctx.fillRect(0, 0, specCanvas.width, specCanvas.height);

    sctx.fillStyle = "#00e6ff";

    fft.forEach((v, i) => {
        sctx.fillRect(i * 5, specCanvas.height - v / 10, 4, v / 10);
    });
}

// 🤖 AI SCORE (combined logic)
function aiScore() {

    let score = 0;

    if (bpm < 60 || bpm > 100) score += 40;

    let variability = Math.random() * 30;
    score += variability;

    let noise = patients[currentPatient].noise;
    score += noise;

    return Math.min(100, Math.round(score));
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

    drawSpectrum();

    x++;

    document.getElementById("bpm").innerText =
        "BPM: " + (bpm || "--");

    document.getElementById("risk").innerText =
        "Risk Score: " + aiScore();

	document.getElementById("ai").innerText =
		    "Anomaly Score: " + aiScore();

    requestAnimationFrame(draw);
}

// ▶️ CONTROLS
function toggle() {
    running = !running;
    if (running) draw();
}

function switchPatient() {
    currentPatient = (currentPatient + 1) % patients.length;
    signal = [];
    bpm = 0;
}