const TreeObject = {
    create(position) {
        const group = new THREE.Group();
        
        // Tronco y follaje
        const trunkGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.4, 5);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, flatShading: true });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 0.2;
        group.add(trunk);

        const leavesGeo = new THREE.ConeGeometry(0.25, 0.6, 5);
        const leavesMat = new THREE.MeshStandardMaterial({ color: 0x0b6623, flatShading: true });
        const leaves = new THREE.Mesh(leavesGeo, leavesMat);
        leaves.position.y = 0.5;
        group.add(leaves);

        group.position.copy(position);
        group.lookAt(0, 0, 0);
        group.rotateX(Math.PI / 2);
        
        // Elevar levemente para alinear con la superficie
        group.position.addScaledVector(group.position.clone().normalize(), 0.05);

        return {
            mesh: group,
            collider: {
                position: group.position.clone(),
                radius: 0.18, // Radio compacto
                height: 0.5
            },
            resourceType: 'wood',
            resourceAmount: 10
        };
    }
};

window.TreeObject = TreeObject;
