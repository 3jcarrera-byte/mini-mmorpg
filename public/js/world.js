// Módulo de Mundo Esférico (Estilo Pequeño Planeta / Rust / ARK)
const WorldModule = (() => {
    let planetMesh;
    let playerPos = { theta: 0, phi: Math.PI / 4 };
    const planetRadius = 5;
    const structures = [];
    const obstacles = []; // Almacén global de obstáculos para colisiones
    const interactiveObjects = []; 

    function createPlanet(scene, worldConfig = {}) {
        obstacles.length = 0;
        structures.length = 0;
        interactiveObjects.length = 0;

        const planetGeo = new THREE.SphereGeometry(planetRadius, 32, 32);
        const planetMat = new THREE.MeshStandardMaterial({ 
            color: worldConfig.color || 0x1a4314, 
            roughness: 0.8,
            flatShading: true 
        });

        planetMesh = new THREE.Mesh(planetGeo, planetMat);
        scene.add(planetMesh);

        generateFeatures(scene, worldConfig.treeCount || 35, worldConfig.rockCount || 25);
        return planetMesh;
    }

    // --- DISEÑO DETALLADO Y DINÁMICO DE ÁRBOLES (CON CICLO DE VIDA) ---
    function createDetailedTree(position, initialInitialState = 'adult', initialProgress = 1.0) {
        const group = new THREE.Group();
        
        // Tronco
        const trunkGeo = new THREE.CylinderGeometry(0.06, 0.1, 0.45, 6);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9, flatShading: true });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 0.22;
        group.add(trunk);

        // Copas en capas (estilo pino estilizado)
        const leavesMat = new THREE.MeshStandardMaterial({ color: 0x2d8a39, roughness: 0.7, flatShading: true });
        
        const layer1 = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.45, 5), leavesMat);
        layer1.position.y = 0.45;
        group.add(layer1);

        const layer2 = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.35, 5), leavesMat);
        layer2.position.y = 0.7;
        group.add(layer2);

        const layer3 = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.25, 5), leavesMat);
        layer3.position.y = 0.9;
        group.add(layer3);

        group.position.copy(position);
        group.lookAt(0, 0, 0);
        group.rotateX(Math.PI / 2);
        group.position.addScaledVector(group.position.clone().normalize(), 0.05);

        const colliderRef = {
            position: group.position.clone(),
            radius: 0.18,
            height: 0.6
        };

        const treeEntity = {
            mesh: group,
            collider: colliderRef,
            resourceType: 'wood',
            resourceAmount: 15,
            
            // Estados ecológicos
            state: initialInitialState, // 'sapling', 'adult', 'stump'
            growthProgress: initialProgress,
            health: 100,
            regrowthTimer: 0,
            seedTimer: 0,

            update(delta, scene, obstaclesList, allObjectsList) {
                // 1. Crecimiento del brote
                if (this.state === 'sapling') {
                    this.growthProgress += delta * 0.04; // Velocidad de crecimiento
                    if (this.growthProgress >= 1.0) {
                        this.growthProgress = 1.0;
                        this.state = 'adult';
                        group.scale.set(1, 1, 1);
                    } else {
                        group.scale.setScalar(this.growthProgress);
                    }
                    return;
                }

                // 2. Generación de semillas periódicas en árboles adultos
                if (this.state === 'adult') {
                    this.seedTimer += delta;
                    if (this.seedTimer > 50) { // Cada ~50 segundos intenta plantar un brote cerca
                        this.seedTimer = 0;
                        this.trySpawnSeed(scene, obstaclesList, allObjectsList);
                    }
                }

                // 3. Sistema de retoño del tocón si no es talado/extraído del todo
                if (this.state === 'stump') {
                    this.regrowthTimer += delta;
                    if (this.regrowthTimer > 70) { // Tras 70 segundos sin extraer el tocón, retoña
                        this.regrowthTimer = 0;
                        this.state = 'sapling';
                        this.growthProgress = 0.2;
                        this.health = 100;
                        group.scale.setScalar(0.2);
                        
                        // Restaurar dimensiones de colisión de adulto
                        this.collider.radius = 0.18;
                        this.collider.height = 0.6;
                    }
                }
            },

            chopDown() {
                if (this.state !== 'adult') return;

                this.state = 'stump';
                this.health = 0;
                this.regrowthTimer = 0;

                // Achicar visualmente a modo de tocón
                group.scale.set(1, 0.25, 1);

                // Reducir colisionador para permitir paso fluido
                this.collider.radius = 0.08;
                this.collider.height = 0.15;
            },

            trySpawnSeed(scene, obstaclesList, allObjectsList) {
                // Crear una posición aleatoria cercana variando ligeramente sobre la esfera
                const offsetTheta = (Math.random() - 0.5) * 0.12;
                const offsetPhi = (Math.random() - 0.5) * 0.12;
                
                const currentPos = group.position.clone();
                const newPos = currentPos.add(new THREE.Vector3(offsetTheta, 0, offsetPhi)).normalize().multiplyScalar(planetRadius);

                // Instanciar nuevo brote (sapling)
                const newTree = createDetailedTree(newPos, 'sapling', 0.15);
                newTree.mesh.scale.setScalar(0.15);

                scene.add(newTree.mesh);
                obstaclesList.push(newTree.collider);
                allObjectsList.push(newTree);
            }
        };

        if (initialInitialState === 'sapling') {
            group.scale.setScalar(initialProgress);
        }

        return treeEntity;
    }

    function createDetailedRock(position) {
        const group = new THREE.Group();
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x7a7a7a, roughness: 0.85, flatShading: true });
        
        const mainGeo = new THREE.DodecahedronGeometry(0.22, 0);
        const mainRock = new THREE.Mesh(mainGeo, rockMat);
        mainRock.scale.set(1.2, 0.8, 1.0);
        mainRock.position.y = 0.12;
        group.add(mainRock);

        const smallGeo = new THREE.DodecahedronGeometry(0.12, 0);
        const smallRock = new THREE.Mesh(smallGeo, rockMat);
        smallRock.position.set(0.15, 0.06, 0.1);
        group.add(smallRock);

        group.position.copy(position);
        group.lookAt(0, 0, 0);
        group.rotateX(Math.PI / 2);
        group.position.addScaledVector(group.position.clone().normalize(), 0.04);

        return {
            mesh: group,
            collider: {
                position: group.position.clone(),
                radius: 0.22,
                height: 0.35
            },
            resourceType: 'stone',
            resourceAmount: 20
        };
    }

    function generateFeatures(scene, trees, rocks) {
        for (let i = 0; i < (trees + rocks); i++) {
            const u = Math.random();
            const v = Math.random();
            const theta = u * 2.0 * Math.PI;
            const phi = Math.acos(2.0 * v - 1.0);

            const r = planetRadius;
            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta);
            const z = r * Math.cos(phi);
            const position = new THREE.Vector3(x, y, z);

            const isTree = i < trees;
            const featureData = isTree ? createDetailedTree(position, 'adult', 1.0) : createDetailedRock(position);

            if (featureData) {
                if (featureData.mesh) scene.add(featureData.mesh);
                if (featureData.collider) obstacles.push(featureData.collider);
                interactiveObjects.push(featureData);
            }
        }
    }

    function buildStructure(scene, theta, phi, depthLevel = 0) {
        const currentRadius = planetRadius + (depthLevel * 0.3); 
        const x = currentRadius * Math.sin(phi) * Math.cos(theta);
        const y = currentRadius * Math.sin(phi) * Math.sin(theta);
        const z = currentRadius * Math.cos(phi);

        const structGeo = new THREE.BoxGeometry(0.7, 0.2, 0.7);
        const structMat = new THREE.MeshStandardMaterial({ 
            color: depthLevel < 0 ? 0x333333 : 0x888888, 
            roughness: 0.5 
        });
        const structureMesh = new THREE.Mesh(structGeo, structMat);

        structureMesh.position.set(x, y, z);
        structureMesh.lookAt(0, 0, 0);
        structureMesh.rotateX(Math.PI / 2);

        scene.add(structureMesh);
        structures.push(structureMesh);

        obstacles.push({
            position: structureMesh.position.clone(),
            radius: 0.25,
            height: 0.3
        });
    }

    function updatePlayerOnSphere(playerMesh, keys) {
        const speed = 0.03;
        if (keys['KeyW'] || keys['ArrowUp']) playerPos.phi -= speed;
        if (keys['KeyS'] || keys['ArrowDown']) playerPos.phi += speed;
        if (keys['KeyA'] || keys['ArrowLeft']) playerPos.theta -= speed;
        if (keys['KeyD'] || keys['ArrowRight']) playerPos.theta += speed;

        playerPos.phi = Math.max(0.1, Math.min(Math.PI - 0.1, playerPos.phi));

        const r = planetRadius;
        const x = r * Math.sin(playerPos.phi) * Math.cos(playerPos.theta);
        const y = r * Math.sin(playerPos.phi) * Math.sin(playerPos.theta);
        const z = r * Math.cos(playerPos.phi);

        playerMesh.position.set(x, y, z);
        playerMesh.position.normalize().multiplyScalar(planetRadius);
        playerMesh.lookAt(0, 0, 0);
        playerMesh.rotateX(Math.PI / 2);

        return { position: playerMesh.position, theta: playerPos.theta, phi: playerPos.phi };
    }

    function rotatePlanet() {
        if (planetMesh) planetMesh.rotation.y += 0.001;
    }

    // --- ACTUALIZADOR DE ECOSISTEMA GLOBAL (LLAMAR EN EL BUCLE DEL JUEGO) ---
    function updateEcosystem(delta, scene, obstaclesList) {
        interactiveObjects.forEach(obj => {
            if (typeof obj.update === 'function') {
                obj.update(delta, scene, obstaclesList, interactiveObjects);
            }
        });
    }

    return {
        createPlanet,
        buildStructure,
        updatePlayerOnSphere,
        rotatePlanet,
        updateEcosystem,
        getRadius: () => planetRadius,
        getObstacles: () => obstacles,
        getInteractiveObjects: () => interactiveObjects
    };
})();

window.WorldModule = WorldModule;
