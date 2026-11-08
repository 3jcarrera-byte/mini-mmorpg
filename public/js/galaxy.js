// public/js/galaxy.js

const GalaxyModule = (() => {
    let galaxyRegistry = [];
    let starSystems = [];
    let currentActivePlanetId = null;

    /**
     * Catálogo maestro de tipos de planetas con restricciones de tamaño (máx 12.0)
     * y clasificación termodinámica por zonas orbitales (Inner, Habitable, Outer).
     */
    const PLANET_ARCHETYPES = {
        VOLCANIC_MAGMA: {
            zone: "inner",
            name: "Planeta Volcánico",
            radiusRange: [4.0, 7.0], // Máximo controlado <= 12.0
            gravity: 12.0,
            atmosphereColor: 0xff4500,
            ozoneDensity: 0.20,
            hasOcean: true,
            oceanColor: 0x3b0000,
            oceanLevel: 0.90,
            baseTemperature: 85,
            colors: { low: 0x1a0500, mid: 0x3d1400, high: 0x5e2605, peak: 0x222222 },
            resources: [{ type: "obsidian_rock", density: 40, rarity: "common" }]
        },
        DESERT_WASTELAND: {
            zone: "inner",
            name: "Planeta Desértico",
            radiusRange: [4.5, 7.5],
            gravity: 10.5,
            atmosphereColor: 0xffd700,
            ozoneDensity: 0.35,
            hasOcean: false,
            oceanColor: 0x000000,
            oceanLevel: 0.0,
            baseTemperature: 45,
            colors: { low: 0xc2a65e, mid: 0xd2b48c, high: 0xbc8f8f, peak: 0x8b4513 },
            resources: [{ type: "sandstone_rock", density: 35, rarity: "common" }]
        },
        TEMPERATE_FOREST: {
            zone: "habitable", // Zona de mayor densidad poblacional (Más habitables)
            name: "Planeta Templado Boscoso",
            radiusRange: [4.0, 6.5],
            gravity: 9.8,
            atmosphereColor: 0x87ceeb,
            ozoneDensity: 0.65,
            hasOcean: true,
            oceanColor: 0x1e90ff,
            oceanLevel: 0.95,
            baseTemperature: 22,
            colors: { low: 0x2e5a1e, mid: 0x4a7c36, high: 0x8a8a8a, peak: 0xffffff },
            resources: [
                { type: "tree", density: 40, rarity: "common" },
                { type: "rock", density: 25, rarity: "common" }
            ]
        },
        OCEANIC_WORLD: {
            zone: "habitable", // Segunda opción habitable abundante
            name: "Planeta Oceánico",
            radiusRange: [4.5, 7.0],
            gravity: 10.0,
            atmosphereColor: 0x00bfff,
            ozoneDensity: 0.50,
            hasOcean: true,
            oceanColor: 0x0047ab,
            oceanLevel: 0.98,
            baseTemperature: 25,
            colors: { low: 0x1c3b57, mid: 0x2a52be, high: 0x4682b4, peak: 0xb0e0e6 },
            resources: [{ type: "kelp_fiber", density: 35, rarity: "common" }]
        },
        FROZEN_ICE: {
            zone: "outer",
            name: "Planeta Helado",
            radiusRange: [5.0, 8.5],
            gravity: 8.5,
            atmosphereColor: 0xb0e0e6,
            ozoneDensity: 0.40,
            hasOcean: true,
            oceanColor: 0xadd8e6,
            oceanLevel: 0.97,
            baseTemperature: -35,
            colors: { low: 0x8ab6d6, mid: 0xb0e0e6, high: 0xe0f7ff, peak: 0x4a3b32 },
            resources: [{ type: "cryo_crystal", density: 15, rarity: "rare" }]
        },
        BARREN_COLOSSUS: {
            zone: "outer",
            name: "Coloso Exterior",
            radiusRange: [8.0, 12.0], // El más grande del sistema pero estrictamente <= 12.0
            gravity: 13.5,
            atmosphereColor: 0x708090,
            ozoneDensity: 0.15,
            hasOcean: false,
            oceanColor: 0x000000,
            oceanLevel: 0.0,
            baseTemperature: -60,
            colors: { low: 0x2f4f4f, mid: 0x556b2f, high: 0x696969, peak: 0x778899 },
            resources: [{ type: "titanium_ore", density: 20, rarity: "epic" }]
        }
    };

    /**
     * Genera la estructura completa de la galaxia asegurando distribución termodinámica
     * y mayor proporción de mundos habitables por sistema estelar.
     */
    function generateGalaxyDataRegistry() {
        if (galaxyRegistry.length > 0) return galaxyRegistry;

        const totalPlanetsTarget = 1000;
        starSystems = [];
        galaxyRegistry = [];

        const systemPositions = [];
        const minSystemDistance = 180.0;
        let currentPlanetId = 1;
        let sId = 1;

        // Construcción iterativa de sistemas hasta alcanzar la cuota de 1,000 planetas
        while (currentPlanetId <= totalPlanetsTarget) {
            // Generación de coordenadas 3D para el Sistema Solar sin solapamiento
            let pos, valid = false, attempts = 0;
            do {
                const u = Math.random();
                const theta = Math.random() * 2.0 * Math.PI;
                const phi = Math.acos(2.0 * Math.random() - 1.0);
                const r = Math.cbrt(u) * 2000.0; 

                pos = new THREE.Vector3(
                    r * Math.sin(phi) * Math.cos(theta),
                    r * Math.sin(phi) * Math.sin(theta) * 0.2,
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

            // Estrellas centrales (1 a 3 soles)
            const sunCount = Math.random() < 0.65 ? 1 : (Math.random() < 0.88 ? 2 : 3);
            const suns = [];
            for (let i = 0; i < sunCount; i++) {
                suns.push({
                    color: i === 0 ? 0xffd700 : (i === 1 ? 0xff4500 : 0x88ccff),
                    radius: 3.5 + Math.random() * 1.5,
                    offset: i === 0 ? new THREE.Vector3(0, 0, 0) : new THREE.Vector3((Math.random() - 0.5) * 12, 0, (Math.random() - 0.5) * 12)
                });
            }

            const systemId = `sys_${sId}`;
            const systemPlanets = [];

            // Arquitectura de 6 planetas por sistema con mayor peso en zonas habitables
            // Orden termodinámico estricto: Caliente -> Templado (Habitables x2) -> Frío -> Masivo
            const systemPlanetTypes = [
                Math.random() < 0.5 ? "VOLCANIC_MAGMA" : "DESERT_WASTELAND", // 1. Interno (Caliente)
                "DESERT_WASTELAND",                                         // 2. Transición interna
                "TEMPERATE_FOREST",                                         // 3. Habitable principal
                "OCEANIC_WORLD",                                            // 4. Habitable secundario
                "FROZEN_ICE",                                               // 5. Externo frío
                "BARREN_COLOSSUS"                                           // 6. Exterior masivo (<= 12.0)
            ];

            let orbitalDistance = 25.0;
            systemPlanetTypes.forEach((pType, index) => {
                if (currentPlanetId > totalPlanetsTarget) return;

                orbitalDistance += 16.0 + Math.random() * 6.0;
                const archetype = PLANET_ARCHETYPES[pType];
                
                // Calcular radio aleatorio dentro del rango permitido (nunca > 12.0)
                const radius = archetype.radiusRange[0] + Math.random() * (archetype.radiusRange[1] - archetype.radiusRange[0]);

                const planetData = {
                    id: currentPlanetId,
                    systemId: systemId,
                    type: pType,
                    radius: radius,
                    orbitRadius: orbitalDistance,
                    orbitalSpeed: 0.0001 + (Math.random() * 0.0003), // Velocidad de traslación atómica
                    initialAngle: Math.random() * Math.PI * 2.0,    // Fase orbital inicial
                    generationSeed: Math.floor(Math.random() * 100000),
                    owner: null
                };

                galaxyRegistry.push(planetData);
                systemPlanets.push(planetData);
                currentPlanetId++;
            });

            starSystems.push({
                systemId: systemId,
                position: pos,
                suns: suns,
                planets: systemPlanets
            });

            sId++;
        }

        return galaxyRegistry;
    }

    /**
     * Procedural Generation by Demand: Carga el planeta activo del jugador,
     * limpiando la memoria GPU y aplicando la traslación orbital atómica.
     */
    function loadPlanetScene(scene, planetId) {
        if (galaxyRegistry.length === 0) {
            generateGalaxyDataRegistry();
        }

        const planetData = galaxyRegistry.find(p => p.id === planetId);
        if (!planetData) {
            console.error(`Planeta con ID ${planetId} no encontrado en el registro galáctico.`);
            return null;
        }

        currentActivePlanetId = planetId;

        // Limpiar recursos y mallas del mundo anterior para evitar fugas de memoria
        if (typeof WorldModule !== 'undefined' && typeof WorldModule.destroyWorld === 'function') {
            WorldModule.destroyWorld(scene);
        }

        // Encontrar el sistema estelar contenedor
        const starSystem = starSystems.find(sys => sys.systemId === planetData.systemId);
        
        // Renderizar soles centrales
        if (starSystem && typeof SunModule !== 'undefined') {
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

        // Instanciar el micro-planeta calculando su posición orbital en base a su ángulo inicial
        if (typeof WorldModule !== 'undefined' && typeof WorldModule.createPlanet === 'function') {
            const planetMesh = WorldModule.createPlanet(scene, planetData.type, planetData.orbitRadius);
            
            if (planetMesh && starSystem) {
                // Aplicar ley de traslación atómica inicial
                const posX = starSystem.position.x + Math.cos(planetData.initialAngle) * planetData.orbitRadius;
                const posZ = starSystem.position.z + Math.sin(planetData.initialAngle) * planetData.orbitRadius;
                planetMesh.position.set(posX, starSystem.position.y, posZ);
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
