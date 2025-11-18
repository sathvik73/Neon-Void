
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('scoreEl');
const finalScoreEl = document.getElementById('finalScore');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const fpsEl = document.getElementById('fpsEl');

// Game State
let gameActive = false;
let score = 0;
let lastTime = 0;
let frames = 0;
let spawnTimer = 0;
let difficultyMultiplier = 1;

// Input State
const keys = {
    w: false, a: false, s: false, d: false,
    ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false
};
const mouse = { x: 0, y: 0, down: false };

// Screen Shake
let shakeIntensity = 0;

// Game Objects
let player;
let bullets = [];
let asteroids = [];
let particles = [];

// Resize handling
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Utility
function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

function dist(x1, y1, x2, y2) {
    return Math.hypot(x1 - x2, y1 - y2);
}

// Classes
class Player {
    constructor() {
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        this.radius = 15;
        this.angle = 0;
        this.velocity = { x: 0, y: 0 };
        this.friction = 0.96;
        this.speed = 0.5;
        this.color = '#00ffcc';
        this.shootTimer = 0;
        this.shootCooldown = 15; // Frames
    }

    update() {
        // Rotation
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        this.angle = Math.atan2(dy, dx);

        // Movement input
        if (keys.w || keys.ArrowUp) this.velocity.y -= this.speed;
        if (keys.s || keys.ArrowDown) this.velocity.y += this.speed;
        if (keys.a || keys.ArrowLeft) this.velocity.x -= this.speed;
        if (keys.d || keys.ArrowRight) this.velocity.x += this.speed;

        // Apply physics
        this.velocity.x *= this.friction;
        this.velocity.y *= this.friction;
        this.x += this.velocity.x;
        this.y += this.velocity.y;

        // Boundary constraints (wrap around)
        if (this.x < -this.radius) this.x = canvas.width + this.radius;
        if (this.x > canvas.width + this.radius) this.x = -this.radius;
        if (this.y < -this.radius) this.y = canvas.height + this.radius;
        if (this.y > canvas.height + this.radius) this.y = -this.radius;

        // Shooting
        if (mouse.down && this.shootTimer <= 0) {
            this.shoot();
            this.shootTimer = this.shootCooldown;
        }
        if (this.shootTimer > 0) this.shootTimer--;
    }

    shoot() {
        const muzzleVelocity = 12;
        const bx = this.x + Math.cos(this.angle) * 20;
        const by = this.y + Math.sin(this.angle) * 20;
        
        bullets.push(new Bullet(bx, by, Math.cos(this.angle) * muzzleVelocity, Math.sin(this.angle) * muzzleVelocity));
        
        // Recoil
        this.velocity.x -= Math.cos(this.angle) * 2;
        this.velocity.y -= Math.sin(this.angle) * 2;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;

        // Draw Ship
        ctx.beginPath();
        ctx.moveTo(20, 0); // Nose
        ctx.lineTo(-15, 15); // Bottom Right
        ctx.lineTo(-5, 0); // Engine indent
        ctx.lineTo(-15, -15); // Bottom Left
        ctx.closePath();
        ctx.stroke();

        // Engine Flame
        if (keys.w || keys.ArrowUp || keys.a || keys.s || keys.d || keys.ArrowLeft || keys.ArrowRight) {
            ctx.beginPath();
            ctx.moveTo(-10, 0);
            ctx.lineTo(-25 - Math.random() * 10, 0);
            ctx.strokeStyle = '#ff0055';
            ctx.shadowColor = '#ff0055';
            ctx.stroke();
        }

        ctx.restore();
    }
}

class Bullet {
    constructor(x, y, vx, vy) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.radius = 2;
        this.life = 100;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#fff';
        ctx.fill();
    }
}

class Asteroid {
    constructor(x, y, r) {
        this.x = x;
        this.y = y;
        this.radius = r;
        this.color = Math.random() > 0.9 ? '#ff0055' : '#fff'; // 10% chance of red asteroid
        
        // Movement towards center roughly, but with variation
        const angleToCenter = Math.atan2(canvas.height/2 - y, canvas.width/2 - x);
        const spread = 0.5; // Random spread in angle
        const moveAngle = angleToCenter + randomRange(-spread, spread);
        const speed = randomRange(1, 3) * difficultyMultiplier;

        this.velocity = {
            x: Math.cos(moveAngle) * speed,
            y: Math.sin(moveAngle) * speed
        };

        // Shape generation
        this.vertices = [];
        const numVertices = Math.floor(randomRange(5, 12));
        for (let i = 0; i < numVertices; i++) {
            const angle = (i / numVertices) * Math.PI * 2;
            const rOffset = randomRange(this.radius * 0.5, this.radius);
            this.vertices.push({
                x: Math.cos(angle) * rOffset,
                y: Math.sin(angle) * rOffset
            });
        }
        
        this.rotation = 0;
        this.rotationSpeed = randomRange(-0.05, 0.05);
    }

    update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.rotation += this.rotationSpeed;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.shadowBlur = this.color === '#fff' ? 5 : 15;
        ctx.shadowColor = this.color;

        ctx.beginPath();
        ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
        for (let i = 1; i < this.vertices.length; i++) {
            ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
        }
        ctx.closePath();
        ctx.stroke();

        // Inner detail dot
        ctx.fillStyle = this.color;
        ctx.fillRect(-2, -2, 4, 4);

        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4;
        this.velocity = {
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed
        };
        this.alpha = 1;
        this.decay = Math.random() * 0.03 + 0.01;
    }

    update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.alpha -= this.decay;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// Input Listeners
window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
});

window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

window.addEventListener('mousedown', () => mouse.down = true);
window.addEventListener('mouseup', () => mouse.down = false);

// Game Logic
function spawnAsteroid() {
    let x, y;
    // Spawn outside screen
    if (Math.random() < 0.5) {
        x = Math.random() < 0.5 ? -50 : canvas.width + 50;
        y = Math.random() * canvas.height;
    } else {
        x = Math.random() * canvas.width;
        y = Math.random() < 0.5 ? -50 : canvas.height + 50;
    }

    // Size variation
    const r = randomRange(20, 50);
    asteroids.push(new Asteroid(x, y, r));
}

function createExplosion(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function gameOver() {
    gameActive = false;
    finalScoreEl.textContent = Math.floor(score);
    gameOverScreen.classList.remove('hidden');
    shakeIntensity = 20;
}

function init() {
    player = new Player();
    bullets = [];
    asteroids = [];
    particles = [];
    score = 0;
    difficultyMultiplier = 1;
    scoreEl.textContent = '0';
    gameActive = true;
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    animate();
}

function animate(time) {
    if (!gameActive) return;

    requestAnimationFrame(animate);

    // Delta time calc for FPS
    const delta = time - lastTime;
    lastTime = time;
    // Simple FPS update every 10 frames
    if (frames % 20 === 0) {
        fpsEl.textContent = Math.round(1000/delta) || 60;
    }
    frames++;

    // Background & Trails
    ctx.fillStyle = 'rgba(5, 5, 5, 0.4)'; // Trail effect
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Screen Shake
    ctx.save();
    if (shakeIntensity > 0) {
        const dx = (Math.random() - 0.5) * shakeIntensity;
        const dy = (Math.random() - 0.5) * shakeIntensity;
        ctx.translate(dx, dy);
        shakeIntensity *= 0.9; // Decay
        if (shakeIntensity < 0.5) shakeIntensity = 0;
    }

    // Update Player
    player.update();
    player.draw();

    // Spawner
    difficultyMultiplier = 1 + (score / 5000); // Gets harder over time
    const spawnRate = Math.max(20, 100 - (score / 100)); 
    
    if (frames % Math.floor(spawnRate) === 0) {
        spawnAsteroid();
    }

    // Update Bullets
    bullets.forEach((bullet, index) => {
        bullet.update();
        bullet.draw();
        
        // Remove offscreen bullets
        if (bullet.x < 0 || bullet.x > canvas.width || 
            bullet.y < 0 || bullet.y > canvas.height || 
            bullet.life <= 0) {
            bullets.splice(index, 1);
        }
    });

    // Update Particles
    particles.forEach((particle, index) => {
        particle.update();
        particle.draw();
        if (particle.alpha <= 0) particles.splice(index, 1);
    });

    // Update Asteroids & Collision
    asteroids.forEach((asteroid, aIndex) => {
        asteroid.update();
        asteroid.draw();

        // Collision: Asteroid vs Player
        const distPlayer = dist(player.x, player.y, asteroid.x, asteroid.y);
        if (distPlayer < asteroid.radius + player.radius - 5) {
            createExplosion(player.x, player.y, '#00ffcc', 30);
            createExplosion(asteroid.x, asteroid.y, asteroid.color, 20);
            gameOver();
        }

        // Clean up off-screen asteroids (very far off screen)
        if (asteroid.x < -100 || asteroid.x > canvas.width + 100 ||
            asteroid.y < -100 || asteroid.y > canvas.height + 100) {
            asteroids.splice(aIndex, 1);
        }

        // Collision: Asteroid vs Bullets
        bullets.forEach((bullet, bIndex) => {
            const distBullet = dist(bullet.x, bullet.y, asteroid.x, asteroid.y);
            
            if (distBullet < asteroid.radius) {
                // Hit!
                createExplosion(asteroid.x, asteroid.y, asteroid.color, 5);
                bullets.splice(bIndex, 1);
                
                // Score
                score += (100 / asteroid.radius) * 50;
                scoreEl.textContent = Math.floor(score);

                // Shrink or Destroy
                if (asteroid.radius > 25) {
                    // Split
                    asteroid.radius /= 1.5;
                    // Add momentum to the split
                    asteroid.velocity.x += bullet.vx * 0.2;
                    asteroid.velocity.y += bullet.vy * 0.2;
                    shakeIntensity = 3;
                } else {
                    // Destroy
                    asteroids.splice(aIndex, 1);
                    createExplosion(asteroid.x, asteroid.y, asteroid.color, 15);
                    shakeIntensity = 5;
                }
            }
        });
    });

    ctx.restore(); // End screen shake
}

// Button Listeners
document.getElementById('startBtn').addEventListener('click', init);
document.getElementById('restartBtn').addEventListener('click', init);
