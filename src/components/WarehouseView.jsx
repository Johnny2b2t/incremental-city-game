import React from 'react';

function WarehouseView({ resources }) {
    // Filter out resources with 0 amount for a cleaner view, maybe?
    // Or sort them? For now, display all.
    const sortedResources = Object.entries(resources)
                                .sort(([keyA], [keyB]) => keyA.localeCompare(keyB)); // Simple alphabetical sort

    return (
        <div className="warehouse-view section-container">
            <h3>Warehouse</h3>
            <ul style={{ listStyle: 'none', paddingLeft: '0', maxHeight: '200px', overflowY: 'auto' }}>
                {sortedResources.map(([resource, amount]) => (
                    <li key={resource}>
                        {resource.charAt(0).toUpperCase() + resource.slice(1)}: {Math.floor(amount)}
                    </li> 
                ))}
            </ul>
        </div>
    );
}

export default WarehouseView; 