// ==UserScript==
// @name         something
// @namespace    http://tampermonkey.net/
// @version      1.0.8
// @description  Heuheu
// @author       Marssia
// @match        *.margonem.pl/*
// @grant        GM_xmlhttpRequest
// @connect      public-api.margonem.pl
// @connect discord.com
// @updateURL    https://raw.githubusercontent.com/MarBor2000/something/main/something.user.js
// @downloadURL  https://raw.githubusercontent.com/MarBor2000/something/main/something.user.js
// ==/UserScript==


(function() {
    "use strict";

    const IP_PLAYERS = [
        "Koperkowy Pies", "Lethargy", "Namzarovsky", "Mały Kuba","Kosiorski", "Urzad Pracy", "Young Lemonuś", "Mr Cone", "Sebastian Żmuda", "Kozel Bily Lehky", "Kataśko", "Kurier Na Pokładzie", "Bezrobotny Hubi",
        "Urlop Na Event", "Vizianeczka", "Frausia",	"Social Experiment", "Asimos","Yi Zaha", "Piesek Grzesia", "Paladynka Kasia", "Zwinny Gottwald", "Bierny Zawodowo", "Arianea", "Avestin"
    ];

    const DISCORD_WEBHOOK_271 = "https://discord.com/api/webhooks/1492544706826207232/0J7hjYItpeBUn9tu0l9Jxeo_MYxQUnxqgkcDMe-axNIB6Kv8xP5RQuOr4VuPRlVV44qs";
    let lastSentCounts = {271};

    let isDragging = false;
    let trackerX = parseFloat(localStorage.getItem("margonem-tracker-x")) || 0;
    let trackerY = parseFloat(localStorage.getItem("margonem-tracker-y")) || 0;
    let dragOffsetX = 0, dragOffsetY = 0;
    let playerCounts = {271: 0};
    let notificationActive = false;

    function onTrackerMouseDown(e) {
        if (e.target.tagName === "BUTTON" || e.target.closest("button")) return;
        const header = document.getElementById("tracker-header");
        if (header && header.contains(e.target)) {
            isDragging = true;
            const tracker = document.getElementById("player-tracker");
            const transform = window.getComputedStyle(tracker).transform;
            if (transform && transform !== "none") {
                const matrix = new DOMMatrix(transform);
                trackerX = matrix.m41;
                trackerY = matrix.m42;
            }
            dragOffsetX = e.clientX - trackerX;
            dragOffsetY = e.clientY - trackerY;
            tracker.classList.add("dragging");
            e.preventDefault();
        }
    }

    // wysyłanie DC

    function sendDiscordNotification(webhookUrl, level, players) {
    if (players.length < 3) return;

    const message = `ZIOMKI Z IP (${players.length}): ${players.map(p => p.n).join(", ")}`;

    GM_xmlhttpRequest({
        method: "POST",
        url: webhookUrl,
        headers: {
            "Content-Type": "application/json"
        },
        data: JSON.stringify({
            content: message
        })
    });
}

    function onMouseMove(e) {
        if (isDragging) {
            e.preventDefault();
            trackerX = e.clientX - dragOffsetX;
            trackerY = e.clientY - dragOffsetY;
            const tracker = document.getElementById("player-tracker");
            tracker.style.setProperty("transform", `translate(${trackerX}px, ${trackerY}px)`, "important");
            tracker.style.transition = "none";
        }
    }

    function onMouseUp() {
        if (isDragging) {
            const tracker = document.getElementById("player-tracker");
            tracker.style.transition = "";
            tracker.classList.remove("dragging");
            localStorage.setItem("margonem-tracker-x", trackerX.toString());
            localStorage.setItem("margonem-tracker-y", trackerY.toString());
        }
        isDragging = false;
    }

    function resetPosition() {
        trackerX = 0;
        trackerY = 0;
        const tracker = document.getElementById("player-tracker");
        tracker.style.setProperty("transform", "translate(0px, 0px)", "important");
        localStorage.setItem("margonem-tracker-x", "0");
        localStorage.setItem("margonem-tracker-y", "0");
    }

    function checkTrackerPosition() {
        const tracker = document.getElementById("player-tracker");
        const rect = tracker.getBoundingClientRect();
        if (rect.right < 0 || rect.left > window.innerWidth ||
            rect.bottom < 0 || rect.top > window.innerHeight) {
            resetPosition();
        }
    }

    function updateNotification(hasManyPlayers) {
        const tracker = document.getElementById("player-tracker");
        if (hasManyPlayers && !notificationActive) {
            tracker.classList.add("notification-active");
            notificationActive = true;
        } else if (!hasManyPlayers && notificationActive) {
            tracker.classList.remove("notification-active");
            notificationActive = false;
        }
    }

    function fetchNCPlayers() {
        const refreshBtn = document.getElementById("refresh-btn");
        if (refreshBtn) refreshBtn.disabled = true;

        GM_xmlhttpRequest({
            method: "GET",
            url: "https://public-api.margonem.pl/info/online/navis.json",
            headers: {
                "Accept": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Cache-Control": "no-cache",
                "Pragma": "no-cache"
            },
            anonymous: true,
            onload: function(response) {
                if (refreshBtn) refreshBtn.disabled = false;
                try {
                    if (response.responseText.trim().startsWith("<")) {
                        throw new Error("Otrzymano HTML zamiast JSON");
                    }

                    const data = JSON.parse(response.responseText);
                    const ncPlayers = data.filter(p =>
                        IP_PLAYERS.includes(p.n) && (p.l == 271)
                    );

                    const level271 = ncPlayers.filter(p => p.l == 271);

                    playerCounts[271] = level271.length;


                    if (playerCounts[271] !== lastSentCounts[271]) {
                        sendDiscordNotification(DISCORD_WEBHOOK_271, 271, level271);
                        lastSentCounts[271] = playerCounts[271];
                    }

                    updateNotifica(level271);

                } catch (error) {
                    if (refreshBtn) refreshBtn.disabled = false;
                    console.error("KP Tracker error:", error);
                    const content = document.getElementById("tracker-content");
                    content.innerHTML = `<div style="color:#e55;padding:4px 0;font-size:11px;">Błąd: ${error.message}</div>`;
                }
            },
            onerror: function() {
                if (refreshBtn) refreshBtn.disabled = false;
                document.getElementById("tracker-content").innerHTML =
                    '<div style="color:#e55;font-size:11px;">Błąd połączenia z API</div>';
            }
        });
    }

    function renderContent(level271) {
        const content = document.getElementById("tracker-content");
        content.innerHTML = "";

        // Wiersz 271
        const row271 = document.createElement("div");
        row271.style.cssText = "display:flex;gap:6px;margin-bottom:2px;align-items:flex-start;";
        const lbl271 = document.createElement("span");
        lbl271.textContent = `271 (${level271.length}):`;
        lbl271.style.cssText = "color:#999;min-width:50px;white-space:nowrap;flex-shrink:0;";
        const names271 = document.createElement("span");
        names271.style.cssText = "color:#fff;word-break:break-word;font-size:11px;";
        names271.textContent = level271.length > 0 ? level271.map(p => p.n).join(", ") : "—";
        if (level271.length === 0) names271.style.color = "#555";
        row271.appendChild(lbl271);
        row271.appendChild(names271);

        // Timestamp
        const ts = document.createElement("div");
        ts.style.cssText = "color:#444;font-size:10px;margin-top:6px;";
        ts.textContent = new Date().toLocaleTimeString();

        content.appendChild(row271);
        content.appendChild(ts);
    }

    function initUI() {
        const tracker = document.createElement("div");
        tracker.id = "player-tracker";
        tracker.style.cssText = `
            position: fixed;
            top: 100px;
            right: 10px;
            width: 240px;
            background: #1a1a1a;
            color: #ccc;
            border-radius: 8px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 12px;
            border: 1px solid #333;
            overflow: hidden;
        `;

        // Header
        const header = document.createElement("div");
        header.id = "tracker-header";
        header.style.cssText = `
            padding: 6px 10px;
            background: #222;
            cursor: move;
            user-select: none;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #333;
        `;

        const title = document.createElement("span");
        title.id = "tracker-title";
        title.textContent = "KP Tracker";
        title.style.cssText = "color:#eee;font-weight:600;font-size:12px;";

        const refreshBtn = document.createElement("button");
        refreshBtn.id = "refresh-btn";
        refreshBtn.innerHTML = "&#x21BB; Odśwież";
        refreshBtn.style.cssText = `
            background: #2d2d2d;
            color: #ccc;
            border: 1px solid #444;
            padding: 2px 10px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            font-family: Arial, sans-serif;
        `;
        refreshBtn.onmouseover = () => refreshBtn.style.background = "#3a3a3a";
        refreshBtn.onmouseout = () => refreshBtn.style.background = "#2d2d2d";

        header.appendChild(title);
        header.appendChild(refreshBtn);

        // Content
        const content = document.createElement("div");
        content.id = "tracker-content";
        content.style.cssText = `
            padding: 8px 10px;
            background: #1a1a1a;
            min-height: 40px;
        `;
        content.innerHTML = '<div style="color:#555;font-size:11px;">Ładowanie...</div>';

        tracker.appendChild(header);
        tracker.appendChild(content);
        document.body.appendChild(tracker);

        // Style animacji powiadomień
        const style = document.createElement("style");
        style.textContent = `
            @keyframes alert-pulse {
                0%, 100% { box-shadow: 0 0 0 0 rgba(255,69,58,0); border-color: #333; }
                50% { box-shadow: 0 0 8px 2px rgba(255,69,58,0.5); border-color: rgba(255,69,58,0.8); }
            }
            #player-tracker.notification-active { animation: alert-pulse 2s ease-in-out infinite; }
            #player-tracker.dragging { animation: none !important; }
        `;
        document.head.appendChild(style);

        header.addEventListener("mousedown", onTrackerMouseDown);
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
        header.addEventListener("selectstart", e => e.preventDefault());
        refreshBtn.addEventListener("click", fetchNCPlayers);

        document.addEventListener("dblclick", function(e) {
            const h = document.getElementById("tracker-header");
            if (h && h.contains(e.target)) resetPosition();
        });
    }

    window.addEventListener("load", function() {
        initUI();

        const tracker = document.getElementById("player-tracker");
        if (trackerX !== 0 || trackerY !== 0) {
            tracker.style.setProperty("transform", `translate(${trackerX}px, ${trackerY}px)`, "important");
        }

        checkTrackerPosition();
        fetchNCPlayers();
        setInterval(fetchNCPlayers, 10000);
    });

    window.addEventListener("resize", checkTrackerPosition);

})();
