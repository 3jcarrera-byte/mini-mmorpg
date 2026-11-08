// Módulo Modularizado de Árboles (TreeObject)
const TreeObject = (() => {

    function create(position, initialState = 'adult', initialProgress = 1.0) {
        const group = new THREE.Group();
        
        // 1. Tronco cilíndrico
        const trunkGeo = new THREE.CylinderGeometry(0.06, 0.1, 0.45, 6);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9, flatShading: true });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 0.22;
        group.add(trunk);

        // 2. Capas de follaje (Pino estilizado)
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

        const normal = position.clone().normalize();
        group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);

        const colliderRef = {
            position: group.position.clone(),
            radius: 0.12,
            height: 0.4
        };

        const treeEntity = {
            type: 'tree', // 🌟 Sincronizado con game.js
            mesh: group,
            collider: colliderRef,
            resourceType: 'wood',
            
            state: initialState, // 'sapling', 'adult', 'stump'
            growthProgress: initialProgress,
            health: 100,
            regrowthTimer: 0,
            seedTimer: 0,

            get resourceAmount() {
                if (this.state === 'adult') return 15;
                return Math.max(1, Math.floor(this.growthProgress * 15));
            },

            update(delta, scene, obstaclesList, allObjectsList) {
                const growthDuration = 60; 

                if (this.state === 'sapling') {
                    this.growthProgress += delta / growthDuration; 
                    if (this.growthProgress >= 1.0) {
                        this.growthProgress = 1.0;
                        this.state = 'adult';
                        group.scale.set(1, 1, 1);
                        group.children.forEach(child => child.visible = true);
                    } else {
                        const currentScale = Math.max(0.3, this.growthProgress);
                        group.scale.setScalar(currentScale);
                    }
                    return;
                }

                if (this.state === 'adult') {
                    this.seedTimer += delta;
                    if (this.seedTimer > 30) { 
                        this.seedTimer = 0;
                        this.trySpawnSeed(scene, obstaclesList, allObjectsList);
                    }
                }

                if (this.state === 'stump') {
                    this.regrowthTimer += delta;
                    if (this.regrowthTimer > 60) {
                        this.regrowthTimer = 0;
                        this.state = 'sapling';
                        this.growthProgress = 0.3;
                        this.health = 100;
                        group.scale.setScalar(0.3);
                        group.children.forEach(child => child.visible = true);
                        
                        this.collider.radius = 0.12;
                        this.collider.height = 0.4;
                    }
                }
            },

            chopDown() {
                if (this.state === 'stump') return;

                this.state = 'stump';
                this.health = 0;
                this.regrowthTimer = 0;

                group.children.forEach((child, index) => {
                    if (index > 0) child.visible = false;
                });

                group.scale.set(1, 0.25, 1);
                this.collider.radius = 0.06;
                this.collider.height = 0.1;
            },

            trySpawnSeed(scene, obstaclesList, allObjectsList) {
                let newPos = null;
                let validPositionFound = false;
                const planetRadius = 5;

                for (let attempt = 0; attempt < 5; attempt++) {
                    const offsetTheta = (Math.random() - 0.5) * 0.25;
                    const offsetPhi = (Math.random() - 0.5) * 0.25;
                    
                    const testPos = group.position.clone().add(new THREE.Vector3(offsetTheta, 0, offsetPhi)).normalize().multiplyScalar(planetRadius);

                    let tooClose = false;
                    for (let i = 0; i < allObjectsList.length; i++) {
                        if (allObjectsList[i].mesh && allObjectsList[i].mesh.position.distanceTo(testPos) < 0.5) {
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
                    const newTree = create(newPos, 'sapling', 0.2);
                    newTree.mesh.scale.setScalar(0.2);

                    if (scene && typeof scene.add === 'function') {
                        scene.add(newTree.mesh);
                    }
                    obstaclesList.push(newTree.collider);
                    allObjectsList.push(newTree);
                }
            }
        };

        group.scale.setScalar(Math.max(0.3, initialProgress));
        return treeEntity;
    }

    return { create };
})();

window.TreeObject = TreeObject;
