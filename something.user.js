// ==UserScript==
// @name         Kumple Tracker
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Kumple Tracker + potencjalny resp 271 i 83 + minimalizacja
// @author       Marssia
// @match        *.margonem.pl/*
// @grant        GM_xmlhttpRequest
// @connect      public-api.margonem.pl
// @connect      discord.com
// @updateURL
// @downloadURL
// ==/UserScript==

(function () {
    "use strict";



    const IP_PLAYERS_271 = [
        "Koperkowy Pies",
        "Lethargy",
        "Namzarovsky",
        "Mały Kuba",
        "Kosiorski",
        "Urzad Pracy",
        "Young Lemonuś",
        "Mr Cone",
        "Sebastian Żmuda",
        "Kozel Bily Lehky",
        "Kataśko",
        "Kurier Na Pokładzie",
        "Bezrobotny Hubi",
        "Urlop Na Event",
        "Vizianeczka",
        "Frausia",
        "Social Experiment",
        "Asimos",
        "Yi Zaha",
        "Piesek Grzesia",
        "Paladynka Kasia",
        "Zwinny Gottwald",
        "Bierny Zawodowo",
        "Arianea",
        "Avestin"
    ];

    const KP_PLAYERS_83 = [
        "Majk Na Bombie",
        "Bibi Za Burtą",
        "Magiczny Ebolka",
        "Buzz King",
        "Ezekiel Szósty",
        "Balaś Jr",
        "Dark Shadow",
        "Pimpek Masywne Majty",
        "Secret Shadow",
        "Vinicius Junior",
        "Pyzula",
        "Dilimek",
        "Korsarz Sirex",
        "Arerodynamiczny",
        "Króliczek Domicky",
        "What Went Wrong",
        "Kulawy Sebek",
        "Skubik I",
        "Entropy Core",
        "Szybszy Wojownik",
        "Avaniel",
        "Barol Za Burtą",
        "Kimik Niszczyciel",
        "Butelka Wody",
        "Dosz",
        "Werrien Prime"
    ];



    const DISCORD_WEBHOOK_271 = "https://discord.com/api/webhooks/1548792504508481596/YDA_eATLw0a6sYzRA49wYIl0PbRAyk2hues1lFDFAb4oZ0FSQmIUgrslh2TTQOulfLbF";

    const DISCORD_WEBHOOK_83 =
        "https://discord.com/api/webhooks/1548792293945778197/I-rxi2NzFJnJDw0my-f1KelFHBzfjsr3EHo1xSB7_aeAO_xyvTqsIs5JdBCr6B0hmGDP";

    const REFRESH_INTERVAL = 10000;

    const TARGET_LEVELS = [271, 83];

    const NOTIFICATION_THRESHOLD = 3;


    const RESPAWN_TRIGGER_COUNT = 10;

    const RESPAWN_CONFIG = {

    271: {
        minTime:
            14 * 60 * 60 * 1000,

        maxTime:
            (23 * 60 + 20) * 60 * 1000
    },


    83: {
        minTime:
            (12 * 60 + 15) * 60 * 1000,

        maxTime:
            (20 * 60 + 25) * 60 * 1000
    }
    };

    const WORLD = "navis";


    const LEVEL_CONFIG = {
        271: {
            players: IP_PLAYERS_271,
            webhook: DISCORD_WEBHOOK_271
        },

        83: {
            players: KP_PLAYERS_83,
            webhook: DISCORD_WEBHOOK_83
        }
    };

    let lastSentCounts = {
        271: 0,
        83: 0
    };

    let playerCounts = {
        271: 0,
        83: 0
    };

    let detectedPlayers = {
        271: [],
        83: []
    };

    let selectedLevel =
        Number(
            localStorage.getItem(
                "margonem-kumple-tracker-selected-level"
            )
        ) === 83
            ? 83
            : 271;

    let isDragging = false;

    let trackerX =
        parseFloat(
            localStorage.getItem(
                "margonem-tracker-x"
            )
        ) || 0;

    let trackerY =
        parseFloat(
            localStorage.getItem(
                "margonem-tracker-y"
            )
        ) || 0;

    let dragOffsetX = 0;
    let dragOffsetY = 0;

    let refreshTimer = null;
    let respawnRenderTimer = null;

    let isMinimized =
        localStorage.getItem(
            "margonem-kumple-tracker-minimized"
        ) === "true";

    const RESPAWN_STORAGE_KEYS = {
        271: "margonem-kumple-tracker-respawn-271",
        83: "margonem-kumple-tracker-respawn-83"
    };

    let respawnStartTimes = {
        271:
            parseInt(
                localStorage.getItem(
                    RESPAWN_STORAGE_KEYS[271]
                ),
                10
            ) || null,

        83:
            parseInt(
                localStorage.getItem(
                    RESPAWN_STORAGE_KEYS[83]
                ),
                10
            ) || null
    };

    function getWorldName() {
        return WORLD;
    }

    function getApiUrl() {
        const world = getWorldName();

        const apiUrl =
            `https://public-api.margonem.pl/info/online/${world}.json`;

        console.log(
            "[Kumple Tracker] Świat:",
            world
        );

        console.log(
            "[Kumple Tracker] API URL:",
            apiUrl
        );

        return apiUrl;
    }

    function sendDiscordNotification(
        webhookUrl,
        level,
        players
    ) {
        if (
            !webhookUrl ||
            webhookUrl === "YOUR_DISCORD_WEBHOOK_HERE" ||
            webhookUrl === "TUTAJ_WKLEJ_WEBHOOK_83" ||
            webhookUrl === "__WEBHOOK_271__"
        ) {
            console.warn(
                `[Kumple Tracker] Brak webhooka Discord dla ${level}.`
            );

            return;
        }

        if (
            players.length <
            NOTIFICATION_THRESHOLD
        ) {
            return;
        }

        const message =
            `CWELE ${level} (${players.length}): ` +
            players
                .map(
                    p => p.n
                )
                .join(", ");

        GM_xmlhttpRequest({
            method: "POST",

            url: webhookUrl,

            headers: {
                "Content-Type":
                    "application/json"
            },

            data: JSON.stringify({
                content: message
            }),

            onload:
                function (response) {
                    console.log(
                        `[Kumple Tracker] Discord ${level}:`,
                        response.status
                    );

                    if (
                        response.status < 200 ||
                        response.status >= 300
                    ) {
                        console.error(
                            `[Kumple Tracker] Discord error ${level}:`,
                            response.responseText
                        );
                    }
                },

            onerror:
                function (error) {
                    console.error(
                        `[Kumple Tracker] Discord request error ${level}:`,
                        error
                    );
                }
        });
    }


    function startRespawnTimer(level) {
        if (
            respawnStartTimes[level]
        ) {
            return false;
        }

        respawnStartTimes[level] =
            Date.now();

        localStorage.setItem(
            RESPAWN_STORAGE_KEYS[level],
            respawnStartTimes[level].toString()
        );

        console.log(
            `[Kumple Tracker] Potencjalny resp ${level} rozpoczęty:`,
            new Date(
                respawnStartTimes[level]
            ).toLocaleString()
        );

        return true;
    }

    function resetRespawnTimer(level) {
        respawnStartTimes[level] =
            null;

        localStorage.removeItem(
            RESPAWN_STORAGE_KEYS[level]
        );

        renderRespawn();
    }

    function getRespawnStatus(level) {
        const respawnStartTime =
            respawnStartTimes[level];

        if (!respawnStartTime) {
            return {
                type: "none",
                text: "Brak aktywnego respa"
            };
        }

        const now =
            Date.now();

        const config =
              RESPAWN_CONFIG[level];

        const minRespawn =
              respawnStartTime +
              config.minTime;

        const maxRespawn =
              respawnStartTime +
              config.maxTime;

        if (
            now < minRespawn
        ) {
            return {
                type: "waiting",
                text: "Jeszcze za wcześnie"
            };
        }

        if (
            now >= minRespawn &&
            now <= maxRespawn
        ) {
            return {
                type: "possible",
                text: "RESP MOŻLIWY"
            };
        }

        return {
            type: "expired",
            text: "Okno respa minęło"
        };
    }

    function formatDate(timestamp) {
        if (!timestamp) {
            return "—";
        }

        return new Date(
            timestamp
        ).toLocaleString(
            "pl-PL",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        );
    }

    function formatDuration(milliseconds) {
        if (
            milliseconds <= 0
        ) {
            return "0m";
        }

        const totalSeconds =
            Math.floor(
                milliseconds / 1000
            );

        const days =
            Math.floor(
                totalSeconds / 86400
            );

        const hours =
            Math.floor(
                (totalSeconds % 86400) /
                3600
            );

        const minutes =
            Math.floor(
                (totalSeconds % 3600) /
                60
            );

        const seconds =
            totalSeconds % 60;

        let result = "";

        if (days > 0) {
            result += `${days}d `;
        }

        if (
            hours > 0 ||
            days > 0
        ) {
            result += `${hours}h `;
        }

        if (
            minutes > 0 ||
            hours > 0 ||
            days > 0
        ) {
            result += `${minutes}m `;
        }

        if (
            days === 0 &&
            hours === 0 &&
            minutes === 0
        ) {
            result += `${seconds}s`;
        }

        return result.trim();
    }

    function renderRespawn() {
        const respawnBox =
            document.getElementById(
                "respawn-box"
            );

        if (!respawnBox) {
            return;
        }

        const level =
            selectedLevel;

        const status =
            getRespawnStatus(
                level
            );

        const startTime =
            respawnStartTimes[level];

        const now =
            Date.now();

        const config =
              RESPAWN_CONFIG[level];

        const minTime =
              startTime
        ? startTime +
              config.minTime
        : null;

        const maxTime =
              startTime
        ? startTime +
              config.maxTime
        : null;

        let html = `
            <div style="
                font-size:11px;
                color:#888;
                margin-bottom:5px;
            ">
                Potencjalny resp ${level}
            </div>
        `;

        if (
            status.type ===
            "none"
        ) {
            html += `
                <div style="
                    color:#666;
                    margin-bottom:5px;
                ">
                    Brak aktywnego respa
                </div>
            `;
        } else {
            let statusColor =
                "#888";

            if (
                status.type ===
                "possible"
            ) {
                statusColor =
                    "#ff453a";
            }

            if (
                status.type ===
                "waiting"
            ) {
                statusColor =
                    "#aaa";
            }

            if (
                status.type ===
                "expired"
            ) {
                statusColor =
                    "#666";
            }

            html += `
                <div style="
                    color:${statusColor};
                    font-weight:700;
                    margin-bottom:4px;
                ">
                    ${status.text}
                </div>
            `;

            html += `
                <div style="
                    color:#777;
                    font-size:10px;
                    line-height:15px;
                ">
                    Start: ${formatDate(startTime)}
                    <br>
                    Od: ${formatDate(minTime)}
                    <br>
                    Do: ${formatDate(maxTime)}
                </div>
            `;

            if (
                status.type ===
                "waiting"
            ) {
                const remaining =
                    minTime -
                    now;

                html += `
                    <div style="
                        color:#999;
                        margin-top:3px;
                        font-size:10px;
                    ">
                        Pozostało:
                        ${formatDuration(remaining)}
                    </div>
                `;
            }

            if (
                status.type ===
                "possible"
            ) {
                const remaining =
                    maxTime -
                    now;

                html += `
                    <div style="
                        color:#ff6b61;
                        margin-top:3px;
                        font-size:10px;
                    ">
                        Koniec okna za:
                        ${formatDuration(remaining)}
                    </div>
                `;
            }
        }

        html += `
            <button
                id="reset-respawn-btn"
                style="
                    margin-top:7px;
                    background:#242424;
                    color:#999;
                    border:1px solid #3a3a3a;
                    border-radius:4px;
                    padding:3px 7px;
                    font-size:10px;
                    cursor:pointer;
                "
            >
                Reset respa ${level}
            </button>
        `;

        respawnBox.innerHTML =
            html;

        const resetButton =
            document.getElementById(
                "reset-respawn-btn"
            );

        if (
            resetButton
        ) {
            resetButton.addEventListener(
                "click",
                function () {
                    resetRespawnTimer(
                        level
                    );
                }
            );
        }
    }

    function getLevelButtons(level) {
        const buttons = [];

        const minimized =
            document.getElementById(
                `min-level-btn-${level}`
            );

        if (minimized) {
            buttons.push(
                minimized
            );
        }

        return buttons;
    }

    function createLevelButton(
        level
    ) {
        const button =
            document.createElement(
                "button"
            );

        button.id =
            `min-level-btn-${level}`;

        button.textContent =
            level.toString();

        button.title =
            `Poziom ${level}`;

        button.style.cssText = `
            width:42px;
            height:30px;
            background:#242424;
            color:#aaa;
            border:1px solid #3a3a3a;
            border-radius:5px;
            cursor:pointer;
            font-size:11px;
            font-weight:700;
            font-family:Arial,sans-serif;
            padding:0;
        `;

       button.addEventListener(
           "click",
           function () {
               selectedLevel =
                   level;

        localStorage.setItem(
            "margonem-kumple-tracker-selected-level",
            level.toString()
        );

        if (isMinimized) {
            toggleMinimized(false);
        }

        renderContent();
        renderRespawn();
        updateLevelButtons();
           }
       );

        return button;
    }

    function updateLevelButtons() {
        TARGET_LEVELS.forEach(
            function (level) {
                const buttons =
                    getLevelButtons(
                        level
                    );

                buttons.forEach(
                    function (button) {
                        const count =
                            playerCounts[
                                level
                            ] || 0;

                        const selected =
                            selectedLevel ===
                            level;

                        const alert =
                            count >=
                            NOTIFICATION_THRESHOLD;

                        button.classList.toggle(
                            "level-alert",
                            alert
                        );

                        if (
                            selected &&
                            !alert
                        ) {
                            button.style.background =
                                "#353535";

                            button.style.color =
                                "#eee";
                        } else if (
                            alert
                        ) {
                            button.style.background =
                                "#3b1d1b";

                            button.style.color =
                                "#fff";
                        } else {
                            button.style.background =
                                "#242424";

                            button.style.color =
                                "#aaa";
                        }
                    }
                );
            }
        );
    }

    function toggleMinimized(
        forcedState = null
    ) {
        if (
            forcedState === null
        ) {
            isMinimized =
                !isMinimized;
        } else {
            isMinimized =
                forcedState;
        }

        localStorage.setItem(
            "margonem-kumple-tracker-minimized",
            isMinimized
                ? "true"
                : "false"
        );

        renderWindowState();
    }

    function renderWindowState() {
    const tracker =
        document.getElementById(
            "player-tracker"
        );

    if (!tracker) {
        return;
    }

    const header =
        document.getElementById(
            "tracker-header"
        );

    const content =
        document.getElementById(
            "tracker-content"
        );

    const respawnBox =
        document.getElementById(
            "respawn-box"
        );

    const minimizedLevels =
        document.getElementById(
            "minimized-levels"
        );

    if (
        isMinimized
    ) {
        if (header) {
            header.style.display =
                "none";
        }

        if (content) {
            content.style.display =
                "none";
        }

        if (respawnBox) {
            respawnBox.style.display =
                "none";
        }

        if (
            minimizedLevels
        ) {
            minimizedLevels.style.display =
                "flex";

            minimizedLevels.style.flexDirection =
                "row";

            minimizedLevels.style.justifyContent =
                "center";
        }

        tracker.style.width =
            "100px";

        tracker.style.background =
            "#1a1a1a";

        tracker.style.border =
            "1px solid #333";

        tracker.style.borderRadius =
            "7px";
    } else {
        if (header) {
            header.style.display =
                "flex";
        }

        if (content) {
            content.style.display =
                "block";
        }

        if (respawnBox) {
            respawnBox.style.display =
                "block";
        }

        if (
            minimizedLevels
        ) {
            minimizedLevels.style.display =
                "flex";

            minimizedLevels.style.flexDirection =
                "row";

            minimizedLevels.style.justifyContent =
                "flex-start";
        }

        tracker.style.width =
            "290px";
    }

    updateLevelButtons();
}

    function renderContent() {
        const content =
            document.getElementById(
                "tracker-content"
            );

        if (!content) {
            return;
        }

        const level =
            selectedLevel;

        const players =
            detectedPlayers[
                level
            ] || [];

        const count =
            playerCounts[
                level
            ] || 0;

        let html = `
            <div style="
                display:flex;
                align-items:center;
                justify-content:space-between;
                margin-bottom:7px;
            ">
                <div style="
                    color:#aaa;
                    font-size:11px;
                ">
                    Poziom ${level}
                </div>

                <div style="
                    color:${
                        count >=
                        NOTIFICATION_THRESHOLD
                            ? "#ff6b61"
                            : "#777"
                    };
                    font-weight:700;
                    font-size:11px;
                ">
                    ${count}
                </div>
            </div>
        `;

        if (
            count ===
            0
        ) {
            html += `
                <div style="
                    color:#555;
                    font-size:11px;
                    padding:4px 0;
                ">
                    Brak wykrytych graczy
                </div>
            `;
        } else {
            html += `
                <div style="
                    color:#777;
                    font-size:10px;
                    margin-bottom:4px;
                ">
                    Wykryci:
                </div>
            `;

            players.forEach(
                function (player) {
                    html += `
                        <div style="
                            display:flex;
                            justify-content:space-between;
                            align-items:center;
                            padding:3px 0;
                            border-bottom:1px solid #242424;
                        ">
                            <span style="
                                color:#ccc;
                                overflow:hidden;
                                text-overflow:ellipsis;
                                white-space:nowrap;
                                max-width:170px;
                            ">
                                ${escapeHtml(
                                    player.n
                                )}
                            </span>

                            <span style="
                                color:#666;
                                font-size:9px;
                                margin-left:5px;
                            ">
                                ${escapeHtml(
                                    player.lvl !== undefined
                                        ? player.lvl.toString()
                                        : ""
                                )}
                            </span>
                        </div>
                    `;
                }
            );
        }

        content.innerHTML =
            html;

        updateLevelButtons();
    }

    function escapeHtml(text) {
        return String(
            text
        )
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );
    }

    function normalizePlayerName(
        name
    ) {
        return String(
            name || ""
        )
            .trim()
            .toLowerCase();
    }

    function getConfiguredNames(
        level
    ) {
        return (
            LEVEL_CONFIG[
                level
            ]?.players ||
            []
        );
    }

    function findTrackedPlayers(
    onlinePlayers,
    level
    ) {
        const configured =
              getConfiguredNames(
                  level
              );

        if (
            !configured ||
            configured.length === 0
        ) {
            return [];
        }

        const lookup =
              new Set(
                  configured.map(
                      normalizePlayerName
                  )
              );

        return onlinePlayers.filter(
            function (player) {
                const rawName =
                      player.n ||
                      player.name ||
                      player.nick ||
                      player.nickname ||
                      player.username ||
                      player.login ||
                      "";

                const playerName =
                      normalizePlayerName(
                          rawName
                      );

                return lookup.has(
                    playerName
                );
            }
        );
    }

    function updateNotification() {
        TARGET_LEVELS.forEach(
            function (level) {
                const count =
                    playerCounts[
                        level
                    ] || 0;

                const players =
                    detectedPlayers[
                        level
                    ] || [];

                const shouldNotify =
                    count >=
                    NOTIFICATION_THRESHOLD;

                const previous =
                    lastSentCounts[
                        level
                    ] || 0;


                if (
                    shouldNotify &&
                    previous <
                        NOTIFICATION_THRESHOLD
                ) {
                    sendDiscordNotification(
                        LEVEL_CONFIG[
                            level
                        ].webhook,
                        level,
                        players
                    );
                }

                lastSentCounts[
                    level
                ] = count;
            }
        );

        updateLevelButtons();
    }


    function updateRespawnTimers() {
        TARGET_LEVELS.forEach(
            function (level) {
                const count =
                    playerCounts[
                        level
                    ] || 0;

                if (
                    count >=
                    RESPAWN_TRIGGER_COUNT
                ) {
                    const started =
                        startRespawnTimer(
                            level
                        );

                    if (
                        started
                    ) {
                        console.log(
                            `[Kumple Tracker] ${level}: wykryto ${count} graczy - start potencjalnego respa.`
                        );
                    }
                }
            }
        );

        renderRespawn();
    }


    function fetchNCPlayers() {
    const apiUrl = getApiUrl();

    console.log("[Kumple Tracker] Requesting API...");
    console.log("[Kumple Tracker] API URL:", apiUrl);

    GM_xmlhttpRequest({
        method: "GET",
        url: apiUrl,

        anonymous: true,

        headers: {
            "Accept": "application/json",
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
                "AppleWebKit/537.36 (KHTML, like Gecko) " +
                "Chrome/120.0.0.0 Safari/537.36",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache"
        },

        timeout: 15000,

        onload: function (response) {
            console.log(
                "[Kumple Tracker] STATUS:",
                response.status
            );

            console.log(
                "[Kumple Tracker] Content-Type:",
                response.responseHeaders || ""
            );

            if (
                response.status < 200 ||
                response.status >= 300
            ) {
                console.error(
                    "[Kumple Tracker] API error:",
                    response.status
                );

                console.error(
                    "[Kumple Tracker] Response:",
                    response.responseText
                );

                return;
            }

            let data;

            try {
                data = JSON.parse(
                    response.responseText
                );
            } catch (error) {
                console.error(
                    "[Kumple Tracker] Błąd JSON:",
                    error
                );

                console.error(
                    "[Kumple Tracker] Odpowiedź API:",
                    response.responseText
                );

                return;
            }

            let onlinePlayers = [];

            if (Array.isArray(data)) {
                onlinePlayers = data;

            } else if (
                data &&
                Array.isArray(data.players)
            ) {
                onlinePlayers = data.players;

            } else if (
                data &&
                Array.isArray(data.online)
            ) {
                onlinePlayers = data.online;

            } else if (
                data &&
                typeof data === "object"
            ) {
                const keys = Object.keys(data);

                for (
                    let i = 0;
                    i < keys.length;
                    i++
                ) {
                    const value = data[keys[i]];

                    if (
                        Array.isArray(value) &&
                        value.length > 0
                    ) {
                        const first = value[0];

                        if (
                            first &&
                            typeof first === "object"
                        ) {
                            onlinePlayers = value;
                            break;
                        }
                    }
                }
            }

            console.log(
                "[Kumple Tracker] Online players:",
                onlinePlayers.length
            );

            if (
                !Array.isArray(onlinePlayers)
            ) {
                console.error(
                    "[Kumple Tracker] Nieprawidłowy format danych API."
                );

                return;
            }

            TARGET_LEVELS.forEach(
                function (level) {
                    const players =
                        findTrackedPlayers(
                            onlinePlayers,
                            level
                        );

                    detectedPlayers[level] =
                        players;

                    playerCounts[level] =
                        players.length;
                }
            );

            renderContent();
            renderRespawn();

            updateNotification();
            updateRespawnTimers();

            console.log(
                "[Kumple Tracker] Wyniki:",
                {
                    271:
                        playerCounts[271],

                    83:
                        playerCounts[83]
                }
            );
        },

        ontimeout: function () {
            console.error(
                "[Kumple Tracker] API timeout."
            );
        },

        onerror: function (error) {
            console.error(
                "[Kumple Tracker] Błąd połączenia z API:",
                error
            );
        },

        onabort: function () {
            console.error(
                "[Kumple Tracker] Request został przerwany."
            );
        }
    });
}

    function onTrackerMouseDown(
        event
    ) {
        if (
            event.target.closest(
                "button"
            )
        ) {
            return;
        }

        const tracker =
            document.getElementById(
                "player-tracker"
            );

        if (!tracker) {
            return;
        }

        isDragging = true;

        const rect =
            tracker.getBoundingClientRect();

        dragOffsetX =
            event.clientX -
            rect.left;

        dragOffsetY =
            event.clientY -
            rect.top;

        tracker.classList.add(
            "dragging"
        );

        event.preventDefault();
    }

    function onMouseMove(
        event
    ) {
        if (
            !isDragging
        ) {
            return;
        }

        const tracker =
            document.getElementById(
                "player-tracker"
            );

        if (!tracker) {
            return;
        }

        const newX =
            event.clientX -
            dragOffsetX;

        const newY =
            event.clientY -
            dragOffsetY;

        tracker.style.setProperty(
            "left",
            `${newX}px`,
            "important"
        );

        tracker.style.setProperty(
            "top",
            `${newY}px`,
            "important"
        );

        tracker.style.setProperty(
            "right",
            "auto",
            "important"
        );

        tracker.style.setProperty(
            "transform",
            "none",
            "important"
        );

        trackerX =
            newX;

        trackerY =
            newY;
    }

    function onMouseUp() {
        if (
            !isDragging
        ) {
            return;
        }

        isDragging = false;

        const tracker =
            document.getElementById(
                "player-tracker"
            );

        if (tracker) {
            tracker.classList.remove(
                "dragging"
            );
        }

        localStorage.setItem(
            "margonem-tracker-x",
            trackerX.toString()
        );

        localStorage.setItem(
            "margonem-tracker-y",
            trackerY.toString()
        );
    }

    function checkTrackerPosition() {
        const tracker =
            document.getElementById(
                "player-tracker"
            );

        if (!tracker) {
            return;
        }

        const rect =
            tracker.getBoundingClientRect();

        let x =
            rect.left;

        let y =
            rect.top;

        const maxX =
            window.innerWidth -
            rect.width;

        const maxY =
            window.innerHeight -
            rect.height;

        if (
            x < 0
        ) {
            x = 0;
        }

        if (
            y < 0
        ) {
            y = 0;
        }

        if (
            x > maxX
        ) {
            x = maxX;
        }

        if (
            y > maxY
        ) {
            y = maxY;
        }

        if (
            x !== rect.left ||
            y !== rect.top
        ) {
            tracker.style.setProperty(
                "left",
                `${x}px`,
                "important"
            );

            tracker.style.setProperty(
                "top",
                `${y}px`,
                "important"
            );

            tracker.style.setProperty(
                "right",
                "auto",
                "important"
            );

            tracker.style.setProperty(
                "transform",
                "none",
                "important"
            );

            trackerX =
                x;

            trackerY =
                y;

            localStorage.setItem(
                "margonem-tracker-x",
                trackerX.toString()
            );

            localStorage.setItem(
                "margonem-tracker-y",
                trackerY.toString()
            );
        }
    }

    function resetPosition() {
        const tracker =
            document.getElementById(
                "player-tracker"
            );

        if (!tracker) {
            return;
        }

        tracker.style.removeProperty(
            "left"
        );

        tracker.style.removeProperty(
            "top"
        );

        tracker.style.removeProperty(
            "transform"
        );

        tracker.style.removeProperty(
            "right"
        );

        tracker.style.right =
            "10px";

        tracker.style.top =
            "100px";

        trackerX =
            0;

        trackerY =
            0;

        localStorage.removeItem(
            "margonem-tracker-x"
        );

        localStorage.removeItem(
            "margonem-tracker-y"
        );
    }


    function initUI() {
        if (
            document.getElementById(
                "player-tracker"
            )
        ) {
            return;
        }

        const tracker =
            document.createElement(
                "div"
            );

        tracker.id =
            "player-tracker";

        tracker.style.cssText = `
            position:fixed;
            top:100px;
            right:10px;
            width:290px;
            background:#1a1a1a;
            color:#ccc;
            border-radius:8px;
            z-index:10000;
            font-family:Arial,sans-serif;
            font-size:12px;
            border:1px solid #333;
            overflow:hidden;
        `;

        const header =
            document.createElement(
                "div"
            );

        header.id =
            "tracker-header";

        header.style.cssText = `
            padding:6px 10px;
            background:#222;
            cursor:move;
            user-select:none;
            display:flex;
            justify-content:space-between;
            align-items:center;
            border-bottom:1px solid #333;
        `;

        const title =
            document.createElement(
                "span"
            );

        title.id =
            "tracker-title";

        title.textContent =
            "Kumple Tracker";

        title.style.cssText =
            "color:#eee;" +
            "font-weight:600;" +
            "font-size:12px;";


        const minimizeBtn =
            document.createElement(
                "button"
            );

        minimizeBtn.id =
            "minimize-btn";

        minimizeBtn.textContent =
            "—";

        minimizeBtn.title =
            "Minimalizuj";

        minimizeBtn.style.cssText = `
            background:#2d2d2d;
            color:#aaa;
            border:1px solid #444;
            width:24px;
            height:20px;
            padding:0;
            margin-right:4px;
            border-radius:4px;
            cursor:pointer;
            font-size:13px;
            line-height:16px;
            font-family:Arial,sans-serif;
        `;

        minimizeBtn.onmouseover =
            function () {
                minimizeBtn.style.background =
                    "#3a3a3a";
            };

        minimizeBtn.onmouseout =
            function () {
                minimizeBtn.style.background =
                    "#2d2d2d";
            };

        minimizeBtn.addEventListener(
            "click",
            function (e) {
                e.stopPropagation();

                toggleMinimized();
            }
        );

        const refreshBtn =
            document.createElement(
                "button"
            );

        refreshBtn.id =
            "refresh-btn";

        refreshBtn.innerHTML =
            "&#x21BB; Odśwież";

        refreshBtn.style.cssText = `
            background:#2d2d2d;
            color:#ccc;
            border:1px solid #444;
            padding:2px 10px;
            border-radius:4px;
            cursor:pointer;
            font-size:11px;
            font-family:Arial,sans-serif;
        `;

        refreshBtn.onmouseover =
            function () {
                refreshBtn.style.background =
                    "#3a3a3a";
            };

        refreshBtn.onmouseout =
            function () {
                refreshBtn.style.background =
                    "#2d2d2d";
            };


        const headerButtons =
            document.createElement(
                "div"
            );

        headerButtons.style.cssText =
            "display:flex;align-items:center;";

        headerButtons.appendChild(
            minimizeBtn
        );

        headerButtons.appendChild(
            refreshBtn
        );

        header.appendChild(
            title
        );

        header.appendChild(
            headerButtons
        );

        const content =
            document.createElement(
                "div"
            );

        content.id =
            "tracker-content";

        content.style.cssText = `
            padding:8px 10px;
            background:#1a1a1a;
            min-height:40px;
        `;

        content.innerHTML =
            '<div style="color:#555;font-size:11px;">Ładowanie...</div>';

        const minimizedLevels =
            document.createElement(
                "div"
            );

        minimizedLevels.id =
            "minimized-levels";

        minimizedLevels.style.cssText = `
    display:flex;
    flex-direction:row;
    align-items:center;
    justify-content:flex-start;
    gap:4px;
    padding:4px 6px;
    background:#1a1a1a;
`;

        TARGET_LEVELS.forEach(
            function (level) {
                minimizedLevels.appendChild(
                    createLevelButton(
                        level
                    )
                );
            }
        );

        const respawnBox =
            document.createElement(
                "div"
            );

        respawnBox.id =
            "respawn-box";

        respawnBox.style.cssText = `
            padding:8px 10px;
            background:#151515;
            border-top:1px solid #2c2c2c;
        `;

        tracker.appendChild(
            header
        );

        tracker.appendChild(
            minimizedLevels
        );

        tracker.appendChild(
            content
        );

        tracker.appendChild(
            respawnBox
        );

        document.body.appendChild(
            tracker
        );

        const style =
            document.createElement(
                "style"
            );

        style.textContent = `
            @keyframes alert-pulse {
                0%, 100% {
                    box-shadow:
                        0 0 0 0
                        rgba(255,69,58,0);

                    border-color:#333;
                }

                50% {
                    box-shadow:
                        0 0 8px 2px
                        rgba(255,69,58,0.5);

                    border-color:
                        rgba(255,69,58,0.8);
                }
            }

            #player-tracker.notification-active {
                animation:none;
            }

            #player-tracker .level-alert {
                animation:
                    level-alert-pulse
                    1.5s
                    ease-in-out
                    infinite;

                border-color:
                    rgba(255,69,58,0.8) !important;

                color:#fff !important;
            }

            @keyframes level-alert-pulse {
                0%, 100% {
                    box-shadow:
                        0 0 0 0
                        rgba(255,69,58,0);
                }

                50% {
                    box-shadow:
                        0 0 8px 2px
                        rgba(255,69,58,0.55);
                }
            }

            #player-tracker.dragging {
                animation:none !important;
            }

            #respawn-box button:hover {
                background:#333 !important;
                color:#ddd !important;
            }

            #minimized-levels button:hover {
                background:#333 !important;
                color:#eee !important;
            }
        `;

        document.head.appendChild(
            style
        );


        header.addEventListener(
            "mousedown",
            onTrackerMouseDown
        );

        document.addEventListener(
            "mousemove",
            onMouseMove
        );

        document.addEventListener(
            "mouseup",
            onMouseUp
        );

        header.addEventListener(
            "selectstart",
            function (e) {
                e.preventDefault();
            }
        );

        refreshBtn.addEventListener(
            "click",
            fetchNCPlayers
        );

        document.addEventListener(
            "dblclick",
            function (e) {
                const h =
                    document.getElementById(
                        "tracker-header"
                    );

                if (
                    h &&
                    h.contains(
                        e.target
                    )
                ) {
                    resetPosition();
                }
            }
        );

        renderContent();
        renderRespawn();
        renderWindowState();
    }

    function startTracker() {
        initUI();

        const tracker =
            document.getElementById(
                "player-tracker"
            );

        if (!tracker) {
            console.error(
                "[Kumple Tracker] Nie udało się utworzyć UI."
            );

            return;
        }

        if (
            trackerX !== 0 ||
            trackerY !== 0
        ) {
            tracker.style.setProperty(
                "left",
                `${trackerX}px`,
                "important"
            );

            tracker.style.setProperty(
                "top",
                `${trackerY}px`,
                "important"
            );

            tracker.style.setProperty(
                "right",
                "auto",
                "important"
            );

            tracker.style.setProperty(
                "transform",
                "none",
                "important"
            );
}

        checkTrackerPosition();

        fetchNCPlayers();

        if (refreshTimer) {
            clearInterval(
                refreshTimer
            );
        }

        refreshTimer =
            setInterval(
                fetchNCPlayers,
                REFRESH_INTERVAL
            );

        if (respawnRenderTimer) {
            clearInterval(
                respawnRenderTimer
            );
        }

        respawnRenderTimer =
            setInterval(
                renderRespawn,
                1000
            );
    }



    window.addEventListener(
        "load",
        function () {
            setTimeout(
                startTracker,
                1000
            );
        }
    );

    window.addEventListener(
        "resize",
        checkTrackerPosition
    );

})();