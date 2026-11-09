// public/js/hud.js

const HudModule = (() => {
    let elements = {
        wood: null,
        stone: null,
        charName: null,
        healthBar: null
    };

    function init() {
        elements.wood = document.getElementById('ui-wood');
        elements.stone = document.getElementById('ui-stone');
        elements.charName = document.getElementById('hud-char-name');
        elements.healthBar = document.getElementById('hud-health-bar');
    }

    function updateResources(resources) {
        if (!resources) return;
        
        if (elements.wood && resources.wood !== undefined) {
            elements.wood.innerText = resources.wood;
        }
        if (elements.stone && resources.stone !== undefined) {
            elements.stone.innerText = resources.stone;
        }
    }

    function updatePlayerInfo(name, alienRace, level) {
        if (elements.charName) {
            const raceStr = alienRace ? alienRace.toUpperCase() : 'HUMAN';
            const lvlStr = level !== undefined ? level : 0;
            elements.charName.innerText = `${name || 'Héroe'} [${raceStr}] (Lv.${lvlStr})`;
        }
    }

    function showNotification(message, type = 'info') {
        // Opcional: Crear un contenedor flotante para alertas en tiempo real del servidor
        console.log(`[HUD Notification]: ${message}`);
    }

    return {
        init,
        updateResources,
        updatePlayerInfo,
        showNotification
    };
})();

window.HudModule = HudModule;
