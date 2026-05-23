const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const startBtn = document.getElementById("startBtn");
const refreshBtn = document.getElementById("refreshBtn");
const playerNameInput = document.getElementById("playerName");

const progressText = document.getElementById("progressText");
const stressText = document.getElementById("stressText");
const scoreText = document.getElementById("scoreText");
const bugText = document.getElementById("bugText");
const messageBox = document.getElementById("messageBox");
const messageTitle = document.getElementById("messageTitle");
const messageText = document.getElementById("messageText");
const scoreList = document.getElementById("scoreList");

const game = {
    running: false,
    finished: false,
    lastTime: 0,
    spawnTimer: 0,
    coffeeTimer: 0,
    elapsed: 0,
    progress: 0,
    stress: 0,
    score: 0,
    bugsKilled: 0,
    objects: [],
};

const random = (min, max) => Math.random() * (max - min) + min;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function resetGame() {
    game.running = true;
    game.finished = false;
    game.lastTime = performance.now();
    game.spawnTimer = 0;
    game.coffeeTimer = 4;
    game.elapsed = 0;
    game.progress = 0;
    game.stress = 0;
    game.score = 0;
    game.bugsKilled = 0;
    game.objects = [];

    messageBox.classList.add("hidden");
    updateHud();
    requestAnimationFrame(loop);
}

function updateHud() {
    progressText.textContent = `${Math.floor(game.progress)}%`;
    stressText.textContent = `${Math.floor(game.stress)}%`;
    scoreText.textContent = game.score.toString();
    bugText.textContent = game.bugsKilled.toString();
}

function spawnBug() {
    const size = random(24, 42);
    const typeRoll = Math.random();
    let label = "bug";
    let color = "#fb7185";
    let damage = random(8, 15);
    let speed = random(72, 140);

    if (typeRoll > 0.72) {
        label = "revisi";
        color = "#facc15";
        damage = random(12, 20);
        speed = random(55, 100);
    }

    if (typeRoll > 0.9) {
        label = "printer";
        color = "#c084fc";
        damage = random(18, 26);
        speed = random(40, 82);
    }

    game.objects.push({
        kind: "enemy",
        label,
        x: random(size, canvas.width - size),
        y: -size,
        radius: size,
        speed,
        damage,
        color,
        wobble: random(0, Math.PI * 2),
    });
}

function spawnCoffee() {
    const radius = 28;
    game.objects.push({
        kind: "coffee",
        label: "kopi",
        x: random(radius, canvas.width - radius),
        y: -radius,
        radius,
        speed: random(60, 115),
        color: "#86efac",
        wobble: random(0, Math.PI * 2),
    });
}

function updateObjects(delta) {
    const barY = canvas.height - 72;

    for (const obj of game.objects) {
        obj.wobble += delta * 4;
        obj.y += obj.speed * delta;
        obj.x += Math.sin(obj.wobble) * 0.9;
    }

    for (const obj of game.objects) {
        if (obj.kind === "enemy" && obj.y + obj.radius >= barY) {
            obj.dead = true;
            game.stress += obj.damage;
            game.progress -= obj.damage * 0.45;
            game.score = Math.max(0, game.score - Math.floor(obj.damage * 6));
        }

        if (obj.kind === "coffee" && obj.y - obj.radius > canvas.height) {
            obj.dead = true;
        }
    }

    game.objects = game.objects.filter((obj) => !obj.dead && obj.y - obj.radius < canvas.height + 80);
}

function updateGame(delta) {
    game.elapsed += delta;
    game.spawnTimer -= delta;
    game.coffeeTimer -= delta;

    const difficulty = 1 + game.elapsed / 55;
    game.progress += delta * (3.8 + game.bugsKilled * 0.018);
    game.stress += delta * 0.85;

    if (game.spawnTimer <= 0) {
        spawnBug();
        game.spawnTimer = random(0.48, 1.15) / difficulty;
    }

    if (game.coffeeTimer <= 0) {
        spawnCoffee();
        game.coffeeTimer = random(6.5, 10.5);
    }

    updateObjects(delta);

    game.progress = clamp(game.progress, 0, 100);
    game.stress = clamp(game.stress, 0, 100);
    game.score = Math.floor(game.progress * 100 + game.bugsKilled * 25 + game.elapsed * 7 - game.stress * 10);
    game.score = Math.max(0, game.score);

    if (game.progress >= 100) {
        endGame(true);
    } else if (game.stress >= 100) {
        endGame(false);
    }

    updateHud();
}

function drawBackground() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#0c111b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 48) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 48) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
}

function drawLoadingBar() {
    const x = 48;
    const y = canvas.height - 72;
    const w = canvas.width - 96;
    const h = 34;
    const fillW = w * (game.progress / 100);

    ctx.fillStyle = "rgba(255, 255, 255, 0.09)";
    roundRect(x, y, w, h, 16);
    ctx.fill();

    ctx.fillStyle = game.stress > 70 ? "#facc15" : "#67e8f9";
    roundRect(x, y, fillW, h, 16);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.26)";
    ctx.lineWidth = 2;
    roundRect(x, y, w, h, 16);
    ctx.stroke();

    ctx.fillStyle = "#f5f7fb";
    ctx.font = "700 14px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("LOADING SKRIPSI", canvas.width / 2, y + 23);
}

function drawObject(obj) {
    ctx.save();
    ctx.translate(obj.x, obj.y);

    ctx.fillStyle = obj.color;
    ctx.globalAlpha = obj.kind === "coffee" ? 0.95 : 0.9;
    ctx.beginPath();
    ctx.arc(0, 0, obj.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.fillStyle = "#071018";
    ctx.font = `800 ${Math.max(12, obj.radius * 0.38)}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(obj.label, 0, 0);

    if (obj.kind === "enemy") {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-obj.radius * 0.52, -obj.radius * 0.52);
        ctx.lineTo(obj.radius * 0.52, obj.radius * 0.52);
        ctx.moveTo(obj.radius * 0.52, -obj.radius * 0.52);
        ctx.lineTo(-obj.radius * 0.52, obj.radius * 0.52);
        ctx.stroke();
    }

    ctx.restore();
}

function roundRect(x, y, width, height, radius) {
    const safeRadius = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + safeRadius, y);
    ctx.arcTo(x + width, y, x + width, y + height, safeRadius);
    ctx.arcTo(x + width, y + height, x, y + height, safeRadius);
    ctx.arcTo(x, y + height, x, y, safeRadius);
    ctx.arcTo(x, y, x + width, y, safeRadius);
    ctx.closePath();
}

function draw() {
    drawBackground();
    drawLoadingBar();
    for (const obj of game.objects) {
        drawObject(obj);
    }
}

function loop(now) {
    if (!game.running) return;

    const delta = Math.min((now - game.lastTime) / 1000, 0.05);
    game.lastTime = now;

    updateGame(delta);
    draw();

    if (game.running) requestAnimationFrame(loop);
}

async function endGame(isWin) {
    if (game.finished) return;
    game.running = false;
    game.finished = true;

    const seconds = Math.floor(game.elapsed);
    const title = isWin ? "Skripsi berhasil loading 100%!" : "Stres keburu penuh.";
    const text = isWin
        ? `Skor akhir ${game.score}. Bug dibasmi: ${game.bugsKilled}. Waktu: ${seconds} detik.`
        : `Skor akhir ${game.score}. Coba lagi dan klik bug lebih cepat.`;

    messageTitle.textContent = title;
    messageText.textContent = text;
    messageBox.classList.remove("hidden");

    await submitScore(game.score, game.bugsKilled, seconds);
    await loadScores();
}

function getCanvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (event.clientX - rect.left) * (canvas.width / rect.width),
        y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
}

canvas.addEventListener("click", (event) => {
    if (!game.running) return;

    const point = getCanvasPoint(event);
    let hit = false;

    for (let i = game.objects.length - 1; i >= 0; i -= 1) {
        const obj = game.objects[i];
        const distance = Math.hypot(point.x - obj.x, point.y - obj.y);

        if (distance <= obj.radius) {
            obj.dead = true;
            hit = true;

            if (obj.kind === "enemy") {
                game.bugsKilled += 1;
                game.progress += obj.label === "printer" ? 4 : 2.2;
                game.stress = Math.max(0, game.stress - 2.4);
                game.score += 40;
            } else {
                game.progress += 9;
                game.stress = Math.max(0, game.stress - 8);
                game.score += 120;
            }
            break;
        }
    }

    if (!hit) {
        game.stress += 1.7;
        game.score = Math.max(0, game.score - 8);
    }
});

async function submitScore(score, bugs, seconds) {
    try {
        await fetch("/api/scores", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: playerNameInput.value || "Anonim",
                score,
                bugs,
                seconds,
            }),
        });
    } catch (error) {
        console.error("Gagal mengirim skor:", error);
    }
}

async function loadScores() {
    try {
        const response = await fetch("/api/scores");
        const scores = await response.json();

        scoreList.innerHTML = "";
        if (!scores.length) {
            const li = document.createElement("li");
            li.textContent = "Belum ada skor.";
            scoreList.appendChild(li);
            return;
        }

        for (const item of scores) {
            const li = document.createElement("li");
            li.innerHTML = `<strong>${escapeHtml(item.name)}</strong> - ${item.score} poin, ${item.bugs} bug, ${item.seconds}s`;
            scoreList.appendChild(li);
        }
    } catch (error) {
        scoreList.innerHTML = "<li>Leaderboard gagal dimuat.</li>";
    }
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

startBtn.addEventListener("click", resetGame);
refreshBtn.addEventListener("click", loadScores);

loadScores();
draw();
