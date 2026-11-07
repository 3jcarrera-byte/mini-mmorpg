// Motor 3D de Selección y Creación estilo Albion Online
const CharacterModule = (() => {
    let scene, camera, renderer;
    let characterMeshes = []; 
    let classCreationMeshes = {}; 
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
        camera.position.set(0, 1.8, 5.0);

        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);

        // Iluminación
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const spotLight = new THREE.SpotLight(0xffd700, 2);
        spotLight.position.set(0, 6, 4);
        scene.add(spotLight);

        // Suelo / Pedestal Central
        const floorGeo = new THREE.CylinderGeometry(3.5, 3.5, 0.2, 32);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.6 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.y = -0.1;
        scene.add(floor);

        // Modelos de selección de clase en Modo Creación
        classes.forEach((c, idx) => {
            const group = createCharacterMesh(c.color, `${c.name.toUpperCase()}`);
            group.position.set((idx - 1) * 2, 0, 0);
            group.visible = false;
            scene.add(group);
            classCreationMeshes[c.id] = group;
        });

        canvas.addEventListener('click', onCanvasClick);
        window.addEventListener('resize', onWindowResize);
        animate();
    }

    // Constructor de malla 3D con texto flotante LIMPIO (Sin recuadro negro)
    function createCharacterMesh(colorHex, labelText) {
        const group = new THREE.Group();
        
        // Cuerpo (Cilindro centrado en x=0, z=0 exactos sobre el texto)
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

        // Etiqueta 3D Flotante Transparente (SIN fondo negro)
        const labelSprite = createTransparentTextSprite(labelText);
        labelSprite.position.set(0, 1.9, 0); // Justo arriba de la cabeza
        group.add(labelSprite);

        return group;
    }

    // Generador de Textura de Texto 100% Transparente (Elimina el recuadro negro)
    function createTransparentTextSprite(text) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 128;
        
        // Sin fondo (transparente por defecto)
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Estilo de texto nítido estilo MMORPG
        ctx.font = 'bold 36px "Courier New", monospace';
        ctx.fillStyle = '#ffd700'; // Dorado brillante
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Sombra suave para legibilidad sin recuadros
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 8;
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(1.8, 0.45, 1);
        return sprite;
    }

    // Renderiza los personajes del usuario centrados en la escena 3D
    function renderUserCharacters3D(characterList) {
        characterMeshes.forEach(m => scene.remove(m));
        characterMeshes = [];

        if (isCreationMode) return;

        const count = characterList.length;
        const spacing = 2.0;

        characterList.forEach((char, idx) => {
            const classColor = char.classType === 'mago' ? 0x0088ff : (char.classType === 'arquero' ? 0x00ff66 : 0xff0033);
            const posX = (idx - (count - 1) / 2) * spacing;

            const meshGroup = createCharacterMesh(classColor, `${char.name} (Lv.${char.level || 1})`);
            meshGroup.position.set(posX, 0, 0);
            meshGroup.userData = char; // Asociar los datos reales del personaje a la figura 3D

            scene.add(meshGroup);
            characterMeshes.push(meshGroup);
        });
    }

    // Selección por Clic Directo en la figura 3D (Raycaster)
    function onCanvasClick(event) {
        if (isCreationMode) return;

        const canvas = document.getElementById('characterCanvas');
        const rect = canvas.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(characterMeshes, true);

        if (intersects.length > 0) {
            let target = intersects[0].object;
            while (target.parent && target.parent !== scene) {
                target = target.parent;
            }

            if (target.userData && target.userData.id) {
                selectedCharacterData = target.userData;
                highlightSelectedMesh(target);

                // Notificar a app.js que este personaje 3D fue seleccionado
                if (window.onCharacter3DSelected) {
                    window.onCharacter3DSelected(selectedCharacterData);
                }
            }
        }
    }

    function highlightSelectedMesh(selectedGroup) {
        characterMeshes.forEach(group => {
            group.scale.set(1, 1, 1);
            // Restablecer brillo de materiales
            group.traverse(child => {
                if (child.material && child.material.emissive) child.material.emissive.setHex(0x000000);
            });
        });

        // Destacar visualmente el personaje seleccionado
        selectedGroup.scale.set(1.15, 1.15, 1.15);
        selectedGroup.traverse(child => {
            if (child.material && child.material.emissive) child.material.emissive.setHex(0x332200);
        });
    }

    function setCreationMode(active) {
        isCreationMode = active;
        characterMeshes.forEach(m => m.visible = !active);

        Object.keys(classCreationMeshes).forEach(key => {
            classCreationMeshes[key].visible = active;
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
        const nameEl = document.getElementById('char-display-name');
        if (nameEl) nameEl.innerText = `CLASE: ${targetClass.name.toUpperCase()}`;
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
