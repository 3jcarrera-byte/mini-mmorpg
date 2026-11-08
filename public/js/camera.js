// public/js/camera.js

const CameraModule = (() => {
    function updateCamera(camera, player, cameraMode, planetRadius) {
        const normal = player.position.clone().normalize();
        const right = new THREE.Vector3().crossVectors(player.forward, normal).normalize();
        const R = planetRadius;

        camera.up.copy(normal);

        if (cameraMode === 'first') {
            // 🌟 Cámara 1: Primera persona (Shooter)
            const eyeHeight = 0.38;
            const eyePosition = player.position.clone().add(normal.clone().multiplyScalar(eyeHeight));
            camera.position.copy(eyePosition);

            const lookDir = player.forward.clone();
            lookDir.applyAxisAngle(right, player.pitch);
            const targetLookAt = eyePosition.clone().add(lookDir.multiplyScalar(player.weaponRange));
            camera.lookAt(targetLookAt);

        } else if (cameraMode === 'third') {
            // 🌟 Cámara 2: Tercera persona (Estilo CODM)
            const baseDistance = 1.2; 
            const baseHeight = 0.6;
            const codmYawOffset = 0.16; 

            const codmPitch = Math.max(-0.6, Math.min(0.6, player.pitch));
            const pitchOffset = Math.sin(codmPitch) * 0.2;

            // Posicionamiento relativo basado estrictamente en el vector normal de la superficie del planeta
            let camPos = player.position.clone()
                .add(normal.clone().multiplyScalar(baseHeight + pitchOffset))
                .sub(player.forward.clone().multiplyScalar(baseDistance))
                .add(right.clone().multiplyScalar(codmYawOffset));

            // Blindaje estricto: Asegurar que la cámara nunca baje del radio del planeta + margen de seguridad
            const distFromCenter = camPos.length();
            const minAllowedRadius = R + 0.35;
            if (distFromCenter < minAllowedRadius) {
                camPos = normal.clone().multiplyScalar(minAllowedRadius)
                    .add(player.position.clone().sub(normal.clone().multiplyScalar(player.position.dot(normal))).normalize().multiplyScalar(camPos.clone().sub(normal.clone().multiplyScalar(camPos.dot(normal))).length()));
                // Fallback directo normalizado si se acerca de más al núcleo
                if (camPos.length() < minAllowedRadius) {
                    camPos = normal.clone().multiplyScalar(minAllowedRadius).add(player.position.clone().sub(normal.clone().multiplyScalar(R)).normalize().multiplyScalar(0.5));
                }
            }

            // Corrección de seguridad radial absoluta para evitar cualquier colapso visual
            camPos.normalize().multiplyScalar(Math.max(R + 0.35, camPos.length()));
            camera.position.copy(camPos);
            
            const lookDir = player.forward.clone();
            lookDir.applyAxisAngle(right, codmPitch);
            const lookTarget = player.position.clone().add(normal.clone().multiplyScalar(0.2)).add(lookDir.multiplyScalar(player.weaponRange));
            camera.lookAt(lookTarget);

        } else if (cameraMode === 'rts') {
            // 🌟 Cámara 3: Tipo Warcraft / RTS
            const rtsHeight = 2.8; 
            const rtsBack = 2.5;   
            
            const rtsPitch = Math.max(-0.8, Math.min(-0.5, player.pitch));

            let camPos = player.position.clone()
                .add(normal.clone().multiplyScalar(rtsHeight))
                .sub(player.forward.clone().multiplyScalar(rtsBack));

            // Blindaje estricto para RTS
            const minAllowedRadiusRTS = R + 0.5;
            camPos.normalize().multiplyScalar(Math.max(minAllowedRadiusRTS, camPos.length()));
            
            camera.position.copy(camPos);
            
            const lookDir = player.forward.clone();
            lookDir.applyAxisAngle(right, rtsPitch);
            const targetLookAt = player.position.clone().add(normal.clone().multiplyScalar(0.1)).add(lookDir.multiplyScalar(player.weaponRange));
            camera.lookAt(targetLookAt);
        }
    }

    return { updateCamera };
})();

window.CameraModule = CameraModule;
