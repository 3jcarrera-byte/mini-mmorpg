// public/js/objects/sun.js

const SunModule = (() => {
    let sunMesh = null;
    let sunLight = null;
    let ambientLight = null;

    function create(scene, options = {}) {
        // Limpiar cualquier sol previo para evitar duplicados en la escena
        destroy(scene);

        const radius = options.radius || 4.0;
        const position = options.position || { x: 0, y: 0, z: 0 };

        // El Sol se ubica en el centro del sistema estelar
        const sunGeo = new THREE.SphereGeometry(radius, 32, 32);
        
        // Material con emisión alta para que actúe como una estrella brillante real
        const sunMat = new THREE.MeshBasicMaterial({ 
            color: options.color || 0xffea00
        });
        
        sunMesh = new THREE.Mesh(sunGeo, sunMat);
        sunMesh.position.set(position.x, position.y, position.z);
        scene.add(sunMesh);

        // Luz puntual o direccional masiva que irradia luz y calor hacia todo el sistema
        sunLight = new THREE.PointLight(0xffffff, 2.5, 1500, 0.5);
        sunLight.position.set(0, 0, 0);
        sunMesh.add(sunLight);

        // Luz ambiental base para el espacio profundo y las zonas oscuras de los planetas
        ambientLight = new THREE.AmbientLight(0x222244, 0.3);
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
