import React, { useState, useEffect } from 'react'
import './App.css'
import { initialGameState } from './gameLogic/initialState'
import CityView from './components/CityView'
// Import the new view components
import WarehouseView from './components/WarehouseView' 
import SkillsView from './components/SkillsView'
import CityOverview from './components/CityOverview'
//
import { calculateResourceGain, calculateXPGain, calculateCombatOutcome } from './gameLogic/formulas'
import { xpForNextLevel, RESOURCE_SKILL_MAP, SKILL_RESOURCES_MAP, CRAFTING_RECIPES, COMBAT_ZONES, HERO_SKILLS, HERO_CLASSES, NEXT_CITY_UNLOCK } from './gameLogic/gameData'
import { calculateCityLevelUpCost } from './gameLogic/formulas'

const GAME_TICK_MS = 1000; // Update game state every second
const GAME_SAVE_KEY = 'incrementalCityGameState_v1';

// --- Single Tick Simulation Logic ---
// Takes the *current* state and returns the *next* state after one tick
const simulateTick = (currentState) => {
    const newState = JSON.parse(JSON.stringify(currentState));
    newState.gameTick += 1;

    newState.cities.forEach((city, cityIndex) => {
        const assignedHero = newState.heroes.find(h => h.assignedCityId === city.id);
        const heroIndex = assignedHero ? newState.heroes.findIndex(h => h.id === assignedHero.id) : -1;
        // We don't need cityOutcome tracking here for simulation

        // --- Task Processing --- 
        if (city.currentTask) {
            const relevantSkill = RESOURCE_SKILL_MAP[city.currentTask];
            const skillInfo = newState.playerSkills[relevantSkill];
            if (skillInfo) { // Check if skill exists
                const gains = calculateResourceGain(city, assignedHero, newState.playerSkills);
                for (const [resource, amount] of Object.entries(gains)) {
                    if (newState.resources[resource] !== undefined) {
                        newState.resources[resource] += amount;
                    } else {
                        console.warn(`Generated unknown resource: ${resource}`);
                    }
                }
                const xpGained = calculateXPGain(city, assignedHero, newState.playerSkills);
                if (xpGained > 0) {
                    skillInfo.xp += xpGained;
                    let xpNeeded = xpForNextLevel(skillInfo.level);
                    while (skillInfo.xp >= xpNeeded) {
                        skillInfo.level += 1;
                        skillInfo.xp -= xpNeeded;
                        console.log(`${relevantSkill.toUpperCase()} leveled up to ${skillInfo.level}!`);
                        xpNeeded = xpForNextLevel(skillInfo.level);
                    }
                }
            }
        }

        // --- Combat Processing ---
        if (city.assignedZone) {
            const zoneData = COMBAT_ZONES[city.assignedZone];
            if (zoneData) {
                const combatOutcome = calculateCombatOutcome(city, zoneData, assignedHero);
                // cityOutcome = combatOutcome; // Not needed for simulation

                if (combatOutcome.victory) {
                    newState.cities[cityIndex].zoneProgress += combatOutcome.progressMade;
                    for (const [lootResource, amount] of Object.entries(combatOutcome.lootGained)) {
                        if (newState.resources[lootResource] !== undefined) {
                            newState.resources[lootResource] += amount;
                        } else {
                            console.warn(`Gained unknown loot resource: ${lootResource}`);
                        }
                    }
                    const combatSkillInfo = newState.playerSkills.combat;
                    if (combatSkillInfo && combatOutcome.xpGained > 0) {
                        combatSkillInfo.xp += combatOutcome.xpGained;
                        let xpNeeded = xpForNextLevel(combatSkillInfo.level);
                        while (combatSkillInfo.xp >= xpNeeded) {
                            combatSkillInfo.level += 1;
                            combatSkillInfo.xp -= xpNeeded;
                            console.log(`COMBAT leveled up to ${combatSkillInfo.level}!`);
                            xpNeeded = xpForNextLevel(combatSkillInfo.level);
                        }
                    }
                    if (assignedHero && heroIndex !== -1 && combatOutcome.heroXpGained > 0) {
                        const heroInfo = newState.heroes[heroIndex];
                        heroInfo.xp += combatOutcome.heroXpGained;
                        let heroXpNeeded = xpForNextLevel(heroInfo.level);
                        while (heroInfo.xp >= heroXpNeeded) {
                            heroInfo.level += 1;
                            heroInfo.xp -= heroXpNeeded;
                            heroInfo.skillPoints += 1;
                            console.log(`Hero ${heroInfo.name} leveled up to ${heroInfo.level}! (+1 Skill Point)`);
                            heroXpNeeded = xpForNextLevel(heroInfo.level);
                        }
                    }
                    if (newState.cities[cityIndex].zoneProgress >= zoneData.clearRequirement) {
                        console.log(`City ${city.id} completed a clear cycle in ${zoneData.name}!`);
                        newState.cities[cityIndex].zoneProgress = 0;
                    }
                }
            } else {
                newState.cities[cityIndex].assignedZone = null;
            }
        } // End Combat Processing
    }); // End city iteration

    return newState;
};

// --- Single Tick Simulation Logic ---
// Takes the *current* state and returns the *next* state after one tick
// ADDED: Optional targetCityId to only simulate one specific city
const simulateTickWithStatGain = (currentState, targetCityId = null) => {
    const newState = JSON.parse(JSON.stringify(currentState));
    // Only increment global gameTick if not simulating a specific target (i.e., in main loop)
    if (!targetCityId) {
        newState.gameTick += 1;
    }

    newState.cities.forEach((city, cityIndex) => {
        // If a target is specified, only process that city
        // If no target is specified (main loop), only process the currently selected/active city
        const isActiveTarget = targetCityId === city.id;
        const isActiveInMainLoop = !targetCityId && currentState.selectedCityId === city.id; 
        
        if (isActiveTarget || isActiveInMainLoop) {
             // --- This city is active for this simulation tick --- 
            const assignedHero = newState.heroes.find(h => h.assignedCityId === city.id);
            const heroIndex = assignedHero ? newState.heroes.findIndex(h => h.id === assignedHero.id) : -1;

            // --- Task Processing --- 
            if (city.currentTask) {
                const relevantSkill = RESOURCE_SKILL_MAP[city.currentTask];
                const skillInfo = newState.playerSkills[relevantSkill];
                if (skillInfo) { // Check if skill exists
                    const gains = calculateResourceGain(city, assignedHero, newState.playerSkills);
                    for (const [resource, amount] of Object.entries(gains)) {
                        if (newState.resources[resource] !== undefined) {
                            newState.resources[resource] += amount;
                        } else {
                            console.warn(`Generated unknown resource: ${resource}`);
                        }
                    }
                    const xpGained = calculateXPGain(city, assignedHero, newState.playerSkills);
                    if (xpGained > 0) {
                        skillInfo.xp += xpGained;
                        let xpNeeded = xpForNextLevel(skillInfo.level);
                        while (skillInfo.xp >= xpNeeded) {
                            skillInfo.level += 1;
                            skillInfo.xp -= xpNeeded;
                            console.log(`${relevantSkill.toUpperCase()} leveled up to ${skillInfo.level}!`);
                            xpNeeded = xpForNextLevel(skillInfo.level);
                        }
                    }
                }
            }

            // --- Combat Processing ---
            if (city.assignedZone) {
                const zoneData = COMBAT_ZONES[city.assignedZone];
                if (zoneData) {
                    const combatOutcome = calculateCombatOutcome(city, zoneData, assignedHero);
                    if (combatOutcome.victory) {
                        newState.cities[cityIndex].zoneProgress += combatOutcome.progressMade;
                        for (const [lootResource, amount] of Object.entries(combatOutcome.lootGained)) {
                            if (newState.resources[lootResource] !== undefined) {
                                newState.resources[lootResource] += amount;
                            } else {
                                console.warn(`Gained unknown loot resource: ${lootResource}`);
                            }
                        }
                        const combatSkillInfo = newState.playerSkills.combat;
                        if (combatSkillInfo && combatOutcome.xpGained > 0) {
                            combatSkillInfo.xp += combatOutcome.xpGained;
                            let xpNeeded = xpForNextLevel(combatSkillInfo.level);
                            while (combatSkillInfo.xp >= xpNeeded) {
                                combatSkillInfo.level += 1;
                                combatSkillInfo.xp -= xpNeeded;
                                console.log(`COMBAT leveled up to ${combatSkillInfo.level}!`);
                                xpNeeded = xpForNextLevel(combatSkillInfo.level);
                            }
                        }
                        if (assignedHero && heroIndex !== -1 && combatOutcome.heroXpGained > 0) {
                            const heroInfo = newState.heroes[heroIndex];
                            heroInfo.xp += combatOutcome.heroXpGained;
                            let heroXpNeeded = xpForNextLevel(heroInfo.level);
                            
                            let leveledUp = false;
                            while (heroInfo.xp >= heroXpNeeded) {
                                heroInfo.level += 1;
                                heroInfo.xp -= heroXpNeeded;
                                heroInfo.skillPoints += 1; 
                                grantLevelUpStats(heroInfo); // Call the new function to grant stats
                                console.log(`Hero ${heroInfo.name} leveled up to ${heroInfo.level}! (+1 SP, +Stats)`);
                                heroXpNeeded = xpForNextLevel(heroInfo.level); 
                                leveledUp = true;
                            }
                            // TODO: Trigger recalculation of derived stats if needed immediately
                        }
                        if (newState.cities[cityIndex].zoneProgress >= zoneData.clearRequirement) {
                            console.log(`City ${city.id} completed a clear cycle in ${zoneData.name}!`);
                            newState.cities[cityIndex].zoneProgress = 0;
                        }
                    }
                }
            } // End Combat
            
        } else {
             // --- This city is inactive for this simulation tick --- 
             // Do nothing for inactive cities during the simulation tick itself
             // We handle setting the timestamp on selection change
        }
    }); // End cities
    return newState;
}; // End simulateTickWithStatGain

function App() {
  // Initial state loader: Try loading from localStorage, fallback to initialGameState
  const [gameState, setGameState] = useState(() => {
    const savedState = localStorage.getItem(GAME_SAVE_KEY);
    if (savedState) {
      try {
        // TODO: Add versioning/migration logic later if state structure changes significantly
        return JSON.parse(savedState);
      } catch (e) {
        console.error("Failed to parse saved game state:", e);
        // Fallback to initial state if parsing fails
        localStorage.removeItem(GAME_SAVE_KEY); // Clear corrupted data
        return initialGameState; 
      }
    } else {
        return initialGameState;
    }
  });

  // Add state to track the outcome of the last combat tick per city
  const [lastCombatOutcomes, setLastCombatOutcomes] = useState({}); // { cityId: outcomeObject }
  const [isSkippingTicks, setIsSkippingTicks] = useState(false); // To prevent overlap
  // Add state for the currently selected city detail view
  const [selectedCityId, setSelectedCityId] = useState(gameState.cities[0]?.id || null); // Default to first city or null

  // --- Game Loop (useEffect) ---
  useEffect(() => {
    const gameInterval = setInterval(() => {
        setLastCombatOutcomes({}); 
        setGameState(prevState => {
            // Simulate ONLY the active city using the current selectedCityId from prevState
            const nextState = simulateTickWithStatGain({ ...prevState, selectedCityId: selectedCityId }, null); // Pass null targetCityId
            
            // --- Update lastCombatOutcomes for UI (only for active city) ---
             const outcomesThisTick = {};
             if(selectedCityId) {
                const activeCity = nextState.cities.find(c => c.id === selectedCityId);
                if (activeCity && activeCity.assignedZone) {
                    const zoneData = COMBAT_ZONES[activeCity.assignedZone];
                    const assignedHero = nextState.heroes.find(h => h.assignedCityId === activeCity.id);
                    if (zoneData) {
                        const displayOutcome = calculateCombatOutcome(activeCity, zoneData, assignedHero);
                        outcomesThisTick[selectedCityId] = displayOutcome;
                    }
                }
             }
            setLastCombatOutcomes(outcomesThisTick);
            // -------------------------------------------------------------
            
            return nextState;
        });
    }, GAME_TICK_MS);

    return () => clearInterval(gameInterval);
  }, [selectedCityId]);

  // --- Save State Effect ---
  useEffect(() => {
    // This effect runs whenever gameState changes
    try {
      localStorage.setItem(GAME_SAVE_KEY, JSON.stringify(gameState));
    } catch (e) {
      console.error("Failed to save game state:", e);
      // Handle potential storage full errors later?
    }
  }, [gameState]); // Dependency array ensures this runs when gameState updates

  // --- Crafting Logic ---
  const craftItem = (recipeKey, cityId) => {
    const recipe = CRAFTING_RECIPES[recipeKey];
    if (!recipe) {
      console.error(`Recipe ${recipeKey} not found.`);
      return;
    }

    setGameState(prevState => {
        // Find the target city
        const cityIndex = prevState.cities.findIndex(c => c.id === cityId);
        if (cityIndex === -1) {
            console.error(`City ${cityId} not found for crafting.`);
            return prevState;
        }

        // Check Resources (still uses global resources)
        for (const [resource, cost] of Object.entries(recipe.cost)) {
            if ((prevState.resources[resource] || 0) < cost) {
                console.warn(`Not enough ${resource} to craft ${recipe.name}.`);
                return prevState; 
            }
        }

        // Check Skill Level (global skill)
        const craftingSkill = prevState.playerSkills.crafting;
        if (craftingSkill.level < recipe.levelReq) {
            console.warn(`Crafting level too low for ${recipe.name}.`);
            return prevState; 
        }

        // If checks pass, proceed
        const newState = JSON.parse(JSON.stringify(prevState));

        // 1. Consume Resources
        for (const [resource, cost] of Object.entries(recipe.cost)) {
            newState.resources[resource] -= cost;
        }

        // 2. Apply Bonuses to the specific city
        if (recipe.bonus) {
            const targetCityStats = newState.cities[cityIndex].combatStats;
            for (const [stat, bonusValue] of Object.entries(recipe.bonus)) {
                if (targetCityStats[stat] !== undefined) {
                    targetCityStats[stat] += bonusValue;
                } else {
                    console.warn(`Unknown combat stat bonus: ${stat} in city ${cityId}`);
                }
            }
        }

        // 3. Grant Crafting XP & Handle Level Up (global skill)
        const skillInfo = newState.playerSkills.crafting;
        skillInfo.xp += recipe.xpGain;
        let xpNeeded = xpForNextLevel(skillInfo.level);
        while (skillInfo.xp >= xpNeeded) {
            skillInfo.level += 1;
            skillInfo.xp -= xpNeeded;
            console.log(`CRAFTING leveled up to ${skillInfo.level}!`);
            xpNeeded = xpForNextLevel(skillInfo.level); // Update for next level check
        }

        console.log(`Crafted ${recipe.name} for city ${cityId}!`);
        return newState;
    });
  };

  // --- Hero Assignment Logic ---
  const assignHero = (heroId, cityId) => {
    setGameState(prevState => {
        // Ensure no other hero is assigned to this city first
        const cityHasHero = prevState.heroes.some(h => h.assignedCityId === cityId);
        if(cityHasHero) {
            console.warn(`City ${cityId} already has a hero assigned.`);
            return prevState; 
        }

        const newState = JSON.parse(JSON.stringify(prevState));
        const heroIndex = newState.heroes.findIndex(h => h.id === heroId);
        if (heroIndex !== -1) {
            // Unassign from previous city if any (shouldn't happen with current logic, but good practice)
            // if (newState.heroes[heroIndex].assignedCityId) { ... }
            newState.heroes[heroIndex].assignedCityId = cityId;
            console.log(`Assigned hero ${heroId} to city ${cityId}`);
        } else {
            console.error(`Hero ${heroId} not found for assignment.`);
        }
        return newState;
    });
  };

  const unassignHero = (heroId) => {
    setGameState(prevState => {
        const newState = JSON.parse(JSON.stringify(prevState));
        const heroIndex = newState.heroes.findIndex(h => h.id === heroId);
        if (heroIndex !== -1) {
            console.log(`Unassigned hero ${heroId} from city ${newState.heroes[heroIndex].assignedCityId}`);
            newState.heroes[heroIndex].assignedCityId = null;
        } else {
            console.error(`Hero ${heroId} not found for unassignment.`);
        }
        return newState;
    });
  };

  // --- City Management Logic ---
  const changeCitySpecialization = (cityId, newSpecialization) => {
    // This might need adjustment depending on how specialization affects tasks
    setGameState(prevState => {
      const newState = JSON.parse(JSON.stringify(prevState));
      const cityIndex = newState.cities.findIndex(c => c.id === cityId);
      if (cityIndex !== -1) {
        newState.cities[cityIndex].specialization = newSpecialization;
        console.log(`Changed city ${cityId} specialization to ${newSpecialization}`);
      } else {
        console.error(`City ${cityId} not found for specialization change.`);
      }
      return newState;
    });
  };

  // Function to change the city's current task
  const changeCityTask = (cityId, newTask) => {
    setGameState(prevState => {
        const newState = JSON.parse(JSON.stringify(prevState));
        const cityIndex = newState.cities.findIndex(c => c.id === cityId);
        if (cityIndex !== -1) {
            // Optional: Add validation to check if the task is valid and requirements are met
            newState.cities[cityIndex].currentTask = newTask;
            console.log(`Changed city ${cityId} task to ${newTask}`);
        } else {
            console.error(`City ${cityId} not found for task change.`);
        }
        return newState;
    });
  };

  // --- Combat Zone Assignment Logic ---
  const assignCombatZone = (cityId, zoneKey) => {
    setGameState(prevState => {
        const newState = JSON.parse(JSON.stringify(prevState));
        const cityIndex = newState.cities.findIndex(c => c.id === cityId);
        if (cityIndex !== -1) {
            // Reset progress if changing zones or assigning from null
            if (newState.cities[cityIndex].assignedZone !== zoneKey) {
                newState.cities[cityIndex].zoneProgress = 0; 
            }
            newState.cities[cityIndex].assignedZone = zoneKey; // Can be null to stop fighting
            console.log(`City ${cityId} assigned to combat zone: ${zoneKey || 'None'}`);
        } else {
            console.error(`City ${cityId} not found for zone assignment.`);
        }
        return newState;
    });
  };

  // --- Other Functions --- 

  const allocateStatPoint = (heroId, statKey) => {
    setGameState(prevState => {
      const newState = JSON.parse(JSON.stringify(prevState));
      const heroIndex = newState.heroes.findIndex(h => h.id === heroId);
      if (heroIndex === -1) {
        console.error(`Hero ${heroId} not found for stat allocation.`);
        return prevState;
      }
      const hero = newState.heroes[heroIndex];

      // Check skill points
      if (hero.skillPoints <= 0) {
        console.warn(`Hero ${heroId} has no skill points to allocate.`);
        return prevState;
      }

      // Check if stat exists
      if (hero.stats[statKey] === undefined) {
         console.error(`Invalid stat key ${statKey} for hero ${heroId}.`);
         return prevState;
      }

      // Apply changes
      hero.skillPoints -= 1;
      hero.stats[statKey] += 1;
      console.log(`Allocated 1 point to ${statKey} for ${hero.name}.`);

      return newState;
    });
  };

  const learnHeroSkill = (heroId, skillKey) => {
    setGameState(prevState => {
        const newState = JSON.parse(JSON.stringify(prevState));
        const heroIndex = newState.heroes.findIndex(h => h.id === heroId);
        if (heroIndex === -1) {
            console.error(`Hero ${heroId} not found for skill learning.`);
            return prevState;
        }
        const hero = newState.heroes[heroIndex];
        const skillData = HERO_SKILLS[skillKey];

        if (!skillData) {
            console.error(`Skill ${skillKey} not found.`);
            return prevState;
        }

        // Check Requirements
        const currentLevel = hero.learnedSkills[skillKey] || 0;
        if (hero.level < skillData.levelReq) {
            console.warn(`Hero ${hero.name} level too low for ${skillData.name}.`);
            return prevState;
        }
        if (hero.skillPoints < skillData.cost) {
            console.warn(`Hero ${hero.name} does not have enough skill points for ${skillData.name}.`);
            return prevState;
        }
         if (currentLevel >= skillData.maxLevel) {
            console.warn(`Hero ${hero.name} already maxed out ${skillData.name}.`);
            return prevState;
        }
        if (hero.class !== skillData.class) {
             console.warn(`Skill ${skillData.name} is not available for class ${hero.class}.`);
             return prevState;
        }

        // Apply Changes
        hero.skillPoints -= skillData.cost;
        hero.learnedSkills[skillKey] = currentLevel + 1;
        console.log(`Hero ${hero.name} learned/leveled up ${skillData.name} to level ${currentLevel + 1}.`);

        return newState;
    });
  };

  // --- Grant Stats on Level Up (Helper within App or could be moved to gameData) ---
  const grantLevelUpStats = (hero) => {
    const classData = HERO_CLASSES[hero.class];
    if (!classData) return; // Safety check

    // Example Logic: +1 main stat, +1 secondary stat every 2 levels?
    hero.stats[classData.mainStat] = (hero.stats[classData.mainStat] || 0) + 1;
    if (hero.level % 2 === 0) { // Every even level
        hero.stats[classData.secondaryStat] = (hero.stats[classData.secondaryStat] || 0) + 1;
    }
    // Maybe +1 to a third stat every 5 levels?
  };

  // --- City Selection Handler with Offline Simulation ---
  const handleCitySelection = (newCityId) => {
    const now = Date.now();
    const previousCityId = selectedCityId;

    if (newCityId === previousCityId) return; // No change

    setGameState(currentState => {
        let newState = JSON.parse(JSON.stringify(currentState));
        let stateAfterSimulation = newState; // Start with current state

        // 1. Mark previously active city as inactive
        if (previousCityId) {
            const prevCityIndex = newState.cities.findIndex(c => c.id === previousCityId);
            if (prevCityIndex !== -1) {
                newState.cities[prevCityIndex].lastActiveTimestamp = now;
            }
        }

        // 2. Simulate catch-up for newly selected city
        const newCityIndex = newState.cities.findIndex(c => c.id === newCityId);
        if (newCityIndex !== -1) {
            const cityToActivate = newState.cities[newCityIndex];
            if (cityToActivate.lastActiveTimestamp) {
                const inactiveDuration = now - cityToActivate.lastActiveTimestamp;
                const missedTicks = Math.max(0, Math.floor(inactiveDuration / GAME_TICK_MS));
                
                if (missedTicks > 0) {
                    console.log(`Simulating ${missedTicks} missed ticks for ${cityToActivate.name}...`);
                    // Simulate these ticks *only* for the target city
                    let citySimState = { ...newState }; // Use a copy to pass to simulation
                    for (let i = 0; i < missedTicks; i++) {
                        // Pass targetCityId to only simulate this city
                        citySimState = simulateTickWithStatGain(citySimState, newCityId); 
                    }
                    console.log(`...Finished simulation for ${cityToActivate.name}.`);
                    stateAfterSimulation = citySimState; // Update state with simulation results
                }
            }
            // Mark newly selected city as active (clear timestamp)
             if (stateAfterSimulation.cities[newCityIndex]) { // Ensure city still exists
                stateAfterSimulation.cities[newCityIndex].lastActiveTimestamp = null;
             }
        } else {
             console.error("Newly selected city not found in state during selection handling?");
        }

        return stateAfterSimulation;
    });

    // Finally, update the selectedCityId state variable itself
    setSelectedCityId(newCityId);
  };

  // --- City Management Functions ---
  const upgradeCity = (cityId) => {
    setGameState(prevState => {
        const cityIndex = prevState.cities.findIndex(c => c.id === cityId);
        if (cityIndex === -1) {
            console.error(`City ${cityId} not found for upgrade.`);
            return prevState;
        }
        const city = prevState.cities[cityIndex];
        const costs = calculateCityLevelUpCost(city);

        // Check resources
        for (const [resource, cost] of Object.entries(costs)) {
             if ((prevState.resources[resource] || 0) < cost) {
                 console.warn(`Not enough ${resource} to upgrade ${city.name}. Need ${cost}.`);
                 // TODO: Add UI feedback
                 return prevState;
             }
        }

        // Apply changes
        const newState = JSON.parse(JSON.stringify(prevState));
        const cityToUpdate = newState.cities[cityIndex];

        // Deduct costs
        for (const [resource, cost] of Object.entries(costs)) {
            newState.resources[resource] -= cost;
        }
        // Increase level
        cityToUpdate.level += 1;
        console.log(`Upgraded ${cityToUpdate.name} to level ${cityToUpdate.level}!`);

        return newState;
    });
  };

  const unlockNextCity = () => {
    const nextCityData = NEXT_CITY_UNLOCK; // Using the defined constant
    if (!nextCityData) {
        console.warn("No next city defined for unlock.");
        return;
    }
    // Check if city already unlocked
    if (gameState.cities.some(c => c.id === nextCityData.cityId)) {
        console.warn(`City ${nextCityData.cityId} is already unlocked.`);
        return; 
    }

    setGameState(prevState => {
        // Check requirements
        let canUnlock = true;
        // Player Skills
        if (nextCityData.requirements.playerSkills) {
            for (const [skill, reqLevel] of Object.entries(nextCityData.requirements.playerSkills)) {
                if ((prevState.playerSkills[skill]?.level || 0) < reqLevel) {
                    console.warn(`Cannot unlock ${nextCityData.name}: requires ${skill} level ${reqLevel}.`);
                    canUnlock = false;
                    break;
                }
            }
        }
        if (!canUnlock) return prevState;

        // Resources
        if (nextCityData.requirements.resources) {
            for (const [resource, reqAmount] of Object.entries(nextCityData.requirements.resources)) {
                if ((prevState.resources[resource] || 0) < reqAmount) {
                     console.warn(`Cannot unlock ${nextCityData.name}: requires ${reqAmount} ${resource}.`);
                    canUnlock = false;
                    break;
                }
            }
        }
         if (!canUnlock) return prevState;

        // Check Cost (separate from requirements check)
        let canAfford = true;
         if (nextCityData.cost) {
            for (const [resource, costAmount] of Object.entries(nextCityData.cost)) {
                 if ((prevState.resources[resource] || 0) < costAmount) {
                     console.warn(`Cannot unlock ${nextCityData.name}: cannot afford ${costAmount} ${resource}.`);
                     canAfford = false;
                     break;
                 }
            }
        }
        if (!canAfford) return prevState;

        // Apply Changes
        const newState = JSON.parse(JSON.stringify(prevState));
        
        // Deduct Costs
        if (nextCityData.cost) {
            for (const [resource, costAmount] of Object.entries(nextCityData.cost)) {
                 newState.resources[resource] -= costAmount;
            }
        }

        // Add new city
        const newCity = {
            id: nextCityData.cityId,
            name: nextCityData.name,
            ...nextCityData.initialState // Spread the initial state defined in gameData
        };
        newState.cities.push(newCity);
        console.log(`Unlocked new city: ${newCity.name}!`);

        return newState;
    });
  };

  // TODO: Add City Level Up Logic

  // Find the full object for the selected city
  const selectedCity = gameState.cities.find(city => city.id === selectedCityId);

  return (
    <>
      <h1>Incremental City Game (Tick: {gameState.gameTick})</h1>
      {/* Skip Ticks Controls */}
      <div style={{ marginBottom: '15px', padding: '10px', border: '1px solid grey' }}>
        Skip Ticks: 
        <button onClick={() => handleSkipTicks(10)} disabled={isSkippingTicks}>+10 Ticks</button>
        <button onClick={() => handleSkipTicks(60)} disabled={isSkippingTicks} style={{ marginLeft: '5px'}}>+1 Min</button>
        <button onClick={() => handleSkipTicks(600)} disabled={isSkippingTicks} style={{ marginLeft: '5px'}}>+10 Min</button>
        <button onClick={() => handleSkipTicks(3600)} disabled={isSkippingTicks} style={{ marginLeft: '5px'}}>+1 Hour</button>
        {isSkippingTicks && <span style={{ marginLeft: '10px'}}>(Skipping...)</span>}
      </div>

      {/* Main Layout Container */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
        
        {/* Left Column: Warehouse & Skills */}
        <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '20px' }}> 
          <WarehouseView resources={gameState.resources} />
          <SkillsView 
            playerSkills={gameState.playerSkills} 
            xpForNextLevel={xpForNextLevel} 
          />
        </div>

        {/* Middle Column: City Overview */}
        <div style={{ flex: '2 1 350px' }}> {/* Adjust flex basis */}
            <CityOverview 
                cities={gameState.cities}
                heroes={gameState.heroes}
                playerSkills={gameState.playerSkills}
                resources={gameState.resources}
                upgradeCity={upgradeCity}
                unlockNextCity={unlockNextCity}
                selectedCityId={selectedCityId}   // Pass down selected ID
                setSelectedCityId={handleCitySelection} // Pass down setter function
            />
        </div>

         {/* Right Column: Detailed City View (Conditional) */}
         {selectedCity && (
            <div style={{ flex: '3 1 500px' }}> {/* Adjust flex basis */}
                <CityView
                    key={selectedCity.id} // Add key for potential remount on change
                    city={selectedCity}
                    heroes={gameState.heroes}
                    playerSkills={gameState.playerSkills} 
                    resources={gameState.resources} 
                    assignHero={assignHero} 
                    unassignHero={unassignHero}
                    changeCitySpecialization={changeCitySpecialization}
                    changeCityTask={changeCityTask} 
                    craftItem={craftItem} 
                    assignCombatZone={assignCombatZone} 
                    lastOutcome={lastCombatOutcomes[selectedCity.id] || null} 
                    allocateStatPoint={allocateStatPoint}
                    learnHeroSkill={learnHeroSkill}
                    // No need to pass upgradeCity here, it's in the overview
                />
            </div>
         )}
      </div>      
    </>
  )
}

export default App;