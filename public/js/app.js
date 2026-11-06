document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    let selectedCharacter = null;

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
        if (!user) return alert('Ingresa un usuario');

        // Notificar al servidor el inicio de sesión
        socket.emit('auth:login', { username: user }, (response) => {
            if (response.success) {
                renderCharacterList(response.characters);
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

        // Enviar correo mediante mailto al soporte técnico
        const subject = encodeURIComponent('Recuperación de Contraseña - Mini MMORPG');
        const body = encodeURIComponent(`Hola Soporte Técnico,\n\nSolicito la recuperación de contraseña para la cuenta vinculada al correo: ${email}`);
        window.location.href = `mailto:soporte@minimmorpg.com?subject=${subject}&body=${body}`;

        alert('Se ha abierto tu cliente de correo para enviar la solicitud al Soporte Técnico.');
        showScreen('screen-login');
    });

    document.getElementById('btn-forgot-to-login').addEventListener('click', () => showScreen('screen-login'));

    // --- 4. CREACIÓN Y SELECCIÓN DE PERSONAJES ---
    document.getElementById('btn-to-create').addEventListener('click', () => {
        document.getElementById('panel-create-controls').style.display = 'block';
        document.getElementById('btn-arrow-left').style.display = 'block';
        document.getElementById('btn-arrow-right').style.display = 'block';
        document.getElementById('btn-play').style.display = 'none';
        CharacterModule.focusClass(0);
    });

    // BOTÓN CANCELAR CREACIÓN (CORREGIDO)
    document.getElementById('btn-cancel-create').addEventListener('click', () => {
        document.getElementById('panel-create-controls').style.display = 'none';
        document.getElementById('btn-arrow-left').style.display = 'none';
        document.getElementById('btn-arrow-right').style.display = 'none';
        document.getElementById('create-char-name').value = '';
    });

    // Flechas para cambiar de clase 3D
    document.getElementById('btn-arrow-left').addEventListener('click', () => CharacterModule.prevClass());
    document.getElementById('btn-arrow-right').addEventListener('click', () => CharacterModule.nextClass());

    // Confirmar Creación
    document.getElementById('btn-confirm-create').addEventListener('click', () => {
        const name = document.getElementById('create-char-name').value.trim();
        const selectedClass = CharacterModule.getCurrentClass();

        if (!name) return alert('Ingresa un nombre para tu personaje.');

        socket.emit('character:create', { name, classType: selectedClass.id }, (res) => {
            if (res.success) {
                renderCharacterList(res.characters);
                document.getElementById('btn-cancel-create').click(); // Limpiar UI
            } else {
                alert(res.message || 'Error al crear personaje.');
            }
        });
    });

    function renderCharacterList(list) {
        const container = document.getElementById('character-list');
        container.innerHTML = '';

        list.forEach(char => {
            const div = document.createElement('div');
            div.className = 'char-slot';
            div.innerText = `${char.name} (${char.classType.toUpperCase()})`;
            div.addEventListener('click', () => {
                document.querySelectorAll('.char-slot').forEach(s => s.classList.remove('selected'));
                div.classList.add('selected');
                selectedCharacter = char;

                document.getElementById('char-stats-info').innerHTML = `
                    <strong>${char.name}</strong><br>
                    Clase: ${char.classType}<br>
                    Nivel: ${char.level || 1}
                `;
                document.getElementById('btn-play').style.display = 'block';
            });
            container.appendChild(div);
        });
    }

    // Entrar al Mapa Multijugador
    document.getElementById('btn-play').addEventListener('click', () => {
        if (!selectedCharacter) return;
        showScreen('screen-game');
        document.getElementById('hud-char-name').innerText = selectedCharacter.name;
        if (window.GameModule) window.GameModule.init(socket, selectedCharacter);
    });

    document.getElementById('btn-logout').addEventListener('click', () => showScreen('screen-login'));
});
