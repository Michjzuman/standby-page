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

(function gentleDrift() {
    const area = document.getElementById("clockArea");
    let t = 0;
    function loop() {
        if (window.__overlayOpen) {     // pausiert Bewegung hinter dem Overlay
            requestAnimationFrame(loop);
            return;
        }
        t += 0.0022;
        const x = Math.sin(t) * 1.6;
        const y = Math.cos(t * 0.9) * 1.6;
        area.style.transform = `translate(${x}vmin, ${y}vmin)`;
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
})();

// Overlay for external Snake
(function initExternalSnake() {
    const overlay = document.getElementById("overlay");
    const frame = document.getElementById("snakeFrame");

    function openOverlay() {
        if (overlay.classList.contains("show")) return;
        overlay.classList.add("show");
        overlay.setAttribute("aria-hidden", "false");
        window.__overlayOpen = true;        // <— Flag
        frame.src = frame.src;              // reload für frische Session
    }

    function closeOverlay() {
        overlay.classList.remove("show");
        overlay.setAttribute("aria-hidden", "true");
        window.__overlayOpen = false;       // <— Flag
    }

    function handleKey(e) {
        if (e.key === "s" || e.key === "S") {
            openOverlay();
            e.preventDefault();
            return;
        }
        if (!overlay.classList.contains("show")) return;
        if (e.key === "Escape") {
            closeOverlay();
        }
    }
    window.addEventListener("keydown", handleKey, { passive: false });

    // triple-click on the clock opens the overlay
    let clickCount = 0;
    const clockArea = document.getElementById("clockArea");
    if (clockArea) {
        clockArea.addEventListener("click", () => {
            clickCount++;
            if (clickCount === 3) {
                openOverlay();
                clickCount = 0;
            }
            setTimeout(() => { clickCount = 0; }, 450);
        });
    }

    // click outside panel closes
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeOverlay();
    });
})();

(function workbarUpdate() {
    const bar = document.getElementById("workbar");
    function update() {
        const now = new Date();
        const day = now.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
        // Only show on weekdays (Mon-Fri)
        if (day < 1 || day > 5) {
            bar.style.display = "none";
            return;
        }
        const start = new Date(now); start.setHours(8,0,0,0);
        const end   = new Date(now); end.setHours(18,0,0,0); // 18:00
        if (now < start || now > end) {
            bar.style.display = "none";
            return;
        }
        // Show and update width
        bar.style.display = "block";
        let pct;
        if (now <= start) pct = 0;
        else if (now >= end) pct = 100;
        else pct = ((now - start) / (end - start)) * 100;
        bar.style.width = pct + "%";
    }
    update();
    setInterval(update, 60 * 1000); // jede Minute
})();

// Fullscreen toggle with "f" key
(function initFullscreen() {
    window.addEventListener("keydown", (e) => {
        if (e.key === "f" || e.key === "F") {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => console.warn(err));
            } else {
                document.exitFullscreen();
            }
            e.preventDefault();
        }
    });
})();