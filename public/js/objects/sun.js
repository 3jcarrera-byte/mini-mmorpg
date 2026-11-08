// public/js/objects/sun.js

const SunModule = (() => {
    let sunMesh = null;
    let sunLight = null;
    let ambientLight = null;

    function create(scene, options = {}) {
        // Limpiar cualquier sol previo para evitar duplicados en la escena
        destroy(scene);

        // Rango estelar masivo (16.0 a 20.0)
        const radius = options.radius || 18.0;
        const position = options.position || { x: 0, y: 0, z: 0 };

        // El Sol se ubica en el centro del sistema estelar con una escala imponente
        const sunGeo = new THREE.SphereGeometry(radius, 32, 32);
        
        // Material brillante puro basado en emisión / color estelar
        const sunMat = new THREE.MeshBasicMaterial({ 
            color: options.color || 0xffea00
        });
        
        sunMesh = new THREE.Mesh(sunGeo, sunMat);
        sunMesh.position.set(position.x, position.y, position.z);
        scene.add(sunMesh);

        // Luz puntual con alcance ampliado (4000) y decaimiento optimizado (0.2) para cubrir todo el sistema de prueba
        sunLight = new THREE.PointLight(0xffffff, 3.5, 4000, 0.2);
        sunLight.position.set(0, 0, 0);
        sunMesh.add(sunLight);

        // Luz ambiental base para el espacio profundo y las zonas nocturnas de los planetas
        ambientLight = new THREE.AmbientLight(0x222244, 0.35);
        scene.add(ambientLight);

        return sunMesh;
    }

    function destroy(scene) {
        if (sunMesh) {
            scene.remove(sunMesh);
            sunMesh.geometry.dispose();
            sunMesh.material.dispose();
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
