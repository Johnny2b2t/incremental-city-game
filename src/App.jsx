import React, { useState, useEffect, useRef } from 'react'
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
    // Create a shallow copy for the top level
    let newState = { ...currentState };

    // Only increment global gameTick if not simulating a specific target
    if (!targetCityId) {
        newState.gameTick = (newState.gameTick || 0) + 1;
    }

    // Use .map for immutable updates to cities and heroes arrays
    // Keep track of changes to global resources and skills separately
    let newResources = { ...newState.resources };
    let newPlayerSkills = { ...newState.playerSkills };
    let newHeroes = [...newState.heroes]; // Shallow copy heroes array

    newState.cities = newState.cities.map((city, cityIndex) => {
        const isActiveTarget = targetCityId === city.id;
        const isActiveInMainLoop = !targetCityId && currentState.selectedCityId === city.id;

        if (isActiveTarget || isActiveInMainLoop) {
            // --- This city is active --- 
            let updatedCity = { ...city }; // Shallow copy the active city
            const assignedHero = newHeroes.find(h => h.assignedCityId === city.id);
            const heroIndex = assignedHero ? newHeroes.findIndex(h => h.id === assignedHero.id) : -1;

            // --- Task Processing --- 
            if (city.currentTask) {
                const relevantSkillKey = RESOURCE_SKILL_MAP[city.currentTask];
                const currentSkillInfo = newPlayerSkills[relevantSkillKey];
                if (currentSkillInfo) {
                    const gains = calculateResourceGain(city, assignedHero, newPlayerSkills);
                    for (const [resource, amount] of Object.entries(gains)) {
                        if (newResources[resource] !== undefined) {
                            newResources[resource] = (newResources[resource] || 0) + amount;
                        }
                    }
                    const xpGained = calculateXPGain(city, assignedHero, newPlayerSkills);
                    if (xpGained > 0) {
                        let updatedSkillInfo = { ...currentSkillInfo };
                        updatedSkillInfo.xp += xpGained;
                        let xpNeeded = xpForNextLevel(updatedSkillInfo.level);
                        while (updatedSkillInfo.xp >= xpNeeded) {
                            updatedSkillInfo.level += 1;
                            updatedSkillInfo.xp -= xpNeeded;
                             console.log(`${relevantSkillKey.toUpperCase()} leveled up to ${updatedSkillInfo.level}!`);
                            xpNeeded = xpForNextLevel(updatedSkillInfo.level);
                        }
                        // Update the specific skill in the new skills object
                        newPlayerSkills = { ...newPlayerSkills, [relevantSkillKey]: updatedSkillInfo };
                    }
                }
            }

            // --- Combat Processing ---
            if (city.assignedZone) {
                const zoneData = COMBAT_ZONES[city.assignedZone];
                if (zoneData) {
                    const combatOutcome = calculateCombatOutcome(city, zoneData, assignedHero);
                    if (combatOutcome.victory) {
                        updatedCity.zoneProgress = (updatedCity.zoneProgress || 0) + combatOutcome.progressMade;
                        for (const [lootResource, amount] of Object.entries(combatOutcome.lootGained)) {
                            if (newResources[lootResource] !== undefined) {
                                newResources[lootResource] = (newResources[lootResource] || 0) + amount;
                            }
                        }
                        const combatSkillInfo = newPlayerSkills.combat;
                        if (combatSkillInfo && combatOutcome.xpGained > 0) {
                             let updatedCombatSkill = { ...combatSkillInfo };
                             updatedCombatSkill.xp += combatOutcome.xpGained;
                             let xpNeeded = xpForNextLevel(updatedCombatSkill.level);
                            while (updatedCombatSkill.xp >= xpNeeded) {
                                updatedCombatSkill.level += 1;
                                updatedCombatSkill.xp -= xpNeeded;
                                console.log(`COMBAT leveled up to ${updatedCombatSkill.level}!`);
                                xpNeeded = xpForNextLevel(updatedCombatSkill.level);
                            }
                             newPlayerSkills = { ...newPlayerSkills, combat: updatedCombatSkill };
                        }
                        if (assignedHero && heroIndex !== -1 && combatOutcome.heroXpGained > 0) {
                            let updatedHeroInfo = { ...newHeroes[heroIndex] }; // Copy hero being updated
                            updatedHeroInfo.xp = (updatedHeroInfo.xp || 0) + combatOutcome.heroXpGained;
                            let heroXpNeeded = xpForNextLevel(updatedHeroInfo.level);
                            while (updatedHeroInfo.xp >= heroXpNeeded) {
                                updatedHeroInfo.level = (updatedHeroInfo.level || 0) + 1;
                                updatedHeroInfo.xp -= heroXpNeeded;
                                updatedHeroInfo.skillPoints = (updatedHeroInfo.skillPoints || 0) + 1;
                                // IMPORTANT: grantLevelUpStats modifies the object passed in
                                grantLevelUpStats(updatedHeroInfo); 
                                console.log(`Hero ${updatedHeroInfo.name} leveled up to ${updatedHeroInfo.level}! (+1 SP, +Stats)`);
                                heroXpNeeded = xpForNextLevel(updatedHeroInfo.level);
                            }
                            // Place the updated hero back into the new heroes array
                            newHeroes[heroIndex] = updatedHeroInfo; 
                        }
                        if (updatedCity.zoneProgress >= zoneData.clearRequirement) {
                            console.log(`City ${city.id} completed a clear cycle in ${zoneData.name}!`);
                            updatedCity.zoneProgress = 0;
                        }
                    }
                }
            } // End Combat
             return updatedCity; // Return the updated city object for the .map
        }
        
        // If inactive, return the original city object (no changes)
        return city; 
    });

    // Assign the potentially updated collections back to the new state object
    newState.resources = newResources;
    newState.playerSkills = newPlayerSkills;
    newState.heroes = newHeroes;

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
  const saveTimeoutRef = useRef(null); // Ref to store timeout ID

  useEffect(() => {
    // Clear any existing timeout when gameState changes
    if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
    }

    // Set a new timeout to save after a delay (e.g., 2 seconds)
    saveTimeoutRef.current = setTimeout(() => {
        try {
            console.log("Auto-saving game state..."); // Log when saving
            localStorage.setItem(GAME_SAVE_KEY, JSON.stringify(gameState));
        } catch (e) {
            console.error("Failed to auto-save game state:", e);
        }
        saveTimeoutRef.current = null; // Clear ref after save
    }, 2000); // 2000ms = 2 seconds delay

    // Cleanup function to clear timeout if component unmounts before save
    return () => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
    };
  }, [gameState]); // Still depends on gameState, but logic inside debounces

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
      const heroIndex = prevState.heroes.findIndex(h => h.id === heroId);
      if (heroIndex === -1) return prevState;
      const hero = prevState.heroes[heroIndex];
      if (hero.skillPoints <= 0 || hero.stats[statKey] === undefined) return prevState;

      // Immutable update
      const newHeroes = prevState.heroes.map((h, index) => {
          if (index === heroIndex) {
              return {
                  ...h,
                  skillPoints: h.skillPoints - 1,
                  stats: { 
                      ...h.stats, 
                      [statKey]: h.stats[statKey] + 1 
                  }
              };
          }
          return h;
      });
      console.log(`Allocated 1 point to ${statKey} for ${newHeroes[heroIndex].name}.`);
      return { ...prevState, heroes: newHeroes };
    });
  };

  const learnHeroSkill = (heroId, skillKey) => {
    setGameState(prevState => {
        const heroIndex = prevState.heroes.findIndex(h => h.id === heroId);
        if (heroIndex === -1) return prevState;
        const hero = prevState.heroes[heroIndex];
        const skillData = HERO_SKILLS[skillKey];
        if (!skillData) return prevState;
        const currentLevel = hero.learnedSkills[skillKey] || 0;
        if (hero.level < skillData.levelReq || 
            hero.skillPoints < skillData.cost || 
            currentLevel >= skillData.maxLevel || 
            hero.class !== skillData.class) {
            return prevState;
        }

        // Immutable update
        const newHeroes = prevState.heroes.map((h, index) => {
            if (index === heroIndex) {
                return {
                    ...h,
                    skillPoints: h.skillPoints - skillData.cost,
                    learnedSkills: {
                        ...h.learnedSkills,
                        [skillKey]: currentLevel + 1
                    }
                };
            }
            return h;
        });
        console.log(`Hero ${newHeroes[heroIndex].name} learned/leveled up ${skillData.name} to level ${currentLevel + 1}.`);
        return { ...prevState, heroes: newHeroes };
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
        if (cityIndex === -1) return prevState; // Already checked, but good practice
        const city = prevState.cities[cityIndex];
        const costs = calculateCityLevelUpCost(city);
        // Check affordability again (state might have changed)
        for (const [resource, cost] of Object.entries(costs)) {
            if ((prevState.resources[resource] || 0) < cost) return prevState;
        }
        
        // Create new resources object
        let newResources = { ...prevState.resources };
        for (const [resource, cost] of Object.entries(costs)) {
            newResources[resource] -= cost;
        }

        // Create new cities array with the updated city
        const newCities = prevState.cities.map((c, index) => {
            if (index === cityIndex) {
                return { ...c, level: c.level + 1 };
            }
            return c;
        });

        console.log(`Upgraded ${newCities[cityIndex].name} to level ${newCities[cityIndex].level}!`);
        // Return the new state object
        return { 
            ...prevState, 
            resources: newResources, 
            cities: newCities 
        };
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