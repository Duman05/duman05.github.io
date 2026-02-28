const WebSocket = require("ws");
const server = new WebSocket.Server({ port: 3000 });

let players = {};
let bullets = [];

const walls = [
    { x: 200, y: 150, width: 400, height: 20 },
    { x: 100, y: 400, width: 600, height: 20 },
    { x: 350, y: 250, width: 20, height: 150 }
];

function randomPosition() {
    return {
        x: Math.random() * 700 + 50,
        y: Math.random() * 500 + 50
    };
}

function isCollidingWithWall(x, y) {
    for (let wall of walls) {
        if (
            x + 20 > wall.x &&
            x - 20 < wall.x + wall.width &&
            y + 20 > wall.y &&
            y - 20 < wall.y + wall.height
        ) {
            return true;
        }
    }
    return false;
}

server.on("connection", (ws) => {
    const id = Math.random().toString(36).substr(2, 9);

    players[id] = {
        ...randomPosition(),
        score: 0,
        health: 100
    };

    ws.send(JSON.stringify({ type: "init", id, walls }));

    ws.on("message", (message) => {
        const data = JSON.parse(message);

        if (data.type === "move") {
            if (!isCollidingWithWall(data.x, data.y)) {
                players[id].x = data.x;
                players[id].y = data.y;
            }
        }

        if (data.type === "shoot") {
            bullets.push({
                x: players[id].x,
                y: players[id].y,
                dx: data.dx,
                dy: data.dy,
                owner: id
            });
        }
    });

    ws.on("close", () => {
        delete players[id];
    });
});

function updateBullets() {
    bullets.forEach((bullet, index) => {
        bullet.x += bullet.dx * 10;
        bullet.y += bullet.dy * 10;

        // Duvara çarpma
        for (let wall of walls) {
            if (
                bullet.x > wall.x &&
                bullet.x < wall.x + wall.width &&
                bullet.y > wall.y &&
                bullet.y < wall.y + wall.height
            ) {
                bullets.splice(index, 1);
                return;
            }
        }

        // Harita dışı
        if (bullet.x < 0 || bullet.x > 800 || bullet.y < 0 || bullet.y > 600) {
            bullets.splice(index, 1);
            return;
        }

        for (let id in players) {
            if (id === bullet.owner) continue;

            const p = players[id];
            const dx = p.x - bullet.x;
            const dy = p.y - bullet.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 20) {
                p.health -= 25;
                bullets.splice(index, 1);

                if (p.health <= 0) {
                    players[bullet.owner].score++;
                    players[id] = {
                        ...randomPosition(),
                        score: 0,
                        health: 100
                    };
                }
                break;
            }
        }
    });
}

setInterval(() => {
    updateBullets();

    server.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: "update",
                players,
                bullets,
                walls
            }));
        }
    });
}, 1000 / 30);
