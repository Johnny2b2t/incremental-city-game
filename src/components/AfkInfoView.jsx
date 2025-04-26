import React from 'react';

// Helper to format large numbers
const formatNumber = (num) => {
    if (num < 1000) return num.toFixed(1);
    if (num < 1e6) return (num / 1000).toFixed(1) + 'k';
    if (num < 1e9) return (num / 1e6).toFixed(1) + 'M';
    return (num / 1e9).toFixed(1) + 'B';
};

function AfkInfoView({ rates }) {
    if (!rates) {
        return null; // Don't render if no rates calculated
    }

    return (
        <div className="afk-info-view" style={{ 
            fontSize: '0.8em', 
            marginTop: '8px', 
            padding: '5px', 
            border: '1px dashed #aaa',
            backgroundColor: '#f9f9f9'
        }}>
            <strong>Est. Hourly Gains:</strong>
            <ul style={{ listStyle: 'none', paddingLeft: '10px', margin: '2px 0 0 0' }}>
                <li>Kills: {formatNumber(rates.killsPerHour)}</li>
                <li>Combat XP: {formatNumber(rates.xpPerHour)}</li>
                <li>Hero XP: {formatNumber(rates.heroXpPerHour)}</li>
                {Object.entries(rates.lootPerHour).map(([item, amount]) => (
                     amount > 0.1 && (
                        <li key={item}>{item}: {formatNumber(amount)}</li>
                     )
                ))}
            </ul>
        </div>
    );
}

export default AfkInfoView; 