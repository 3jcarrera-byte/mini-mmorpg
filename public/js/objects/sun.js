// public/js/objects/sun.js

const SunModule = (() => {
    let sunMesh = null;
    let ambientLight = null;

    function create(scene, options = {}) {
        // Limpiar instancia previa si existe para evitar sobreexposición y fugas de memoria
        destroy(scene);

        const radius = options.radius || 3.0;
        
        // El Sol es el centro absoluto del Sistema Solar (0, 0, 0)
        const sunGeo = new THREE.SphereGeometry(radius, 32, 32);
        const sunMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });
        
        sunMesh = new THREE.Mesh(sunGeo, sunMat);
        sunMesh.position.set(0, 0, 0);
        scene.add(sunMesh);

        // Luz direccional central que irradia hacia afuera en todas direcciones
        const sunLight = new THREE.DirectionalLight(0xffffff, 1.8);
        sunLight.position.set(0, 0, 0);
        sunMesh.add(sunLight);

        // Luz ambiental global para las zonas nocturnas
        ambientLight = new THREE.AmbientLight(0x222244, 0.4);
        scene.add(ambientLight);

        return sunMesh;
    }

    function destroy(scene) {
        if (sunMesh) {
            scene.remove(sunMesh);
            sunMesh.geometry.dispose();
            if (Array.isArray(sunMesh.material)) {
                sunMesh.material.forEach(m => m.dispose());
            } else {
                sunMesh.material.dispose();
            }
            sunMesh = null;
        }
        if (ambientLight) {
            scene.remove(ambientLight);
            ambientLight = null;
        }
    }

    return {
        create,
        destroy
    };
})();

window.SunModule = SunModule;
