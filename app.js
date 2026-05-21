/**
 * Comfort Tab — fake bedroom window
 * Photo view, rain on glass, day/night cycle, lofi loop + rain hiss.
 */

const CYCLE_SECONDS = 120;
const NIGHT_OVERLAY_MAX = 0.65;
const SCENE_BRIGHTNESS_MIN = 0.5;
const LOFI_GAIN_MAX = 0.55;

const MOODS = {
  calm: { rainBias: 0.7, filterWarmth: 0.5 },
  cozy: { rainBias: 0.5, filterWarmth: 0.75 },
  dreamy: { rainBias: 0.4, filterWarmth: 0.35 },
  bright: { rainBias: 0.25, filterWarmth: 0.9 },
};

const sceneImg = document.getElementById("scene");
const daynightOverlay = document.getElementById("daynight-overlay");
const rainCanvas = document.getElementById("rain");
const glassPane = document.querySelector(".glass-pane");
const ambientEl = document.getElementById("ambient");
const moodSelect = document.getElementById("mood");
const rainSlider = document.getElementById("rain-slider");
const worldClock = document.getElementById("world-clock");
const rainSoundToggle = document.getElementById("rain-sound-toggle");
const lofiToggle = document.getElementById("lofi-toggle");
const lofiVolumeSlider = document.getElementById("lofi-volume");

const rainCtx = rainCanvas.getContext("2d");

let width = 0;
let height = 0;
let dpr = 1;
let cycleT = 0.35;
let rainIntensity = 0.65;
let mood = "calm";
let lastFrame = 0;
let raindrops = [];
let audio = null;
let rainSoundOn = false;
let lofiOn = false;
let lofiVolume = 0.7;
let sceneMoodFilter = "";

// ——— Resize ———
function resize() {
  const rect = glassPane.getBoundingClientRect();
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = Math.floor(rect.width);
  height = Math.floor(rect.height);
  rainCanvas.width = width * dpr;
  rainCanvas.height = height * dpr;
  rainCanvas.style.width = `${width}px`;
  rainCanvas.style.height = `${height}px`;
  rainCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  initRain();
}

// ——— Day phase ———
function dayPhase(t) {
  const sun = Math.max(0, Math.sin((t - 0.25) * Math.PI * 2));
  const night = 1 - sun;
  const dawn = Math.exp(-Math.pow((t - 0.22) * 12, 2));
  const dusk = Math.exp(-Math.pow((t - 0.78) * 12, 2));
  return { sun, night, dawn, dusk };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function setOutsideTime(hours24, minutes = 0) {
  cycleT = ((hours24 % 24) + minutes / 60) / 24;
  updateDayNightOverlay(cycleT);
  updateClock(cycleT);
}

function applySceneMood(moodKey) {
  const m = MOODS[moodKey] || MOODS.calm;
  const w = m.filterWarmth;
  sceneMoodFilter = `sepia(${w * 0.2}) saturate(${0.85 + w * 0.25})`;
  updateDayNightOverlay(cycleT);
}

function updateDayNightOverlay(t) {
  const { sun, night, dawn, dusk } = dayPhase(t);
  const twilight = Math.min(1, dawn + dusk);
  const darken = night * (1 - twilight * 0.35);
  daynightOverlay.style.opacity = String(darken * NIGHT_OVERLAY_MAX);
  const brightness = SCENE_BRIGHTNESS_MIN + sun * (1 - SCENE_BRIGHTNESS_MIN);
  sceneImg.style.filter = `${sceneMoodFilter} brightness(${brightness})`.trim();
}

// ——— Rain on glass ———
function initRain() {
  raindrops = [];
  const n = Math.floor(180 * rainIntensity);
  for (let i = 0; i < n; i++) {
    raindrops.push(makeDrop());
  }
}

function makeDrop() {
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    len: 4 + Math.random() * 14,
    speed: 8 + Math.random() * 18,
    thick: 0.4 + Math.random() * 1.2,
    type: Math.random() < 0.15 ? "blob" : "streak",
    slide: Math.random() * 0.3,
  };
}

function drawRain(dt) {
  rainCtx.clearRect(0, 0, width, height);
  if (rainIntensity < 0.02) return;

  const alpha = 0.15 + rainIntensity * 0.35;
  rainCtx.lineCap = "round";

  for (const d of raindrops) {
    d.y += d.speed * dt;
    d.x += d.slide;

    if (d.y > height + d.len) {
      Object.assign(d, makeDrop());
      d.y = -d.len;
    }

    if (d.type === "streak") {
      const grd = rainCtx.createLinearGradient(d.x, d.y, d.x - 1, d.y + d.len);
      grd.addColorStop(0, "rgba(200,220,255,0)");
      grd.addColorStop(0.3, `rgba(200,220,255,${alpha})`);
      grd.addColorStop(1, `rgba(180,200,230,${alpha * 0.3})`);
      rainCtx.strokeStyle = grd;
      rainCtx.lineWidth = d.thick;
      rainCtx.beginPath();
      rainCtx.moveTo(d.x, d.y);
      rainCtx.lineTo(d.x - 0.8, d.y + d.len);
      rainCtx.stroke();
    } else {
      rainCtx.fillStyle = `rgba(200,220,255,${alpha * 0.6})`;
      rainCtx.beginPath();
      rainCtx.ellipse(d.x, d.y, d.thick * 2, d.thick * 3, 0, 0, Math.PI * 2);
      rainCtx.fill();
    }
  }

  if (Math.random() < rainIntensity * 0.008) {
    rainCtx.strokeStyle = `rgba(180,200,230,${alpha * 0.4})`;
    rainCtx.lineWidth = 1;
    const rx = Math.random() * width;
    rainCtx.beginPath();
    rainCtx.moveTo(rx, 0);
    rainCtx.quadraticCurveTo(rx + 8, height * 0.5, rx + 4, height);
    rainCtx.stroke();
  }
}

// ——— Ambient audio (lofi + rain hiss, separate buses) ———
class ComfortAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.lofiGain = null;
    this.mediaSource = null;
    this.rainNoise = null;
    this.rainGain = null;
    this._started = false;
    this._ambientOk = true;
  }

  async start() {
    if (this._started) {
      if (this.ctx.state === "suspended") await this.ctx.resume();
      return;
    }
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = 1;
    this.master.connect(this.ctx.destination);

    this.lofiGain = this.ctx.createGain();
    this.lofiGain.gain.value = 0;
    this.lofiGain.connect(this.master);

    this._ambientOk = !ambientEl.error;
    if (this._ambientOk) {
      try {
        this.mediaSource = this.ctx.createMediaElementSource(ambientEl);
        this.mediaSource.connect(this.lofiGain);
      } catch (e) {
        this._ambientOk = false;
        console.warn("Comfort Tab: could not connect ambient audio", e);
      }
    } else {
      console.warn("Comfort Tab: assets/lofimusic.mp3 failed to load — rain hiss only");
    }

    const bufferSize = 2 * this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    this.rainNoise = this.ctx.createBufferSource();
    this.rainNoise.buffer = buffer;
    this.rainNoise.loop = true;
    const rainFilter = this.ctx.createBiquadFilter();
    rainFilter.type = "bandpass";
    rainFilter.frequency.value = 3200;
    rainFilter.Q.value = 0.4;
    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.value = 0;
    this.rainNoise.connect(rainFilter);
    rainFilter.connect(this.rainGain);
    this.rainGain.connect(this.master);
    this.rainNoise.start();

    this._started = true;
  }

  async playAmbient() {
    if (!this._ambientOk) return;
    try {
      await ambientEl.play();
    } catch (e) {
      console.warn("Comfort Tab: ambient play blocked", e);
    }
  }

  pauseAmbient() {
    if (!ambientEl.paused) ambientEl.pause();
  }

  setLofi(on, volume01) {
    if (!this.lofiGain) return;
    const g = on ? volume01 * LOFI_GAIN_MAX : 0;
    this.lofiGain.gain.setTargetAtTime(g, this.ctx.currentTime, on ? 0.8 : 0.4);
    if (on) this.playAmbient();
    else this.pauseAmbient();
  }

  setRainLevel(amount) {
    if (this.rainGain) {
      this.rainGain.gain.setTargetAtTime(amount * 0.08, this.ctx.currentTime, 0.3);
    }
  }

  setRainOn(on) {
    if (!this.rainGain) return;
    if (on) {
      this.setRainLevel(rainIntensity);
    } else {
      this.rainGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
    }
  }
}

// ——— Clock ———
function updateClock(t) {
  const hours = Math.floor(t * 24) % 24;
  const mins = Math.floor((t * 24 * 60) % 60);
  const ampm = hours >= 12 ? "pm" : "am";
  const h12 = hours % 12 || 12;
  worldClock.textContent = `${h12}:${mins.toString().padStart(2, "0")} ${ampm}`;
}

function syncRainAudio() {
  if (audio && rainSoundOn) {
    audio.setRainLevel(rainIntensity);
  }
}

function syncLofiAudio() {
  if (audio && lofiOn) {
    audio.setLofi(true, lofiVolume);
  }
}

// ——— Main loop ———
function frame(now) {
  if (!lastFrame) lastFrame = now;
  const dt = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;

  cycleT = (cycleT + dt / CYCLE_SECONDS) % 1;

  updateDayNightOverlay(cycleT);
  drawRain(dt);

  updateClock(cycleT);
  requestAnimationFrame(frame);
}

// ——— Events ———
moodSelect.addEventListener("change", () => {
  mood = moodSelect.value;
  applySceneMood(mood);
  if (mood === "dreamy") setOutsideTime(22, 0);
  else if (mood === "bright") setOutsideTime(10, 0);

  const m = MOODS[mood];
  if (m && rainSlider) {
    const target = Math.round(lerp(rainSlider.value / 100, m.rainBias, 0.35) * 100);
    rainSlider.value = target;
    onRainChange();
  }
});

function onRainChange() {
  rainIntensity = rainSlider.value / 100;
  glassPane.classList.toggle("wet", rainIntensity > 0.35);
  const targetCount = Math.floor(180 * rainIntensity);
  while (raindrops.length < targetCount) raindrops.push(makeDrop());
  raindrops.length = targetCount;
  syncRainAudio();
}

rainSlider.addEventListener("input", onRainChange);

rainSoundToggle.addEventListener("click", async () => {
  rainSoundOn = !rainSoundOn;
  rainSoundToggle.setAttribute("aria-pressed", String(rainSoundOn));
  rainSoundToggle.querySelector(".rain-sound-label").textContent = rainSoundOn
    ? "Rain sound on"
    : "Rain sound off";

  if (rainSoundOn) {
    audio = audio || new ComfortAudio();
    await audio.start();
    audio.setRainOn(true);
  } else if (audio) {
    audio.setRainOn(false);
  }
});

lofiToggle.addEventListener("click", async () => {
  lofiOn = !lofiOn;
  lofiToggle.setAttribute("aria-pressed", String(lofiOn));
  lofiToggle.querySelector(".lofi-label").textContent = lofiOn ? "Lofi on" : "Lofi off";

  if (lofiOn) {
    audio = audio || new ComfortAudio();
    await audio.start();
    syncLofiAudio();
  } else if (audio) {
    audio.setLofi(false, 0);
  }
});

lofiVolumeSlider.addEventListener("input", () => {
  lofiVolume = lofiVolumeSlider.value / 100;
  syncLofiAudio();
});

window.addEventListener("resize", resize);
mood = moodSelect.value;
lofiVolume = lofiVolumeSlider.value / 100;
applySceneMood(mood);
resize();
onRainChange();
requestAnimationFrame(frame);

cycleT = 0.62;
