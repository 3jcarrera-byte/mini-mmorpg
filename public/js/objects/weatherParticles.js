// public/js/objects/weatherParticles.js

const WeatherParticlesModule = (() => {
    let particleSystem = null;
    let particleGeometry = null;
    let particleMaterial = null;
    let currentSpeed = 0.01;

    function create(scene, planetRadius, worldConfig = {}) {
        remove(scene); // Limpiar sistema anterior si existe

        const particleCount = 600;
        particleGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);

        const spawnRadius = planetRadius * 1.3; // Flotan ligeramente por encima de la superficie

        for (let i = 0; i < particleCount * 3; i += 3) {
            // Distribuir partículas en una esfera alrededor del planeta
            const u = Math.random();
            const v = Math.random();
            const theta = u * 2.0 * Math.PI;
            const phi = Math.acos(2.0 * v - 1.0);

            const r = spawnRadius + (Math.random() * 0.8 - 0.4); // Pequeña variación de altura
            positions[i]     = r * Math.sin(phi) * Math.cos(theta);
            positions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i + 2] = r * Math.cos(phi);
        }

        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        // Determinar color y velocidad según el clima/tipo de planeta
        let particleColor = 0xffffff;
        let particleSize = 0.15;
        currentSpeed = 0.005;

        const climateName = worldConfig.climate?.weatherTypes?.[0] || "clear";

        if (climateName.includes("ash") || climateName.includes("ember") || worldConfig.name?.includes("Volcánico")) {
            particleColor = 0xff4500; // Naranja fuego / ceniza
            particleSize = 0.18;
            currentSpeed = 0.015;     // Movimiento más violento o rápido
        } else if (climateName.includes("snow") || climateName.includes("blizzard") || worldConfig.name?.includes("Helado")) {
            particleColor = 0xd0f0ff; // Copos blancos / azulados
            particleSize = 0.12;
            currentSpeed = 0.003;     // Caída lenta o deriva sutil
        } else {
            particleColor = 0x87ceeb; // Lluvia / neblina templada
            particleSize = 0.1;
            currentSpeed = 0.008;
        }

        particleMaterial = new THREE.PointsMaterial({
            color: particleColor,
            size: particleSize,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending
        });

        particleSystem = new THREE.Points(particleGeometry, particleMaterial);
        scene.add(particleSystem);

        return particleSystem;
    }

    function update(delta) {
        if (particleSystem) {
            // Rotar lentamente el sistema de partículas para simular deriva atmosférica o viento
            particleSystem.rotation.y += currentSpeed * 0.5;
            particleSystem.rotation.x += currentSpeed * 0.2;
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
