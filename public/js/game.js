const Game = {
    socket: null, scene: null, camera: null, renderer: null,
    localPlayer: { 
        mesh: null, 
        speed: 0.05, 
        wood: 100, 
        name: 'Héroe', 
        level: 1, 
        classType: 'guerrero', 
        color: 0xff0033,
        position: new THREE.Vector3(0, 5.0, 0),
        heading: 0, 
        pitch: 0 
    },
    remotePlayers: {},
    keys: {},
    isGameRunning: false,
    planetRadius: 5.0,

    start(characterData) {
        if (characterData) {
            this.localPlayer.name = characterData.name || 'Héroe';
            this.localPlayer.level = characterData.level || 1;
            this.localPlayer.classType = characterData.classType || 'guerrero';
            
            if (characterData.classType === 'mago') this.localPlayer.color = 0x0088ff;
            else if (characterData.classType === 'arquero') this.localPlayer.color = 0x00ff66;
            else this.localPlayer.color = 0xff0033;
        }

        if (typeof App !== 'undefined' && typeof App.changeScreen === 'function') {
            App.changeScreen('screen-game');
        } else {
            const loginScreen = document.getElementById('screen-login');
            const charScreen = document.getElementById('screen-character');
            const gameScreen = document.getElementById('screen-game');
            if (loginScreen) loginScreen.classList.remove('active');
            if (charScreen) charScreen.classList.remove('active');
            if (gameScreen) gameScreen.classList.add('active');
        }

        this.initEngine();
        this.connectServer();
        this.isGameRunning = true;
        this.loop();
    },

    initEngine() {
        const canvas = document.getElementById('mapCanvas');
        if (!canvas) return;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050510);
        this.scene.fog = new THREE.FogExp2(0x050510, 0.03);

        this.camera = new THREE.PerspectiveCamera(65, 800 / 600, 0.1, 1000);

        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.renderer.setSize(800, 600);

        // Iluminación
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const sun = new THREE.DirectionalLight(0xffd700, 1.2);
        sun.position.set(10, 20, 10);
        this.scene.add(sun);

        // --- CREAR EL PLANETA ESFÉRICO ---
        WorldModule.createPlanet(this.scene, { color: 0x1a4314, treeCount: 40, rockCount: 20 });
        if (typeof WorldModule.getRadius === 'function') {
            this.planetRadius = WorldModule.getRadius();
        }

        // Posición inicial en la parte superior del planeta
        this.localPlayer.position.set(0, this.planetRadius, 0);
        this.localPlayer.heading = 0;
        this.localPlayer.pitch = 0;

        // Crear malla del jugador local (oculta en primera persona)
        this.localPlayer.mesh = this.createPlayerAvatar(this.localPlayer.classType, this.localPlayer.color);
        this.scene.add(this.localPlayer.mesh);

        const hudName = document.getElementById('hud-char-name');
        if (hudName) hudName.innerText = `${this.localPlayer.name} (Lv.${this.localPlayer.level})`;

        // --- CREAR MIRILLA DINÁMICA ---
        this.createDynamicCrosshair();

        // Eventos de teclado
        window.addEventListener('keydown', e => this.keys[e.code] = true);
        window.addEventListener('keyup', e => this.keys[e.code] = false);

        canvas.addEventListener('contextmenu', e => e.preventDefault());
        
        // Activar Pointer Lock al hacer clic
        canvas.addEventListener('click', () => {
            canvas.requestPointerLock();
        });

        document.addEventListener('mousemove', e => {
            if (document.pointerLockElement === canvas) {
                const sensitivity = 0.0025;
                // Signos corregidos para evitar inversiones en los ejes
                this.localPlayer.heading += e.movementX * sensitivity;
                this.localPlayer.pitch += e.movementY * sensitivity;
                this.localPlayer.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.localPlayer.pitch));
            }
        });

        canvas.addEventListener('mousedown', e => this.handleBuildClick(e));
    },

    createDynamicCrosshair() {
        const container = document.querySelector('.game-container');
        if (container && !document.getElementById('game-crosshair')) {
            const crosshair = document.createElement('div');
            crosshair.id = 'game-crosshair';
            crosshair.style.position = 'absolute';
            crosshair.style.top = '50%';
            crosshair.style.left = '50%';
            crosshair.style.width = '10px';
            crosshair.style.height = '10px';
            crosshair.style.border = '2px solid rgba(0, 255, 204, 0.8)';
            crosshair.style.borderRadius = '50%';
            crosshair.style.transform = 'translate(-50%, -50%) scale(1)';
            crosshair.style.pointerEvents = 'none';
            crosshair.style.transition = 'transform 0.1s ease';
            crosshair.style.zIndex = '100';

            const dot = document.createElement('div');
            dot.style.position = 'absolute';
            dot.style.top = '50%';
            dot.style.left = '50%';
            dot.style.width = '2px';
            dot.style.height = '2px';
            dot.style.backgroundColor = '#ffffff';
            dot.style.transform = 'translate(-50%, -50%)';
            crosshair.appendChild(dot);

            container.style.position = 'relative';
            container.appendChild(crosshair);
        }
    },

    createPlayerAvatar(classType, customColor) {
        const group = new THREE.Group();
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.6, 8), new THREE.MeshStandardMaterial({ color: customColor, visible: false }));
        body.position.y = 0.3;
        group.add(body);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshStandardMaterial({ color: 0xffd700, visible: false }));
        head.position.y = 0.7;
        group.add(head);

        return group;
    },

    connectServer() {
        this.socket = io();
        this.socket.on('initWorld', (data) => {
            const woodEl = document.getElementById('ui-wood');
            if (woodEl) woodEl.innerText = this.localPlayer.wood;
        });
    },

    handleBuildClick(e) {
        if (e.button === 0) {
            const depth = e.shiftKey ? -1 : 0;
        }
    },

    loop() {
        if (!this.isGameRunning) return;
        requestAnimationFrame(() => this.loop());

        if (this.localPlayer.mesh) {
            const p = this.localPlayer;
            const crosshair = document.getElementById('game-crosshair');
            let isMoving = false;

            const R = this.planetRadius;
            const normal = p.position.clone().normalize();

            // --- CÁLCULO DE VECTORES BASADOS EN LA CÁMARA ---
            // Construimos la orientación azimutal horizontal a partir del heading del mouse
            const worldUp = Math.abs(normal.y) < 0.99 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
            const east = new THREE.Vector3().crossVectors(worldUp, normal).normalize();
            const north = new THREE.Vector3().crossVectors(normal, east).normalize();

            const forward = new THREE.Vector3()
                .addScaledVector(north, Math.cos(p.heading))
                .addScaledVector(east, Math.sin(p.heading))
                .normalize();

            const right = new THREE.Vector3().crossVectors(normal, forward).normalize();

            // --- MOVIMIENTO WASD ---
            let moveForward = 0;
            let moveSide = 0;

            if (this.keys['KeyW'] || this.keys['ArrowUp']) { moveForward += p.speed; isMoving = true; }
            if (this.keys['KeyS'] || this.keys['ArrowDown']) { moveForward -= p.speed; isMoving = true; }
            if (this.keys['KeyA'] || this.keys['ArrowLeft']) { moveSide -= p.speed; isMoving = true; }
            if (this.keys['KeyD'] || this.keys['ArrowRight']) { moveSide += p.speed; isMoving = true; }

            if (crosshair) {
                if (isMoving) {
                    crosshair.style.transform = 'translate(-50%, -50%) scale(1.4)';
                    crosshair.style.borderColor = 'rgba(255, 100, 100, 0.9)';
                } else {
                    crosshair.style.transform = 'translate(-50%, -50%) scale(1)';
                    crosshair.style.borderColor = 'rgba(0, 255, 204, 0.8)';
                }
            }

            if (moveForward !== 0 || moveSide !== 0) {
                const moveDelta = new THREE.Vector3();
                moveDelta.addScaledVector(forward, moveForward);
                moveDelta.addScaledVector(right, moveSide);

                p.position.add(moveDelta);
                p.position.normalize().multiplyScalar(R);
            }

            p.mesh.position.copy(p.position);

            if ((moveForward !== 0 || moveSide !== 0) && this.socket) {
                this.socket.emit('playerMove', { x: p.position.x, y: p.position.y, z: p.position.z });
            }

            // --- POSICIÓN DE CÁMARA ESTABLE EN PRIMERA PERSONA ---
            const eyeHeight = 0.75;
            const eyePosition = p.position.clone().add(normal.clone().multiplyScalar(eyeHeight));
            this.camera.position.copy(eyePosition);

            // Fijamos el vector Up de la cámara a la normal de la esfera para evitar inclinaciones ("oreja en el hombro")
            this.camera.up.copy(normal);

            const lookDir = forward.clone();
            lookDir.applyAxisAngle(right, p.pitch);

            const targetLookAt = eyePosition.clone().add(lookDir.multiplyScalar(5.0));
            this.camera.lookAt(targetLookAt);
        }

        this.renderer.render(this.scene, this.camera);
    }
};

window.GameModule = Game;
