// public/js/objects/sun.js

const SunModule = (() => {
    let sunMesh = null;

    function create(scene, options = {}) {
        const radius = options.radius || 2.5; // Un poco más grande para que se vea en el cielo
        const position = options.position || { x: 40, y: 25, z: 30 };

        // Malla del Sol con material emisivo para que brille con luz propia en el espacio
        const sunGeo = new THREE.SphereGeometry(radius, 32, 32);
        const sunMat = new THREE.MeshBasicMaterial({ 
            color: 0xffea00 
        });
        
        sunMesh = new THREE.Mesh(sunGeo, sunMat);
        sunMesh.position.set(position.x, position.y, position.z);
        scene.add(sunMesh);

        // Luz direccional principal apuntando directamente al centro del planeta (0,0,0)
        const sunLight = new THREE.DirectionalLight(0xffffff, 1.6);
        sunLight.position.set(0, 0, 0);
        sunMesh.add(sunLight);

        // Luz ambiental para evitar sombras completamente negras en la parte nocturna
        const ambientLight = new THREE.AmbientLight(0x333355, 0.5);
        scene.add(ambientLight);

        return sunMesh;
    }

    return {
        create
    };
})();

window.SunModule = SunModule;
