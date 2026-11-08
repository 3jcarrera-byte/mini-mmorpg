// Módulo de Inventario Translúcido con Drag & Drop y Diseño Minimalista (inventory.js)
const InventoryModule = (() => {
    const maxSlots = 20; // 4 filas x 5 columnas
    let items = Array(maxSlots).fill(null);
    
    // Posicionar los recursos iniciales en los primeros slots
    items[0] = { id: 1, type: 'wood', name: 'Madera', count: 100, icon: '🪵', color: '#e67e22' };
    items[1] = { id: 2, type: 'stone', name: 'Piedra', count: 0, icon: '🪨', color: '#95a5a6' };

    let draggedIndex = null;

    function init() {
        createUI();
    }

    function createUI() {
        if (document.getElementById('inventory-modal')) return;

        const container = document.querySelector('.game-container') || document.body;

        // 1. Botón minimalista y discreto en la esquina superior/inferior (fuera del canvas de juego)
        if (!document.getElementById('btn-inventory-toggle')) {
            const btnToggle = document.createElement('button');
            btnToggle.id = 'btn-inventory-toggle';
            btnToggle.innerHTML = '🎒 [B]';
            btnToggle.style.cssText = `
                position: absolute; top: 15px; right: 15px; z-index: 50; 
                padding: 6px 12px; background: rgba(0, 0, 0, 0.4); 
                color: rgba(255, 255, 255, 0.8); border: 1px solid rgba(255, 255, 255, 0.15); 
                cursor: pointer; border-radius: 6px; font-family: monospace; font-size: 12px;
                backdrop-filter: blur(4px); transition: all 0.2s ease;
            `;
            btnToggle.onmouseover = () => { btnToggle.style.background = 'rgba(0,0,0,0.7);'; btnToggle.style.color = '#fff'; };
            btnToggle.onmouseout = () => { btnToggle.style.background = 'rgba(0, 0, 0, 0.4);'; btnToggle.style.color = 'rgba(255,255,255,0.8)'; };
            btnToggle.onclick = (e) => {
                e.stopPropagation();
                toggle();
            };
            container.appendChild(btnToggle);
        }

        // 2. Ventana Modal Translúcida (Glassmorphism elegante)
        const modal = document.createElement('div');
        modal.id = 'inventory-modal';
        modal.style.cssText = `
            display: none; position: absolute; top: 50%; left: 50%; 
            transform: translate(-50%, -50%); width: 360px; 
            background: rgba(15, 17, 23, 0.75); 
            border: 1px solid rgba(255, 255, 255, 0.12); padding: 20px; color: #fff; 
            z-index: 200; border-radius: 14px; font-family: monospace; 
            box-shadow: 0 20px 40px rgba(0,0,0,0.6);
            backdrop-filter: blur(12px);
            pointer-events: auto;
        `;
        
        modal.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; margin-bottom: 15px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 16px;">🎒</span>
                    <h3 style="margin: 0; color: rgba(255,255,255,0.9); font-size: 14px; letter-spacing: 1px;">INVENTARIO</h3>
                </div>
                <button id="close-inv-btn" style="background: transparent; border: none; color: rgba(255,255,255,0.5); font-size: 16px; cursor: pointer; transition: color 0.2s;">✕</button>
            </div>

            <!-- Cuadrícula de Slots -->
            <div id="inventory-grid" style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; padding: 2px;">
                <!-- Se llena dinámicamente -->
            </div>

            <div style="margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 10px; display: flex; justify-content: space-between; font-size: 10px; color: rgba(255,255,255,0.4);">
                <span>Usados: <strong id="inv-capacity" style="color: rgba(255,255,255,0.8);">0/20</strong></span>
                <span>Arrastra para mover • <strong style="color: rgba(255,255,255,0.8);">[B]</strong> cerrar</span>
            </div>
        `;
        container.appendChild(modal);

        modal.addEventListener('click', (e) => e.stopPropagation());

        const closeBtn = modal.querySelector('#close-inv-btn');
        closeBtn.onmouseover = () => { closeBtn.style.color = '#fff'; };
        closeBtn.onmouseout = () => { closeBtn.style.color = 'rgba(255,255,255,0.5)'; };
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            toggle();
        };

        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyB') {
                toggle();
            }
        });

        renderGrid();
    }

    function renderGrid() {
        const gridContainer = document.getElementById('inventory-grid');
        const capacityEl = document.getElementById('inv-capacity');
        if (!gridContainer) return;

        gridContainer.innerHTML = '';
        let usedSlots = 0;

        for (let i = 0; i < maxSlots; i++) {
            const slotItem = items[i];
            const slot = document.createElement('div');
            
            slot.style.cssText = `
                aspect-ratio: 1; background: rgba(0, 0, 0, 0.25); 
                border: 1px solid rgba(255, 255, 255, 0.08); 
                border-radius: 8px; display: flex; flex-direction: column; 
                align-items: center; justify-content: center; position: relative; 
                transition: all 0.15s ease; cursor: grab;
            `;

            slot.setAttribute('data-index', i);

            // Configurar eventos de Drag & Drop nativos
            slot.addEventListener('dragstart', (e) => {
                draggedIndex = i;
                e.dataTransfer.setData('text/plain', i);
                slot.style.opacity = '0.4';
            });

            slot.addEventListener('dragend', () => {
                slot.style.opacity = '1';
                draggedIndex = null;
            });

            slot.addEventListener('dragover', (e) => {
                e.preventDefault(); // Necesario para permitir soltar
                slot.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                slot.style.background = 'rgba(255, 255, 255, 0.05)';
            });

            slot.addEventListener('dragleave', () => {
                slot.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                slot.style.background = 'rgba(0, 0, 0, 0.25)';
            });

            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
                const targetIndex = i;

                if (!isNaN(sourceIndex) && sourceIndex !== targetIndex) {
                    // Intercambiar posiciones de los ítems (Swap)
                    const temp = items[sourceIndex];
                    items[sourceIndex] = items[targetIndex];
                    items[targetIndex] = temp;
                    renderGrid();
                }
            });

            if (slotItem && slotItem.count > 0) {
                usedSlots++;
                slot.setAttribute('draggable', 'true');
                slot.innerHTML = `
                    <span style="font-size: 22px; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.4)); pointer-events: none;">${slotItem.icon}</span>
                    <span style="position: absolute; bottom: 3px; right: 4px; font-size: 10px; color: ${slotItem.color}; font-weight: bold; background: rgba(0,0,0,0.6); padding: 1px 3px; border-radius: 3px; pointer-events: none;">${slotItem.count}</span>
                `;
            } else {
                slot.setAttribute('draggable', 'false');
                slot.style.opacity = '0.3';
            }

            gridContainer.appendChild(slot);
        }

        if (capacityEl) capacityEl.innerText = `${usedSlots}/${maxSlots}`;
    }

    function toggle() {
        const modal = document.getElementById('inventory-modal');
        if (!modal) return;
        const isOpen = modal.style.display === 'block';
        
        if (isOpen) {
            modal.style.display = 'none';
        } else {
            if (document.pointerLockElement) {
                document.exitPointerLock();
            }
            renderGrid();
            modal.style.display = 'block';
        }
    }

    function addItem(type, amount) {
        // Buscar si ya existe el ítem en algún slot para acumularlo
        let existingItem = items.find(i => i && i.type === type);
        if (existingItem) {
            existingItem.count += amount;
        } else {
            // Buscar el primer slot vacío disponible
            let emptyIndex = items.findIndex(i => i === null);
            if (emptyIndex !== -1) {
                const icons = { wood: '🪵', stone: '🪨' };
                const colors = { wood: '#e67e22', stone: '#bdc3c7' };
                items[emptyIndex] = {
                    id: Date.now(),
                    type: type,
                    name: type.charAt(0).toUpperCase() + type.slice(1),
                    count: amount,
                    icon: icons[type] || '📦',
                    color: colors[type] || '#ffffff'
                };
            }
        }

        renderGrid();

        if (type === 'wood') {
            const woodHud = document.getElementById('ui-wood');
            if (woodHud) woodHud.innerText = getData().wood;
        }
    }

    function getData() {
        let woodCount = 0;
        let stoneCount = 0;
        let used = 0;

        items.forEach(item => {
            if (item && item.count > 0) {
                used++;
                if (item.type === 'wood') woodCount += item.count;
                if (item.type === 'stone') stoneCount += item.count;
            }
        });

        return {
            wood: woodCount,
            stone: stoneCount,
            slotsUsed: used
        };
    }

    return {
        init,
        toggle,
        addItem,
        getData
    };
})();

window.InventoryModule = InventoryModule;
