// Constants
const scannerTimeoutDuration = 20000; // 20 seconds
const cooldown = 1000; // 5 seconds 
// const maxResetClicks = 3;

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

const STORAGE_KEY = "gameState";

// Game state
function createNewGameState() {
  return {
    controls: {
      Control_1: false,
      Control_2: false,
      Control_3: false,
      Control_4: false,
      Control_5: false
    },

    log: [],
    lastScanTime: null,
    scannedCodes: []
  };
}

let gameState = createNewGameState();

// Scanner Variables
let scanner = null;
let scannerIsRunning = false;
let scanTimeout = null;
let lastScanProcessedTime = 0;

// let resetClicks = 0;

function saveGame() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
}

function loadGame() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    setStatus("No saved game found.");
    return;
  }

  try {
    const savedState = JSON.parse(saved);

    gameState = {
      ...createNewGameState(),
      ...savedState,
      controls: {
        ...createNewGameState().controls,
        ...savedState.controls
      }
    };

  } catch (error) {
    console.error("Could not load saved game:", error);
    gameState = createNewGameState();
    setStatus("Saved game was corrupted. Starting fresh.");
  }
}
// function loadGame() {
//   const saved = localStorage.getItem(STORAGE_KEY);

//   if (!saved) {
//     document.getElementById("status").textContent = "No saved game found.";
//     return;
//   }

//   gameState = JSON.parse(saved);
//   // restoreGame();
//   // document.getElementById("status").textContent = "Saved game restored.";

//   // Safety defaults for older saved versions
//   gameState.log = gameState.log || [];
//   gameState.lastScanTime = gameState.lastScanTime || null;
//   gameState.scannedCodes = gameState.scannedCodes || [];
// }

function resetGame() {
  if (!confirm("Start a new game? This clears all saved progress.")) {
    return;
  }

  gameState = createNewGameState();
  saveGame();

  lastScanTime = null;

  loadProgress();
  loadLog();

  const totalBox = document.getElementById("total-time");
  totalBox.textContent = "";
  totalBox.style.display = "none";

  setStatus("New game started.");
}

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
  const split = calculateSplit(timestamp, gameState.lastScanTime);
  const row = createLogRow(label, timestamp, split);
  table.appendChild(row);

  // Save to local storage
  gameState.log.push({ label, timestamp });
  gameState.lastScanTime = timestamp;
  saveGame();
}

// Problem here with finish being scanned first
// Now it will print the finish scanned before start
// But is that what we want? Change logic to accommodate
// Previous message was finish time recalculated, test this function as well
// How will you handle multiple finishes in the table and using the timestamps?
function calculateAndDisplayTotalTime() {
  const rows = Array.from(document.querySelectorAll("#log-table tbody tr"));
  const startRow = rows.find(row => row.cells[0].textContent === "Start");
  const finishRow = rows.filter(row => row.cells[0].textContent === "Finish").at(-1);

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

  // Events
  if (code === "home" || code === "finish" ) {
    addToLog(entry.label, now);
    if (code === "home") { 
      setStatus("🧺🍺 Home logged."); 
    }
    if (code === "finish") {
      calculateAndDisplayTotalTime();
      setStatus(`⏱ Total time recalculated.`); // backticks allow interpolation
    }
    return;
  }

  // Controls
  if (gameState.scannedCodes.includes(code)) {
    setStatus(`✔️ ${entry.label} already scanned.`);
    return;
  }

  gameState.scannedCodes.push(code);
  saveGame();
  
  // Update game state
  if (entry.id) {
    gameState.controls[entry.id] = true;
    
    const checkbox = document.getElementById(entry.id);
    if (checkbox) {
      checkbox.checked = true;
    }
  }

  addToLog(entry.label, now);
  setStatus(`🚩 ${entry.label} found!`);
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
          stopScanner(); // This is good for stopping after a successful scan process
          // But we may want to know if what we scanned was acceptable. Do later if necessary.
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

// function refresh() {
//   resetClicks++;
//   const btn = document.getElementById("reset-btn");

//   if (resetClicks >= maxResetClicks) {
//     // Reset progress
//     for (const code in expectedCodes) {
//       const entry = expectedCodes[code];
//       if (entry.id) {
//         localStorage.removeItem(entry.id);
//         const checkbox = document.getElementById(entry.id);
//         if (checkbox) checkbox.checked = false;
//       }
//     }

//     // Reset scanned state
//     scannedCodes.clear();
//     lastScanTime = null;

//     // Clear log table
//     const table = document.querySelector("#log-table tbody");
//     table.innerHTML = "";

//     // Clear total time box
//     const totalBox = document.getElementById("total-time");
//     totalBox.textContent = "";
//     totalBox.style.display = "none";

//     // Clear status
//     setStatus("");

//     // Reset click counter
//     resetClicks = 0;

//     // Clear local storage
//     localStorage.removeItem("scanLog");
//     localStorage.removeItem("lastScanTime");
//   }
// }

function loadProgress() {
  for (const id in gameState.controls) {
    const checkbox = document.getElementById(id);

    if (checkbox) {
      checkbox.checked = gameState.controls[id];
    }
  }
}

function loadLog() {
  const log = gameState.log;
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
  
  table.appendChild(fragment);
  gameState.lastScanTime = prevTimestamp;
}

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("scan-btn").addEventListener("click", startScanner);
  document.getElementById("reset-btn").addEventListener("click", resetGame);
  loadGame();
  loadProgress();
  loadLog();
});





