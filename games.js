// Mahfil Chat games: Tic-Tac-Toe, Memory, Snake. Har game start(el) mein chalta hai aur (optional) stop function lautata hai.
(function () {
  const mk = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const st = document.createElement("style");
  st.textContent = `.gm-info{font-size:20px;font-weight:600;text-align:center;min-height:28px}
.gm-grid3{display:grid;grid-template-columns:repeat(3,92px);gap:8px}
.gm-grid4{display:grid;grid-template-columns:repeat(4,70px);gap:8px}
.gm-cell{height:92px;border:0;border-radius:14px;background:var(--card);font-size:40px;cursor:pointer}
.gm-grid4 .gm-cell{height:70px;font-size:32px;color:var(--mute)}
.gm-grid4 .gm-cell.on{color:inherit;background:var(--in)}
.gm-btn{border:0;border-radius:12px;padding:12px 26px;background:var(--blue);color:#fff;font-weight:600;cursor:pointer}
.gm-pad{display:grid;grid-template-columns:repeat(3,64px);gap:6px}
.gm-pad button{height:54px;border:0;border-radius:12px;background:var(--card);font-size:22px;cursor:pointer;color:inherit}`;
  document.head.appendChild(st);

  function ttt(el) {
    let b = Array(9).fill(""), over = false;
    const info = mk("div", "gm-info", "Aapki chaal (X)"), grid = mk("div", "gm-grid3"), again = mk("button", "gm-btn", "Dobara khelo");
    const L = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    const win = p => L.some(l => l.every(i => b[i] === p));
    const draw = () => { grid.innerHTML = ""; b.forEach((v, i) => { const c = mk("button", "gm-cell", v); c.onclick = () => play(i); grid.appendChild(c); }); };
    const end = t => { over = true; draw(); info.textContent = t; };
    function ai() {
      const free = b.map((v, i) => v ? null : i).filter(i => i !== null);
      const tryp = p => { for (const i of free) { b[i] = p; const w = win(p); b[i] = ""; if (w) return i; } return null; };
      let m = tryp("O"); if (m === null) m = tryp("X"); if (m === null && !b[4]) m = 4;
      if (m === null) m = free[Math.floor(Math.random() * free.length)];
      b[m] = "O";
    }
    function play(i) {
      if (over || b[i]) return; b[i] = "X";
      if (win("X")) return end("Aap jeet gaye! 🎉"); if (b.every(Boolean)) return end("Barabar rahi 🤝");
      ai(); if (win("O")) return end("Computer jeet gaya 🤖"); if (b.every(Boolean)) return end("Barabar rahi 🤝");
      draw();
    }
    again.onclick = () => { b = Array(9).fill(""); over = false; info.textContent = "Aapki chaal (X)"; draw(); };
    el.append(info, grid, again); draw();
  }

  function memory(el) {
    const em = ["🐶","🐱","🦊","🐼","🐸","🦁","🐵","🐯"];
    const cards = [...em, ...em].sort(() => Math.random() - .5);
    let open = [], done = new Set(), moves = 0, lock = false;
    const info = mk("div", "gm-info", "Chaal: 0"), grid = mk("div", "gm-grid4"), again = mk("button", "gm-btn", "Dobara khelo");
    function draw() {
      grid.innerHTML = "";
      cards.forEach((e, i) => { const show = open.includes(i) || done.has(i); const c = mk("button", "gm-cell" + (show ? " on" : ""), show ? e : "?"); c.onclick = () => flip(i); grid.appendChild(c); });
    }
    function flip(i) {
      if (lock || open.includes(i) || done.has(i)) return; open.push(i); draw();
      if (open.length < 2) return;
      moves++; info.textContent = "Chaal: " + moves; const [a, b] = open;
      if (cards[a] === cards[b]) { done.add(a); done.add(b); open = []; draw(); if (done.size === 16) info.textContent = "Jeet gaye! " + moves + " chaal mein 🎉"; }
      else { lock = true; setTimeout(() => { open = []; lock = false; draw(); }, 800); }
    }
    again.onclick = () => { el.innerHTML = ""; memory(el); };
    el.append(info, grid, again); draw();
  }

  function snake(el) {
    const N = 15, C = 20, cv = mk("canvas"), info = mk("div", "gm-info", "Score: 0"), ctx = cv.getContext("2d");
    cv.width = cv.height = N * C; cv.style.cssText = "border-radius:12px;background:#111;max-width:100%;touch-action:none";
    const dirs = { U: [0,-1], D: [0,1], L: [-1,0], R: [1,0] }, opp = { U: "D", D: "U", L: "R", R: "L" };
    let s, d, nd, food, score, t;
    const place = () => { do { food = [Math.floor(Math.random() * N), Math.floor(Math.random() * N)]; } while (s.some(p => p[0] === food[0] && p[1] === food[1])); };
    function draw() {
      ctx.fillStyle = "#111"; ctx.fillRect(0, 0, N * C, N * C);
      ctx.fillStyle = "#ff453a"; ctx.fillRect(food[0] * C + 2, food[1] * C + 2, C - 4, C - 4);
      ctx.fillStyle = "#30d158"; s.forEach(p => ctx.fillRect(p[0] * C + 1, p[1] * C + 1, C - 2, C - 2));
    }
    function step() {
      d = nd; const h = [s[0][0] + dirs[d][0], s[0][1] + dirs[d][1]];
      if (h[0] < 0 || h[1] < 0 || h[0] >= N || h[1] >= N || s.some(p => p[0] === h[0] && p[1] === h[1])) { clearInterval(t); info.textContent = "Game over! Score: " + score; return; }
      s.unshift(h);
      if (h[0] === food[0] && h[1] === food[1]) { score++; info.textContent = "Score: " + score; place(); } else s.pop();
      draw();
    }
    function reset() { s = [[7,7],[6,7],[5,7]]; d = nd = "R"; score = 0; info.textContent = "Score: 0"; place(); clearInterval(t); t = setInterval(step, 140); draw(); }
    const turn = k => { if (opp[k] !== d) nd = k; };
    const kd = e => { const m = { ArrowUp: "U", ArrowDown: "D", ArrowLeft: "L", ArrowRight: "R" }[e.key]; if (m) { e.preventDefault(); turn(m); } };
    document.addEventListener("keydown", kd);
    let sx, sy;
    cv.ontouchstart = e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; };
    cv.ontouchend = e => {
      const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
      turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "R" : "L") : (dy > 0 ? "D" : "U"));
    };
    const pad = mk("div", "gm-pad");
    [["", ""], ["▲", "U"], ["", ""], ["◀", "L"], ["▼", "D"], ["▶", "R"]].forEach(([l, k]) => {
      const b = mk("button", "", l); if (!k) b.style.visibility = "hidden"; else b.onclick = () => turn(k); pad.appendChild(b);
    });
    const again = mk("button", "gm-btn", "Dobara khelo"); again.onclick = reset;
    el.append(info, cv, pad, again); reset();
    return () => { clearInterval(t); document.removeEventListener("keydown", kd); };
  }

  window.GAMES = [
    { name: "Tic-Tac-Toe", emoji: "❌", desc: "Computer ke saath khelo", start: ttt },
    { name: "Memory Match", emoji: "🧠", desc: "Jodi milao, yaaddasht tez karo", start: memory },
    { name: "Snake", emoji: "🐍", desc: "Swipe karke saanp chalao", start: snake }
  ];

  // Ads (AdSense): index.html mein ADS_CLIENT aur ADS_SLOT bharoge tabhi dikhega
  window.renderAd = function (el) {
    if (!window.ADS_CLIENT || !el) return;
    if (!document.getElementById("adjs")) {
      const s = document.createElement("script"); s.id = "adjs"; s.async = true; s.crossOrigin = "anonymous";
      s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + window.ADS_CLIENT; document.head.appendChild(s);
    }
    const i = document.createElement("ins"); i.className = "adsbygoogle"; i.style.display = "block";
    i.dataset.adClient = window.ADS_CLIENT; i.dataset.adSlot = window.ADS_SLOT; i.dataset.adFormat = "auto"; i.dataset.fullWidthResponsive = "true";
    el.appendChild(i); try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
  };
})();
