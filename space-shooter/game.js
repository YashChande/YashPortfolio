// Game Configuration Constants
const WIDTH = 950;
const HEIGHT = 780;
const PHYSICS_FPS = 165; // Matches the Python game's 165 FPS physics tuning
const DT = 1000 / PHYSICS_FPS;

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game State Variables
let gameState = 'START'; // 'START', 'PLAYING', 'GAMEOVER'
let level = 0;
let lives = 5;
let score = 0;
let highScore = parseInt(localStorage.getItem('space_shooter_high_score') || '0', 10);
let playerName = localStorage.getItem('space_shooter_player_name') || '';
let leaderboard = [];

// Key mappings
const keys = {};

// Entities
let player = null;
let enemies = [];
const particles = [];
let waveLength = 0;

// Movement speeds (Tuned for 165 FPS)
const playerVel = 18;
const enemyVel = 1;
const laserVel = 25;

// Audio Configuration
let audioCtx = null;
let soundEnabled = true;

// Background scrolling
let bgY = 0;

// Starfield stars
const stars = [];
const starLayers = [
    { count: 40, speed: 0.2, size: 1, color: '#444466' },
    { count: 30, speed: 0.5, size: 1.5, color: '#8888aa' },
    { count: 15, speed: 1.2, size: 2, color: '#ffffff' }
];

// Asset Preloading Setup
const ASSETS = {
    bg: 'assets/background-black.png',
    playerShip: 'assets/pixel_ship_yellow.png',
    playerLaser: 'assets/pixel_laser_yellow.png',
    redShip: 'assets/pixel_ship_red_small.png',
    redLaser: 'assets/pixel_laser_red.png',
    greenShip: 'assets/pixel_ship_green_small.png',
    greenLaser: 'assets/pixel_laser_green.png',
    blueShip: 'assets/pixel_ship_blue_small.png',
    blueLaser: 'assets/pixel_laser_blue.png'
};

const IMAGES = {};
let assetsLoaded = 0;
const totalAssets = Object.keys(ASSETS).length;

// Collision Detection Helper
function collide(obj1, obj2) {
    const w1 = obj1.getWidth();
    const h1 = obj1.getHeight();
    const w2 = obj2.getWidth();
    const h2 = obj2.getHeight();

    // Use a slight hitbox padding (12% of size) to make it feel pixel-accurate and fair
    const padX1 = w1 * 0.12;
    const padY1 = h1 * 0.12;
    const padX2 = w2 * 0.12;
    const padY2 = h2 * 0.12;

    return (
        obj1.x + padX1 < obj2.x + w2 - padX2 &&
        obj1.x + w1 - padX1 > obj2.x + padX2 &&
        obj1.y + padY1 < obj2.y + h2 - padY2 &&
        obj1.y + h1 - padY1 > obj2.y + padY2
    );
}

// Particle System
class Particle {
    constructor(x, y, color, vx, vy, size, life) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.vx = vx;
        this.vy = vy;
        this.size = size;
        this.maxLife = life;
        this.life = life;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
    }

    draw(ctx) {
        const alpha = Math.max(0, this.life / this.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
        ctx.restore();
    }
}

function createExplosion(x, y, color, count = 15) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        const size = Math.random() * 3 + 2;
        const life = Math.random() * 25 + 15;
        particles.push(new Particle(x, y, color, vx, vy, size, life));
    }
}

// Sound Synthesis using Web Audio API
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playSFX(type) {
    if (!soundEnabled || !audioCtx) return;
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    const now = audioCtx.currentTime;

    switch (type) {
        case 'laser': {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(150, now + 0.12);
            
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
            
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc.start(now);
            osc.stop(now + 0.12);
            break;
        }
        case 'laserEnemy': {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(320, now);
            osc.frequency.exponentialRampToValueAtTime(60, now + 0.1);
            
            gain.gain.setValueAtTime(0.03, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc.start(now);
            osc.stop(now + 0.1);
            break;
        }
        case 'explosion': {
            try {
                const bufferSize = audioCtx.sampleRate * 0.35;
                const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }
                
                const noise = audioCtx.createBufferSource();
                noise.buffer = buffer;
                
                const filter = audioCtx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(600, now);
                filter.frequency.exponentialRampToValueAtTime(10, now + 0.35);
                
                const gain = audioCtx.createGain();
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
                
                noise.connect(filter);
                filter.connect(gain);
                gain.connect(audioCtx.destination);
                
                noise.start(now);
                noise.stop(now + 0.35);
            } catch (e) {
                // Fallback tone if audio buffer creation fails
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(120, now);
                osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start(now);
                osc.stop(now + 0.3);
            }
            break;
        }
        case 'damage': {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(140, now);
            osc.frequency.setValueAtTime(80, now + 0.07);
            
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
            
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc.start(now);
            osc.stop(now + 0.08);
            break;
        }
        case 'levelUp': {
            const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5 chimes
            notes.forEach((freq, idx) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.07);
                gain.gain.setValueAtTime(0.1, now + idx * 0.07);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.2);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start(now + idx * 0.07);
                osc.stop(now + idx * 0.07 + 0.2);
            });
            break;
        }
    }
}

// Laser Entity
class Laser {
    constructor(x, y, img) {
        this.x = x;
        this.y = y;
        this.img = img;
    }

    draw(ctx) {
        ctx.drawImage(this.img, this.x, this.y);
    }

    move(vel) {
        this.y += vel;
    }

    offScreen(height) {
        return !(this.y <= height && this.y >= 0);
    }

    collision(obj) {
        return collide(this, obj);
    }

    getWidth() {
        return this.img.width;
    }

    getHeight() {
        return this.img.height;
    }
}

// Base Ship Class
class Ship {
    constructor(x, y, health = 100) {
        this.x = x;
        this.y = y;
        this.health = health;
        this.shipImg = null;
        this.laserImg = null;
        this.lasers = [];
        this.coolDownCounter = 0;
        this.cooldownLimit = 10; // Matches Python: self.COOlDOWN=10
    }

    draw(ctx) {
        ctx.drawImage(this.shipImg, this.x, this.y);
        for (let laser of this.lasers) {
            laser.draw(ctx);
        }
    }

    cooldown() {
        if (this.coolDownCounter >= this.cooldownLimit) {
            this.coolDownCounter = 0;
        } else if (this.coolDownCounter > 0) {
            this.coolDownCounter += 3; // Matches Python logic: adding 3 each tick
        }
    }

    getWidth() {
        return this.shipImg ? this.shipImg.width : 50;
    }

    getHeight() {
        return this.shipImg ? this.shipImg.height : 50;
    }
}

// Player Class
class Player extends Ship {
    constructor(x, y, health = 100) {
        super(x, y, health);
        this.shipImg = IMAGES.playerShip;
        this.laserImg = IMAGES.playerLaser;
        this.maxHealth = health;
    }

    shoot() {
        if (this.coolDownCounter === 0) {
            // Center the laser relative to the ship width
            const laserX = this.x + this.getWidth()/2 - IMAGES.playerLaser.width/2;
            const laser = new Laser(laserX, this.y, this.laserImg);
            this.lasers.push(laser);
            this.coolDownCounter = 1;
            playSFX('laser');
        }
    }

    moveLasers(vel, enemies) {
        this.cooldown();
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const laser = this.lasers[i];
            laser.move(vel);
            if (laser.offScreen(HEIGHT)) {
                this.lasers.splice(i, 1);
            } else {
                for (let j = enemies.length - 1; j >= 0; j--) {
                    const enemy = enemies[j];
                    if (laser.collision(enemy)) {
                        // Explosion particles match enemy color
                        const color = enemy.colorName === 'red' ? '#ff3366' : (enemy.colorName === 'green' ? '#33ff88' : '#33b3ff');
                        createExplosion(enemy.x + enemy.getWidth()/2, enemy.y + enemy.getHeight()/2, color, 18);
                        playSFX('explosion');

                        enemies.splice(j, 1);
                        this.lasers.splice(i, 1);
                        score += 10;
                        break;
                    }
                }
            }
        }
    }

    draw(ctx) {
        super.draw(ctx);
        this.healthbar(ctx);
    }

    healthbar(ctx) {
        const barWidth = this.getWidth();
        const barHeight = 10;
        const x = this.x;
        const y = this.y + this.getHeight() + 10;

        // Red bg
        ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
        ctx.fillRect(x, y, barWidth, barHeight);

        // Green fg
        ctx.fillStyle = 'rgba(0, 255, 0, 0.85)';
        const ratio = Math.max(0, this.health / this.maxHealth);
        ctx.fillRect(x, y, barWidth * ratio, barHeight);
    }
}

// Enemy Class
class Enemy extends Ship {
    constructor(x, y, colorName, health = 100) {
        super(x, y, health);
        this.colorName = colorName;

        const COLOR_MAP = {
            red: { ship: IMAGES.redShip, laser: IMAGES.redLaser },
            green: { ship: IMAGES.greenShip, laser: IMAGES.greenLaser },
            blue: { ship: IMAGES.blueShip, laser: IMAGES.blueLaser }
        };

        this.shipImg = COLOR_MAP[colorName].ship;
        this.laserImg = COLOR_MAP[colorName].laser;
    }

    move(vel) {
        this.y += vel;
    }

    shoot() {
        if (this.coolDownCounter === 0) {
            // Offset matches Python (-20px)
            const laser = new Laser(this.x - 20, this.y, this.laserImg);
            this.lasers.push(laser);
            this.coolDownCounter = 1;
            playSFX('laserEnemy');
        }
    }

    moveLasers(vel, playerObj) {
        this.cooldown();
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const laser = this.lasers[i];
            laser.move(vel);
            if (laser.offScreen(HEIGHT)) {
                this.lasers.splice(i, 1);
            } else if (laser.collision(playerObj)) {
                playerObj.health -= 10;
                createExplosion(laser.x + laser.getWidth()/2, laser.y, '#ffd200', 8);
                playSFX('damage');
                this.lasers.splice(i, 1);
            }
        }
    }
}

// Init Parallax Starfield
function initStarfield() {
    stars.length = 0;
    for (let layer of starLayers) {
        for (let i = 0; i < layer.count; i++) {
            stars.push({
                x: Math.random() * WIDTH,
                y: Math.random() * HEIGHT,
                size: layer.size,
                speed: layer.speed,
                color: layer.color
            });
        }
    }
}

// Update Starfield Positions
function updateStarfield() {
    for (let star of stars) {
        star.y += star.speed;
        if (star.y > HEIGHT) {
            star.y = 0;
            star.x = Math.random() * WIDTH;
        }
    }
}

// Draw Background & Starfield Parallax scrolling
function drawBackground() {
    // Scroll background image (slow)
    ctx.drawImage(IMAGES.bg, 0, bgY, WIDTH, HEIGHT);
    ctx.drawImage(IMAGES.bg, 0, bgY - HEIGHT, WIDTH, HEIGHT);
    bgY += 0.4;
    if (bgY >= HEIGHT) bgY = 0;

    // Draw star layers on top
    for (let star of stars) {
        ctx.fillStyle = star.color;
        ctx.fillRect(star.x, star.y, star.size, star.size);
    }
}

// Draw Game Stats directly on canvas (identical text layout to Python)
function drawHUD() {
    ctx.fillStyle = '#ff3333';
    ctx.font = "40px 'Orbitron', 'Comicsans', sans-serif";
    ctx.fillText(`Lives: ${lives}`, 80, 50);

    ctx.fillStyle = '#00ff88';
    ctx.font = "40px 'Orbitron', 'Comicsans', sans-serif";
    const levelText = `Level: ${level}`;
    const levelWidth = ctx.measureText(levelText).width;
    ctx.fillText(levelText, WIDTH - levelWidth - 10, 50);

    // Score indicator (extra cool feature)
    ctx.fillStyle = '#ffcc00';
    ctx.font = "20px 'Orbitron', sans-serif";
    const scoreText = `SCORE: ${score}`;
    const scoreWidth = ctx.measureText(scoreText).width;
    ctx.fillText(scoreText, WIDTH / 2 - scoreWidth / 2, 35);
}

// Leaderboard Initialization & Management
const DEFAULT_LEADERBOARD = [
    { name: 'YASH', score: 500, date: 1600000000000 },
    { name: 'PILOT', score: 300, date: 1600000000001 },
    { name: 'ACE', score: 200, date: 1600000000002 },
    { name: 'ROOKIE', score: 100, date: 1600000000003 },
    { name: 'NOOB', score: 50, date: 1600000000004 }
];

function initLeaderboard() {
    // Set up name input
    const nameInput = document.getElementById('playerNameInput');
    if (nameInput) {
        nameInput.value = playerName;
    }

    // Load leaderboard
    const stored = localStorage.getItem('space_shooter_leaderboard');
    if (stored) {
        try {
            leaderboard = JSON.parse(stored);
        } catch (e) {
            leaderboard = [...DEFAULT_LEADERBOARD];
        }
    } else {
        leaderboard = [...DEFAULT_LEADERBOARD];
        localStorage.setItem('space_shooter_leaderboard', JSON.stringify(leaderboard));
    }

    renderLeaderboards();
}

function renderLeaderboards(highlightedIndex = -1) {
    const startList = document.getElementById('startLeaderboardList');
    const gameOverList = document.getElementById('gameOverLeaderboardList');

    const generateHTML = (listData, highlightIdx) => {
        return listData.map((item, idx) => {
            const rankClass = `rank-${idx + 1}`;
            const highlightClass = idx === highlightIdx ? 'new-highlight' : '';
            return `
                <li class="leaderboard-item ${rankClass} ${highlightClass}">
                    <span class="rank">#${idx + 1}</span>
                    <span class="name">${item.name}</span>
                    <span class="score">${item.score}</span>
                </li>
            `;
        }).join('');
    };

    if (startList) {
        startList.innerHTML = generateHTML(leaderboard, -1);
    }
    if (gameOverList) {
        gameOverList.innerHTML = generateHTML(leaderboard, highlightedIndex);
    }
}

function updateLeaderboard(name, newScore) {
    if (!name) name = 'PILOT';
    name = name.toUpperCase().substring(0, 10);

    const newEntry = { name: name, score: newScore, date: Date.now() };
    leaderboard.push(newEntry);

    // Sort descending by score
    leaderboard.sort((a, b) => b.score - a.score);

    // Keep top 5
    leaderboard = leaderboard.slice(0, 5);

    // Save to localStorage
    localStorage.setItem('space_shooter_leaderboard', JSON.stringify(leaderboard));

    // Find the index of the newly added score to highlight it
    const highlightIdx = leaderboard.findIndex(item => item.score === newScore && item.date === newEntry.date);
    
    renderLeaderboards(highlightIdx);
    
    return highlightIdx;
}

// Reset game variables to start fresh
function resetGame() {
    level = 0;
    lives = 5;
    score = 0;
    player = new Player(WIDTH / 2 - 30, 650);
    enemies = [];
    particles.length = 0;
    waveLength = 0;
    initStarfield();
}

// The core physics/state update (runs at fixed PHYSICS_FPS ticks)
function updateGame() {
    if (gameState !== 'PLAYING') return;

    // Check game over
    if (lives <= 0 || player.health <= 0) {
        // High score updates (legacy single-score high score support)
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('space_shooter_high_score', highScore);
        }

        // Leaderboard updates
        updateLeaderboard(playerName, score);

        playSFX('explosion');
        createExplosion(player.x + player.getWidth()/2, player.y + player.getHeight()/2, '#ffd200', 40);
        
        gameState = 'GAMEOVER';
        document.getElementById('finalLevel').textContent = level;
        document.getElementById('finalScore').textContent = score;
        document.getElementById('gameOverScreen').classList.add('active');
        return;
    }

    // Level progression
    if (enemies.length === 0) {
        level++;
        waveLength += 5;
        playSFX('levelUp');
        // Spawn wave
        for (let i = 0; i < waveLength; i++) {
            const x = Math.floor(Math.random() * (WIDTH - 150)) + 50;
            const y = Math.floor(Math.random() * -1400) - 100; // starts off screen
            const color = ['red', 'blue', 'green'][Math.floor(Math.random() * 3)];
            enemies.push(new Enemy(x, y, color));
        }
    }

    // Player inputs
    if (keys['ArrowLeft'] || keys['KeyA']) {
        if (player.x - playerVel > -50) player.x -= playerVel;
    }
    if (keys['ArrowRight'] || keys['KeyD']) {
        if (player.x + playerVel + player.getWidth() < WIDTH + 50) player.x += playerVel;
    }
    if (keys['ArrowUp'] || keys['KeyW']) {
        if (player.y - playerVel > 0) player.y -= playerVel;
    }
    if (keys['ArrowDown'] || keys['KeyS']) {
        if (player.y + playerVel + player.getHeight() + 20 < HEIGHT) player.y += playerVel;
    }
    if (keys['Space']) {
        player.shoot();
    }

    // Move player lasers
    player.moveLasers(-laserVel, enemies);

    // Update enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        enemy.move(enemyVel);
        enemy.moveLasers(laserVel, player);

        // Random shooting (Matches Python: 1 in PHYSICS_FPS chance per frame)
        if (Math.floor(Math.random() * PHYSICS_FPS) === 1) {
            enemy.shoot();
        }

        // Collision: enemy hits player
        if (collide(enemy, player)) {
            player.health -= 10;
            createExplosion(enemy.x + enemy.getWidth()/2, enemy.y + enemy.getHeight()/2, '#ff3366', 20);
            playSFX('damage');
            enemies.splice(i, 1);
        }
        // Enemy escapes off bottom of screen
        else if (enemy.y + enemy.getHeight() > HEIGHT) {
            lives--;
            enemies.splice(i, 1);
        }
    }

    // Update stars
    updateStarfield();

    // Update explosion particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

// Rendering function (Runs at browser frame rate)
function drawGame() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    if (gameState === 'START') {
        // Draw starry background even in menu
        drawBackground();
        updateStarfield();
    } 
    else if (gameState === 'PLAYING' || gameState === 'GAMEOVER') {
        drawBackground();

        // Draw entities
        for (let enemy of enemies) {
            enemy.draw(ctx);
        }
        
        // Draw particles
        for (let p of particles) {
            p.draw(ctx);
        }

        if (lives > 0 && player.health > 0) {
            player.draw(ctx);
        }

        drawHUD();
    }
}

// Keyboard input listeners
window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault(); // Prevents page scrolling
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// UI Buttons Setup
const startBtn = document.getElementById('startButton');
const restartBtn = document.getElementById('restartButton');
const soundToggleBtn = document.getElementById('soundToggle');
const soundOnIcon = document.getElementById('soundOnIcon');
const soundOffIcon = document.getElementById('soundOffIcon');

startBtn.addEventListener('click', () => {
    initAudio();
    const nameInput = document.getElementById('playerNameInput');
    playerName = nameInput ? nameInput.value.trim() : '';
    if (!playerName) playerName = 'PILOT';
    localStorage.setItem('space_shooter_player_name', playerName);

    document.getElementById('startScreen').classList.remove('active');
    gameState = 'PLAYING';
    resetGame();
});

restartBtn.addEventListener('click', () => {
    initAudio();
    document.getElementById('gameOverScreen').classList.remove('active');
    gameState = 'PLAYING';
    resetGame();
});

soundToggleBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    if (soundEnabled) {
        soundOnIcon.classList.remove('hidden');
        soundOffIcon.classList.add('hidden');
        initAudio();
    } else {
        soundOnIcon.classList.add('hidden');
        soundOffIcon.classList.remove('hidden');
    }
});

// Main Loop logic using a fixed physics accumulator
let lastTime = 0;
let accumulator = 0;

function gameLoop(currentTime) {
    if (!lastTime) lastTime = currentTime;
    let elapsed = currentTime - lastTime;
    lastTime = currentTime;

    // Prevent spiral of death on lag spikes
    if (elapsed > 100) elapsed = 100;

    accumulator += elapsed;

    // Tick physics update as many times as needed to match PHYSICS_FPS
    while (accumulator >= DT) {
        updateGame();
        accumulator -= DT;
    }

    // Render frame
    drawGame();

    requestAnimationFrame(gameLoop);
}

// Preload assets and start loop
function preloadAndInit() {
    // Initialize leaderboard and name inputs
    initLeaderboard();
    
    // Create pre-game star background
    initStarfield();

    let loadedCount = 0;
    for (let key in ASSETS) {
        const img = new Image();
        img.src = ASSETS[key];
        img.onload = () => {
            IMAGES[key] = img;
            loadedCount++;
            if (loadedCount === totalAssets) {
                // All assets loaded, start game loop
                requestAnimationFrame(gameLoop);
            }
        };
        img.onerror = () => {
            console.error(`Asset failed to load: ${ASSETS[key]}`);
            loadedCount++;
            if (loadedCount === totalAssets) {
                requestAnimationFrame(gameLoop);
            }
        };
    }
}

// Trigger preloading
preloadAndInit();
