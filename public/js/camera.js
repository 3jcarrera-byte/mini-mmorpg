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
            // 🌟 Cámara 2: Tercera persona (Estilo CODM) -> Límite inferior extendido para que baje mucho más
            const baseDistance = 1.2; 
            const baseHeight = 1;
            const codmYawOffset = 0.16; 

            // Ampliamos el rango inferior (primer valor más negativo, ej: -1.0) para que la mirilla baje hasta el suelo/pies
            const codmPitch = Math.max(-0.7, Math.min(0.6, player.pitch));
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
            // 🌟 Cámara 3: Tipo Warcraft / RTS -> Límite inferior más alto (frena donde marcaste con la línea roja)
            const rtsHeight = 2.8; 
            const rtsBack = 2.5;   
            
            // Limitamos para que no baje tanto (primer valor en -0.3 o -0.2 para que se detenga a la altura del personaje)
            const rtsPitch = Math.max(-0.5, Math.min(0.6, player.pitch));

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
