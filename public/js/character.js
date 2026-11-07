// Motor 3D de Selección y Creación - Limpieza de Escena y Control Estricto de Visibilidad
const CharacterModule = (() => {
    let scene, camera, renderer;
    let characterMeshes = []; 
    let classCreationMeshes = {}; 
    let isCreationMode = false;
    let currentClassIndex = 0;
    let currentUserCharIndex = 0;

    const classes = [
        { id: 'guerrero', name: 'Guerrero', color: 0xff0033, radius: 0.32, height: 1.1, stats: { str: 15, def: 12, spd: 8, agi: 7, mana: 5 } },
        { id: 'mago', name: 'Mago', color: 0x0088ff, radius: 0.28, height: 1.15, stats: { str: 5, def: 6, spd: 10, agi: 8, mana: 20 } },
        { id: 'arquero', name: 'Arquero', color: 0x00ff66, radius: 0.26, height: 1.12, stats: { str: 8, def: 8, spd: 14, agi: 15, mana: 10 } }
    ];

    function init3D() {
        const canvas = document.getElementById('characterCanvas');
        if (!canvas) return;

        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x000000, 0.08);

        camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 2.7, 4.2);
        camera.lookAt(0, 1.2, 0);

        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const spotLight = new THREE.SpotLight(0xffd700, 2.2);
        spotLight.position.set(0, 7, 4);
        scene.add(spotLight);

        // Pedestal Central
        const floorGeo = new THREE.CylinderGeometry(2.2, 2.2, 0.2, 32);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.6 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.y = 0.5;
        scene.add(floor);

        // Mallas para creación de clases (Inicialmente ocultas)
        classes.forEach((c) => {
            const group = createCharacterMesh(c.color, `${c.name.toUpperCase()}`, c.radius, c.height);
            group.position.set(0, 0.6, 0);
            group.visible = false;
            scene.add(group);
            classCreationMeshes[c.id] = group;
        });

        canvas.addEventListener('click', onCanvasClick);
        window.addEventListener('resize', onWindowResize);
        animate();
    }

    function createCharacterMesh(colorHex, labelText, radius = 0.3, height = 1.1) {
        const group = new THREE.Group();
        
        const bodyGeo = new THREE.CylinderGeometry(radius, radius, height, 16);
        const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.4 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = height / 2;
        group.add(body);

        const headGeo = new THREE.SphereGeometry(0.2, 16, 16);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xffd700 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = height + 0.22;
        group.add(head);

        // Posicionar sprite para evitar superposición con el texto de la clase
        const labelSprite = createTransparentTextSprite(labelText);
        labelSprite.position.set(0, height + 0.6, 0);
        group.add(labelSprite);

        return group;
    }

    function createTransparentTextSprite(text) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 128;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.font = 'bold 34px "Courier New", monospace';
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

    function calculateFinalStats(baseStats, level = 1, equipment = {}, statusEffects = []) {
        let stats = {
            str: baseStats.str + (level - 1) * 2,
            def: baseStats.def + (level - 1) * 1.5,
            spd: baseStats.spd + (level - 1) * 1,
            agi: baseStats.agi + (level - 1) * 1.2,
            mana: baseStats.mana + (level - 1) * 2
        };

        if (equipment) {
            if (equipment.str) stats.str += equipment.str;
            if (equipment.def) stats.def += equipment.def;
            if (equipment.spd) stats.spd += equipment.spd;
            if (equipment.agi) stats.agi += equipment.agi;
            if (equipment.mana) stats.mana += equipment.mana;
        }

        if (Array.isArray(statusEffects)) {
            statusEffects.forEach(effect => {
                if (effect.type === 'buff_str') stats.str += effect.value;
                if (effect.type === 'buff_def') stats.def += effect.value;
            });
        }

        return {
            str: Math.round(stats.str),
            def: Math.round(stats.def),
            spd: Math.round(stats.spd),
            agi: Math.round(stats.agi),
            mana: Math.round(stats.mana)
        };
    }

    // Remueve y destruye de forma segura mallas anteriores para evitar solapamientos 3D
    function renderUserCharacters3D(characterList) {
        characterMeshes.forEach(m => scene.remove(m));
        characterMeshes = [];

        if (isCreationMode) return;

        characterList.forEach((char) => {
            const classConfig = classes.find(c => c.id === char.classType) || classes[0];
            const meshGroup = createCharacterMesh(classConfig.color, `${char.name} (Lv.${char.level || 1})`, classConfig.radius, classConfig.height);
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

    function showUserCharacter(index) {
        if (characterMeshes.length === 0) return;
        currentUserCharIndex = (index + characterMeshes.length) % characterMeshes.length;
        
        // Garantizar que solo un personaje sea visible a la vez
        characterMeshes.forEach((m, idx) => {
            m.visible = (idx === currentUserCharIndex && !isCreationMode);
        });

        const activeChar = characterMeshes[currentUserCharIndex].userData;
        if (activeChar && !isCreationMode) {
            const baseClass = classes.find(c => c.id === activeChar.classType) || classes[0];
            const finalStats = calculateFinalStats(baseClass.stats, activeChar.level || 1, activeChar.equipment, activeChar.statusEffects);
            
            const strEl = document.getElementById('stat-str');
            if (strEl) {
                document.getElementById('stat-str').innerText = finalStats.str;
                document.getElementById('stat-def').innerText = finalStats.def;
                document.getElementById('stat-spd').innerText = finalStats.spd;
                document.getElementById('stat-agi').innerText = finalStats.agi;
                document.getElementById('stat-mana').innerText = finalStats.mana;
            }
        }

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

        // Ocultar mallas de personajes existentes si entramos a modo creación
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
            // Ocultar mallas de clase al salir de modo creación
            Object.keys(classCreationMeshes).forEach(k => classCreationMeshes[k].visible = false);
            camera.position.set(0, 2.2, 5.2);
            camera.lookAt(0, 1.0, 0);
            if (characterMeshes.length > 0) showUserCharacter(currentUserCharIndex);
        }
    }

    function focusClass(index) {
        currentClassIndex = (index + classes.length) % classes.length;
        const targetClass = classes[currentClassIndex];
        
        Object.keys(classCreationMeshes).forEach(key => {
            classCreationMeshes[key].visible = (key === targetClass.id && isCreationMode);
        });

        const nameEl = document.getElementById('char-display-name');
        if (nameEl) nameEl.innerText = `CLASE: ${targetClass.name.toUpperCase()}`;

        const finalStats = calculateFinalStats(targetClass.stats, 1, {}, []);
        document.getElementById('stat-str').innerText = finalStats.str;
        document.getElementById('stat-def').innerText = finalStats.def;
        document.getElementById('stat-spd').innerText = finalStats.spd;
        document.getElementById('stat-agi').innerText = finalStats.agi;
        document.getElementById('stat-mana').innerText = finalStats.mana;

        return targetClass;
    }

    function animate() {
        requestAnimationFrame(animate);
        if (!isCreationMode) {
            characterMeshes.forEach(m => { if(m.visible) m.rotation.y += 0.008; });
        } else {
            Object.keys(classCreationMeshes).forEach(k => {
                if (classCreationMeshes[k].visible) classCreationMeshes[k].rotation.y += 0.01;
            });
        }
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
        calculateFinalStats,
        getCurrentClass: () => classes[currentClassIndex],
        getSelectedCharacter: () => characterMeshes[currentUserCharIndex] ? characterMeshes[currentUserCharIndex].userData : null,
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
