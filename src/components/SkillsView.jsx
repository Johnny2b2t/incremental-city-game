import React from 'react';

function SkillsView({ playerSkills, xpForNextLevel }) {
    return (
        <div className="skills-view section-container">
            <h3>Skills</h3>
            <ul style={{ listStyle: 'none', paddingLeft: '0' }}>
                {Object.entries(playerSkills).map(([skill, data]) => {
                    const xpNeeded = xpForNextLevel(data.level);
                    const progressPercent = xpNeeded > 0 ? (data.xp / xpNeeded) * 100 : 0;
                    return (
                        <li key={skill} style={{ marginBottom: '8px' }}>
                            <div>
                                {skill.charAt(0).toUpperCase() + skill.slice(1)}: Level {data.level}
                            </div>
                            <div style={{ fontSize: '0.8em', color: '#666' }}>
                                ({Math.floor(data.xp)} / {xpNeeded} XP)
                            </div>
                            {/* Basic Progress Bar */}
                            <div style={{
                                height: '6px', 
                                width: '100px', 
                                backgroundColor: '#e0e0e0', 
                                borderRadius: '3px',
                                overflow: 'hidden',
                                marginTop: '2px'
                            }}>
                                <div style={{
                                    height: '100%', 
                                    width: `${progressPercent}%`, 
                                    backgroundColor: '#4caf50',
                                    transition: 'width 0.2s ease-in-out'
                                }}></div>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

export default SkillsView; 