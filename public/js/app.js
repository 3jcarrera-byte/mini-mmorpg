const App = {
    changeScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
        
        // CORRECCIÓN: Primero se hace visible el HTML, luego Three.js calcula el espacio real
        if (screenId === 'screen-character') {
            setTimeout(() => {
                CharacterCreator.init();
            }, 50); // Pequeña pausa milimétrica para evitar renderizar en un contenedor de 0px
        }
    }
};
