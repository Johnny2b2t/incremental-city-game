import { RESOURCE_SKILL_MAP, SKILL_RESOURCES_MAP, COMBAT_ZONES, calculateHeroCombatStats, HERO_SKILLS } from './gameData';
// Import GAME_TICK_MS - we need it for hourly calc. 
// It's defined in App.jsx, maybe move it to gameData or config later?
// For now, hardcode assumption of 1000ms tick.
const GAME_TICK_MS = 1000;

/**
 * Calculates the resources gained per tick for a given city based on its current task.
 * @param {object} city - The city object from gameState.
 * @param {object|null} assignedHero - The hero object assigned to the city, or null.
 * @param {object} playerSkills - The player's skills object from gameState.
 * @returns {object} An object representing the resources gained this tick (e.g., { coal: 1, wood: 0 }).
 */
export function calculateResourceGain(city, assignedHero, playerSkills) {
    const gains = {}; // Start with empty gains
    if (!city.currentTask) {
        return gains; // No task, no gain
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
        // Maybe return a very small amount or zero if level req not met?
        return gains; // Or indicate somehow that the level is too low
    }

    // Base gain from the task definition
    let amount = skillData.baseRate;

    // --- Apply Modifiers --- 
    // 1. Skill Level Bonus (Example: +5% per level over requirement?)
    const levelDifference = playerSkillLevel - skillData.levelReq;
    amount *= (1 + levelDifference * 0.05); 

    // 2. City Level Bonus (Example: +10% per city level)
    amount *= (1 + (city.level - 1) * 0.10);

    // 3. City Specialization Bonus (Example: +50% if specialization matches skill)
    //    (Need to define specializations that map to skills: e.g., 'miningSpec' -> 'mining')
    //    if (city.specialization === `${relevantSkill}Spec`) { 
    //        amount *= 1.5;
    //    }

    // 4. Hero Boosts (Example: Check for a matching yield boost)
    if (assignedHero && assignedHero.boosts) {
        const heroBoostKey = `${relevantSkill}Yield`; // e.g., miningYield, farmingYield
        if (assignedHero.boosts[heroBoostKey]) {
            amount *= (1 + assignedHero.boosts[heroBoostKey]);
        }
    }

    // 5. Building Bonuses (TODO: Implement building effects)

    // Add the calculated amount to the gains object
    // The resource generated is usually the same as the task key (e.g., task 'coal' generates 'coal')
    gains[taskKey] = amount;

    return gains;
}

/**
 * Calculates the XP gained per tick for the relevant skill based on the city's task.
 * @param {object} city - The city object from gameState.
 * @param {object|null} assignedHero - The hero object assigned to the city, or null.
 * @param {object} playerSkills - The player's skills object from gameState.
 * @returns {number} The amount of XP gained for the relevant skill.
 */
export function calculateXPGain(city, assignedHero, playerSkills) {
    if (!city.currentTask) {
        return 0; // No task, no XP
    }

    const taskKey = city.currentTask;
    const relevantSkill = RESOURCE_SKILL_MAP[taskKey];
    const skillData = SKILL_RESOURCES_MAP[relevantSkill]?.[taskKey];
    const playerSkillLevel = playerSkills[relevantSkill]?.level || 0;

    if (!relevantSkill || !skillData || !playerSkills[relevantSkill]) {
        return 0; // Invalid task or skill data
    }

    // Check level requirement (maybe allow XP gain even if resource gain is blocked?)
    if (playerSkillLevel < skillData.levelReq) {
        // Optional: Allow minimal XP gain even if level is too low?
        // return skillData.xpGain * 0.1; 
        return 0; 
    }

    let xpAmount = skillData.xpGain;

    // Apply Modifiers (Could add bonuses from heroes, buildings, etc. later)
    // Example: Small bonus based on city level?
    // xpAmount *= (1 + (city.level - 1) * 0.02);

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
    // Note: This uses the *current* stats, doesn't account for leveling up during the hour
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

    const ticksToKill = Math.ceil(monster.hp / baseOutcome.damageDealt);
    const killsPerTick = 1 / ticksToKill;
    const ticksPerHour = 3600 / (GAME_TICK_MS / 1000); // Assumes GAME_TICK_MS is available or use 3600 directly if 1 tick = 1 sec

    const killsPerHour = killsPerTick * ticksPerHour;
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