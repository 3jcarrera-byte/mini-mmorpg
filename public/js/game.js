const Game = {
    socket: null, scene: null, camera: null, renderer: null,
    localPlayer: { 
        mesh: null, 
        speed: 0.05, 
        wood: 100, 
        name: 'Héroe', 
        level: 1, 
        classType: 'guerrero', 
        color: 0xff0033,
        theta: 0, 
        phi: Math.PI / 2, 
        heading: 0 
    },
    remotePlayers: {},
    keys: {},
    isGameRunning: false,
    planetRadius: 5.0,

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
        if (typeof WorldModule.getRadius === 'function') {
            this.planetRadius = WorldModule.getRadius();
        }

        // Posición inicial sobre la esfera
        this.localPlayer.theta = 0;
        this.localPlayer.phi = 0.3;
        this.localPlayer.heading = 0;

        // Crear malla del jugador local
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

        // Visor frontal (Indica hacia dónde mira)
        const faceGeo = new THREE.BoxGeometry(0.14, 0.06, 0.05);
        const faceMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2, metalness: 0.8 });
        const face = new THREE.Mesh(faceGeo, faceMat);
        face.position.set(0, 0.7, 0.12);
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
            const p = this.localPlayer;
            const turnSpeed = 0.05;

            // Giro libre de 360° con flechas izquierda/derecha o A/D para girar la vista
            if (this.keys['ArrowLeft'] || this.keys['KeyA']) p.heading += turnSpeed;
            if (this.keys['ArrowRight'] || this.keys['KeyD']) p.heading -= turnSpeed;

            // Movimiento hacia adelante (W) y hacia atrás (S) basado en la dirección a la que apunta el visor
            let moveDir = 0;
            if (this.keys['KeyW'] || this.keys['ArrowUp']) moveDir += p.speed;
            if (this.keys['KeyS'] || this.keys['ArrowDown']) moveDir -= p.speed;

            if (moveDir !== 0) {
                const R = this.planetRadius;
                // Desplazamiento esférico alineado con el heading actual del personaje
                const deltaTheta = (moveDir * Math.sin(p.heading)) / R;
                const deltaPhi   = (-moveDir * Math.cos(p.heading)) / R;

                p.theta += deltaTheta;
                p.phi += deltaPhi;

                // Limitar phi para no voltear el mundo en los polos
                p.phi = Math.max(0.05, Math.min(Math.PI - 0.05, p.phi));
            }

            // Calcular posición cartesiana 3D del personaje sobre la esfera
            const R = this.planetRadius;
            const x = R * Math.sin(p.phi) * Math.sin(p.theta);
            const y = R * Math.cos(p.phi);
            const z = R * Math.sin(p.phi) * Math.cos(p.theta);

            p.mesh.position.set(x, y, z);

            // Orientación y alineación perfecta de la malla sobre la superficie curva del planeta
            const normal = p.mesh.position.clone().normalize();
            let tangent = new THREE.Vector3(-Math.cos(p.heading), 0, Math.sin(p.heading));
            tangent.addScaledVector(normal, -tangent.dot(normal)).normalize();

            if (tangent.lengthSq() < 0.001) {
                tangent.set(0, 0, 1);
                tangent.addScaledVector(normal, -tangent.dot(normal)).normalize();
            }

            const binormal = new THREE.Vector3().crossVectors(normal, tangent).normalize();
            const rotMatrix = new THREE.Matrix4().makeBasis(binormal, normal, tangent);
            p.mesh.quaternion.setFromRotationMatrix(rotMatrix);

            if (moveDir !== 0 && this.socket) {
                this.socket.emit('playerMove', { x, y, z });
            }

            // --- CÁMARA TERCERA PERSONA (ÁNGULO 45° A ~5 METROS DETRÁS DE LA ESPALDA) ---
            const distanceBack = 3.8;  // Distancia aproximada hacia atrás
            const heightUp = 2.5;      // Altura para lograr el ángulo de ~45 grados

            // Vector dirección hacia atrás basado en el heading del personaje
            const backwardDir = new THREE.Vector3(-Math.sin(p.heading), 0, Math.cos(p.heading)).normalize();
            backwardDir.addScaledVector(normal, -backwardDir.dot(normal)).normalize();

            // Posición ideal de la cámara
            const targetCamPos = p.mesh.position.clone()
                .add(normal.clone().multiplyScalar(heightUp))
                .add(backwardDir.multiplyScalar(distanceBack));

            // Suavizado fluido de la cámara al seguir al personaje
            this.camera.position.lerp(targetCamPos, 0.2);

            // La cámara apunta hacia el personaje (llevando la mirada un poco más arriba de sus pies)
            const lookTarget = p.mesh.position.clone().add(normal.clone().multiplyScalar(0.5));
            this.camera.lookAt(lookTarget);
        }

        if (typeof WorldModule.rotatePlanet === 'function') {
            WorldModule.rotatePlanet();
        }
        this.renderer.render(this.scene, this.camera);
    }
};

window.GameModule = Game;
