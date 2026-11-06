// Renderizador 3D para Selección/Creación estilo Diablo
const CharacterModule = (() => {
    let scene, camera, renderer;
    let meshes = {};
    let currentClassIndex = 0;
    const classes = [
        { id: 'guerrero', name: 'Guerrero', color: 0xff0033 },
        { id: 'mago', name: 'Mago', color: 0x0088ff },
        { id: 'arquero', name: 'Arquero', color: 0x00ff66 }
    ];

    function init3D() {
        const canvas = document.getElementById('characterCanvas');
        if (!canvas) return;

        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x000000, 0.15);

        camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 1.5, 4);

        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);

        // Luces Cinemáticas
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0xffd700, 2, 10);
        pointLight.position.set(0, 3, 2);
        scene.add(pointLight);

        // Crear Mallas de los personajes
        classes.forEach((c, idx) => {
            const geo = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 16);
            const mat = new THREE.MeshPhongMaterial({ color: c.color, emissive: 0x111111 });
            const mesh = new THREE.Mesh(geo, mat);
            
            // Cabeza
            const headGeo = new THREE.SphereGeometry(0.2, 16, 16);
            const headMat = new THREE.MeshPhongMaterial({ color: 0xffd700 });
            const head = new THREE.Mesh(headGeo, headMat);
            head.position.y = 0.8;
            mesh.add(head);

            mesh.position.set((idx - 1) * 2, 0, 0); // Separación horizontal
            scene.add(mesh);
            meshes[c.id] = mesh;
        });

        window.addEventListener('resize', onWindowResize);
        animate();
    }

    function animate() {
        requestAnimationFrame(animate);
        Object.keys(meshes).forEach(key => {
            meshes[key].rotation.y += 0.01;
        });
        if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
    }

    function onWindowResize() {
        if (!camera || !renderer) return;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function focusClass(index) {
        currentClassIndex = (index + classes.length) % classes.length;
        const targetClass = classes[currentClassIndex];
        
        // Mover cámara suavemente al modelo enfocado
        const targetMesh = meshes[targetClass.id];
        if (targetMesh) {
            camera.position.x = targetMesh.position.x;
        }

        document.getElementById('char-display-name').innerText = targetClass.name.toUpperCase();
        return targetClass;
    }

    return {
        init3D,
        focusClass,
        getClasses: () => classes,
        getCurrentClass: () => classes[currentClassIndex],
        nextClass: () => focusClass(currentClassIndex + 1),
        prevClass: () => focusClass(currentClassIndex - 1)
    };
})();
