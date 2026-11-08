// Módulo Simplificado de Árboles (TreeObject) - Solo Árbol Adulto
const TreeObject = (() => {

    function create(position) {
        const group = new THREE.Group();
        
        // 1. Tronco cilíndrico
        const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 0.9, 8);
        const trunkMat = new THREE.MeshStandardMaterial({ 
            color: 0x6e473b, 
            roughness: 0.9, 
            flatShading: true 
        });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 0.45;
        group.add(trunk);

        // 2. Capas de follaje (Pino estilizado)
        const leavesMat = new THREE.MeshStandardMaterial({ 
            color: 0x2ecc71, 
            roughness: 0.6, 
            flatShading: true 
        });
        
        const layer1 = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.9, 6), leavesMat);
        layer1.position.y = 0.9;
        group.add(layer1);

        const layer2 = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.7, 6), leavesMat);
        layer2.position.y = 1.4;
        group.add(layer2);

        const layer3 = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.5, 6), leavesMat);
        layer3.position.y = 1.8;
        group.add(layer3);

        // Alinear a la superficie esférica del planeta
        group.position.copy(position);
        group.lookAt(0, 0, 0);
        group.rotateX(Math.PI / 2);
        group.position.addScaledVector(group.position.clone().normalize(), 0.05);

        const colliderRef = {
            position: group.position.clone(),
            radius: 0.35,
            height: 1.2
        };

        const treeEntity = {
            mesh: group,
            collider: colliderRef,
            resourceType: 'wood',
            resourceAmount: 25,
            state: 'adult',
            health: 100,

            // Método update de relleno para que el bucle del ecosistema no falle
            update(delta, scene, obstaclesList, allObjectsList) {
                // Sin cambios por ahora
            },

            chopDown() {
                // Reducir escala visual al talar
                group.scale.set(1, 0.2, 1);
                this.collider.radius = 0.1;
            }
        };

        return treeEntity;
    }

    return {
        create
    };
})();

window.TreeObject = TreeObject;
