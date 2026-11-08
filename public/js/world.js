// public/js/world.js

const WorldModule = (() => {
    let planetMesh;
    let oceanMesh;
    let atmosphereMesh;
    let currentRadius = 5;
    const obstacles = []; 
    const interactiveObjects = []; 

    function createPlanet(scene, worldConfig = {}) {
        obstacles.length = 0;
        interactiveObjects.length = 0;

        scene.background = new THREE.Color(0x020208);
        currentRadius = worldConfig.radius || 5;

        const planetGeo = new THREE.SphereGeometry(currentRadius, 32, 32);
        applyProceduralBiomesAndElevation(planetGeo, currentRadius, worldConfig);

        const planetMat = new THREE.MeshStandardMaterial({ 
            vertexColors: true, 
            roughness: 0.8,
            flatShading: true 
        });

        planetMesh = new THREE.Mesh(planetGeo, planetMat);
        scene.add(planetMesh);

        if (worldConfig.hasOcean !== false) {
            createOceanLayer(scene, worldConfig);
        }

        createAtmosphereLayer(scene, worldConfig);

        // Instanciar el Sol mediante su módulo independiente
        if (typeof SunModule !== 'undefined') {
            SunModule.create(scene, { position: { x: 40, y: 15, z: 25 } });
        }

        generateFeatures(scene, planetMesh, worldConfig.treeCount || 40, worldConfig.rockCount || 20);
        
        return planetMesh;
    }

    function applyProceduralBiomesAndElevation(geometry, baseRadius, worldConfig) {
        const positionAttribute = geometry.attributes.position;
        const colorAttribute = new THREE.BufferAttribute(new Float32Array(positionAttribute.count * 3), 3);
        const colors = worldConfig.colors || { low: 0x2e5a1e, mid: 0x4a7c36, high: 0x8a8a8a, peak: 0xffffff };
        const vertex = new THREE.Vector3();
        const color = new THREE.Color();

        for (let i = 0; i < positionAttribute.count; i++) {
            vertex.fromBufferAttribute(positionAttribute, i);
            const heightFactor = (vertex.length() - baseRadius);

            if (heightFactor < -0.1) color.setHex(colors.low);
            else if (heightFactor < 0.2) color.setHex(colors.mid);
            else if (heightFactor < 0.4) color.setHex(colors.high);
            else color.setHex(colors.peak);

            colorAttribute.setXYZ(i, color.r, color.g, color.b);
        }
        geometry.setAttribute('color', colorAttribute);
    }

    function createOceanLayer(scene, worldConfig) {
        const oceanRadius = currentRadius * (worldConfig.oceanLevel || 0.96);
        const oceanGeo = new THREE.SphereGeometry(oceanRadius, 32, 32);
        const isMagma = worldConfig.oceanColor === 0x3b0000 || worldConfig.name?.includes("Volcánico");

        const oceanMat = new THREE.MeshStandardMaterial({
            color: worldConfig.oceanColor || 0x1e90ff,
            roughness: isMagma ? 0.2 : 0.1,
            metalness: isMagma ? 0.8 : 0.1,
            emissive: isMagma ? 0xff3300 : 0x000000,
            emissiveIntensity: isMagma ? 0.5 : 0.0,
            transparent: true,
            opacity: 0.85
        });

        oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
        scene.add(oceanMesh);
    }

    function createAtmosphereLayer(scene, worldConfig) {
        const atmosphereRadius = currentRadius * 5.0; 
        const atmosphereGeo = new THREE.SphereGeometry(atmosphereRadius, 32, 32);
        const atmosphereMat = new THREE.MeshStandardMaterial({
            color: worldConfig.atmosphereColor || 0x5599ff,
            roughness: 0.9,
            metalness: 0.1,
            transparent: true,
            opacity: 0.75,
            side: THREE.BackSide
        });

        atmosphereMesh = new THREE.Mesh(atmosphereGeo, atmosphereMat);
        scene.add(atmosphereMesh);
    }

    function generateFeatures(scene, containerMesh, trees, rocks) {
        const generatedPositions = [];
        const totalItems = trees + rocks;

        for (let i = 0; i < totalItems; i++) {
            let position, attempts = 0, valid = false;
            do {
                const u = Math.random(), v = Math.random();
                const theta = u * 2.0 * Math.PI, phi = Math.acos(2.0 * v - 1.0);
                position = new THREE.Vector3(
                    currentRadius * Math.sin(phi) * Math.cos(theta),
                    currentRadius * Math.sin(phi) * Math.sin(theta),
                    currentRadius * Math.cos(phi)
                );

                valid = true;
                for (let p of generatedPositions) {
                    if (p.distanceTo(position) < 0.6) { valid = false; break; }
                }
                attempts++;
            } while (!valid && attempts < 15);

            if (valid) {
                generatedPositions.push(position);
                const isTree = i < trees;
                let featureData = isTree && typeof TreeObject !== 'undefined' ? TreeObject.create(position, 'adult', 1.0) : 
                                  (!isTree && typeof RockObject !== 'undefined' ? RockObject.create(position) : null);

                if (featureData) {
                    if (featureData.mesh) {
                        featureData.mesh.position.copy(position);
                        const normal = position.clone().normalize();
                        featureData.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
                        containerMesh.add(featureData.mesh);
                    }
                    if (featureData.collider && featureData.collider.active !== false) {
                        obstacles.push(featureData.collider);
                    }
                    interactiveObjects.push(featureData);
                }
            }
        }
    }

    function rotatePlanet(delta = 0.016) {
        if (planetMesh) planetMesh.rotation.y += 0.001;
        if (oceanMesh) {
            oceanMesh.rotation.y -= 0.0006;
            oceanMesh.rotation.x += 0.0002;
        }
        if (atmosphereMesh) atmosphereMesh.rotation.y += 0.0004;
    }

    function updateEcosystem(delta, scene) {
        interactiveObjects.forEach(obj => {
            if (typeof obj.update === 'function') obj.update(delta, scene, obstacles, interactiveObjects);
        });
    }

    return {
        createPlanet,
        rotatePlanet,
        updateEcosystem,
        getRadius: () => currentRadius,
        getObstacles: () => obstacles,
        getInteractiveObjects: () => interactiveObjects,
        getPlanetRotationY: () => planetMesh ? planetMesh.rotation.y : 0
    };
})();

window.WorldModule = WorldModule;
