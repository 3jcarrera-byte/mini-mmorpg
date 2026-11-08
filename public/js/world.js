// public/js/world.js

const WorldModule = (() => {
    let planetMesh;
    let oceanMesh;
    let atmosphereMesh;
    let sunMesh, moonMesh;
    let celestialOrbitGroup;
    let currentRadius = 5; // Radio base configurable
    const obstacles = []; 
    const interactiveObjects = []; 

    function createPlanet(scene, worldConfig = {}) {
        obstacles.length = 0;
        interactiveObjects.length = 0;

        // Fijar el fondo de la escena permanentemente al negro del espacio profundo
        scene.background = new THREE.Color(0x020208);

        // Permitir personalizar el radio y tipo desde la configuración del mundo
        currentRadius = worldConfig.radius || 5;

        const planetGeo = new THREE.SphereGeometry(currentRadius, 32, 32);
        
        // Aplicar paleta de colores por elevación y microbiomas basados en el tipo de planeta
        applyProceduralBiomesAndElevation(planetGeo, currentRadius, worldConfig);

        const planetMat = new THREE.MeshStandardMaterial({ 
            vertexColors: true, // Permite usar los colores asignados por vértice
            roughness: 0.8,
            flatShading: true 
        });

        planetMesh = new THREE.Mesh(planetGeo, planetMat);
        scene.add(planetMesh);

        // Crear la capa de Océano o Magma si el mundo lo requiere
        if (worldConfig.hasOcean !== false) {
            createOceanLayer(scene, worldConfig);
        }

        // Crear la capa atmosférica (Techo atmosférico / Capa de ozono)
        createAtmosphereLayer(scene, worldConfig);

        // Crear cuerpos celestes (Estrella y Luna)
        createCelestialBodies(scene);

        // Generar recursos en la superficie (Árboles y Rocas perfectamente alineados)
        generateFeatures(scene, planetMesh, worldConfig.treeCount || 40, worldConfig.rockCount || 20);
        
        return planetMesh;
    }

    // Lógica para asignar colores a los vértices según su altura (Elevación y Microbiomas)
    function applyProceduralBiomesAndElevation(geometry, baseRadius, worldConfig) {
        const positionAttribute = geometry.attributes.position;
        const colorAttribute = new THREE.BufferAttribute(new Float32Array(positionAttribute.count * 3), 3);
        
        const colors = worldConfig.colors || {
            low: 0x2e5a1e,
            mid: 0x4a7c36,
            high: 0x8a8a8a,
            peak: 0xffffff
        };

        const vertex = new THREE.Vector3();
        const color = new THREE.Color();

        for (let i = 0; i < positionAttribute.count; i++) {
            vertex.fromBufferAttribute(positionAttribute, i);
            const distanceFromCenter = vertex.length();
            const heightFactor = (distanceFromCenter - baseRadius);

            if (heightFactor < -0.1) {
                color.setHex(colors.low);
            } else if (heightFactor >= -0.1 && heightFactor < 0.2) {
                color.setHex(colors.mid);
            } else if (heightFactor >= 0.2 && heightFactor < 0.4) {
                color.setHex(colors.high);
            } else {
                color.setHex(colors.peak);
            }

            colorAttribute.setXYZ(i, color.r, color.g, color.b);
        }

        geometry.setAttribute('color', colorAttribute);
    }

    // Crear la segunda esfera concéntrica para el Océano o Río de Lava
    function createOceanLayer(scene, worldConfig) {
        const oceanLevelFactor = worldConfig.oceanLevel || 0.96;
        const oceanRadius = currentRadius * oceanLevelFactor;

        const oceanGeo = new THREE.SphereGeometry(oceanRadius, 32, 32);
        
        // Detectar si es lava (por el color o tipo de planeta) o agua convencional
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

    // Crear la esfera atmosférica (Techo del planeta / Capa de ozono interactiva con la luz solar)
    function createAtmosphereLayer(scene, worldConfig) {
        const atmosphereRadius = currentRadius * 5.0; // Ligeramente flotando sobre la superficie
        const atmosphereGeo = new THREE.SphereGeometry(atmosphereRadius, 32, 32);

        const atmosColor = worldConfig.atmosphereColor || 0x75bbf9;

        const atmosphereMat = new THREE.MeshStandardMaterial({
            color: atmosColor,
            roughness: 1.0,
            metalness: 0.0,
            transparent: true,
            opacity: 0.25,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        atmosphereMesh = new THREE.Mesh(atmosphereGeo, atmosphereMat);
        scene.add(atmosphereMesh);
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

    function generateFeatures(scene, containerMesh, trees, rocks) {
        const generatedPositions = [];
        const totalItems = trees + rocks;

        for (let i = 0; i < totalItems; i++) {
            let position;
            let attempts = 0;
            let valid = false;

            do {
                const u = Math.random();
                const v = Math.random();
                const theta = u * 2.0 * Math.PI;
                const phi = Math.acos(2.0 * v - 1.0);

                const x = currentRadius * Math.sin(phi) * Math.cos(theta);
                const y = currentRadius * Math.sin(phi) * Math.sin(theta);
                const z = currentRadius * Math.cos(phi);
                position = new THREE.Vector3(x, y, z);

                valid = true;
                for (let p of generatedPositions) {
                    if (p.distanceTo(position) < 0.6) {
                        valid = false;
                        break;
                    }
                }
                attempts++;
            } while (!valid && attempts < 15);

            if (valid) {
                generatedPositions.push(position);

                const isTree = i < trees;
                let featureData = null;

                if (isTree && typeof TreeObject !== 'undefined') {
                    featureData = TreeObject.create(position, 'adult', 1.0);
                } else if (!isTree && typeof RockObject !== 'undefined') {
                    featureData = RockObject.create(position);
                }

                if (featureData) {
                    if (featureData.mesh) {
                        featureData.mesh.position.copy(position);
                        
                        // Orientación vertical perfecta hacia el exterior de la esfera
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
        if (planetMesh) {
            planetMesh.rotation.y += 0.001;
        }

        // Animación de flujo dinámico para el océano o lava
        if (oceanMesh) {
            oceanMesh.rotation.y -= 0.0006;
            oceanMesh.rotation.x += 0.0002;
        }

        // Deriva atmosférica independiente para dar dinamismo al techo de nubes/ozono
        if (atmosphereMesh) {
            atmosphereMesh.rotation.y += 0.0004;
        }

        // Rotación de la órbita de los cuerpos celestes (Sol / Luna)
        if (celestialOrbitGroup) {
            celestialOrbitGroup.rotation.y += 0.0003;
        }
    }

    function updateEcosystem(delta, scene) {
        interactiveObjects.forEach(obj => {
            if (typeof obj.update === 'function') {
                obj.update(delta, scene, obstacles, interactiveObjects);
            }
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
