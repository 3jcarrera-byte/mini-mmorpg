// public/js/game.js

const Game = {
    socket: null, scene: null, camera: null, renderer: null,
    localPlayer: { 
        mesh: null, 
        speed: 0.032, 
        jumpSpeed: 0.045,    
        verticalVelocity: 0, 
        altitude: 0,      
        name: 'Héroe', 
        level: 0, 
        alienRace: 'reptilian', 
        color: 0xff0033,
        position: new THREE.Vector3(0, 5.0, 0),
        forward: new THREE.Vector3(0, 0, -1), 
        pitch: 0,
        yawOffset: 0.0, 
        weaponRange: 15.0,
        radius: 0.08 
    },
    remotePlayers: {},
    isGameRunning: false,
    planetRadius: 5.0,
    gravity: 0.004,
    cameraMode: 'third',
    lastFrameTime: 0,
    currentPlanetKey: 'TEMPERATE_FOREST',

    setCameraMode(mode) {
        this.cameraMode = mode;
    },

    start(characterData) {
        if (characterData) {
            this.localPlayer.name = characterData.name || 'Héroe';
            this.localPlayer.level = characterData.level !== undefined ? characterData.level : 0;
            this.localPlayer.alienRace = characterData.alienRace || characterData.classType || 'reptilian';
             
            if (this.localPlayer.alienRace === 'cyborg' || this.localPlayer.alienRace === 'mago') {
                this.localPlayer.color = 0x0088ff;
            } else if (this.localPlayer.alienRace === 'insectoid' || this.localPlayer.alienRace === 'arquero') {
                this.localPlayer.color = 0x00ff66;
            } else if (this.localPlayer.alienRace === 'tentacled') {
                this.localPlayer.color = 0xaa00ff;
            } else {
                this.localPlayer.color = 0xff0033;
            }
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
        this.scene.background = new THREE.Color(0x020208);
        this.scene.fog = new THREE.FogExp2(0x020208, 0.015);

        this.camera = new THREE.PerspectiveCamera(65, 800 / 600, 0.1, 1000);

        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.renderer.setSize(800, 600);

        this.scene.add(new THREE.AmbientLight(0xffffff, 0.4));

        if (typeof SunModule !== 'undefined') {
            SunModule.create(this.scene);
        }

        let activePlanetMesh = null;
        if (typeof GalaxyModule !== 'undefined') {
            const activePlanetId = GalaxyModule.getActivePlanetId() || 1;
            const registry = GalaxyModule.getGalaxyRegistry();
            const targetPlanetData = registry.find(p => p.id === activePlanetId);
            
            if (targetPlanetData) {
                this.currentPlanetKey = targetPlanetData.planetTypeKey || targetPlanetData.type || 'TEMPERATE_FOREST';
                this.planetRadius = targetPlanetData.radius || 5.0;

                const archetype = GalaxyModule.PLANET_ARCHETYPES[this.currentPlanetKey];
                if (archetype && archetype.gravity) {
                    this.gravity = (archetype.gravity / 9.8) * 0.0035;
                    this.localPlayer.jumpSpeed = Math.sqrt(this.gravity * 0.5);
                }

                activePlanetMesh = GalaxyModule.loadPlanetScene(this.scene, activePlanetId);
            }
        }

        if (!activePlanetMesh && typeof WorldModule !== 'undefined' && typeof WorldModule.createPlanet === 'function') {
            activePlanetMesh = WorldModule.createPlanet(this.scene, 'TEMPERATE_FOREST', 0);
        }

        if (typeof WorldModule.getRadius === 'function') {
            this.planetRadius = WorldModule.getRadius();
        }

        if (activePlanetMesh) {
            const planetGlobalCenter = new THREE.Vector3();
            activePlanetMesh.getWorldPosition(planetGlobalCenter);
            this.localPlayer.position.set(planetGlobalCenter.x, planetGlobalCenter.y + this.planetRadius, planetGlobalCenter.z);
        } else {
            this.localPlayer.position.set(0, this.planetRadius, 0);
        }

        this.localPlayer.forward.set(0, 0, -1).normalize();
        this.localPlayer.pitch = 0;
        this.localPlayer.yawOffset = 0.0;
        this.localPlayer.altitude = 0;
        this.localPlayer.verticalVelocity = 0;

        if (typeof PlayerAvatarModule !== 'undefined') {
            this.localPlayer.mesh = PlayerAvatarModule.create(this.localPlayer.alienRace, this.localPlayer.color).mesh;
        } else {
            this.localPlayer.mesh = new THREE.Group();
        }
        this.scene.add(this.localPlayer.mesh);

        const hudName = document.getElementById('hud-char-name');
        if (hudName) hudName.innerText = `${this.localPlayer.name} [${this.localPlayer.alienRace.toUpperCase()}] (Lv.${this.localPlayer.level})`;

        if (typeof HudModule !== 'undefined' && typeof HudModule.init === 'function') {
            HudModule.init();
            HudModule.updatePlayerInfo(this.localPlayer.name, this.localPlayer.alienRace, this.localPlayer.level);
        }

        if (typeof CrosshairModule !== 'undefined') {
            CrosshairModule.init();
        }

        if (typeof InventoryModule !== 'undefined' && typeof InventoryModule.init === 'function') {
            InventoryModule.init();
        }

        if (typeof InputModule !== 'undefined') {
            InputModule.init(canvas);
        }
    },

    handleMouseMove(e) {
        const sensitivity = 0.003;
        this.localPlayer.yawOffset -= e.movementX * sensitivity;
        
        // 🌟 CORREGIDO DEFINITIVAMENTE: Restamos movementY para que el ratón hacia arriba mire arriba y hacia abajo mire abajo
        this.localPlayer.pitch -= e.movementY * sensitivity;
        
        this.localPlayer.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.localPlayer.pitch));
    },

    connectServer() {
        this.socket = io();
        this.socket.on('initWorld', (data) => {
            const woodEl = document.getElementById('ui-wood');
            if (woodEl && typeof InventoryModule !== 'undefined') {
                woodEl.innerText = InventoryModule.getData().wood;
            }
            if (typeof HudModule !== 'undefined' && typeof InventoryModule !== 'undefined') {
                HudModule.updateResources(InventoryModule.getData());
            }
        });

        this.socket.on('resourceUpdated', (data) => {
            if (typeof HudModule !== 'undefined') {
                HudModule.updateResources(data);
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
            
            if (distanceToTarget > 0.3) {
                console.log("Estás demasiado lejos del objeto.");
                return;
            }

            const entityIndex = interactiveObjects.indexOf(targetEntity);

            if (typeof targetEntity.chopDown === 'function' && targetEntity.state !== 'stump') {
                const amount = targetEntity.resourceAmount || 1;
                targetEntity.chopDown();
                
                if (typeof InventoryModule !== 'undefined') {
                    InventoryModule.addItem('wood', amount);
                    if (typeof HudModule !== 'undefined') {
                        HudModule.updateResources(InventoryModule.getData());
                    }
                }

                if (this.socket) {
                    this.socket.emit('gatherResource', { 
                        type: 'wood', 
                        amount: amount, 
                        entityIndex: entityIndex 
                    });
                }
            } 
            else if (typeof targetEntity.mine === 'function' && targetEntity.isReady) {
                const gainedStone = targetEntity.mine();
                
                if (gainedStone > 0 && typeof InventoryModule !== 'undefined') {
                    InventoryModule.addItem('stone', gainedStone);
                    if (typeof HudModule !== 'undefined') {
                        HudModule.updateResources(InventoryModule.getData());
                    }
                }

                if (this.socket) {
                    this.socket.emit('gatherResource', { 
                        type: 'stone', 
                        amount: gainedStone, 
                        entityIndex: entityIndex 
                    });
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
            let isMoving = false;

            const R = this.planetRadius;
            
            const planetMesh = (typeof WorldModule !== 'undefined' && typeof WorldModule.getPlanetMesh === 'function') ? WorldModule.getPlanetMesh() : null;
            const planetGlobalCenter = new THREE.Vector3();
            if (planetMesh) planetMesh.getWorldPosition(planetGlobalCenter);

            let normal = p.position.clone().sub(planetGlobalCenter).normalize();

            const refVector = new THREE.Vector3(0, 1, 0);
            let tangentRight = new THREE.Vector3().crossVectors(normal, refVector);
            
            if (tangentRight.lengthSq() < 0.0001) {
                tangentRight.crossVectors(normal, new THREE.Vector3(1, 0, 0));
            }
            tangentRight.normalize();
            const tangentForward = new THREE.Vector3().crossVectors(tangentRight, normal).normalize();

            const rotMatrixYaw = new THREE.Matrix4().makeRotationAxis(normal, p.yawOffset);
            const viewForward = tangentForward.clone().applyMatrix4(rotMatrixYaw).normalize();
            const viewRight = tangentRight.clone().applyMatrix4(rotMatrixYaw).normalize().negate();

            let moveForward = 0;
            let moveSide = 0;

            if (InputModule.isDown('KeyW') || InputModule.isDown('ArrowUp')) { moveForward += 1; isMoving = true; }
            if (InputModule.isDown('KeyS') || InputModule.isDown('ArrowDown')) { moveForward -= 1; isMoving = true; }
            if (InputModule.isDown('KeyA') || InputModule.isDown('ArrowLeft')) { moveSide -= 1; isMoving = true; }
            if (InputModule.isDown('KeyD') || InputModule.isDown('ArrowRight')) { moveSide += 1; isMoving = true; }

            if (InputModule.isDown('Space') && p.altitude <= 0.001) {
                p.verticalVelocity = p.jumpSpeed;
            }

            p.verticalVelocity -= this.gravity;
            p.altitude += p.verticalVelocity;

            if (p.altitude <= 0) {
                p.altitude = 0;
                p.verticalVelocity = 0;
            }

            if (typeof CrosshairModule !== 'undefined') {
                CrosshairModule.update(isMoving);
            }

            const targetPos = p.position.clone();

            if (isMoving) {
                const moveDir = viewForward.clone().multiplyScalar(moveForward).add(viewRight.clone().multiplyScalar(moveSide)).normalize();
                
                const axis = new THREE.Vector3().crossVectors(normal, moveDir).normalize();
                const angle = p.speed / R;
                
                targetPos.sub(planetGlobalCenter);
                targetPos.applyAxisAngle(axis, angle);
                targetPos.add(planetGlobalCenter);

                p.forward.copy(moveDir);
            }

            targetPos.sub(planetGlobalCenter).normalize().multiplyScalar(R + p.altitude).add(planetGlobalCenter);

            if (!this.checkCollision(targetPos, p.altitude)) {
                p.position.copy(targetPos);
            }

            normal = p.position.clone().sub(planetGlobalCenter).normalize();
            p.mesh.position.copy(p.position);

            const currentRight = new THREE.Vector3().crossVectors(p.forward, normal).normalize();
            const orthogonalForward = new THREE.Vector3().crossVectors(normal, currentRight).normalize();
            const rotMatrix = new THREE.Matrix4().makeBasis(currentRight, normal, orthogonalForward.clone().negate());
            p.mesh.quaternion.setFromRotationMatrix(rotMatrix);
            
            p.mesh.visible = (this.cameraMode !== 'first');

            if (isMoving && this.socket) {
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
