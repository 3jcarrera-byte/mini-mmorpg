// Módulo de Corrección y Control del Bolso (bagFix.js)
const BagFixModule = (() => {
    function init() {
        // Asegurar que el modal del inventario y el botón existan en la pantalla de juego
        if (!document.getElementById('inventory-modal')) {
            createBagUI();
        }

        // Escuchar la tecla B de forma global y directa
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyB') {
                toggleBag();
            }
        });
    }

    function createBagUI() {
        const container = document.querySelector('.game-container') || document.body;

        // Botón flotante del bolso
        if (!document.getElementById('btn-inventory-toggle')) {
            const btnToggle = document.createElement('button');
            btnToggle.id = 'btn-inventory-toggle';
            btnToggle.innerHTML = '🎒 Bolso [B]';
            btnToggle.style.cssText = 'position: absolute; bottom: 20px; right: 20px; z-index: 999; padding: 10px 15px; background: rgba(15, 15, 25, 0.9); color: #00ffcc; border: 2px solid #00ffcc; cursor: pointer; border-radius: 5px; font-family: monospace; font-weight: bold; box-shadow: 0 0 10px rgba(0,255,204,0.3);';
            btnToggle.onclick = toggleBag;
            container.appendChild(btnToggle);
        }

        // Ventana Modal del Bolso
        const modal = document.createElement('div');
        modal.id = 'inventory-modal';
        modal.style.cssText = 'display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 320px; background: rgba(15, 15, 25, 0.95); border: 2px solid #00ffcc; padding: 20px; color: #fff; z-index: 1000; border-radius: 8px; font-family: monospace; box-shadow: 0 0 20px rgba(0,0,0,0.8);';
        modal.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333; padding-bottom: 10px; margin-bottom: 15px;">
                <h3 style="margin: 0; color: #00ffcc; font-size: 18px;">🎒 Inventario del Héroe</h3>
                <button id="close-bag-btn" style="background: none; border: none; color: #ff5555; font-size: 18px; font-weight: bold; cursor: pointer;">✕</button>
            </div>
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 4px; border: 1px solid #333;">
                    <span>🪵 Madera</span>
                    <span id="bag-wood-count" style="font-weight: bold; color: #f39c12;">100</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 4px; border: 1px solid #333;">
                    <span>🪨 Piedra</span>
                    <span id="bag-stone-count" style="font-weight: bold; color: #bdc3c7;">0</span>
                </div>
            </div>
        `;
        container.appendChild(modal);

        modal.querySelector('#close-bag-btn').onclick = toggleBag;
    }

    function toggleBag() {
        const modal = document.getElementById('inventory-modal');
        if (!modal) return;

        const isOpen = modal.style.display === 'block';
        if (isOpen) {
            modal.style.display = 'none';
        } else {
            // Sincronizar con los datos actuales del inventario si existen
            updateValues();
            modal.style.display = 'block';
        }
    }

    function updateValues() {
        const woodEl = document.getElementById('bag-wood-count');
        const stoneEl = document.getElementById('bag-stone-count');
        
        // Intentar leer de InventoryModule si está disponible
        if (typeof InventoryModule !== 'undefined' && typeof InventoryModule.getData === 'function') {
            const data = InventoryModule.getData();
            if (woodEl) woodEl.innerText = data.wood;
            if (stoneEl) stoneEl.innerText = data.stone;
        } else {
            // Respaldo leyendo el HUD principal
            const uiWood = document.getElementById('ui-wood');
            if (woodEl && uiWood) woodEl.innerText = uiWood.innerText;
        }
    }

    return {
        init,
        toggleBag,
        updateValues
    };
})();

window.BagFixModule = BagFixModule;

// Auto-inicializar al cargar la página
window.addEventListener('DOMContentLoaded', () => {
    BagFixModule.init();
});
