import { RESOURCE_SKILL_MAP, SKILL_RESOURCES_MAP } from './gameData';

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