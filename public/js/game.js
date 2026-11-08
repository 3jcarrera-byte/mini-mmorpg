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
        yawOffset: 0.22, 
        weaponRange: 15.0,
        radius: 0.08 
    },
    remotePlayers: {},
    isGameRunning: false,
    planetRadius: 5.0,
    gravity: 0.004,
    cameraMode: 'third',
    isAiming: false,
    lastFrameTime: 0,

    setCameraMode(mode) {
        this.cameraMode = mode;
    },

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
        this.localPlayer.yawOffset = 0.22;
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

        if (typeof InputModule !== 'undefined') {
            InputModule.init(canvas);
        }

        // 🌟 Asegurar que al hacer clic en el canvas del juego se reactive el control de la cámara
        canvas.addEventListener('click', () => {
            const inventoryModal = document.getElementById('inventory-modal');
            const isInvOpen = inventoryModal && inventoryModal.style.display === 'block';
            if (!isInvOpen && !document.pointerLockElement) {
                canvas.requestPointerLock();
            }
        });
    },

    handleMouseMove(e) {
        const sensitivity = 0.003;
        const normal = this.localPlayer.position.clone().normalize();
        
        const yawDelta = -e.movementX * sensitivity;
        this.localPlayer.forward.applyAxisAngle(normal, yawDelta);
        this.localPlayer.forward.normalize();

        this.localPlayer.pitch -= e.movementY * sensitivity;
        this.localPlayer.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.localPlayer.pitch));
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
        
        const interactiveObjects = WorldModule.getInteractiveObjects().filter(obj => {
            if (!obj.mesh || !obj.mesh.visible) return false;
            if (obj.type === 'tree' && obj.state === 'stump') return false;
            if (obj.type === 'stone' && !obj.isReady) return false;
            return true;
        });

        interactiveObjects.forEach(obj => {
            if (obj.mesh) {
                obj.mesh.updateMatrixWorld(true);
            }
        });

        const meshes = interactiveObjects.map(obj => obj.mesh);
        const intersects = raycaster.intersectObjects(meshes, true);

        let targetEntity = null;

        if (intersects.length > 0) {
            let hitObject = intersects[0].object;
            let currentObj = hitObject;
            while (currentObj) {
                targetEntity = interactiveObjects.find(obj => obj.mesh === currentObj);
                if (targetEntity) break;
                currentObj = currentObj.parent;
            }
        }

        // 🌟 Respaldo por proximidad ajustado estrictamente a 0.2 de distancia
        if (!targetEntity) {
            let closestObj = null;
            let minDist = 0.2; 

            interactiveObjects.forEach(obj => {
                const worldPos = new THREE.Vector3();
                obj.mesh.getWorldPosition(worldPos);

                const dist = this.localPlayer.position.distanceTo(worldPos);
                if (dist < minDist) {
                    minDist = dist;
                    closestObj = obj;
                }
            });
            targetEntity = closestObj;
        }

        if (targetEntity) {
            const worldPos = new THREE.Vector3();
            targetEntity.mesh.getWorldPosition(worldPos);
            const distanceToTarget = this.localPlayer.position.distanceTo(worldPos);
            
            // 🌟 Distancia de recolección estricta máxima de 0.4
            if (distanceToTarget > 0.4) {
                console.log("Estás demasiado lejos del objeto.");
                return;
            }

            if (typeof targetEntity.chopDown === 'function' && targetEntity.state !== 'stump') {
                const amount = targetEntity.resourceAmount || 1;
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
        const currentPlanetRotation = (typeof WorldModule.getPlanetRotationY === 'function') ? WorldModule.getPlanetRotationY() : 0;

        for (let i = 0; i < obstacles.length; i++) {
            const obs = obstacles[i];
            if (obs.active === false) continue;

            const basePos = obs.position || obs; 
            if (!basePos) continue;

            const rotatedObsPos = basePos.clone();
            rotatedObsPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), currentPlanetRotation);

            const nextDist = nextPos.distanceTo(rotatedObsPos);
            const obstacleRadius = obs.radius || 0.08;

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

            if (InputModule.isDown('KeyW') || InputModule.isDown('ArrowUp')) { moveForward += p.speed; isMoving = true; }
            if (InputModule.isDown('KeyS') || InputModule.isDown('ArrowDown')) { moveForward -= p.speed; isMoving = true; }
            if (InputModule.isDown('KeyA') || InputModule.isDown('ArrowLeft')) { moveSide -= p.speed; isMoving = true; }
            if (InputModule.isDown('KeyD') || InputModule.isDown('ArrowRight')) { moveSide += p.speed; isMoving = true; }

            if (InputModule.isDown('Space') && p.altitude <= 0.001) {
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
            
            p.mesh.visible = (this.cameraMode !== 'first');

            if ((moveForward !== 0 || moveSide !== 0 || p.altitude > 0) && this.socket) {
                this.socket.emit('playerMove', { x: p.position.x, y: p.position.y, z: p.position.z });
            }

            if (typeof CameraModule !== 'undefined') {
                CameraModule.updateCamera(this.camera, p, this.cameraMode, R);
            }
        }

        this.renderer.render(this.scene, this.camera);
    }
};

window.GameModule = Game;
