import React from 'react';
import { calculateCityLevelUpCost } from '../gameLogic/formulas';
import { NEXT_CITY_UNLOCK } from '../gameLogic/gameData';

// Helper to check if requirements/costs are met
const checkRequirements = (requirements, playerSkills, resources) => {
    if (!requirements) return true;
    // Player Skills
    if (requirements.playerSkills) {
        for (const [skill, reqLevel] of Object.entries(requirements.playerSkills)) {
            if ((playerSkills[skill]?.level || 0) < reqLevel) return false;
        }
    }
    // Resources
    if (requirements.resources) {
        for (const [resource, reqAmount] of Object.entries(requirements.resources)) {
            if ((resources[resource] || 0) < reqAmount) return false;
        }
    }
    return true;
};

function CityOverview({ 
    cities, 
    heroes, 
    playerSkills, 
    resources, 
    upgradeCity, 
    unlockNextCity, 
    selectedCityId,    // Receive selected ID
    setSelectedCityId  // Receive setter function
}) {
    const nextCityData = NEXT_CITY_UNLOCK;
    const canUnlockNext = 
        !cities.some(c => c.id === nextCityData?.cityId) && // Check not already unlocked
        checkRequirements(nextCityData?.requirements, playerSkills, resources) &&
        checkRequirements({ resources: nextCityData?.cost }, playerSkills, resources); // Use same helper for cost check

    return (
        <div className="city-overview-container section-container">
            <h2>City Management</h2>

            {/* List of Owned Cities */}
            <div className="owned-cities-list" style={{ marginBottom: '20px' }}>
                {cities.map(city => {
                    const isSelected = city.id === selectedCityId;
                    const assignedHero = heroes.find(h => h.assignedCityId === city.id);
                    const upgradeCosts = calculateCityLevelUpCost(city);
                    const canAffordUpgrade = checkRequirements({ resources: upgradeCosts }, playerSkills, resources);

                    return (
                        <div 
                            key={city.id} 
                            className={`city-summary ${isSelected ? 'selected' : ''}`} 
                            style={{
                                border: isSelected ? '2px solid blue' : '1px solid grey', 
                                padding: '8px', 
                                marginBottom: '8px',
                                cursor: 'pointer',
                                backgroundColor: isSelected ? '#e0e8ff' : 'transparent'
                            }}
                            onClick={() => setSelectedCityId(city.id)}
                        >
                            <strong>{city.name}</strong> (Level {city.level})
                            <ul style={{ fontSize: '0.9em', margin: '5px 0', listStylePosition: 'inside' }}>
                                <li>Task: {city.currentTask || 'Idle'}</li>
                                <li>Zone: {city.assignedZone || 'None'}</li>
                                <li>Hero: {assignedHero ? `${assignedHero.name} (L${assignedHero.level})` : 'None'}</li>
                            </ul>
                            <button 
                                onClick={(e) => { e.stopPropagation(); upgradeCity(city.id); }}
                                disabled={!canAffordUpgrade}
                                title={`Cost: ${Object.entries(upgradeCosts).map(([k,v])=>`${k}:${v}`).join(', ')}`}
                                style={{ fontSize: '0.8em' }}
                            >
                                Upgrade City {canAffordUpgrade ? '' : '(Need Resources)'}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Unlock Next City Section */}
            {nextCityData && !cities.some(c => c.id === nextCityData.cityId) && (
                <div className="unlock-city-section" style={{ borderTop: '2px solid black', paddingTop: '10px' }}>
                    <h4>Unlock Next City: {nextCityData.name}</h4>
                    <div>
                        <strong>Requirements:</strong>
                        <ul>
                            {nextCityData.requirements.playerSkills && Object.entries(nextCityData.requirements.playerSkills).map(([skill, level]) => (
                                <li key={skill}>{skill} Level {level} (Current: {playerSkills[skill]?.level || 0})</li>
                            ))}
                             {nextCityData.requirements.resources && Object.entries(nextCityData.requirements.resources).map(([res, amount]) => (
                                <li key={res}>{amount} {res} (Current: {Math.floor(resources[res] || 0)})</li>
                            ))}
                        </ul>
                        <strong>Cost:</strong>
                         <ul>
                             {nextCityData.cost && Object.entries(nextCityData.cost).map(([res, amount]) => (
                                <li key={res}>{amount} {res} (Current: {Math.floor(resources[res] || 0)})</li>
                            ))}
                         </ul>
                    </div>
                    <button onClick={unlockNextCity} disabled={!canUnlockNext}>
                        Unlock {nextCityData.name}
                    </button>
                </div>
            )}
        </div>
    );
}

export default CityOverview; 