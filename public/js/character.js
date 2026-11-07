// Renderizador 3D para Selección/Creación estilo Mu / Diablo
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
        camera.position.set(0, 1.2, 3.5);

        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);

        // Luces Cinemáticas
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0xffd700, 2, 10);
        pointLight.position.set(0, 3, 2);
        scene.add(pointLight);

        // Crear Grupos y Mallas de las clases (Ocultas inicialmente)
        classes.forEach((c, idx) => {
            const group = new THREE.Group();
            
            const geo = new THREE.CylinderGeometry(0.25, 0.25, 1.0, 16);
            const mat = new THREE.MeshPhongMaterial({ color: c.color, emissive: 0x111111 });
            const body = new THREE.Mesh(geo, mat);
            group.add(body);

            // Cabeza
            const headGeo = new THREE.SphereGeometry(0.18, 16, 16);
            const headMat = new THREE.MeshPhongMaterial({ color: 0xffd700 });
            const head = new THREE.Mesh(headGeo, headMat);
            head.position.y = 0.7;
            group.add(head);

            group.position.set((idx - 1) * 1.5, 0, 0); // Separación horizontal
            group.visible = false; // Ocultos por defecto hasta que se active el modo creación
            scene.add(group);
            meshes[c.id] = group;
        });

        window.addEventListener('resize', onWindowResize);
        animate();
    }

    // Controlar visibilidad de los modelos 3D y elementos UI de creación
    function setCreationMode(active) {
        Object.keys(meshes).forEach(key => {
            meshes[key].visible = active;
        });
        const topName = document.getElementById('panel-top-name');
        const arrowLeft = document.getElementById('btn-arrow-left');
        const arrowRight = document.getElementById('btn-arrow-right');

        if (topName) topName.style.display = active ? 'block' : 'none';
        if (arrowLeft) arrowLeft.style.display = active ? 'block' : 'none';
        if (arrowRight) arrowRight.style.display = active ? 'block' : 'none';

        if (active) focusClass(0);
    }

    function animate() {
        requestAnimationFrame(animate);
        Object.keys(meshes).forEach(key => {
            if (meshes[key].visible) {
                meshes[key].rotation.y += 0.015;
            }
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

        const nameEl = document.getElementById('char-display-name');
        if (nameEl) {
            nameEl.innerText = `CLASE: ${targetClass.name.toUpperCase()}`;
        }
        return targetClass;
    }

    return {
        init3D,
        setCreationMode,
        focusClass,
        getClasses: () => classes,
        getCurrentClass: () => classes[currentClassIndex],
        nextClass: () => focusClass(currentClassIndex + 1),
        prevClass: () => focusClass(currentClassIndex - 1)
    };
})();
