document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    let selectedCharacter = null;
    let currentUserCharacters = [];

    // Inicializar Motor 3D de Selección
    CharacterModule.init3D();

    // Navegación de Pantallas
    function showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const target = document.getElementById(screenId);
        if (target) target.classList.add('active');
    }

    // --- 1. PANTALLA LOGIN ---
    document.getElementById('btn-login').addEventListener('click', () => {
        const user = document.getElementById('login-username').value.trim();
        const pass = document.getElementById('login-password').value;

        if (!user || !pass) return alert('Ingresa usuario y contraseña');

        // Notificar al servidor el inicio de sesión enviando usuario y clave
        socket.emit('auth:login', { username: user, password: pass }, (response) => {
            if (response.success) {
                currentUserCharacters = response.characters || [];
                renderCharacterSlots(currentUserCharacters);
                
                // Renderizar los personajes en la escena 3D (Estilo Albion)
                CharacterModule.renderUserCharacters3D(currentUserCharacters);
                
                showScreen('screen-character');
            } else {
                alert(response.message || 'Error de autenticación');
            }
        });
    });

    document.getElementById('btn-to-register').addEventListener('click', () => showScreen('screen-register'));
    document.getElementById('btn-to-forgot').addEventListener('click', () => showScreen('screen-forgot'));

    // --- 2. PANTALLA REGISTRO ---
    document.getElementById('btn-register-submit').addEventListener('click', () => {
        const username = document.getElementById('reg-username').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-password').value;

        if (!username || !email || !password) return alert('Completa todos los campos');

        socket.emit('auth:register', { username, email, password }, (res) => {
            if (res.success) {
                alert('¡Registro exitoso! Ya puedes iniciar sesión.');
                showScreen('screen-login');
            } else {
                alert(res.message || 'Error al registrar.');
            }
        });
    });

    document.getElementById('btn-back-to-login').addEventListener('click', () => showScreen('screen-login'));

    // --- 3. RECUPERACIÓN DE CLAVE / SOPORTE ---
    document.getElementById('btn-send-support').addEventListener('click', () => {
        const email = document.getElementById('forgot-email').value.trim();
        if (!email) return alert('Ingresa tu correo registrado.');

        const subject = encodeURIComponent('Recuperación de Contraseña - Mini MMORPG');
        const body = encodeURIComponent(`Hola Soporte Técnico,\n\nSolicito la recuperación de contraseña para la cuenta vinculada al correo: ${email}`);
        window.location.href = `mailto:soporte@minimmorpg.com?subject=${subject}&body=${body}`;

        alert('Se ha abierto tu cliente de correo para enviar la solicitud al Soporte Técnico.');
        showScreen('screen-login');
    });

    document.getElementById('btn-forgot-to-login').addEventListener('click', () => showScreen('screen-login'));

    // --- 4. CREACIÓN Y SELECCIÓN DE PERSONAJES (ESTILO ALBION / MU) ---
    document.getElementById('btn-to-create').addEventListener('click', () => {
        document.getElementById('panel-create-controls').style.display = 'flex';
        document.getElementById('btn-to-create').style.display = 'none';
        document.getElementById('btn-play').style.display = 'none';
        
        // Activar visualización 3D de avatares de clase para crear
        CharacterModule.setCreationMode(true);
    });

    // BOTÓN CANCELAR CREACIÓN
    document.getElementById('btn-cancel-create').addEventListener('click', () => {
        document.getElementById('panel-create-controls').style.display = 'none';
        document.getElementById('btn-to-create').style.display = 'block';
        document.getElementById('create-char-name').value = '';
        
        // Ocultar avatares de creación y restaurar los personajes del usuario en 3D
        CharacterModule.setCreationMode(false);
        CharacterModule.renderUserCharacters3D(currentUserCharacters);
        
        if (selectedCharacter) {
            document.getElementById('btn-play').style.display = 'block';
        }
    });

    // Flechas para cambiar de clase 3D en modo creación
    document.getElementById('btn-arrow-left').addEventListener('click', () => CharacterModule.prevClass());
    document.getElementById('btn-arrow-right').addEventListener('click', () => CharacterModule.nextClass());

    // Confirmar Creación
    document.getElementById('btn-confirm-create').addEventListener('click', () => {
        const name = document.getElementById('create-char-name').value.trim();
        const selectedClass = CharacterModule.getCurrentClass();

        if (!name) return alert('Ingresa un nombre para tu personaje.');

        socket.emit('character:create', { name, classType: selectedClass.id }, (res) => {
            if (res.success) {
                currentUserCharacters = res.characters;
                renderCharacterSlots(currentUserCharacters);
                document.getElementById('btn-cancel-create').click(); // Limpiar UI y salir de modo creación
            } else {
                alert(res.message || 'Error al crear personaje.');
            }
        });
    });

    // Listener global cuando haces clic directamente en un personaje 3D en el canvas
    window.onCharacter3DSelected = (char) => {
        selectedCharacter = char;
        
        // Sincronizar selección visual en los slots inferiores
        const slots = document.querySelectorAll('.char-slot');
        slots.forEach((slot, idx) => {
            slot.classList.toggle('selected', currentUserCharacters[idx] && currentUserCharacters[idx].id === char.id);
        });

        if (document.getElementById('panel-create-controls').style.display !== 'flex') {
            const playBtn = document.getElementById('btn-play');
            playBtn.style.display = 'block';
            playBtn.innerText = `JUGAR CON ${char.name.toUpperCase()}`;
        }
    };

    function renderCharacterSlots(list) {
        const container = document.getElementById('character-list');
        container.innerHTML = '';

        // Renderizar 3 slots fijos estilo Mu/Albion
        for (let i = 0; i < 3; i++) {
            const char = list[i];
            const div = document.createElement('div');

            if (char) {
                div.className = 'char-slot';
                div.innerHTML = `<strong>${char.name}</strong><br><span style="font-size:9px; color:#ffd700;">Lv.${char.level || 1} ${char.classType.toUpperCase()}</span>`;
                div.addEventListener('click', () => {
                    document.querySelectorAll('.char-slot').forEach(s => s.classList.remove('selected'));
                    div.classList.add('selected');
                    selectedCharacter = char;

                    if (document.getElementById('panel-create-controls').style.display !== 'flex') {
                        const playBtn = document.getElementById('btn-play');
                        playBtn.style.display = 'block';
                        playBtn.innerText = `JUGAR CON ${char.name.toUpperCase()}`;
                    }
                });
            } else {
                div.className = 'char-slot empty';
                div.innerText = `[ VACÍO ]`;
            }
            container.appendChild(div);
        }
    }

    // Entrar al Mapa Multijugador
    document.getElementById('btn-play').addEventListener('click', () => {
        if (!selectedCharacter) return;
        showScreen('screen-game');
        document.getElementById('hud-char-name').innerText = `${selectedCharacter.name} (Lv.${selectedCharacter.level || 1})`;
        if (window.GameModule) window.GameModule.start(selectedCharacter);
    });

    // Botón para salir desde el juego al menú principal
    const btnReturnMenu = document.getElementById('btn-return-menu');
    if (btnReturnMenu) {
        btnReturnMenu.addEventListener('click', () => {
            showScreen('screen-character');
            CharacterModule.renderUserCharacters3D(currentUserCharacters);
            document.getElementById('btn-play').style.display = selectedCharacter ? 'block' : 'none';
        });
    }

    document.getElementById('btn-logout').addEventListener('click', () => {
        selectedCharacter = null;
        currentUserCharacters = [];
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';
        showScreen('screen-login');
    });
});
