// public/js/camera.js

const CameraModule = (() => {
    function updateCamera(camera, player, cameraMode, planetRadius) {
        const planetMesh = (typeof WorldModule !== 'undefined' && typeof WorldModule.getPlanetMesh === 'function') ? WorldModule.getPlanetMesh() : null;
        const planetCenter = new THREE.Vector3();
        if (planetMesh) {
            planetMesh.getWorldPosition(planetCenter);
        }

        const normal = player.position.clone().sub(planetCenter).normalize();
        const right = new THREE.Vector3().crossVectors(player.forward, normal).normalize();
        const R = planetRadius;

        camera.up.copy(normal);

        if (cameraMode === 'first') {
            const eyeHeight = 0.38;
            const eyePosition = player.position.clone().add(normal.clone().multiplyScalar(eyeHeight));
            camera.position.copy(eyePosition);

            const lookDir = player.forward.clone();
            lookDir.applyAxisAngle(right, player.pitch);
            const targetLookAt = eyePosition.clone().add(lookDir.multiplyScalar(player.weaponRange));
            camera.lookAt(targetLookAt);

        } else if (cameraMode === 'third') {
            const baseDistance = 1.2; 
            const baseHeight = 0.6;
            const codmYawOffset = 0.16; 

            const codmPitch = Math.max(-0.6, Math.min(0.6, player.pitch));
            const pitchOffset = Math.sin(codmPitch) * 0.2;

            let camPos = player.position.clone()
                .add(normal.clone().multiplyScalar(baseHeight + pitchOffset))
                .sub(player.forward.clone().multiplyScalar(baseDistance))
                .add(right.clone().multiplyScalar(codmYawOffset));

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
            
            const lookDir = player.forward.clone();
            lookDir.applyAxisAngle(right, codmPitch);
            const lookTarget = player.position.clone().add(normal.clone().multiplyScalar(0.2)).add(lookDir.multiplyScalar(player.weaponRange));
            camera.lookAt(lookTarget);

        } else if (cameraMode === 'rts') {
            const rtsHeight = 2.8; 
            const rtsBack = 2.5;   
            
            const rtsPitch = Math.max(-0.8, Math.min(-0.5, player.pitch));

            let camPos = player.position.clone()
                .add(normal.clone().multiplyScalar(rtsHeight))
                .sub(player.forward.clone().multiplyScalar(rtsBack));

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
            
            const lookDir = player.forward.clone();
            lookDir.applyAxisAngle(right, rtsPitch);
            const targetLookAt = player.position.clone().add(normal.clone().multiplyScalar(0.1)).add(lookDir.multiplyScalar(player.weaponRange));
            camera.lookAt(targetLookAt);
        }
    }

    return { updateCamera };
})();

window.CameraModule = CameraModule;
