const expectedCodes = {
  "control_uno": "loc1",
  "control_deux": "loc2",
  "control_drei": "loc3",
  "control_fyra": "loc4",
  "control_cinque": "loc5"
};

function loadProgress() {
  for (const code in expectedCodes) {
    const id = expectedCodes[code];
    const isChecked = localStorage.getItem(id) === "true";
    if (isChecked) {
      document.getElementById(id).checked = true;
    }
  }
}

function markComplete(code) {
  const id = expectedCodes[code];
  if (!id) {
    document.getElementById("status").textContent = "Invalid QR code.";
    return;
  }

  document.getElementById(id).checked = true;
  localStorage.setItem(id, "true");
  document.getElementById("status").textContent = `✅ ${id} found!`;
}

loadProgress();

const scanner = new Html5Qrcode("scanner");

Html5Qrcode.getCameras().then(devices => {
  if (devices && devices.length) {
    scanner.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: 250
      },
      qrCodeMessage => {
        markComplete(qrCodeMessage);
      },
      errorMessage => {
        // ignore scan errors
      }
    );
  }
}).catch(err => {
  document.getElementById("status").textContent = "Camera access error.";
});
