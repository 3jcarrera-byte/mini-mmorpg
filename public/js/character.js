// Motor 3D de Selección y Creación estilo Albion Online
const CharacterModule = (() => {
    let scene, camera, renderer;
    let characterMeshes = []; // Almacena los personajes creados presentes en la escena
    let classCreationMeshes = {}; // Almacena las mallas para la pantalla de creación
    let selectedCharacterData = null;
    let isCreationMode = false;
    let raycaster = new THREE.Raycaster();
    let mouse = new THREE.Vector2();

    const classes = [
        { id: 'guerrero', name: 'Guerrero', color: 0xff0033 },
        { id: 'mago', name: 'Mago', color: 0x0088ff },
        { id: 'arquero', name: 'Arquero', color: 0x00ff66 }
    ];

    function init3D() {
        const canvas = document.getElementById('characterCanvas');
        if (!canvas) return;

        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x000000, 0.08);

        camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 2.2, 5.5);

        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);

        // Iluminación Escénica
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const spotLight = new THREE.SpotLight(0xffd700, 2);
        spotLight.position.set(0, 6, 4);
        scene.add(spotLight);

        // Suelo / Pedestal Estilo Albion
        const floorGeo = new THREE.CylinderGeometry(4, 4, 0.2, 32);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.6 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.y = -0.1;
        scene.add(floor);

        // Modelos de selección de clase en Modo Creación
        classes.forEach((c, idx) => {
            const group = createCharacterMesh(c.color, `${c.name}`);
            group.position.set((idx - 1) * 2, 0, 0);
            group.visible = false;
            scene.add(group);
            classCreationMeshes[c.id] = group;
        });

        // Evento Clic en el Canvas 3D para Seleccionar Personajes (Raycaster)
        canvas.addEventListener('click', onCanvasClick);
        window.addEventListener('resize', onWindowResize);
        animate();
    }

    // Helper para construir malla 3D de personaje con etiqueta de nombre flotante
    function createCharacterMesh(colorHex, labelText) {
        const group = new THREE.Group();
        
        // Cuerpo
        const bodyGeo = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 16);
        const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.4 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.6;
        group.add(body);

        // Cabeza
        const headGeo = new THREE.SphereGeometry(0.22, 16, 16);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xffd700 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.4;
        group.add(head);

        // Etiqueta 3D Flotante con Nombre
        const labelSprite = createTextSprite(labelText);
        labelSprite.position.set(0, 1.9, 0);
        group.add(labelSprite);

        return group;
    }

    function createTextSprite(text) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);
        ctx.font = 'bold 20px "Courier New", monospace';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(1.6, 0.4, 1);
        return sprite;
    }

    // Renderiza la lista de personajes del usuario en el espacio 3D en pedestales
    function renderUserCharacters3D(characterList) {
        // Limpiar mallas anteriores
        characterMeshes.forEach(m => scene.remove(m));
        characterMeshes = [];

        if (isCreationMode) return;

        const count = characterList.length;
        const spacing = 1.8;

        characterList.forEach((char, idx) => {
            const classColor = char.classType === 'mago' ? 0x0088ff : (char.classType === 'arquero' ? 0x00ff66 : 0xff0033);
            const posX = (idx - (count - 1) / 2) * spacing;

            const meshGroup = createCharacterMesh(classColor, `${char.name}\nLv.${char.level || 1}`);
            meshGroup.position.set(posX, 0, 0);
            meshGroup.userData = char; // Asignar datos del personaje a la malla 3D

            scene.add(meshGroup);
            characterMeshes.push(meshGroup);
        });
    }

    // Detección de clic directo en el personaje 3D (Estilo Albion)
    function onCanvasClick(event) {
        if (isCreationMode) return;

        const canvas = document.getElementById('characterCanvas');
        const rect = canvas.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(characterMeshes, true);

        if (intersects.length > 0) {
            // Encontrar el grupo principal del personaje tocado
            let target = intersects[0].object;
            while (target.parent && target.parent !== scene) {
                target = target.parent;
            }

            if (target.userData) {
                selectedCharacterData = target.userData;
                highlightSelectedMesh(target);
                
                // Disparar evento global de selección
                if (window.onCharacter3DSelected) {
                    window.onCharacter3DSelected(selectedCharacterData);
                }
            }
        }
    }

    function highlightSelectedMesh(selectedGroup) {
        characterMeshes.forEach(group => {
            group.scale.set(1, 1, 1);
        });
        // Escalar ligeramente el personaje seleccionado
        selectedGroup.scale.set(1.15, 1.15, 1.15);
    }

    function setCreationMode(active) {
        isCreationMode = active;
        
        // Ocultar personajes del usuario si entramos a creación
        characterMeshes.forEach(m => m.visible = !active);

        // Mostrar avatares de clase
        Object.keys(classCreationMeshes).forEach(key => {
            classCreationMeshes[key].visible = active;
        });

        document.getElementById('panel-top-name').style.display = active ? 'block' : 'none';
        document.getElementById('btn-arrow-left').style.display = active ? 'block' : 'none';
        document.getElementById('btn-arrow-right').style.display = active ? 'block' : 'none';

        if (active) focusClass(0);
    }

    function animate() {
        requestAnimationFrame(animate);
        
        // Rotación continua de los personajes en la escena
        characterMeshes.forEach(m => m.rotation.y += 0.005);
        Object.keys(classCreationMeshes).forEach(k => {
            if (classCreationMeshes[k].visible) classCreationMeshes[k].rotation.y += 0.01;
        });

        if (renderer && scene && camera) renderer.render(scene, camera);
    }

    function onWindowResize() {
        if (!camera || !renderer) return;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    let currentClassIndex = 0;
    function focusClass(index) {
        currentClassIndex = (index + classes.length) % classes.length;
        const targetClass = classes[currentClassIndex];
        const targetMesh = classCreationMeshes[targetClass.id];
        if (targetMesh) camera.position.x = targetMesh.position.x;
        document.getElementById('char-display-name').innerText = `CLASE: ${targetClass.name.toUpperCase()}`;
        return targetClass;
    }

    return {
        init3D,
        renderUserCharacters3D,
        setCreationMode,
        getCurrentClass: () => classes[currentClassIndex],
        nextClass: () => focusClass(currentClassIndex + 1),
        prevClass: () => focusClass(currentClassIndex - 1)
    };
})();
