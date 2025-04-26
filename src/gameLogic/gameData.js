export const MINING_RESOURCES = {
  coal: { name: 'Coal', levelReq: 1, xpGain: 1, baseRate: 1 },
  copper: { name: 'Copper', levelReq: 5, xpGain: 5, baseRate: 0.8 },
  iron: { name: 'Iron', levelReq: 10, xpGain: 10, baseRate: 0.6 },
  gold: { name: 'Gold', levelReq: 20, xpGain: 25, baseRate: 0.4 },
  platinum: { name: 'Platinum', levelReq: 35, xpGain: 50, baseRate: 0.2 },
  titanium: { name: 'Titanium', levelReq: 50, xpGain: 100, baseRate: 0.1 },
  diamond: { name: 'Diamond', levelReq: 75, xpGain: 250, baseRate: 0.05 },
};

// Placeholder for other skill types
export const FARMING_RESOURCES = {
    wheat: { name: 'Wheat', levelReq: 1, xpGain: 1, baseRate: 1.5 },
    // Add carrots, potatoes etc later
};

export const WOODCUTTING_RESOURCES = {
    // Remove generic logs if replaced by tiers
    // logs: { name: 'Logs', levelReq: 1, xpGain: 1, baseRate: 1.2 }, 
    birch: { name: 'Birch Logs', levelReq: 1, xpGain: 1, baseRate: 1.2 },
    oak: { name: 'Oak Logs', levelReq: 8, xpGain: 8, baseRate: 0.9 },
    maple: { name: 'Maple Logs', levelReq: 15, xpGain: 15, baseRate: 0.7 },
    redwood: { name: 'Redwood Logs', levelReq: 30, xpGain: 40, baseRate: 0.5 },
    // Add more woodcutting tiers later
};

export const CRAFTING_RECIPES = {
    bronzeSword: {
        name: 'Bronze Sword',
        skill: 'crafting',
        levelReq: 1,
        xpGain: 5,
        cost: { copper: 10, birch: 5 }, // Use specific wood
        bonus: { attack: 1 } 
    },
    ironSword: {
        name: 'Iron Sword',
        skill: 'crafting',
        levelReq: 5,
        xpGain: 20,
        cost: { iron: 15, oak: 10 }, // Use specific wood
        bonus: { attack: 3 }
    },
    // Add armor later
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