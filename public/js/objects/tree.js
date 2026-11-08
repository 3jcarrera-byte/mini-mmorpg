// public/js/objects/tree.js
const TreeObject = {
    create(position, initialState = 'adult', initialProgress = 1.0) {
        const group = new THREE.Group();
        
        // Tronco
        const trunkGeo = new THREE.CylinderGeometry(0.06, 0.1, 0.45, 6);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9, flatShading: true });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 0.22;
        group.add(trunk);

        // Copas en capas (estilo pino estilizado)
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

        group.position.copy(position);
        group.lookAt(0, 0, 0);
        group.rotateX(Math.PI / 2);
        group.position.addScaledVector(group.position.clone().normalize(), 0.05);

        const colliderRef = {
            position: group.position.clone(),
            radius: 0.18,
            height: 0.6
        };

        const treeEntity = {
            mesh: group,
            collider: colliderRef,
            resourceType: 'wood',
            resourceAmount: 15,
            
            state: initialState, // 'sapling', 'adult', 'stump'
            growthProgress: initialProgress,
            health: 100,
            regrowthTimer: 0,
            seedTimer: 0,

            update(delta, scene, obstaclesList, allObjectsList) {
                // 1. Crecimiento activo de brote a adulto en 60 segundos (1 min)
                if (this.state === 'sapling') {
                    this.growthProgress += delta / 60.0; 
                    if (this.growthProgress >= 1.0) {
                        this.growthProgress = 1.0;
                        this.state = 'adult';
                        group.scale.set(1, 1, 1);
                    } else {
                        group.scale.setScalar(Math.max(0.15, this.growthProgress));
                    }
                    return;
                }

                // 2. Generación de semillas periódicas en árboles adultos (cada ~30s)
                if (this.state === 'adult') {
                    this.seedTimer += delta;
                    if (this.seedTimer > 30) { 
                        this.seedTimer = 0;
                        this.trySpawnSeed(scene, obstaclesList, allObjectsList);
                    }
                }

                // 3. Sistema de retoño del tocón (retoña en 30 segundos si no se extrae)
                if (this.state === 'stump') {
                    this.regrowthTimer += delta;
                    if (this.regrowthTimer > 30) { 
                        this.regrowthTimer = 0;
                        this.state = 'sapling';
                        this.growthProgress = 0.15;
                        this.health = 100;
                        group.scale.setScalar(0.15);
                        
                        this.collider.radius = 0.18;
                        this.collider.height = 0.6;
                    }
                }
            },

            chopDown() {
                if (this.state !== 'adult') return;

                this.state = 'stump';
                this.health = 0;
                this.regrowthTimer = 0;

                group.scale.set(1, 0.25, 1);
                this.collider.radius = 0.08;
                this.collider.height = 0.15;
            },

            trySpawnSeed(scene, obstaclesList, allObjectsList) {
                let newPos = null;
                let validPositionFound = false;

                for (let attempt = 0; attempt < 5; attempt++) {
                    const offsetTheta = (Math.random() - 0.5) * 0.2;
                    const offsetPhi = (Math.random() - 0.5) * 0.2;
                    
                    const testPos = group.position.clone().add(new THREE.Vector3(offsetTheta, 0, offsetPhi)).normalize().multiplyScalar(5.0);

                    let tooClose = false;
                    for (let i = 0; i < allObjectsList.length; i++) {
                        if (allObjectsList[i].mesh && allObjectsList[i].mesh.position.distanceTo(testPos) < 0.6) {
                            tooClose = true;
                            break;
                        }
                    }

                    if (!tooClose) {
                        newPos = testPos;
                        validPositionFound = true;
                        break;
                    }
                }

                if (validPositionFound && newPos) {
                    const newTree = TreeObject.create(newPos, 'sapling', 0.1);
                    newTree.mesh.scale.setScalar(0.1);

                    scene.add(newTree.mesh);
                    obstaclesList.push(newTree.collider);
                    allObjectsList.push(newTree);
                }
            }
        };

        if (initialState === 'sapling') {
            group.scale.setScalar(Math.max(0.15, initialProgress));
        }

        return treeEntity;
    }
};

window.TreeObject = TreeObject;
