import React, { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { API_BASE_URL } from '../config';
import './EditProfileModal.css';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ProfileData {
  full_name: string;
  email: string;
  phone_number: string;
  address: string;
  date_of_birth: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  blood_group: string;
  known_allergies: string;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    full_name: '',
    email: '',
    phone_number: '',
    address: '',
    date_of_birth: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    blood_group: '',
    known_allergies: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchProfile();
    }
  }, [isOpen]);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/me/profile`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setProfileData({
          full_name: data.full_name || '',
          email: data.email || '',
          phone_number: data.phone_number || '',
          address: data.address || '',
          date_of_birth: data.date_of_birth || '',
          emergency_contact_name: data.emergency_contact_name || '',
          emergency_contact_phone: data.emergency_contact_phone || '',
          blood_group: data.blood_group || '',
          known_allergies: data.known_allergies || ''
        });
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Update profile (excluding name and email)
      const profileResponse = await fetch(`${API_BASE_URL}/users/me/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          address: profileData.address,
          emergency_contact_name: profileData.emergency_contact_name,
          emergency_contact_phone: profileData.emergency_contact_phone
        })
      });

      // Update medical profile
      const medicalResponse = await fetch(`${API_BASE_URL}/users/me/medical`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          blood_group: profileData.blood_group,
          known_allergies: profileData.known_allergies
        })
      });

      if (profileResponse.ok && medicalResponse.ok) {
        alert('Profile updated successfully!');
        onSuccess();
        onClose();
      } else {
        alert('Failed to update profile. Please try again.');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="edit-profile-overlay" onClick={onClose}>
      <div className="edit-profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="edit-profile-header">
          <h2>Edit Profile</h2>
          <button className="edit-profile-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="edit-profile-form">
          <div className="edit-profile-field">
            <label>Full Name</label>
            <input
              type="text"
              value={profileData.full_name}
              disabled
              className="edit-profile-input edit-profile-input--disabled"
            />
          </div>

          <div className="edit-profile-field">
            <label>Email</label>
            <input
              type="email"
              value={profileData.email}
              disabled
              className="edit-profile-input edit-profile-input--disabled"
            />
          </div>

          <div className="edit-profile-field">
            <label>Phone Number</label>
            <input
              type="tel"
              value={profileData.phone_number}
              disabled
              className="edit-profile-input edit-profile-input--disabled"
            />
          </div>

          <div className="edit-profile-field">
            <label>Address</label>
            <textarea
              value={profileData.address}
              onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
              className="edit-profile-textarea"
              rows={3}
            />
          </div>

          <div className="edit-profile-field">
            <label>Date of Birth</label>
            <input
              type="text"
              value={profileData.date_of_birth}
              disabled
              className="edit-profile-input edit-profile-input--disabled"
            />
          </div>

          <div className="edit-profile-section">
            <h3>Emergency Contact</h3>
            
            <div className="edit-profile-field">
              <label>Emergency Contact Name</label>
              <input
                type="text"
                value={profileData.emergency_contact_name}
                onChange={(e) => setProfileData({ ...profileData, emergency_contact_name: e.target.value })}
                className="edit-profile-input"
              />
            </div>

            <div className="edit-profile-field">
              <label>Emergency Contact Number</label>
              <input
                type="tel"
                value={profileData.emergency_contact_phone}
                onChange={(e) => setProfileData({ ...profileData, emergency_contact_phone: e.target.value })}
                className="edit-profile-input"
              />
            </div>
          </div>

          <div className="edit-profile-section">
            <h3>Medical Information</h3>
            
            <div className="edit-profile-field">
              <label>Medical Conditions, Allergies, Blood Type</label>
              <textarea
                value={profileData.known_allergies}
                onChange={(e) => setProfileData({ ...profileData, known_allergies: e.target.value })}
                placeholder="Enter your Medical Information (e.g., Blood Type: O+, Allergies: Penicillin, Conditions: Diabetes)"
                className="edit-profile-textarea"
                rows={4}
              />
              <p className="edit-profile-hint">This information is kept confidential and used only in emergencies</p>
            </div>
          </div>

          <div className="edit-profile-actions">
            <button type="button" onClick={onClose} className="edit-profile-cancel">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="edit-profile-save">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;
