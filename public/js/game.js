const Game = {
    socket: null, scene: null, camera: null, renderer: null,
    localPlayer: { mesh: null, speed: 0.05, wood: 100, name: 'Héroe', level: 1 },
    remotePlayers: {},
    keys: {},
    isGameRunning: false,

    start(characterData) {
        if (characterData) {
            this.localPlayer.name = characterData.name || 'Héroe';
            this.localPlayer.level = characterData.level || 1;
        }
        App.changeScreen('screen-game');
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

        // --- CREAR EL PLANETA ESFÉRICO USANDO EL MÓDULO ---
        WorldModule.createPlanet(this.scene, { color: 0x1a4314, treeCount: 40, rockCount: 20 });

        // Crear malla del jugador local (Avatar 3D)
        const classType = (window.selectedCharacter && window.selectedCharacter.classType) || 'guerrero';
        this.localPlayer.mesh = this.createPlayerAvatar(classType);
        this.scene.add(this.localPlayer.mesh);

        // Eventos de teclado
        window.addEventListener('keydown', e => this.keys[e.code] = true);
        window.addEventListener('keyup', e => this.keys[e.code] = false);

        canvas.addEventListener('contextmenu', e => e.preventDefault());
        canvas.addEventListener('mousedown', e => this.handleBuildClick(e));
    },

    createPlayerAvatar(classType) {
        const group = new THREE.Group();
        let color = 0xff0033;
        if (classType === 'mago') color = 0x0088ff;
        if (classType === 'arquero') color = 0x00ff66;

        const body = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15, 0.15, 0.6, 8), 
            new THREE.MeshStandardMaterial({ color })
        );
        body.position.y = 0.3;
        group.add(body);

        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.12, 8, 8), 
            new THREE.MeshStandardMaterial({ color: 0xffd700 })
        );
        head.position.y = 0.7;
        group.add(head);

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
            // Clic izquierdo: construir en superficie o búnker subterráneo (Shift)
            const depth = e.shiftKey ? -1 : 0;
            // Aquí puedes disparar la construcción usando las coordenadas actuales del jugador desde WorldModule
        }
    },

    loop() {
        if (!this.isGameRunning) return;
        requestAnimationFrame(() => this.loop());

        if (this.localPlayer.mesh) {
            // Actualizar movimiento sobre la esfera usando el módulo externo
            const playerInfo = WorldModule.updatePlayerOnSphere(this.localPlayer.mesh, this.keys);

            // Posicionar la cámara orbital detrás del jugador siguiendo la curvatura del planeta
            const camOffset = playerInfo.position.clone().normalize().multiplyScalar(WorldModule.getRadius() + 3.5);
            this.camera.position.copy(camOffset).add(new THREE.Vector3(0, 1.5, 0));
            this.camera.lookAt(playerInfo.position);
        }

        WorldModule.rotatePlanet();
        this.renderer.render(this.scene, this.camera);
    }
};

window.GameModule = Game;
