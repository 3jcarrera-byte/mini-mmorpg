// public/js/objects/crosshair.js

const CrosshairModule = (() => {
    let crosshairElement = null;

    function init() {
        const container = document.querySelector('.game-container') || document.body;
        if (container && !document.getElementById('game-crosshair')) {
            crosshairElement = document.createElement('div');
            crosshairElement.id = 'game-crosshair';
            crosshairElement.style.position = 'absolute';
            crosshairElement.style.top = '50%';
            crosshairElement.style.left = '50%';
            crosshairElement.style.width = '24px';
            crosshairElement.style.height = '24px';
            crosshairElement.style.transform = 'translate(-50%, -50%)';
            crosshairElement.style.pointerEvents = 'none';
            crosshairElement.style.zIndex = '100';

            const lines = [
                { top: '10px', left: '0px', width: '8px', height: '2px' },  
                { top: '10px', left: '16px', width: '8px', height: '2px' }, 
                { top: '0px', left: '10px', width: '2px', height: '8px' },  
                { top: '16px', left: '10px', width: '2px', height: '8px' }   
            ];

            lines.forEach(cfg => {
                const line = document.createElement('div');
                line.style.position = 'absolute';
                line.style.top = cfg.top;
                line.style.left = cfg.left;
                line.style.width = cfg.width;
                line.style.height = cfg.height;
                line.style.backgroundColor = 'rgba(0, 255, 204, 0.9)';
                line.style.boxShadow = '0 0 2px rgba(0,0,0,0.8)';
                crosshairElement.appendChild(line);
            });

            const dot = document.createElement('div');
            dot.style.position = 'absolute';
            dot.style.top = '11px';
            dot.style.left = '11px';
            dot.style.width = '2px';
            dot.style.height = '2px';
            dot.style.backgroundColor = '#ffffff';
            crosshairElement.appendChild(dot);

            container.style.position = 'relative';
            container.appendChild(crosshairElement);
        } else {
            crosshairElement = document.getElementById('game-crosshair');
        }
    }

    function update(isMoving) {
        if (!crosshairElement) return;
        crosshairElement.style.display = 'block';
        const scale = isMoving ? 'scale(1.2)' : 'scale(1)';
        crosshairElement.style.transform = `translate(-50%, -50%) ${scale}`;
    }

    function hide() {
        if (crosshairElement) {
            crosshairElement.style.display = 'none';
        }
    }

    return { init, update, hide };
})();

window.CrosshairModule = CrosshairModule;
