const CharacterCreator = {
    renderer: null, scene: null, camera: null, mesh: null,
    savedCharacters: [
        { name: "BARBARO_KOR", color: "#ff4444" },
        { name: "SORCERER_MU", color: "#4488ff" }
    ],
    currentIndex: 0,
    isCreatingNew: false,
    availableSkins: ["#ff4444", "#4488ff", "#44ff44", "#ffaa00", "#ffffff", "#8844ff"],
    currentSkinIndex: 0,

    init() {
        const canvas = document.getElementById('charCanvas');
        if (!canvas) return;

        // 1. Crear Escena con Fondo Gris Industrial Claro para comprobar que exista
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x222225); 

        // 2. Configuración de Cámara Frontal Fija
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(0, 0, 4); 
        this.camera.lookAt(0, 0, 0);

        // 3. Inicializar Renderizador
        if (!this.renderer) {
            this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        }
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // 4. Crear Personaje (Cápsula autoiluminada)
        if (this.mesh) this.scene.remove(this.mesh);
        
        const geo = new THREE.CylinderGeometry(0.4, 0.4, 1.8, 16);
        const mat = new THREE.MeshBasicMaterial({ color: 0xff4444 }); 
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.position.set(0, 0, 0); 
        this.scene.add(this.mesh);

        // Ajustes de los páneles de la interfaz
        this.isCreatingNew = false;
        document.getElementById('panel-right-creator').style.display = "none";
        document.getElementById('btn-trigger-creator').style.display = "block";
        document.querySelectorAll('.btn-arrow').forEach(b => b.style.display = "none");
        
        this.renderAccountCharacters();
        this.selectCharacter(0);

        // Renderizado inicial forzado
        this.renderer.render(this.scene, this.camera);

        // Loop de animación
        this.animate();
    },

    renderAccountCharacters() {
        const container = document.getElementById('account-characters');
        if (!container) return;
        container.innerHTML = "";
        
        this.savedCharacters.forEach((char, index) => {
            const slot = document.createElement('div');
            slot.className = `char-slot ${index === this.currentIndex && !this.isCreatingNew ? 'selected' : ''}`;
            slot.innerText = char.name;
            slot.onclick = () => { if (!this.isCreatingNew) this.selectCharacter(index); };
            container.appendChild(slot);
        });
    },

    selectCharacter(index) {
        if (this.savedCharacters.length === 0) return;
        this.currentIndex = index;
        this.isCreatingNew = false;
        this.renderAccountCharacters();

        const char = this.savedCharacters[index];
        document.getElementById('ui-current-name').innerText = char.name;
        if (this.mesh) this.mesh.material.color.set(char.color);
        document.getElementById('btn-enter-world').style.display = "block";
    },

    openCreatorMode() {
        this.isCreatingNew = true;
        document.getElementById('panel-right-creator').style.display = "block";
        document.getElementById('btn-trigger-creator').style.display = "none";
        document.getElementById('ui-current-name').innerText = "FORJANDO NUEVO HÉROE";
        document.getElementById('btn-enter-world').style.display = "none";
        document.querySelectorAll('.btn-arrow').forEach(b => b.style.display = "block"); 
        
        this.currentSkinIndex = 0;
        this.updateMeshSkin();
    },

    nextSkin(direction) {
        if (!this.isCreatingNew) return;
        this.currentSkinIndex += direction;
        if (this.currentSkinIndex >= this.availableSkins.length) this.currentSkinIndex = 0;
        if (this.currentSkinIndex < 0) this.currentSkinIndex = this.availableSkins.length - 1;
        this.updateMeshSkin();
    },

    updateMeshSkin() {
        if (this.mesh) {
            this.mesh.material.color.set(this.availableSkins[this.currentSkinIndex]);
        }
    },

    cancelCreatorMode() {
        // Ejecuta la limpieza volviendo al estado base
        this.init();
    },

    saveNewCharacter() {
        const name = document.getElementById('char-name').value.trim().toUpperCase();
        const color = this.availableSkins[this.currentSkinIndex];
        if (!name) { alert("¡Ponle un nombre!"); return; }
        this.savedCharacters.push({ name, color });
        this.init();
        this.selectCharacter(this.savedCharacters.length - 1);
    },

    getSelectedCharacter() {
        return this.savedCharacters[this.currentIndex] || { name: "DESCONOCIDO", color: "#ffffff" };
    },

    animate() {
        requestAnimationFrame(() => this.animate());
        if (this.mesh) this.mesh.rotation.y += 0.01; 
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
};
