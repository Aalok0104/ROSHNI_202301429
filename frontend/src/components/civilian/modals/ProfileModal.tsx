import { type FC, type FormEvent, useState, useEffect } from 'react';
import type { SessionUser } from '../../../types';
import axios from 'axios';
import { API_BASE_URL } from '../../../config';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: SessionUser;
  onUpdate: (updatedUser: SessionUser) => void;
}

const ProfileModal: FC<ProfileModalProps> = ({ isOpen, onClose, user, onUpdate }) => {
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email,
    phone: '',
    address: '',
    dateOfBirth: '',
    emergencyContactName: '',
    emergencyContact: '',
    medicalInfo: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      // Fetch current profile data
      const fetchProfile = async () => {
        try {
          const response = await axios.get(`${API_BASE_URL}/api/users/profile`, {
            withCredentials: true
          });
          // Handle medical_info which might be a JSON object
          const medicalInfoText = response.data.medical_info 
            ? (typeof response.data.medical_info === 'object' 
                ? JSON.stringify(response.data.medical_info) 
                : response.data.medical_info)
            : '';
          
          setFormData({
            name: response.data.name || '',
            email: response.data.email,
            phone: response.data.phone || '',
            address: response.data.address || '',
            dateOfBirth: response.data.date_of_birth || '',
            emergencyContactName: response.data.emergency_contact_name || '',
            emergencyContact: response.data.emergency_contact || '',
            medicalInfo: medicalInfoText,
          });
        } catch (err: any) {
          console.error('Error fetching profile:', err);
          setError(err.response?.data?.detail || 'Failed to load profile');
        }
      };
      fetchProfile();
    }
  }, [isOpen, user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await axios.put(
        `${API_BASE_URL}/api/users/profile`,
        {
          phone: formData.phone,
          address: formData.address,
          date_of_birth: formData.dateOfBirth,
          emergency_contact_name: formData.emergencyContactName,
          emergency_contact: formData.emergencyContact,
          medical_info: formData.medicalInfo,
        },
        {
          withCredentials: true
        }
      );

      setMessage('Profile updated successfully!');
      onUpdate({ ...user, name: formData.name });
      
      setTimeout(() => {
        onClose();
        setMessage('');
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="absolute inset-0 backdrop backdrop-blur-sm bg-black/60" onClick={onClose} />
      <div className="relative max-w-2xl w-full p-6 rounded-lg bg-gray-900 border border-gray-800 mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Edit Profile</h2>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-gray-800 transition-colors text-xl">✕</button>
        </div>

        {message && (
          <div className="mb-4 p-3 bg-green-900/30 border border-green-700 rounded-md text-green-400 text-sm">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-md text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="profile-name" className="block text-sm font-medium mb-2">Full Name</label>
            <input
              id="profile-name"
              type="text"
              value={formData.name}
              disabled
              className="w-full bg-gray-800/30 border border-gray-700 rounded-md px-4 py-2.5 text-sm text-gray-500 cursor-not-allowed"
              placeholder="Name cannot be changed"
            />
          </div>

          <div>
            <label htmlFor="profile-email" className="block text-sm font-medium mb-2">Email</label>
            <input
              id="profile-email"
              type="email"
              value={formData.email}
              disabled
              className="w-full bg-gray-800/30 border border-gray-700 rounded-md px-4 py-2.5 text-sm text-gray-500 cursor-not-allowed"
              placeholder="Email cannot be changed"
            />
          </div>

          <div>
            <label htmlFor="profile-phone" className="block text-sm font-medium mb-2">Phone Number</label>
            <input
              id="profile-phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-md px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none transition-colors"
              placeholder="e.g. +91 9876543210"
            />
          </div>

          <div>
            <label htmlFor="profile-address" className="block text-sm font-medium mb-2">Address</label>
            <textarea
              id="profile-address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={3}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-md px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none transition-colors resize-none"
              placeholder="Enter your full address"
            />
          </div>

          <div>
            <label htmlFor="profile-dob" className="block text-sm font-medium mb-2">Date of Birth</label>
            <input
              id="profile-dob"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              max={new Date().toISOString().split('T')[0]}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-md px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>

          <div className="border-t border-gray-700 pt-4">
            <h3 className="text-base font-semibold mb-3">Emergency Contact</h3>
          
            <div>
              <label htmlFor="profile-emergency-name" className="block text-sm font-medium mb-2">Emergency Contact Name</label>
              <input
                id="profile-emergency-name"
                type="text"
                value={formData.emergencyContactName}
                onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-md px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none transition-colors"
                placeholder="Name of emergency contact person"
              />
            </div>

            <div className="mt-4">
              <label htmlFor="profile-emergency" className="block text-sm font-medium mb-2">Emergency Contact Number</label>
              <input
                id="profile-emergency"
                type="tel"
                value={formData.emergencyContact}
                onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-md px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none transition-colors"
                placeholder="Emergency contact phone number"
              />
            </div>
          </div>

          <div className="border-t border-gray-700 pt-4">
            <h3 className="text-base font-semibold mb-3">Medical Information</h3>
            <label htmlFor="profile-medical" className="block text-sm font-medium mb-2">Medical Conditions, Allergies, Blood Type</label>
            <textarea
              id="profile-medical"
              value={formData.medicalInfo}
              onChange={(e) => setFormData({ ...formData, medicalInfo: e.target.value })}
              rows={4}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-md px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none transition-colors resize-none"
              placeholder={formData.medicalInfo ? undefined : "Enter your Medical Information (e.g., Blood Type: O+, Allergies: Penicillin, Conditions: Diabetes)"}
            />
            <p className="text-xs text-gray-500 mt-2">This information is kept confidential and used only in emergencies</p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-md bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileModal;