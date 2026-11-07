// public/js/objects/rock.js
const RockObject = {
    create(position) {
        const group = new THREE.Group();

        const rockMat = new THREE.MeshStandardMaterial({ color: 0x7a7a7a, roughness: 0.85, flatShading: true });
        
        // Roca principal central
        const mainGeo = new THREE.DodecahedronGeometry(0.22, 0);
        const mainRock = new THREE.Mesh(mainGeo, rockMat);
        mainRock.scale.set(1.2, 0.8, 1.0);
        mainRock.position.y = 0.12;
        mainRock.rotation.set(Math.random(), Math.random(), 0);
        group.add(mainRock);

        // Roca secundaria adosada para romper la simetría
        const smallGeo = new THREE.DodecahedronGeometry(0.12, 0);
        const smallRock = new THREE.Mesh(smallGeo, rockMat);
        smallRock.position.set(0.15, 0.06, 0.1);
        smallRock.rotation.set(Math.random(), Math.random(), 0);
        group.add(smallRock);

        // Orientación sobre la esfera del planeta
        group.position.copy(position);
        group.lookAt(0, 0, 0);
        group.rotateX(Math.PI / 2);
        group.position.addScaledVector(group.position.clone().normalize(), 0.04);

        return {
            mesh: group,
            collider: {
                position: group.position.clone(),
                radius: 0.25, // Radio de colisión ajustado al cúmulo rocoso
                height: 0.35
            },
            resourceType: 'stone',
            resourceAmount: 20
        };
    }
};

window.RockObject = RockObject;
