import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Component to edit custom commission amount for a booking
 */
function BookingCommissionEditor({ booking, collaborator, onUpdate, onClose }) {
  // Calculate default commission based on collaborator's rate
  const defaultCommission = (booking.totalAmount || 0) * collaborator.commissionRate;
  
  // Initialize with custom amount if exists, otherwise use default
  const [customAmount, setCustomAmount] = useState(
    booking.customCommissionAmount !== undefined 
      ? booking.customCommissionAmount.toFixed(2)
      : defaultCommission.toFixed(2)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isCustom = booking.customCommissionAmount !== undefined;
  const defaultRate = (collaborator.commissionRate * 100).toFixed(1);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      const amountValue = parseFloat(customAmount);

      if (isNaN(amountValue) || amountValue < 0) {
        setError('Invalid amount. Must be 0 or greater.');
        return;
      }

      const bookingRef = doc(db, 'reservations', booking.id);
      await updateDoc(bookingRef, {
        customCommissionAmount: amountValue
      });

      if (onUpdate) onUpdate();
      if (onClose) onClose();
    } catch (err) {
      console.error('Error updating commission amount:', err);
      setError('Failed to update commission amount.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = async () => {
    try {
      setSaving(true);
      setError('');

      const bookingRef = doc(db, 'reservations', booking.id);
      await updateDoc(bookingRef, {
        customCommissionAmount: null
      });

      if (onUpdate) onUpdate();
      if (onClose) onClose();
    } catch (err) {
      console.error('Error resetting commission amount:', err);
      setError('Failed to reset commission amount.');
    } finally {
      setSaving(false);
    }
  };

  const currentAmount = parseFloat(customAmount) || 0;
  const difference = currentAmount - defaultCommission;
  const effectiveRate = booking.totalAmount > 0 ? (currentAmount / booking.totalAmount) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Adjust Commission Amount</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Collaborator Info */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-600">Collaborator</p>
            <p className="font-medium text-gray-900">{collaborator.name}</p>
            <p className="text-xs text-gray-500 mt-1">
              Default rate: {defaultRate}% → €{defaultCommission.toFixed(2)}
            </p>
          </div>

          {/* Booking Info */}
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-sm text-gray-600">Booking Total</p>
            <p className="font-medium text-gray-900">
              €{(booking.totalAmount || 0).toFixed(2)}
            </p>
          </div>

          {/* Custom Amount Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Commission Amount (€)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="0.00"
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-500">
                {isCustom ? '✏️ Custom amount' : '📋 Using default'}
              </p>
              <button
                onClick={() => setCustomAmount(defaultCommission.toFixed(2))}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Use Default (€{defaultCommission.toFixed(2)})
              </button>
            </div>
          </div>

          {/* Comparison Display */}
          <div className={`rounded-lg p-3 ${difference === 0 ? 'bg-gray-50' : difference > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Effective Rate</p>
                <p className="text-lg font-semibold text-gray-900">
                  {effectiveRate.toFixed(1)}%
                </p>
              </div>
              {difference !== 0 && (
                <div className="text-right">
                  <p className="text-xs text-gray-600">
                    {difference > 0 ? 'Paying more' : 'Paying less'}
                  </p>
                  <p className={`text-sm font-semibold ${difference > 0 ? 'text-amber-700' : 'text-green-700'}`}>
                    {difference > 0 ? '+' : ''}€{difference.toFixed(2)}
                  </p>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              €{currentAmount.toFixed(2)} {difference === 0 ? '(default)' : `vs €${defaultCommission.toFixed(2)} default`}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {isCustom && (
              <button
                onClick={handleResetToDefault}
                disabled={saving}
                className="flex-1 px-4 py-2.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
              >
                Reset to Default
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BookingCommissionEditor;


