// public/js/game.js
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
        weaponRange: 15.0,
        radius: 0.35 // Radio físico del jugador para colisiones
    },
    remotePlayers: {},
    keys: {},
    isGameRunning: false,
    planetRadius: 5.0,
    gravity: 0.004,
    cameraMode: 'first', // 'first', 'third', 'rts'
    isAiming: false,
    
    // ESTADO DE MIRILLA
    crosshairOffset: { x: 0, y: 0 },
    maxCrosshairRadius: 120,

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
                this.crosshairOffset.x = 0;
                this.crosshairOffset.y = 0;
            }
        });

        window.addEventListener('keyup', e => this.keys[e.code] = false);

        canvas.addEventListener('contextmenu', e => e.preventDefault());
        
        // Activar Pointer Lock al hacer clic
        canvas.addEventListener('click', () => {
            canvas.requestPointerLock();
        });

        // Control de Clic Derecho para Apuntar
        canvas.addEventListener('mousedown', e => {
            if (e.button === 2) { 
                this.isAiming = true;
            } else {
                this.handleBuildClick(e);
            }
        });

        canvas.addEventListener('mouseup', e => {
            if (e.button === 2) {
                this.isAiming = false;
            }
        });

        document.addEventListener('mousemove', e => {
            if (document.pointerLockElement === canvas) {
                const sensitivity = 0.0025;
                const normal = this.localPlayer.position.clone().normalize();
                
                if ((this.cameraMode === 'third' || this.cameraMode === 'rts') && !this.isAiming) {
                    this.crosshairOffset.x += e.movementX;
                    this.crosshairOffset.y += e.movementY;

                    const dist = Math.hypot(this.crosshairOffset.x, this.crosshairOffset.y);

                    if (dist > this.maxCrosshairRadius) {
                        const overflowX = (this.crosshairOffset.x / dist) * (dist - this.maxCrosshairRadius);
                        const overflowY = (this.crosshairOffset.y / dist) * (dist - this.maxCrosshairRadius);

                        const yawDelta = -overflowX * sensitivity;
                        this.localPlayer.forward.applyAxisAngle(normal, yawDelta);
                        this.localPlayer.forward.normalize();

                        this.localPlayer.pitch -= overflowY * sensitivity;
                        this.localPlayer.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.localPlayer.pitch));

                        this.crosshairOffset.x = (this.crosshairOffset.x / dist) * this.maxCrosshairRadius;
                        this.crosshairOffset.y = (this.crosshairOffset.y / dist) * this.maxCrosshairRadius;
                    }
                } else {
                    this.crosshairOffset.x = 0;
                    this.crosshairOffset.y = 0;

                    const yawDelta = -e.movementX * sensitivity;
                    this.localPlayer.forward.applyAxisAngle(normal, yawDelta);
                    this.localPlayer.forward.normalize();

                    this.localPlayer.pitch -= e.movementY * sensitivity;
                    this.localPlayer.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.localPlayer.pitch));
                }
            }
        });
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

            const lines = [
                { top: '10px', left: '0px', width: '8px', height: '2px' },  
                { top: '10px', left: '16px', width: '8px', height: '2px' }, 
                { top: '0px', left: '10px', width: '2px', height: '8px' },  
                { top: '16px', left: '10px', width: '2px', height: '8px' }   
            ];

            lines.forEach(cfg => {
                const line = document.createElement('div');
                line.style.position = 'absolute';
                line.style.top = cfg.top;
                line.style.left = cfg.left;
                line.style.width = cfg.width;
                line.style.height = cfg.height;
                line.style.backgroundColor = 'rgba(0, 255, 204, 0.9)';
                line.style.boxShadow = '0 0 2px rgba(0,0,0,0.8)';
                crosshair.appendChild(line);
            });

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
            // Opcional: Lógica de construcción conectada al mundo esférico
        }
    },

    // --- DETECTOR DE COLISIONES CON OBSTÁCULOS Y ÁRBOLES EN EL MUNDO ---
    checkCollision(nextPos, currentAltitude) {
        if (typeof WorldModule === 'undefined' || !WorldModule.getObstacles) return false;
        
        const obstacles = WorldModule.getObstacles(); // Obtiene objetos colisionables del planeta
        if (!obstacles || obstacles.length === 0) return false;

        const playerRadius = this.localPlayer.radius;

        for (let i = 0; i < obstacles.length; i++) {
            const obs = obstacles[i];
            if (!obs.position) continue;

            const dist = nextPos.distanceTo(obs.position);
            const obstacleRadius = obs.radius || 0.6;
            const obstacleHeight = obs.height || 1.2;

            if (dist < (playerRadius + obstacleRadius)) {
                if (currentAltitude < obstacleHeight) {
                    return true; // Colisión detectada (se bloquea el paso)
                }
            }
        }
        return false;
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

            // --- VISIBILIDAD DE MIRILLA ---
            if (crosshair) {
                crosshair.style.display = 'block';
                
                const scale = isMoving ? 'scale(1.3)' : 'scale(1)';
                const posX = `calc(-50% + ${this.crosshairOffset.x}px)`;
                const posY = `calc(-50% + ${this.crosshairOffset.y}px)`;
                crosshair.style.transform = `translate(${posX}, ${posY}) ${scale}`;
            }

            // --- SISTEMA DE MOVIMIENTO CON COMPROBACIÓN DE COLISIONES ---
            const targetPos = p.position.clone();
            const tempForward = p.forward.clone();

            if (moveForward !== 0) {
                const axis = new THREE.Vector3().crossVectors(normal, p.forward).normalize();
                const angle = moveForward / R;
                targetPos.applyAxisAngle(axis, angle);
                tempForward.applyAxisAngle(axis, angle);
            }

            if (moveSide !== 0) {
                const axis = new THREE.Vector3().crossVectors(normal, right).normalize();
                const angle = moveSide / R;
                targetPos.applyAxisAngle(axis, angle);
                tempForward.applyAxisAngle(axis, angle);
            }

            targetPos.normalize().multiplyScalar(R + p.altitude);

            if (!this.checkCollision(targetPos, p.altitude)) {
                p.position.copy(targetPos);
                p.forward.copy(tempForward);
            }

            normal = p.position.clone().normalize();
            p.forward.addScaledVector(normal, -p.forward.dot(normal)).normalize();

            p.mesh.position.copy(p.position);

            const rotMatrix = new THREE.Matrix4().makeBasis(right, normal, p.forward.clone().negate());
            p.mesh.quaternion.setFromRotationMatrix(rotMatrix);
            p.mesh.visible = (this.cameraMode !== 'first');

            if ((moveForward !== 0 || moveSide !== 0 || p.altitude > 0) && this.socket) {
                this.socket.emit('playerMove', { x: p.position.x, y: p.position.y, z: p.position.z });
            }

            // --- GESTIÓN DE CÁMARAS Y DIRECCIÓN ---
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
                let distanceBack = 3.5;
                let heightUp = 1.6;
                let rightOffset = 0.0;

                if (this.isAiming) {
                    distanceBack = 2.0;
                    heightUp = 1.4;
                    rightOffset = 0.6;
                }

                const shoulderOffset = right.clone().multiplyScalar(rightOffset);
                const camPos = p.position.clone()
                    .add(shoulderOffset)
                    .add(normal.clone().multiplyScalar(heightUp))
                    .sub(p.forward.clone().multiplyScalar(distanceBack));
                
                const camNormal = camPos.clone().normalize();
                if (camPos.length() < R + 0.5) {
                    camPos.copy(camNormal.multiplyScalar(R + 0.5));
                }

                this.camera.position.copy(camPos);

                const lookDir = p.forward.clone();
                lookDir.applyAxisAngle(right, p.pitch);
                const targetLookAt = camPos.clone().add(lookDir.multiplyScalar(p.weaponRange));
                this.camera.lookAt(targetLookAt);

            } else if (this.cameraMode === 'rts') {
                const rtsHeight = 3.75;
                const rtsBack = 2.0;
                const camPos = p.position.clone()
                    .add(normal.clone().multiplyScalar(rtsHeight))
                    .sub(p.forward.clone().multiplyScalar(rtsBack));

                this.camera.position.copy(camPos);
                
                const lookDir = p.forward.clone();
                lookDir.applyAxisAngle(right, p.pitch);
                const targetLookAt = p.position.clone().add(lookDir.multiplyScalar(2.0));
                this.camera.lookAt(targetLookAt);
            }
        }

        this.renderer.render(this.scene, this.camera);
    }
};

window.GameModule = Game;
