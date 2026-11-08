// public/js/objects/atmosphere.js

const AtmosphereObject = (() => {
    function create(planetRadius, config = {}) {
        const targetThickness = 4.5 * Math.sqrt(4.0 / planetRadius);
        const atmosphereRadius = planetRadius + targetThickness;

        const geometry = new THREE.SphereGeometry(atmosphereRadius, 32, 32);
        const density = config.ozoneDensity !== undefined ? config.ozoneDensity : 0.4;

        // Material con color sólido configurable y transparencia uniforme
        const material = new THREE.MeshStandardMaterial({
            color: config.atmosphereColor || 0x87ceeb,
            roughness: 0.5,
            metalness: 0.1,
            transparent: true,
            opacity: density, 
            side: THREE.BackSide,
            depthWrite: false
        });

        const mesh = new THREE.Mesh(geometry, material);

        return {
            mesh,
            geometry,
            material,
            update: (delta) => {
                // Rotación propia independiente para darle dinamismo a las nubes/gases
                if (mesh) {
                    mesh.rotation.y += 0.0004;
                }
            },
            destroy: () => {
                if (geometry) geometry.dispose();
                if (material) material.dispose();
            }
        };
    }

    return { create };
})();

window.AtmosphereObject = AtmosphereObject;
