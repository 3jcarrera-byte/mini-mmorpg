// public/js/objects/tree.js
const TreeObject = {
    create(position) {
        const group = new THREE.Group();
        
        // Tronco principal
        const trunkGeo = new THREE.CylinderGeometry(0.06, 0.1, 0.45, 6);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9, flatShading: true });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 0.22;
        group.add(trunk);

        // Copas de follaje multicapa (efecto pino / árbol frondoso low-poly)
        const leavesMat = new THREE.MeshStandardMaterial({ color: 0x2d8a39, roughness: 0.7, flatShading: true });
        
        const layer1 = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.45, 5), leavesMat);
        layer1.position.y = 0.45;
        group.add(layer1);

        const layer2 = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.35, 5), leavesMat);
        layer2.position.y = 0.7;
        group.add(layer2);

        const layer3 = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.25, 5), leavesMat);
        layer3.position.y = 0.9;
        group.add(layer3);

        // Orientación sobre la esfera del planeta
        group.position.copy(position);
        group.lookAt(0, 0, 0);
        group.rotateX(Math.PI / 2);
        group.position.addScaledVector(group.position.clone().normalize(), 0.05);

        return {
            mesh: group,
            collider: {
                position: group.position.clone(),
                radius: 0.22, // Radio de colisión optimizado al tronco
                height: 0.6
            },
            resourceType: 'wood',
            resourceAmount: 15
        };
    }
};

window.TreeObject = TreeObject;
