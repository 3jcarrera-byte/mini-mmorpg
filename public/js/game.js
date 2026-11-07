const Game = {
    socket: null, scene: null, camera: null, renderer: null,
    localPlayer: { 
        mesh: null, 
        speed: 0.05, 
        jumpSpeed: 0.08,    
        verticalVelocity: 0, 
        altitude: 0,         
        wood: 100, 
        name: 'Héroe', 
        level: 1, 
        classType: 'guerrero', 
        color: 0xff0033,
        position: new THREE.Vector3(0, 5.0, 0),
        forward: new THREE.Vector3(0, 0, -1), 
        pitch: 0,
        weaponRange: 15.0 // Alcance máximo configurable del arma
    },
    remotePlayers: {},
    keys: {},
    isGameRunning: false,
    planetRadius: 5.0,
    gravity: 0.004,
    cameraMode: 'first', // 'first', 'third', 'rts'

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

        // Posición inicial sobre el planeta
        this.localPlayer.position.set(0, this.planetRadius, 0);
        this.localPlayer.forward.set(0, 0, -1).normalize();
        this.localPlayer.pitch = 0;
        this.localPlayer.altitude = 0;
        this.localPlayer.verticalVelocity = 0;

        // Crear malla del jugador local
        this.localPlayer.mesh = this.createPlayerAvatar(this.localPlayer.classType, this.localPlayer.color);
        this.scene.add(this.localPlayer.mesh);

        const hudName = document.getElementById('hud-char-name');
        if (hudName) hudName.innerText = `${this.localPlayer.name} (Lv.${this.localPlayer.level})`;

        // --- CREAR MIRILLA PROFESIONAL DE SHOOTER ---
        this.createShooterCrosshair();

        // Eventos de teclado
        window.addEventListener('keydown', e => {
            this.keys[e.code] = true;

            // Cambiar modo de cámara con la tecla V
            if (e.code === 'KeyV') {
                if (this.cameraMode === 'first') {
                    this.cameraMode = 'third';
                } else if (this.cameraMode === 'third') {
                    this.cameraMode = 'rts';
                } else {
                    this.cameraMode = 'first';
                }
            }
        });

        window.addEventListener('keyup', e => this.keys[e.code] = false);

        canvas.addEventListener('contextmenu', e => e.preventDefault());
        
        // Activar Pointer Lock al hacer clic
        canvas.addEventListener('click', () => {
            canvas.requestPointerLock();
        });

        document.addEventListener('mousemove', e => {
            if (document.pointerLockElement === canvas) {
                const sensitivity = 0.0025;
                const normal = this.localPlayer.position.clone().normalize();
                
                // Rotar el vector forward alrededor de la normal local (Yaw)
                const yawDelta = -e.movementX * sensitivity;
                this.localPlayer.forward.applyAxisAngle(normal, yawDelta);
                this.localPlayer.forward.normalize();

                // Pitch (Inclinación vertical)
                this.localPlayer.pitch -= e.movementY * sensitivity;
                this.localPlayer.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.localPlayer.pitch));
            }
        });

        canvas.addEventListener('mousedown', e => this.handleBuildClick(e));
    },

    createShooterCrosshair() {
        const container = document.querySelector('.game-container');
        if (container && !document.getElementById('game-crosshair')) {
            const crosshair = document.createElement('div');
            crosshair.id = 'game-crosshair';
            crosshair.style.position = 'absolute';
            crosshair.style.top = '50%';
            crosshair.style.left = '50%';
            crosshair.style.width = '24px';
            crosshair.style.height = '24px';
            crosshair.style.transform = 'translate(-50%, -50%)';
            crosshair.style.pointerEvents = 'none';
            crosshair.style.zIndex = '100';

            // Estilo de líneas de la mirilla de shooter (Cruz + Punto central)
            const lines = [
                { top: '10px', left: '0px', width: '8px', height: '2px' },  // Izquierda
                { top: '10px', left: '16px', width: '8px', height: '2px' }, // Derecha
                { top: '0px', left: '10px', width: '2px', height: '8px' },  // Arriba
                { top: '16px', left: '10px', width: '2px', height: '8px' }   // Abajo
            ];

            lines.forEach(cfg => {
                const line = document.createElement('div');
                line.className = 'crosshair-line';
                line.style.position = 'absolute';
                line.style.top = cfg.top;
                line.style.left = cfg.left;
                line.style.width = cfg.width;
                line.style.height = cfg.height;
                line.style.backgroundColor = 'rgba(0, 255, 204, 0.9)';
                line.style.boxShadow = '0 0 2px rgba(0,0,0,0.8)';
                crosshair.appendChild(line);
            });

            // Punto central
            const dot = document.createElement('div');
            dot.style.position = 'absolute';
            dot.style.top = '11px';
            dot.style.left = '11px';
            dot.style.width = '2px';
            dot.style.height = '2px';
            dot.style.backgroundColor = '#ffffff';
            crosshair.appendChild(dot);

            container.style.position = 'relative';
            container.appendChild(crosshair);
        }
    },

    createPlayerAvatar(classType, customColor) {
        const group = new THREE.Group();
        
        const body = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15, 0.15, 0.6, 8), 
            new THREE.MeshStandardMaterial({ color: customColor })
        );
        body.position.y = 0.3;
        group.add(body);

        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.12, 8, 8), 
            new THREE.MeshStandardMaterial({ color: 0xffd700 })
        );
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
            let normal = p.position.clone().normalize();

            p.forward.addScaledVector(normal, -p.forward.dot(normal)).normalize();
            const right = new THREE.Vector3().crossVectors(p.forward, normal).normalize();

            // --- CONTROLES WASD Y SALTO ---
            let moveForward = 0;
            let moveSide = 0;

            if (this.keys['KeyW'] || this.keys['ArrowUp']) { moveForward += p.speed; isMoving = true; }
            if (this.keys['KeyS'] || this.keys['ArrowDown']) { moveForward -= p.speed; isMoving = true; }
            if (this.keys['KeyA'] || this.keys['ArrowLeft']) { moveSide -= p.speed; isMoving = true; }
            if (this.keys['KeyD'] || this.keys['ArrowRight']) { moveSide += p.speed; isMoving = true; }

            if (this.keys['Space'] && p.altitude <= 0.001) {
                p.verticalVelocity = p.jumpSpeed;
            }

            p.verticalVelocity -= this.gravity;
            p.altitude += p.verticalVelocity;

            if (p.altitude <= 0) {
                p.altitude = 0;
                p.verticalVelocity = 0;
            }

            // Animación dinámica de dispersión de la mirilla al movernos
            if (crosshair) {
                if (this.cameraMode === 'first') {
                    crosshair.style.display = 'block';
                    const scale = isMoving ? 'scale(1.3)' : 'scale(1)';
                    crosshair.style.transform = `translate(-50%, -50%) ${scale}`;
                } else {
                    crosshair.style.display = 'none';
                }
            }

            if (moveForward !== 0) {
                const axis = new THREE.Vector3().crossVectors(normal, p.forward).normalize();
                const angle = moveForward / R;
                p.position.applyAxisAngle(axis, angle);
                p.forward.applyAxisAngle(axis, angle);
            }

            if (moveSide !== 0) {
                // Movimiento lateral estricto sobre la circunferencia del meridiano/paralelo local
                const axis = new THREE.Vector3().crossVectors(normal, right).normalize();
                const angle = moveSide / R;
                p.position.applyAxisAngle(axis, angle);
                p.forward.applyAxisAngle(axis, angle);
            }

            p.position.normalize().multiplyScalar(R + p.altitude);
            normal = p.position.clone().normalize();
            p.forward.addScaledVector(normal, -p.forward.dot(normal)).normalize();

            p.mesh.position.copy(p.position);

            const rotMatrix = new THREE.Matrix4().makeBasis(right, normal, p.forward.clone().negate());
            p.mesh.quaternion.setFromRotationMatrix(rotMatrix);
            p.mesh.visible = (this.cameraMode !== 'first');

            if ((moveForward !== 0 || moveSide !== 0 || p.altitude > 0) && this.socket) {
                this.socket.emit('playerMove', { x: p.position.x, y: p.position.y, z: p.position.z });
            }

            // --- GESTIÓN DE CÁMARAS Y ALCANCE MÁXIMO ADAPTADO A LA TIERRA ---
            this.camera.up.copy(normal);

            if (this.cameraMode === 'first') {
                const eyeHeight = 0.75;
                const eyePosition = p.position.clone().add(normal.clone().multiplyScalar(eyeHeight));
                this.camera.position.copy(eyePosition);

                const lookDir = p.forward.clone();
                lookDir.applyAxisAngle(right, p.pitch);
                const targetLookAt = eyePosition.clone().add(lookDir.multiplyScalar(p.weaponRange));
                this.camera.lookAt(targetLookAt);

            } else if (this.cameraMode === 'third') {
                // Tercera persona con radio orbital acoplado a la curvatura de la tierra
                const distanceBack = Math.min(3.5, p.weaponRange * 0.4);
                const heightUp = 1.6;
                
                // Posición orbital respetando la curvatura esférica
                const camPos = p.position.clone()
                    .add(normal.clone().multiplyScalar(heightUp))
                    .sub(p.forward.clone().multiplyScalar(distanceBack));
                
                // Asegurar que la cámara respete la curvatura y no atraviese el suelo
                const camNormal = camPos.clone().normalize();
                if (camPos.length() < R + 0.5) {
                    camPos.copy(camNormal.multiplyScalar(R + 0.5));
                }

                this.camera.position.copy(camPos);
                const targetLookAt = p.position.clone().add(normal.clone().multiplyScalar(0.6));
                this.camera.lookAt(targetLookAt);

            } else if (this.cameraMode === 'rts') {
                // Vista cenital / RTS Warcraft 3 adaptada a la esfera
                const rtsHeight = 7.5;
                const rtsBack = 4.0;
                const camPos = p.position.clone()
                    .add(normal.clone().multiplyScalar(rtsHeight))
                    .sub(p.forward.clone().multiplyScalar(rtsBack));

                this.camera.position.copy(camPos);
                this.camera.lookAt(p.position);
            }
        }

        this.renderer.render(this.scene, this.camera);
    }
};

window.GameModule = Game;
