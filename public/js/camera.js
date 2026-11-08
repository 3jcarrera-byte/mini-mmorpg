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
            // 🌟 Cámara 2 (CODM): Límite inferior más restrictivo para que la mirilla no baje tanto
            // Si quieres que baje menos, acerca el primer valor a 0 (ej: -0.1 o 0.0)
            const codmPitch = Math.max(-0.1, Math.min(0.8, player.pitch));
            
            const baseDistance = 1.2; 
            const baseHeight = 1;
            const codmYawOffset = 0.16; 
            const pitchOffset = Math.sin(codmPitch) * 0.2;

            let camPos = player.position.clone()
                .add(normal.clone().multiplyScalar(baseHeight + pitchOffset))
                .sub(player.forward.clone().multiplyScalar(baseDistance))
                .add(right.clone().multiplyScalar(codmYawOffset));

            const camNormal = camPos.clone().normalize();
            if (camPos.length() < R + 0.25) {
                camPos.copy(camNormal.multiplyScalar(R + 0.25));
            }

            camera.position.copy(camPos);
            
            const lookDir = player.forward.clone();
            lookDir.applyAxisAngle(right, codmPitch);
            const lookTarget = player.position.clone().add(normal.clone().multiplyScalar(0.3)).add(lookDir.multiplyScalar(player.weaponRange));
            camera.lookAt(lookTarget);

        } else if (cameraMode === 'rts') {
            // 🌟 Cámara 3 (Warcraft/RTS): Límite SUPERIOR muy bajo para que la mirilla no pueda subir casi nada
            // Cambia el 0.0 o -0.1 para restringir drásticamente que suba la vista
            const rtsPitch = Math.max(-1.2, Math.min(-0.1, player.pitch));

            const rtsHeight = 2.8; 
            const rtsBack = 2.5;   

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
            const targetLookAt = player.position.clone().add(normal.clone().multiplyScalar(0.01)).add(lookDir.multiplyScalar(player.weaponRange));
            camera.lookAt(targetLookAt);
        }
    }

    return { updateCamera };
})();
window.CameraModule = CameraModule;
