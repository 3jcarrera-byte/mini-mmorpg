// Módulo Modularizado de Rocas (RockObject)
const RockObject = (() => {

    function create(position) {
        const group = new THREE.Group();
        const rockMat = new THREE.MeshStandardMaterial({ 
            color: 0x7a7a7a, 
            roughness: 0.85, 
            flatShading: true 
        });
        
        // Roca principal (Dodecaedro escalado)
        const mainGeo = new THREE.DodecahedronGeometry(0.22, 0);
        const mainRock = new THREE.Mesh(mainGeo, rockMat);
        mainRock.scale.set(1.2, 0.8, 1.0);
        mainRock.position.y = 0.12;
        group.add(mainRock);

        // Roca secundaria decorativa para dar relieve orgánico
        const smallGeo = new THREE.DodecahedronGeometry(0.12, 0);
        const smallRock = new THREE.Mesh(smallGeo, rockMat);
        smallRock.position.set(0.15, 0.06, 0.1);
        group.add(smallRock);

        // Posicionar en la superficie
        group.position.copy(position);

        // Orientación correcta hacia afuera usando la normal de la esfera
        const normal = position.clone().normalize();
        group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);

        // Desplazamiento leve para asegurar que no se hundan
        group.position.addScaledVector(normal, 0.02);

        // Referencia de colisión configurable
        const colliderRef = {
            position: group.position.clone(),
            radius: 0.12,
            height: 0.25,
            active: true // 🌟 Control interno de colisión activa
        };

        const rockEntity = {
            mesh: group,
            collider: colliderRef,
            resourceType: 'stone',
            resourceAmount: 20,
            isReady: true,       // Estado visible y recolectable
            respawnTimer: 0,     // Temporizador de reaparición

            // Método update requerido por el bucle del ecosistema
            update(delta, scene, obstaclesList, allObjectsList) {
                if (!this.isReady) {
                    this.respawnTimer -= delta;
                    if (this.respawnTimer <= 0) {
                        this.respawn();
                    }
                }
            },

            // Método de minado / recolección
            mine() {
                if (!this.isReady) return 0;
                
                this.isReady = false;
                this.respawnTimer = 60.0; // 🌟 1 minuto exacto para reponerse
                
                // Ocultar malla y desactivar colisión
                group.visible = false;
                this.collider.active = false;
                
                return this.resourceAmount;
            },

            // Método de reaparición
            respawn() {
                this.isReady = true;
                this.respawnTimer = 0;
                
                // Mostrar malla y reactivar colisión
                group.visible = true;
                this.collider.active = true;
            }
        };

        return rockEntity;
    }

    return {
        create
    };
})();

window.RockObject = RockObject;
