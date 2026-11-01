/*
 * room.js
 * The interactive room at the top of the home page.
 *
 * What you can click:
 *   - Bookshelf   -> scrolls down to the Projects section
 *   - Name sign   -> opens the About page
 *   - Computer    -> scrolls down to the Experience section
 *   - Radio       -> plays / pauses a soft lo-fi loop
 *   - Mango       -> she flaps and says "squawk!"
 *
 * How it works:
 *   The whole room is drawn on one <canvas> (#roomCv) inside #home.
 *   Everything is drawn in a fixed 1000 x 625 "room space" and then scaled
 *   to fit the screen, so all the x/y numbers below are in that room space.
 *   The floor is at y = 470.
 */

(function () {
  "use strict";

  const canvas = document.getElementById("roomCv");
  const container = document.getElementById("home");
  if (!canvas || !container) return;


  /* ============================================================
     Settings you might want to change
     ============================================================ */

  // The four projects shown as labelled books on the shelf.
  const PROJECT_BOOKS = {
    "auv":            { name: "AUV",       color: "#9fd3f0" },
    "pointview":      { name: "PointView", color: "#c9b6f2" },
    "bci":            { name: "BCI",       color: "#a8e0c8" },
    "mobile-lectern": { name: "Lectern",   color: "#f6d98a" },
  };

  // What sits on each shelf, left to right (top shelf first).
  //   "d"      = a plain decorative book
  //   "stack"  = a small pile of books lying flat
  //   "globe"  = a little globe
  //   anything else = a project book from PROJECT_BOOKS
  const SHELVES = [
    ["d", "d", "auv", "d", "d", "pointview", "d", "d", "d"],
    ["d", "bci", "d", "d", "d", "stack"],
    ["d", "d", "mobile-lectern", "d", "globe"],
  ];

  const DECO_BOOK_COLORS = ["#ece6f5", "#f7c1a1", "#a8d8ea", "#e9e2f3", "#f4a6c0", "#a8e0c8", "#f6d98a", "#d9cfe8"];

  // Clickable areas in room space. The label shows on hover.
  const CLICK_AREAS = [
    { id: "mango",  x: 490, y: 362, w: 66,  h: 72,  label: "Mango" },
    { id: "radio",  x: 318, y: 266, w: 100, h: 94,  label: "Radio" },
    { id: "shelf",  x: 40,  y: 76,  w: 230, h: 394, label: "Bookshelf · All Projects" },
    { id: "about",  x: 672, y: 90,  w: 290, h: 90,  label: "About Me" },
    { id: "experience", x: 748, y: 244, w: 116, h: 90, label: "Computer · Experience" },
  ];


  /* ============================================================
     Small helpers
     ============================================================ */

  const FULL_CIRCLE = Math.PI * 2;
  const prefersReducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const MOTION = prefersReducedMotion ? 0.35 : 1;   // slows ambient animation down for reduced motion

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  // Rounded rectangle path (falls back to a plain rectangle in old browsers).
  function roundedRect(ctx, x, y, w, h, radius) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, radius);
    else ctx.rect(x, y, w, h);
  }

  function circle(ctx, x, y, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, FULL_CIRCLE);
    ctx.fill();
  }

  // A random number generator that always gives the same sequence,
  // so the decorative books look the same on every visit.
  function seededRandom(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Your name for the neon sign (from app.js), with a fallback.
  function myName() {
    try { return S.profile.name || "Rebecca Kong"; }
    catch (e) { return "Rebecca Kong"; }
  }


  /* ============================================================
     Build the bookshelf contents and the stars outside the window
     ============================================================ */

  const random = seededRandom(11);
  const books = [];   // every book on the shelf: { x, y, w, h, color, projectId?, lift }
  const props = [];   // the book stack and the globe

  SHELVES.forEach(function (items, shelfIndex) {
    const shelfBottom = 226 + shelfIndex * 112;
    let x = 58;

    for (const item of items) {
      if (item === "d") {
        const w = 10 + random() * 7;
        const h = 58 + random() * 26;
        const color = DECO_BOOK_COLORS[Math.floor(random() * DECO_BOOK_COLORS.length)];
        books.push({ x, y: shelfBottom - h, w, h, color, lift: 0 });
        x += w + 2;
      } else if (item === "stack") {
        props.push({ kind: "stack", x, bottom: shelfBottom });
        x += 46;
      } else if (item === "globe") {
        props.push({ kind: "globe", x: x + 8, bottom: shelfBottom });
        x += 44;
      } else {
        const w = 27;
        const h = 92 + random() * 6;
        books.push({ x, y: shelfBottom - h, w, h, color: PROJECT_BOOKS[item].color, projectId: item, lift: 0 });
        x += w + 2;
      }
    }
  });

  const windowStars = [];
  for (let i = 0; i < 22; i++) {
    windowStars.push({ x: 305 + random() * 190, y: 65 + random() * 170, phase: random() * 6 });
  }


  /* ============================================================
     State
     ============================================================ */

  let ctx = null;
  let width = 0, height = 0;                       // canvas size in CSS pixels
  let view = { scale: 1, offsetX: 0, offsetY: 0 }; // how room space maps onto the canvas

  let timeOfDayMode = "now";   // "now" follows the visitor's clock; or "day" / "dusk" / "night"
  let hovered = null;          // the click area under the pointer
  let isOnScreen = true;

  let squawkTimer = 0;         // seconds left on Mango's "squawk!"
  let musicPlaying = false;
  let floatingNotes = [];      // the ♪ symbols rising from the radio
  let nextNoteIn = 0;


  /* ============================================================
     Canvas sizing
     ============================================================ */

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * pixelRatio);
    canvas.height = Math.round(rect.height * pixelRatio);
    ctx = canvas.getContext("2d");
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    width = rect.width;
    height = rect.height;

    // Fit the whole 1000 x 625 room inside the canvas, centred.
    const scale = Math.min(width / 1000, height / 625);
    view = {
      scale,
      offsetX: (width - 1000 * scale) / 2,
      offsetY: (height - 625 * scale) / 2,
    };
  }

  new ResizeObserver(resize).observe(container);
  new IntersectionObserver(function (entries) { isOnScreen = entries[0].isIntersecting; }).observe(container);


  /* ============================================================
     Clicking and hovering
     ============================================================ */

  function screenToRoom(screenX, screenY) {
    return [(screenX - view.offsetX) / view.scale, (screenY - view.offsetY) / view.scale];
  }

  function clickAreaAt(screenX, screenY) {
    const [x, y] = screenToRoom(screenX, screenY);
    return CLICK_AREAS.find(a => x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h) || null;
  }

  function pointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    return [event.clientX - rect.left, event.clientY - rect.top];
  }

  function scrollToSection(sectionId) {
    document.getElementById(sectionId).scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
  }

  function scrollToProjects() {
    // Show all projects (filter and setF come from app.js).
    if (typeof filter !== "undefined" && filter !== "All" && typeof setF === "function") setF("All");
    scrollToSection("projects");
  }

  function handleClick(area) {
    if (!area) return;

    switch (area.id) {
      case "shelf":  scrollToProjects(); break;
      case "about":  location.hash = "about"; break;
      case "experience": scrollToSection("experience"); break;
      case "radio":  musicPlaying ? stopMusic() : startMusic(); break;
      case "mango":  squawkTimer = 2.4; break;
    }
  }

  canvas.addEventListener("pointermove", function (event) {
    hovered = clickAreaAt(...pointerPosition(event));
    canvas.style.cursor = hovered ? "pointer" : "default";
  });

  canvas.addEventListener("pointerleave", function () {
    hovered = null;
  });

  canvas.addEventListener("pointerdown", function (event) {
    hovered = clickAreaAt(...pointerPosition(event));
    handleClick(hovered);
  });

  // Keyboard users: Enter or Space on the room goes to Projects.
  canvas.addEventListener("keydown", function (event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      scrollToProjects();
    }
  });

  // The Auto / Day / Sunset / Night buttons.
  document.querySelectorAll("#tod button").forEach(function (button) {
    button.addEventListener("click", function () {
      timeOfDayMode = button.dataset.m;
      document.querySelectorAll("#tod button").forEach(b => b.classList.toggle("on", b === button));
    });
  });

  function currentTimeOfDay() {
    if (timeOfDayMode !== "now") return timeOfDayMode;
    const now = new Date();
    const hour = now.getHours() + now.getMinutes() / 60;
    if (hour >= 7 && hour < 17) return "day";
    if (hour >= 17 && hour < 19.5) return "dusk";
    return "night";
  }


  /* ============================================================
     Radio music: a soft jazz loop made with the Web Audio API.
     Nothing plays until the radio is clicked.
     ============================================================ */

    let audio = null, masterVolume = null, musicTimer = null, noiseBuffer = null;

  // Jazz café: four chords (as MIDI note numbers), one per bar: Dm9, G9, Cmaj9, A7.
  const CHORDS = [
    [62, 65, 69, 72, 76],
    [55, 59, 62, 65, 69],
    [60, 64, 67, 71, 74],
    [57, 61, 64, 67, 70]
  ];
  const STEPS_PER_BAR = 8;
  // Swung eighth notes: long-short, long-short.
  const stepSeconds = (step) => (step % 2 === 0 ? 0.34 : 0.2);

  function playNote(midiNote, startTime, duration, waveType, volume) {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = waveType;
    oscillator.frequency.value = 440 * Math.pow(2, (midiNote - 69) / 12);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    oscillator.connect(gain);
    gain.connect(masterVolume);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.05);
  }

  // Short burst of filtered noise, used for the brushed cymbal.
  function playNoise(startTime, duration, volume, highpassHz) {
    if (!noiseBuffer) {
      noiseBuffer = audio.createBuffer(1, audio.sampleRate * 0.5, audio.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    const source = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    const gain = audio.createGain();
    source.buffer = noiseBuffer;
    filter.type = "highpass";
    filter.frequency.value = highpassHz;
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(masterVolume);
    source.start(startTime);
    source.stop(startTime + duration + 0.05);
  }

  // Everything that happens on one eighth note of the loop.
  function playJazzStep(step, chord, time) {
    const stepInBar = step % STEPS_PER_BAR;

    // Walking bass on every beat (root, third, fifth, then a step toward the next chord),
    // with a brushed cymbal on the same beats.
    if (stepInBar % 2 === 0) {
      const walk = [chord[0], chord[1], chord[2], chord[0] + 1][stepInBar / 2];
      playNote(walk - 24, time, 0.5, "sine", 0.16);
      playNoise(time, 0.12, 0.018, 9000);
    }

    // Light piano chords on the off-beats.
    if (stepInBar === 3 || stepInBar === 6) {
      playNote(chord[1], time, 0.45, "triangle", 0.035);
      playNote(chord[3], time, 0.45, "triangle", 0.03);
      playNote(chord[4], time, 0.45, "triangle", 0.025);
    }

    // A couple of soft melody notes each bar.
    if (stepInBar === 1 || stepInBar === 5) {
      const melodyNote = [4, 2, 3][Math.floor(step / STEPS_PER_BAR) % 3];
      playNote(chord[melodyNote] + 12, time, 0.35, "sine", 0.04);
    }
  }

  function startMusic() {
    try {
      if (!audio) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        audio = new AudioContextClass();
        masterVolume = audio.createGain();
        masterVolume.gain.value = 0;
        masterVolume.connect(audio.destination);
      }
      clearInterval(musicTimer);
      audio.resume();
      masterVolume.gain.cancelScheduledValues(audio.currentTime);
      masterVolume.gain.setTargetAtTime(0.6, audio.currentTime, 0.25);   // fade in
      musicPlaying = true;

      let step = 0;
      let nextStepTime = audio.currentTime + 0.08;

      // Schedule notes a little ahead of time so playback stays smooth.
      musicTimer = setInterval(function () {
        while (nextStepTime < audio.currentTime + 0.3) {
          const chord = CHORDS[Math.floor(step / STEPS_PER_BAR) % CHORDS.length];
          playJazzStep(step, chord, nextStepTime);
          nextStepTime += stepSeconds(step);
          step++;
        }
      }, 60);
    } catch (e) {
      musicPlaying = false;
    }
  }

  function stopMusic() {
    musicPlaying = false;
    clearInterval(musicTimer);
    if (audio && masterVolume) masterVolume.gain.setTargetAtTime(0, audio.currentTime, 0.15);   // fade out
  }


  /* ============================================================
     Drawing: one function per part of the room
     ============================================================ */

  function drawWallAndFloor(c) {
    // Pink striped wallpaper
    c.fillStyle = "#f6e2e7";
    c.fillRect(-900, -400, 2800, 870);
    c.fillStyle = "rgba(229,138,164,.07)";
    for (let x = -900; x < 1900; x += 44) c.fillRect(x, -400, 18, 870);

    // Wooden floor with plank lines
    c.fillStyle = "#e0bc98";
    c.fillRect(-900, 470, 2800, 600);
    c.strokeStyle = "rgba(150,100,70,.25)";
    c.lineWidth = 2;
    for (let y = 500; y < 1000; y += 32) {
      c.beginPath();
      c.moveTo(-900, y);
      c.lineTo(1900, y);
      c.stroke();
    }

    // Skirting board
    c.fillStyle = "#fff6f8";
    c.fillRect(-900, 462, 2800, 10);
  }

  function drawWindow(c, t, timeOfDay) {
    const night = timeOfDay === "night";
    const dusk = timeOfDay === "dusk";

    // Sky
    const skyColors = night ? ["#121a40", "#2c2f66"] : dusk ? ["#f39a78", "#fbd9a4"] : ["#9cd1f2", "#e8f6ff"];
    const sky = c.createLinearGradient(0, 65, 0, 235);
    sky.addColorStop(0, skyColors[0]);
    sky.addColorStop(1, skyColors[1]);
    c.fillStyle = sky;
    c.fillRect(305, 65, 190, 170);

    // Sun and a drifting cloud (the moon and stars are drawn later, after the night tint)
    if (!night) {
      circle(c, dusk ? 360 : 455, dusk ? 215 : 105, dusk ? 24 : 18, dusk ? "#ffe3a0" : "#fff4c4");

      c.save();
      c.beginPath();
      c.rect(305, 65, 190, 170);
      c.clip();
      const cloudX = 305 + ((t * 6 * MOTION) % 260) - 30;
      for (const [dx, dy, r] of [[0, 0, 14], [16, -6, 17], [34, 0, 13]]) {
        circle(c, cloudX + dx, 140 + dy, r, "rgba(255,255,255,.85)");
      }
      c.restore();
    }

    // Frame and sill
    c.strokeStyle = "#fff";
    c.lineWidth = 10;
    c.strokeRect(300, 60, 200, 180);
    c.lineWidth = 6;
    c.beginPath();
    c.moveTo(400, 60); c.lineTo(400, 240);
    c.moveTo(300, 150); c.lineTo(500, 150);
    c.stroke();
    c.fillStyle = "#fff";
    c.fillRect(286, 240, 228, 12);

    // Curtain rod and pink curtains
    c.strokeStyle = "#c98f6a";
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(262, 44);
    c.lineTo(538, 44);
    c.stroke();

    for (const [edgeX, direction] of [[270, 1], [530, -1]]) {
      c.fillStyle = "#f6b3c5";
      c.beginPath();
      c.moveTo(edgeX, 44);
      c.lineTo(edgeX + direction * 40, 44);
      c.quadraticCurveTo(edgeX + direction * 26, 150, edgeX + direction * 48, 266);
      c.lineTo(edgeX, 266);
      c.closePath();
      c.fill();

      // Folds
      c.strokeStyle = "rgba(200,90,125,.25)";
      c.lineWidth = 2;
      for (const k of [12, 24]) {
        c.beginPath();
        c.moveTo(edgeX + direction * k, 48);
        c.quadraticCurveTo(edgeX + direction * (k - 6), 150, edgeX + direction * (k + 6), 262);
        c.stroke();
      }
    }
  }

  // Draws the string and returns the bulb positions (the bulbs are drawn later so they glow at night).
  function drawFairyLightString(c) {
    const bulbs = [];
    c.strokeStyle = "#9c8a90";
    c.lineWidth = 1.5;
    c.beginPath();
    for (let i = 0; i <= 44; i++) {
      const u = i / 44;
      const x = 560 + u * 430;
      const y = 22 + Math.sin(u * Math.PI) * 30;
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
      if (i % 4 === 2) bulbs.push([x, y + 6]);
    }
    c.stroke();
    return bulbs;
  }

  function drawBookshelf(c, t) {
    // Frame, back panel and shelves
    c.fillStyle = "#c98f6a";
    c.fillRect(40, 110, 230, 360);
    c.fillStyle = "#ecd0b4";
    c.fillRect(52, 122, 206, 336);
    c.fillStyle = "rgba(120,70,40,.08)";
    c.fillRect(52, 122, 8, 336);
    c.fillStyle = "#c98f6a";
    c.fillRect(52, 226, 206, 8);
    c.fillRect(52, 338, 206, 8);
    c.fillStyle = "#b27b58";
    c.fillRect(34, 104, 242, 10);

    // Books (they lift a little while the shelf is hovered)
    for (const book of books) {
      const y = book.y - book.lift * 12;
      c.fillStyle = book.color;
      c.fillRect(book.x, y, book.w, book.h);
      c.fillStyle = "rgba(255,255,255,.3)";
      c.fillRect(book.x + 1.5, y, 2.5, book.h);
      c.fillStyle = "rgba(42,34,38,.2)";
      c.fillRect(book.x + 2, y + 8, book.w - 4, 2);
      c.fillRect(book.x + 2, y + book.h - 12, book.w - 4, 2);

      if (book.projectId) {
        c.save();
        c.translate(book.x + book.w / 2, y + book.h / 2);
        c.rotate(-Math.PI / 2);
        c.fillStyle = "#2a2226";
        c.font = '400 14px "DM Serif Display", Georgia, serif';
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText(PROJECT_BOOKS[book.projectId].name, 0, 1);
        c.restore();
      }
    }

    // Book stack and globe
    for (const prop of props) {
      if (prop.kind === "stack") {
        const stack = [["#c9b6f2", 44, 0], ["#f7c1a1", 40, 3], ["#a8e0c8", 42, 1]];
        stack.forEach(function ([color, w, dx], i) {
          const y = prop.bottom - 12 * (i + 1);
          c.fillStyle = color;
          c.fillRect(prop.x + dx, y, w, 11);
          c.fillStyle = "rgba(255,255,255,.35)";
          c.fillRect(prop.x + dx, y, w, 2);
        });
      } else {
        c.fillStyle = "#b78a68";
        c.fillRect(prop.x + 10, prop.bottom - 6, 20, 6);
        c.fillRect(prop.x + 18, prop.bottom - 20, 4, 14);
        circle(c, prop.x + 20, prop.bottom - 38, 17, "#9fd3f0");
        c.fillStyle = "#a8e0c8";
        c.beginPath();
        c.ellipse(prop.x + 14, prop.bottom - 42, 7, 9, 0.5, 0, FULL_CIRCLE);
        c.ellipse(prop.x + 27, prop.bottom - 32, 5, 6, 0, 0, FULL_CIRCLE);
        c.fill();
      }
    }

    // Small plant on top of the shelf
    c.fillStyle = "#f0a07a";
    c.beginPath();
    c.moveTo(208, 104); c.lineTo(246, 104); c.lineTo(241, 78); c.lineTo(213, 78);
    c.closePath();
    c.fill();
    c.fillStyle = "#7fbf8e";
    for (const [angle, length] of [[-1.2, 32], [-1.6, 38], [-2, 30], [-0.8, 26], [-2.4, 24]]) {
      c.save();
      c.translate(227, 78);
      c.rotate(angle + Math.sin(t * 0.8 + angle) * 0.04);
      c.beginPath();
      c.ellipse(length * 0.5, 0, length * 0.5, 6.5, 0, 0, FULL_CIRCLE);
      c.fill();
      c.restore();
    }

    // Framed photo on top of the shelf
    c.fillStyle = "#fff";
    c.fillRect(70, 68, 46, 36);
    c.fillStyle = "#f4a6c0";
    c.fillRect(75, 73, 36, 26);
    circle(c, 93, 86, 6, "#fff5c2");
  }

  function drawTennisPoster(c) {
    c.save();
    c.translate(590, 145);
    c.rotate(-0.025);

    // Paper and tape
    c.fillStyle = "#fffaf3";
    c.fillRect(-52, -56, 104, 112);
    c.strokeStyle = "#ead9cf";
    c.lineWidth = 2;
    c.strokeRect(-52, -56, 104, 112);
    c.fillStyle = "rgba(246,217,138,.8)";
    c.fillRect(-14, -62, 28, 12);

    // Court seen from above
    c.fillStyle = "#a8dcc6";
    c.fillRect(-40, -47, 80, 76);
    c.fillStyle = "#7cbfa6";
    c.fillRect(-30, -41, 60, 64);
    c.strokeStyle = "#fff";
    c.lineWidth = 1.6;
    c.strokeRect(-30, -41, 60, 64);
    c.strokeRect(-23, -41, 46, 64);
    c.beginPath();
    c.moveTo(-23, -25); c.lineTo(23, -25);
    c.moveTo(-23, 7);   c.lineTo(23, 7);
    c.moveTo(0, -25);   c.lineTo(0, 7);
    c.stroke();

    // Net
    c.strokeStyle = "#3b3740";
    c.lineWidth = 2.2;
    c.beginPath();
    c.moveTo(-35, -9);
    c.lineTo(35, -9);
    c.stroke();

    // Ball and its shadow
    circle(c, 10, -20, 2.6, "rgba(0,0,0,.18)");
    circle(c, 8, -26, 3.6, "#e3ef55");
    c.strokeStyle = "#fff";
    c.lineWidth = 0.8;
    c.beginPath();
    c.arc(6, -26, 3, -1, 1);
    c.stroke();

    c.fillStyle = "#6a5560";
    c.font = '400 11px "DM Serif Display", Georgia, serif';
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("game · set · match", 0, 43);
    c.restore();
  }

  function drawCabinet(c) {
    c.fillStyle = "#d9a37f";
    c.fillRect(310, 360, 180, 110);
    c.strokeStyle = "rgba(120,70,40,.3)";
    c.lineWidth = 2;
    c.strokeRect(318, 370, 78, 92);
    c.strokeRect(404, 370, 78, 92);
    c.fillStyle = "#a8714e";
    c.beginPath();
    c.arc(390, 416, 3.5, 0, FULL_CIRCLE);
    c.arc(410, 416, 3.5, 0, FULL_CIRCLE);
    c.fill();
    c.fillStyle = "#c98f6a";
    c.fillRect(306, 356, 188, 6);   // top
  }

  function drawRadio(c, t) {
    const pulse = musicPlaying ? 1 + Math.abs(Math.sin(t * 6.3)) * 0.12 : 1;

    // Antenna
    c.strokeStyle = "#8a7f88";
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(392, 314);
    c.lineTo(414, 272);
    c.stroke();
    circle(c, 414, 272, 3, "#8a7f88");

    // Body
    c.fillStyle = "#f4a6c0";
    roundedRect(c, 322, 310, 82, 46, 9);
    c.fill();
    c.fillStyle = "rgba(255,255,255,.35)";
    roundedRect(c, 322, 310, 82, 6, [9, 9, 0, 0]);
    c.fill();

    // Speaker (pulses with the music)
    circle(c, 345, 334, 14 * pulse, "#fbe7ee");
    for (let dy = -8; dy <= 8; dy += 4) {
      for (let dx = -8; dx <= 8; dx += 4) {
        if (dx * dx + dy * dy < 90) circle(c, 345 + dx * pulse, 334 + dy * pulse, 1.2, "#d77d97");
      }
    }

    // Tuning dial and needle
    c.fillStyle = "#fff6e0";
    roundedRect(c, 368, 320, 28, 13, 3);
    c.fill();
    c.strokeStyle = "#c9a98c";
    c.lineWidth = 0.8;
    for (let i = 0; i < 6; i++) {
      c.beginPath();
      c.moveTo(371 + i * 4.5, 323);
      c.lineTo(371 + i * 4.5, 326);
      c.stroke();
    }
    const needleX = musicPlaying ? 374 + ((t * 3) % 1) * 18 : 380;
    c.strokeStyle = "#e0523f";
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(needleX, 321);
    c.lineTo(needleX, 332);
    c.stroke();

    // Knobs and power light
    circle(c, 374, 346, 4.5, "#fff6e0");
    circle(c, 390, 346, 4.5, "#fff6e0");
    circle(c, 396, 315, 1.8, musicPlaying ? "#7fdc8a" : "#d77d97");
  }

  function drawCamera(c) {
    const x = 444;

    c.fillStyle = "rgba(0,0,0,.12)";   // shadow
    c.beginPath();
    c.ellipse(x, 356, 22, 2.6, 0, 0, FULL_CIRCLE);
    c.fill();

    // Wrist strap
    c.strokeStyle = "#f4a6c0";
    c.lineWidth = 2.2;
    c.beginPath();
    c.moveTo(x - 18, 340);
    c.quadraticCurveTo(x - 30, 348, x - 24, 356);
    c.stroke();

    // Buttons on top
    c.fillStyle = "#c9c3cc";
    roundedRect(c, x + 6, 326, 9, 3, 1.5);
    c.fill();
    c.fillStyle = "#9a94a0";
    roundedRect(c, x - 12, 327, 6, 2, 1);
    c.fill();

    // Body
    c.fillStyle = "#1f1c24";
    roundedRect(c, x - 20, 328, 40, 28, 6);
    c.fill();
    c.fillStyle = "rgba(255,255,255,.08)";
    roundedRect(c, x - 20, 328, 40, 5, [6, 6, 0, 0]);
    c.fill();

    // Flash window
    c.fillStyle = "#e9eef3";
    roundedRect(c, x - 16, 332, 8, 5, 1.5);
    c.fill();

    // Lens
    circle(c, x + 6, 343, 9.5, "#b9b3bf");
    circle(c, x + 6, 343, 7.5, "#2a2630");
    circle(c, x + 6, 343, 4.5, "#3d4766");
    circle(c, x + 4, 341, 1.6, "rgba(255,255,255,.7)");

    // Power light
    circle(c, x - 15, 350, 1.2, "#7fdc8a");
  }

  function drawFloorPlant(c, t) {
    // Leaves: [angle, length, width]
    const leaves = [[-1.9, 120, 16], [-1.35, 128, 18], [-1.05, 104, 15], [-2.3, 96, 14], [-1.6, 92, 15], [-0.75, 80, 13], [-2.65, 78, 12]];
    for (const [angle, length, leafWidth] of leaves) {
      c.save();
      c.translate(585, 412);
      c.rotate(angle + Math.sin(t * 0.7 + angle * 3) * 0.025);
      c.fillStyle = angle < -1.6 ? "#7fbf8e" : "#6eae80";
      c.beginPath();
      c.ellipse(length * 0.6, 0, length * 0.42, leafWidth, 0, 0, FULL_CIRCLE);
      c.fill();
      c.strokeStyle = "rgba(40,90,55,.3)";
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(length, 0);
      c.stroke();
      c.restore();
    }

    // Terracotta pot
    c.fillStyle = "rgba(90,50,40,.18)";   // floor shadow
    c.beginPath();
    c.ellipse(585, 470, 30, 5, 0, 0, FULL_CIRCLE);
    c.fill();

    c.fillStyle = "#d9825f";              // pot
    c.beginPath();
    c.moveTo(557, 416); c.lineTo(613, 416); c.lineTo(605, 468); c.lineTo(565, 468);
    c.closePath();
    c.fill();

    c.fillStyle = "rgba(120,50,30,.18)";  // shaded right side
    c.beginPath();
    c.moveTo(590, 416); c.lineTo(613, 416); c.lineTo(605, 468); c.lineTo(592, 468);
    c.closePath();
    c.fill();

    c.fillStyle = "#e8946f";              // rim
    roundedRect(c, 551, 406, 68, 13, 4);
    c.fill();
    c.fillStyle = "rgba(255,255,255,.25)";
    c.fillRect(555, 408, 60, 3);
    c.strokeStyle = "#b8613f";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(557, 419);
    c.lineTo(613, 419);
    c.stroke();
  }

  function drawRug(c) {
    c.fillStyle = "#f6c9d4";
    c.beginPath();
    c.ellipse(560, 555, 210, 40, 0, 0, FULL_CIRCLE);
    c.fill();
    c.strokeStyle = "#fbe6ec";
    c.lineWidth = 6;
    c.beginPath();
    c.ellipse(560, 555, 180, 30, 0, 0, FULL_CIRCLE);
    c.stroke();
  }

  // Mango the sun conure on her floor perch.
  function drawMango(c, t) {
    // Perch
    c.fillStyle = "#b78a68";
    c.beginPath();
    c.ellipse(522, 556, 30, 7, 0, 0, FULL_CIRCLE);
    c.fill();
    c.fillRect(519, 430, 6, 126);
    c.strokeStyle = "#b78a68";
    c.lineWidth = 7;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(498, 430);
    c.lineTo(548, 430);
    c.stroke();

    // While squawking she flaps and bounces; otherwise she bobs and tilts her head now and then.
    const squawking = squawkTimer > 0;
    const wingFlap = squawking ? Math.abs(Math.sin(t * 22)) * 0.9 : 0;
    const bob = squawking ? -4 * Math.abs(Math.sin(t * 11)) : Math.sin(t * 2) * 1.2;
    const headTilt = squawking ? 0.2 : (Math.sin(t * 0.6) > 0.75 ? 0.3 : 0);

    c.save();
    c.translate(522, 428 + bob);
    c.scale(1.3, 1.3);

    // Tail (green with a blue tip)
    c.fillStyle = "#4cb25b";
    c.beginPath();
    c.moveTo(4, -8); c.lineTo(16, 22); c.lineTo(9, 24); c.lineTo(-1, -6);
    c.closePath();
    c.fill();
    c.fillStyle = "#3f86d6";
    c.beginPath();
    c.moveTo(13, 14); c.lineTo(16, 22); c.lineTo(9, 24); c.lineTo(8, 16);
    c.closePath();
    c.fill();

    // Body (orange fading to yellow)
    const bodyGradient = c.createLinearGradient(0, -34, 0, 0);
    bodyGradient.addColorStop(0, "#ff8f2e");
    bodyGradient.addColorStop(1, "#ffd23f");
    c.fillStyle = bodyGradient;
    c.beginPath();
    c.ellipse(0, -16, 10, 16, -0.18, 0, FULL_CIRCLE);
    c.fill();

    // Wing (yellow with green and blue tips)
    c.save();
    c.translate(5, -24);
    c.rotate(-0.15 - wingFlap);
    c.fillStyle = "#ffc93a";
    c.beginPath();
    c.ellipse(2, 9, 6, 13, 0.15, 0, FULL_CIRCLE);
    c.fill();
    c.fillStyle = "#4cb25b";
    c.beginPath();
    c.ellipse(4, 17, 4.5, 6, 0.15, 0, FULL_CIRCLE);
    c.fill();
    c.fillStyle = "#3f86d6";
    c.beginPath();
    c.ellipse(5, 21.5, 3, 3.5, 0.15, 0, FULL_CIRCLE);
    c.fill();
    c.restore();

    // Head, face, eye and beak
    c.save();
    c.translate(-3, -33);
    c.rotate(-headTilt);
    circle(c, 0, 0, 9, "#ffa32e");
    circle(c, -3, 1.5, 5.5, "#ff6a2a");
    circle(c, -3, -1, 3, "#fff");
    circle(c, -3.5, -1, 1.6, "#1d1a22");
    c.fillStyle = "#3b3740";
    c.beginPath();
    c.moveTo(-8, -2);
    c.quadraticCurveTo(-16, 0, -12, 8);
    c.quadraticCurveTo(-10, 4, -7, 4);
    c.closePath();
    c.fill();
    c.restore();

    // Feet
    c.strokeStyle = "#8a7f88";
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(-3, -1); c.lineTo(-4, 2);
    c.moveTo(3, -1);  c.lineTo(4, 2);
    c.stroke();

    c.restore();
  }

  function drawDesk(c, t) {
    // Desk and drawer
    c.fillStyle = "#c98f6a";
    c.fillRect(660, 330, 310, 16);
    c.fillRect(672, 346, 14, 124);
    c.fillRect(944, 346, 14, 124);
    c.fillStyle = "#d9a37f";
    c.fillRect(864, 346, 80, 54);
    c.fillStyle = "#a8714e";
    c.fillRect(894, 370, 20, 4);

    // Computer
    c.fillStyle = "#d8d1df";
    roundedRect(c, 736, 322, 138, 9, 4);
    c.fill();
    c.fillStyle = "#3a3048";
    roundedRect(c, 754, 250, 104, 74, 6);
    c.fill();
    c.fillStyle = "#1d1830";
    c.fillRect(760, 256, 92, 62);

    // A résumé slowly scrolling on the screen
    c.save();
    c.beginPath();
    c.rect(760, 256, 92, 62);
    c.clip();
    const scroll = -((t * 4 * MOTION) % 40);
    c.fillStyle = "#fdf6f8";
    c.fillRect(778, 258 + scroll, 56, 110);
    c.fillStyle = "#e58aa4";
    c.fillRect(784, 264 + scroll, 30, 5);
    c.fillStyle = "#c9b6f2";
    c.fillRect(784, 272 + scroll, 20, 2.5);
    for (let i = 0; i < 9; i++) {
      const isHeading = i % 3 === 0;
      c.fillStyle = isHeading ? "#8a7a82" : "#cbbfc5";
      c.fillRect(784, 280 + scroll + i * 8, isHeading ? 22 : 40 - (i * 7) % 14, 2.5);
    }
    c.restore();

    // Two game cases and a handheld game console
    [["#f4a6c0", 0], ["#9fd3f0", 1]].forEach(function ([color, i]) {
      c.fillStyle = color;
      c.fillRect(674, 324 - i * 7, 40, 6);
      c.fillStyle = "rgba(255,255,255,.4)";
      c.fillRect(674, 324 - i * 7, 4, 6);
    });
    c.save();
    c.translate(702, 302);
    c.rotate(-0.12);
    c.fillStyle = "#c9b6f2";
    roundedRect(c, -20, -12, 40, 24, 10);
    c.fill();
    c.fillStyle = "#2a2440";
    c.fillRect(-9, -8, 18, 13);
    c.fillStyle = "#a8e0c8";
    c.fillRect(-7, -6, 14, 9);
    c.fillStyle = "#5d5160";
    c.fillRect(-17, -1, 7, 2.4);
    c.fillRect(-14.7, -3.6, 2.4, 7);
    c.fillStyle = "#f08fab";
    c.beginPath();
    c.arc(13, -2, 2, 0, FULL_CIRCLE);
    c.arc(16, 2, 2, 0, FULL_CIRCLE);
    c.fill();
    c.restore();

    // Mug
    c.fillStyle = "#a8d8ea";
    roundedRect(c, 884, 306, 22, 24, 4);
    c.fill();
    c.strokeStyle = "#a8d8ea";
    c.lineWidth = 4;
    c.beginPath();
    c.arc(908, 317, 6, -1.3, 1.3);
    c.stroke();

    // Desk lamp
    c.fillStyle = "#e58aa4";
    roundedRect(c, 918, 322, 40, 9, 4);
    c.fill();
    c.strokeStyle = "#e58aa4";
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(938, 322); c.lineTo(926, 270); c.lineTo(954, 244);
    c.stroke();
    c.fillStyle = "#f6b3c5";
    c.beginPath();
    c.moveTo(942, 234); c.lineTo(970, 252); c.lineTo(955, 276); c.lineTo(928, 260);
    c.closePath();
    c.fill();
  }

  function drawNameSignBacking(c) {
    c.fillStyle = "rgba(255,255,255,.35)";
    roundedRect(c, 676, 92, 282, 86, 14);
    c.fill();
  }

  // Darkens the room at sunset and night. Lights are drawn after this so they stay bright.
  function drawTimeOfDayTint(c, timeOfDay) {
    if (timeOfDay === "night") c.fillStyle = "rgba(30,22,70,.5)";
    else if (timeOfDay === "dusk") c.fillStyle = "rgba(255,140,90,.14)";
    else return;
    c.fillRect(-900, -400, 2800, 1600);
  }

  function drawNightLights(c, t, bulbs) {
    // Moon and twinkling stars in the window
    c.save();
    c.beginPath();
    c.rect(305, 65, 190, 170);
    c.clip();
    for (const star of windowStars) {
      c.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * (prefersReducedMotion ? 0.3 : 1.4) + star.phase));
      c.fillStyle = "#fff";
      c.fillRect(star.x, star.y, 2, 2);
    }
    c.globalAlpha = 1;
    circle(c, 458, 104, 17, "#fdf3d8");
    circle(c, 466, 98, 15, "#2a2d63");   // cuts the moon into a crescent
    c.restore();

    // Soft glows
    c.globalCompositeOperation = "lighter";
    function glow(x, y, radius, rgb, strength) {
      const gradient = c.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `rgba(${rgb},${strength})`);
      gradient.addColorStop(1, `rgba(${rgb},0)`);
      c.fillStyle = gradient;
      c.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    glow(950, 268, 190, "255,190,120", 0.42);                      // desk lamp
    glow(806, 287, 90, "255,220,235", 0.3);                        // computer screen
    glow(362, 334, 90, "255,180,210", musicPlaying ? 0.4 : 0.18);  // radio
    glow(155, 300, 150, "255,200,150", 0.16);                      // bookshelf
    glow(816, 135, 170, "255,120,170", 0.3);                       // neon sign
    const bulbGlowColors = ["255,220,140", "255,170,200", "170,230,255"];
    bulbs.forEach(([x, y], i) => glow(x, y, 16, bulbGlowColors[i % 3], 0.75 + 0.25 * Math.sin(t * 2 + i)));
    c.globalCompositeOperation = "source-over";
  }

  function drawFairyLightBulbs(c, bulbs) {
    const bulbColors = ["#ffe08c", "#ffb3c9", "#b3e6ff"];
    bulbs.forEach(([x, y], i) => circle(c, x, y, 3.4, bulbColors[i % 3]));
  }

  function drawNeonNameSign(c, t, night) {
    const flicker = prefersReducedMotion ? 1 : (Math.sin(t * 23) > 0.97 ? 0.6 : 1);
    const name = myName();

    c.save();
    c.font = '400 46px "Yellowtail", "Brush Script MT", cursive';
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.shadowColor = "#ff6fa0";
    c.shadowBlur = night ? 26 : 10;
    c.fillStyle = night ? `rgba(255,170,200,${flicker})` : "#f07ba0";
    c.fillText(name, 817, 136);
    c.shadowBlur = 0;
    if (night) {
      c.fillStyle = "#fff0f5";   // bright tube core at night
      c.globalAlpha = 0.85;
      c.fillText(name, 817, 136);
    }
    c.restore();
  }

  function drawMusicNotes(c, dt) {
    if (musicPlaying) {
      nextNoteIn -= dt;
      if (nextNoteIn < 0) {
        nextNoteIn = 0.55;
        floatingNotes.push({
          x: 338 + Math.random() * 30,
          y: 306,
          age: 0,
          color: ["#e58aa4", "#9b86d6", "#5aa6c4"][floatingNotes.length % 3],
          symbol: Math.random() < 0.5 ? "♪" : "♫",
        });
      }
    }

    floatingNotes = floatingNotes.filter(note => (note.age += dt) < 2.6);
    for (const note of floatingNotes) {
      c.globalAlpha = Math.min(1, 2.6 - note.age) * 0.9;
      c.fillStyle = note.color;
      c.font = '600 16px "Inter", system-ui, sans-serif';
      c.textAlign = "center";
      c.fillText(note.symbol, note.x + Math.sin(note.age * 3) * 6, note.y - note.age * 30 * MOTION);
    }
    c.globalAlpha = 1;
  }

  // A small speech bubble centred on x, with its tail pointing down.
  function drawBubble(c, text, x, top, background, textColor) {
    c.font = '600 13px "Inter", system-ui, sans-serif';
    const textWidth = c.measureText(text).width;
    c.fillStyle = background;
    roundedRect(c, x - textWidth / 2 - 12, top, textWidth + 24, 26, 13);
    c.fill();
    c.beginPath();
    c.moveTo(x - 5, top + 26);
    c.lineTo(x + 5, top + 26);
    c.lineTo(x, top + 33);
    c.fill();
    c.fillStyle = textColor;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(text, x, top + 13.5);
  }

  function drawHoverOutline(c, t) {
    if (!hovered || hovered.id === "mango") return;
    c.save();
    c.strokeStyle = "rgba(255,255,255,.95)";
    c.lineWidth = 3;
    c.setLineDash([7, 6]);
    c.lineDashOffset = -t * 20;   // marching ants
    roundedRect(c, hovered.x - 3, hovered.y - 4, hovered.w + 6, hovered.h + 8, 14);
    c.stroke();
    c.restore();
  }

  // Drawn in screen space (not room space) so the text stays readable at any size.
  function drawHoverLabel(c) {
    if (!hovered) return;
    if (hovered.id === "mango" && squawkTimer > 0) return;   // her speech bubble is showing instead

    let label = hovered.label;
    if (hovered.id === "radio") label = musicPlaying ? "Radio · Pause Music" : "Radio · Play Music";

    const x = clamp(view.offsetX + (hovered.x + hovered.w / 2) * view.scale, 90, width - 90);
    const y = Math.max(22, view.offsetY + hovered.y * view.scale - 18);

    c.font = '600 13px "Inter", system-ui, sans-serif';
    const textWidth = c.measureText(label).width;
    c.fillStyle = "rgba(42,34,38,.92)";
    roundedRect(c, x - textWidth / 2 - 11, y - 13, textWidth + 22, 26, 13);
    c.fill();
    c.fillStyle = "#fff";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(label, x, y + 0.5);
  }


  /* ============================================================
     One frame
     ============================================================ */

  function drawFrame(c, t, dt) {
    const timeOfDay = currentTimeOfDay();
    const night = timeOfDay === "night";

    if (squawkTimer > 0) squawkTimer -= dt;

    // Books lift smoothly while the shelf is hovered.
    const shelfHovered = hovered && hovered.id === "shelf";
    for (const book of books) {
      if (!book.projectId) continue;
      const target = shelfHovered ? 1 : 0;
      book.lift += (target - book.lift) * Math.min(1, dt * 10);
    }

    // Fill the whole canvas first (wall on top, floor below) so wide screens have no gaps.
    c.fillStyle = "#f6e2e7";
    c.fillRect(0, 0, width, view.offsetY + 470 * view.scale);
    c.fillStyle = "#e0bc98";
    c.fillRect(0, view.offsetY + 470 * view.scale, width, height);

    // Switch to room space.
    c.save();
    c.translate(view.offsetX, view.offsetY);
    c.scale(view.scale, view.scale);

    drawWallAndFloor(c);
    drawWindow(c, t, timeOfDay);
    const bulbs = drawFairyLightString(c);
    drawBookshelf(c, t);
    drawTennisPoster(c);
    drawNameSignBacking(c);
    drawCabinet(c);
    drawRadio(c, t);
    drawCamera(c);
    drawFloorPlant(c, t);
    drawRug(c);
    drawMango(c, t);
    drawDesk(c, t);

    drawTimeOfDayTint(c, timeOfDay);
    if (night) drawNightLights(c, t, bulbs);
    drawFairyLightBulbs(c, bulbs);
    drawNeonNameSign(c, t, night);
    drawMusicNotes(c, dt);

    drawHoverOutline(c, t);
    if (squawkTimer > 0) drawBubble(c, "squawk!", 522, 330, "#fff", "#5d5160");

    c.restore();   // back to screen space
    drawHoverLabel(c);
  }


  /* ============================================================
     Animation loop
     ============================================================ */

  let lastTime = performance.now();

  function loop(now) {
    const dt = Math.min(0.05, (now - lastTime) / 1000);   // seconds since last frame (capped)
    lastTime = now;

    // Only draw while the room is visible (it is hidden on other pages).
    const roomIsShowing = container.offsetParent !== null;
    if (ctx && width && isOnScreen && roomIsShowing) drawFrame(ctx, now / 1000, dt);

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();