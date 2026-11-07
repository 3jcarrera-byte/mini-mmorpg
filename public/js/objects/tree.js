// public/js/objects/tree.js
const TreeObject = {
    create(position) {
        const group = new THREE.Group();
        
        // --- 1. CREACIÓN DE GEOMETRÍAS ---
        const trunkGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.5, 6);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9, flatShading: true });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 0.25;
        group.add(trunk);

        const leavesMat = new THREE.MeshStandardMaterial({ color: 0x2d8a39, roughness: 0.7, flatShading: true });
        
        const layer1 = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.5, 5), leavesMat);
        layer1.position.y = 0.5;
        group.add(layer1);

        const layer2 = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.4, 5), leavesMat);
        layer2.position.y = 0.8;
        group.add(layer2);

        const layer3 = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.3, 5), leavesMat);
        layer3.position.y = 1.05;
        group.add(layer3);

        // Posicionamiento sobre la esfera
        group.position.copy(position);
        group.lookAt(0, 0, 0);
        group.rotateX(Math.PI / 2);
        group.position.addScaledVector(group.position.clone().normalize(), 0.05);

        // --- 2. ESTADOS Y PROPIEDADES DE SIMULACIÓN ---
        const treeEntity = {
            mesh: group,
            collider: {
                position: group.position.clone(),
                radius: 0.2,
                height: 0.7
            },
            resourceType: 'wood',
            resourceAmount: 15,
            
            // Estados ecológicos
            state: 'adult', // 'sapling' (brote), 'adult', 'stump' (tocón), 'fallen' (caído)
            growthProgress: 1.0, // De 0.0 a 1.0
            health: 100,
            regrowthTimer: 0, // Tiempo para que el tocón retoñe
            seedTimer: 0,     // Tiempo para generar una semilla cercana

            // Método de actualización lógica por frame
            update(delta, scene, obstaclesList, allTreesList) {
                // Si es un brote pequeño, va creciendo poco a poco
                if (this.state === 'sapling') {
                    this.growthProgress += delta * 0.05; // Ajusta la velocidad de crecimiento
                    if (this.growthProgress >= 1.0) {
                        this.growthProgress = 1.0;
                        this.state = 'adult';
                        group.visible = true;
                    } else {
                        group.scale.setScalar(this.growthProgress);
                        return;
                    }
                }

                // Si es un árbol adulto, gestiona la generación de semillas periódicas
                if (this.state === 'adult') {
                    this.seedTimer += delta;
                    if (this.seedTimer > 45) { // Cada ~45 segundos intenta plantar una semilla cerca
                        this.seedTimer = 0;
                        this.trySpawnSeed(scene, obstaclesList, allTreesList);
                    }
                }

                // Si se convirtió en tocón, espera un tiempo para retoñar
                if (this.state === 'stump') {
                    this.regrowthTimer += delta;
                    if (this.regrowthTimer > 60) { // Si pasa 1 minuto y no se extrae el tocón, retoña
                        this.regrowthTimer = 0;
                        this.state = 'adult';
                        this.health = 100;
                        group.scale.set(1, 1, 1);
                        group.visible = true;
                    }
                }
            },

            // Lógica cuando el jugador lo tala por completo
            chopDown(scene, obstaclesList) {
                if (this.state !== 'adult') return;

                this.state = 'stump';
                this.health = 0;
                
                // Reducir la malla visual a un simple tocón bajo en el suelo
                group.scale.set(1, 0.2, 1); 
                
                // Reducir el colisionador para que el jugador pueda pasar por encima o cerca del tocón
                this.collider.radius = 0.1;
                this.collider.height = 0.15;
            },

            // Generar un nuevo árbol (brote) en un radio aleatorio cercano sobre la esfera
            trySpawnSeed(scene, obstaclesList, allTreesList) {
                const normal = group.position.clone().normalize();
                // Calcular una posición aleatoria cercana variando ligeramente los ángulos
                const offsetTheta = (Math.random() - 0.5) * 0.1;
                const offsetPhi = (Math.random() - 0.5) * 0.1;
                
                // Derivación sencilla de nueva posición en la esfera
                const planetRadius = 5.0;
                const currentPos = group.position.clone();
                const newPos = currentPos.add(new THREE.Vector3(offsetTheta, 0, offsetPhi)).normalize().multiplyScalar(planetRadius);

                // Crear el nuevo árbol en estado de brote (sapling)
                const newTreeData = TreeObject.create(newPos);
                newTreeData.state = 'sapling';
                newTreeData.growthProgress = 0.1;
                newTreeData.mesh.scale.setScalar(0.1);

                scene.add(newTreeData.mesh);
                obstaclesList.push(newTreeData.collider);
                allTreesList.push(newTreeData);
            }
        };

        return treeEntity;
    }
};

window.TreeObject = TreeObject;
