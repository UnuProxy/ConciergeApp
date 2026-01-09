import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Component to edit custom commission rate for a booking
 */
function BookingCommissionEditor({ booking, collaborator, onUpdate, onClose }) {
  const [customRate, setCustomRate] = useState(
    booking.customCommissionRate !== undefined 
      ? (booking.customCommissionRate * 100).toFixed(1)
      : (collaborator.commissionRate * 100).toFixed(1)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const defaultRate = (collaborator.commissionRate * 100).toFixed(1);
  const isCustom = booking.customCommissionRate !== undefined;

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      const rateValue = parseFloat(customRate) / 100;

      if (isNaN(rateValue) || rateValue < 0 || rateValue > 100) {
        setError('Invalid rate. Must be between 0% and 100%.');
        return;
      }

      const bookingRef = doc(db, 'reservations', booking.id);
      await updateDoc(bookingRef, {
        customCommissionRate: rateValue
      });

      if (onUpdate) onUpdate();
      if (onClose) onClose();
    } catch (err) {
      console.error('Error updating commission rate:', err);
      setError('Failed to update commission rate.');
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
        customCommissionRate: null
      });

      if (onUpdate) onUpdate();
      if (onClose) onClose();
    } catch (err) {
      console.error('Error resetting commission rate:', err);
      setError('Failed to reset commission rate.');
    } finally {
      setSaving(false);
    }
  };

  const calculatedCommission = (booking.totalAmount || 0) * (parseFloat(customRate) / 100);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Adjust Commission Rate</h3>
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
              Default rate: {defaultRate}%
            </p>
          </div>

          {/* Booking Info */}
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-sm text-gray-600">Booking Total</p>
            <p className="font-medium text-gray-900">
              €{(booking.totalAmount || 0).toFixed(2)}
            </p>
          </div>

          {/* Custom Rate Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Commission Rate (%)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={customRate}
              onChange={(e) => setCustomRate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="5.0"
            />
            <p className="text-xs text-gray-500 mt-1">
              {isCustom ? '✏️ Custom rate for this booking' : '📋 Using default rate'}
            </p>
          </div>

          {/* Calculated Commission */}
          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-sm text-gray-600">Calculated Commission</p>
            <p className="text-lg font-semibold text-green-700">
              €{calculatedCommission.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {parseFloat(customRate).toFixed(1)}% of €{(booking.totalAmount || 0).toFixed(2)}
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

