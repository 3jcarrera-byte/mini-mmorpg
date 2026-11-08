// Módulo de Inventario con Cierre por Movimiento y Drag & Drop (inventory.js)
const InventoryModule = (() => {
    const maxSlots = 20;
    let items = Array(maxSlots).fill(null);
    
    items[0] = { id: 1, type: 'wood', name: 'Madera', count: 100, icon: '🪵', color: '#e67e22' };
    items[1] = { id: 2, type: 'stone', name: 'Piedra', count: 0, icon: '🪨', color: '#95a5a6' };

    let draggedIndex = null;

    function init() {
        createUI();
    }

    function createUI() {
        if (document.getElementById('inventory-modal')) return;

        const container = document.querySelector('.game-container') || document.body;

        // Botón mínimo flotante (Solo icono 🎒)
        if (!document.getElementById('btn-inventory-toggle')) {
            const btnToggle = document.createElement('button');
            btnToggle.id = 'btn-inventory-toggle';
            btnToggle.innerHTML = '🎒';
            btnToggle.title = 'Bolso [B]';
            btnToggle.style.cssText = `
                position: absolute; top: 15px; right: 15px; z-index: 50; 
                width: 38px; height: 38px; background: rgba(15, 17, 23, 0.5); 
                color: #fff; border: 1px solid rgba(255, 255, 255, 0.12); 
                cursor: pointer; border-radius: 8px; font-size: 16px;
                display: flex; align-items: center; justify-content: center;
                backdrop-filter: blur(4px); transition: all 0.2s ease;
            `;
            btnToggle.onmouseover = () => { btnToggle.style.background = 'rgba(25, 30, 40, 0.85);'; };
            btnToggle.onmouseout = () => { btnToggle.style.background = 'rgba(15, 17, 23, 0.5);'; };
            btnToggle.onclick = (e) => {
                e.stopPropagation();
                toggle();
            };
            container.appendChild(btnToggle);
        }

        // Ventana Modal Translúcida
        const modal = document.createElement('div');
        modal.id = 'inventory-modal';
        modal.style.cssText = `
            display: none; position: absolute; top: 50%; left: 50%; 
            transform: translate(-50%, -50%); width: 360px; 
            background: rgba(15, 17, 23, 0.82); 
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
                <div style="display: flex; align-items: center; gap: 8px;">
                    <button id="btn-auto-sort" title="Organizar automáticamente" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #00ffcc; padding: 4px 8px; border-radius: 6px; font-family: monospace; font-size: 11px; cursor: pointer; transition: background 0.2s;">✨ Organizar</button>
                    <button id="close-inv-btn" style="background: transparent; border: none; color: rgba(255,255,255,0.5); font-size: 16px; cursor: pointer;">✕</button>
                </div>
            </div>

            <div id="inventory-grid" style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; padding: 2px;"></div>

            <div style="margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 10px; display: flex; justify-content: space-between; font-size: 10px; color: rgba(255,255,255,0.4);">
                <span>Usados: <strong id="inv-capacity" style="color: rgba(255,255,255,0.8);">0/20</strong></span>
                <span>Arrastra para mover • <strong style="color: rgba(255,255,255,0.8);">[B]</strong> cerrar</span>
            </div>
        `;
        container.appendChild(modal);

        modal.addEventListener('click', (e) => e.stopPropagation());

        modal.querySelector('#btn-auto-sort').onclick = (e) => {
            e.stopPropagation();
            autoSortInventory();
        };

        modal.querySelector('#close-inv-btn').onclick = (e) => {
            e.stopPropagation();
            toggle();
        };

        // Escuchar teclas globales (B para abrir/cerrar y W,A,S,D para cerrar si está abierto)
        window.addEventListener('keydown', (e) => {
            const modalIsOpen = modal.style.display === 'block';

            if (e.code === 'KeyB') {
                toggle();
            } else if (modalIsOpen && ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                // Cerrar el inventario al presionar teclas de movimiento y volver al juego
                modal.style.display = 'none';
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
                e.preventDefault();
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

    function autoSortInventory() {
        let validItems = items.filter(i => i !== null && i.count > 0);
        let mergedMap = {};
        validItems.forEach(item => {
            if (mergedMap[item.type]) {
                mergedMap[item.type].count += item.count;
            } else {
                mergedMap[item.type] = { ...item };
            }
        });

        let sortedList = Object.values(mergedMap);
        items = Array(maxSlots).fill(null);
        sortedList.forEach((item, index) => {
            if (index < maxSlots) items[index] = item;
        });

        renderGrid();
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
        let existingItem = items.find(i => i && i.type === type);
        if (existingItem) {
            existingItem.count += amount;
        } else {
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
    }

    function getData() {
        let woodCount = 0, stoneCount = 0, used = 0;
        items.forEach(item => {
            if (item && item.count > 0) {
                used++;
                if (item.type === 'wood') woodCount += item.count;
                if (item.type === 'stone') stoneCount += item.count;
            }
        });
        return { wood: woodCount, stone: stoneCount, slotsUsed: used };
    }

    return { init, toggle, addItem, getData, autoSortInventory };
})();

window.InventoryModule = InventoryModule;
