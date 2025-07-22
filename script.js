const expectedCodes = {
  "control_uno": { id: "Control_1", label: "Control 1" },
  "control_deux": { id: "Control_2", label: "Control 2" },
  "control_drei": { id: "Control_3", label: "Control 3" },
  "control_fyra": { id: "Control_4", label: "Control 4" },
  "control_cinque": { id: "Control_5", label: "Control 5" }
};

function loadProgress() {
  for (const code in expectedCodes) {
    const { id } = expectedCodes[code];
    const isChecked = localStorage.getItem(id) === "true";
    if (isChecked) {
      document.getElementById(id).checked = true;
    }
  }
}

function markComplete(code) {
  const entry = expectedCodes[code];
  if (!entry) {
    document.getElementById("status").textContent = "Invalid QR code.";
    return;
  }

  document.getElementById(entry.id).checked = true;
  localStorage.setItem(entry.id, "true");
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
    if (devices && devices.length) {
      document.getElementById("scanner").style.display = "block";

      scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        qrCodeMessage => {
          markComplete(qrCodeMessage);
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
  document.getElementById("scan-btn").addEventListener("click", startScanner);
});
