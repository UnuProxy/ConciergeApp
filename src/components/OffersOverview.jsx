import React from 'react';
import { useNavigate } from 'react-router-dom';

const OffersOverview = ({ offers = [], loading, language, onRefresh }) => {
  const navigate = useNavigate();
  
  const translations = {
    en: {
      title: 'Client Offers Overview',
      subtitle: 'Track and manage all your client offers',
      status: {
        draft: 'Draft',
        sent: 'Sent',
        viewed: 'Viewed',
        accepted: 'Accepted',
        booked: 'Booked',
        rejected: 'Rejected',
        expired: 'Expired'
      },
      labels: {
        client: 'Client',
        value: 'Value',
        items: 'Items',
        created: 'Created',
        status: 'Status',
        action: 'Action Required',
        noOffers: 'No offers created yet',
        noOffersSubtitle: 'Create offers for your clients in the Clients section',
        totalOffers: 'Total Offers',
        pendingOffers: 'Pending Action',
        bookedOffers: 'Booked',
        daysAgo: 'd ago',
        viewClient: 'View Client',
        refresh: 'Refresh'
      },
      actionNeeded: {
        draft: 'Complete and send offer',
        sent: 'Awaiting client response',
        old: 'Follow up recommended',
        expired: 'Needs update or closure'
      }
    },
    ro: {
      title: 'Prezentare Generală Oferte',
      subtitle: 'Urmăriți și gestionați toate ofertele clienților',
      status: {
        draft: 'Ciornă',
        sent: 'Trimisă',
        viewed: 'Vizualizată',
        accepted: 'Acceptată',
        booked: 'Rezervată',
        rejected: 'Respinsă',
        expired: 'Expirată'
      },
      labels: {
        client: 'Client',
        value: 'Valoare',
        items: 'Servicii',
        created: 'Creată',
        status: 'Status',
        action: 'Necesită Acțiune',
        noOffers: 'Nicio ofertă creată încă',
        noOffersSubtitle: 'Creați oferte pentru clienții dvs. în secțiunea Clienți',
        totalOffers: 'Total Oferte',
        pendingOffers: 'În Așteptare',
        bookedOffers: 'Rezervate',
        daysAgo: 'z',
        viewClient: 'Vezi Client',
        refresh: 'Actualizează'
      },
      actionNeeded: {
        draft: 'Completați și trimiteți oferta',
        sent: 'Se așteaptă răspunsul clientului',
        old: 'Recomandare follow-up',
        expired: 'Necesită actualizare sau închidere'
      }
    }
  };

  const t = translations[language] || translations.en;
  const locale = language === 'ro' ? 'ro-RO' : 'en-US';

  // Calculate days since creation
  const getDaysAgo = (createdAt) => {
    if (!createdAt) return 0;
    try {
      const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
      if (isNaN(date.getTime())) return 0;
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch {
      return 0;
    }
  };

  // Determine if action is needed
  const getActionStatus = (offer) => {
    const daysAgo = getDaysAgo(offer.createdAt);
    
    if (offer.status === 'draft') {
      return { needed: true, message: t.actionNeeded.draft, priority: 'high' };
    }
    
    if (offer.status === 'sent' && daysAgo > 7) {
      return { needed: true, message: t.actionNeeded.old, priority: 'medium' };
    }
    
    if (offer.status === 'sent' && daysAgo <= 7) {
      return { needed: true, message: t.actionNeeded.sent, priority: 'low' };
    }
    
    if (offer.status === 'expired') {
      return { needed: true, message: t.actionNeeded.expired, priority: 'medium' };
    }
    
    return { needed: false, message: '', priority: 'none' };
  };

  // Format currency - always use € symbol
  const formatCurrency = (amount = 0) => {
    const formattedAmount = Number(amount || 0).toLocaleString(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return `€${formattedAmount}`;
  };

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-700 border-gray-300',
      sent: 'bg-blue-50 text-blue-700 border-blue-300',
      viewed: 'bg-purple-50 text-purple-700 border-purple-300',
      accepted: 'bg-green-50 text-green-700 border-green-300',
      booked: 'bg-emerald-50 text-emerald-700 border-emerald-300',
      rejected: 'bg-rose-50 text-rose-700 border-rose-300',
      expired: 'bg-orange-50 text-orange-700 border-orange-300'
    };
    return colors[status] || colors.draft;
  };

  // Calculate stats - ensure offers is always an array
  const offersList = Array.isArray(offers) ? offers : [];
  
  const stats = {
    total: offersList.length,
    pending: offersList.filter(o => ['draft', 'sent', 'viewed'].includes(o.status)).length,
    booked: offersList.filter(o => o.status === 'booked').length
  };

  // Filter and sort offers - show action-required offers first
  const sortedOffers = [...offersList].sort((a, b) => {
    const actionA = getActionStatus(a);
    const actionB = getActionStatus(b);
    
    // Priority sorting
    const priorityOrder = { high: 3, medium: 2, low: 1, none: 0 };
    if (priorityOrder[actionA.priority] !== priorityOrder[actionB.priority]) {
      return priorityOrder[actionB.priority] - priorityOrder[actionA.priority];
    }
    
    // Then by date (newest first)
    const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
    const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
    return dateB - dateA;
  });

  const handleViewClient = (offer) => {
    // Navigate to clients page with the client selected
    navigate('/clients/existing', { state: { clientId: offer.clientId } });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-6 lg:p-10 shadow-sm border border-gray-200">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-100 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 lg:p-10 shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex justify-between items-start mb-6 lg:mb-8">
        <div>
          <h3 className="text-xl lg:text-2xl font-extralight text-gray-900 mb-2">{t.title}</h3>
          <p className="text-gray-500 text-sm">{t.subtitle}</p>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title={t.labels.refresh}
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-4 border border-gray-200">
          <div className="text-2xl lg:text-3xl font-extralight text-gray-900 mb-1">{stats.total}</div>
          <div className="text-gray-600 text-xs lg:text-sm font-medium">{t.labels.totalOffers}</div>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl p-4 border border-amber-200">
          <div className="text-2xl lg:text-3xl font-extralight text-gray-900 mb-1">{stats.pending}</div>
          <div className="text-amber-700 text-xs lg:text-sm font-medium">{t.labels.pendingOffers}</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-4 border border-emerald-200">
          <div className="text-2xl lg:text-3xl font-extralight text-gray-900 mb-1">{stats.booked}</div>
          <div className="text-emerald-700 text-xs lg:text-sm font-medium">{t.labels.bookedOffers}</div>
        </div>
      </div>

      {/* Offers List */}
      <div className="space-y-4">
        {sortedOffers.length > 0 ? (
          sortedOffers.map((offer) => {
            const actionStatus = getActionStatus(offer);
            const daysAgo = getDaysAgo(offer.createdAt);
            
            // Safe date handling
            let createdDate;
            try {
              if (offer.createdAt?.toDate) {
                createdDate = offer.createdAt.toDate();
              } else if (offer.createdAt?.seconds) {
                createdDate = new Date(offer.createdAt.seconds * 1000);
              } else if (offer.createdAt) {
                createdDate = new Date(offer.createdAt);
              } else {
                createdDate = new Date();
              }
              // Validate the date
              if (isNaN(createdDate.getTime())) {
                createdDate = new Date();
              }
            } catch {
              createdDate = new Date();
            }

            return (
              <div
                key={offer.id}
                className={`p-4 lg:p-6 rounded-2xl border transition-all duration-300 hover:shadow-md ${
                  actionStatus.needed
                    ? actionStatus.priority === 'high'
                      ? 'bg-rose-50 border-rose-200 hover:border-rose-300'
                      : actionStatus.priority === 'medium'
                      ? 'bg-amber-50 border-amber-200 hover:border-amber-300'
                      : 'bg-blue-50 border-blue-200 hover:border-blue-300'
                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Main Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-base lg:text-lg font-medium text-gray-900 mb-1 truncate">
                          {offer.clientName || t.labels.client}
                        </h4>
                        <p className="text-sm text-gray-600 truncate">{offer.clientEmail}</p>
                      </div>
                      <div className={`ml-4 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(offer.status)}`}>
                        {t.status[offer.status] || offer.status}
                      </div>
                    </div>

                    {/* Offer Details */}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-2">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-semibold text-gray-900">{formatCurrency(offer.totalValue)}</span>
                      </div>
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        <span>{offer.items?.length || 0} {t.labels.items}</span>
                      </div>
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>
                          {(() => {
                            try {
                              const dateStr = createdDate.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
                              return dateStr !== 'Invalid Date' ? dateStr : 'N/A';
                            } catch {
                              return 'N/A';
                            }
                          })()}
                          {daysAgo > 0 && <span className="text-gray-400 ml-1">({daysAgo}{t.labels.daysAgo})</span>}
                        </span>
                      </div>
                    </div>

                    {/* Action Needed Alert */}
                    {actionStatus.needed && (
                      <div className={`flex items-center text-sm mt-3 ${
                        actionStatus.priority === 'high' ? 'text-rose-700' :
                        actionStatus.priority === 'medium' ? 'text-amber-700' :
                        'text-blue-700'
                      }`}>
                        <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="font-medium">{actionStatus.message}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="flex-shrink-0">
                    <button
                      onClick={() => handleViewClient(offer)}
                      className="w-full lg:w-auto px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl hover:from-amber-600 hover:to-amber-700 transition-all duration-300 shadow-sm hover:shadow-md font-medium text-sm"
                    >
                      {t.labels.viewClient}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 lg:py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-900 font-medium mb-2">{t.labels.noOffers}</p>
            <p className="text-gray-500 text-sm">{t.labels.noOffersSubtitle}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OffersOverview;

