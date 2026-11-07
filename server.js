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

    // Eliminar Personaje
    socket.on('character:delete', ({ characterId }, callback) => {
        if (!currentUser) return callback({ success: false, message: 'No autenticado.' });

        if (!charactersDB[currentUser]) {
            return callback({ success: false, message: 'No se encontraron personajes.' });
        }

        const initialLength = charactersDB[currentUser].length;
        // Filtrar eliminando el personaje que coincida por id o _id (soporta formato numérico o string)
        charactersDB[currentUser] = charactersDB[currentUser].filter(c => 
            c.id.toString() !== characterId.toString() && 
            (c._id ? c._id.toString() !== characterId.toString() : true)
        );

        if (charactersDB[currentUser].length === initialLength) {
            return callback({ success: false, message: 'Personaje no encontrado.' });
        }

        callback({ success: true, characters: charactersDB[currentUser] });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🎮 MMORPG Backend activo en puerto ${PORT}`));
