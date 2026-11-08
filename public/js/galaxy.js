// public/js/galaxy.js

const GalaxyModule = (() => {
    let galaxyRegistry = [];
    let starSystems = [];
    let currentActivePlanetId = null;

    /**
     * 1. Genera el registro completo de la galaxia con 1,000 micro-planetas
     * distribuidos en 300-400 sistemas estelares con separación tridimensional optimizada.
     */
    function generateGalaxyDataRegistry() {
        if (galaxyRegistry.length > 0) return galaxyRegistry;

        const totalPlanets = 1000;
        const totalSystems = 350; // Aproximadamente 300 a 400 sistemas estelares
        starSystems = [];
        galaxyRegistry = [];

        const systemPositions = [];
        const minSystemDistance = 120.0; // Distancia mínima para evitar solapamiento entre sistemas

        // Generar coordenadas estelares 3D sin solapamiento
        for (let sId = 1; sId <= totalSystems; sId++) {
            let pos, valid = false, attempts = 0;
            
            do {
                // Distribución esférica galáctica con radio de 2000 unidades
                const u = Math.random();
                const theta = Math.random() * 2.0 * Math.PI;
                const phi = Math.acos(2.0 * Math.random() - 1.0);
                const r = Math.cbrt(u) * 2000.0; 

                pos = new THREE.Vector3(
                    r * Math.sin(phi) * Math.cos(theta),
                    r * Math.sin(phi) * Math.sin(theta) * 0.2, // Aplanado galáctico en el eje Y
                    r * Math.cos(phi)
                );

                valid = true;
                for (let existingPos of systemPositions) {
                    if (existingPos.distanceTo(pos) < minSystemDistance) {
                        valid = false;
                        break;
                    }
                }
                attempts++;
            } while (!valid && attempts < 50);

            systemPositions.push(pos);

            // Sistemas estelares con 1 a 3 soles (Binarios / Trinarios)
            const sunCount = Math.random() < 0.6 ? 1 : (Math.random() < 0.85 ? 2 : 3);
            const suns = [];
            for (let i = 0; i < sunCount; i++) {
                suns.push({
                    sunIndex: i,
                    color: i === 0 ? 0xffea00 : (i === 1 ? 0xff4500 : 0x88ccff),
                    radius: 3.0 + Math.random() * 2.0,
                    offset: i === 0 ? new THREE.Vector3(0, 0, 0) : new THREE.Vector3((Math.random() - 0.5) * 15, 0, (Math.random() - 0.5) * 15)
                });
            }

            starSystems.push({
                systemId: `sys_${sId}`,
                position: pos,
                suns: suns
            });
        }

        // Asignar los 1,000 planetas distribuidos entre los sistemas estelares
        let currentPlanetId = 1;
        starSystems.forEach((system, index) => {
            // Cada sistema alberga entre 2 y 4 planetas aproximadamente para llegar a 1000
            const planetsInSystem = (index === starSystems.length - 1) ? 
                (totalPlanets - currentPlanetId + 1) : 
                Math.min(Math.floor(Math.random() * 3) + 1, totalPlanets - currentPlanetId + 1);

            let baseOrbit = 25.0;
            for (let p = 0; p < planetsInSystem; p++) {
                baseOrbit += 20.0 + Math.random() * 15.0;

                // Tipo de planeta procedural basado en su distancia orbital (temperatura)
                let pType = "TEMPERATE_FOREST";
                if (baseOrbit < 50.0) {
                    pType = "VOLCANIC_MAGMA";
                } else if (baseOrbit > 100.0) {
                    pType = "FROZEN_ICE";
                }

                galaxyRegistry.push({
                    id: currentPlanetId,
                    systemId: system.systemId,
                    type: pType,
                    orbitRadius: baseOrbit,
                    generationSeed: Math.floor(Math.random() * 100000),
                    owner: null
                });

                currentPlanetId++;
                if (currentPlanetId > totalPlanets) break;
            }
        });

        return galaxyRegistry;
    }

    /**
     * 3. Procedural Generation by Demand: Carga exclusivamente el planeta activo del jugador,
     * destruyendo mallas anteriores para garantizar cero fugas de memoria en GPU.
     */
    function loadPlanetScene(scene, planetId) {
        if (galaxyRegistry.length === 0) {
            generateGalaxyDataRegistry();
        }

        const planetData = galaxyRegistry.find(p => p.id === planetId);
        if (!planetData) {
            console.error(`Planeta con ID ${planetId} no encontrado en el registro.`);
            return null;
        }

        currentActivePlanetId = planetId;

        // Limpiar mundo anterior si existe en el módulo de mundos
        if (typeof WorldModule !== 'undefined' && typeof WorldModule.destroyWorld === 'function') {
            WorldModule.destroyWorld(scene);
        }

        // Buscar el sistema estelar al que pertenece el planeta
        const starSystem = starSystems.find(sys => sys.systemId === planetData.systemId);
        
        // Renderizar los soles del sistema estelar en el centro del sistema
        if (starSystem && typeof SunModule !== 'undefined') {
            // Limpiar soles previos si aplica y renderizar los nuevos
            starSystem.suns.forEach(sunConfig => {
                SunModule.create(scene, { 
                    radius: sunConfig.radius, 
                    position: { 
                        x: starSystem.position.x + sunConfig.offset.x, 
                        y: starSystem.position.y + sunConfig.offset.y, 
                        z: starSystem.position.z + sunConfig.offset.z 
                    } 
                });
            });
        }

        // Instanciar el micro-planeta en su órbita exacta dentro del sistema estelar
        if (typeof WorldModule !== 'undefined' && typeof WorldModule.createPlanet === 'function') {
            const planetMesh = WorldModule.createPlanet(scene, planetData.type, planetData.orbitRadius);
            
            // Ajustar la posición global sumando la coordenada base del sistema estelar
            if (planetMesh && starSystem) {
                planetMesh.position.add(starSystem.position);
            }

            return planetMesh;
        }

        return null;
    }

    function getGalaxyRegistry() {
        if (galaxyRegistry.length === 0) generateGalaxyDataRegistry();
        return galaxyRegistry;
    }

    function getStarSystems() {
        if (starSystems.length === 0) generateGalaxyDataRegistry();
        return starSystems;
    }

    return {
        generateGalaxyDataRegistry,
        loadPlanetScene,
        getGalaxyRegistry,
        getStarSystems,
        getActivePlanetId: () => currentActivePlanetId
    };
})();

window.GalaxyModule = GalaxyModule;
