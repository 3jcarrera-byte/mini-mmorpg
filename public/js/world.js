// Módulo de Mundo Esférico (Estilo Pequeño Planeta / Rust / ARK)
const WorldModule = (() => {
    let planetMesh;
    let playerPos = { theta: 0, phi: Math.PI / 4 };
    const planetRadius = 5;
    const structures = [];
    const obstacles = []; // Almacén global de obstáculos para colisiones
    const interactiveObjects = []; // Almacén para objetos recolectables o dinámicos
    const textureLoader = new THREE.TextureLoader();

    function createPlanet(scene, worldConfig = {}) {
        // Limpiar obstáculos anteriores si se recarga el mundo
        obstacles.length = 0;
        structures.length = 0;
        interactiveObjects.length = 0;

        const groundTexture = worldConfig.textureUrl ? textureLoader.load(worldConfig.textureUrl) : null;
        if (groundTexture) {
            groundTexture.wrapS = THREE.RepeatWrapping;
            groundTexture.wrapT = THREE.RepeatWrapping;
            groundTexture.repeat.set(4, 4);
        }

        const planetGeo = new THREE.SphereGeometry(planetRadius, 32, 32);
        const planetMat = new THREE.MeshStandardMaterial({ 
            color: worldConfig.color || 0x1a4314, 
            map: groundTexture,
            roughness: 0.8,
            flatShading: true 
        });

        planetMesh = new THREE.Mesh(planetGeo, planetMat);
        scene.add(planetMesh);

        generateFeatures(scene, worldConfig.treeCount || 35, worldConfig.rockCount || 25);
        return planetMesh;
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

            // Delegar la creación a los submódulos independientes si existen, de lo contrario usar fallback seguro
            let featureData;
            if (isTree && window.TreeObject) {
                featureData = window.TreeObject.create(position);
            } else if (!isTree && window.RockObject) {
                featureData = window.RockObject.create(position);
            } else {
                // Fallback clásico por si los submódulos cargan después
                const featureGeo = new THREE.ConeGeometry(0.2, 0.5, 5);
                const mat = new THREE.MeshStandardMaterial({ color: isTree ? 0x0b6623 : 0x666666, flatShading: true });
                const mesh = new THREE.Mesh(featureGeo, mat);
                mesh.position.copy(position);
                mesh.lookAt(0, 0, 0);
                mesh.rotateX(Math.PI / 2);
                mesh.position.addScaledVector(mesh.position.clone().normalize(), 0.05);
                scene.add(mesh);

                featureData = {
                    mesh: mesh,
                    collider: {
                        position: mesh.position.clone(),
                        radius: 0.18,
                        height: 0.35
                    },
                    resourceType: isTree ? 'wood' : 'stone',
                    resourceAmount: isTree ? 10 : 15
                };
            }

            if (featureData) {
                if (featureData.mesh) scene.add(featureData.mesh);
                if (featureData.collider) obstacles.push(featureData.collider);
                interactiveObjects.push(featureData);
            }
        }
    }

    // Permitir construir cimientos en superficie (depth = 0) o subterráneos hacia abajo (depth = -1)
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

        // Registrar estructura construida como obstáculo con radio preciso
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

    return {
        createPlanet,
        buildStructure,
        updatePlayerOnSphere,
        rotatePlanet,
        getRadius: () => planetRadius,
        getObstacles: () => obstacles,
        getInteractiveObjects: () => interactiveObjects
    };
})();

window.WorldModule = WorldModule;
