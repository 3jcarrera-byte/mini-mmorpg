// public/js/objects/playerAvatar.js

const PlayerAvatarModule = (() => {
    function create(alienRace = 'reptilian', customColor = 0xff0033) {
        const group = new THREE.Group();
        
        // Contenedor interno para separar la malla estática/modelo 3D de la lógica de animación
        const modelContainer = new THREE.Group();
        modelContainer.name = "modelContainer";
        group.add(modelContainer);

        // Geometría provisional (Placeholder) basada en razas
        const body = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.08, 0.35, 8), 
            new THREE.MeshStandardMaterial({ color: customColor })
        );
        body.position.y = 0.175;
        modelContainer.add(body);

        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.07, 8, 8), 
            new THREE.MeshStandardMaterial({ color: 0xffd700 })
        );
        head.position.y = 0.38;
        modelContainer.add(head);

        // Objeto de control de animación (Preparado para cuando integres GLTFLoader y AnimationMixer)
        let mixer = null;
        let animations = {};

        return {
            mesh: group,
            setAnimation(name) {
                // Futuro selector de animaciones (Idle, Walk, Jump)
                if (mixer && animations[name]) {
                    // mixer.clipAction(animations[name]).play();
                }
            },
            update(delta) {
                if (mixer) {
                    mixer.update(delta);
                }
            },
            updateColor(newColor) {
                if (body && body.material) {
                    body.material.color.setHex(newColor);
                }
            }
        };
    }

    return { create };
})();

window.PlayerAvatarModule = PlayerAvatarModule;
