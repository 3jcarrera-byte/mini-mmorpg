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

        // 🌟 CORRECCIÓN DE ORIENTACIÓN: Alinear hacia afuera usando la normal de la esfera
        const normal = position.clone().normalize();
        group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);

        // Desplazamiento leve opcional para asegurar que no se hundan
        group.position.addScaledVector(normal, 0.02);

        const colliderRef = {
            position: group.position.clone(),
            radius: 0.22,
            height: 0.35
        };

        const rockEntity = {
            mesh: group,
            collider: colliderRef,
            resourceType: 'stone',
            resourceAmount: 20,
            health: 100,

            // Método update requerido por el bucle del ecosistema
            update(delta, scene, obstaclesList, allObjectsList) {
                // Las rocas no crecen ni se mueven de forma autónoma por defecto
            },

            // Método de minado / recolección
            mine() {
                if (this.health <= 0) return 0;
                this.health = 0;
                
                // Ocultar o reducir malla al ser minada por completo
                group.scale.set(0.1, 0.1, 0.1);
                this.collider.radius = 0.05;
                
                return this.resourceAmount;
            }
        };

        return rockEntity;
    }

    return {
        create
    };
})();

window.RockObject = RockObject;
