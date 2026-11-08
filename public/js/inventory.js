// Módulo de Inventario con Stacks de 100, División de Ítems, Drag & Drop y Cierre por Movimiento (inventory.js)
const InventoryModule = (() => {
    const maxSlots = 20;
    const maxStackSize = 100;
    let items = Array(maxSlots).fill(null);
    
    // Inicialización por defecto de muestra
    items[0] = { id: 1, type: 'wood', name: 'Madera', count: 100, icon: '🪵', color: '#e67e22' };
    items[1] = { id: 2, type: 'stone', name: 'Piedra', count: 25, icon: '🪨', color: '#95a5a6' };

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
            btnToggle.onmouseover = () => { btnToggle.style.background = 'rgba(25, 30, 40, 0.85)'; };
            btnToggle.onmouseout = () => { btnToggle.style.background = 'rgba(15, 17, 23, 0.5)'; };
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
            background: rgba(15, 17, 23, 0.88); 
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
                <span>Arrastra • <strong style="color: rgba(255,255,255,0.8);">Clic der.</strong> dividir</span>
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
                user-select: none;
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
                    const sourceItem = items[sourceIndex];
                    const targetItem = items[targetIndex];

                    // Si ambos son del mismo tipo y no están al máximo, intentar fusionar stacks
                    if (sourceItem && targetItem && sourceItem.type === targetItem.type && targetItem.count < maxStackSize) {
                        let totalCount = targetItem.count + sourceItem.count;
                        if (totalCount <= maxStackSize) {
                            targetItem.count = totalCount;
                            items[sourceIndex] = null;
                        } else {
                            targetItem.count = maxStackSize;
                            sourceItem.count = totalCount - maxStackSize;
                        }
                    } else {
                        // Intercambio normal de ranuras
                        items[sourceIndex] = targetItem;
                        items[targetIndex] = sourceItem;
                    }
                    renderGrid();
                }
            });

            // 🌟 Clic derecho para dividir stack de ítems
            slot.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                if (slotItem && slotItem.count > 1) {
                    openSplitModal(i, slotItem);
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

    // 🌟 Ventana flotante interactiva para elegir la cantidad exacta a dividir
    function openSplitModal(index, item) {
        if (document.getElementById('split-dialog')) return;

        const container = document.getElementById('inventory-modal');
        if (!container) return;

        const maxSplit = item.count - 1;
        let splitValue = Math.floor(item.count / 2);

        const dialog = document.createElement('div');
        dialog.id = 'split-dialog';
        dialog.style.cssText = `
            position: absolute; inset: 0; background: rgba(10, 12, 18, 0.92);
            border-radius: 14px; display: flex; flex-direction: column; 
            align-items: center; justify-content: center; padding: 20px; z-index: 300;
        `;

        dialog.innerHTML = `
            <h4 style="margin: 0 0 10px 0; font-size: 13px; color: #00ffcc;">DIVIDIR ${item.name.toUpperCase()}</h4>
            <div style="font-size: 24px; margin-bottom: 10px;">${item.icon}</div>
            <input type="range" id="split-range" min="1" max="${maxSplit}" value="${splitValue}" style="width: 80%; cursor: pointer; accent-color: #00ffcc; margin-bottom: 10px;">
            <div style="font-size: 14px; margin-bottom: 15px;">Cantidad: <strong id="split-val-text" style="color: #00ffcc;">${splitValue}</strong></div>
            <div style="display: flex; gap: 10px;">
                <button id="btn-confirm-split" style="background: #00ffcc; color: #000; border: none; padding: 6px 14px; border-radius: 6px; font-weight: bold; cursor: pointer; font-family: monospace;">Dividir</button>
                <button id="btn-cancel-split" style="background: rgba(255,255,255,0.1); color: #fff; border: none; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-family: monospace;">Cancelar</button>
            </div>
        `;

        container.appendChild(dialog);

        const rangeInput = dialog.querySelector('#split-range');
        const valText = dialog.querySelector('#split-val-text');

        rangeInput.oninput = (e) => {
            splitValue = parseInt(e.target.value, 10);
            valText.innerText = splitValue;
        };

        dialog.querySelector('#btn-confirm-split').onclick = (e) => {
            e.stopPropagation();
            executeSplit(index, splitValue);
            dialog.remove();
        };

        dialog.querySelector('#btn-cancel-split').onclick = (e) => {
            e.stopPropagation();
            dialog.remove();
        };
    }

    function executeSplit(fromIndex, splitAmount) {
        let emptyIndex = items.findIndex((slot, idx) => idx !== fromIndex && slot === null);
        if (emptyIndex === -1) {
            console.log("Inventario lleno, no se puede dividir.");
            return;
        }

        let sourceItem = items[fromIndex];
        if (!sourceItem || sourceItem.count <= splitAmount) return;

        sourceItem.count -= splitAmount;

        items[emptyIndex] = {
            id: Date.now(),
            type: sourceItem.type,
            name: sourceItem.name,
            count: splitAmount,
            icon: sourceItem.icon,
            color: sourceItem.color
        };

        renderGrid();
    }

    // 🌟 Añadir ítems respetando rigurosamente el límite de 100 por stack y creando nuevas pilas si se llena
    function addItem(type, amount) {
        let remaining = amount;
        const icons = { wood: '🪵', stone: '🪨' };
        const colors = { wood: '#e67e22', stone: '#bdc3c7' };

        // 1. Rellenar pilas existentes del mismo tipo que no alcancen 100
        for (let i = 0; i < maxSlots && remaining > 0; i++) {
            let slot = items[i];
            if (slot && slot.type === type && slot.count < maxStackSize) {
                let spaceInStack = maxStackSize - slot.count;
                let addNow = Math.min(remaining, spaceInStack);
                slot.count += addNow;
                remaining -= addNow;
            }
        }

        // 2. Colocar el sobrante en ranuras vacías creando nuevos stacks de hasta 100
        while (remaining > 0) {
            let emptyIndex = items.findIndex(slot => slot === null);
            if (emptyIndex === -1) {
                console.log("¡Inventario lleno! No cabe todo el recurso.");
                break;
            }

            let addNow = Math.min(remaining, maxStackSize);
            items[emptyIndex] = {
                id: Date.now() + Math.random(),
                type: type,
                name: type.charAt(0).toUpperCase() + type.slice(1),
                count: addNow,
                icon: icons[type] || '📦',
                color: colors[type] || '#ffffff'
            };
            remaining -= addNow;
        }

        renderGrid();
    }

    // Organizar y fusionar automáticamente agrupando por tipo
    function autoSortInventory() {
        let allValidItems = [];
        items.forEach(slot => {
            if (slot && slot.count > 0) {
                allValidItems.push(slot);
            }
        });

        // Agrupar por tipo de ítem sumando conteos
        let mergedMap = {};
        allValidItems.forEach(item => {
            if (!mergedMap[item.type]) {
                mergedMap[item.type] = { ...item, count: 0 };
            }
            mergedMap[item.type].count += item.count;
        });

        items = Array(maxSlots).fill(null);
        let currentIndex = 0;

        // Redistribuir respetando el máximo de 100 por stack
        Object.values(mergedMap).forEach(itemData => {
            let rem = itemData.count;
            while (rem > 0 && currentIndex < maxSlots) {
                let chunk = Math.min(rem, maxStackSize);
                items[currentIndex] = {
                    ...itemData,
                    id: Date.now() + Math.random(),
                    count: chunk
                };
                rem -= chunk;
                currentIndex++;
            }
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
