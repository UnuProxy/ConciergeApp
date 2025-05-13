// src/pages/SelectCompany.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

export default function SelectCompany() {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { currentUser, assignUserToCompany } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Make sure we have a logged-in user
    if (!currentUser) {
      navigate('/login');
      return;
    }

    async function loadCompanies() {
      try {
        const companiesRef = collection(db, 'companies');
        const snapshot = await getDocs(companiesRef);
        const companiesList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setCompanies(companiesList);
        if (companiesList.length === 0) {
          // Add seed companies if none exist
          setError('No companies found in the database. Please contact an administrator.');
        }
      } catch (error) {
        setError('Failed to load companies: ' + error.message);
      } finally {
        setLoading(false);
      }
    }

    loadCompanies();
  }, [currentUser, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!selectedCompany) {
      setError('Please select a company');
      return;
    }
    
    try {
      setLoading(true);
      const success = await assignUserToCompany(selectedCompany);
      
      if (success) {
        navigate('/');
      } else {
        setError('Failed to assign company. Please try again.');
      }
    } catch (error) {
      setError('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>Loading...</div>;
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f3f4f6'
    }}>
      <div style={{
        maxWidth: '400px',
        width: '100%',
        padding: '2rem',
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      }}>
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#111827'
          }}>
            Select Your Company
          </h2>
          <p style={{ color: '#6B7280', marginTop: '0.5rem' }}>
            Please select which company you belong to
          </p>
        </div>
        
        {error && (
          <div style={{
            padding: '0.75rem',
            marginBottom: '1rem',
            backgroundColor: '#FEE2E2',
            color: '#B91C1C',
            borderRadius: '0.375rem'
          }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label
              htmlFor="company"
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151'
              }}
            >
              Company
            </label>
            <select
              id="company"
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.625rem',
                borderRadius: '0.375rem',
                border: '1px solid #D1D5DB',
                backgroundColor: 'white'
              }}
            >
              <option value="">Select a company</option>
              {companies.map(company => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
          
          <button
            type="submit"
            disabled={loading || !selectedCompany}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              backgroundColor: '#4F46E5',
              color: 'white',
              borderRadius: '0.375rem',
              fontWeight: '500',
              border: 'none',
              cursor: (loading || !selectedCompany) ? 'not-allowed' : 'pointer',
              opacity: (loading || !selectedCompany) ? '0.7' : '1'
            }}
          >
            {loading ? 'Processing...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}