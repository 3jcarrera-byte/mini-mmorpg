// public/js/camera.js

const CameraModule = (() => {
    function updateCamera(camera, player, cameraMode, planetRadius) {
        // Obtener el centro global real del planeta actual desde WorldModule
        const planetMesh = (typeof WorldModule !== 'undefined' && typeof WorldModule.getPlanetMesh === 'function') ? WorldModule.getPlanetMesh() : null;
        const planetGlobalCenter = new THREE.Vector3(0, 0, 0);
        if (planetMesh) {
            planetMesh.getWorldPosition(planetGlobalCenter);
        }

        // Vector normal preciso desde el centro del planeta actual hasta la posición del jugador
        const normal = player.position.clone().sub(planetGlobalCenter).normalize();
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

            // Posicionamiento calculado de forma relativa al centro móvil del planeta activo
            let camPos = player.position.clone()
                .add(normal.clone().multiplyScalar(baseHeight + pitchOffset))
                .sub(player.forward.clone().multiplyScalar(baseDistance))
                .add(right.clone().multiplyScalar(codmYawOffset));

            // Blindaje de seguridad esférico respecto al centro global del planeta
            const minAllowedRadius = R + 0.35;
            const vectorFromPlanetCenter = camPos.clone().sub(planetGlobalCenter);
            if (vectorFromPlanetCenter.length() < minAllowedRadius) {
                vectorFromPlanetCenter.normalize().multiplyScalar(minAllowedRadius);
                camPos = planetGlobalCenter.clone().add(vectorFromPlanetCenter);
            }

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

            // Blindaje estricto para la vista cenital/RTS
            const minAllowedRadiusRTS = R + 0.5;
            const vectorFromPlanetCenterRTS = camPos.clone().sub(planetGlobalCenter);
            if (vectorFromPlanetCenterRTS.length() < minAllowedRadiusRTS) {
                vectorFromPlanetCenterRTS.normalize().multiplyScalar(minAllowedRadiusRTS);
                camPos = planetGlobalCenter.clone().add(vectorFromPlanetCenterRTS);
            }

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
