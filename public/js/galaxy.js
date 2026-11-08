// public/js/galaxy.js

const GalaxyModule = (() => {
    let galaxyRegistry = [];
    let starSystems = [];
    let currentActivePlanetId = null;

    const PLANET_ARCHETYPES = {
        VOLCANIC_MAGMA: {
            zone: "inner",
            name: "Planeta Volcánico",
            radiusRange: [4.0, 5.0],
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
            radiusRange: [4.5, 6.0],
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
            zone: "habitable",
            name: "Planeta Templado Boscoso",
            radiusRange: [4.0, 5.5],
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
            zone: "habitable",
            name: "Planeta Oceánico",
            radiusRange: [4.5, 6.0],
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
            radiusRange: [5.0, 7.0],
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
            radiusRange: [8.0, 12.0],
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
     * Entorno de prueba controlado: 1 solo sistema estelar (sys_test_server) 
     * con 1 sol central masivo y exactamente los 6 planetas arquetipo ordenados.
     */
    function generateGalaxyDataRegistry() {
        if (galaxyRegistry.length > 0) return galaxyRegistry;

        starSystems = [];
        galaxyRegistry = [];

        const systemPosition = new THREE.Vector3(0, 0, 0); // Origen central para el servidor de pruebas
        
        // 1 sol central masivo
        const suns = [{
            color: 0xffd700,
            radius: 18.0,
            offset: new THREE.Vector3(0, 0, 0)
        }];

        const systemId = "sys_test_server";
        const systemPlanets = [];
        const planetTypes = [
            "VOLCANIC_MAGMA", 
            "DESERT_WASTELAND", 
            "TEMPERATE_FOREST", 
            "OCEANIC_WORLD", 
            "FROZEN_ICE", 
            "BARREN_COLOSSUS"
        ];

        let orbitalDistance = 45.0; // Distancia inicial fuera del radio del sol (18.0)
        let currentPlanetId = 1;

        planetTypes.forEach((pType, index) => {
            orbitalDistance += 25.0; // Espaciado seguro entre órbitas
            const archetype = PLANET_ARCHETYPES[pType];
            const radius = archetype.radiusRange[0] + Math.random() * (archetype.radiusRange[1] - archetype.radiusRange[0]);

            const planetData = {
                id: currentPlanetId,
                systemId: systemId,
                type: pType,            // Requisito interno para world.js
                planetTypeKey: pType,   // Requisito de mapeo seguro para game.js
                radius: radius,
                orbitRadius: orbitalDistance,
                orbitalSpeed: 0.0001,
                initialAngle: (index * Math.PI) / 3.0, // Distribución angular inicial uniforme
                generationSeed: 12345 + index,
                owner: null
            };

            galaxyRegistry.push(planetData);
            systemPlanets.push(planetData);
            currentPlanetId++;
        });

        starSystems.push({
            systemId: systemId,
            position: systemPosition,
            suns: suns,
            planets: systemPlanets
        });

        return galaxyRegistry;
    }

    function loadPlanetScene(scene, planetId) {
        if (galaxyRegistry.length === 0) generateGalaxyDataRegistry();

        const planetData = galaxyRegistry.find(p => p.id === planetId);
        if (!planetData) return null;

        currentActivePlanetId = planetId;

        if (typeof WorldModule !== 'undefined' && typeof WorldModule.destroyWorld === 'function') {
            WorldModule.destroyWorld(scene);
        }

        const starSystem = starSystems.find(sys => sys.systemId === planetData.systemId);

        if (starSystem && typeof SunModule !== 'undefined') {
            starSystem.suns.forEach(sunConfig => {
                SunModule.create(scene, { 
                    radius: sunConfig.radius, 
                    color: sunConfig.color,
                    position: sunConfig.offset 
                });
            });
        }

        if (typeof WorldModule !== 'undefined' && typeof WorldModule.createPlanet === 'function') {
            const planetMesh = WorldModule.createPlanet(scene, planetData.type, 0, planetData.radius);
            
            if (planetMesh && starSystem) {
                const posX = starSystem.position.x + Math.cos(planetData.initialAngle) * planetData.orbitRadius;
                const posZ = starSystem.position.z + Math.sin(planetData.initialAngle) * planetData.orbitRadius;
                planetMesh.position.set(posX, starSystem.position.y, posZ);
            }

            return planetMesh;
        }

        return null;
    }

    return {
        generateGalaxyDataRegistry,
        loadPlanetScene,
        getGalaxyRegistry: () => { if (galaxyRegistry.length === 0) generateGalaxyDataRegistry(); return galaxyRegistry; },
        getStarSystems: () => { if (starSystems.length === 0) generateGalaxyDataRegistry(); return starSystems; },
        getActivePlanetId: () => currentActivePlanetId,
        PLANET_ARCHETYPES
    };
})();

window.GalaxyModule = GalaxyModule;
