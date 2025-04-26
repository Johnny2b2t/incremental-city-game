import React from 'react';
import { HERO_SKILLS, HERO_CLASSES } from '../gameLogic/gameData';

// Helper function to get skills available to a class
const getAvailableSkills = (heroClass) => {
    return Object.entries(HERO_SKILLS)
        .filter(([key, skillData]) => skillData.class === heroClass)
        .sort(([keyA, skillA], [keyB, skillB]) => skillA.levelReq - skillB.levelReq); // Sort by level requirement
};

function HeroSkillView({ hero, allocateStatPoint, learnHeroSkill }) {
    if (!hero) {
        return <div>No Hero Selected</div>;
    }

    const heroClassData = HERO_CLASSES[hero.class];
    const availableSkills = getAvailableSkills(hero.class);

    return (
        <div className="hero-skill-view section-container" style={{ border: '1px solid lightblue', padding: '10px', marginTop: '10px' }}>
            <h4>{hero.name} - Level {hero.level} {hero.class}</h4>
            <p>Skill Points Available: {hero.skillPoints}</p>
            
            {/* Stats Section */}
            <div>
                <h5>Stats</h5>
                {hero && hero.stats ? (
                    <ul style={{ listStyle: 'none', paddingLeft: '10px' }}>
                        {Object.entries(hero.stats).map(([stat, value]) => (
                            <li key={stat}>
                                {stat.charAt(0).toUpperCase() + stat.slice(1)}: {value}
                                <button 
                                    onClick={() => allocateStatPoint(hero.id, stat)}
                                    disabled={hero.skillPoints <= 0} 
                                    style={{ marginLeft: '10px', fontSize: '0.8em', padding: '1px 3px' }}
                                >
                                    +
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p><i>Stats data missing for this hero.</i></p>
                )}
            </div>

            {/* Skills Section */}
            <div>
                <h5>Skills ({hero.class})</h5>
                {hero && hero.learnedSkills ? (
                    <ul style={{ listStyle: 'none', paddingLeft: '10px' }}>
                        {availableSkills.map(([key, skill]) => {
                            const currentLevel = hero.learnedSkills[key] || 0;
                            const canLearn = hero.level >= skill.levelReq && hero.skillPoints >= skill.cost && currentLevel < skill.maxLevel;
                            const isMaxLevel = currentLevel >= skill.maxLevel;

                            return (
                                <li key={key} style={{ marginBottom: '8px', borderBottom: '1px dotted #eee', paddingBottom: '5px' }}>
                                    <strong>{skill.name}</strong> [Lvl Req: {skill.levelReq}] (Cost: {skill.cost} SP)
                                    <br />
                                    <small><i>{skill.description}</i></small>
                                    <br />
                                    <span>Level: {currentLevel} / {skill.maxLevel}</span>
                                    <button 
                                        onClick={() => learnHeroSkill(hero.id, key)}
                                        disabled={!canLearn || isMaxLevel}
                                        style={{ marginLeft: '10px', fontSize: '0.8em', padding: '1px 3px' }}
                                    >
                                        {isMaxLevel ? 'Max' : (currentLevel > 0 ? 'Level Up' : 'Learn')}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <p><i>Skill data missing for this hero.</i></p>
                )}
            </div>
        </div>
    );
}

export default HeroSkillView; 