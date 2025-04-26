import React from 'react';
// Import game data for tasks and recipes
import { SKILL_RESOURCES_MAP, CRAFTING_RECIPES } from '../gameLogic/gameData';

// Define possible specializations (could also be imported from a config file)
const SPECIALIZATIONS = ['general', 'farming', 'mining', 'lumber', 'fighting', 'crafting'];

function CityView({ 
    city, 
    heroes, 
    playerSkills, // Receive playerSkills
    resources, // Receive global resources for crafting check
    assignHero, 
    unassignHero, 
    changeCitySpecialization, 
    changeCityTask, 
    craftItem // Receive craftItem function
}) {
  // Find the hero assigned to THIS city
  const assignedHero = heroes.find(hero => hero.assignedCityId === city.id);
  // Find heroes that are NOT assigned to ANY city
  const availableHeroes = heroes.filter(hero => !hero.assignedCityId);
  const craftingSkill = playerSkills.crafting;

  // Determine available tasks based on player skill levels
  const availableTasks = {};
  for (const [skill, skillResources] of Object.entries(SKILL_RESOURCES_MAP)) {
    // Skip crafting recipes when determining available *tasks*
    if (skill === 'crafting') continue; 
    const skillLevel = playerSkills[skill]?.level || 0;
    availableTasks[skill] = Object.entries(skillResources)
                                 .filter(([key, data]) => skillLevel >= data.levelReq)
                                 .map(([key, data]) => ({ key, name: data.name, levelReq: data.levelReq }));
  }

  // Helper for crafting checks
  const canCraft = (recipe) => {
    if (craftingSkill.level < recipe.levelReq) return false;
    for (const [res, cost] of Object.entries(recipe.cost)) {
      if (resources[res] < cost) return false;
    }
    return true;
  };

  return (
    <div className="city-view" style={{ border: '1px solid #ccc', marginBottom: '15px', padding: '10px' }}>
      <h2>{city.name} (Level {city.level})</h2>
      
      {/* City Stats Display */}
      <p>Population: {city.population} | Workers: {city.workers}</p>
      
      {/* Display City Combat Stats */}
      <div>
          <strong>Combat Stats:</strong> Attack: {city.combatStats.attack}, Defense: {city.combatStats.defense}
      </div>

      {/* Current Task Display */}
      <p>Current Task: <strong>{city.currentTask || 'Idle'}</strong></p>

      {/* Task Selection Dropdowns */}
      <div className="task-selection" style={{ marginTop: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <span>Assign Task:</span>
          {/* Mining */}
          <select 
              value={city.currentTask?.startsWith('mine') ? city.currentTask : ''} 
              onChange={(e) => changeCityTask(city.id, e.target.value)} 
              disabled={!availableTasks.mining?.length}
          >
              <option value="">-- Mine Ore --</option>
              {availableTasks.mining?.map(task => (
                  <option key={task.key} value={task.key}>{task.name} (Lvl {task.levelReq})</option>
              ))}
          </select>
          {/* Farming */} 
          <select 
              value={city.currentTask?.startsWith('farm') ? city.currentTask : ''} 
              onChange={(e) => changeCityTask(city.id, e.target.value)}
              disabled={!availableTasks.farming?.length}
          >
              <option value="">-- Farm Crop --</option>
              {availableTasks.farming?.map(task => (
                  <option key={task.key} value={task.key}>{task.name} (Lvl {task.levelReq})</option>
              ))}
          </select>
           {/* Woodcutting */}      
           <select 
              value={city.currentTask?.startsWith('wood') ? city.currentTask : ''} // Adjust prefix if needed
              onChange={(e) => changeCityTask(city.id, e.target.value)}
              disabled={!availableTasks.woodcutting?.length}
          >
              <option value="">-- Cut Wood --</option>
              {availableTasks.woodcutting?.map(task => (
                  <option key={task.key} value={task.key}>{task.name} (Lvl {task.levelReq})</option>
              ))}
          </select>
      </div>
      
      {/* Specialization Display and Control */}
      <div>
        <span>Specialization: <strong>{city.specialization}</strong></span>
        <div style={{ marginTop: '5px' }}> 
          Change to: 
          {SPECIALIZATIONS.map(spec => (
            // Only show button if it's not the current specialization
            city.specialization !== spec && (
              <button 
                key={spec}
                onClick={() => changeCitySpecialization(city.id, spec)}
                style={{ marginLeft: '5px', padding: '2px 5px'}} // Minor styling
              >
                {spec.charAt(0).toUpperCase() + spec.slice(1)}
              </button>
            )
          ))}
        </div>
      </div>
      
      {/* Add building display later? */}

      {/* Display Assigned Hero */}
      <h3>Assigned Hero</h3>
      {assignedHero ? (
        <div>
          <p>{assignedHero.name}</p>
          {/* Display hero boosts */}
          <ul>
            {Object.entries(assignedHero.boosts).map(([boost, value]) => (
              // Simple display, assuming boosts are percentage multipliers
              <li key={boost}>{boost}: {value > 0 ? '+' : ''}{value * 100}%</li> 
            ))}
          </ul>
          <button onClick={() => unassignHero(assignedHero.id)}>Unassign</button>
        </div>
      ) : (
        <p>No hero assigned.</p>
      )}

      {/* Assign Available Heroes */} 
      {/* Only show assignment buttons if no hero is currently assigned */} 
      {availableHeroes.length > 0 && !assignedHero && (
         <div>
            <h4>Assign a Hero:</h4>
            {availableHeroes.map(hero => (
                <button key={hero.id} onClick={() => assignHero(hero.id, city.id)}>
                    Assign {hero.name}
                </button>
            ))}
         </div>
      )}

      {/* Crafting Section (Integrated) */}
      <div className="city-crafting" style={{ marginTop: '15px', borderTop: '1px dashed #eee', paddingTop: '10px' }}>
        <h4>Craft Items (for this city)</h4>
        <ul>
            {Object.entries(CRAFTING_RECIPES).map(([key, recipe]) => (
                <li key={key} style={{ marginBottom: '5px' }}>
                    <strong>{recipe.name}</strong> (Lvl {recipe.levelReq}) 
                    [Cost: {Object.entries(recipe.cost).map(([r,c]) => `${r}:${c}`).join(', ')}] 
                    [Bonus: {Object.entries(recipe.bonus).map(([s,b]) => `${s}:+${b}`).join(', ')}]
                    <button 
                        onClick={() => craftItem(key, city.id)} // Pass cityId
                        disabled={!canCraft(recipe)}
                        style={{ marginLeft: '10px' }}
                    >
                        Craft
                    </button>
                </li>
            ))}
        </ul>
      </div>

    </div>
  );
}

export default CityView; 