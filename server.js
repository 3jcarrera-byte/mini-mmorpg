const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// Base de datos simulada en memoria con el usuario admin por defecto
const usersDB = {
    'admin': { 
        email: 'admin@minimmorpg.com', 
        password: '1234' 
    }
};

const charactersDB = {
    'admin': [
        { id: 999, name: 'GM_Admin', classType: 'guerrero', level: 99, hp: 500 }
    ]
};

// Base de datos simulada de inventarios por jugador (clave: socket.id o username)
const playerInventories = {};
const MAX_SLOTS = 20;
const MAX_STACK_SIZE = 100;

io.on('connection', (socket) => {
    let currentUser = null;

    // Login (Validando credenciales)
    socket.on('auth:login', ({ username, password }, callback) => {
        const userRecord = usersDB[username];
        if (!userRecord || userRecord.password !== password) {
            return callback({ success: false, message: 'Usuario o contraseña incorrectos.' });
        }

        currentUser = username;
        if (!charactersDB[username]) charactersDB[username] = [];
        callback({ success: true, characters: charactersDB[username] });
    });

    // Registro
    socket.on('auth:register', ({ username, email, password }, callback) => {
        if (!username || !email || !password) {
            return callback({ success: false, message: 'Completa todos los campos.' });
        }
        if (usersDB[username]) {
            return callback({ success: false, message: 'El usuario ya existe.' });
        }
        usersDB[username] = { email, password };
        charactersDB[username] = [];
        callback({ success: true });
    });

    // Crear Personaje
    socket.on('character:create', ({ name, classType }, callback) => {
        if (!currentUser) return callback({ success: false, message: 'No autenticado.' });
        if (!name || !name.trim()) return callback({ success: false, message: 'Nombre de héroe inválido.' });

        const newChar = { id: Date.now(), name: name.trim(), classType: classType || 'guerrero', level: 1, hp: 100 };
        charactersDB[currentUser].push(newChar);

        callback({ success: true, characters: charactersDB[currentUser] });
    });

    // Eliminar Personaje
    socket.on('character:delete', ({ characterId }, callback) => {
        if (!currentUser) return callback({ success: false, message: 'No autenticado.' });

        if (!charactersDB[currentUser]) {
            return callback({ success: false, message: 'No se encontraron personajes.' });
        }

        const initialLength = charactersDB[currentUser].length;
        charactersDB[currentUser] = charactersDB[currentUser].filter(c => 
            c.id.toString() !== characterId.toString() && 
            (c._id ? c._id.toString() !== characterId.toString() : true)
        );

        if (charactersDB[currentUser].length === initialLength) {
            return callback({ success: false, message: 'Personaje no encontrado.' });
        }

        callback({ success: true, characters: charactersDB[currentUser] });
    });

    // Evento de inicialización del mundo e inventario al unirse al juego
    socket.on('joinGame', (userData) => {
        const playerId = socket.id;
        
        if (!playerInventories[playerId]) {
            playerInventories[playerId] = Array(MAX_SLOTS).fill(null);
            playerInventories[playerId][0] = { id: 1, type: 'wood', name: 'Madera', count: 100, icon: '🪵', color: '#e67e22' };
            playerInventories[playerId][1] = { id: 2, type: 'stone', name: 'Piedra', count: 25, icon: '🪨', color: '#95a5a6' };
        }

        socket.emit('initWorld', { inventory: playerInventories[playerId] });
    });

    // Sincronización y validación segura del inventario del cliente
    socket.on('updateInventory', (data) => {
        const playerId = socket.id;
        const incomingItems = data && data.items;

        if (!Array.isArray(incomingItems) || incomingItems.length > MAX_SLOTS) {
            socket.emit('serverNotification', { message: 'Inventario inválido.', type: 'error' });
            return;
        }

        let isValid = true;
        const allowedTypes = ['wood', 'stone'];

        const validatedItems = incomingItems.map((item, index) => {
            if (!item) return null;

            if (!allowedTypes.includes(item.type)) {
                isValid = false;
            }

            if (typeof item.count !== 'number' || item.count <= 0 || item.count > MAX_STACK_SIZE) {
                isValid = false;
            }

            return {
                id: item.id || Date.now() + index,
                type: item.type,
                name: item.name || item.type,
                count: Math.min(Math.max(1, item.count), MAX_STACK_SIZE),
                icon: item.icon || '📦',
                color: item.color || '#ffffff'
            };
        });

        if (!isValid) {
            socket.emit('serverNotification', { message: 'Se detectaron anomalías en el inventario.', type: 'error' });
            socket.emit('resourceUpdated', { inventory: playerInventories[playerId] });
            return;
        }

        playerInventories[playerId] = validatedItems;

        let woodTotal = 0;
        let stoneTotal = 0;
        validatedItems.forEach(item => {
            if (item) {
                if (item.type === 'wood') woodTotal += item.count;
                if (item.type === 'stone') stoneTotal += item.count;
            }
        });

        socket.emit('resourceUpdated', { wood: woodTotal, stone: stoneTotal });
    });

    // Sincronización de movimiento de jugadores en tiempo real (Esférico / Servidor)
    socket.on('playerMove', (posData) => {
        socket.broadcast.emit('remotePlayerMove', { id: socket.id, position: posData });
    });

    socket.on('disconnect', () => {
        console.log(`Jugador desconectado: ${socket.id}`);
        delete playerInventories[socket.id];
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🎮 MMORPG Backend activo en puerto ${PORT}`));
