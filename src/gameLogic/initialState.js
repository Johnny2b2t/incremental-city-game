export const initialGameState = {
  resources: {
    food: 10,
    wood: 10,
    stone: 5,
    logs: 10,
    birch: 0,
    oak: 0,
    maple: 0,
    redwood: 0,
    gold: 0,
    coal: 0,
    copper: 0,
    iron: 0,
  },
  playerSkills: {
    mining: { level: 1, xp: 0 },
    farming: { level: 1, xp: 0 },
    woodcutting: { level: 1, xp: 0 },
    crafting: { level: 1, xp: 0 },
  },
  heroes: [
    {
      id: 'hero-1',
      name: 'Guard Captain',
      // Example boosts this hero might provide when assigned
      boosts: {
        combatPower: 5, // Flat combat power boost
        miningYield: 0.1 // 10% boost to mining yield
      },
      assignedCityId: null, // Which city they are currently boosting, or null
    },
    {
        id: 'hero-2',
        name: 'Farm Hand',
        boosts: {
          farmingYield: 0.15, // 15% boost to farming
          foodConsumption: -0.05 // Reduces city food need by 5%?
        },
        assignedCityId: null, 
      }
  ],
  cities: [
    {
      id: 'city-1',
      name: 'First Outpost',
      level: 1,
      population: 10,
      workers: 5, // Workers actively doing the city's main task
      specialization: 'general', // Can be 'general', 'farming', 'mining', 'combat', etc.
      combatStats: {
        attack: 0,
        defense: 0,
      },
      currentTask: 'mineCoal', // Specific task the city is performing (key from gameData.js)
      buildings: {
        housing: 1, // Example building
      },
    },
  ],
  // Add other global state if needed, e.g., game ticks, unlocked features
  gameTick: 0, // Counter for game updates
}; 