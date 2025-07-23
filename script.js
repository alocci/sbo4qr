const scannerTimeoutDuration = 10000;
let scanner = null;
let scannerIsRunning = false;
let scanTimeout = null;

window.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded.");
  document.getElementById("scan-btn").addEventListener("click", startScanner);
});

function startScanner() {
  console.log("startScanner called");

  if (scannerIsRunning) return;

  const scannerElem = document.getElementById("scanner");
  scannerElem.innerHTML = "";
  scannerElem.style.display = "block";

  scanner = new Html5Qrcode("scanner");

  Html5Qrcode.getCameras().then(devices => {
    if (devices && devices.length) {
      const cameraId = devices[0].id;

      scanner.start(
        cameraId,
        { fps: 10, qrbox: 250 },
        qrCodeMessage => {
          console.log("QR code detected:", qrCodeMessage);
          document.getElementById("status").textContent = `Scanned: ${qrCodeMessage}`;
        },
        errorMessage => {
          console.warn("QR error:", errorMessage);
        }
      ).then(() => {
        scannerIsRunning = true;
        document.getElementById("status").textContent = "Scanning...";
        scanTimeout = setTimeout(() => {
          stopScanner();
          document.getElementById("status").textContent = "Scanner stopped after timeout.";
        }, scannerTimeoutDuration);
      }).catch(err => {
        console.error("Failed to start scanner:", err);
        document.getElementById("status").textContent = "Failed to start scanner.";
      });

    } else {
      document.getElementById("status").textContent = "No camera found.";
    }
  }).catch(err => {
    console.error("Camera error:", err);
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
      clearTimeout(scanTimeout);
    });
  }
}
