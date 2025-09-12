// Constants
const scannerTimeoutDuration = 20000; // 20 seconds
const cooldown = 5000; // 5 seconds 
const maxResetClicks = 3;

const expectedCodes = {
  "start": { id: "Start", label: "Start" },
  "control_uno": { id: "Control_1", label: "Control 1" },
  "control_deux": { id: "Control_2", label: "Control 2" },
  "control_drei": { id: "Control_3", label: "Control 3" },
  "control_fyra": { id: "Control_4", label: "Control 4" },
  "control_cinque": { id: "Control_5", label: "Control 5" },
  "home": { id: "Home", label: "Home" },
  "finish": { id: "Finish", label: "Finish" }
  // Even though start, home and finish don't need ids it's still good to have them for consistency
};

// Variables
let scanner = null;
let scannerIsRunning = false;
let scanTimeout = null;

let lastScanTime = null;
let scannedCodes = new Set(); // assigning a new instance of class Set()
let lastScanProcessedTime = 0;

let resetClicks = 0;

// Shorthand for changing textContent of elements
function setStatus(message) {
  const statusElement = document.getElementById("status");
  if (statusElement) statusElement.textContent = message;
}

// Format a timestamp (ms) to HH:MM:SS string (UTC)
function formatTime(ms) {
  const date = new Date(ms);
  return date.toTimeString().split(" ")[0];
}

// Format elapsed time as HH:MM:SS string
function formatSplit(ms) {
  const s = Math.floor(ms / 1000);
  const h = String(Math.floor(s / 3600)).padStart(2, '0');
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${h}:${m}:${sec}`;
}

// Calculate split time string between two timestamps
function calculateSplit(currentTimestamp, previousTimestamp) {
  if (!previousTimestamp || currentTimestamp <= previousTimestamp) {
    return "--:--:--";
  }
  return formatSplit(currentTimestamp - previousTimestamp);
}

// Create a <tr> element for the log table with label, time, and split
function createLogRow(label, timestamp, split) {
  const row = document.createElement("tr");

  const labelCell = document.createElement("td");
  const timeCell = document.createElement("td");
  const splitCell = document.createElement("td");

  labelCell.textContent = label;
  timeCell.textContent = formatTime(timestamp);
  splitCell.textContent = split;

  row.appendChild(labelCell);
  row.appendChild(timeCell);
  row.appendChild(splitCell);

  return row;
}

// Adding information to the table
function addToLog(label, timestamp) {
  const table = document.getElementById("log-table").querySelector("tbody");

  const split = calculateSplit(timestamp, lastScanTime);
  
  const row = createLogRow(label, timestamp, split);
  table.appendChild(row);

  lastScanTime = timestamp;
  
  // Save to local storage
  const existingLog = JSON.parse(localStorage.getItem("scanLog")) || [];
  existingLog.push({ label, timestamp });
  localStorage.setItem("scanLog", JSON.stringify(existingLog));
  localStorage.setItem("lastScanTime", timestamp.toString());
}

function calculateAndDisplayTotalTime() {
  const rows = Array.from(document.querySelectorAll("#log-table tbody tr"));
  const startRow = rows.find(row => row.cells[0].textContent === "Start");
  const finishRow = rows.find(row => row.cells[0].textContent === "Finish");

  if (!startRow || !finishRow) return; // easier to read an early return than wrapped conditional ?
  
  const startTime = new Date("1970-01-01T" + startRow.cells[1].textContent + "Z").getTime();
  const finishTime = new Date("1970-01-01T" + finishRow.cells[1].textContent + "Z").getTime();
  const totalTime = finishTime - startTime;
  
  const totalBox = document.getElementById("total-time");
  
  if (totalTime < 0) {
    totalBox.textContent = `❌ Finish scanned before Start`;
    totalBox.style.display = "block";
  } else {
    totalBox.textContent = `🏁 Total Time: ${formatSplit(totalTime)}`;
    totalBox.style.display = "block";
  }
}

function updateUI(code) {
  const entry = expectedCodes[code];
  if (!entry) {
    setStatus("❌ Invalid QR code.");
    return;
  }

  const now = Date.now();

  if (code === "home") {
    addToLog(entry.label, now);
    setStatus("🧺🍺 Home logged."); 
    return;
  }

  if (scannedCodes.has(code)) {
    setStatus(`✔️ ${entry.label} already scanned.`); // backticks allow interpolation
    return;
  }

  scannedCodes.add(code);
  addToLog(entry.label, now);
  setStatus(`🚩 ${entry.label} found!`);

  // Update checkbox
  if (entry.id) {
    const checkbox = document.getElementById(entry.id);
    if (checkbox) {
      checkbox.checked = true;
      localStorage.setItem(entry.id, "true");
    }
  }

  if (code === "finish") {
    calculateAndDisplayTotalTime();
  }
}

function stopScanner() {
  if (!scannerIsRunning || !scanner) return;

  scanner.stop().then(() => {
    scanner.clear();
    scannerIsRunning = false;
    scanner = null;
    document.getElementById("scanner").style.display = "none";
    if (scanTimeout) {
      clearTimeout(scanTimeout);
      scanTimeout = null;
    }
  })
  .catch(err => {
    console.error("Error stopping scanner:", err);
  });
}

// When Scan button clicked
function startScanner() {
  if (scannerIsRunning) return;

  document.getElementById("scanner").innerHTML = ""; // Clear old scanner view
  document.getElementById("scanner").style.display = "block";

  setStatus("Starting scanner...");

  scanner = new Html5Qrcode("scanner");

  Html5Qrcode.getCameras().then(devices => {
    if (!devices || devices.length === 0) {
      setStatus("No camera found.");
      return;
    }

    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      qrCodeMessage => {
        const now = Date.now();
        if (now - lastScanProcessedTime >= cooldown) {
          lastScanProcessedTime = now;
          updateUI(qrCodeMessage); 
        }
      },
      errorMessage => {
        console.warn("QR scan error:", errorMessage);
      }
    )
    .then(() => {
      scannerIsRunning = true;
      setStatus("Scanning...");

      scanTimeout = setTimeout(() => {
        stopScanner();
        setStatus("Scanner stopped after timeout.");
      }, scannerTimeoutDuration);
    })
    .catch(err => {
      console.error("Failed to start scanner:", err);
      setStatus("Failed to start scanner.");
    });
  })
  .catch(err => {
    console.error("Camera error:", err);
    setStatus("Camera access error.");
  });
}

function refresh() {
  resetClicks++;
  const btn = document.getElementById("reset-btn");

  if (resetClicks >= maxResetClicks) {
    // Reset progress
    for (const code in expectedCodes) {
      const entry = expectedCodes[code];
      if (entry.id) {
        localStorage.removeItem(entry.id);
        const checkbox = document.getElementById(entry.id);
        if (checkbox) checkbox.checked = false;
      }
    }

    // Reset scanned state
    scannedCodes.clear();
    lastScanTime = null;

    // Clear log table
    const tableBody = document.querySelector("#log-table tbody");
    tableBody.innerHTML = "";

    // Clear total time box
    const totalBox = document.getElementById("total-time");
    totalBox.textContent = "";
    totalBox.style.display = "none";

    // Clear status
    setStatus("");

    // Reset click counter
    resetClicks = 0;

    // Clear local storage
    localStorage.removeItem("scanLog");
    localStorage.removeItem("lastScanTime");
  }
}

function loadProgress() {
  for (const code in expectedCodes) {
    const entry = expectedCodes[code];
    if (entry.id) {
      const isChecked = localStorage.getItem(entry.id) === "true";
      if (isChecked) {
        const checkbox = document.getElementById(entry.id);
        if (checkbox) checkbox.checked = true;
        scannedCodes.add(code); 
      }
    }
  }
}

function loadLog() {
  const log = JSON.parse(localStorage.getItem("scanLog")) || [];
  const table = document.getElementById("log-table").querySelector("tbody");
  table.innerHTML = "";
  
  let prevTimestamp = null;
  const fragment = document.createDocumentFragment();

  log.forEach( (entry) => {
    const split = calculateSplit(entry.timestamp, prevTimestamp);
    const row = createLogRow(entry.label, entry.timestamp, split);
    fragment.appendChild(row);
    prevTimestamp = entry.timestamp;
  });
  
  tableBody.appendChild(fragment);
  lastScanTime = prevTimestamp;
}

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("scan-btn").addEventListener("click", startScanner);
  document.getElementById("reset-btn").addEventListener("click", refresh);
  loadProgress();
  loadLog();
});

