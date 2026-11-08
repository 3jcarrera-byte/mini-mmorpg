const CameraModule = (() => {
    function updateCamera(camera, player, cameraMode, planetRadius) {
        const normal = player.position.clone().normalize();
        const right = new THREE.Vector3().crossVectors(player.forward, normal).normalize();
        const R = planetRadius;

        camera.up.copy(normal);

        if (cameraMode === 'first') {
            // Cámara 1: Primera persona (Shooter)
            const eyeHeight = 0.38;
            const eyePosition = player.position.clone().add(normal.clone().multiplyScalar(eyeHeight));
            camera.position.copy(eyePosition);

            const lookDir = player.forward.clone();
            lookDir.applyAxisAngle(right, player.pitch);
            const targetLookAt = eyePosition.clone().add(lookDir.multiplyScalar(player.weaponRange));
            camera.lookAt(targetLookAt);

        } else if (cameraMode === 'third') {
            // Cámara 2: Tercera persona (Over-the-shoulder)
            const baseHeight = 0.6;
            const pitchOffset = Math.sin(player.pitch) * 0.25;

            let camPos = player.position.clone()
                .add(normal.clone().multiplyScalar(baseHeight + pitchOffset))
                .add(right.clone().multiplyScalar(player.yawOffset));

            const camNormal = camPos.clone().normalize();
            if (camPos.length() < R + 0.3) {
                camPos.copy(camNormal.multiplyScalar(R + 0.3));
            }

            camera.position.copy(camPos);
            const lookTarget = player.position.clone().add(normal.clone().multiplyScalar(0.3)).add(player.forward.clone().multiplyScalar(2.0));
            camera.lookAt(lookTarget);

        } else if (cameraMode === 'rts') {
            // Cámara 3: Tipo Warcraft / RTS (con límite inferior adaptado a la línea de los pies)
            const rtsHeight = 3.0; 
            const rtsBack = 1.8;   
            const rtsPitch = Math.max(-0.55, Math.min(0.08, player.pitch));

            let camPos = player.position.clone()
                .add(normal.clone().multiplyScalar(rtsHeight))
                .sub(player.forward.clone().multiplyScalar(rtsBack));

            const camNormal = camPos.clone().normalize();
            if (camPos.length() < R + 0.3) {
                camPos.copy(camNormal.multiplyScalar(R + 0.3));
            }

            camera.position.copy(camPos);
            
            const lookDir = player.forward.clone();
            lookDir.applyAxisAngle(right, rtsPitch);
            const targetLookAt = player.position.clone().add(normal.clone().multiplyScalar(0.02)).add(lookDir.multiplyScalar(player.weaponRange));
            camera.lookAt(targetLookAt);
        }
    }

    return { updateCamera };
})();
window.CameraModule = CameraModule;
