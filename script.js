(function initClock() {
    // Build ticks
    const minor = document.getElementById("minorTicks");
    const hour = document.getElementById("hourTicks");
    for (let i = 0; i < 60; i++) {
        const isHour = i % 5 === 0;
        const ang = i * 6; // degrees
        const len = isHour ? 10 : 5;
        const stroke = isHour ? "#3a3a3a" : "var(--tick)";
        const sw = isHour ? 2 : 1;
        const rOuter = 92;
        const rInner = rOuter - len;
        const x1 = 100 + rInner * Math.sin(ang * Math.PI / 180);
        const y1 = 100 - rInner * Math.cos(ang * Math.PI / 180);
        const x2 = 100 + rOuter * Math.sin(ang * Math.PI / 180);
        const y2 = 100 - rOuter * Math.cos(ang * Math.PI / 180);
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", x1.toFixed(3));
        line.setAttribute("y1", y1.toFixed(3));
        line.setAttribute("x2", x2.toFixed(3));
        line.setAttribute("y2", y2.toFixed(3));
        line.setAttribute("stroke", stroke);
        line.setAttribute("stroke-width", sw);
        (isHour ? hour : minor).appendChild(line);
    }

    const hourHand = document.getElementById("hourHand");
    const minuteHand = document.getElementById("minuteHand");
    const secondHand = document.getElementById("secondHand");
    const digitalEl = document.getElementById("digital");

    function formatDigital(now) {
        // De-CH, echte lokale Zeit, 24h
        return new Intl.DateTimeFormat("de-CH", {
            hour: "2-digit", minute: "2-digit", second: "2-digit",
            hour12: false
        }).format(now);
    }

    function tick() {
        const now = new Date();
        const ms = now.getMilliseconds();
        const s = now.getSeconds() + ms / 1000;
        const m = now.getMinutes() + s / 60;
        const h = (now.getHours() % 12) + m / 60;

        const sDeg = s * 6;                   // 360 / 60
        const mDeg = m * 6;                   // 360 / 60
        const hDeg = h * 30;                  // 360 / 12

        hourHand.setAttribute("transform", `rotate(${hDeg.toFixed(3)} 100 100)`);
        minuteHand.setAttribute("transform", `rotate(${mDeg.toFixed(3)} 100 100)`);
        secondHand.setAttribute("transform", `rotate(${sDeg.toFixed(3)} 100 100)`);

        digitalEl.textContent = formatDigital(now);
        requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
})();

// ========== Hidden Mini-Snake (15x15) ==========
(function initSnake() {
    const grid = 15;
    const overlay = document.getElementById("overlay");
    const canvas = document.getElementById("snake");
    const scoreEl = document.getElementById("score");
    const ctx = canvas.getContext("2d");

    // Handle HiDPI for crisp pixels
    function fitHiDPI() {
        const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
        const cssSize = Math.min(window.innerWidth, window.innerHeight) * 0.6;
        const display = Math.min(420, Math.max(240, Math.floor(cssSize)));
        canvas.style.width = display + "px";
        canvas.style.height = display + "px";
        canvas.width = display * dpr;
        canvas.height = display * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cell = Math.floor(display / grid);
        // keep square inside
        size = cell * grid;
        viewOffsetX = Math.floor((display - size) / 2);
        viewOffsetY = Math.floor((display - size) / 2);
    }

    let cell = 24;
    let size = cell * grid;
    let viewOffsetX = 0, viewOffsetY = 0;
    fitHiDPI();
    window.addEventListener("resize", fitHiDPI);

    const state = {
        snake: [],
        dir: { x: 1, y: 0 },
        nextDir: { x: 1, y: 0 },
        apple: { x: 9, y: 9 },
        running: false,
        paused: false,
        score: 0,
        stepMs: 120,
        lastTime: 0
    };

    function resetGame() {
        state.snake = [{ x: Math.floor(grid / 2), y: Math.floor(grid / 2) }];
        state.dir = { x: 1, y: 0 };
        state.nextDir = { x: 1, y: 0 };
        state.apple = spawnApple();
        state.running = true;
        state.paused = false;
        state.score = 0;
    }

    function spawnApple() {
        while (true) {
            const x = Math.floor(Math.random() * grid);
            const y = Math.floor(Math.random() * grid);
            if (!state.snake.some(p => p.x === x && p.y === y)) return { x, y };
        }
    }

    function drawGrid() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(viewOffsetX, viewOffsetY);

        // subtle grid
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#0e0e0e";
        ctx.fillRect(0, 0, size, size);

        ctx.globalAlpha = 0.22;
        ctx.strokeStyle = "#2a2a2a";
        ctx.lineWidth = 1;
        for (let i = 1; i < grid; i++) {
            const p = i * cell + 0.5;
            ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, size); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(size, p); ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // apple
        ctx.fillStyle = "#ffffff";
        const ax = state.apple.x * cell;
        const ay = state.apple.y * cell;
        const r = Math.floor(cell * 0.28);
        ctx.beginPath();
        ctx.arc(ax + cell / 2, ay + cell / 2, r, 0, Math.PI * 2);
        ctx.fill();

        // snake
        ctx.fillStyle = "#dcdcdc";
        for (let i = 0; i < state.snake.length; i++) {
            const s = state.snake[i];
            const x = s.x * cell;
            const y = s.y * cell;
            const pad = 2;
            ctx.fillRect(x + pad, y + pad, cell - pad * 2, cell - pad * 2);
        }

        ctx.restore();
    }

    function step(t) {
        if (!state.running) return;
        if (state.paused) { drawGrid(); requestAnimationFrame(step); return; }

        if (t - state.lastTime >= state.stepMs) {
            state.lastTime = t;
            // apply nextDir if not reversing
            if ((state.dir.x + state.nextDir.x !== 0) || (state.dir.y + state.nextDir.y !== 0)) {
                state.dir = { ...state.nextDir };
            }
            const head = state.snake[0];
            const nx = head.x + state.dir.x;
            const ny = head.y + state.dir.y;

            // collisions: wall
            if (nx < 0 || nx >= grid || ny < 0 || ny >= grid) {
                gameOver(); return;
            }
            // collisions: self
            if (state.snake.some(p => p.x === nx && p.y === ny)) {
                gameOver(); return;
            }

            // move
            state.snake.unshift({ x: nx, y: ny });

            // apple?
            if (nx === state.apple.x && ny === state.apple.y) {
                state.score += 1;
                scoreEl.textContent = "Score " + String(state.score).padStart(3, "0");
                state.apple = spawnApple();
                // optional: speedup minimal
                if (state.stepMs > 60) state.stepMs -= 2;
            } else {
                state.snake.pop();
            }
        }

        drawGrid();
        requestAnimationFrame(step);
    }

    function gameOver() {
        state.running = false;
        // flash
        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = "#111111";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
        // restart after short delay
        setTimeout(() => {
            resetGame();
            requestAnimationFrame(step);
        }, 900);
    }

    function openOverlay() {
        if (overlay.classList.contains("show")) return;
        overlay.classList.add("show");
        overlay.setAttribute("aria-hidden", "false");
        resetGame();
        scoreEl.textContent = "Score 000";
        requestAnimationFrame(step);
    }

    function closeOverlay() {
        overlay.classList.remove("show");
        overlay.setAttribute("aria-hidden", "true");
        state.running = false;
    }

    // Controls
    function handleKey(e) {
        if (e.key === "s" || e.key === "S") {
            openOverlay();
            e.preventDefault();
            return;
        }
        if (!overlay.classList.contains("show")) return;

        switch (e.key) {
            case "ArrowUp":
                if (state.dir.y !== 1) state.nextDir = { x: 0, y: -1 };
                e.preventDefault(); break;
            case "ArrowDown":
                if (state.dir.y !== -1) state.nextDir = { x: 0, y: 1 };
                e.preventDefault(); break;
            case "ArrowLeft":
                if (state.dir.x !== 1) state.nextDir = { x: -1, y: 0 };
                e.preventDefault(); break;
            case "ArrowRight":
                if (state.dir.x !== -1) state.nextDir = { x: 1, y: 0 };
                e.preventDefault(); break;
            case "p":
            case "P":
                state.paused = !state.paused; break;
            case "Escape":
                closeOverlay(); break;
        }
    }
    window.addEventListener("keydown", handleKey, { passive: false });

    // Optional: dreifach-Klick auf die Uhr oeffnet Snake
    let clickCount = 0;
    const clockArea = document.getElementById("clockArea");
    clockArea.addEventListener("click", () => {
        clickCount++;
        if (clickCount === 3) {
            openOverlay();
            clickCount = 0;
        }
        setTimeout(() => { clickCount = 0; }, 450);
    });

    overlay.addEventListener("click", (e) => {
        // Klick ausserhalb des Panels schliesst
        if (e.target === overlay) closeOverlay();
    });
})();

// Fun: kleiner Anti-Burn-in drift der Uhr
(function gentleDrift() {
    const area = document.getElementById("clockArea");
    let t = 0;
    function loop() {
        t += 0.0022;
        const x = Math.sin(t) * 1.6;  // sehr dezent
        const y = Math.cos(t * 0.9) * 1.6;
        area.style.transform = `translate(${x}vmin, ${y}vmin)`;
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
})();


(function workbarUpdate() {
    const bar = document.getElementById("workbar");
    function update() {
        const now = new Date();
        const start = new Date(now); start.setHours(8,0,0,0);
        const end   = new Date(now); end.setHours(17,0,0,0);
        let pct;
        if (now <= start) pct = 0;
        else if (now >= end) pct = 100;
        else pct = ((now - start) / (end - start)) * 100;
        bar.style.width = pct + "%";
    }
    update();
    setInterval(update, 60 * 1000); // jede Minute
})();