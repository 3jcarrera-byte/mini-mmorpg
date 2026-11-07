const RockObject = {
    create(position) {
        const rockGeo = new THREE.DodecahedronGeometry(0.2, 1);
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x666666, flatShading: true });
        const mesh = new THREE.Mesh(rockGeo, rockMat);

        mesh.position.copy(position);
        mesh.lookAt(0, 0, 0);
        mesh.rotateX(Math.PI / 2);
        mesh.position.addScaledVector(mesh.position.clone().normalize(), 0.05);

        return {
            mesh: mesh,
            collider: {
                position: mesh.position.clone(),
                radius: 0.1,
                height: 0.2
            },
            resourceType: 'stone',
            resourceAmount: 15
        };
    }
};

window.RockObject = RockObject;
