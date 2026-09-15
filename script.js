const STORAGE_KEY = "page-buddy-state-v1";
const MAX_IMAGE_DIM = 640;

const el = {
  intro: document.getElementById("intro"),
  fileInput: document.getElementById("file-input"),
  calibrate: document.getElementById("calibrate"),
  calibrateStep: document.getElementById("calibrate-step"),
  calibrateStage: document.getElementById("calibrate-stage"),
  calibrateImg: document.getElementById("calibrate-img"),
  calibrateMarks: document.getElementById("calibrate-marks"),
  calibrateReset: document.getElementById("calibrate-reset"),
  calibrateConfirm: document.getElementById("calibrate-confirm"),
  mascot: document.getElementById("mascot"),
  mascotImg: document.getElementById("mascot-img"),
  eyeL: document.getElementById("eye-l"),
  eyeR: document.getElementById("eye-r"),
  settingsToggle: document.getElementById("settings-toggle"),
  settings: document.getElementById("settings"),
  sizeRange: document.getElementById("size-range"),
  eyeRange: document.getElementById("eye-range"),
  cornerSelect: document.getElementById("corner-select"),
  recalibrateBtn: document.getElementById("recalibrate-btn"),
  newImageBtn: document.getElementById("new-image-btn"),
};

let state = loadState();
let pendingImage = null;
let calibMarks = [];
let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage full or unavailable, ignore */
  }
}

function readAndResizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_IMAGE_DIM || height > MAX_IMAGE_DIM) {
          const scale = MAX_IMAGE_DIM / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve({ dataUrl: canvas.toDataURL("image/png"), width, height });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

el.fileInput.addEventListener("change", async () => {
  const file = el.fileInput.files[0];
  if (!file) return;
  pendingImage = await readAndResizeImage(file);
  startCalibration();
});

function startCalibration() {
  el.intro.hidden = true;
  el.mascot.hidden = true;
  el.settingsToggle.hidden = true;
  el.settings.hidden = true;
  el.calibrate.hidden = false;
  el.calibrateImg.src = pendingImage.dataUrl;
  calibMarks = [];
  renderCalibMarks();
  el.calibrateStep.innerHTML = "Click the <strong>left eye</strong> spot.";
  el.calibrateConfirm.hidden = true;
}

function renderCalibMarks() {
  el.calibrateMarks.innerHTML = "";
  calibMarks.forEach((m) => {
    const dot = document.createElement("div");
    dot.className = "calib-mark";
    dot.style.left = m.xPct + "%";
    dot.style.top = m.yPct + "%";
    el.calibrateMarks.appendChild(dot);
  });
}

el.calibrateStage.addEventListener("click", (e) => {
  if (calibMarks.length >= 2) return;
  const rect = el.calibrateImg.getBoundingClientRect();
  if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return;
  const xPct = ((e.clientX - rect.left) / rect.width) * 100;
  const yPct = ((e.clientY - rect.top) / rect.height) * 100;
  calibMarks.push({ xPct, yPct });
  renderCalibMarks();
  if (calibMarks.length === 1) {
    el.calibrateStep.innerHTML = "Now the <strong>right eye</strong> spot.";
  } else {
    el.calibrateStep.innerHTML = "Good — confirm, or start over.";
    el.calibrateConfirm.hidden = false;
  }
});

el.calibrateReset.addEventListener("click", () => {
  calibMarks = [];
  renderCalibMarks();
  el.calibrateStep.innerHTML = "Click the <strong>left eye</strong> spot.";
  el.calibrateConfirm.hidden = true;
});

el.calibrateConfirm.addEventListener("click", () => {
  state = {
    imageDataUrl: pendingImage.dataUrl,
    width: pendingImage.width,
    height: pendingImage.height,
    eyeL: calibMarks[0],
    eyeR: calibMarks[1],
    size: state?.size || 140,
    eyeSize: state?.eyeSize || 16,
    corner: state?.corner || "bottom-right",
  };
  saveState();
  renderMascot();
});

function renderMascot() {
  if (!state) return;
  el.intro.hidden = true;
  el.calibrate.hidden = true;
  el.mascot.hidden = false;
  el.settingsToggle.hidden = false;

  el.mascotImg.src = state.imageDataUrl;
  const aspect = state.height / state.width;
  el.mascot.style.width = state.size + "px";
  el.mascot.style.height = Math.round(state.size * aspect) + "px";
  el.mascot.className = "corner-" + state.corner;

  positionEye(el.eyeL, state.eyeL);
  positionEye(el.eyeR, state.eyeR);
  setEyeSize(state.eyeSize);

  el.sizeRange.value = state.size;
  el.eyeRange.value = state.eyeSize;
  el.cornerSelect.value = state.corner;
}

function positionEye(node, pos) {
  node.style.left = pos.xPct + "%";
  node.style.top = pos.yPct + "%";
}

function setEyeSize(pct) {
  [el.eyeL, el.eyeR].forEach((eye) => {
    eye.style.width = pct + "%";
    eye.style.height = pct + "%";
    eye.style.margin = `-${pct / 2}% 0 0 -${pct / 2}%`;
  });
}

el.recalibrateBtn.addEventListener("click", () => {
  pendingImage = { dataUrl: state.imageDataUrl, width: state.width, height: state.height };
  startCalibration();
});

el.newImageBtn.addEventListener("click", () => {
  state = null;
  localStorage.removeItem(STORAGE_KEY);
  el.mascot.hidden = true;
  el.settingsToggle.hidden = true;
  el.settings.hidden = true;
  el.fileInput.value = "";
  el.intro.hidden = false;
});

el.settingsToggle.addEventListener("click", () => {
  el.settings.hidden = !el.settings.hidden;
});

el.sizeRange.addEventListener("input", () => {
  state.size = Number(el.sizeRange.value);
  renderMascot();
  saveState();
});

el.eyeRange.addEventListener("input", () => {
  state.eyeSize = Number(el.eyeRange.value);
  setEyeSize(state.eyeSize);
  saveState();
});

el.cornerSelect.addEventListener("change", () => {
  state.corner = el.cornerSelect.value;
  el.mascot.className = "corner-" + state.corner;
  saveState();
});

window.addEventListener("mousemove", (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});
window.addEventListener(
  "touchmove",
  (e) => {
    if (e.touches[0]) {
      mouse.x = e.touches[0].clientX;
      mouse.y = e.touches[0].clientY;
    }
  },
  { passive: true }
);

let currentTilt = 0;

function trackLoop() {
  if (!el.mascot.hidden) {
    [el.eyeL, el.eyeR].forEach((eye) => {
      const rect = eye.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = mouse.x - cx;
      const dy = mouse.y - cy;
      const angle = Math.atan2(dy, dx);
      const maxOffset = rect.width * 0.24;
      const dist = Math.min(Math.hypot(dx, dy) * 0.06, maxOffset);
      const pupil = eye.querySelector(".pupil");
      pupil.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`;
    });

    const mrect = el.mascot.getBoundingClientRect();
    const mcx = mrect.left + mrect.width / 2;
    const targetTilt = Math.max(-8, Math.min(8, (mouse.x - mcx) / 22));
    currentTilt += (targetTilt - currentTilt) * 0.12;
    el.mascot.style.transform = `rotate(${currentTilt.toFixed(2)}deg)`;
  }
  requestAnimationFrame(trackLoop);
}
requestAnimationFrame(trackLoop);

function blink() {
  if (el.mascot.hidden) return;
  el.mascot.classList.add("blinking");
  setTimeout(() => el.mascot.classList.remove("blinking"), 130);
}

function scheduleBlink() {
  const delay = 2200 + Math.random() * 3800;
  setTimeout(() => {
    blink();
    scheduleBlink();
  }, delay);
}
scheduleBlink();

el.mascot.addEventListener("click", () => {
  blink();
  el.mascot.classList.remove("poked");
  void el.mascot.offsetWidth;
  el.mascot.classList.add("poked");
});
el.mascot.addEventListener("animationend", () => el.mascot.classList.remove("poked"));

if (state && state.imageDataUrl && state.eyeL && state.eyeR) {
  renderMascot();
}
