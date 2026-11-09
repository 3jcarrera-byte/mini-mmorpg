// public/js/camera.js

const CameraModule = (() => {
    function updateCamera(camera, player, cameraMode, planetRadius) {
        const planetMesh = (typeof WorldModule !== 'undefined' && typeof WorldModule.getPlanetMesh === 'function') ? WorldModule.getPlanetMesh() : null;
        const planetCenter = new THREE.Vector3();
        if (planetMesh) {
            planetMesh.getWorldPosition(planetCenter);
        }

        const normal = player.position.clone().sub(planetCenter).normalize();
        
        // Calcular la base tangente estable en función de la normal
        const refVector = Math.abs(normal.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
        const tangentRight = new THREE.Vector3().crossVectors(normal, refVector).normalize();
        const tangentForward = new THREE.Vector3().crossVectors(tangentRight, normal).normalize();

        // Aplicar el ángulo de rotación horizontal de la cámara (yawOffset)
        const rotMatrixYaw = new THREE.Matrix4().makeRotationAxis(normal, player.yawOffset || 0);
        const viewForward = tangentForward.clone().applyMatrix4(rotMatrixYaw).normalize();
        const viewRight = tangentRight.clone().applyMatrix4(rotMatrixYaw).normalize();

        const R = planetRadius;
        camera.up.copy(normal);

        if (cameraMode === 'first') {
            const eyeHeight = 0.38;
            const eyePosition = player.position.clone().add(normal.clone().multiplyScalar(eyeHeight));
            camera.position.copy(eyePosition);

            const lookDir = viewForward.clone();
            lookDir.applyAxisAngle(viewRight, player.pitch);
            const targetLookAt = eyePosition.clone().add(lookDir.multiplyScalar(player.weaponRange));
            camera.lookAt(targetLookAt);

        } else if (cameraMode === 'third') {
            const baseDistance = 1.2; 
            const baseHeight = 0.6;
            const codmYawOffset = 0.16; 

            const codmPitch = Math.max(-0.6, Math.min(0.6, player.pitch));
            const pitchOffset = Math.sin(codmPitch) * 0.2;

            // Posición de la cámara basada en la vista libre (yawOffset) y no en la dirección del cuerpo
            let camPos = player.position.clone()
                .add(normal.clone().multiplyScalar(baseHeight + pitchOffset))
                .sub(viewForward.clone().multiplyScalar(baseDistance))
                .add(viewRight.clone().multiplyScalar(codmYawOffset));

            const minAllowedRadius = R + 0.35;
            const camVectorFromCenter = camPos.clone().sub(planetCenter);
            if (camVectorFromCenter.length() < minAllowedRadius) {
                camVectorFromCenter.normalize().multiplyScalar(minAllowedRadius);
                camPos = planetCenter.clone().add(camVectorFromCenter);
            } else {
                const currentDist = camVectorFromCenter.length();
                camVectorFromCenter.normalize().multiplyScalar(Math.max(minAllowedRadius, currentDist));
                camPos = planetCenter.clone().add(camVectorFromCenter);
            }

            camera.position.copy(camPos);
            
            const lookDir = viewForward.clone();
            lookDir.applyAxisAngle(viewRight, codmPitch);
            const lookTarget = player.position.clone().add(normal.clone().multiplyScalar(0.2)).add(lookDir.multiplyScalar(player.weaponRange));
            camera.lookAt(lookTarget);

        } else if (cameraMode === 'rts') {
            const rtsHeight = 2.8; 
            const rtsBack = 2.5;   
            
            const rtsPitch = Math.max(-0.8, Math.min(-0.5, player.pitch));

            let camPos = player.position.clone()
                .add(normal.clone().multiplyScalar(rtsHeight))
                .sub(viewForward.clone().multiplyScalar(rtsBack));

            const minAllowedRadiusRTS = R + 0.5;
            const camVectorFromCenterRTS = camPos.clone().sub(planetCenter);
            if (camVectorFromCenterRTS.length() < minAllowedRadiusRTS) {
                camVectorFromCenterRTS.normalize().multiplyScalar(minAllowedRadiusRTS);
                camPos = planetCenter.clone().add(camVectorFromCenterRTS);
            } else {
                const currentDistRTS = camVectorFromCenterRTS.length();
                camVectorFromCenterRTS.normalize().multiplyScalar(Math.max(minAllowedRadiusRTS, currentDistRTS));
                camPos = planetCenter.clone().add(camVectorFromCenterRTS);
            }

            camera.position.copy(camPos);
            
            const lookDir = viewForward.clone();
            lookDir.applyAxisAngle(viewRight, rtsPitch);
            const targetLookAt = player.position.clone().add(normal.clone().multiplyScalar(0.1)).add(lookDir.multiplyScalar(player.weaponRange));
            camera.lookAt(targetLookAt);
        }
    }

    return { updateCamera };
})();

window.CameraModule = CameraModule;
