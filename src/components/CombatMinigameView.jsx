import React, { useState, useEffect, useRef, useCallback } from 'react';

const MAP_WIDTH = 300;
const MAP_HEIGHT = 200;
const UNIT_SIZE = 10;
const PLAYER_SPEED = 2;
const ENEMY_SPEED = 0.5;
const ATTACK_RANGE = 15; // Pixel distance for attack
const ATTACK_DAMAGE_DISPLAY_TIME = 500; // ms
const ENEMY_RESPAWN_DELAY = 3000; // ms (3 seconds)
const ENEMY_DEATH_FADE_TIME = 300; // ms

// Simple unique ID generator for units
let unitIdCounter = 0;
const generateUnitId = () => `unit-${unitIdCounter++}`;

// Map class to color for visualization
const CLASS_COLORS = {
    Warrior: 'royalblue',
    Archer: 'seagreen',
    Wizard: 'mediumpurple',
    Farmer: 'saddlebrown',
    default: 'grey'
};

function CombatMinigameView({ city, zoneData, lastOutcome, assignedHero }) {
    const [playerUnit, setPlayerUnit] = useState(null);
    const [enemyUnits, setEnemyUnits] = useState([]);
    const [damageNumbers, setDamageNumbers] = useState([]); // { id, text, x, y, timestamp }
    const [respawnQueue, setRespawnQueue] = useState([]); // [{ id: string, template: object, respawnTime: number }]
    const animationFrameRef = useRef();
    const lastUpdateTimeRef = useRef(Date.now());

    // --- Initialization and Reset ---
    useEffect(() => {
        if (!zoneData || !city || !assignedHero) {
            setPlayerUnit(null);
            setEnemyUnits([]);
            setRespawnQueue([]);
            return;
        }
        
        // Initialize Player Unit based on Hero
        setPlayerUnit({
            id: assignedHero.id, // Use hero ID
            x: MAP_WIDTH / 2,
            y: MAP_HEIGHT - UNIT_SIZE * 2,
            targetId: null, 
            maxHp: 100, // Still visual placeholder
            currentHp: 100,
            // Store hero info for display/styling
            name: assignedHero.name,
            level: assignedHero.level,
            class: assignedHero.class || 'default',
        });

        // Initialize Enemy Units
        const monsterTemplate = zoneData.monsters[0]; // Use first monster type for now
        const numEnemies = 10 + Math.floor(Math.random() * 11); // 10-20 enemies
        const initialEnemies = [];
        for (let i = 0; i < numEnemies; i++) {
            initialEnemies.push({
                id: generateUnitId(),
                x: Math.random() * (MAP_WIDTH - UNIT_SIZE),
                y: Math.random() * (MAP_HEIGHT * 0.6), // Spawn in upper part
                template: monsterTemplate,
                maxHp: monsterTemplate.hp,
                currentHp: monsterTemplate.hp,
                wanderTargetX: Math.random() * (MAP_WIDTH - UNIT_SIZE), // For wandering
                wanderTargetY: Math.random() * (MAP_HEIGHT * 0.6),
            });
        }
        setEnemyUnits(initialEnemies);
        unitIdCounter = 0; // Reset counter for next time
        setDamageNumbers([]);
        setRespawnQueue([]); // Clear queue on reset

    }, [city, zoneData, assignedHero]); // Add assignedHero dependency


    // --- Handle Last Combat Outcome ---
    useEffect(() => {
        if (!lastOutcome || !playerUnit) return;

        // Player Damage visualization
        if (lastOutcome.damageTaken > 0) {
            // Reduce visual HP slightly - this is just illustrative
            setPlayerUnit(p => ({ ...p, currentHp: Math.max(0, p.currentHp - lastOutcome.damageTaken * 5) })); // Scale damage for visual effect
             addDamageNumber(
                `-${lastOutcome.damageTaken}`,
                playerUnit.x + UNIT_SIZE / 2,
                playerUnit.y - 5,
                'red' // Player taking damage
             );
        } else {
             // Heal player slightly if no damage taken? Optional visual flair
             setPlayerUnit(p => ({ ...p, currentHp: Math.min(p.maxHp, p.currentHp + 1) }));
        }

        // Enemy Defeat visualization
        if (lastOutcome.victory && playerUnit.targetId) {
            const targetEnemyIndex = enemyUnits.findIndex(e => e.id === playerUnit.targetId);
            if (targetEnemyIndex !== -1) {
                const targetEnemy = enemyUnits[targetEnemyIndex];
                 // Show damage number
                 addDamageNumber(
                    `-${lastOutcome.damageDealt}`,
                    targetEnemy.x + UNIT_SIZE / 2,
                    targetEnemy.y - 5,
                    'white' 
                 );
                 
                 // Mark the enemy as dying instead of immediate removal
                 setEnemyUnits(prevEnemies => {
                     const newEnemies = [...prevEnemies];
                     newEnemies[targetEnemyIndex] = {
                         ...newEnemies[targetEnemyIndex],
                         isDying: true,
                         deathTimestamp: Date.now()
                     };
                     return newEnemies;
                 });
                 
                 // Player will retarget in the loop
            }
        }

    }, [lastOutcome]); // Depend on the outcome of the *last* game tick

    // --- Animation Loop ---
    const gameLoop = useCallback(() => {
        const now = Date.now();
        const deltaTime = (now - lastUpdateTimeRef.current) / 1000; // Time in seconds
        lastUpdateTimeRef.current = now;

        let currentEnemies = [...enemyUnits]; // Start with current active enemies
        let playerNeedsRetarget = false;

        // --- Process Dying Enemies ---
        const nextEnemyUnits = [];
        const newlyQueuedForRespawn = [];
        currentEnemies.forEach(enemy => {
            if (enemy.isDying) {
                if (now - enemy.deathTimestamp >= ENEMY_DEATH_FADE_TIME) {
                    // Death animation finished, queue for respawn
                    newlyQueuedForRespawn.push({
                        id: enemy.id, 
                        template: enemy.template,
                        respawnTime: Date.now() + ENEMY_RESPAWN_DELAY
                    });
                    if(playerUnit?.targetId === enemy.id) {
                        playerNeedsRetarget = true; // Player's target fully removed
                    }
                } else {
                    // Still dying, keep it for rendering fade effect
                    nextEnemyUnits.push(enemy); 
                }
            } else {
                // Not dying, keep it
                nextEnemyUnits.push(enemy);
            }
        });
        
        // Add newly queued enemies to the respawn queue state
        if (newlyQueuedForRespawn.length > 0) {
            setRespawnQueue(prev => [...prev, ...newlyQueuedForRespawn]);
        }

        // --- Respawn Logic ---
        const newlyRespawned = [];
        const remainingRespawnQueue = [];
        respawnQueue.forEach(entry => {
            if (now >= entry.respawnTime) {
                newlyRespawned.push({
                    id: entry.id, // Reuse ID or generate new: generateUnitId()
                    x: Math.random() * (MAP_WIDTH - UNIT_SIZE),
                    y: Math.random() * (MAP_HEIGHT * 0.2), // Respawn near top
                    template: entry.template,
                    maxHp: entry.template.hp,
                    currentHp: entry.template.hp,
                    wanderTargetX: Math.random() * (MAP_WIDTH - UNIT_SIZE),
                    wanderTargetY: Math.random() * (MAP_HEIGHT * 0.6),
                });
            } else {
                remainingRespawnQueue.push(entry);
            }
        });
        if (newlyRespawned.length > 0) {
            setRespawnQueue(remainingRespawnQueue);
            nextEnemyUnits.push(...newlyRespawned); 
        }
        
        // --- Update Logic ---
        // Use the list after processing dying and respawns
        currentEnemies = nextEnemyUnits; 

        if (!playerUnit || currentEnemies.length === 0) {
             animationFrameRef.current = requestAnimationFrame(gameLoop);
            return; 
        }
        
        let newPlayer = { ...playerUnit };
        // Filter out dying enemies for AI targeting/movement calculations
        const activeEnemies = currentEnemies.filter(e => !e.isDying);

        const updatedEnemies = currentEnemies.map(enemy => {
            if (enemy.isDying) return enemy; // Don't update dying enemies
            
            // Enemy Wandering
            const dxWander = enemy.wanderTargetX - enemy.x;
            const dyWander = enemy.wanderTargetY - enemy.y;
            const distWander = Math.sqrt(dxWander * dxWander + dyWander * dyWander);

            if (distWander < ENEMY_SPEED * 5) { // Close enough to wander target
                 enemy.wanderTargetX = Math.random() * (MAP_WIDTH - UNIT_SIZE);
                 enemy.wanderTargetY = Math.random() * (MAP_HEIGHT * 0.6);
            } else {
                 enemy.x += (dxWander / distWander) * ENEMY_SPEED;
                 enemy.y += (dyWander / distWander) * ENEMY_SPEED;
            }
            // Clamp enemy position
            enemy.x = Math.max(0, Math.min(MAP_WIDTH - UNIT_SIZE, enemy.x));
            enemy.y = Math.max(0, Math.min(MAP_HEIGHT - UNIT_SIZE, enemy.y));

            return enemy;
        });

        // Player Logic: Find target and move
        const currentTargetIsActive = activeEnemies.some(e => e.id === newPlayer.targetId);
        
        if (playerNeedsRetarget || !newPlayer.targetId || !currentTargetIsActive) {
            // Find nearest *active* enemy 
            let minDist = Infinity;
            let nearestEnemyId = null;
            activeEnemies.forEach(enemy => {
                const dx = enemy.x - newPlayer.x;
                const dy = enemy.y - newPlayer.y;
                const dist = dx * dx + dy * dy; 
                if (dist < minDist) {
                    minDist = dist;
                    nearestEnemyId = enemy.id;
                }
            });
            newPlayer.targetId = nearestEnemyId;
        }

        // Move towards target if one exists
        const targetEnemy = activeEnemies.find(e => e.id === newPlayer.targetId);
        if (targetEnemy) {
            const dx = targetEnemy.x - newPlayer.x;
            const dy = targetEnemy.y - newPlayer.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > ATTACK_RANGE) { // Move if not in range
                newPlayer.x += (dx / dist) * PLAYER_SPEED;
                newPlayer.y += (dy / dist) * PLAYER_SPEED;
                 // Clamp player position
                newPlayer.x = Math.max(0, Math.min(MAP_WIDTH - UNIT_SIZE, newPlayer.x));
                newPlayer.y = Math.max(0, Math.min(MAP_HEIGHT - UNIT_SIZE, newPlayer.y));
            } else {
                // In range - Attack animation could trigger here, but actual damage/victory
                // is based on lastOutcome prop from the main game loop.
                // We *show* the attack number based on lastOutcome.
            }
        }

        // --- Update State ---
        setPlayerUnit(newPlayer);
        setEnemyUnits(updatedEnemies);

        // Remove old damage numbers
        setDamageNumbers(prev => prev.filter(dn => now - dn.timestamp < ATTACK_DAMAGE_DISPLAY_TIME));

        // Continue loop
        animationFrameRef.current = requestAnimationFrame(gameLoop);

    }, [playerUnit, enemyUnits, respawnQueue]); // Added respawnQueue dependency here

    useEffect(() => {
        // Start the animation loop
        lastUpdateTimeRef.current = Date.now();
        animationFrameRef.current = requestAnimationFrame(gameLoop);

        // Cleanup function to stop the loop when the component unmounts or dependencies change
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [gameLoop]); // Rerun setup if gameLoop function identity changes


     // Helper to add damage numbers
    const addDamageNumber = (text, x, y, color = 'white') => {
        const id = generateUnitId(); // Reuse for unique key
        setDamageNumbers(prev => [...prev, { id, text, x, y, color, timestamp: Date.now() }]);
    };


    // --- Rendering ---
    if (!zoneData || !city || !playerUnit) {
        return <div>Assign a hero and zone to visualize combat...</div>;
    }

    const playerColor = CLASS_COLORS[playerUnit.class] || CLASS_COLORS.default;

    const renderHealthBar = (unit) => {
        const percent = Math.max(0, (unit.currentHp / unit.maxHp) * 100);
        return (
            <div style={{
                position: 'absolute',
                top: '-8px', // Position above unit
                left: '0px',
                width: `${UNIT_SIZE}px`,
                height: '3px',
                backgroundColor: '#555',
                borderRadius: '1px',
                overflow: 'hidden',
            }}>
                <div style={{
                    width: `${percent}%`,
                    height: '100%',
                    backgroundColor: percent > 50 ? 'green' : percent > 20 ? 'orange' : 'red',
                    transition: 'width 0.1s linear' // Smooth health decrease
                }}></div>
            </div>
        );
    };

    return (
        <div className="combat-minigame" style={{
            width: `${MAP_WIDTH}px`,
            height: `${MAP_HEIGHT}px`,
            border: '1px solid grey',
            backgroundColor: '#282c34', // Dark background
            position: 'relative', // For absolute positioning of units
            overflow: 'hidden',
            marginTop: '10px'
        }}>
            {/* Render Player */}
            <div style={{
                 position: 'absolute',
                 left: `${playerUnit.x}px`,
                 top: `${playerUnit.y}px`,
                 width: `${UNIT_SIZE}px`,
                 height: `${UNIT_SIZE}px`,
                 backgroundColor: playerColor, // Use class color
                 borderRadius: '2px',
                 transition: 'left 0.05s linear, top 0.05s linear',
                 zIndex: 1 // Ensure player is above enemies if overlapping
            }}>
                 {renderHealthBar(playerUnit)}
                 {/* Display Hero Name/Level */}
                 <div style={{
                     position: 'absolute',
                     top: '-20px', 
                     left: '50%',
                     transform: 'translateX(-50%)',
                     fontSize: '9px',
                     color: 'white',
                     whiteSpace: 'nowrap'
                 }}>
                    {playerUnit.name} L{playerUnit.level}
                 </div>
            </div>

            {/* Render Enemies (with fade effect for dying) */}
            {enemyUnits.map(enemy => {
                const dyingStyle = enemy.isDying ? { 
                    opacity: 1 - Math.min(1, (Date.now() - enemy.deathTimestamp) / ENEMY_DEATH_FADE_TIME),
                    transition: `opacity ${ENEMY_DEATH_FADE_TIME}ms linear` 
                } : {};
                return (
                    <div key={enemy.id} style={{
                        position: 'absolute',
                        left: `${enemy.x}px`,
                        top: `${enemy.y}px`,
                        width: `${UNIT_SIZE}px`,
                        height: `${UNIT_SIZE}px`,
                        backgroundColor: 'red',
                        borderRadius: '2px',
                        transition: 'left 0.1s linear, top 0.1s linear',
                        ...dyingStyle // Apply fading styles
                    }}>
                        {renderHealthBar(enemy)}
                     </div>
                );
            })}

            {/* Render Damage Numbers */}
             {damageNumbers.map(dn => (
                <div key={dn.id} style={{
                    position: 'absolute',
                    left: `${dn.x}px`,
                    top: `${dn.y}px`,
                    fontSize: '10px',
                    fontWeight: 'bold',
                    color: dn.color,
                    pointerEvents: 'none', // Prevent interaction
                    transition: 'top 0.5s ease-out, opacity 0.5s ease-out', // Float up and fade
                    opacity: 0.8, // Start slightly transparent
                    transform: 'translate(-50%, -100%)' // Center above point, move up
                }}>
                    {dn.text}
                 </div>
             ))}
        </div>
    );
}

export default CombatMinigameView; 