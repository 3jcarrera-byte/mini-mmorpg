const Game = {
    socket: null, scene: null, camera: null, renderer: null,
    localPlayer: { mesh: null, speed: 0.15, wood: 100, name: 'Héroe', level: 0 },
    remotePlayers: {},
    structures: [],
    npcs: {}, // Almacena los monstruos controlados por el servidor
    gridSize: 3,
    buildMode: 'wood',
    keys: {},

    start(characterData) {
        if (characterData) {
            this.localPlayer.name = characterData.name || 'Héroe';
            this.localPlayer.level = characterData.level || 1;
        }
        App.changeScreen('screen-game');
        this.initEngine();
        
        // Asignar color si viene en el personaje seleccionado
        if (this.localPlayer.mesh && characterData && characterData.color) {
            this.localPlayer.mesh.material.color.set(characterData.color);
        }

        this.connectServer();
        this.loop();
    },

    initEngine() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x010101);

        this.camera = new THREE.PerspectiveCamera(60, 800 / 600, 0.1, 1000);
        this.camera.position.set(0, 12, 10);

        const canvas = document.getElementById('mapCanvas');
        if (!canvas) return;

        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.renderer.setSize(800, 600);

        this.scene.add(new THREE.AmbientLight(0xffffff, 0.4));
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(20, 40, 20);
        this.scene.add(dirLight);

        const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x111111 }));
        floor.rotation.x = -Math.PI / 2;
        this.scene.add(floor);

        const grid = new THREE.GridHelper(200, 200 / this.gridSize, 0x333333, 0x151515);
        grid.position.y = 0.02;
        this.scene.add(grid);

        // Crear malla del jugador local (Cápsula/Cilindro)
        this.localPlayer.mesh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.4, 0.4, 2.0, 16), 
            new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4 })
        );
        this.localPlayer.mesh.position.set(0, 1.0, 0);
        this.scene.add(this.localPlayer.mesh);

        // Añadir etiqueta de nombre y nivel sobre la cabeza del jugador local
        const localLabel = this.createTextSprite(`${this.localPlayer.name} (Lv.${this.localPlayer.level})`);
        localLabel.position.set(0, 1.4, 0);
        this.localPlayer.mesh.add(localLabel);

        window.addEventListener('keydown', e => this.keys[e.key.toLowerCase()] = true);
        window.addEventListener('keyup', e => this.keys[e.key.toLowerCase()] = false);
        canvas.addEventListener('contextmenu', e => e.preventDefault());
        canvas.addEventListener('mousedown', e => this.handleBuildClick(e));
    },

    // Utilidad para crear etiquetas de texto flotantes sobre la cabeza 3D
    createTextSprite(message) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;

        context.fillStyle = 'rgba(0, 0, 0, 0.6)';
        context.fillRect(0, 0, canvas.width, canvas.height);

        context.font = 'bold 24px "Courier New", monospace';
        context.fillStyle = '#ffd700';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(message, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(1.5, 0.4, 1);
        return sprite;
    },

    connectServer() {
        this.socket = io();

        this.socket.on('initWorld', (data) => {
            const woodEl = document.getElementById('ui-wood');
            if (woodEl) woodEl.innerText = this.localPlayer.wood;

            if (data.structures) data.structures.forEach(s => this.drawStructure(s));
            
            if (data.players) {
                Object.keys(data.players).forEach(id => {
                    if (id !== this.socket.id) this.addRemotePlayer(data.players[id]);
                });
            }

            if (data.npcs) {
                Object.keys(data.npcs).forEach(id => {
                    this.addNPC(data.npcs[id]);
                });
            }
        });

        this.socket.on('newPlayer', data => this.addRemotePlayer(data));
        
        this.socket.on('playerMoved', data => {
            if (this.remotePlayers[data.id]) {
                this.remotePlayers[data.id].position.set(data.x, 1.0, data.z);
            }
        });

        this.socket.on('npcMoved', data => {
            if (this.npcs[data.id]) {
                this.npcs[data.id].position.x = data.x;
                this.npcs[data.id].position.z = data.z;
            }
        });

        this.socket.on('structureBuilt', data => this.drawStructure(data));

        this.socket.on('playerDisconnected', id => {
            if (this.remotePlayers[id]) {
                this.scene.remove(this.remotePlayers[id]);
                delete this.remotePlayers[id];
            }
        });
    },

    addRemotePlayer(p) {
        const mesh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.4, 0.4, 2.0, 16), 
            new THREE.MeshStandardMaterial({ color: p.color || 0xffffff, roughness: 0.4 })
        );
        mesh.position.set(p.x, 1.0, p.z);
        
        // Etiqueta flotante para jugadores remotos
        const label = this.createTextSprite(`${p.name || 'Héroe'} (Lv.${p.level || 1})`);
        label.position.set(0, 1.4, 0);
        mesh.add(label);

        this.scene.add(mesh);
        this.remotePlayers[p.id] = mesh;
    },

    addNPC(npcData) {
        const mesh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.4, 0.4, 2.0, 16), 
            new THREE.MeshStandardMaterial({ color: npcData.color || 0x00ff00, roughness: 0.5 })
        );
        mesh.position.set(npcData.x, 1.0, npcData.z);
        this.scene.add(mesh);
        this.npcs[npcData.id] = mesh;
    },

    handleBuildClick(e) {
        if (e.button === 0) {
            if (this.localPlayer.wood >= 10) {
                const snapX = Math.round(this.localPlayer.mesh.position.x / this.gridSize) * this.gridSize;
                const snapZ = Math.round((this.localPlayer.mesh.position.z - this.gridSize) / this.gridSize) * this.gridSize;
                const count = this.structures.filter(s => s.x === snapX && s.z === snapZ).length;
                const snapY = (count * this.gridSize) + (this.gridSize / 2);

                this.socket.emit('buildStructure', { x: snapX, y: snapY, z: snapZ, type: this.buildMode });
                this.localPlayer.wood -= 10;
                const woodEl = document.getElementById('ui-wood');
                if (woodEl) woodEl.innerText = this.localPlayer.wood;
            }
        } else if (e.button === 2) {
            this.buildMode = this.buildMode === 'wood' ? 'stone' : 'wood';
            const buildEl = document.getElementById('ui-build');
            if (buildEl) buildEl.innerText = this.buildMode.toUpperCase();
        }
    },

    drawStructure(s) {
        const geo = new THREE.BoxGeometry(this.gridSize, this.gridSize, this.gridSize);
        const color = s.type === 'wood' ? 0x6e4720 : 0x444444;
        const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
        mesh.position.set(s.x, s.y, s.z);
        this.scene.add(mesh);
        this.structures.push({ x: s.x, z: s.z, mesh });
    },

    loop() {
        requestAnimationFrame(() => this.loop());
        if (!this.localPlayer.mesh) return;

        let moved = false;
        if (this.keys['w']) { this.localPlayer.mesh.position.z -= this.localPlayer.speed; moved = true; }
        if (this.keys['s']) { this.localPlayer.mesh.position.z += this.localPlayer.speed; moved = true; }
        if (this.keys['a']) { this.localPlayer.mesh.position.x -= this.localPlayer.speed; moved = true; }
        if (this.keys['d']) { this.localPlayer.mesh.position.x += this.localPlayer.speed; moved = true; }

        if (moved && this.socket) {
            this.socket.emit('playerMove', {
                x: this.localPlayer.mesh.position.x,
                y: this.localPlayer.mesh.position.y,
                z: this.localPlayer.mesh.position.z
            });
        }

        this.camera.position.x = this.localPlayer.mesh.position.x;
        this.camera.position.z = this.localPlayer.mesh.position.z + 10;
        this.camera.lookAt(this.localPlayer.mesh.position);

        this.renderer.render(this.scene, this.camera);
    }
};

window.GameModule = Game;
