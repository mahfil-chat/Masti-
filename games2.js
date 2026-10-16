/* Mahfil Chat — games2.js
   7 mast games: Snake, 2048, Flappy Bird, Tetris, Brick Breaker, Memory, Tic Tac Toe.
   Sab full-screen chalte hain aur bina internet ke bhi (offline) khel sakte hain.
   Ye file purani games.js ke GAMES ko badal deti hai; ads (renderAd) wahi rehte hain. */
(function () {
  "use strict";
  var DPR = Math.min(2, window.devicePixelRatio || 1);
  var BTN = "border:0;background:rgba(255,255,255,.14);color:#fff;font-size:18px;width:38px;height:38px;border-radius:50%;cursor:pointer;flex:none;line-height:1;padding:0";
  var PILL = "font-weight:700;font-size:14px;background:rgba(0,0,0,.28);padding:6px 12px;border-radius:16px;white-space:nowrap";

  /* ---------- helpers ---------- */
  var AC = null;
  function beep(f, d, type, vol) {
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume();
      var o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime;
      o.type = type || "sine"; o.frequency.value = f; g.gain.setValueAtTime(vol || 0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d);
    } catch (e) {}
  }
  function el(tag, css, parent, html) {
    var e = document.createElement(tag); if (css) e.style.cssText = css; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e;
  }
  function best(name, v, low) {
    var k = "mc_best_" + name;
    try {
      var o = localStorage.getItem(k); o = o == null ? null : +o;
      if (v != null && (o == null || (low ? v < o : v > o))) { localStorage.setItem(k, v); o = v; }
      return o == null ? (low ? 0 : 0) : o;
    } catch (e) { return v || 0; }
  }
  function lerp(a, b, t) { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rrect(cx, x, y, w, h, r) {
    cx.beginPath(); cx.moveTo(x + r, y); cx.arcTo(x + w, y, x + w, y + h, r); cx.arcTo(x + w, y + h, x, y + h, r); cx.arcTo(x, y + h, x, y, r); cx.arcTo(x, y, x + w, y, r); cx.closePath();
  }
  function swipe(target, onDir, onTap, single, th) {
    th = th || 26; var sx = 0, sy = 0, fired = false, down = false;
    target.addEventListener("pointerdown", function (e) { down = true; fired = false; sx = e.clientX; sy = e.clientY; });
    target.addEventListener("pointermove", function (e) {
      if (!down || (single && fired)) return; var dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) >= th) { fired = true; onDir(Math.abs(dx) > Math.abs(dy) ? { x: dx > 0 ? 1 : -1, y: 0 } : { x: 0, y: dy > 0 ? 1 : -1 }); sx = e.clientX; sy = e.clientY; }
    });
    target.addEventListener("pointerup", function () { if (down && !fired && onTap) onTap(); down = false; });
    target.addEventListener("pointercancel", function () { down = false; });
  }

  /* full-screen shell: header (✕ title score ↻) + khel ka maidan */
  function shell(b, title, cfg) {
    b.innerHTML = ""; cfg = cfg || {};
    var cleanups = [], ov = null;
    var root = el("div", "position:fixed;left:0;top:0;right:0;bottom:0;z-index:6;display:flex;flex-direction:column;background:" + (cfg.bg || "#10142b") + ";color:#fff;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;touch-action:none;overflow:hidden;overscroll-behavior:none", b);
    var head = el("div", "display:flex;align-items:center;gap:10px;padding:calc(env(safe-area-inset-top,0px) + 8px) 12px 8px;flex:none;background:rgba(0,0,0,.25);position:relative;z-index:7", root);
    var x = el("button", BTN, head, "✕"); x.onclick = function () { document.getElementById("gback").click(); };
    el("div", "font-weight:700;font-size:17px;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis", head, title);
    var sc = el("div", PILL, head, ""), rs = el("button", BTN, head, "↻");
    var body = el("div", "flex:1;position:relative;min-height:0;overflow:hidden", root);
    try { var de = document.documentElement, rq = de.requestFullscreen || de.webkitRequestFullscreen; if (rq && !document.fullscreenElement && !document.webkitFullscreenElement) { var p = rq.call(de); if (p && p.catch) p.catch(function () {}); } } catch (e) {}
    var api = {
      root: root, body: body,
      setScore: function (h) { sc.innerHTML = h; },
      onRestart: function (f) { rs.onclick = f; },
      on: function (t, ev, fn, opt) { t.addEventListener(ev, fn, opt); cleanups.push(function () { t.removeEventListener(ev, fn, opt); }); },
      later: function (fn) { cleanups.push(fn); },
      watch: function (fn) {
        var lw = -1, lh = -1;
        function call() { var w = body.clientWidth, h = body.clientHeight; if (!w || !h || (w === lw && h === lh)) return; lw = w; lh = h; fn(w, h); }
        if (window.ResizeObserver) { var ro = new ResizeObserver(call); ro.observe(body); cleanups.push(function () { ro.disconnect(); }); }
        else api.on(window, "resize", call);
        requestAnimationFrame(call);
      },
      over: function (title, sub, fn, label) {
        api.hideOver();
        ov = el("div", "position:absolute;left:0;top:0;right:0;bottom:0;z-index:5;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:rgba(0,0,0,.58);text-align:center;padding:20px", body);
        el("div", "font-size:34px;font-weight:800", ov, title); el("div", "font-size:17px;opacity:.92", ov, sub);
        var bt = el("button", "margin-top:12px;border:0;border-radius:26px;padding:13px 32px;font-size:18px;font-weight:700;background:#34c759;color:#fff;cursor:pointer", ov, label || "▶ Dobara khelo");
        bt.onclick = function () { api.hideOver(); fn(); };
      },
      hideOver: function () { if (ov) { ov.remove(); ov = null; } },
      stop: function () {
        cleanups.forEach(function (f) { try { f(); } catch (e) {} }); cleanups = []; root.remove();
        try { if (document.fullscreenElement || document.webkitFullscreenElement) { var ex = document.exitFullscreen || document.webkitExitFullscreen, p = ex.call(document); if (p && p.catch) p.catch(function () {}); } } catch (e) {}
      }
    };
    return api;
  }
  function loop(S, fn) {
    var raf = 0, prev = 0, on = true;
    function f(now) { if (!on) return; var dt = Math.min(0.033, (now - (prev || now)) / 1000); prev = now; fn(dt, now); raf = requestAnimationFrame(f); }
    raf = requestAnimationFrame(f); S.later(function () { on = false; cancelAnimationFrame(raf); });
  }
  function canvas(parent, css) {
    var c = el("canvas", css || "position:absolute;left:0;top:0;width:100%;height:100%", parent); return { cv: c, cx: c.getContext("2d") };
  }
  function fit(c, w, h) { c.cv.width = Math.round(w * DPR); c.cv.height = Math.round(h * DPR); c.cx.setTransform(DPR, 0, 0, DPR, 0, 0); }

  /* =====================  1. SNAKE (Saap)  ===================== */
  function snake(b) {
    var S = shell(b, "🐍 Saap (Snake)", { bg: "#578a34" });
    var C = canvas(S.body, "position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.4)"), cv = C.cv, cx = C.cx;
    var hint = el("div", "position:absolute;left:0;right:0;bottom:7%;text-align:center;font-weight:700;font-size:18px;z-index:3;pointer-events:none;text-shadow:0 2px 6px rgba(0,0,0,.6)", S.body, "👆 Swipe karke shuru karo");
    var cols = 0, rows = 0, cell = 0, segs, dir, queue, apple, score, alive, oldTail, last, interval, started, bestV = best("snake");
    function paintScore() { S.setScore("🍎 " + score + " &nbsp;🏆 " + bestV); }
    function place() {
      var free = []; for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) { if (!segs.some(function (s) { return s.x === x && s.y === y; })) free.push({ x: x, y: y }); }
      apple = free.length ? free[(Math.random() * free.length) | 0] : null;
    }
    function reset() {
      var x0 = Math.floor(cols / 4), y0 = Math.floor(rows / 2);
      segs = [{ x: x0, y: y0 }, { x: x0 - 1, y: y0 }, { x: x0 - 2, y: y0 }]; oldTail = segs[2]; dir = { x: 1, y: 0 }; queue = [];
      score = 0; alive = true; started = false; interval = 150; last = performance.now(); place(); S.hideOver(); hint.style.display = "block"; paintScore();
    }
    S.watch(function (w, h) {
      cell = Math.max(18, Math.min(44, Math.floor(w / 15))); cols = Math.floor(w / cell); rows = Math.floor(h / cell);
      cv.style.width = cols * cell + "px"; cv.style.height = rows * cell + "px"; fit(C, cols * cell, rows * cell); reset();
    });
    S.onRestart(reset);
    function setDir(d) {
      if (!alive) return;
      if (!started) { started = true; last = performance.now(); hint.style.display = "none"; }
      var ref = queue.length ? queue[queue.length - 1] : dir;
      if ((d.x === -ref.x && d.y === -ref.y) || (d.x === ref.x && d.y === ref.y)) return;
      if (queue.length < 2) queue.push(d);
    }
    swipe(S.body, setDir, null, false, 22);
    S.on(window, "keydown", function (e) {
      var m = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] }[e.key];
      if (m) { e.preventDefault(); setDir({ x: m[0], y: m[1] }); }
    });
    function die() { alive = false; beep(140, .35, "sawtooth", .08); bestV = best("snake", score); paintScore(); S.over("Game Over 💀", "Score: " + score + "  ·  Best: " + bestV, reset); }
    function tick() {
      var d = queue.length ? queue.shift() : dir; dir = d;
      var nh = { x: segs[0].x + d.x, y: segs[0].y + d.y };
      if (nh.x < 0 || nh.y < 0 || nh.x >= cols || nh.y >= rows) return die();
      var eat = apple && nh.x === apple.x && nh.y === apple.y, upto = eat ? segs.length : segs.length - 1;
      for (var i = 0; i < upto; i++) if (segs[i].x === nh.x && segs[i].y === nh.y) return die();
      segs.unshift(nh);
      if (eat) { oldTail = segs[segs.length - 1]; score++; beep(700, .08, "square", .04); place(); interval = Math.max(75, interval - 2); paintScore(); }
      else oldTail = segs.pop();
    }
    function draw(now) {
      var t = (alive && started) ? Math.min(1, (now - last) / interval) : 1, x, y;
      for (y = 0; y < rows; y++) for (x = 0; x < cols; x++) { cx.fillStyle = ((x + y) & 1) ? "#a2d149" : "#aad751"; cx.fillRect(x * cell, y * cell, cell, cell); }
      if (apple) {
        var ax = (apple.x + .5) * cell, ay = (apple.y + .5) * cell, r = cell * .36 * (1 + .06 * Math.sin(now / 200));
        cx.fillStyle = "rgba(0,0,0,.15)"; cx.beginPath(); cx.ellipse(ax, ay + r * .9, r * .8, r * .3, 0, 0, 7); cx.fill();
        cx.fillStyle = "#e7471d"; cx.beginPath(); cx.arc(ax, ay, r, 0, 7); cx.fill();
        cx.fillStyle = "rgba(255,255,255,.45)"; cx.beginPath(); cx.arc(ax - r * .35, ay - r * .35, r * .25, 0, 7); cx.fill();
        cx.fillStyle = "#3b8a2a"; cx.beginPath(); cx.ellipse(ax + r * .25, ay - r * 1.05, r * .38, r * .2, -.6, 0, 7); cx.fill();
      }
      var n = segs.length, pts = [lerp(segs[1] || segs[0], segs[0], t)]; for (var i = 1; i < n; i++) pts.push(segs[i]); pts.push(lerp(oldTail, segs[n - 1], t));
      cx.lineCap = "round"; cx.lineJoin = "round"; cx.lineWidth = cell * .78; cx.strokeStyle = alive ? "#4674e9" : "#8497d6"; cx.beginPath();
      pts.forEach(function (p, i) { var px = (p.x + .5) * cell, py = (p.y + .5) * cell; i ? cx.lineTo(px, py) : cx.moveTo(px, py); }); cx.stroke();
      var hx = (pts[0].x + .5) * cell, hy = (pts[0].y + .5) * cell, qx = -dir.y, qy = dir.x;
      for (var s = -1; s <= 1; s += 2) {
        var ex = hx + dir.x * cell * .14 + qx * s * cell * .2, ey = hy + dir.y * cell * .14 + qy * s * cell * .2;
        cx.fillStyle = "#fff"; cx.beginPath(); cx.arc(ex, ey, cell * .15, 0, 7); cx.fill();
        cx.fillStyle = "#111"; cx.beginPath(); cx.arc(ex + dir.x * cell * .04, ey + dir.y * cell * .04, cell * .075, 0, 7); cx.fill();
      }
    }
    loop(S, function (dt, now) { if (!cols) return; if (alive && started && now - last >= interval) { last = now; tick(); } draw(now); });
    return S.stop;
  }

  /* =====================  2. 2048  ===================== */
  function g2048(b) {
    var S = shell(b, "2048", { bg: "#1d1a2f" });
    var wrap = el("div", "position:absolute;left:0;top:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center", S.body);
    var board = el("div", "position:relative;border-radius:14px;background:#3a3552", wrap), bgL = el("div", "position:absolute;left:0;top:0;right:0;bottom:0", board), tl = el("div", "position:absolute;left:0;top:0;right:0;bottom:0", board);
    var COL = { 2: ["#eee4da", "#776e65"], 4: ["#ede0c8", "#776e65"], 8: ["#f2b179", "#fff"], 16: ["#f59563", "#fff"], 32: ["#f67c5f", "#fff"], 64: ["#f65e3b", "#fff"], 128: ["#edcf72", "#fff"], 256: ["#edcc61", "#fff"], 512: ["#edc850", "#fff"], 1024: ["#edc53f", "#fff"], 2048: ["#edc22e", "#fff"] };
    var bs = 0, gap = 0, cell = 0, tiles = [], grid, score = 0, bestV = best("2048"), busy = false, ended = false, won = false;
    function paintScore() { S.setScore("⭐ " + score + " &nbsp;🏆 " + bestV); }
    function pos(t) { t.el.style.transform = "translate(" + (gap + t.c * (cell + gap)) + "px," + (gap + t.r * (cell + gap)) + "px)"; }
    function paint(t) { var c = COL[t.v] || ["#3c3a32", "#fff"]; t.in.textContent = t.v; t.in.style.background = c[0]; t.in.style.color = c[1]; t.in.style.fontSize = Math.round(cell * (t.v < 100 ? .5 : t.v < 1000 ? .4 : .32)) + "px"; }
    function sizeTile(t) { t.el.style.width = t.el.style.height = cell + "px"; }
    function popAnim(t) { if (t.in.animate) t.in.animate([{ transform: "scale(.4)" }, { transform: "scale(1.12)" }, { transform: "scale(1)" }], { duration: 190 }); }
    function addTile(r, c, v) {
      var t = { r: r, c: c, v: v, m: false }; t.el = el("div", "position:absolute;left:0;top:0;transition:transform .12s ease;will-change:transform", tl);
      t.in = el("div", "width:100%;height:100%;border-radius:9px;display:flex;align-items:center;justify-content:center;font-weight:800", t.el);
      sizeTile(t); paint(t); pos(t); tiles.push(t); grid[r][c] = t; popAnim(t); return t;
    }
    function spawn() {
      var free = []; for (var r = 0; r < 4; r++) for (var c = 0; c < 4; c++) if (!grid[r][c]) free.push([r, c]);
      if (!free.length) return; var p = free[(Math.random() * free.length) | 0]; addTile(p[0], p[1], Math.random() < .9 ? 2 : 4);
    }
    function canMove() {
      for (var r = 0; r < 4; r++) for (var c = 0; c < 4; c++) { var t = grid[r][c]; if (!t) return true; if (c < 3 && grid[r][c + 1] && grid[r][c + 1].v === t.v) return true; if (r < 3 && grid[r + 1][c] && grid[r + 1][c].v === t.v) return true; }
      return false;
    }
    function newGame() {
      tiles.forEach(function (t) { t.el.remove(); }); tiles = []; grid = [[], [], [], []]; for (var r = 0; r < 4; r++) for (var c = 0; c < 4; c++) grid[r][c] = null;
      score = 0; ended = false; won = false; busy = false; S.hideOver(); paintScore(); spawn(); spawn();
    }
    S.watch(function (w, h) {
      bs = Math.floor(Math.min(w, h) * .94); gap = Math.round(bs * .03); cell = (bs - gap * 5) / 4;
      board.style.width = board.style.height = bs + "px"; bgL.innerHTML = "";
      for (var i = 0; i < 16; i++) { var r = (i / 4) | 0, c = i % 4; el("div", "position:absolute;left:0;top:0;width:" + cell + "px;height:" + cell + "px;border-radius:9px;background:rgba(255,255,255,.07);transform:translate(" + (gap + c * (cell + gap)) + "px," + (gap + r * (cell + gap)) + "px)", bgL); }
      if (!grid) newGame(); else tiles.forEach(function (t) { sizeTile(t); paint(t); pos(t); });
    });
    S.onRestart(newGame);
    function cellAt(d, i, k) { return d.x === -1 ? [i, k] : d.x === 1 ? [i, 3 - k] : d.y === -1 ? [k, i] : [3 - k, i]; }
    function flash(msg) { var f = el("div", "position:absolute;left:0;right:0;top:12%;text-align:center;font-size:26px;font-weight:800;z-index:4;pointer-events:none;text-shadow:0 2px 8px rgba(0,0,0,.6)", S.body, msg); setTimeout(function () { f.remove(); }, 1800); }
    function move(d) {
      if (busy || ended) return; var moved = false, gained = 0, gone = [], out = [];
      for (var i = 0; i < 4; i++) {
        var line = [], placed = [], k, p;
        for (k = 0; k < 4; k++) { p = cellAt(d, i, k); if (grid[p[0]][p[1]]) line.push(grid[p[0]][p[1]]); }
        line.forEach(function (t) { var l = placed[placed.length - 1]; if (l && !l.m && l.v === t.v) { l.v *= 2; l.m = true; gained += l.v; t.into = l; gone.push(t); } else placed.push(t); });
        placed.forEach(function (t, kk) { var q = cellAt(d, i, kk); if (t.r !== q[0] || t.c !== q[1]) moved = true; t.r = q[0]; t.c = q[1]; out.push(t); });
      }
      if (!moved && !gone.length) return;
      gone.forEach(function (t) { t.r = t.into.r; t.c = t.into.c; });
      for (var r = 0; r < 4; r++) for (var c = 0; c < 4; c++) grid[r][c] = null;
      out.forEach(function (t) { grid[t.r][t.c] = t; }); tiles.forEach(pos); busy = true; beep(300, .05, "triangle", .04);
      setTimeout(function () {
        gone.forEach(function (t) { t.el.remove(); tiles.splice(tiles.indexOf(t), 1); });
        out.forEach(function (t) { if (t.m) { t.m = false; paint(t); popAnim(t); if (t.v === 2048 && !won) { won = true; flash("🎉 2048 ban gaya!"); } } });
        score += gained; bestV = best("2048", score); paintScore(); spawn(); busy = false;
        if (!canMove()) { ended = true; S.over("Game Over 😵", "Score: " + score + "  ·  Best: " + bestV, newGame); }
      }, 125);
    }
    swipe(S.body, move, null, true, 24);
    S.on(window, "keydown", function (e) {
      var m = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] }[e.key];
      if (m) { e.preventDefault(); move({ x: m[0], y: m[1] }); }
    });
    return S.stop;
  }

  /* =====================  3. FLAPPY BIRD  ===================== */
  function flappy(b) {
    var S = shell(b, "🐤 Flappy Bird", { bg: "#4ec0ca" });
    var C = canvas(S.body), cx = C.cx, W = 0, H = 0, u = 1, st = "ready", bird, pipes, score, gx = 0, clouds = [], tm = 0, bestV = best("flappy");
    function paintScore() { S.setScore("🏆 " + bestV); }
    function reset() {
      bird = { x: W * .28, y: H * .42, v: 0, r: 15 * u, rot: 0 }; pipes = []; score = 0; st = "ready"; S.hideOver(); paintScore();
    }
    S.watch(function (w, h) {
      W = w; H = h; u = H / 640; fit(C, w, h); clouds = []; for (var i = 0; i < 5; i++) clouds.push({ x: Math.random() * W, y: (20 + Math.random() * 200) * u, s: (.6 + Math.random() * .8) * u });
      reset();
    });
    S.onRestart(reset);
    function flap() {
      if (st === "ready") st = "play"; if (st !== "play") return; bird.v = -430 * u; beep(520, .07, "triangle", .05);
    }
    S.body.addEventListener("pointerdown", flap);
    S.on(window, "keydown", function (e) { if (e.key === " " || e.key === "ArrowUp") { e.preventDefault(); flap(); } });
    function hitRect(rx, ry, rw, rh) { var nx = clamp(bird.x, rx, rx + rw), ny = clamp(bird.y, ry, ry + rh), dx = bird.x - nx, dy = bird.y - ny, r = bird.r * .85; return dx * dx + dy * dy < r * r; }
    function die() {
      if (st === "dead") return; st = "dead"; beep(160, .3, "sawtooth", .08); bird.v = -180 * u; bestV = best("flappy", score); paintScore();
      setTimeout(function () { S.over("Game Over 💥", "Score: " + score + "  ·  Best: " + bestV, reset); }, 700);
    }
    function update(dt) {
      var g = 1500 * u, sp = 165 * u, gh = 70 * u, gap = 175 * u, pw = 62 * u, i; tm += dt;
      clouds.forEach(function (c) { c.x -= 12 * c.s * dt * 3; if (c.x < -120 * c.s) c.x = W + 60 * c.s; });
      if (st === "ready") { bird.y = H * .42 + Math.sin(tm * 5) * 8 * u; bird.rot = 0; gx = (gx + sp * dt) % (24 * u); return; }
      if (st !== "dead") gx = (gx + sp * dt) % (24 * u);
      bird.v += g * dt; bird.y += bird.v * dt; bird.rot = clamp(bird.v / (650 * u), -.45, 1.3);
      if (st === "play") {
        if (!pipes.length || pipes[pipes.length - 1].x < W - 250 * u) pipes.push({ x: W + 10 * u, gy: 60 * u + gap / 2 + Math.random() * (H - gh - 120 * u - gap), pass: false });
        for (i = pipes.length - 1; i >= 0; i--) {
          var p = pipes[i]; p.x -= sp * dt;
          if (p.x + pw < -10) { pipes.splice(i, 1); continue; }
          if (!p.pass && p.x + pw < bird.x) { p.pass = true; score++; beep(880, .07, "square", .04); }
          if (hitRect(p.x, 0, pw, p.gy - gap / 2) || hitRect(p.x, p.gy + gap / 2, pw, H)) die();
        }
        if (bird.y - bird.r < 0) { bird.y = bird.r; bird.v = 0; }
      }
      if (bird.y + bird.r >= H - gh) { bird.y = H - gh - bird.r; if (st === "play") die(); bird.v = 0; }
    }
    function draw() {
      var gh = 70 * u, gap = 175 * u, pw = 62 * u, gr = cx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#4ec0ca"); gr.addColorStop(1, "#bfeaf0"); cx.fillStyle = gr; cx.fillRect(0, 0, W, H);
      cx.fillStyle = "rgba(255,255,255,.85)"; clouds.forEach(function (c) { var s = c.s; cx.beginPath(); cx.arc(c.x, c.y, 22 * s, 0, 7); cx.arc(c.x + 24 * s, c.y - 8 * s, 28 * s, 0, 7); cx.arc(c.x + 52 * s, c.y, 22 * s, 0, 7); cx.fill(); });
      cx.fillStyle = "#9bd9a4"; for (var k = 0; k < 7; k++) { var bx = k * 70 * u, bh = (40 + (k * 37) % 50) * u; cx.fillRect(bx, H - gh - bh, 52 * u, bh); }
      pipes.forEach(function (p) {
        function pipe(y, h, cap) {
          var g = cx.createLinearGradient(p.x, 0, p.x + pw, 0); g.addColorStop(0, "#5aa51e"); g.addColorStop(.4, "#9be34b"); g.addColorStop(1, "#4b8a17"); cx.fillStyle = g; cx.fillRect(p.x, y, pw, h); cx.strokeStyle = "#2f5a0d"; cx.lineWidth = 2 * u; cx.strokeRect(p.x, y, pw, h);
          var cy = cap ? y + h - 24 * u : y; cx.fillStyle = g; cx.fillRect(p.x - 4 * u, cy, pw + 8 * u, 24 * u); cx.strokeRect(p.x - 4 * u, cy, pw + 8 * u, 24 * u);
        }
        pipe(0, p.gy - gap / 2, true); pipe(p.gy + gap / 2, H, false);
      });
      cx.fillStyle = "#ded895"; cx.fillRect(0, H - gh, W, gh); cx.fillStyle = "#73bf2e"; cx.fillRect(0, H - gh, W, 14 * u);
      cx.fillStyle = "#8ed63f"; for (var x = -24 * u + (-gx); x < W; x += 24 * u) { cx.beginPath(); cx.moveTo(x, H - gh); cx.lineTo(x + 12 * u, H - gh); cx.lineTo(x + 24 * u, H - gh + 14 * u); cx.lineTo(x + 12 * u, H - gh + 14 * u); cx.fill(); }
      cx.save(); cx.translate(bird.x, bird.y); cx.rotate(bird.rot); var r = bird.r;
      cx.fillStyle = "#f8d030"; cx.strokeStyle = "#8a5a00"; cx.lineWidth = 2 * u; cx.beginPath(); cx.ellipse(0, 0, r * 1.2, r, 0, 0, 7); cx.fill(); cx.stroke();
      cx.fillStyle = "#fff"; cx.beginPath(); cx.arc(r * .55, -r * .35, r * .38, 0, 7); cx.fill(); cx.stroke(); cx.fillStyle = "#111"; cx.beginPath(); cx.arc(r * .68, -r * .35, r * .16, 0, 7); cx.fill();
      cx.fillStyle = "#f55"; cx.beginPath(); cx.ellipse(r * 1.1, r * .3, r * .5, r * .28, 0, 0, 7); cx.fill(); cx.stroke();
      cx.fillStyle = "#fff3b0"; cx.beginPath(); cx.ellipse(-r * .35, r * .15 + Math.sin(tm * 25) * r * .12, r * .6, r * .36, -.3, 0, 7); cx.fill(); cx.stroke(); cx.restore();
      if (st !== "ready") { cx.font = "800 " + 54 * u + "px sans-serif"; cx.textAlign = "center"; cx.lineWidth = 6 * u; cx.strokeStyle = "#222"; cx.fillStyle = "#fff"; cx.strokeText(score, W / 2, 110 * u); cx.fillText(score, W / 2, 110 * u); }
      else { cx.font = "800 " + 26 * u + "px sans-serif"; cx.textAlign = "center"; cx.lineWidth = 5 * u; cx.strokeStyle = "#222"; cx.fillStyle = "#fff"; cx.strokeText("👆 Tap karo", W / 2, H * .62); cx.fillText("👆 Tap karo", W / 2, H * .62); }
    }
    loop(S, function (dt) { if (!W) return; update(dt); draw(); });
    return S.stop;
  }

  /* =====================  4. TETRIS  ===================== */
  function tetris(b) {
    var S = shell(b, "🧩 Tetris", { bg: "#0d1021" });
    var wrap = el("div", "position:absolute;left:0;top:0;right:0;bottom:0;display:flex;flex-direction:column", S.body), area = el("div", "flex:1;position:relative;min-height:0", wrap);
    var C = canvas(area), cx = C.cx, bar = el("div", "flex:none;display:flex;justify-content:center;gap:10px;padding:8px 12px calc(10px + env(safe-area-inset-bottom,0px))", wrap);
    var SH = { I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], O: [[1, 1], [1, 1]], T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]], S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]], Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]], J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]], L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]] };
    var CL = { I: "#00e5ff", O: "#ffd600", T: "#b388ff", S: "#69f0ae", Z: "#ff5252", J: "#448aff", L: "#ffab40" };
    var W = 0, H = 0, cell = 0, board, cur, nextK, bag = [], score, lines, level, acc, alive, bestV = best("tetris");
    function paintScore() { S.setScore("⭐ " + score + " &nbsp;Lv " + level); }
    function draw7() { if (!bag.length) { bag = "IOTSZJL".split(""); for (var i = bag.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0, t = bag[i]; bag[i] = bag[j]; bag[j] = t; } } return bag.pop(); }
    function rot(m) { return m[0].map(function (_, i) { return m.map(function (r) { return r[i]; }).reverse(); }); }
    function collide(m, x, y) {
      for (var r = 0; r < m.length; r++) for (var c = 0; c < m[r].length; c++) if (m[r][c]) { var nx = x + c, ny = y + r; if (nx < 0 || nx >= 10 || ny >= 20) return true; if (ny >= 0 && board[ny][nx]) return true; }
      return false;
    }
    function spawn() {
      var k = nextK || draw7(); nextK = draw7(); var m = SH[k].map(function (r) { return r.slice(); });
      cur = { k: k, m: m, x: Math.floor((10 - m[0].length) / 2), y: 0 }; if (collide(cur.m, cur.x, cur.y)) over();
    }
    function over() { alive = false; beep(120, .5, "sawtooth", .08); bestV = best("tetris", score); S.over("Game Over 🧱", "Score: " + score + "  ·  Best: " + bestV, reset); }
    function reset() { board = []; for (var r = 0; r < 20; r++) board.push(new Array(10).fill(null)); score = 0; lines = 0; level = 1; acc = 0; alive = true; bag = []; nextK = null; S.hideOver(); spawn(); paintScore(); }
    function speed() { return Math.max(90, 820 - (level - 1) * 70); }
    function lock() {
      cur.m.forEach(function (row, r) { row.forEach(function (v, c) { if (v && cur.y + r >= 0) board[cur.y + r][cur.x + c] = CL[cur.k]; }); });
      var n = 0; for (var r = 19; r >= 0; r--) { if (board[r].every(Boolean)) { board.splice(r, 1); board.unshift(new Array(10).fill(null)); n++; r++; } }
      if (n) { score += [0, 100, 300, 500, 800][n] * level; lines += n; level = 1 + Math.floor(lines / 10); beep(600 + n * 150, .15, "square", .05); } else beep(200, .05, "triangle", .05);
      paintScore(); spawn();
    }
    function step(dx, dy) { if (!alive) return false; if (!collide(cur.m, cur.x + dx, cur.y + dy)) { cur.x += dx; cur.y += dy; return true; } return false; }
    function down() { if (!step(0, 1)) lock(); acc = 0; }
    function rotate() {
      if (!alive) return; var m = rot(cur.m), kicks = [0, -1, 1, -2, 2];
      for (var i = 0; i < kicks.length; i++) if (!collide(m, cur.x + kicks[i], cur.y)) { cur.m = m; cur.x += kicks[i]; beep(420, .04, "triangle", .04); return; }
    }
    function hard() { if (!alive) return; while (step(0, 1)) score += 2; lock(); acc = 0; }
    S.watch(function (w, h) { W = w; H = h; fit(C, w, h); cell = Math.max(10, Math.floor(Math.min(h / 20, (w - 8) / 14.6))); });
    S.onRestart(reset); reset();
    var defs = [["◀", function () { step(-1, 0); }, 1], ["⟳", rotate, 0], ["▶", function () { step(1, 0); }, 1], ["▼", down, 1], ["⤓", hard, 0]];
    defs.forEach(function (d) {
      var bt = el("button", "flex:1;max-width:80px;height:58px;border:0;border-radius:16px;background:rgba(255,255,255,.13);color:#fff;font-size:24px;cursor:pointer;touch-action:none", bar, d[0]), iv = 0, to = 0;
      function stop() { clearTimeout(to); clearInterval(iv); }
      bt.addEventListener("pointerdown", function (e) { e.preventDefault(); d[1](); if (d[2]) { stop(); to = setTimeout(function () { iv = setInterval(d[1], 85); }, 220); } });
      ["pointerup", "pointerleave", "pointercancel"].forEach(function (ev) { bt.addEventListener(ev, stop); }); S.later(stop);
    });
    S.on(window, "keydown", function (e) {
      var k = e.key; if (k === "ArrowLeft") step(-1, 0); else if (k === "ArrowRight") step(1, 0); else if (k === "ArrowDown") down(); else if (k === "ArrowUp") rotate(); else if (k === " ") hard(); else return; e.preventDefault();
    });
    function blk(x, y, col, a) {
      cx.globalAlpha = a || 1; cx.fillStyle = col; rrect(cx, x + 1, y + 1, cell - 2, cell - 2, cell * .16); cx.fill();
      cx.fillStyle = "rgba(255,255,255,.28)"; cx.fillRect(x + 3, y + 3, cell - 6, Math.max(2, cell * .14)); cx.globalAlpha = 1;
    }
    loop(S, function (dt) {
      if (!W) return; if (alive) { acc += dt * 1000; if (acc >= speed()) down(); }
      var tw = cell * 14.6, ox = Math.round((W - tw) / 2), oy = Math.round((H - cell * 20) / 2), r, c;
      cx.clearRect(0, 0, W, H); cx.fillStyle = "#151a38"; rrect(cx, ox - 4, oy - 4, cell * 10 + 8, cell * 20 + 8, 8); cx.fill();
      cx.strokeStyle = "rgba(255,255,255,.05)"; cx.lineWidth = 1; for (c = 1; c < 10; c++) { cx.beginPath(); cx.moveTo(ox + c * cell, oy); cx.lineTo(ox + c * cell, oy + 20 * cell); cx.stroke(); }
      for (r = 1; r < 20; r++) { cx.beginPath(); cx.moveTo(ox, oy + r * cell); cx.lineTo(ox + 10 * cell, oy + r * cell); cx.stroke(); }
      for (r = 0; r < 20; r++) for (c = 0; c < 10; c++) if (board[r][c]) blk(ox + c * cell, oy + r * cell, board[r][c]);
      if (alive) {
        var gy = cur.y; while (!collide(cur.m, cur.x, gy + 1)) gy++;
        cur.m.forEach(function (row, rr) { row.forEach(function (v, cc) { if (v) { if (gy + rr >= 0) blk(ox + (cur.x + cc) * cell, oy + (gy + rr) * cell, CL[cur.k], .22); if (cur.y + rr >= 0) blk(ox + (cur.x + cc) * cell, oy + (cur.y + rr) * cell, CL[cur.k]); } }); });
      }
      var px = ox + 10 * cell + cell * .7, pw = cell * 3.9; cx.fillStyle = "#fff"; cx.font = "700 " + Math.round(cell * .62) + "px sans-serif"; cx.textAlign = "left";
      cx.fillText("NEXT", px, oy + cell * .8); cx.fillStyle = "#151a38"; rrect(cx, px, oy + cell, pw, cell * 3.2, 10); cx.fill();
      if (nextK) { var nm = SH[nextK], nw = nm[0].length, nh = nm.length, nox = px + (pw - nw * cell * .8) / 2, noy = oy + cell + (cell * 3.2 - nh * cell * .8) / 2; var oc = cell; cell = cell * .8; nm.forEach(function (row, rr) { row.forEach(function (v, cc) { if (v) blk(nox + cc * cell, noy + rr * cell, CL[nextK]); }); }); cell = oc; }
      cx.fillStyle = "#fff"; cx.fillText("LEVEL", px, oy + cell * 5.4); cx.fillText(level, px, oy + cell * 6.2); cx.fillText("LINES", px, oy + cell * 7.6); cx.fillText(lines, px, oy + cell * 8.4); cx.fillText("BEST", px, oy + cell * 9.8); cx.fillText(bestV, px, oy + cell * 10.6);
    });
    return S.stop;
  }

  /* =====================  5. BRICK BREAKER  ===================== */
  function breakout(b) {
    var S = shell(b, "🏓 Brick Breaker", { bg: "#101530" });
    var C = canvas(S.body), cx = C.cx, W = 0, H = 0, u = 1, pad, ball, bricks, lives, score, level, st, bestV = best("brick");
    var RC = ["#ff5252", "#ff9800", "#ffd600", "#69f0ae", "#40c4ff", "#b388ff", "#ff80ab", "#a1887f", "#90a4ae"];
    function paintScore() { S.setScore("❤️ " + lives + " &nbsp;⭐ " + score); }
    function build() {
      bricks = []; var cols = 8, rows = Math.min(9, 4 + level), m = 10 * u, bw = (W - m * 2) / cols, bh = Math.max(16, 22 * (H / 640));
      for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) bricks.push({ x: m + c * bw, y: 30 * u + r * (bh + 4), w: bw - 4, h: bh, hp: r < 2 && level > 1 ? 2 : 1, col: RC[r % RC.length] });
    }
    function sp() { return (H / 640) * (400 + level * 35); }
    function stick() { ball = { x: pad.x, y: pad.y - 9 * u - 2, vx: 0, vy: 0, r: 8 * u, stuck: true, px: 0, py: 0 }; }
    function reset() { lives = 3; score = 0; level = 1; build(); stick(); st = "play"; S.hideOver(); paintScore(); }
    S.watch(function (w, h) { W = w; H = h; u = Math.min(w / 360, h / 640); fit(C, w, h); pad = { x: w / 2, w: Math.max(80 * u, w * .22), h: 14 * u, y: h - 70 * u }; reset(); });
    S.onRestart(reset);
    function launch() { if (ball.stuck && st === "play") { ball.stuck = false; var a = (Math.random() * .6 - .3), s = sp(); ball.vx = s * Math.sin(a); ball.vy = -s * Math.cos(a); beep(500, .06, "triangle", .05); } }
    function moveTo(e) { var r = S.body.getBoundingClientRect(); pad.x = clamp(e.clientX - r.left, pad.w / 2, W - pad.w / 2); }
    S.body.addEventListener("pointermove", function (e) { if (pad) moveTo(e); });
    S.body.addEventListener("pointerdown", function (e) { if (pad) { moveTo(e); launch(); } });
    var keys = {}; S.on(window, "keydown", function (e) { keys[e.key] = 1; if (e.key === " " || e.key === "ArrowUp") { e.preventDefault(); launch(); } }); S.on(window, "keyup", function (e) { keys[e.key] = 0; });
    function loseLife() { lives--; paintScore(); beep(150, .3, "sawtooth", .07); if (lives <= 0) { st = "over"; bestV = best("brick", score); S.over("Game Over 💔", "Score: " + score + "  ·  Best: " + bestV, reset); } else stick(); }
    function update(dt) {
      if (keys.ArrowLeft) pad.x = clamp(pad.x - 520 * u * dt, pad.w / 2, W - pad.w / 2); if (keys.ArrowRight) pad.x = clamp(pad.x + 520 * u * dt, pad.w / 2, W - pad.w / 2);
      if (st !== "play") return; if (ball.stuck) { ball.x = pad.x; ball.y = pad.y - pad.h / 2 - ball.r - 1; return; }
      ball.px = ball.x; ball.py = ball.y; ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      if (ball.x < ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); } if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); } if (ball.y < ball.r) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); }
      if (ball.vy > 0 && ball.y + ball.r >= pad.y - pad.h / 2 && ball.y + ball.r <= pad.y + pad.h && Math.abs(ball.x - pad.x) <= pad.w / 2 + ball.r) {
        var hit = clamp((ball.x - pad.x) / (pad.w / 2), -1, 1), ang = hit * 1.05, s = Math.max(sp(), Math.hypot(ball.vx, ball.vy)); ball.vx = s * Math.sin(ang); ball.vy = -s * Math.cos(ang); ball.y = pad.y - pad.h / 2 - ball.r; beep(380, .05, "triangle", .05);
      }
      if (ball.y - ball.r > H) return loseLife();
      for (var i = 0; i < bricks.length; i++) {
        var k = bricks[i]; if (k.hp <= 0) continue; var nx = clamp(ball.x, k.x, k.x + k.w), ny = clamp(ball.y, k.y, k.y + k.h), dx = ball.x - nx, dy = ball.y - ny;
        if (dx * dx + dy * dy < ball.r * ball.r) {
          if (ball.px < k.x || ball.px > k.x + k.w) ball.vx = -ball.vx; else ball.vy = -ball.vy;
          k.hp--; score += 10 * level; beep(k.hp ? 300 : 640, .05, "square", .04); paintScore(); break;
        }
      }
      if (bricks.every(function (k) { return k.hp <= 0; })) { level++; build(); stick(); paintScore(); beep(900, .25, "triangle", .06); }
    }
    function draw() {
      var g = cx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#1b2250"); g.addColorStop(1, "#0b0e24"); cx.fillStyle = g; cx.fillRect(0, 0, W, H);
      bricks.forEach(function (k) { if (k.hp <= 0) return; cx.globalAlpha = k.hp > 1 ? 1 : .92; cx.fillStyle = k.col; rrect(cx, k.x, k.y, k.w, k.h, 5 * u); cx.fill(); cx.fillStyle = "rgba(255,255,255,.28)"; cx.fillRect(k.x + 3, k.y + 2, k.w - 6, k.h * .3); if (k.hp > 1) { cx.strokeStyle = "#fff"; cx.lineWidth = 2; rrect(cx, k.x, k.y, k.w, k.h, 5 * u); cx.stroke(); } cx.globalAlpha = 1; });
      var pg = cx.createLinearGradient(0, pad.y - pad.h / 2, 0, pad.y + pad.h / 2); pg.addColorStop(0, "#80d8ff"); pg.addColorStop(1, "#2979ff"); cx.fillStyle = pg; rrect(cx, pad.x - pad.w / 2, pad.y - pad.h / 2, pad.w, pad.h, pad.h / 2); cx.fill();
      cx.shadowColor = "#fff"; cx.shadowBlur = 14; cx.fillStyle = "#fff"; cx.beginPath(); cx.arc(ball.x, ball.y, ball.r, 0, 7); cx.fill(); cx.shadowBlur = 0;
      if (ball.stuck && st === "play") { cx.font = "700 " + 20 * u + "px sans-serif"; cx.textAlign = "center"; cx.fillStyle = "#fff"; cx.fillText("👆 Tap karo, ball chhodo", W / 2, pad.y - 60 * u); }
    }
    loop(S, function (dt) { if (!W) return; update(dt); draw(); });
    return S.stop;
  }

  /* =====================  6. MEMORY MATCH  ===================== */
  function memory(b) {
    var S = shell(b, "🧠 Memory Match", { bg: "#14213d" });
    var area = el("div", "position:absolute;left:0;top:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center", S.body), grid = el("div", "display:grid;gap:8px", area);
    var EMO = ["🐶", "🐱", "🦊", "🐼", "🐸", "🦁", "🐵", "🐧", "🦄", "🐙", "🍉", "⚽"], cards = [], first = null, lock = false, moves = 0, matched = 0, secs = 0, timer = 0, cs = 60, cols = 4, bestV = best("memory", null, true);
    function paintScore() { S.setScore("👣 " + moves + " &nbsp;⏱ " + secs + "s"); }
    function size(w, h) {
      cols = w < h ? 4 : 6; var rows = 24 / cols, gap = 8; cs = Math.max(30, Math.floor(Math.min((w - 24 - gap * (cols - 1)) / cols, (h - 24 - gap * (rows - 1)) / rows)));
      grid.style.gridTemplateColumns = "repeat(" + cols + "," + cs + "px)"; cards.forEach(function (c) { c.el.style.width = c.el.style.height = cs + "px"; c.back.style.fontSize = Math.round(cs * .55) + "px"; c.front.style.fontSize = Math.round(cs * .45) + "px"; });
    }
    function newGame() {
      clearInterval(timer); grid.innerHTML = ""; cards = []; first = null; lock = false; moves = 0; matched = 0; secs = 0; S.hideOver(); paintScore();
      var vals = EMO.concat(EMO); for (var i = vals.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0, t = vals[i]; vals[i] = vals[j]; vals[j] = t; }
      vals.forEach(function (v) {
        var d = el("div", "perspective:600px;cursor:pointer", grid), inn = el("div", "position:relative;width:100%;height:100%;transition:transform .35s;transform-style:preserve-3d", d);
        var front = el("div", "position:absolute;left:0;top:0;width:100%;height:100%;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:12px;background:linear-gradient(135deg,#4361ee,#7209b7);display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.7);font-weight:800;box-shadow:0 3px 8px rgba(0,0,0,.3)", inn, "?");
        var back = el("div", "position:absolute;left:0;top:0;width:100%;height:100%;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:12px;background:#fff;display:flex;align-items:center;justify-content:center;transform:rotateY(180deg)", inn, v);
        var c = { el: d, inn: inn, front: front, back: back, v: v, open: false, done: false }; cards.push(c); d.onclick = function () { flip(c); };
      });
      size(area.clientWidth, area.clientHeight);
      timer = setInterval(function () { secs++; paintScore(); }, 1000);
    }
    S.later(function () { clearInterval(timer); });
    function setOpen(c, o) { c.open = o; c.inn.style.transform = o ? "rotateY(180deg)" : ""; }
    function flip(c) {
      if (lock || c.open || c.done) return; setOpen(c, true); beep(500, .05, "triangle", .04);
      if (!first) { first = c; return; }
      moves++; paintScore(); var a = first; first = null; lock = true;
      if (a.v === c.v) {
        setTimeout(function () { a.done = c.done = true; a.back.style.background = c.back.style.background = "#b9fbc0"; matched++; lock = false; beep(800, .12, "square", .05); if (matched === EMO.length) win(); }, 350);
      } else setTimeout(function () { setOpen(a, false); setOpen(c, false); lock = false; }, 800);
    }
    function win() {
      clearInterval(timer); var old = bestV; bestV = best("memory", moves, true);
      S.over("Shabash! 🎉", moves + " chaal · " + secs + " second" + (old && moves < old ? "  ·  🏆 Naya record!" : "  ·  Best: " + bestV + " chaal"), newGame);
    }
    S.watch(size); S.onRestart(newGame); newGame();
    return S.stop;
  }

  /* =====================  7. TIC TAC TOE  ===================== */
  function ttt(b) {
    var S = shell(b, "⭕ Tic Tac Toe", { bg: "#1b1f3b" });
    var area = el("div", "position:absolute;left:0;top:0;right:0;bottom:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px", S.body);
    var msg = el("div", "font-size:22px;font-weight:800;text-align:center;min-height:30px", area), gridEl = el("div", "display:grid;grid-template-columns:repeat(3,1fr);gap:8px;background:transparent", area);
    var board, turn, done, tally = { w: 0, d: 0, l: 0 }, cells = [], playerStarts = true, size0 = 300;
    var LN = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    function paintScore() { S.setScore("🏆 " + tally.w + " &nbsp;🤝 " + tally.d + " &nbsp;💻 " + tally.l); }
    function winner(bd) { for (var i = 0; i < LN.length; i++) { var l = LN[i]; if (bd[l[0]] && bd[l[0]] === bd[l[1]] && bd[l[0]] === bd[l[2]]) return { p: bd[l[0]], l: l }; } return null; }
    function mm(bd, p) {
      var w = winner(bd); if (w) return w.p === "O" ? 1 : -1; if (bd.every(Boolean)) return 0;
      var bestS = p === "O" ? -2 : 2; for (var i = 0; i < 9; i++) if (!bd[i]) { bd[i] = p; var s = mm(bd, p === "O" ? "X" : "O"); bd[i] = null; if (p === "O" ? s > bestS : s < bestS) bestS = s; }
      return bestS;
    }
    function aiMove() {
      var free = []; for (var i = 0; i < 9; i++) if (!board[i]) free.push(i);
      if (Math.random() < .2) return free[(Math.random() * free.length) | 0];
      var bs = -2, pick = []; free.forEach(function (i) { board[i] = "O"; var s = mm(board, "X"); board[i] = null; if (s > bs) { bs = s; pick = [i]; } else if (s === bs) pick.push(i); });
      return pick[(Math.random() * pick.length) | 0];
    }
    function render() {
      cells.forEach(function (c, i) { var v = board[i]; c.textContent = v === "X" ? "✕" : v === "O" ? "◯" : ""; c.style.color = v === "X" ? "#4cc9f0" : "#f72585"; });
    }
    function finish() {
      var w = winner(board); done = true; var t, s;
      if (w) { w.l.forEach(function (i) { cells[i].style.background = "rgba(255,255,255,.28)"; }); if (w.p === "X") { tally.w++; t = "Aap jeet gaye! 🎉"; beep(880, .25, "triangle", .06); } else { tally.l++; t = "Computer jeet gaya 🤖"; beep(200, .3, "sawtooth", .06); } }
      else { tally.d++; t = "Barabar rahi 🤝"; }
      paintScore(); msg.textContent = t; setTimeout(function () { S.over(t, "Aapki jeet: " + tally.w + " · Barabar: " + tally.d + " · Haar: " + tally.l, newGame, "▶ Phir se"); }, 900);
    }
    function ai() {
      if (done) return; var m = aiMove(); board[m] = "O"; turn = "X"; render(); beep(330, .06, "square", .04);
      if (winner(board) || board.every(Boolean)) finish(); else msg.textContent = "Aapki baari ✕";
    }
    function tap(i) {
      if (done || turn !== "X" || board[i]) return; board[i] = "X"; turn = "O"; render(); beep(520, .06, "square", .04);
      if (winner(board) || board.every(Boolean)) return finish(); msg.textContent = "Computer soch raha hai…"; setTimeout(ai, 450);
    }
    function newGame() {
      board = new Array(9).fill(null); done = false; turn = "X"; S.hideOver(); cells.forEach(function (c) { c.style.background = "rgba(255,255,255,.1)"; }); render();
      if (!playerStarts) { turn = "O"; msg.textContent = "Computer pehle khelega…"; setTimeout(ai, 500); } else msg.textContent = "Aapki baari ✕"; playerStarts = !playerStarts;
    }
    for (var i = 0; i < 9; i++) (function (i) { var c = el("button", "border:0;border-radius:16px;background:rgba(255,255,255,.1);font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0", gridEl); c.onclick = function () { tap(i); }; cells.push(c); })(i);
    S.watch(function (w, h) { size0 = Math.floor(Math.min(w * .86, h * .66, 520)); gridEl.style.width = gridEl.style.height = size0 + "px"; cells.forEach(function (c) { c.style.fontSize = Math.round(size0 / 3 * .62) + "px"; }); });
    S.onRestart(function () { playerStarts = true; newGame(); }); paintScore(); newGame();
    return S.stop;
  }

  window.GAMES = [
    { emoji: "🐍", name: "Saap (Snake)", desc: "Swipe karo, seb khao, bade ho jao", start: snake },
    { emoji: "🔢", name: "2048", desc: "Same number jodo, 2048 banao", start: g2048 },
    { emoji: "🐤", name: "Flappy Bird", desc: "Tap karke pipes ke beech se nikalo", start: flappy },
    { emoji: "🧩", name: "Tetris", desc: "Blocks gira kar line banao", start: tetris },
    { emoji: "🏓", name: "Brick Breaker", desc: "Ball se saari eentein todo", start: breakout },
    { emoji: "🧠", name: "Memory Match", desc: "Jodi milao, kam chaal mein", start: memory },
    { emoji: "⭕", name: "Tic Tac Toe", desc: "Computer ke saath ✕ ◯", start: ttt }
  ];
})();
