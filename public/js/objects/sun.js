// public/js/objects/sun.js

const SunModule = (() => {
    let sunMesh = null;
    let sunLight = null;

    function create(scene, options = {}) {
        const radius = options.radius || 1.5;
        const color = options.color || 0xffea00;
        const position = options.position || { x: 35, y: 15, z: 20 };

        // Malla física del Sol (emite luz propia visual)
        const sunGeo = new THREE.SphereGeometry(radius, 32, 32);
        const sunMat = new THREE.MeshBasicMaterial({ color: color });
        
        sunMesh = new THREE.Mesh(sunGeo, sunMat);
        sunMesh.position.set(position.x, position.y, position.z);
        scene.add(sunMesh);

        // Luz direccional principal que proyecta la iluminación hacia el centro del mundo (0,0,0)
        sunLight = new THREE.DirectionalLight(0xffffff, 1.8);
        sunLight.position.set(0, 0, 0); // Al estar hijo del sol, apunta de forma natural hacia el origen
        sunMesh.add(sunLight);

        // Luz ambiental global suave para que las zonas de sombra no sean un negro absoluto
        const ambientLight = new THREE.AmbientLight(0x222244, 0.3);
        scene.add(ambientLight);

        return sunMesh;
    }

    function getPosition() {
        return sunMesh ? sunMesh.position : null;
    }

    return {
        create,
        getPosition
    };
})();

window.SunModule = SunModule;
