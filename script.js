const STORAGE_KEY = "aakocgrumpy-state-v1";
const MAX_IMAGE_DIM = 640;
const MAX_FILE_BYTES = 30 * 1024 * 1024;
const IDLE_MS = 3500;

const DEMO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 442 419">
  <path d="M373.606 0C380.037 0.211875 383.156 5.90563 384.881 11.455C397.156 50.95 404.168 93.7719 406.437 135.041C407.331 150.996 406.674 167 404.481 182.828C402.368 197.484 398.949 211.811 398.218 226.687C397.456 242.279 398.324 257.911 398.593 273.517C398.949 294.246 398.343 314.874 398.099 335.586C397.868 346.936 397.874 358.291 398.112 369.641C398.549 389.548 403.093 416.051 375.543 417.678C362.774 418.431 349.831 418.334 337.037 418.484C306.487 418.822 275.931 418.967 245.381 418.918L181.62 418.839C168.099 418.797 154.006 418.754 140.512 417.9C132.892 417.418 126.199 414.511 119.529 411.093C69.24 385.317 50.045 342.191 51.7325 287.204C52.2056 262.213 55.4331 236.721 47.6162 212.45C42.1531 195.486 33.1712 180.024 22.2124 166.032C14.5381 156.234 5.19744 149.989 1.15244 137.68C-1.17693 127.784 -0.187568 119.144 6.08118 110.785C11.2543 103.836 19.0318 99.2888 27.625 98.1906C53.4812 94.8194 74.0618 123.499 84.5868 143.388C103.902 179.89 102.202 220.417 98.5862 260.195C97.1987 275.457 96.9481 292.466 98.4324 307.728C101.165 328.866 110.191 343.13 126.814 355.973C127.646 319.093 128.978 289.637 139.436 253.643C145.242 233.658 154.577 209.769 157.867 189.98C160.824 172.194 161.551 150.144 163.231 131.74C165.719 103.947 170.657 76.4294 177.989 49.5069C180.699 39.5812 189.05 7.30875 197.481 3.015C198.799 2.34375 200.281 2.07813 201.676 2.65375C209.947 6.07063 223.074 43.975 227.106 54.0388C261.168 50.5719 309.218 50.05 342.818 54.4869C348.462 42.5581 363.218 6.48438 373.606 0Z" fill="#181818"/>
  <rect x="366.907" y="186.498" width="75" height="2" transform="rotate(-10.8253 366.907 186.498)" fill="#181818"/>
  <rect width="75" height="2" transform="matrix(0.982204 0.187815 0.187815 -0.982204 366.206 196.681)" fill="#181818"/>
  <rect x="366.206" y="190.717" width="75" height="2" fill="#181818"/>
  <rect width="75" height="2" transform="matrix(-0.982204 -0.187815 -0.187815 0.982204 202.504 186.498)" fill="#181818"/>
  <rect x="202.247" y="196.681" width="75" height="2" transform="rotate(169.175 202.247 196.681)" fill="#181818"/>
  <rect width="75" height="2" transform="matrix(-1 0 0 1 203.206 190.717)" fill="#181818"/>
</svg>`;
const DEMO_WIDTH = 442;
const DEMO_HEIGHT = 419;
const DEMO_EYE_L = { xPct: 52.49, yPct: 31.62 };
const DEMO_EYE_R = { xPct: 77.38, yPct: 31.62 };

const el = {
  toast: document.getElementById("toast"),
  intro: document.getElementById("intro"),
  dropzone: document.getElementById("dropzone"),
  fileInput: document.getElementById("file-input"),
  demoBtn: document.getElementById("demo-btn"),
  heroPreview: document.getElementById("hero-preview"),
  heroVisual: document.querySelector("#hero-preview .mini-visual"),
  heroImg: document.querySelector("#hero-preview .mini-img"),
  heroEyeL: document.getElementById("hero-eye-l"),
  heroEyeR: document.getElementById("hero-eye-r"),
  calibrate: document.getElementById("calibrate"),
  calibrateStep: document.getElementById("calibrate-step"),
  calibrateStage: document.getElementById("calibrate-stage"),
  calibrateImg: document.getElementById("calibrate-img"),
  calibrateMarks: document.getElementById("calibrate-marks"),
  calibrateReset: document.getElementById("calibrate-reset"),
  calibrateConfirm: document.getElementById("calibrate-confirm"),
  mascot: document.getElementById("mascot"),
  mascotVisual: document.getElementById("mascot-visual"),
  mascotImg: document.getElementById("mascot-img"),
  eyeL: document.getElementById("eye-l"),
  eyeR: document.getElementById("eye-r"),
  settingsToggle: document.getElementById("settings-toggle"),
  settings: document.getElementById("settings"),
  sizeRange: document.getElementById("size-range"),
  eyeRange: document.getElementById("eye-range"),
  cornerSelect: document.getElementById("corner-select"),
  downloadBtn: document.getElementById("download-btn"),
  recalibrateBtn: document.getElementById("recalibrate-btn"),
  newImageBtn: document.getElementById("new-image-btn"),
};

let state = loadState();
let pendingImage = null;
let calibMarks = [];
let pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let lastPointerTime = 0;

const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
let prefersReducedMotion = reduceMotionQuery.matches;
reduceMotionQuery.addEventListener("change", (e) => { prefersReducedMotion = e.matches; });

let toastTimer = null;
function showToast(message, { sticky = false } = {}) {
  el.toast.textContent = message;
  el.toast.hidden = false;
  requestAnimationFrame(() => el.toast.classList.add("visible"));
  if (toastTimer) clearTimeout(toastTimer);
  if (!sticky) toastTimer = setTimeout(hideToast, 3200);
}
function hideToast() {
  if (toastTimer) clearTimeout(toastTimer);
  el.toast.classList.remove("visible");
  setTimeout(() => { el.toast.hidden = true; }, 200);
}

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
    showToast("Couldn't save — your buddy won't stick around after you leave this page.");
  }
}

function readAndResizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read-failed"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode-failed"));
      img.onload = () => {
        let { width, height } = img;
        if (!width || !height) {
          reject(new Error("zero-dimensions"));
          return;
        }
        if (width > MAX_IMAGE_DIM || height > MAX_IMAGE_DIM) {
          const scale = MAX_IMAGE_DIM / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        const useJpeg = file.type === "image/jpeg" || file.type === "image/jpg";
        const dataUrl = useJpeg ? canvas.toDataURL("image/jpeg", 0.85) : canvas.toDataURL("image/png");
        resolve({ dataUrl, width, height });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function handleFile(file) {
  if (!file) return;
  if (!file.type || !file.type.startsWith("image/")) {
    showToast("That doesn't look like an image — try a PNG, JPG, WebP, or SVG.");
    return;
  }
  if (file.size > MAX_FILE_BYTES) {
    showToast("That image is a little large — try something under 30MB.");
    return;
  }
  const processingTimer = setTimeout(() => showToast("Processing…", { sticky: true }), 150);
  try {
    pendingImage = await readAndResizeImage(file);
    clearTimeout(processingTimer);
    hideToast();
    startCalibration();
  } catch {
    clearTimeout(processingTimer);
    hideToast();
    showToast("Couldn't read that image — try a different file.");
  }
}

el.fileInput.addEventListener("change", () => {
  handleFile(el.fileInput.files[0]);
  el.fileInput.value = "";
});

["dragenter", "dragover"].forEach((evt) =>
  el.dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    el.dropzone.classList.add("dragover");
  })
);
["dragleave", "drop"].forEach((evt) =>
  el.dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    el.dropzone.classList.remove("dragover");
  })
);
el.dropzone.addEventListener("drop", (e) => {
  handleFile(e.dataTransfer.files[0]);
});

el.demoBtn.addEventListener("click", loadDemo);

function loadDemo() {
  const dataUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(DEMO_SVG);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = DEMO_WIDTH;
    canvas.height = DEMO_HEIGHT;
    canvas.getContext("2d").drawImage(img, 0, 0, DEMO_WIDTH, DEMO_HEIGHT);
    state = {
      imageDataUrl: canvas.toDataURL("image/png"),
      width: DEMO_WIDTH,
      height: DEMO_HEIGHT,
      eyeL: DEMO_EYE_L,
      eyeR: DEMO_EYE_R,
      size: state?.size || 140,
      eyeSize: state?.eyeSize || 16,
      corner: state?.corner || "bottom-right",
    };
    saveState();
    renderMascot();
  };
  img.onerror = () => showToast("Couldn't load the demo — try uploading your own image instead.");
  img.src = dataUrl;
}

function startCalibration() {
  el.intro.hidden = true;
  el.mascot.hidden = true;
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

function updateCalibStep() {
  if (calibMarks.length === 0) {
    el.calibrateStep.innerHTML = "Click the <strong>left eye</strong> spot.";
    el.calibrateConfirm.hidden = true;
  } else if (calibMarks.length === 1) {
    el.calibrateStep.innerHTML = "Now the <strong>right eye</strong> spot.";
    el.calibrateConfirm.hidden = true;
  } else {
    el.calibrateStep.innerHTML = "Good — confirm, or start over.";
    el.calibrateConfirm.hidden = false;
  }
}

el.calibrateStage.addEventListener("click", (e) => {
  const rect = el.calibrateImg.getBoundingClientRect();
  if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return;
  const xPct = ((e.clientX - rect.left) / rect.width) * 100;
  const yPct = ((e.clientY - rect.top) / rect.height) * 100;

  const hitIndex = calibMarks.findIndex((m) => {
    const dxPx = ((m.xPct - xPct) / 100) * rect.width;
    const dyPx = ((m.yPct - yPct) / 100) * rect.height;
    return Math.hypot(dxPx, dyPx) < 16;
  });

  if (hitIndex !== -1) {
    calibMarks.splice(hitIndex, 1);
  } else if (calibMarks.length < 2) {
    calibMarks.push({ xPct, yPct });
  } else {
    return;
  }
  renderCalibMarks();
  updateCalibStep();
});

el.calibrateReset.addEventListener("click", () => {
  calibMarks = [];
  renderCalibMarks();
  updateCalibStep();
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

  el.mascotImg.src = state.imageDataUrl;
  const aspect = state.height / state.width;
  el.mascot.style.width = state.size + "px";
  el.mascot.style.height = Math.round(state.size * aspect) + "px";
  el.mascot.classList.remove("corner-bottom-right", "corner-bottom-left", "corner-top-right", "corner-top-left");
  el.mascot.classList.add("corner-" + state.corner);

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
  closeSettings();
  startCalibration();
});

el.newImageBtn.addEventListener("click", () => {
  state = null;
  localStorage.removeItem(STORAGE_KEY);
  closeSettings();
  el.mascot.hidden = true;
  el.intro.hidden = false;
});

function openSettings() {
  el.settings.hidden = false;
  el.settingsToggle.setAttribute("aria-expanded", "true");
}
function closeSettings() {
  el.settings.hidden = true;
  el.settingsToggle.setAttribute("aria-expanded", "false");
}
el.settingsToggle.addEventListener("click", () => {
  if (el.settings.hidden) openSettings();
  else closeSettings();
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
  renderMascot();
  saveState();
});

el.downloadBtn.addEventListener("click", exportPNG);

function exportPNG() {
  const canvas = document.createElement("canvas");
  canvas.width = state.width;
  canvas.height = state.height;
  const ctx = canvas.getContext("2d");
  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, 0, 0, state.width, state.height);
    drawEye(ctx, state.eyeL, canvas.width, state.eyeSize);
    drawEye(ctx, state.eyeR, canvas.width, state.eyeSize);
    canvas.toBlob((blob) => {
      if (!blob) {
        showToast("Couldn't export that image.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "aakocgrumpy.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }, "image/png");
  };
  img.src = state.imageDataUrl;
}

function drawEye(ctx, pos, refWidth, eyeSizePct) {
  const cx = (pos.xPct / 100) * refWidth;
  const cy = (pos.yPct / 100) * ctx.canvas.height;
  const r = (eyeSizePct / 100) * refWidth / 2;

  const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(1, "#eceae5");
  ctx.beginPath();
  ctx.fillStyle = grad;
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  ctx.stroke();

  const pr = r * 0.46;
  const pgrad = ctx.createRadialGradient(cx - pr * 0.35, cy - pr * 0.3, pr * 0.1, cx, cy, pr);
  pgrad.addColorStop(0, "#4a4a4a");
  pgrad.addColorStop(1, "#0b0b0c");
  ctx.beginPath();
  ctx.fillStyle = pgrad;
  ctx.arc(cx, cy, pr, 0, Math.PI * 2);
  ctx.fill();
}

window.addEventListener("pointermove", (e) => {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  lastPointerTime = performance.now();
});
window.addEventListener("pointerdown", (e) => {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  lastPointerTime = performance.now();
});

const instances = [];

function registerBuddy({ root, visual, eyeL, eyeR, visible }) {
  const inst = { root, visual, eyeL, eyeR, visible };
  instances.push(inst);
  scheduleBlink(inst);
  return inst;
}

const cornerInstance = registerBuddy({
  root: el.mascot,
  visual: el.mascotVisual,
  eyeL: el.eyeL,
  eyeR: el.eyeR,
  visible: () => !el.mascot.hidden,
});

const heroInstance = registerBuddy({
  root: el.heroPreview,
  visual: el.heroVisual,
  eyeL: el.heroEyeL,
  eyeR: el.heroEyeR,
  visible: () => !el.intro.hidden,
});
el.heroImg.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(DEMO_SVG);
el.heroVisual.addEventListener("click", () => poke(heroInstance));

function trackLoop() {
  instances.forEach((inst) => {
    if (!inst.visible()) return;
    const rect = inst.root.getBoundingClientRect();
    const mcx = rect.left + rect.width / 2;
    const mcy = rect.top + rect.height / 2;

    const idle = performance.now() - lastPointerTime > IDLE_MS;
    let targetX = pointer.x;
    let targetY = pointer.y;

    if (idle && !prefersReducedMotion) {
      const t = performance.now() / 1000;
      targetX = mcx + Math.sin(t * 0.35) * 140 + Math.sin(t * 0.13) * 40;
      targetY = mcy + Math.cos(t * 0.27) * 60;
    } else if (idle) {
      targetX = mcx;
      targetY = mcy;
    }

    [inst.eyeL, inst.eyeR].forEach((eye) => {
      const eyeRect = eye.getBoundingClientRect();
      const cx = eyeRect.left + eyeRect.width / 2;
      const cy = eyeRect.top + eyeRect.height / 2;
      const dx = targetX - cx;
      const dy = targetY - cy;
      const angle = Math.atan2(dy, dx);
      const maxOffset = eyeRect.width * 0.24;
      const dist = Math.min(Math.hypot(dx, dy) * 0.06, maxOffset);
      const pupil = eye.querySelector(".pupil");
      pupil.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`;
    });
  });
  requestAnimationFrame(trackLoop);
}
requestAnimationFrame(trackLoop);

function blinkInstance(inst) {
  if (!inst.visible()) return;
  inst.visual.classList.add("blinking");
  setTimeout(() => inst.visual.classList.remove("blinking"), 130);
}

function scheduleBlink(inst) {
  const delay = 2200 + Math.random() * 3800;
  setTimeout(() => {
    blinkInstance(inst);
    scheduleBlink(inst);
  }, delay);
}

function poke(inst) {
  blinkInstance(inst);
  inst.visual.classList.remove("poked");
  void inst.visual.offsetWidth;
  inst.visual.classList.add("poked");
}
el.mascotVisual.addEventListener("click", () => poke(cornerInstance));
el.mascotVisual.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    poke(cornerInstance);
  }
});
el.mascotVisual.addEventListener("animationend", () => el.mascotVisual.classList.remove("poked"));
el.heroVisual.addEventListener("animationend", () => el.heroVisual.classList.remove("poked"));

if (state && state.imageDataUrl && state.eyeL && state.eyeR) {
  renderMascot();
}
