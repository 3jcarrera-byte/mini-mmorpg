// --- DETECTOR DE COLISIONES CORREGIDO Y FLUIDO ---
    checkCollision(nextPos, currentAltitude) {
        if (typeof WorldModule === 'undefined') return false;
        
        let obstacles = [];
        if (typeof WorldModule.getObstacles === 'function') {
            obstacles = WorldModule.getObstacles();
        } else if (WorldModule.colliders) {
            obstacles = WorldModule.colliders;
        }

        if (!obstacles || obstacles.length === 0) return false;

        const playerRadius = this.localPlayer.radius; // 0.2
        const currentPlayerPos = this.localPlayer.position;

        for (let i = 0; i < obstacles.length; i++) {
            const obs = obstacles[i];
            const obsPos = obs.position || obs; 
            if (!obsPos) continue;

            // Distancia horizontal real sobre la superficie esférica
            const dist = nextPos.distanceTo(obsPos);
            const currentDist = currentPlayerPos.distanceTo(obsPos);
            
            const obstacleRadius = obs.radius || 0.22; 
            const obstacleHeight = obs.height || 0.6;

            // Si hay solapamiento y la altitud es menor a la altura del objeto
            if (dist < (playerRadius + obstacleRadius)) {
                if (currentAltitude < obstacleHeight) {
                    // Permitir escapar si el jugador se está alejando (currentDist > dist significa que se está acercando más)
                    // Si se aleja (currentDist < dist), permitimos el movimiento para que no quede atascado.
                    if (dist >= currentDist) {
                        return false; // ¡Permite salir del obstáculo!
                    }
                    return true; // Bloquea solo si intenta meterse más
                }
            }
        }
        return false;
    },
