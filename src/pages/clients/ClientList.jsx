import React, { useState } from 'react';

function ClientList({ 
  filteredClients, 
  selectedClient, 
  onSelectClient,
  searchTerm,
  onSearchChange,
  filter,
  onFilterChange,
  t
}) {
  const [showFilter, setShowFilter] = useState(false);
  
  return (
    <div className="left-column">
      {/* Search and Filter */}
      <div className="search-container">
        <div className="search-input-container">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder={t.search}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-container">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className="filter-button"
          >
            <span className="filter-icon">⚙️</span>
            {filter === 'all' ? t.filterAll : 
             filter === 'active' ? t.filterActive :
             filter === 'inactive' ? t.filterInactive : t.filterVip}
            <span className="chevron-icon">▼</span>
          </button>
          
          {showFilter && (
            <div className="dropdown">
              {['all', 'active', 'inactive', 'vip'].map(filterOption => (
                <button 
                  key={filterOption}
                  onClick={() => {
                    onFilterChange(filterOption);
                    setShowFilter(false);
                  }}
                  className="dropdown-item"
                >
                  {t[`filter${filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}`]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Client List */}
      <div className="client-list">
        {filteredClients.length === 0 ? (
          <p className="no-clients">{t.noClientsFound}</p>
        ) : (
          filteredClients.map(client => (
            <div 
              key={client.id}
              onClick={() => onSelectClient(client)}
              className={`client-item ${selectedClient?.id === client.id ? 'selected' : ''}`}
            >
              <div className="client-item-content">
                <div>
                  <div className="client-name">{client.name}</div>
                  <div className="client-email">{client.email}</div>
                  <div className="client-phone">{client.phone}</div>
                </div>
                <div>
                  <span className={`status-badge ${client.isVip ? 'vip' : client.status}`}>
                    {client.isVip ? 'VIP' : client.status}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ClientList;