const Game = {
    socket: null, scene: null, camera: null, renderer: null,
    localPlayer: { mesh: null, speed: 0.05, wood: 100, name: 'Héroe', level: 1, classType: 'guerrero', color: 0xff0033 },
    remotePlayers: {},
    keys: {},
    isGameRunning: false,

    start(characterData) {
        if (characterData) {
            this.localPlayer.name = characterData.name || 'Héroe';
            this.localPlayer.level = characterData.level || 1;
            this.localPlayer.classType = characterData.classType || 'guerrero';
            
            if (characterData.classType === 'mago') this.localPlayer.color = 0x0088ff;
            else if (characterData.classType === 'arquero') this.localPlayer.color = 0x00ff66;
            else this.localPlayer.color = 0xff0033;
        }

        if (typeof App !== 'undefined' && typeof App.changeScreen === 'function') {
            App.changeScreen('screen-game');
        } else {
            const loginScreen = document.getElementById('screen-login');
            const charScreen = document.getElementById('screen-character');
            const gameScreen = document.getElementById('screen-game');
            if (loginScreen) loginScreen.classList.remove('active');
            if (charScreen) charScreen.classList.remove('active');
            if (gameScreen) gameScreen.classList.add('active');
        }

        this.initEngine();
        this.connectServer();
        this.isGameRunning = true;
        this.loop();
    },

    initEngine() {
        const canvas = document.getElementById('mapCanvas');
        if (!canvas) return;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050510);
        this.scene.fog = new THREE.FogExp2(0x050510, 0.03);

        this.camera = new THREE.PerspectiveCamera(60, 800 / 600, 0.1, 1000);

        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.renderer.setSize(800, 600);

        // Iluminación
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const sun = new THREE.DirectionalLight(0xffd700, 1.2);
        sun.position.set(10, 20, 10);
        this.scene.add(sun);

        // --- CREAR EL PLANETA ESFÉRICO ---
        WorldModule.createPlanet(this.scene, { color: 0x1a4314, treeCount: 40, rockCount: 20 });

        // Crear malla del jugador local con el avatar detallado y el color asignado
        this.localPlayer.mesh = this.createPlayerAvatar(this.localPlayer.classType, this.localPlayer.color);
        this.scene.add(this.localPlayer.mesh);

        const hudName = document.getElementById('hud-char-name');
        if (hudName) hudName.innerText = `${this.localPlayer.name} (Lv.${this.localPlayer.level})`;

        window.addEventListener('keydown', e => this.keys[e.code] = true);
        window.addEventListener('keyup', e => this.keys[e.code] = false);

        canvas.addEventListener('contextmenu', e => e.preventDefault());
        canvas.addEventListener('mousedown', e => this.handleBuildClick(e));
    },

    createPlayerAvatar(classType, customColor) {
        const group = new THREE.Group();

        // Cuerpo (Cilindro)
        const bodyGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.6, 8);
        const bodyMat = new THREE.MeshStandardMaterial({ color: customColor, roughness: 0.4 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.3;
        group.add(body);

        // Cabeza (Esfera)
        const headGeo = new THREE.SphereGeometry(0.12, 8, 8);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.3 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 0.7;
        group.add(head);

        // Visor / Parte frontal de la cara (Color diferente para indicar hacia dónde mira)
        const faceGeo = new THREE.BoxGeometry(0.14, 0.06, 0.05);
        const faceMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2, metalness: 0.8 });
        const face = new THREE.Mesh(faceGeo, faceMat);
        face.position.set(0, 0.7, 0.1); // Posicionado al frente (+Z local)
        group.add(face);

        return group;
    },

    connectServer() {
        this.socket = io();
        this.socket.on('initWorld', (data) => {
            const woodEl = document.getElementById('ui-wood');
            if (woodEl) woodEl.innerText = this.localPlayer.wood;
        });
    },

    handleBuildClick(e) {
        if (e.button === 0) {
            const depth = e.shiftKey ? -1 : 0;
        }
    },

    loop() {
        if (!this.isGameRunning) return;
        requestAnimationFrame(() => this.loop());

        if (this.localPlayer.mesh) {
            const playerInfo = WorldModule.updatePlayerOnSphere(this.localPlayer.mesh, this.keys);

            // --- VISTA CERCANA Y FLUIDA (ESTILO ACCIÓN / TERCERA PERSONA) ---
            const playerPos = playerInfo.position;
            const normal = playerPos.clone().normalize(); // Dirección radial desde el núcleo

            // Distancia y altura equilibradas para ver perfectamente al personaje y el terreno cercano
            const distanceBack = 3.2; 
            const heightUp = 1.4;     

            const camTargetPos = playerPos.clone()
                .add(normal.clone().multiplyScalar(heightUp))
                .add(playerPos.clone().normalize().multiplyScalar(-distanceBack));

            // Suavizado dinámico fluido para seguir los pasos del héroe sin tirones
            this.camera.position.lerp(camTargetPos, 0.2);
            
            // Apuntar ligeramente por encima de los pies para centrar el cuerpo en pantalla
            const lookTarget = playerPos.clone().add(normal.clone().multiplyScalar(0.4));
            this.camera.lookAt(lookTarget);
        }

        WorldModule.rotatePlanet();
        this.renderer.render(this.scene, this.camera);
    }
};

window.GameModule = Game;
