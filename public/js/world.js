// public/js/world.js

const WorldModule = (() => {
    let planetMesh;
    let oceanMesh;
    let atmosphereMesh;
    let currentRadius = 5;
    const obstacles = []; 
    const interactiveObjects = []; 

    function createPlanet(scene, planetTypeKey = "TEMPERATE_FOREST", orbitRadius = 0) {
        // Limpiar recursos previos antes de generar uno nuevo
        destroyWorld(scene);

        obstacles.length = 0;
        interactiveObjects.length = 0;

        scene.background = new THREE.Color(0x020208);

        // Cargar configuración desde PLANET_TYPES
        const config = window.PLANET_TYPES[planetTypeKey] || window.PLANET_TYPES.TEMPERATE_FOREST;
        currentRadius = config.radius || 5;

        const planetGeo = new THREE.SphereGeometry(currentRadius, 32, 32);
        applyProceduralBiomesAndElevation(planetGeo, currentRadius, config);

        const planetMat = new THREE.MeshStandardMaterial({ 
            vertexColors: true, 
            roughness: 0.8,
            flatShading: true 
        });

        planetMesh = new THREE.Mesh(planetGeo, planetMat);
        
        // Posicionar el planeta a la distancia orbital asignada respecto al Sol (0,0,0)
        planetMesh.position.set(orbitRadius, 0, 0);
        scene.add(planetMesh);

        if (config.hasOcean !== false) {
            createOceanLayer(scene, config);
        }

        createAtmosphereLayer(scene, config);

        generateFeatures(scene, planetMesh, config.treeCount || 40, config.rockCount || 20);
        
        return planetMesh;
    }

    function destroyWorld(scene) {
        if (planetMesh) {
            scene.remove(planetMesh);
            planetMesh.geometry.dispose();
            planetMesh.material.dispose();
            planetMesh = null;
        }
        if (oceanMesh) {
            scene.remove(oceanMesh);
            oceanMesh.geometry.dispose();
            oceanMesh.material.dispose();
            oceanMesh = null;
        }
        if (atmosphereMesh) {
            scene.remove(atmosphereMesh);
            atmosphereMesh.geometry.dispose();
            atmosphereMesh.material.dispose();
            atmosphereMesh = null;
        }
    }

    function applyProceduralBiomesAndElevation(geometry, baseRadius, config) {
        const positionAttribute = geometry.attributes.position;
        const colorAttribute = new THREE.BufferAttribute(new Float32Array(positionAttribute.count * 3), 3);
        const colors = config.colors || { low: 0x2e5a1e, mid: 0x4a7c36, high: 0x8a8a8a, peak: 0xffffff };
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

    function createOceanLayer(scene, config) {
        const oceanRadius = currentRadius * (config.oceanLevel || 0.96);
        const oceanGeo = new THREE.SphereGeometry(oceanRadius, 32, 32);
        const isMagma = config.oceanColor === 0x3b0000 || config.name?.includes("Volcánico");

        const oceanMat = new THREE.MeshStandardMaterial({
            color: config.oceanColor || 0x1e90ff,
            roughness: isMagma ? 0.2 : 0.1,
            metalness: isMagma ? 0.8 : 0.1,
            emissive: isMagma ? 0xff3300 : 0x000000,
            emissiveIntensity: isMagma ? 0.5 : 0.0,
            transparent: true,
            opacity: 0.85
        });

        oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
        // El océano sigue la posición del planeta
        planetMesh.add(oceanMesh);
    }

    function createAtmosphereLayer(scene, config) {
        // Capa de ozono rasante y cercana a la superficie (radio ligeramente superior)
        const atmosphereRadius = currentRadius * 1.05; 
        const atmosphereGeo = new THREE.SphereGeometry(atmosphereRadius, 32, 32);
        
        const density = config.ozoneDensity !== undefined ? config.ozoneDensity : 0.45;

        const atmosphereMat = new THREE.MeshBasicMaterial({
            color: config.atmosphereColor || 0x5599ff,
            transparent: true,
            opacity: density,
            side: THREE.FrontSide
        });

        atmosphereMesh = new THREE.Mesh(atmosphereGeo, atmosphereMat);
        // La atmósfera es hija del planeta para rotar y acompañarlo en su órbita
        planetMesh.add(atmosphereMesh);
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
        destroyWorld,
        rotatePlanet,
        updateEcosystem,
        getRadius: () => currentRadius,
        getObstacles: () => obstacles,
        getInteractiveObjects: () => interactiveObjects,
        getPlanetRotationY: () => planetMesh ? planetMesh.rotation.y : 0
    };
})();

window.WorldModule = WorldModule;
