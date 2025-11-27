// SOSModal Component
import { type FC, type FormEvent, useState, useRef, useEffect } from 'react';
import { getCurrentLocation, formatCoordinates } from '../utils/civilianPortal';
import { API_BASE_URL } from '../../../config';

interface SOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const disasterTypes = [
  'Flood',
  'Earthquake',
  'Fire',
  'Cyclone',
  'Landslide',
  'Tsunami',
  'Drought',
  'Industrial Accident',
  'Terrorist Attack',
  'Epidemic',
  'Nuclear/Chemical Hazard',
  'Other'
];

const severityLevels = [
  'Low',
  'Medium',
  'High'
];

// File size limits
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
const MAX_AUDIO_SIZE = 1 * 1024 * 1024; // 1MB in bytes
const COOLDOWN_DURATION = 60; // 60 seconds (1 minute)

const SOSModal: FC<SOSModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    disasterType: '',
    description: '',
    location: '',
    latitude: null as number | null,
    longitude: null as number | null,
    severity: '',
    image: null as File | null,
    audio: null as File | null
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // Check for cooldown on mount
  useEffect(() => {
    const lastSubmitTime = localStorage.getItem('lastSOSSubmit');
    if (lastSubmitTime) {
      const elapsed = Math.floor((Date.now() - parseInt(lastSubmitTime)) / 1000);
      const remaining = COOLDOWN_DURATION - elapsed;
      if (remaining > 0) {
        setCooldownRemaining(remaining);
      }
    }
  }, []);

  // Cooldown timer effect
  useEffect(() => {
    if (cooldownRemaining > 0) {
      const timer = setInterval(() => {
        setCooldownRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldownRemaining]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Check cooldown
    if (cooldownRemaining > 0) {
      alert(`Please wait ${cooldownRemaining} seconds before submitting another report.`);
      return;
    }
    
    if (!formData.disasterType || !formData.description) {
      alert('Please fill in all required fields: Type of Disaster and Description');
      return;
    }

    // Check if we need to get location
    if (formData.latitude === null || formData.longitude === null) {
      alert('Please provide a location by clicking "Use Current" button or entering coordinates manually');
      return;
    }

    try {
      setLoading(true);

      // Convert disaster type to incident_type format
      const incidentType = formData.disasterType.toLowerCase().replace(/ /g, '_').replace(/\//g, '_');

      // Create incident
      const incidentPayload = {
        latitude: formData.latitude,
        longitude: formData.longitude,
        title: `${formData.disasterType} Emergency${formData.severity ? ` - ${formData.severity} Severity` : ''}`,
        description: formData.description,
        incident_type: incidentType
      };

      console.log('Submitting incident:', incidentPayload);

      const response = await fetch(`${API_BASE_URL}/incidents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(incidentPayload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        console.error('API Error:', errorData);
        throw new Error(errorData.detail || `Server error: ${response.status}`);
      }

      const incident = await response.json();
      console.log('Incident created:', incident);

      // Upload files if present (upload each file separately)
      if (formData.image) {
        try {
          const imageFormData = new FormData();
          imageFormData.append('file', formData.image);

          const imageResponse = await fetch(`${API_BASE_URL}/incidents/${incident.incident_id}/media`, {
            method: 'POST',
            credentials: 'include',
            body: imageFormData
          });

          if (!imageResponse.ok) {
            console.warn('Image upload failed, but incident was created');
          } else {
            console.log('Image uploaded successfully');
          }
        } catch (mediaError) {
          console.error('Image upload error:', mediaError);
        }
      }

      if (formData.audio) {
        try {
          const audioFormData = new FormData();
          audioFormData.append('file', formData.audio);

          const audioResponse = await fetch(`${API_BASE_URL}/incidents/${incident.incident_id}/media`, {
            method: 'POST',
            credentials: 'include',
            body: audioFormData
          });

          if (!audioResponse.ok) {
            console.warn('Audio upload failed, but incident was created');
          } else {
            console.log('Audio uploaded successfully');
          }
        } catch (mediaError) {
          console.error('Audio upload error:', mediaError);
        }
      }

      setMessage('Emergency report submitted successfully.');
      
      // Set cooldown
      localStorage.setItem('lastSOSSubmit', Date.now().toString());
      setCooldownRemaining(COOLDOWN_DURATION);
      
      setTimeout(() => {
        onSuccess();
        onClose();
        setFormData({ 
          disasterType: '', 
          description: '', 
          location: '',
          latitude: null,
          longitude: null,
          severity: '',
          image: null,
          audio: null
        });
        setMessage('');
        setLoading(false);
      }, 1500);
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Failed to submit emergency report. Please try again.');
      setLoading(false);
    }
  };

  const handleUseLocation = async () => {
    setLoading(true);
    try {
      const { latitude, longitude } = await getCurrentLocation();
      setFormData(prev => ({ 
        ...prev, 
        location: formatCoordinates(latitude, longitude),
        latitude,
        longitude
      }));
    } catch (error) {
      alert(`Unable to get location: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Try to parse coordinates from input (e.g., "12.345, 67.890")
    const coordMatch = value.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        setFormData({ ...formData, location: value, latitude: lat, longitude: lng });
        return;
      }
    }
    
    // If no valid coordinates found, just update location text
    setFormData({ ...formData, location: value });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > MAX_IMAGE_SIZE) {
        alert(`Image size must be less than 5MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`);
        e.target.value = '';
        return;
      }
      setFormData({ ...formData, image: file });
    }
  };

  const handleRemoveImage = () => {
    setFormData({ ...formData, image: null });
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > MAX_AUDIO_SIZE) {
        alert(`Audio size must be less than 1MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`);
        e.target.value = '';
        return;
      }
      setFormData({ ...formData, audio: file });
    }
  };

  const handleRemoveAudio = () => {
    setFormData({ ...formData, audio: null });
    if (audioInputRef.current) {
      audioInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-w-2xl w-full bg-white rounded-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-red-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🚨</span>
            <h2 className="text-xl font-bold">Emergency Report</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-red-700 rounded p-1 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-gray-900">
          {/* Type of Disaster */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Type of Disaster <span className="text-red-600">*</span>
            </label>
            <select
              value={formData.disasterType}
              onChange={(e) => setFormData({ ...formData, disasterType: e.target.value })}
              required
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:outline-none text-gray-900 bg-white"
            >
              <option value="">Select disaster type...</option>
              {disasterTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Description <span className="text-red-600">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={4}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:outline-none text-gray-900 bg-white resize-none"
              placeholder="Describe the emergency situation in detail..."
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Location <span className="text-red-600">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.location}
                onChange={handleLocationChange}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:outline-none text-gray-900 bg-white"
                placeholder="Enter location or address"
              />
              <button
                type="button"
                onClick={handleUseLocation}
                disabled={loading}
                className="px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <span className="text-lg">📍</span>
                {loading ? 'Getting...' : 'Use Current'}
              </button>
            </div>
          </div>

          {/* Severity Level */}
          <div>
            <label className="block text-sm font-medium mb-2">Severity Level</label>
            <select
              value={formData.severity}
              onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:outline-none text-gray-900 bg-white"
            >
              <option value="">Select severity...</option>
              {severityLevels.map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>

          {/* Upload Image */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Upload Image (Optional) <span className="text-xs text-gray-500 font-normal">- Max 5MB</span>
            </label>
            {formData.image ? (
              <div className="w-full px-4 py-4 border-2 border-gray-300 rounded-lg bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📷</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{formData.image.name}</p>
                      <p className="text-xs text-gray-500">{(formData.image.size / 1024).toFixed(2)} KB</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-md text-sm font-medium transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => imageInputRef.current?.click()}
                className="w-full px-4 py-8 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:border-red-500 transition-colors bg-gray-50 hover:bg-gray-100"
              >
                <div className="flex flex-col items-center justify-center gap-2 text-gray-600">
                  <span className="text-3xl">📷</span>
                  <span className="text-sm font-medium">Choose File</span>
                </div>
              </div>
            )}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          {/* Upload Audio */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Upload Audio (Optional) <span className="text-xs text-gray-500 font-normal">- Max 1MB</span>
            </label>
            {formData.audio ? (
              <div className="w-full px-4 py-4 border-2 border-gray-300 rounded-lg bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🎤</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{formData.audio.name}</p>
                      <p className="text-xs text-gray-500">{(formData.audio.size / 1024).toFixed(2)} KB</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveAudio}
                    className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-md text-sm font-medium transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => audioInputRef.current?.click()}
                className="w-full px-4 py-8 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:border-red-500 transition-colors bg-gray-50 hover:bg-gray-100"
              >
                <div className="flex flex-col items-center justify-center gap-2 text-gray-600">
                  <span className="text-3xl">🎤</span>
                  <span className="text-sm font-medium">Choose File</span>
                </div>
              </div>
            )}
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
              onChange={handleAudioChange}
              className="hidden"
            />
          </div>

          {/* Buttons */}
          <div className="pt-4 border-t border-gray-200 space-y-3">
            {cooldownRemaining > 0 && (
              <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 flex items-center gap-2">
                <span className="text-yellow-600 text-lg">⏱️</span>
                <p className="text-sm text-yellow-800">
                  <strong>Cooldown Active:</strong> Please wait {cooldownRemaining} second{cooldownRemaining !== 1 ? 's' : ''} before submitting another report.
                </p>
              </div>
            )}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 text-gray-700 hover:text-gray-900 font-medium transition-colors disabled:opacity-50"
              >
                <span>←</span>
                <span>Back</span>
              </button>
              <button
                type="submit"
                disabled={loading || cooldownRemaining > 0}
                className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : cooldownRemaining > 0 ? `Wait ${cooldownRemaining}s` : 'Submit Emergency Report'}
              </button>
            </div>
          </div>
        </form>

        {message && (
          <div className="px-6 pb-6">
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              {message}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SOSModal;
