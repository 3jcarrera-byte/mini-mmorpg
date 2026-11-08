const InputModule = (() => {
    const keys = {};
    let isAiming = false;

    function init(canvas) {
        window.addEventListener('keydown', e => {
            keys[e.code] = true;

            const invModal = document.getElementById('inventory-modal');
            if (invModal && invModal.style.display === 'block') {
                if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
                    invModal.style.display = 'none';
                    if (canvas && typeof canvas.requestPointerLock === 'function') {
                        canvas.requestPointerLock();
                    }
                }
            }

            // Teclas 1, 2 y 3 para alternar cámaras de forma instantánea
            if (e.code === 'Digit1' || e.code === 'Numpad1') {
                Game.setCameraMode('first');
            } else if (e.code === 'Digit2' || e.code === 'Numpad2') {
                Game.setCameraMode('third');
            } else if (e.code === 'Digit3' || e.code === 'Numpad3') {
                Game.setCameraMode('rts');
            }
        });

        window.addEventListener('keyup', e => keys[e.code] = false);

        canvas.addEventListener('contextmenu', e => e.preventDefault());
        
        canvas.addEventListener('click', () => {
            const invModal = document.getElementById('inventory-modal');
            if (!invModal || invModal.style.display !== 'block') {
                canvas.requestPointerLock();
            }
        });

        canvas.addEventListener('mousedown', e => {
            if (e.button === 2) isAiming = true;
            else Game.handleBuildClick(e);
        });

        canvas.addEventListener('mouseup', e => {
            if (e.button === 2) isAiming = false;
        });

        document.addEventListener('mousemove', e => {
            if (document.pointerLockElement === canvas) {
                Game.handleMouseMove(e);
            }
        });
    }

    return {
        init,
        isDown: (code) => !!keys[code],
        isAiming: () => isAiming
    };
})();
window.InputModule = InputModule;
