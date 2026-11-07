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
        theta: 0, 
        phi: Math.PI / 2, 
        heading: 0 
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

        this.camera = new THREE.PerspectiveCamera(60, 800 / 600, 0.1, 1000);

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

        // Posición inicial sobre la esfera
        this.localPlayer.theta = 0;
        this.localPlayer.phi = 0.3;
        this.localPlayer.heading = 0;

        // Crear malla del jugador local
        this.localPlayer.mesh = this.createPlayerAvatar(this.localPlayer.classType, this.localPlayer.color);
        this.scene.add(this.localPlayer.mesh);

        const hudName = document.getElementById('hud-char-name');
        if (hudName) hudName.innerText = `${this.localPlayer.name} (Lv.${this.localPlayer.level})`;

        // --- CREAR MIRILLA (CROSSHAIR) EN EL HUD ---
        this.createCrosshair();

        // Eventos de teclado
        window.addEventListener('keydown', e => this.keys[e.code] = true);
        window.addEventListener('keyup', e => this.keys[e.code] = false);

        canvas.addEventListener('contextmenu', e => e.preventDefault());
        
        // Activar Pointer Lock al hacer clic para girar la cámara con el mouse
        canvas.addEventListener('click', () => {
            canvas.requestPointerLock();
        });

        document.addEventListener('mousemove', e => {
            if (document.pointerLockElement === canvas) {
                const sensitivity = 0.003;
                this.localPlayer.heading -= e.movementX * sensitivity;
            }
        });

        canvas.addEventListener('mousedown', e => this.handleBuildClick(e));
    },

    createCrosshair() {
        const container = document.querySelector('.game-container');
        if (container && !document.getElementById('game-crosshair')) {
            const crosshair = document.createElement('div');
            crosshair.id = 'game-crosshair';
            crosshair.style.position = 'absolute';
            crosshair.style.top = '50%';
            crosshair.style.left = '50%';
            crosshair.style.width = '8px';
            crosshair.style.height = '8px';
            crosshair.style.backgroundColor = '#00ffcc';
            crosshair.style.borderRadius = '50%';
            crosshair.style.transform = 'translate(-50%, -50%)';
            crosshair.style.pointerEvents = 'none';
            crosshair.style.boxShadow = '0 0 4px #ffffff';
            crosshair.style.zIndex = '100';
            container.style.position = 'relative';
            container.appendChild(crosshair);
        }
    },

    createPlayerAvatar(classType, customColor) {
        const group = new THREE.Group();

        // Cuerpo (Cilindro)
        const bodyGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.6, 8);
        const bodyMat = new THREE.MeshStandardMaterial({ color: customColor, roughness: 0.4 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.3;
        group.add(body);

        // Cabeza (Esfera)
        const headGeo = new THREE.SphereGeometry(0.12, 8, 8);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.3 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 0.7;
        group.add(head);

        // Visor frontal (Indica hacia dónde apunta el mouse)
        const faceGeo = new THREE.BoxGeometry(0.14, 0.06, 0.05);
        const faceMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2, metalness: 0.8 });
        const face = new THREE.Mesh(faceGeo, faceMat);
        face.position.set(0, 0.7, 0.12);
        group.add(face);

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

            // --- LÓGICA DE MOVIMIENTO WASD (CORREGIDA PARA STRAFE LIMPIO) ---
            let moveForward = 0;
            let moveSide = 0;

            if (this.keys['KeyW'] || this.keys['ArrowUp']) moveForward += p.speed;
            if (this.keys['KeyS'] || this.keys['ArrowDown']) moveForward -= p.speed;
            if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveSide -= p.speed;  // Strafe izquierda
            if (this.keys['KeyD'] || this.keys['ArrowRight']) moveSide += p.speed; // Strafe derecha

            if (moveForward !== 0 || moveSide !== 0) {
                const R = this.planetRadius;
                // Corrección matemática exacta de los senos y cosenos para el movimiento lateral sobre la esfera
                const deltaTheta = (moveForward * Math.sin(p.heading) - moveSide * Math.cos(p.heading)) / R;
                const deltaPhi   = (-moveForward * Math.cos(p.heading) - moveSide * Math.sin(p.heading)) / R;

                p.theta += deltaTheta;
                p.phi += deltaPhi;

                // Limitar phi para no rebasar los polos
                p.phi = Math.max(0.05, Math.min(Math.PI - 0.05, p.phi));
            }

            // Posición cartesiana 3D del personaje sobre la esfera
            const R = this.planetRadius;
            const x = R * Math.sin(p.phi) * Math.sin(p.theta);
            const y = R * Math.cos(p.phi);
            const z = R * Math.sin(p.phi) * Math.cos(p.theta);

            p.mesh.position.set(x, y, z);

            // Orientación y alineación perfecta de la malla sobre la superficie curva
            const normal = p.mesh.position.clone().normalize();
            let tangent = new THREE.Vector3(-Math.cos(p.heading), 0, Math.sin(p.heading));
            tangent.addScaledVector(normal, -tangent.dot(normal)).normalize();

            if (tangent.lengthSq() < 0.001) {
                tangent.set(0, 0, 1);
                tangent.addScaledVector(normal, -tangent.dot(normal)).normalize();
            }

            const binormal = new THREE.Vector3().crossVectors(normal, tangent).normalize();
            const rotMatrix = new THREE.Matrix4().makeBasis(binormal, normal, tangent);
            p.mesh.quaternion.setFromRotationMatrix(rotMatrix);

            if ((moveForward !== 0 || moveSide !== 0) && this.socket) {
                this.socket.emit('playerMove', { x, y, z });
            }

            // --- CÁMARA TERCERA PERSONA (ÁNGULO 45° A ~5 METROS DETRÁS DE LA ESPALDA) ---
            const distanceBack = 3.8;  
            const heightUp = 2.5;      

            const backwardDir = new THREE.Vector3(-Math.sin(p.heading), 0, Math.cos(p.heading)).normalize();
            backwardDir.addScaledVector(normal, -backwardDir.dot(normal)).normalize();

            const targetCamPos = p.mesh.position.clone()
                .add(normal.clone().multiplyScalar(heightUp))
                .add(backwardDir.multiplyScalar(distanceBack));

            this.camera.position.lerp(targetCamPos, 0.2);

            const lookTarget = p.mesh.position.clone().add(normal.clone().multiplyScalar(0.5));
            this.camera.lookAt(lookTarget);
        }

        if (typeof WorldModule.rotatePlanet === 'function') {
            WorldModule.rotatePlanet();
        }
        this.renderer.render(this.scene, this.camera);
    }
};

window.GameModule = Game;
