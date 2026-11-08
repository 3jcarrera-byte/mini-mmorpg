// public/js/objects/sun.js

const SunModule = (() => {
    let sunMesh = null;
    let sunLight = null;

    function create(scene, options = {}) {
        const radius = options.radius || 4.0;

        // El Sol se ubica estrictamente en el centro (0,0,0) como el origen del sistema
        const sunGeo = new THREE.SphereGeometry(radius, 32, 32);
        
        // Usar MeshStandardMaterial con emisión alta para que actúe como una estrella brillante real
        const sunMat = new THREE.MeshStandardMaterial({ 
            color: 0xffaa00,
            emissive: 0xffea00,
            emissiveIntensity: 2.0,
            roughness: 0.2
        });
        
        sunMesh = new THREE.Mesh(sunGeo, sunMat);
        sunMesh.position.set(0, 0, 0);
        scene.add(sunMesh);

        // Luz direccional o puntual masiva que irradia desde el sol hacia afuera
        sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
        sunLight.position.set(0, 0, 0);
        sunMesh.add(sunLight);

        // Luz ambiental para asegurar visibilidad base en el espacio y en las noches
        const ambientLight = new THREE.AmbientLight(0x333355, 0.4);
        scene.add(ambientLight);

        return sunMesh;
    }

    function rotateSun(delta = 0.016) {
        if (sunMesh) {
            sunMesh.rotation.y += 0.002; // Rotación propia del sol
        }
    }

    return {
        create,
        rotateSun
    };
})();

window.SunModule = SunModule;
