import React from 'react';

function CraftingView({ resources, craftingSkill, recipes, craftItem }) {

    const canCraft = (recipe) => {
        // Check skill level
        if (craftingSkill.level < recipe.levelReq) {
            return false;
        }
        // Check resources
        for (const [resource, cost] of Object.entries(recipe.cost)) {
            if (resources[resource] < cost) {
                return false;
            }
        }
        return true;
    };

    return (
        <div className="crafting-view section-container">
            <h2>Crafting</h2>
            <ul>
                {Object.entries(recipes).map(([key, recipe]) => (
                    <li key={key} style={{ marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>
                        <strong>{recipe.name}</strong> (Lvl {recipe.levelReq} Crafting)
                        <ul style={{ fontSize: '0.9em', listStyle: 'none', paddingLeft: '10px'}}>
                            <li>Costs: 
                                {Object.entries(recipe.cost).map(([res, cost]) => (
                                    <span key={res} style={{ marginRight: '5px'}}>
                                        {res}: {cost} ({Math.floor(resources[res] || 0)})
                                    </span>
                                ))}
                            </li>
                            <li>Bonus: 
                                {Object.entries(recipe.bonus).map(([stat, bonus]) => (
                                    <span key={stat} style={{ marginRight: '5px'}}>
                                        {stat}: +{bonus}
                                    </span>
                                ))}
                            </li>
                        </ul>
                        <button 
                            onClick={() => craftItem(key)}
                            disabled={!canCraft(recipe)}
                            style={{ marginTop: '5px' }}
                        >
                            Craft
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default CraftingView; 