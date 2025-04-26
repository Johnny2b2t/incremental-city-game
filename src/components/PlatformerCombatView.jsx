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

// Simple unique ID generator
let enemyIdCounter = 0;
const generateEnemyId = () => `enemy-${enemyIdCounter++}`;

function PlatformerCombatView({ city, zoneData, lastOutcome, assignedHero }) {
    // --- Player State ---
    const [playerPos, setPlayerPos] = useState({ x: MAP_WIDTH / 2, y: MAP_HEIGHT - 50 });
    const [playerVel, setPlayerVel] = useState({ x: 0, y: 0 });
    const [isOnGround, setIsOnGround] = useState(false);
    const [playerTookDamage, setPlayerTookDamage] = useState(false); // For visual flash

    // --- Input State ---
    const keysPressed = useRef({});

    // --- Enemy State ---
    const [enemies, setEnemies] = useState([]); // { id, x, y, width, height, platformId, direction, template, currentHp }

    // --- Game Loop Refs ---
    const animationFrameRef = useRef();
    const lastUpdateTimeRef = useRef(Date.now());

    // --- Initialization ---
    useEffect(() => {
        if (!zoneData || !assignedHero) {
            setEnemies([]);
            return;
        }
        
        // Reset player position maybe?
        setPlayerPos({ x: MAP_WIDTH / 2, y: MAP_HEIGHT - 50 });
        setPlayerVel({ x: 0, y: 0 });
        setIsOnGround(false);

        // Initialize Enemies
        const monsterTemplate = zoneData.monsters[0];
        const numEnemies = 5 + Math.floor(Math.random() * 6); // 5-10 enemies for platformer
        const initialEnemies = [];
        enemyIdCounter = 0;

        for (let i = 0; i < numEnemies; i++) {
            const platform = platforms[Math.floor(Math.random() * platforms.length)]; // Pick a random platform
            const startX = platform.x + Math.random() * (platform.width - ENEMY_WIDTH); // Random x on platform
            const startY = platform.y - ENEMY_HEIGHT; // Place on top of platform
            
            initialEnemies.push({
                id: generateEnemyId(),
                x: startX,
                y: startY,
                width: ENEMY_WIDTH,
                height: ENEMY_HEIGHT,
                platformId: platform.id,
                direction: Math.random() < 0.5 ? 1 : -1, // Start moving left or right
                template: monsterTemplate,
                currentHp: monsterTemplate.hp, // Track visual HP later
                maxHp: monsterTemplate.hp
            });
        }
        setEnemies(initialEnemies);

    }, [zoneData, assignedHero]); // Re-initialize if zone or hero changes

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

    // --- Enemy Click Handler ---
    const handleEnemyClick = (enemyId) => {
        console.log(`Player clicked on enemy: ${enemyId}`);
        // TODO: Trigger player attack animation/logic towards this enemy
        // Note: Actual damage dealt still comes from the main game loop via lastOutcome
    };

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

        // --- Update Enemies --- 
        const updatedEnemies = enemies.map(enemy => {
            let newEnemyX = enemy.x + enemy.direction * ENEMY_MOVE_SPEED;
            let newDirection = enemy.direction;
            const platform = platforms.find(p => p.id === enemy.platformId);

            // Check platform boundaries
            if (platform) {
                if (newEnemyX <= platform.x || newEnemyX + enemy.width >= platform.x + platform.width) {
                    newDirection *= -1; // Reverse direction
                    // Clamp position slightly to prevent getting stuck
                    newEnemyX = Math.max(platform.x, Math.min(platform.x + platform.width - enemy.width, newEnemyX));
                }
            } else {
                 // Enemy fell off somehow? Remove or reset? For now, keep going.
            }

            return { ...enemy, x: newEnemyX, direction: newDirection };
        });

        // --- Player-Enemy Collision Detection ---
        let tookDamageThisFrame = false;
        for (const enemy of updatedEnemies) {
            const hit = newPos.x < enemy.x + enemy.width &&
                       newPos.x + PLAYER_WIDTH > enemy.x &&
                       newPos.y < enemy.y + enemy.height &&
                       newPos.y + PLAYER_HEIGHT > enemy.y;
            
            if (hit) {
                console.log(`Player collided with enemy ${enemy.id}!`);
                tookDamageThisFrame = true;
                 // TODO: Implement player damage effect (e.g., reduce visual HP, apply knockback?)
                 // Maybe use lastOutcome.damageTaken from main loop for consistency?
                break; // Only take damage from one enemy per frame
            }
        }
        // Trigger visual flash for player damage
        if (tookDamageThisFrame && !playerTookDamage) { // Check !playerTookDamage to prevent constant flashing
             setPlayerTookDamage(true);
             setTimeout(() => setPlayerTookDamage(false), 150); // Flash duration
        }

        // --- Update State --- 
        setPlayerPos(newPos);
        setPlayerVel(newVel);
        setIsOnGround(onGround);
        setEnemies(updatedEnemies);
        
        // Continue loop
        animationFrameRef.current = requestAnimationFrame(gameLoop);
    }, [playerPos, playerVel, enemies, playerTookDamage]); // Add enemies & playerTookDamage

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
                 backgroundColor: playerTookDamage ? 'red' : 'darkblue', // Flash red on hit
                 // TODO: Add player sprite later
            }}>
                 {/* TODO: Add health bar? Name tag? */} 
            </div>

            {/* Render Enemies */}
            {enemies.map(enemy => (
                <div 
                    key={enemy.id} 
                    onClick={() => handleEnemyClick(enemy.id)} // Add click handler
                    style={{
                        position: 'absolute',
                        left: `${enemy.x}px`,
                        top: `${enemy.y}px`,
                        width: `${enemy.width}px`,
                        height: `${enemy.height}px`,
                        backgroundColor: 'darkred',
                        cursor: 'pointer', // Indicate clickable
                        // TODO: Add enemy sprite later
                    }}
                >
                    {/* TODO: Enemy health bar? */} 
                </div>
            ))}
            
        </div>
    );
}

export default PlatformerCombatView; 