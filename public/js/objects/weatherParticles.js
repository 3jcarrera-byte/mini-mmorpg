// public/js/objects/weatherParticles.js

const WeatherParticlesModule = (() => {
    let particleSystem = null;
    let particleGeometry = null;
    let particleMaterial = null;
    let particleSpeed = 0.001;

    function create(scene, planetRadius, worldConfig = {}) {
        remove(scene); // Limpiar sistema anterior si existe

        const particleCount = 400; // Cantidad equilibrada para no saturar
        particleGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);

        const spawnRadiusMin = planetRadius * 1.1;
        const spawnRadiusMax = planetRadius * 1.4;

        for (let i = 0; i < particleCount * 3; i += 3) {
            // Distribuir partículas uniformemente en el volumen atmosférico alrededor del planeta
            const u = Math.random();
            const v = Math.random();
            const theta = u * 2.0 * Math.PI;
            const phi = Math.acos(2.0 * v - 1.0);

            const r = spawnRadiusMin + Math.random() * (spawnRadiusMax - spawnRadiusMin);
            positions[i]     = r * Math.sin(phi) * Math.cos(theta);
            positions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i + 2] = r * Math.cos(phi);
        }

        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        // Configuración visual según el clima (tamaños pequeños y discretos)
        let particleColor = 0xffffff;
        let particleSize = 0.04; // Tamaño reducido para evitar que parezcan "bloques"
        particleSpeed = 0.002;

        const climateName = worldConfig.climate?.weatherTypes?.[0] || "clear";

        if (climateName.includes("ash") || climateName.includes("ember") || worldConfig.name?.includes("Volcánico")) {
            particleColor = 0xff5500; // Chispa / Ceniza cálida
            particleSize = 0.05;
            particleSpeed = 0.004;
        } else if (climateName.includes("snow") || climateName.includes("blizzard") || worldConfig.name?.includes("Helado")) {
            particleColor = 0xe0f7ff; // Copos suaves
            particleSize = 0.03;
            particleSpeed = 0.0015;
        } else {
            particleColor = 0xadd8e6; // Bruma / Lluvia ligera
            particleSize = 0.035;
            particleSpeed = 0.0025;
        }

        particleMaterial = new THREE.PointsMaterial({
            color: particleColor,
            size: particleSize,
            transparent: true,
            opacity: 0.5, // Más translúcidas para que no molesten a la vista
            blending: THREE.AdditiveBlending,
            depthWrite: false // Evita interferencias raras con la transparencia del planeta o mar
        });

        particleSystem = new THREE.Points(particleGeometry, particleMaterial);
        scene.add(particleSystem);

        return particleSystem;
    }

    function update(delta) {
        if (particleSystem) {
            // Movimiento orbital y de deriva sutil y lento para no marear
            particleSystem.rotation.y += particleSpeed * 0.3;
            // Evitamos rotar en X para que no crucen de forma extraña la pantalla verticalmente
        }
    }

    function remove(scene) {
        if (particleSystem) {
            scene.remove(particleSystem);
            if (particleGeometry) particleGeometry.dispose();
            if (particleMaterial) particleMaterial.dispose();
            particleSystem = null;
        }
    }

    return {
        create,
        update,
        remove
    };
})();

window.WeatherParticlesModule = WeatherParticlesModule;
