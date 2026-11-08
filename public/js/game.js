// Bucle principal del juego y control del cliente (game.js)
const Game = {
    socket: null, scene: null, camera: null, renderer: null,
    localPlayer: { 
        mesh: null, 
        speed: 0.03, 
        jumpSpeed: 0.04,    
        verticalVelocity: 0, 
        altitude: 0,       
        name: 'Héroe', 
        level: 1, 
        classType: 'guerrero', 
        color: 0xff0033,
        position: new THREE.Vector3(0, 5.0, 0),
        forward: new THREE.Vector3(0, 0, -1), 
        pitch: 0,
        yawOffset: 0.35, // Desplazamiento lateral fijo en tercera persona
        weaponRange: 15.0,
        radius: 0.22 // Radio físico sólido para colisiones
    },
    remotePlayers: {},
    keys: {},
    isGameRunning: false,
    planetRadius: 5.0,
    gravity: 0.004,
    cameraMode: 'third', // 'first', 'third', 'rts'
    isAiming: false,
     
    crosshairOffset: { x: 0, y: 0 },
    maxCrosshairRadius: 40,
    lastFrameTime: 0,

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
        this.lastFrameTime = performance.now();
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

        this.scene.add(new THREE.AmbientLight(0xffffff, 0.4));

        WorldModule.createPlanet(this.scene, { color: 0x1a4314, treeCount: 40, rockCount: 20 });
        if (typeof WorldModule.getRadius === 'function') {
            this.planetRadius = WorldModule.getRadius();
        }

        this.localPlayer.position.set(0, this.planetRadius, 0);
        this.localPlayer.forward.set(0, 0, -1).normalize();
        this.localPlayer.pitch = 0;
        this.localPlayer.yawOffset = 0.35;
        this.localPlayer.altitude = 0;
        this.localPlayer.verticalVelocity = 0;

        this.localPlayer.mesh = this.createPlayerAvatar(this.localPlayer.classType, this.localPlayer.color);
        this.scene.add(this.localPlayer.mesh);

        const hudName = document.getElementById('hud-char-name');
        if (hudName) hudName.innerText = `${this.localPlayer.name} (Lv.${this.localPlayer.level})`;

        this.createShooterCrosshair();

        if (typeof InventoryModule !== 'undefined' && typeof InventoryModule.init === 'function') {
            InventoryModule.init();
        }

        window.addEventListener('keydown', e => {
            this.keys[e.code] = true;

            const invModal = document.getElementById('inventory-modal');
            if (invModal && invModal.style.display === 'block') {
                if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
                    invModal.style.display = 'none';
                    if (canvas && typeof canvas.requestPointerLock === 'function') {
                        canvas.requestPointerLock();
                    }
                }
            }

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
        
        canvas.addEventListener('click', () => {
            const invModal = document.getElementById('inventory-modal');
            if (!invModal || invModal.style.display !== 'block') {
                canvas.requestPointerLock();
            }
        });

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
                const sensitivity = 0.003;
                const normal = this.localPlayer.position.clone().normalize();
                
                const yawDelta = -e.movementX * sensitivity;
                this.localPlayer.forward.applyAxisAngle(normal, yawDelta);
                this.localPlayer.forward.normalize();

                this.localPlayer.pitch -= e.movementY * sensitivity;
                this.localPlayer.pitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, this.localPlayer.pitch));

                this.crosshairOffset.x = 0;
                this.crosshairOffset.y = 0;
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
            new THREE.CylinderGeometry(0.08, 0.08, 0.35, 8), 
            new THREE.MeshStandardMaterial({ color: customColor })
        );
        body.position.y = 0.175;
        group.add(body);

        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.07, 8, 8), 
            new THREE.MeshStandardMaterial({ color: 0xffd700 })
        );
        head.position.y = 0.38;
        group.add(head);

        return group;
    },

    connectServer() {
        this.socket = io();
        this.socket.on('initWorld', (data) => {
            const woodEl = document.getElementById('ui-wood');
            if (woodEl && typeof InventoryModule !== 'undefined') {
                woodEl.innerText = InventoryModule.getData().wood;
            }
        });
    },

    handleBuildClick(e) {
        if (e.button !== 0) return; 

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2(0, 0); 

        raycaster.setFromCamera(mouse, this.camera);
        
        const interactiveObjects = WorldModule.getInteractiveObjects();
        const meshes = interactiveObjects.map(obj => obj.mesh).filter(Boolean);

        const intersects = raycaster.intersectObjects(meshes, true);

        if (intersects.length > 0) {
            let hitObject = intersects[0].object;
            let targetEntity = null;

            let currentObj = hitObject;
            while (currentObj) {
                targetEntity = interactiveObjects.find(obj => obj.mesh === currentObj);
                if (targetEntity) break;
                currentObj = currentObj.parent;
            }

            if (targetEntity) {
                const distanceToTarget = this.localPlayer.position.distanceTo(targetEntity.mesh.position);
                if (distanceToTarget > 2.0) {
                    console.log("Estás demasiado lejos del objeto.");
                    return;
                }

                if (typeof targetEntity.chopDown === 'function' && targetEntity.state === 'adult') {
                    const amount = targetEntity.resourceAmount || 15;
                    targetEntity.chopDown();
                    
                    if (typeof InventoryModule !== 'undefined') {
                        InventoryModule.addItem('wood', amount);
                    }
                } 
                else if (typeof targetEntity.mine === 'function' && targetEntity.isReady) {
                    const gainedStone = targetEntity.mine();
                    
                    if (gainedStone > 0 && typeof InventoryModule !== 'undefined') {
                        InventoryModule.addItem('stone', gainedStone);
                    }
                }
            }
        }
    },

    checkCollision(nextPos, currentAltitude) {
        if (typeof WorldModule === 'undefined') return false;
        
        let obstacles = [];
        if (typeof WorldModule.getObstacles === 'function') {
            obstacles = WorldModule.getObstacles();
        } else if (WorldModule.colliders) {
            obstacles = WorldModule.colliders;
        }

        if (!obstacles || obstacles.length === 0) return false;

        const playerRadius = this.localPlayer.radius;

        for (let i = 0; i < obstacles.length; i++) {
            const obs = obstacles[i];
            const obsPos = obs.position || obs; 
            if (!obsPos) continue;

            const nextDist = nextPos.distanceTo(obsPos);
            const obstacleRadius = (obs.radius || 0.15) + 0.12;

            if (nextDist < (playerRadius + obstacleRadius)) {
                return true; 
            }
        }
        return false;
    },

    loop() {
        if (!this.isGameRunning) return;
        requestAnimationFrame(() => this.loop());

        const now = performance.now();
        const delta = Math.min((now - this.lastFrameTime) / 1000, 0.1);
        this.lastFrameTime = now;

        if (typeof WorldModule.rotatePlanet === 'function') {
            WorldModule.rotatePlanet();
        }

        if (typeof WorldModule.updateEcosystem === 'function') {
            WorldModule.updateEcosystem(delta, this.scene, WorldModule.getObstacles());
        }

        if (this.localPlayer.mesh) {
            const p = this.localPlayer;
            const crosshair = document.getElementById('game-crosshair');
            let isMoving = false;

            const R = this.planetRadius;
            
            const planetRotationStep = 0.001;
            p.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), planetRotationStep);
            p.forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), planetRotationStep);

            let normal = p.position.clone().normalize();

            p.forward.addScaledVector(normal, -p.forward.dot(normal)).normalize();
            const right = new THREE.Vector3().crossVectors(p.forward, normal).normalize();

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

            if (crosshair) {
                crosshair.style.display = 'block';
                const scale = isMoving ? 'scale(1.2)' : 'scale(1)';
                crosshair.style.transform = `translate(-50%, -50%) ${scale}`;
            }

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
            
            // Ocultar el avatar en primera persona, visible en tercera y RTS
            p.mesh.visible = (this.cameraMode !== 'first');

            if ((moveForward !== 0 || moveSide !== 0 || p.altitude > 0) && this.socket) {
                this.socket.emit('playerMove', { x: p.position.x, y: p.position.y, z: p.position.z });
            }

            // --- GESTIÓN DE CÁMARAS SEPARADAS Y CORREGIDAS ---
            this.camera.up.copy(normal);

            if (this.cameraMode === 'first') {
                // 🌟 Primera persona real tipo Shooter: cámara en los ojos, ocultando el avatar
                const eyeHeight = 0.38;
                const eyePosition = p.position.clone().add(normal.clone().multiplyScalar(eyeHeight));
                this.camera.position.copy(eyePosition);

                const lookDir = p.forward.clone();
                lookDir.applyAxisAngle(right, p.pitch);
                const targetLookAt = eyePosition.clone().add(lookDir.multiplyScalar(p.weaponRange));
                this.camera.lookAt(targetLookAt);

            } else if (this.cameraMode === 'third') {
                // 🌟 Tercera persona: Vista Over-the-shoulder lateral y compacta
                const baseDistance = 1.6;
                const baseHeight = 0.6;
                const pitchOffset = Math.sin(p.pitch) * 0.25;

                let camPos = p.position.clone()
                    .add(normal.clone().multiplyScalar(baseHeight + pitchOffset))
                    .add(right.clone().multiplyScalar(p.yawOffset));

                const camNormal = camPos.clone().normalize();
                if (camPos.length() < R + 0.3) {
                    camPos.copy(camNormal.multiplyScalar(R + 0.3));
                }

                this.camera.position.copy(camPos);
                const lookTarget = p.position.clone().add(normal.clone().multiplyScalar(0.3)).add(p.forward.clone().multiplyScalar(2.0));
                this.camera.lookAt(lookTarget);

            } else if (this.cameraMode === 'rts') {
                // 🌟 Modo Warcraft / RTS: Vista cenital elevada limitando la movilidad más abajo de los pies (mirando al suelo/pies del personaje)
                const rtsHeight = 3.5;
                const rtsBack = 0.8;
                
                let camPos = p.position.clone()
                    .add(normal.clone().multiplyScalar(rtsHeight))
                    .sub(p.forward.clone().multiplyScalar(rtsBack));

                const camNormal = camPos.clone().normalize();
                if (camPos.length() < R + 0.3) {
                    camPos.copy(camNormal.multiplyScalar(R + 0.3));
                }

                this.camera.position.copy(camPos);
                
                // Focalización limitada abajo de los pies / base del personaje
                const footTarget = p.position.clone().add(normal.clone().multiplyScalar(0.05));
                this.camera.lookAt(footTarget);
            }
        }

        this.renderer.render(this.scene, this.camera);
    }
};

window.GameModule = Game;
