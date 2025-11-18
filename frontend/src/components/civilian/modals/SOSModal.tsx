// SOSModal Component
import { type FC, type FormEvent, useState } from 'react';
import { saveReport, addNotification, getCurrentLocation, formatCoordinates, validateReport } from '../utils/civilianPortal';

interface SOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SOSModal: FC<SOSModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    location: '',
    description: '',
    urgent: false
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    const validation = validateReport(formData);
    if (!validation.valid) {
      alert(validation.errors.join('\n'));
      return;
    }

    saveReport(formData);
    addNotification(`SOS sent by ${formData.name}`);
    
    setMessage('SOS sent successfully. Help will be notified if available.');
    
    setTimeout(() => {
      onSuccess();
      onClose();
      setFormData({ name: '', phone: '', location: '', description: '', urgent: false });
      setMessage('');
    }, 1200);
  };

  const handleUseLocation = async () => {
    setLoading(true);
    try {
      const { latitude, longitude } = await getCurrentLocation();
      setFormData({ ...formData, location: formatCoordinates(latitude, longitude) });
    } catch (error) {
      alert(`Unable to get location: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="absolute inset-0 backdrop backdrop-blur-sm backdrop-opacity-60" onClick={onClose} />
      <div className="relative max-w-xl w-full p-6 rounded-lg bg-card-dark border border-border-dark mx-4">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-lg font-semibold">Emergency SOS Report</h4>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-gray-800">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="sos-name" className="block text-sm mb-1">Your name</label>
            <input
              id="sos-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full bg-gray-900/40 border border-border-dark rounded-md px-3 py-2 text-sm"
              placeholder="Your full name"
            />
          </div>

          <div>
            <label htmlFor="sos-phone" className="block text-sm mb-1">Phone</label>
            <input
              id="sos-phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
              className="w-full bg-gray-900/40 border border-border-dark rounded-md px-3 py-2 text-sm"
              placeholder="e.g. +91 98xxxx"
            />
          </div>

          <div>
            <label htmlFor="sos-location" className="block text-sm mb-1">Location</label>
            <div className="flex gap-2">
              <input
                id="sos-location"
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
                className="flex-1 bg-gray-900/40 border border-border-dark rounded-md px-3 py-2 text-sm"
                placeholder="Address or coordinates"
              />
              <button
                type="button"
                onClick={handleUseLocation}
                disabled={loading}
                className="px-3 py-2 rounded-md bg-gray-800 hover:bg-gray-700 text-sm disabled:opacity-50"
              >
                {loading ? 'Getting...' : 'Use my location'}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="sos-description" className="block text-sm mb-1">Description</label>
            <textarea
              id="sos-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full bg-gray-900/40 border border-border-dark rounded-md px-3 py-2 text-sm"
              placeholder="What is happening?"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                id="urgent"
                type="checkbox"
                checked={formData.urgent}
                onChange={(e) => setFormData({ ...formData, urgent: e.target.checked })}
                className="h-4 w-4"
              />
              <label htmlFor="urgent" className="text-sm">Mark as urgent</label>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-500 text-white">
                Send SOS
              </button>
            </div>
          </div>
        </form>

        {message && (
          <div className="mt-4 text-sm text-green-400">{message}</div>
        )}
      </div>
    </div>
  );
};

export default SOSModal;
