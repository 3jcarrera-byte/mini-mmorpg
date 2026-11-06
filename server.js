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

io.on('connection', (socket) => {
    let currentUser = null;

    // Login
    socket.on('auth:login', ({ username }, callback) => {
        currentUser = username;
        if (!charactersDB[username]) charactersDB[username] = [];
        callback({ success: true, characters: charactersDB[username] });
    });

    // Registro
    socket.on('auth:register', ({ username, email, password }, callback) => {
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

        const newChar = { id: Date.now(), name, classType, level: 1, hp: 100 };
        charactersDB[currentUser].push(newChar);

        callback({ success: true, characters: charactersDB[currentUser] });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🎮 MMORPG Backend activo en puerto ${PORT}`));
