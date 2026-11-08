// public/js/world.js

const WorldModule = (() => {
    let planetMesh;
    let sunMesh, moonMesh;
    let celestialOrbitGroup;
    let currentRadius = 5; // Radio base configurable
    const obstacles = []; 
    const interactiveObjects = []; 

    function createPlanet(scene, worldConfig = {}) {
        obstacles.length = 0;
        interactiveObjects.length = 0;

        // Permitir personalizar el radio desde la configuración del mundo o usar el valor por defecto
        currentRadius = worldConfig.radius || 5;

        const planetGeo = new THREE.SphereGeometry(currentRadius, 32, 32);
        const planetMat = new THREE.MeshStandardMaterial({ 
            color: worldConfig.color || 0x1a4314, 
            roughness: 0.8,
            flatShading: true 
        });

        planetMesh = new THREE.Mesh(planetGeo, planetMat);
        scene.add(planetMesh);

        createCelestialBodies(scene);
        generateFeatures(scene, planetMesh, worldConfig.treeCount || 40, worldConfig.rockCount || 20);
        
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
                        // Asegurar que el objeto mire hacia afuera desde el centro de la esfera
                        featureData.mesh.position.copy(position);
                        featureData.mesh.lookAt(planetMesh.position);
                        featureData.mesh.rotateX(Math.PI / 2); // Ajuste de orientación local si el modelo lo requiere
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

    function rotatePlanet() {
        if (planetMesh) {
            planetMesh.rotation.y += 0.001;
        }
        if (celestialOrbitGroup) {
            celestialOrbitGroup.rotation.y += 0.0002;
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
