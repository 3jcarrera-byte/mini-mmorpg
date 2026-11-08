// Módulo de Mundo Esférico (Estilo Pequeño Planeta / Rust / ARK) con Superficie Exacta, Colisiones Universales y Árboles Perfectos
const WorldModule = (() => {
    let planetMesh;
    let sunMesh, moonMesh;
    let celestialOrbitGroup;
    const planetRadius = 5;
    const obstacles = []; 
    const interactiveObjects = []; 

    function createPlanet(scene, worldConfig = {}) {
        obstacles.length = 0;
        interactiveObjects.length = 0;

        const planetGeo = new THREE.SphereGeometry(planetRadius, 32, 32);
        const planetMat = new THREE.MeshStandardMaterial({ 
            color: worldConfig.color || 0x1a4314, 
            roughness: 0.8,
            flatShading: true 
        });

        planetMesh = new THREE.Mesh(planetGeo, planetMat);
        scene.add(planetMesh);

        createCelestialBodies(scene);
        generateFeatures(planetMesh, worldConfig.treeCount || 40, worldConfig.rockCount || 20);
        return planetMesh;
    }

    function createCelestialBodies(scene) {
        celestialOrbitGroup = new THREE.Group();
        scene.add(celestialOrbitGroup);

        const sunGeo = new THREE.SphereGeometry(0.8, 16, 16);
        const sunMat = new THREE.MeshStandardMaterial({ 
            color: 0xffea00,          
            emissive: 0xffcc00,      
            emissiveIntensity: 1.2,  
            roughness: 0.2 
        });
        sunMesh = new THREE.Mesh(sunGeo, sunMat);
        sunMesh.position.set(20, 10, 20);
        celestialOrbitGroup.add(sunMesh);

        const sunLight = new THREE.DirectionalLight(0xffea75, 1.5);
        sunLight.position.set(0, 0, 0);
        sunMesh.add(sunLight);

        const moonGeo = new THREE.SphereGeometry(0.5, 16, 16);
        const moonMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.9 });
        moonMesh = new THREE.Mesh(moonGeo, moonMat);
        moonMesh.position.set(-20, -10, -20);
        celestialOrbitGroup.add(moonMesh);
    }

    function generateFeatures(containerMesh, trees, rocks) {
        const generatedPositions = [];

        for (let i = 0; i < (trees + rocks); i++) {
            let position;
            let attempts = 0;
            let valid = false;

            do {
                const u = Math.random();
                const v = Math.random();
                const theta = u * 2.0 * Math.PI;
                const phi = Math.acos(2.0 * v - 1.0);

                // Posicionamiento exacto sobre el radio exterior de la esfera del planeta
                const x = planetRadius * Math.sin(phi) * Math.cos(theta);
                const y = planetRadius * Math.sin(phi) * Math.sin(theta);
                const z = planetRadius * Math.cos(phi);
                position = new THREE.Vector3(x, y, z);

                valid = true;
                for (let p of generatedPositions) {
                    if (p.distanceTo(position) < 0.6) {
                        valid = false;
                        break;
                    }
                }
                attempts++;
            } while (!valid && attempts < 10);

            generatedPositions.push(position);

            const isTree = i < trees;
            let featureData;

            if (isTree) {
                // Generador integrado de árboles garantizado (soluciona cualquier problema externo de TreeObject)
                featureData = createOptimizedTree(position);
            } else {
                featureData = createOptimizedRock(position);
            }

            if (featureData) {
                if (featureData.mesh) {
                    containerMesh.add(featureData.mesh);
                }
                if (featureData.collider) {
                    obstacles.push(featureData.collider);
                }
                interactiveObjects.push(featureData);
            }
        }
    }

    // 🌟 Árboles con colisión universal y alineación milimétrica a la superficie
    function createOptimizedTree(position) {
        const group = new THREE.Group();
        group.position.copy(position);

        const normal = position.clone().normalize();
        group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);

        const isSapling = Math.random() < 0.4;
        const scaleFactor = isSapling ? 0.6 : 1.0;

        // Tronco perfectamente asentado en la base (y = 0.2 * scaleFactor)
        const trunkGeo = new THREE.CylinderGeometry(0.04 * scaleFactor, 0.06 * scaleFactor, 0.4 * scaleFactor, 6);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9 });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 0.2 * scaleFactor;
        group.add(trunk);

        // Follaje
        const leavesGeo = new THREE.ConeGeometry(0.25 * scaleFactor, 0.6 * scaleFactor, 6);
        const leavesMat = new THREE.MeshStandardMaterial({ color: 0x2d8a4e, roughness: 0.7 });
        const leaves = new THREE.Mesh(leavesGeo, leavesMat);
        leaves.position.y = 0.55 * scaleFactor;
        group.add(leaves);

        const treeEntity = {
            type: 'tree',
            mesh: group,
            state: 'adult', 
            resourceAmount: isSapling ? 5 : 15, // Los pequeños dan menos madera, pero igual bloquean
            respawnTimer: 0,
            radius: 0.22, // Radio de colisión sólido universal
            height: 0.6 * scaleFactor,
            collider: { position: position, radius: 0.22, height: 0.6 * scaleFactor },
            chopDown() {
                this.state = 'stump';
                this.resourceAmount = 0;
                this.respawnTimer = 25.0; 
                group.visible = false; 
            },
            respawn() {
                this.state = 'adult';
                this.resourceAmount = isSapling ? 5 : 15;
                group.visible = true;
            },
            update(delta) {
                if (this.state === 'stump') {
                    this.respawnTimer -= delta;
                    if (this.respawnTimer <= 0) {
                        this.respawn();
                    }
                }
            }
        };

        return treeEntity;
    }

    // 🌟 Piedras optimizadas, pequeñas y con colisión perfecta
    function createOptimizedRock(position) {
        const group = new THREE.Group();
        group.position.copy(position);

        const normal = position.clone().normalize();
        group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);

        const rockGeo = new THREE.DodecahedronGeometry(0.35, 1);
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x808588, roughness: 0.8, flatShading: true });
        const mesh = new THREE.Mesh(rockGeo, rockMat);
        mesh.scale.set(0.2, 0.2, 0.2); // 80% más pequeña
        mesh.position.y = 0.0; // Pegada a la tierra
        group.add(mesh);

        const rockEntity = {
            type: 'stone',
            mesh: group,
            isReady: true,
            resourceAmount: 10,
            respawnTimer: 0,
            radius: 0.25, 
            height: 0.2,
            collider: { position: position, radius: 0.25, height: 0.2 },
            mine() {
                if (!this.isReady) return 0;
                this.isReady = false;
                this.respawnTimer = 20.0; 
                mesh.visible = false;
                return this.resourceAmount;
            },
            respawn() {
                this.isReady = true;
                mesh.visible = true;
            },
            update(delta) {
                if (!this.isReady) {
                    this.respawnTimer -= delta;
                    if (this.respawnTimer <= 0) {
                        this.respawn();
                    }
                }
            }
        };

        return rockEntity;
    }

    function rotatePlanet() {
        if (planetMesh) {
            planetMesh.rotation.y += 0.001;
        }
        if (celestialOrbitGroup) {
            celestialOrbitGroup.rotation.y += 0.0002;
        }
    }

    function updateEcosystem(delta, scene, obstaclesList) {
        interactiveObjects.forEach(obj => {
            if (typeof obj.update === 'function') {
                obj.update(delta, planetMesh, obstaclesList, interactiveObjects);
            }
        });
    }

    return {
        createPlanet,
        rotatePlanet,
        updateEcosystem,
        getRadius: () => planetRadius,
        getObstacles: () => obstacles,
        getInteractiveObjects: () => interactiveObjects
    };
})();

window.WorldModule = WorldModule;
