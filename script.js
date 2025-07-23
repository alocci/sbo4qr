const scannerTimeoutDuration = 10000;
let scanner = null;
let scannerIsRunning = false;
let scanTimeout = null;

window.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded.");
  document.getElementById("scan-btn").addEventListener("click", startScanner);
});

function startScanner() {
  if (scannerIsRunning) return;

  const scannerElem = document.getElementById("scanner");
  scannerElem.innerHTML = ""; // Clear any previous scanner UI
  scannerElem.style.display = "block";

  scanner = new Html5Qrcode("scanner");

  scanner.start(
    { facingMode: "environment" }, // ✅ Best for mobile
    { fps: 10, qrbox: 250 },
    qrCodeMessage => {
      markComplete(qrCodeMessage);
    },
    errorMessage => {
      // You can log or ignore scan errors here
    }
  ).then(() => {
    scannerIsRunning = true;
    document.getElementById("status").textContent = "Scanning...";
    scanTimeout = setTimeout(() => {
      stopScanner();
      document.getElementById("status").textContent = "Scanner stopped after timeout.";
    }, scannerTimeoutDuration);
  }).catch(err => {
    console.error("Scanner error:", err);
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
