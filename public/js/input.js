// public/js/input.js

const InputModule = (() => {
    const keys = {};
    let isAiming = false;
    let isInitialized = false;

    function init(canvas) {
        if (isInitialized) return;

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
            if (typeof GameModule !== 'undefined') {
                if (e.code === 'Digit1' || e.code === 'Numpad1') {
                    GameModule.setCameraMode('first');
                } else if (e.code === 'Digit2' || e.code === 'Numpad2') {
                    GameModule.setCameraMode('third');
                } else if (e.code === 'Digit3' || e.code === 'Numpad3') {
                    GameModule.setCameraMode('rts');
                }
            }
        });

        window.addEventListener('keyup', e => {
            keys[e.code] = false;
        });

        if (canvas) {
            canvas.addEventListener('contextmenu', e => e.preventDefault());
            
            canvas.addEventListener('click', () => {
                const invModal = document.getElementById('inventory-modal');
                if (!invModal || invModal.style.display !== 'block') {
                    canvas.requestPointerLock();
                }
            });

            canvas.addEventListener('mousedown', e => {
                if (e.button === 2) {
                    isAiming = true;
                } else if (typeof GameModule !== 'undefined' && typeof GameModule.handleBuildClick === 'function') {
                    GameModule.handleBuildClick(e);
                }
            });

            canvas.addEventListener('mouseup', e => {
                if (e.button === 2) {
                    isAiming = false;
                }
            });
        }

        document.addEventListener('mousemove', e => {
            if (canvas && document.pointerLockElement === canvas) {
                if (typeof GameModule !== 'undefined' && typeof GameModule.handleMouseMove === 'function') {
                    GameModule.handleMouseMove(e);
                }
            }
        });

        isInitialized = true;
    }

    return {
        init,
        isDown: (code) => !!keys[code],
        isAiming: () => isAiming
    };
})();

window.InputModule = InputModule;
