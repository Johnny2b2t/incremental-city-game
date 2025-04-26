import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Constants --- 
const MAP_WIDTH = 400; // Wider map
const MAP_HEIGHT = 250;
const PLAYER_WIDTH = 15;
const PLAYER_HEIGHT = 25;
const ENEMY_WIDTH = 15;
const ENEMY_HEIGHT = 15;

const GRAVITY = 0.5;
const JUMP_FORCE = -10;
const PLAYER_MOVE_SPEED = 3;
const ENEMY_MOVE_SPEED = 0.5;

// --- Basic Platform Definition --- 
// TODO: Load this based on zoneData later
const platforms = [
    { id: 'p1', x: 0, y: MAP_HEIGHT - 20, width: MAP_WIDTH, height: 20 }, // Ground
    { id: 'p2', x: 50, y: MAP_HEIGHT - 80, width: 100, height: 10 },
    { id: 'p3', x: 200, y: MAP_HEIGHT - 130, width: 150, height: 10 },
];

function PlatformerCombatView({ city, zoneData, lastOutcome, assignedHero }) {
    // --- Player State ---
    const [playerPos, setPlayerPos] = useState({ x: MAP_WIDTH / 2, y: MAP_HEIGHT - 50 });
    const [playerVel, setPlayerVel] = useState({ x: 0, y: 0 });
    const [isOnGround, setIsOnGround] = useState(false);

    // --- Input State ---
    const keysPressed = useRef({});

    // --- Enemy State (Placeholder) ---
    const [enemies, setEnemies] = useState([]); // We'll add enemies later

    // --- Game Loop Refs ---
    const animationFrameRef = useRef();
    const lastUpdateTimeRef = useRef(Date.now());

    // --- Input Handlers ---
    useEffect(() => {
        const handleKeyDown = (e) => { keysPressed.current[e.key.toLowerCase()] = true; };
        const handleKeyUp = (e) => { keysPressed.current[e.key.toLowerCase()] = false; };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    // --- Game Loop --- 
    const gameLoop = useCallback(() => {
        const now = Date.now();
        const deltaTime = Math.min(0.05, (now - lastUpdateTimeRef.current) / 1000); // Delta time in seconds, capped
        lastUpdateTimeRef.current = now;

        // --- Update Player --- 
        let newVel = { ...playerVel };
        let newPos = { ...playerPos };
        let onGround = false;

        // Horizontal Movement
        newVel.x = 0;
        if (keysPressed.current['a'] || keysPressed.current['arrowleft']) {
            newVel.x = -PLAYER_MOVE_SPEED;
        } else if (keysPressed.current['d'] || keysPressed.current['arrowright']) {
            newVel.x = PLAYER_MOVE_SPEED;
        }
        newPos.x += newVel.x;

        // Apply Gravity
        newVel.y += GRAVITY;

        // Apply Vertical Velocity
        newPos.y += newVel.y;

        // Collision Detection (Platforms - Simple Vertical)
        for (const platform of platforms) {
            // Check if player is horizontally overlapping the platform
            const horizontalOverlap = newPos.x < platform.x + platform.width &&
                                    newPos.x + PLAYER_WIDTH > platform.x;
            // Check if player was above platform last frame and is now intersecting or below this frame
            const verticalCheck = playerPos.y + PLAYER_HEIGHT <= platform.y && // Was above
                                newPos.y + PLAYER_HEIGHT >= platform.y;  // Now intersecting or below

            if (horizontalOverlap && verticalCheck) {
                 // Collision detected! Place player on top of platform
                 newPos.y = platform.y - PLAYER_HEIGHT;
                 newVel.y = 0; // Stop vertical movement
                 onGround = true;
                 break; // Stop checking after first collision
            }
        }

         // Jumping
         if (onGround && (keysPressed.current['w'] || keysPressed.current['arrowup'] || keysPressed.current[' '])) {
            newVel.y = JUMP_FORCE;
            onGround = false;
        }

        // --- Boundary Checks ---
        newPos.x = Math.max(0, Math.min(MAP_WIDTH - PLAYER_WIDTH, newPos.x));
        // Allow falling off screen bottom for now (or add check: MAP_HEIGHT - PLAYER_HEIGHT)
        if (newPos.y > MAP_HEIGHT) {
             // Respawn or handle death? Reset for now.
             newPos = { x: MAP_WIDTH / 2, y: MAP_HEIGHT - 50 };
             newVel = { x: 0, y: 0 };
             onGround = false;
        }

        // --- Update State --- 
        setPlayerPos(newPos);
        setPlayerVel(newVel);
        setIsOnGround(onGround);

        // --- TODO: Update Enemies --- 
        
        // Continue loop
        animationFrameRef.current = requestAnimationFrame(gameLoop);
    }, [playerPos, playerVel]); // Dependencies

    // --- Loop Initialization ---
    useEffect(() => {
        lastUpdateTimeRef.current = Date.now();
        animationFrameRef.current = requestAnimationFrame(gameLoop);
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [gameLoop]);

    // --- Rendering ---
    if (!assignedHero) { // Need hero for the player representation
         return <div>Assign a hero to engage in combat...</div>;
    }

    return (
        <div className="platformer-combat-view" style={{
            width: `${MAP_WIDTH}px`,
            height: `${MAP_HEIGHT}px`,
            border: '1px solid black',
            backgroundColor: '#d0e4f0', // Light blue sky
            position: 'relative',
            overflow: 'hidden',
            marginTop: '10px'
        }}>
            {/* Render Platforms */}
            {platforms.map(p => (
                <div key={p.id} style={{
                    position: 'absolute',
                    left: `${p.x}px`,
                    top: `${p.y}px`,
                    width: `${p.width}px`,
                    height: `${p.height}px`,
                    backgroundColor: '#8b4513' // Brown
                }}></div>
            ))}

            {/* Render Player */}
            <div style={{
                 position: 'absolute',
                 left: `${playerPos.x}px`,
                 top: `${playerPos.y}px`,
                 width: `${PLAYER_WIDTH}px`,
                 height: `${PLAYER_HEIGHT}px`,
                 backgroundColor: 'darkblue', 
                 // TODO: Add player sprite later
            }}>
                 {/* TODO: Add health bar? Name tag? */} 
            </div>

            {/* TODO: Render Enemies */}
            {/* TODO: Render Damage Numbers / Effects */} 
            
        </div>
    );
}

export default PlatformerCombatView; 