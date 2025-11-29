import React, { useState, useEffect } from 'react';
import { X, Search, Newspaper } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../config';

interface NewsState {
  id: number;
  name: string;
}

interface NewsCity {
  id: number;
  name: string;
}

interface NewsInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToNews: (stateId: number, cityName: string, keyword?: string) => void;
}

const NewsInputModal: React.FC<NewsInputModalProps> = ({ isOpen, onClose, onNavigateToNews }) => {
  const [states, setStates] = useState<NewsState[]>([]);
  const [cities, setCities] = useState<NewsCity[]>([]);
  const [selectedStateId, setSelectedStateId] = useState<number | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch states on mount
  useEffect(() => {
    if (isOpen) {
      fetchStates();
    }
  }, [isOpen]);

  // Fetch cities when state changes
  useEffect(() => {
    if (selectedStateId) {
      fetchCities(selectedStateId);
    } else {
      setCities([]);
      setSelectedCity('');
    }
  }, [selectedStateId]);

  const fetchStates = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE_URL}/api/disaster-news/states`, {
        withCredentials: true
      });
      setStates(response.data);
    } catch (err: any) {
      setError('Failed to load states');
      console.error('States fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCities = async (stateId: number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE_URL}/api/disaster-news/cities/${stateId}`, {
        withCredentials: true
      });
      setCities(response.data);
    } catch (err: any) {
      setError('Failed to load cities');
      console.error('Cities fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = () => {
    if (!selectedStateId || !selectedCity) {
      setError('Please select both state and city');
      return;
    }
    onNavigateToNews(selectedStateId, selectedCity, keyword || undefined);
    handleClose();
  };

  const handleClose = () => {
    setSelectedStateId(null);
    setSelectedCity('');
    setKeyword('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl border border-purple-500/20 shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <Newspaper className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-bold text-white">Quick Analyze</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* State Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select State <span className="text-red-400">*</span>
            </label>
            <select
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              value={selectedStateId || ''}
              onChange={(e) => setSelectedStateId(Number(e.target.value) || null)}
              disabled={loading}
            >
              <option value="">-- Select State --</option>
              {states.map((state) => (
                <option key={state.id} value={state.id}>
                  {state.name}
                </option>
              ))}
            </select>
          </div>

          {/* City Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select City <span className="text-red-400">*</span>
            </label>
            <select
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              disabled={!selectedStateId || loading}
            >
              <option value="">-- Select City --</option>
              {cities.map((city) => (
                <option key={city.id} value={city.name}>
                  {city.name}
                </option>
              ))}
            </select>
          </div>

          {/* Keyword Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Keyword (Optional)
            </label>
            <input
              type="text"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="e.g., cyclone, flood, earthquake"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700 bg-gray-900/50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAnalyze}
            disabled={!selectedStateId || !selectedCity || loading}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold px-6 py-2 rounded-lg transition-colors"
          >
            <Search className="w-4 h-4" />
            Analyze
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewsInputModal;
