// Motor 3D de Selección y Creación con Posicionamiento Elevado
const CharacterModule = (() => {
    let scene, camera, renderer;
    let characterMeshes = []; 
    let classCreationMeshes = {}; 
    let selectedCharacterData = null;
    let isCreationMode = false;
    let raycaster = new THREE.Raycaster();
    let mouse = new THREE.Vector2();
    let currentClassIndex = 0;

    const classes = [
        { id: 'guerrero', name: 'Guerrero', color: 0xff0033, stats: { str: 15, def: 12, spd: 8, agi: 7, mana: 5 } },
        { id: 'mago', name: 'Mago', color: 0x0088ff, stats: { str: 5, def: 6, spd: 10, agi: 8, mana: 20 } },
        { id: 'arquero', name: 'Arquero', color: 0x00ff66, stats: { str: 8, def: 8, spd: 14, agi: 15, mana: 10 } }
    ];

    function init3D() {
        const canvas = document.getElementById('characterCanvas');
        if (!canvas) return;

        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x000000, 0.08);

        // Cámara posicionada y apuntando más arriba para centrar el modelo en el canvas
        camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 2.7, 4.2);
        camera.lookAt(0, 1.2, 0);

        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);

        // Luces
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const spotLight = new THREE.SpotLight(0xffd700, 2.2);
        spotLight.position.set(0, 7, 4);
        scene.add(spotLight);

        // Suelo / Pedestal Central Elevado
        const floorGeo = new THREE.CylinderGeometry(2.2, 2.2, 0.2, 32);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.6 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.y = 0.5;
        scene.add(floor);

        // Mallas de clase en el centro elevado
        classes.forEach((c) => {
            const group = createCharacterMesh(c.color, `${c.name.toUpperCase()}`);
            group.position.set(0, 1.0, 0);
            group.visible = false;
            scene.add(group);
            classCreationMeshes[c.id] = group;
        });

        canvas.addEventListener('click', onCanvasClick);
        window.addEventListener('resize', onWindowResize);
        animate();
    }

    function createCharacterMesh(colorHex, labelText) {
        const group = new THREE.Group();
        
        const bodyGeo = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 16);
        const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.4 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.6;
        group.add(body);

        const headGeo = new THREE.SphereGeometry(0.22, 16, 16);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xffd700 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.4;
        group.add(head);

        const labelSprite = createTransparentTextSprite(labelText);
        labelSprite.position.set(0, 1.95, 0);
        group.add(labelSprite);

        return group;
    }

    function createTransparentTextSprite(text) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 128;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.font = 'bold 36px "Courier New", monospace';
        ctx.fillStyle = '#ffd700';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 8;
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(1.8, 0.45, 1);
        return sprite;
    }

    function renderUserCharacters3D(characterList) {
        characterMeshes.forEach(m => scene.remove(m));
        characterMeshes = [];

        if (isCreationMode) return;

        characterList.forEach((char) => {
            const classColor = char.classType === 'mago' ? 0x0088ff : (char.classType === 'arquero' ? 0x00ff66 : 0xff0033);
            const meshGroup = createCharacterMesh(classColor, `${char.name} (Lv.${char.level || 1})`);
            meshGroup.position.set(0, 0.6, 0);
            meshGroup.userData = char; 
            meshGroup.visible = false;

            scene.add(meshGroup);
            characterMeshes.push(meshGroup);
        });

        if (characterMeshes.length > 0) {
            showUserCharacter(0);
        }
    }

    let currentUserCharIndex = 0;
    function showUserCharacter(index) {
        if (characterMeshes.length === 0) return;
        currentUserCharIndex = (index + characterMeshes.length) % characterMeshes.length;
        
        characterMeshes.forEach((m, idx) => {
            m.visible = (idx === currentUserCharIndex);
        });

        const activeChar = characterMeshes[currentUserCharIndex].userData;
        if (window.onCharacter3DSelected) {
            window.onCharacter3DSelected(activeChar);
        }
    }

    function onCanvasClick(event) {
        if (isCreationMode) return;
        if (characterMeshes.length > 1) {
            showUserCharacter(currentUserCharIndex + 1);
        }
    }

    function setCreationMode(active) {
        isCreationMode = active;
        characterMeshes.forEach(m => m.visible = false);

        const topName = document.getElementById('panel-top-name');
        const arrowLeft = document.getElementById('btn-arrow-left');
        const arrowRight = document.getElementById('btn-arrow-right');
        const attributesPanel = document.getElementById('panel-attributes');
        const instruction = document.getElementById('panel-instruction');

        if (topName) topName.style.display = active ? 'block' : 'none';
        if (arrowLeft) arrowLeft.style.display = active ? 'block' : 'none';
        if (arrowRight) arrowRight.style.display = active ? 'block' : 'none';
        if (attributesPanel) attributesPanel.style.display = active ? 'flex' : 'none';
        if (instruction) instruction.innerText = active ? 'SELECCIONA TU CLASE' : 'HAZ CLIC PARA CAMBIAR HÉROE';

        if (active) {
            camera.position.set(0, 2.7, 4.2);
            camera.lookAt(0, 1.2, 0);
            focusClass(0);
        } else {
            camera.position.set(0, 2.2, 5.2);
            camera.lookAt(0, 1.0, 0);
            if (characterMeshes.length > 0) showUserCharacter(0);
        }
    }

    function focusClass(index) {
        currentClassIndex = (index + classes.length) % classes.length;
        const targetClass = classes[currentClassIndex];
        
        Object.keys(classCreationMeshes).forEach(key => {
            classCreationMeshes[key].visible = (key === targetClass.id);
        });

        const nameEl = document.getElementById('char-display-name');
        if (nameEl) nameEl.innerText = `CLASE: ${targetClass.name.toUpperCase()}`;

        document.getElementById('stat-str').innerText = targetClass.stats.str;
        document.getElementById('stat-def').innerText = targetClass.stats.def;
        document.getElementById('stat-spd').innerText = targetClass.stats.spd;
        document.getElementById('stat-agi').innerText = targetClass.stats.agi;
        document.getElementById('stat-mana').innerText = targetClass.stats.mana;

        return targetClass;
    }

    function animate() {
        requestAnimationFrame(animate);
        characterMeshes.forEach(m => { if(m.visible) m.rotation.y += 0.008; });
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

    return {
        init3D,
        renderUserCharacters3D,
        setCreationMode,
        getCurrentClass: () => classes[currentClassIndex],
        nextClass: () => {
            if (isCreationMode) focusClass(currentClassIndex + 1);
            else showUserCharacter(currentUserCharIndex + 1);
        },
        prevClass: () => {
            if (isCreationMode) focusClass(currentClassIndex - 1);
            else showUserCharacter(currentUserCharIndex - 1);
        }
    };
})();
