const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: "*" } });

app.use(express.static(__dirname + '/public'));

const players = {};
const structures = [];

// --- SISTEMA DE INTELIGENCIA ARTIFICIAL (NPCs) ---
const npcs = {
    "npc_zombie_1": { id: "npc_zombie_1", x: 10, y: 1, z: -10, color: "#2e7d32", name: "ZOMBIE MUTANTE" },
    "npc_zombie_2": { id: "npc_zombie_2", x: -15, y: 1, z: 15, color: "#2e7d32", name: "ZOMBIE RAIDER" }
};

// Bucle de IA del Servidor: Mueve a los NPCs de forma autónoma cada 2 segundos
setInterval(() => {
    Object.keys(npcs).forEach(id => {
        const npc = npcs[id];
        // Simulación de patrullaje simple (Movimiento aleatorio estilo Rust/Oxide)
        npc.x += (Math.random() - 0.5) * 4;
        npc.z += (Math.random() - 0.5) * 4;

        // Límites del mapa para los NPCs
        npc.x = Math.max(-90, Math.min(90, npc.x));
        npc.z = Math.max(-90, Math.min(90, npc.z));

        // Transmitir la nueva posición calculada por la IA a todos los jugadores en tiempo real
        io.emit('npcMoved', { id: npc.id, x: npc.x, z: npc.z });
    });
}, 2000);

io.on('connection', (socket) => {
    console.log(`Jugador conectado: ${socket.id}`);

    players[socket.id] = {
        id: socket.id,
        name: "Superviviente",
        x: 0, y: 1, z: 0,
        color: "#ffffff",
        wood: 100
    };

    // Al conectarse, enviamos los jugadores, estructuras Y los NPCs activos del servidor
    socket.emit('initWorld', { players, structures, npcs });
    socket.broadcast.emit('newPlayer', players[socket.id]);

    socket.on('playerMove', (pos) => {
        if (players[socket.id]) {
            players[socket.id].x = pos.x;
            players[socket.id].z = pos.z;
            socket.broadcast.emit('playerMoved', { id: socket.id, x: pos.x, z: pos.z });
        }
    });

    socket.on('buildStructure', (structData) => {
        if (players[socket.id] && players[socket.id].wood >= 10) {
            players[socket.id].wood -= 10;
            const newStructure = {
                id: Date.now() + Math.random().toString(36).substr(2, 5),
                x: structData.x, y: structData.y, z: structData.z, type: structData.type
            };
            structures.push(newStructure);
            io.emit('structureBuilt', newStructure);
        }
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

const PORT = 3000;
http.listen(PORT, () => console.log(`Servidor con IA corriendo en http://localhost:${PORT}`));
