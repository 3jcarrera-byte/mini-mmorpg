// Módulo de Mundo Esférico (Estilo Pequeño Planeta / Rust / ARK) con Sol y Ciclo Lunar
const WorldModule = (() => {
    let planetMesh;
    let sunMesh, moonMesh;
    let celestialOrbitGroup;
    let playerPos = { theta: 0, phi: Math.PI / 4 };
    const planetRadius = 5;
    const structures = [];
    const obstacles = []; 
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

        // 🌟 CREAR SISTEMA DE ASTROS (SOL Y LUNA) EN LA ESCENA
        createCelestialBodies(scene);

        generateFeatures(planetMesh, worldConfig.treeCount || 40, worldConfig.rockCount || 20);
        return planetMesh;
    }

    function createCelestialBodies(scene) {
        celestialOrbitGroup = new THREE.Group();
        scene.add(celestialOrbitGroup);

        // 1. Sol Visible (Esfera emisiva brillante)
        const sunGeo = new THREE.SphereGeometry(0.8, 16, 16);
        const sunMat = new THREE.MeshBasicMaterial({ color: 0xffffee });
        sunMesh = new THREE.Mesh(sunGeo, sunMat);
        sunMesh.position.set(20, 10, 20);
        celestialOrbitGroup.add(sunMesh);

        // Luz direccional principal anclada al sol para iluminar dinámicamente el planeta
        const sunLight = new THREE.DirectionalLight(0xfff5b6, 1.4);
        sunLight.position.set(0, 0, 0);
        sunMesh.add(sunLight);

        // 2. Luna (Opuesta al sol para simular ciclo realista)
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

                const x = planetRadius * Math.sin(phi) * Math.cos(theta);
                const y = planetRadius * Math.sin(phi) * Math.sin(theta);
                const z = planetRadius * Math.cos(phi);
                position = new THREE.Vector3(x, y, z);

                valid = true;
                for (let p of generatedPositions) {
                    if (p.distanceTo(position) < 0.5) {
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
                const randomState = Math.random() < 0.6 ? 'sapling' : 'adult';
                const randomProgress = randomState === 'sapling' ? Math.random() * 0.7 + 0.2 : 1.0;
                
                if (window.TreeObject && typeof window.TreeObject.create === 'function') {
                    featureData = window.TreeObject.create(position, randomState, randomProgress);
                }
            } else {
                if (window.RockObject && typeof window.RockObject.create === 'function') {
                    featureData = window.RockObject.create(position);
                }
            }

            if (featureData) {
                if (featureData.mesh) {
                    containerMesh.add(featureData.mesh);
                }
                if (featureData.collider) obstacles.push(featureData.collider);
                interactiveObjects.push(featureData);
            }
        }
    }

    function rotatePlanet() {
        if (planetMesh) {
            planetMesh.rotation.y += 0.001;
        }
        // Rotar lentamente el grupo de astros celestes (Sol y Luna)
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
