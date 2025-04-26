import { useState, useEffect } from 'react'
// import reactLogo from './assets/react.svg' // Default logos removed
// import viteLogo from '/vite.svg'
import './App.css'
import { initialGameState } from './gameLogic/initialState'
import CityView from './components/CityView'
import CraftingView from './components/CraftingView'
import { calculateResourceGain, calculateXPGain } from './gameLogic/formulas'
import { xpForNextLevel, RESOURCE_SKILL_MAP, SKILL_RESOURCES_MAP, CRAFTING_RECIPES } from './gameLogic/gameData'

const GAME_TICK_MS = 1000; // Update game state every second

function App() {
  const [gameState, setGameState] = useState(initialGameState);

  // --- Game Loop (useEffect) ---
  useEffect(() => {
    const gameInterval = setInterval(() => {
      setGameState(prevState => {
        const newState = JSON.parse(JSON.stringify(prevState));
        newState.gameTick += 1;

        // Resource Generation & XP Gain Logic
        newState.cities.forEach(city => {
          if (!city.currentTask) return; // Skip if no task assigned

          const assignedHero = newState.heroes.find(h => h.assignedCityId === city.id);
          const relevantSkill = RESOURCE_SKILL_MAP[city.currentTask];
          const skillInfo = newState.playerSkills[relevantSkill];

          // 1. Calculate Resource Gain
          const gains = calculateResourceGain(city, assignedHero, newState.playerSkills);
          for (const [resource, amount] of Object.entries(gains)) {
            if (newState.resources[resource] !== undefined) {
              newState.resources[resource] += amount;
            } else {
              console.warn(`Generated unknown resource: ${resource}`);
            }
          }

          // 2. Calculate XP Gain
          const xpGained = calculateXPGain(city, assignedHero, newState.playerSkills);
          if (xpGained > 0 && relevantSkill && skillInfo) {
            skillInfo.xp += xpGained;

            // 3. Check for Level Up
            let xpNeeded = xpForNextLevel(skillInfo.level);
            while (skillInfo.xp >= xpNeeded) {
              skillInfo.level += 1;
              skillInfo.xp -= xpNeeded;
              console.log(`${relevantSkill.toUpperCase()} leveled up to ${skillInfo.level}!`);
              xpNeeded = xpForNextLevel(skillInfo.level); // Update for next level check
            }
          }

          // TODO: Add resource consumption
        });

        // TODO: Add Hero Specific EXP gain?
        // TODO: Add City leveling logic
        // TODO: Add Monster clearing logic / Combat results

        return newState;
      });
    }, GAME_TICK_MS);

    // Cleanup interval on component unmount
    return () => clearInterval(gameInterval);
  }, []);

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
            if (prevState.resources[resource] < cost) {
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

  // TODO: Add City Level Up Logic

  return (
    <>
      <h1>Incremental City Game (Tick: {gameState.gameTick})</h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
        <div> {/* Column 1: Resources, Skills */} 
          <div className="resources section-container">
            <h3>Global Resources</h3>
            <ul>
              {Object.entries(gameState.resources).map(([resource, amount]) => (
                <li key={resource}>{resource.charAt(0).toUpperCase() + resource.slice(1)}: {Math.floor(amount)}</li> 
              ))}
            </ul>
          </div>

          <div className="skills section-container">
            <h3>Player Skills</h3>
            <ul>
                {Object.entries(gameState.playerSkills).map(([skill, data]) => {
                    const xpNeeded = xpForNextLevel(data.level);
                    return (
                        <li key={skill}>
                            {skill.charAt(0).toUpperCase() + skill.slice(1)}: Level {data.level} ({Math.floor(data.xp)} / {xpNeeded} XP)
                        </li>
                    );
                })}
            </ul>
          </div>
        </div>

        {/* Column 2: Crafting - This might need removal/relocation if moved to CityView */} 
        {/* Let's comment it out for now, anticipating the move */}
        {/* 
        <div> 
          <CraftingView 
              resources={gameState.resources}
              craftingSkill={gameState.playerSkills.crafting}
              recipes={CRAFTING_RECIPES}
              craftItem={craftItem} // This craftItem signature needs cityId now
          />
        </div> 
        */}

        <div style={{ flexBasis: '100%' }}> {/* Row 2: Cities */} 
          <div className="game-container section-container">
            <h2>Cities</h2>
            {gameState.cities.map(city => (
              <CityView
                key={city.id}
                city={city}
                heroes={gameState.heroes}
                playerSkills={gameState.playerSkills} 
                resources={gameState.resources} // Pass resources for crafting checks
                assignHero={assignHero} 
                unassignHero={unassignHero}
                changeCitySpecialization={changeCitySpecialization}
                changeCityTask={changeCityTask} 
                craftItem={craftItem} // Pass down the updated craftItem
              />
            ))}
          </div>
        </div>
      </div>      
      
      {/* TODO: Add controls for city specialization, building upgrades, etc. */}
      {/* TODO: Add separate Hero management view? */}
    </>
  )
}

export default App 