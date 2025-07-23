const scannerTimeoutDuration = 20000; // 20 seconds
const homeCooldownExtra = 10000; // 10 seconds extra
const homeCooldown = scannerTimeoutDuration + homeCooldownExtra;

const expectedCodes = {
  "start": { label: "Start" },
  "control_uno": { id: "Control_1", label: "Control 1" },
  "control_deux": { id: "Control_2", label: "Control 2" },
  "control_drei": { id: "Control_3", label: "Control 3" },
  "control_fyra": { id: "Control_4", label: "Control 4" },
  "control_cinque": { id: "Control_5", label: "Control 5" },
  "home": { label: "Home" },
  "finish": { label: "Finish" }
};

let scanner = null;
let scannerIsRunning = false;
let scanTimeout = null;

let lastScanTime = null;
let scannedCodes = new Set();
let lastHomeScanTime = 0;

function formatTime(ms) {
  const date = new Date(ms);
  return date.toTimeString().split(" ")[0];
}

function formatSplit(ms) {
  const s = Math.floor(ms / 1000);
  const h = String(Math.floor(s / 3600)).padStart(2, '0');
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${h}:${m}:${sec}`;
}

function addToLog(label, timestamp) {
  const table = document.getElementById("log-table").querySelector("tbody");
  const row = document.createElement("tr");

  const labelCell = document.createElement("td");
  const timeCell = document.createElement("td");
  const splitCell = document.createElement("td");

  labelCell.textContent = label;
  timeCell.textContent = formatTime(timestamp);

  const split = lastScanTime ? formatSplit(timestamp - lastScanTime) : "--:--:--";
  splitCell.textContent = split;

  lastScanTime = timestamp;

  row.appendChild(labelCell);
  row.appendChild(timeCell);
  row.appendChild(splitCell);
  table.appendChild(row);
}

function markComplete(code) {
  const entry = expectedCodes[code];
  if (!entry) {
    document.getElementById("status").textContent = "❌ Invalid QR code.";
    return;
  }

  const now = Date.now();

  if (code === "home") {
    if (now - lastHomeScanTime < homeCooldown) {
      document.getElementById("status").textContent = "⏳ Home scanned too recently.";
      return;
    }
    lastHomeScanTime = now;
    addToLog(entry.label, now);
    document.getElementById("status").textContent = `Home logged.`;
    return;
  }

  if (scannedCodes.has(code)) {
    document.getElementById("status").textContent = `✔️ ${entry.label} already scanned.`;
    return;
  }

  scannedCodes.add(code);
  addToLog(entry.label, now);
  document.getElementById("status").textContent = `🚩 ${entry.label} found.`;

  if (entry.id) {
    const checkbox = document.getElementById(entry.id);
    if (checkbox) {
      checkbox.checked = true;
      localStorage.setItem(entry.id, "true");
    }
  }
}

function loadProgress() {
  for (const code in expectedCodes) {
    const entry = expectedCodes[code];
    if (entry.id) {
      const isChecked = localStorage.getItem(entry.id) === "true";
      if (isChecked) {
        document.getElementById(entry.id).checked = true;
      }
    }
  }
}

function startScanner() {
  if (scannerIsRunning) return;
  document.getElementById("scanner").innerHTML = ""; // reset container


  scanner = new Html5Qrcode("scanner");
  Html5Qrcode.getCameras().then(devices => {
    if (devices && devices.length) {
      document.getElementById("scanner").style.display = "block";
      scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        qrCodeMessage => {
          markComplete(qrCodeMessage);
        },
        errorMessage => {
          // ignore
        }
      ).then(() => {
        scannerIsRunning = true;
        document.getElementById("scanner").style.display = "block";
        document.getElementById("status").textContent = "Scanning...";

        scanTimeout = setTimeout(() => {
          stopScanner();
          document.getElementById("status").textContent = "Scanner stopped after timeout.";
        }, scannerTimeoutDuration);
      });
    } else {
      document.getElementById("status").textContent = "No camera found.";
    }
  }).catch(err => {
    document.getElementById("status").textContent = "Camera access error.";
  });
}

function stopScanner() {
  if (scannerIsRunning && scanner) {
    scanner.stop().then(() => {
      scanner.clear();
      scannerIsRunning = false;
      scanner = null;
      document.getElementById("scanner").style.display = "none";
      if (scanTimeout) clearTimeout(scanTimeout);
    });
  }
}

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("scan-btn").addEventListener("click", startScanner);
  loadProgress();
});
