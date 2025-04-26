export const initialGameState = {
  resources: {
    food: 100,
    wood: 100,
    stone: 100,
    logs: 100,
    birch: 100,
    oak: 50,
    maple: 0,
    redwood: 0,
    feathers: 50,
    pork: 50,
    milk: 50,
    gold: 100,
    coal: 100,
    copper: 50,
    iron: 50,
  },
  playerSkills: {
    mining: { level: 5, xp: 0 },
    farming: { level: 5, xp: 0 },
    woodcutting: { level: 5, xp: 0 },
    crafting: { level: 5, xp: 0 },
    combat: { level: 5, xp: 0 },
  },
  heroes: [
    {
      id: 'hero-1',
      name: 'Guard Captain',
      class: 'Warrior',
      level: 1,
      xp: 0,
      stats: { strength: 5, dexterity: 3, intelligence: 1 },
      skillPoints: 0,
      learnedSkills: {},
      boosts: {
        miningYield: 0.1
      },
      assignedCityId: 'city-1',
    },
    {
        id: 'hero-2',
        name: 'Farm Hand',
        class: 'Farmer',
        level: 1,
        xp: 0,
        stats: { strength: 2, dexterity: 2, intelligence: 1 },
        skillPoints: 0,
        learnedSkills: {},
        boosts: {
          farmingYield: 0.15,
          foodConsumption: -0.05
        },
        assignedCityId: null,
      }
  ],
  cities: [
    {
      id: 'city-1',
      name: 'Test Outpost',
      level: 3,
      population: 20,
      workers: 10,
      specialization: 'general',
      combatStats: {
        attack: 5,
        defense: 5,
      },
      currentTask: 'mineIron',
      assignedZone: 'zoneGoblin',
      zoneProgress: 0,
      buildings: {
        housing: 2,
      },
      lastActiveTimestamp: null,
    },
  ],
  gameTick: 0,
}; 