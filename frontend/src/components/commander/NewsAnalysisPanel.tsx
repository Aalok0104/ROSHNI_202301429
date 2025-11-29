import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Newspaper, AlertCircle, CheckCircle, XCircle, Loader2, Search, TrendingUp, ExternalLink } from 'lucide-react';
import { API_BASE_URL } from '../../config';

interface NewsState {
  id: number;
  name: string;
}

interface NewsCity {
  id: number;
  name: string;
}

interface NewsArticle {
  source: string;
  title: string;
  description: string;
  link: string;
  published: string;
  prediction: 'REAL' | 'FAKE' | 'UNAVAILABLE';
  confidence: number | null;
  disaster_keyword?: string | null;
  priority_score?: number | null;
}

interface AnalysisResponse {
  success: boolean;
  total_articles: number;
  fake_count: number;
  real_count: number;
  unavailable_count: number;
  articles: NewsArticle[];
  message: string;
}

interface PredefinedParams {
  stateId: number;
  city: string;
  keyword?: string;
}

interface NewsAnalysisPanelProps {
  predefinedParams?: PredefinedParams | null;
}

const NewsAnalysisPanel: React.FC<NewsAnalysisPanelProps> = ({ predefinedParams }) => {
  const [states, setStates] = useState<NewsState[]>([]);
  const [cities, setCities] = useState<NewsCity[]>([]);
  const [selectedStateId, setSelectedStateId] = useState<number | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [results, setResults] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch states on component mount
  useEffect(() => {
    fetchStates();
  }, []);

  // Auto-execute if predefinedParams exist
  useEffect(() => {
    if (predefinedParams && predefinedParams.stateId && predefinedParams.city) {
      setSelectedStateId(predefinedParams.stateId);
      setSelectedCity(predefinedParams.city);
      setKeyword(predefinedParams.keyword || '');
      // Trigger analysis after state is set
      setTimeout(() => {
        handleAnalyze(predefinedParams.stateId, predefinedParams.city, predefinedParams.keyword);
      }, 100);
    }
  }, [predefinedParams]);

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
      const response = await axios.get(`${API_BASE_URL}/api/disaster-news/states`, {
        withCredentials: true
      });
      setStates(response.data);
    } catch (err: any) {
      setError('Failed to load states: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchCities = async (stateId: number) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/disaster-news/cities/${stateId}`, {
        withCredentials: true
      });
      setCities(response.data);
    } catch (err: any) {
      setError('Failed to load cities: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async (stateId?: number, city?: string, kw?: string) => {
    const analyzeStateId = stateId || selectedStateId;
    const analyzeCity = city || selectedCity;
    const analyzeKeyword = kw !== undefined ? kw : keyword;

    if (!analyzeStateId || !analyzeCity) {
      setError('Please select both state and city');
      return;
    }

    try {
      setAnalyzing(true);
      setError(null);
      setResults(null);

      const response = await axios.post<AnalysisResponse>(
        `${API_BASE_URL}/api/disaster-news/analyze`,
        {
          state_id: analyzeStateId,
          city: analyzeCity,
          keyword: analyzeKeyword || null
        },
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      setResults(response.data);
    } catch (err: any) {
      setError(
        'Analysis failed: ' + 
        (err.response?.data?.detail || err.message)
      );
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Newspaper className="w-8 h-8 text-purple-400" />
            <h1 className="text-3xl font-bold text-white">Disaster News Analysis</h1>
          </div>
          <p className="text-gray-400">Analyze and verify disaster-related news from various sources</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Controls Card */}
        <div className="bg-gray-800 rounded-xl border border-purple-500/20 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* State Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select State
              </label>
              <select
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                Select City
              </label>
              <select
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., flood, earthquake"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
          </div>

          {/* Analyze Button */}
          <button
            onClick={() => handleAnalyze()}
            disabled={!selectedStateId || !selectedCity || analyzing}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Analyze News
              </>
            )}
          </button>
        </div>

        {/* Results Summary */}
        {results && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800 rounded-xl border border-purple-500/20 p-4">
              <div className="text-gray-400 text-sm mb-1">Total Articles</div>
              <div className="text-2xl font-bold text-white flex items-center gap-2">
                {results.total_articles}
                <TrendingUp className="w-5 h-5 text-purple-400" />
              </div>
            </div>
            <div className="bg-gray-800 rounded-xl border border-green-500/20 p-4">
              <div className="text-gray-400 text-sm mb-1">Real News</div>
              <div className="text-2xl font-bold text-green-400 flex items-center gap-2">
                {results.real_count}
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>
            <div className="bg-gray-800 rounded-xl border border-red-500/20 p-4">
              <div className="text-gray-400 text-sm mb-1">Fake News</div>
              <div className="text-2xl font-bold text-red-400 flex items-center gap-2">
                {results.fake_count}
                <XCircle className="w-5 h-5" />
              </div>
            </div>
            <div className="bg-gray-800 rounded-xl border border-gray-500/20 p-4">
              <div className="text-gray-400 text-sm mb-1">Unavailable</div>
              <div className="text-2xl font-bold text-gray-400 flex items-center gap-2">
                {results.unavailable_count}
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>
          </div>
        )}

        {/* Results Cards */}
        {results && results.articles.length > 0 && (
          <div className="space-y-3">
            {results.articles.map((article, index) => (
              <div
                key={index}
                className="bg-gray-800 rounded-lg border border-purple-500/20 shadow-lg p-4 hover:border-purple-500/40 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Verdict Badge (Left) */}
                  <div className="flex-shrink-0 pt-1">
                    {article.prediction === 'FAKE' ? (
                      <div className="inline-flex flex-col items-center gap-1">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
                          <XCircle className="w-3 h-3" />
                          FAKE
                        </span>
                        {article.confidence !== null && (
                          <span className="text-xs font-bold text-red-400">
                            {(article.confidence * 100).toFixed(1)}%
                          </span>
                        )}
                      </div>
                    ) : article.prediction === 'REAL' ? (
                      <div className="inline-flex flex-col items-center gap-1">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
                          <CheckCircle className="w-3 h-3" />
                          REAL
                        </span>
                        {article.confidence !== null && (
                          <span className="text-xs font-bold text-green-400">
                            {(article.confidence * 100).toFixed(1)}%
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="inline-flex flex-col items-center gap-1">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gray-500/20 text-gray-400 border border-gray-500/30">
                          <AlertCircle className="w-3 h-3" />
                          N/A
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content (Center - Takes Available Space) */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-white mb-1 line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-sm text-gray-400 mb-2 line-clamp-2">
                      {article.description}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <Newspaper className="w-3 h-3" />
                        {article.source}
                      </span>
                      {article.published && article.published !== 'N/A' && (
                        <span>{article.published}</span>
                      )}
                      {article.disaster_keyword && (
                        <span className="text-purple-400 font-medium">
                          • {article.disaster_keyword}
                        </span>
                      )}
                      {article.priority_score !== undefined && article.priority_score !== null && (
                        <span className="text-yellow-400">
                          ⚡ {article.priority_score}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* External Link (Right) */}
                  <div className="flex-shrink-0">
                    <a
                      href={article.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors"
                      aria-label="Open article"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Results Message */}
        {results && results.articles.length === 0 && (
          <div className="bg-gray-800 rounded-xl border border-purple-500/20 p-12 text-center">
            <Newspaper className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No Articles Found</h3>
            <p className="text-gray-500">
              No disaster-related news articles were found for the selected location and keyword.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsAnalysisPanel;
