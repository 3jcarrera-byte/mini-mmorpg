// public/js/game.js

const Game = {
    socket: null, scene: null, camera: null, renderer: null,
    localPlayer: { 
        mesh: null, 
        baseSpeed: 0.03,
        speed: 0.03, 
        jumpSpeed: 0.04,    
        verticalVelocity: 0, 
        altitude: 0,      
        name: 'Héroe', 
        level: 0, 
        alienRace: 'reptilian', 
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
        this.scene.background = new THREE.Color(0x050510);
        this.scene.fog = new THREE.FogExp2(0x050510, 0.03);

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

                // Asignar gravedad y propiedades físicas coherentes según el arquetipo del planeta
                const archetype = GalaxyModule.PLANET_ARCHETYPES[this.currentPlanetKey];
                if (archetype && archetype.gravity) {
                    // Escalar gravedad del motor en función de la gravedad del planeta (referencia base 9.8)
                    this.gravity = (archetype.gravity / 9.8) * 0.0038;
                    this.localPlayer.jumpSpeed = Math.sqrt(this.gravity * 0.4); // Impulsor de salto coherente
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
        this.localPlayer.yawOffset = 0.22;
        this.localPlayer.altitude = 0;
        this.localPlayer.verticalVelocity = 0;

        this.localPlayer.mesh = this.createPlayerAvatar(this.localPlayer.alienRace, this.localPlayer.color);
        this.scene.add(this.localPlayer.mesh);

        const hudName = document.getElementById('hud-char-name');
        if (hudName) hudName.innerText = `${this.localPlayer.name} [${this.localPlayer.alienRace.toUpperCase()}] (Lv.${this.localPlayer.level})`;

        this.createShooterCrosshair();

        if (typeof InventoryModule !== 'undefined' && typeof InventoryModule.init === 'function') {
            InventoryModule.init();
        }

        if (typeof InputModule !== 'undefined') {
            InputModule.init(canvas);
        }

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
        const planetMesh = (typeof WorldModule !== 'undefined' && typeof WorldModule.getPlanetMesh === 'function') ? WorldModule.getPlanetMesh() : null;
        const planetGlobalCenter = new THREE.Vector3();
        if (planetMesh) planetMesh.getWorldPosition(planetGlobalCenter);

        const normal = this.localPlayer.position.clone().sub(planetGlobalCenter).normalize();
        
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

    createPlayerAvatar(alienRace, customColor) {
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
