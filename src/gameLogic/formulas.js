import { RESOURCE_SKILL_MAP, SKILL_RESOURCES_MAP, COMBAT_ZONES, calculateHeroCombatStats, HERO_SKILLS } from './gameData';
// Import GAME_TICK_MS - we need it for hourly calc. 
// It's defined in App.jsx, maybe move it to gameData or config later?
// For now, hardcode assumption of 1000ms tick.
// const GAME_TICK_MS = 1000;

/**
 * Calculates the resources gained during a time delta for a given city based on its current task.
 * @param {object} city - The city object from gameState.
 * @param {object|null} assignedHero - The hero object assigned to the city, or null.
 * @param {object} playerSkills - The player's skills object from gameState.
 * @param {number} deltaTime - The time elapsed in seconds since the last calculation.
 * @returns {object} An object representing the resources gained (e.g., { coal: 0.5, wood: 0 }).
 */
export function calculateResourceGain(city, assignedHero, playerSkills, deltaTime) {
    const gains = {}; // Start with empty gains
    if (!city.currentTask || deltaTime <= 0) {
        return gains; // No task or no time passed, no gain
    }

    const taskKey = city.currentTask;
    const relevantSkill = RESOURCE_SKILL_MAP[taskKey];
    const skillData = SKILL_RESOURCES_MAP[relevantSkill]?.[taskKey];
    const playerSkillLevel = playerSkills[relevantSkill]?.level || 0;

    if (!relevantSkill || !skillData || !playerSkills[relevantSkill]) {
        console.error(`Invalid task or skill data for task: ${taskKey}`);
        return gains;
    }

    // Check level requirement
    if (playerSkillLevel < skillData.levelReq) {
        return gains;
    }

    // Base gain rate from the task definition (per second)
    let ratePerSecond = skillData.baseRate;

    // --- Apply Modifiers --- 
    const levelDifference = playerSkillLevel - skillData.levelReq;
    ratePerSecond *= (1 + levelDifference * 0.05); 
    ratePerSecond *= (1 + (city.level - 1) * 0.10);
    if (assignedHero && assignedHero.boosts) {
        const heroBoostKey = `${relevantSkill}Yield`; 
        if (assignedHero.boosts[heroBoostKey]) {
            ratePerSecond *= (1 + assignedHero.boosts[heroBoostKey]);
        }
    }

    // Calculate gain for the delta time
    gains[taskKey] = ratePerSecond * deltaTime;

    return gains;
}

/**
 * Calculates the XP gained during a time delta for the relevant skill based on the city's task.
 * @param {object} city - The city object from gameState.
 * @param {object|null} assignedHero - The hero object assigned to the city, or null.
 * @param {object} playerSkills - The player's skills object from gameState.
 * @param {number} deltaTime - The time elapsed in seconds since the last calculation.
 * @returns {number} The amount of XP gained for the relevant skill.
 */
export function calculateXPGain(city, assignedHero, playerSkills, deltaTime) {
    if (!city.currentTask || deltaTime <= 0) {
        return 0; // No task or no time passed, no XP
    }

    const taskKey = city.currentTask;
    const relevantSkill = RESOURCE_SKILL_MAP[taskKey];
    const skillData = SKILL_RESOURCES_MAP[relevantSkill]?.[taskKey];
    const playerSkillLevel = playerSkills[relevantSkill]?.level || 0;

    if (!relevantSkill || !skillData || !playerSkills[relevantSkill]) {
        return 0; // Invalid task or skill data
    }

    if (playerSkillLevel < skillData.levelReq) {
        return 0; 
    }

    // Base XP gain rate (per second)
    let xpRatePerSecond = skillData.xpGain;

    // Calculate XP gain for the delta time
    const xpAmount = xpRatePerSecond * deltaTime;

    return xpAmount;
}

/**
 * Simulates one tick of combat for a city in an assigned zone.
 * Uses hero stats calculated via calculateHeroCombatStats + city equipment.
 * @param {object} city - The city object.
 * @param {object} combatZone - The combat zone data from COMBAT_ZONES.
 * @param {object|null} assignedHero - The assigned hero object (with level, class, base stats).
 * @returns {object} An object describing the outcome: { victory: boolean, damageDealt: number, damageTaken: number, xpGained: number, lootGained: object, progressMade: number, heroXpGained: number }
 */
export function calculateCombatOutcome(city, combatZone, assignedHero) {
    const outcome = {
        victory: false,
        damageDealt: 0,
        damageTaken: 0,
        xpGained: 0,       // For player combat skill
        lootGained: {},
        progressMade: 0, 
        heroXpGained: 0    // XP specifically for the hero
    };

    if (!combatZone || !combatZone.monsters || combatZone.monsters.length === 0) {
        console.warn(`City ${city.id} assigned to invalid or empty zone.`);
        return outcome;
    }
    const monster = combatZone.monsters[0]; 

    // --- Calculate Base Hero Stats (including passives) ---
    const heroBaseStats = assignedHero ? calculateHeroCombatStats(assignedHero) : { attack: 0, defense: 0, magicAttack: 0 };
    
    // --- Determine Active Skill to Use (Simple: highest level learned active skill) ---
    let primarySkillKey = null;
    let primarySkillLevel = 0;
    let primarySkillData = null;
    if (assignedHero && assignedHero.learnedSkills) {
        for (const [skillKey, skillLevel] of Object.entries(assignedHero.learnedSkills)) {
            const skillData = HERO_SKILLS[skillKey];
            if (skillData?.effect?.type.includes('active') && skillLevel > primarySkillLevel) {
                primarySkillKey = skillKey;
                primarySkillLevel = skillLevel;
                primarySkillData = skillData;
            }
        }
    }

    // --- Calculate Total Combat Stats & Damage ---
    let totalAttack = city.combatStats.attack; // Equipment Attack
    let totalDefense = city.combatStats.defense + heroBaseStats.defense; // Equipment + Hero Defense
    let totalMagicAttack = 0 + heroBaseStats.magicAttack; // Equipment(0) + Hero Magic Attack
    
    let finalDamage = 0;

    if (primarySkillData) {
        // --- Damage Calculation based on Active Skill --- 
        console.log(`Using skill: ${primarySkillKey} Lvl ${primarySkillLevel}`);
        const effect = primarySkillData.effect;
        const statValue = assignedHero.stats[effect.stat] || 0; // STR, DEX, or INT value
        
        // Example: Skill damage = (Base Stat * Multiplier * Skill Level Mod) + Equipment Bonus
        // Adjust this formula as needed!
        const skillLevelMultiplier = 1 + (primarySkillLevel - 1) * 0.1; // +10% damage per level past 1
        const baseSkillDamage = statValue * effect.damageMultiplier * skillLevelMultiplier;

        if (effect.type === 'active_magic_attack') {
             // Apply magic attack from skill + hero base magic attack + equipment?
             // Let skill overwrite base magic attack for now
             finalDamage = Math.max(0, baseSkillDamage + city.combatStats.magicAttack - (monster.magicResist || 0));
        } else { // 'active_attack'
            // Apply physical attack from skill + equipment attack
            finalDamage = Math.max(0, baseSkillDamage + totalAttack - monster.defense);
        }
        // TODO: Implement status effects (stun chance, etc.)

    } else {
        // --- Damage Calculation based on Base Stats + Equipment (No Active Skill) ---
        totalAttack += heroBaseStats.attack; // Add hero base attack if no skill used
        totalAttack = Math.max(0, totalAttack);
        totalMagicAttack = Math.max(0, totalMagicAttack);
        
        const physicalDamage = Math.max(0, totalAttack - monster.defense);
        const magicDamage = Math.max(0, totalMagicAttack - (monster.magicResist || 0));
        finalDamage = physicalDamage + magicDamage;
    }

    outcome.damageDealt = finalDamage;
    outcome.damageTaken = Math.max(0, monster.attack - totalDefense); // Defense calculation remains the same for now

    // --- Determine Outcome --- 
    if (outcome.damageDealt >= monster.hp) {
        outcome.victory = true;
        outcome.xpGained = monster.xpReward;      
        outcome.heroXpGained = monster.xpReward; 
        outcome.lootGained = { ...monster.loot }; 
        outcome.progressMade = 1; 
    } else {
        outcome.victory = false;
    }
        
    return outcome;
}

/**
 * Estimates hourly gains for a city fighting in a specific zone.
 * *Important: This still uses the simplified tick-based combat for estimation.*
 * @param {object} city - The city object.
 * @param {object} combatZone - The combat zone data.
 * @param {object|null} assignedHero - The assigned hero.
 * @returns {object|null} An object with estimated rates per hour (kills, xp, heroXp, loot), or null if calculation fails.
 */
export function calculateAfkRates(city, combatZone, assignedHero) {
    if (!city || !combatZone || !combatZone.monsters || combatZone.monsters.length === 0) {
        return null;
    }
    const monster = combatZone.monsters[0]; // Base estimation on first monster

    // Simulate one combat outcome to get damage dealt
    // NOTE: This uses the simplified combat model which we might replace later.
    //       For now, assume 1 'tick' of combat happens instantly for estimation.
    const baseOutcome = calculateCombatOutcome(city, combatZone, assignedHero);

    if (baseOutcome.damageDealt <= 0) {
        // Cannot defeat the monster
        return {
            killsPerHour: 0,
            xpPerHour: 0,
            heroXpPerHour: 0,
            lootPerHour: {}
        };
    }

    // Estimate time to kill based on simplified combat
    const secondsToKill = Math.max(1, Math.ceil(monster.hp / baseOutcome.damageDealt)); // Assume at least 1 second per kill attempt cycle
    const killsPerHour = 3600 / secondsToKill;
    
    // Remove dependency on GAME_TICK_MS
    // const ticksToKill = Math.ceil(monster.hp / baseOutcome.damageDealt);
    // const killsPerTick = 1 / ticksToKill;
    // const ticksPerHour = 3600; // Since we assume 1 tick = 1 second here implicitly
    // const killsPerHour = killsPerTick * ticksPerHour;

    const xpPerHour = (monster.xpReward || 0) * killsPerHour;
    const heroXpPerHour = (monster.xpReward || 0) * killsPerHour; // Using same XP for now

    const lootPerHour = {};
    for (const [resource, amount] of Object.entries(monster.loot || {})) {
        lootPerHour[resource] = amount * killsPerHour;
    }

    return {
        killsPerHour,
        xpPerHour,
        heroXpPerHour,
        lootPerHour
    };
}

/**
 * Calculates the cost to level up a city (example formula).
 * @param {object} city - The city object.
 * @returns {object} Cost object (e.g., { wood: 100, stone: 50 }).
 */
export function calculateCityLevelUpCost(city) {
    const nextLevel = city.level + 1;
    return {
        wood: Math.floor(50 * Math.pow(1.5, city.level)),
        stone: Math.floor(25 * Math.pow(1.6, city.level)),
        gold: Math.floor(10 * Math.pow(1.4, city.level))
    };
}

// Add more formulas as needed (building costs, combat calculations, etc.) 