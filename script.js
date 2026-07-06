const expectedCodes = {
  "control_uno": { id: "Control_1", label: "Control 1" },
  "control_deux": { id: "Control_2", label: "Control 2" },
  "control_drei": { id: "Control_3", label: "Control 3" },
  "control_fyra": { id: "Control_4", label: "Control 4" },
  "control_cinque": { id: "Control_5", label: "Control 5" }
};

const STOAGE_KEY = "gameState";

let gameState = {
  controls: {
    Control_1: false,
    Control_2: false,
    Control_3: false,
    Control_4: false,
    Control_5: false
  }
};

function saveGame() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
}

function restoreGame() {
  for (const id in gameState.controls) {
    const checkbox = document.getElementById(id);

    if (checkbox) {
      checkbox.checked = gameState.controls(id);
    }
  }
}

function loadGame() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    document.getElementById("status").textContent = "No saved game found.";
    return;
  }

  gameState = JSON.parse(saved);
  restoreGame();
  document.getElementById("status").textContent = "Saved game restored.";
}

function resetGame() {
  if (!confirm("State a new game? This clears all saved progress.")) {
    return;
  }

  localStorage.removeItem(STORAGE_KEY);

  gameState = {
    controls: {
      Control_1: false,
      Control_2: false,
      Control_3: false,
      Control_4: false,
      Control_5: false
    }
  };

  restoreGame();
  document.getElementById("status").textContent = "New game started.";
}

function markComplete(code) {
  const entry = expectedCodes[code];
  if (!entry) {
    document.getElementById("status").textContent = "Invalid QR code.";
    return;
  }

  if (!gameState.controls[entry.id]) {
    gameState.controls[entry.id] = true;
    saveGame();
  }

  restoreGame();
  document.getElementById("status").textContent = `🚩 ${entry.label} found!`;
}

// Initialize
loadProgress();

let scanner = null;
let scannerIsRunning = false;
let scanTimeout = null;

function startScanner() {
  if (scannerIsRunning) return;

  scanner = new Html5Qrcode("scanner"); // create a new instance each time

  Html5Qrcode.getCameras().then(devices => {
    if (!devices || devices.length === 0) { // avoids type coercion
      document.getElementById("status").textContent = "No ccamera found.";
      return;
    } 
    
    document.getElementById("scanner").style.display = "block";

    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      qrCodeMessage => {
        markComplete(qrCodeMessage);
        stopScanner();
      },
      errorMessage => {
        // Ignore scan errors
      }
    ).then(() => {
      scannerIsRunning = true;
      document.getElementById("status").textContent = "Scanning...";

      // Auto-stop after 20 seconds
      scanTimeout = setTimeout(() => {
        stopScanner();
        document.getElementById("status").textContent = "Scanner stopped after 20 seconds.";
      }, 20000);
    });
  }).catch(err => {
    document.getElementById("status").textContent = "Camera access error.";
  });
}

function stopScanner() {
  if (!scannerIsRunning || !scanner) return; // Guard clausing
  scanner.stop().then(() => {
    scanner.clear(); // clear the scanner div
    scanner = null;
    scannerIsRunning = false;
    document.getElementById("scanner").style.display = "none";
    if (scanTimeout) clearTimeout(scanTimeout);
  }).catch(err => {
    console.error("Failed to stop scanner:", err);
  });
  }
}

// Button event listener
window.addEventListener("DOMContentLoaded", () => {
  restoreGame();
  document
    .getElementById("scan-btn")
    .addEventListener("click", startScanner);
  document
    .getElementById("resume-btn")
    .addEventListener("click", loadGame);
  document
    .getElementById("reset-btn")
    .addEventListener("click", resetGame);
});
