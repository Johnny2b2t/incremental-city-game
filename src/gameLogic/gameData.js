export const MINING_RESOURCES = {
  coal: { name: 'Coal', levelReq: 1, xpGain: 1, baseRate: 1 }, // Rate/Sec, XP/Sec
  copper: { name: 'Copper', levelReq: 5, xpGain: 5, baseRate: 0.8 }, // Rate/Sec, XP/Sec
  iron: { name: 'Iron', levelReq: 10, xpGain: 10, baseRate: 0.6 }, // Rate/Sec, XP/Sec
  gold: { name: 'Gold', levelReq: 20, xpGain: 25, baseRate: 0.4 }, // Rate/Sec, XP/Sec
  platinum: { name: 'Platinum', levelReq: 35, xpGain: 50, baseRate: 0.2 }, // Rate/Sec, XP/Sec
  titanium: { name: 'Titanium', levelReq: 50, xpGain: 100, baseRate: 0.1 }, // Rate/Sec, XP/Sec
  diamond: { name: 'Diamond', levelReq: 75, xpGain: 250, baseRate: 0.05 }, // Rate/Sec, XP/Sec
};

// Placeholder for other skill types
export const FARMING_RESOURCES = {
    wheat: { name: 'Wheat', levelReq: 1, xpGain: 1, baseRate: 1.5 }, // Rate/Sec, XP/Sec
    // Add carrots, potatoes etc later
};

export const WOODCUTTING_RESOURCES = {
    // Remove generic logs if replaced by tiers
    // logs: { name: 'Logs', levelReq: 1, xpGain: 1, baseRate: 1.2 }, 
    birch: { name: 'Birch Logs', levelReq: 1, xpGain: 1, baseRate: 1.2 }, // Rate/Sec, XP/Sec
    oak: { name: 'Oak Logs', levelReq: 8, xpGain: 8, baseRate: 0.9 }, // Rate/Sec, XP/Sec
    maple: { name: 'Maple Logs', levelReq: 15, xpGain: 15, baseRate: 0.7 }, // Rate/Sec, XP/Sec
    redwood: { name: 'Redwood Logs', levelReq: 30, xpGain: 40, baseRate: 0.5 }, // Rate/Sec, XP/Sec
    // Add more woodcutting tiers later
};

export const CRAFTING_RECIPES = {
    // Weapons
    bronzeSword: {
        name: 'Bronze Sword',
        skill: 'crafting',
        levelReq: 1,
        xpGain: 5,
        cost: { copper: 10, birch: 5 },
        bonus: { attack: 1 } 
    },
    ironSword: {
        name: 'Iron Sword',
        skill: 'crafting',
        levelReq: 5,
        xpGain: 20,
        cost: { iron: 15, oak: 10 }, 
        bonus: { attack: 3 }
    },
    // Bronze Armor Set
    bronzeHelmet: {
        name: 'Bronze Helmet',
        skill: 'crafting',
        levelReq: 2,
        xpGain: 8,
        cost: { copper: 8, birch: 3 },
        bonus: { defense: 1 }
    },
     bronzeChestplate: {
        name: 'Bronze Chestplate',
        skill: 'crafting',
        levelReq: 3,
        xpGain: 15,
        cost: { copper: 15, birch: 8 },
        bonus: { defense: 3 }
    },
     bronzeBoots: {
        name: 'Bronze Boots',
        skill: 'crafting',
        levelReq: 2,
        xpGain: 6,
        cost: { copper: 6, birch: 4 },
        bonus: { defense: 1 }
    },
    // Iron Armor Set
    ironHelmet: {
        name: 'Iron Helmet',
        skill: 'crafting',
        levelReq: 6,
        xpGain: 25,
        cost: { iron: 12, oak: 5 },
        bonus: { defense: 2 }
    },
    ironChestplate: {
        name: 'Iron Chestplate',
        skill: 'crafting',
        levelReq: 8,
        xpGain: 40,
        cost: { iron: 25, oak: 15 },
        bonus: { defense: 5 }
    },
    ironBoots: {
        name: 'Iron Boots',
        skill: 'crafting',
        levelReq: 6,
        xpGain: 20,
        cost: { iron: 10, oak: 8 },
        bonus: { defense: 2 }
    },
};

// Function to calculate XP needed for next level (example curve)
export const xpForNextLevel = (level) => {
  return Math.floor(10 * Math.pow(level, 1.5));
};

// Map resource keys to their skill type
export const RESOURCE_SKILL_MAP = {
    ...Object.keys(MINING_RESOURCES).reduce((acc, key) => ({ ...acc, [key]: 'mining' }), {}),
    ...Object.keys(FARMING_RESOURCES).reduce((acc, key) => ({ ...acc, [key]: 'farming' }), {}),
    ...Object.keys(WOODCUTTING_RESOURCES).reduce((acc, key) => ({ ...acc, [key]: 'woodcutting' }), {}),
    // Crafting keys (like 'bronzeSword') are still mapped for recipe lookup, not resource generation
    ...Object.keys(CRAFTING_RECIPES).reduce((acc, key) => ({ ...acc, [key]: 'crafting' }), {}),
};

// Map skill types to their resource definitions
export const SKILL_RESOURCES_MAP = {
    mining: MINING_RESOURCES,
    farming: FARMING_RESOURCES,
    woodcutting: WOODCUTTING_RESOURCES,
    crafting: CRAFTING_RECIPES, 
};

export const COMBAT_ZONES = {
    zoneGoblin: {
        name: "Goblin Camp",
        levelReq: 3,
        monsters: [
            { name: "Goblin", hp: 10, attack: 2, defense: 1, xpReward: 5, loot: { gold: 1 } },
        ],
        clearRequirement: 10,
    },
    zoneSpider: {
        name: "Spider Nest",
        levelReq: 8,
        monsters: [
            { name: "Giant Spider", hp: 25, attack: 5, defense: 3, xpReward: 15, loot: { gold: 3 } },
        ],
        clearRequirement: 5,
    },
    zoneChicken: {
        name: "Chicken Coop",
        levelReq: 1,
        monsters: [
            { name: "Chicken", hp: 5, attack: 1, defense: 0, xpReward: 2, loot: { feathers: 1 } },
        ],
        clearRequirement: 15,
    },
    zonePig: {
        name: "Pig Pen",
        levelReq: 1,
        monsters: [
            { name: "Pig", hp: 8, attack: 1, defense: 1, xpReward: 3, loot: { pork: 1 } },
        ],
        clearRequirement: 12,
    },
    zoneCow: {
        name: "Cow Pasture",
        levelReq: 4,
        monsters: [
            { name: "Cow", hp: 20, attack: 2, defense: 2, xpReward: 10, loot: { milk: 1 } },
        ],
        clearRequirement: 8,
    },
};

// Map zone keys to their skill type (for potential future skill association)
export const ZONE_SKILL_MAP = {
    ...Object.keys(COMBAT_ZONES).reduce((acc, key) => ({ ...acc, [key]: 'combat' }), {}),
};

// --- Hero System Data ---

export const HERO_CLASSES = {
    Warrior: {
        name: 'Warrior',
        mainStat: 'strength',
        secondaryStat: 'dexterity',
        description: 'Focuses on melee combat.'
    },
    Archer: {
        name: 'Archer',
        mainStat: 'dexterity',
        secondaryStat: 'strength',
        description: 'Focuses on ranged physical attacks.'
    },
    Wizard: {
        name: 'Wizard',
        mainStat: 'intelligence',
        secondaryStat: 'dexterity',
        description: 'Focuses on magical attacks.'
    },
    Farmer: {
        name: 'Farmer',
        mainStat: 'strength',
        secondaryStat: 'dexterity',
        description: 'Resource gathering focus.'
    }
    // Add more later
};

// Define how base stats convert to combat stats (examples)
export const calculateHeroCombatStats = (hero) => {
    // Defensive Check: Ensure hero and hero.stats exist
    if (!hero || !hero.stats) {
        console.warn("calculateHeroCombatStats called with invalid hero object:", hero);
        // Return default zero stats to prevent crash
        return {
            attack: 0,
            defense: 0,
            magicAttack: 0, 
            attackSpeed: 1, 
            critChance: 0.05 
        };
    }

    const stats = hero.stats; // Now safe to access
    const level = hero.level;
    let calculated = {
        attack: 0,
        defense: 0,
        magicAttack: 0, 
        attackSpeed: 1, 
        critChance: 0.05
    };

    // Base contribution from stats
    calculated.attack += (stats.strength * 1.5) + (stats.dexterity * 0.5); 
    calculated.defense += (stats.strength * 0.5) + (stats.dexterity * 0.2);
    calculated.magicAttack += (stats.intelligence * 2.0);
    calculated.attackSpeed += (stats.dexterity * 0.02);
    calculated.critChance += (stats.dexterity * 0.005);

    // Bonus per level 
    calculated.attack += (level - 1) * 1; 
    calculated.defense += (level - 1) * 0.5;
    calculated.magicAttack += (level -1) * 1; 

    // --- Apply bonuses from learned PASSIVE skills --- 
    if (hero.learnedSkills) {
        for (const [skillKey, skillLevel] of Object.entries(hero.learnedSkills)) {
            const skillData = HERO_SKILLS[skillKey];
            if (skillData && skillData.effect?.type === 'passive' && skillLevel > 0) {
                const effect = skillData.effect;
                const targetStat = effect.targetStat; // e.g., 'attack', 'defense'
                
                if (calculated[targetStat] !== undefined) {
                    if (effect.multiplier) {
                        // Assume multiplier applies per level for stacking passives, adjust if needed
                        const totalMultiplier = 1 + (effect.multiplier - 1) * skillLevel;
                        calculated[targetStat] *= totalMultiplier;
                    } else if (effect.flatBonus) {
                         // Assume flat bonus applies per level
                         calculated[targetStat] += effect.flatBonus * skillLevel;
                    } // Add other passive types later (e.g., crit chance bonus)
                     console.log(`Applied passive ${skillKey} (Lvl ${skillLevel}) to ${targetStat}`);
                }
            }
        }
    }

    // Ensure non-negative
    for (const key in calculated) {
        calculated[key] = Math.max(0, calculated[key]);
    }

    return calculated;
};

export const HERO_SKILLS = {
    // Warrior Skills
    warriorSlash: {
        name: 'Warrior Slash',
        class: 'Warrior',
        levelReq: 1,
        cost: 1, // Skill point cost
        maxLevel: 5,
        description: 'Basic melee attack dealing STR-based damage.',
        effect: { type: 'active_attack', damageMultiplier: 1.1, stat: 'strength' } // Example effect structure
    },
    heavyBlow: {
        name: 'Heavy Blow',
        class: 'Warrior',
        levelReq: 3,
        cost: 2,
        maxLevel: 3,
        description: 'A powerful strike, chance to stun.',
        effect: { type: 'active_attack', damageMultiplier: 1.5, stat: 'strength', statusChance: 0.2, status: 'stun' }
    },
    // Archer Skills
    preciseShot: {
        name: 'Precise Shot',
        class: 'Archer',
        levelReq: 1,
        cost: 1,
        maxLevel: 5,
        description: 'Basic ranged attack dealing DEX-based damage.',
        effect: { type: 'active_attack', damageMultiplier: 1.1, stat: 'dexterity' }
    },
    // Wizard Skills
    fireball: {
        name: 'Fireball',
        class: 'Wizard',
        levelReq: 1,
        cost: 1,
        maxLevel: 5,
        description: 'Hurl a ball of fire, dealing INT-based magic damage.',
        effect: { type: 'active_magic_attack', damageMultiplier: 1.2, stat: 'intelligence' }
    },
    // Passive Example
    weaponMastery: {
        name: 'Weapon Mastery',
        class: 'Warrior', // Or maybe available to multiple?
        levelReq: 5,
        cost: 3,
        maxLevel: 1,
        description: 'Increases physical attack damage by 10%.',
        effect: { type: 'passive', targetStat: 'attack', multiplier: 1.1 }
    }
    // Add many more skills
};

// --- City Unlock Data ---
export const NEXT_CITY_UNLOCK = {
    cityId: 'city-2', // ID for the next city
    name: 'Mountain Pass', // Name for the next city
    requirements: {
        playerSkills: { combat: 10 }, // Requires Combat Level 10
        resources: { gold: 1000 }      // Requires 1000 Gold
    },
    cost: { // Cost deducted upon unlock
        gold: 1000 
    },
    // Initial state for the new city upon unlock
    initialState: {
        level: 1,
        population: 5,
        workers: 2,
        specialization: 'general',
        combatStats: { attack: 0, defense: 0 },
        currentTask: null,
        assignedZone: null,
        zoneProgress: 0,
        buildings: { housing: 1 }
    }
}; 