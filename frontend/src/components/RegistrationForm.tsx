import { useState } from 'react';
import type { UserRole } from '../types';
import './RegistrationForm.css';

export interface RegistrationData {
  fullName?: string;
  phoneNumber: string;
  address?: string;
  dateOfBirth: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  medicalInfo?: string;
}

interface RegistrationFormProps {
  email: string;
  googleName?: string;
  onSubmit: (data: RegistrationData) => Promise<void>;
  onCancel: () => void;
}

const RegistrationForm = ({ email, googleName, onSubmit, onCancel }: RegistrationFormProps) => {
  const [formData, setFormData] = useState<RegistrationData>({
    fullName: googleName || '',
    phoneNumber: '',
    address: '',
    dateOfBirth: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    medicalInfo: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic validation
    if (!formData.phoneNumber.trim()) {
      setError('Phone number is required');
      return;
    }

    if (!formData.dateOfBirth) {
      setError('Date of birth is required');
      return;
    }

    try {
      setLoading(true);
      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="registration-container">
      <div className="registration-card">
        <div className="registration-header">
          <img src="/logo/logo.png" alt="Roshni logo" className="registration-logo" />
          <h1>Complete Your Registration</h1>
          <p className="registration-subtitle">Welcome! Please provide additional details to complete your account setup.</p>
          <p className="registration-email">Signing up as: <strong>{email}</strong></p>
        </div>

        <form onSubmit={handleSubmit} className="registration-form">
          <div className="form-section">
            <h2>Personal Information</h2>
            
            <div className="form-group">
              <label htmlFor="fullName">
                Full Name
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Enter your full name (or leave as is)"
              />
              <small className="form-help">Your name was imported from Google. You can edit it if needed.</small>
            </div>

            <div className="form-group">
              <label htmlFor="phoneNumber">
                Phone Number <span className="required">*</span>
              </label>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                required
                placeholder="+91 XXXXX XXXXX"
              />
            </div>

            <div className="form-group">
              <label htmlFor="dateOfBirth">
                Date of Birth <span className="required">*</span>
              </label>
              <input
                type="date"
                id="dateOfBirth"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                required
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="form-group">
              <label htmlFor="address">
                Address
              </label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Enter your full address"
                rows={3}
              />
            </div>
          </div>

          <div className="form-section">
            <h2>Emergency Contact (Optional)</h2>
            
            <div className="form-group">
              <label htmlFor="emergencyContactName">
                Contact Name
              </label>
              <input
                type="text"
                id="emergencyContactName"
                name="emergencyContactName"
                value={formData.emergencyContactName}
                onChange={handleChange}
                placeholder="Emergency contact's name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="emergencyContactPhone">
                Contact Phone
              </label>
              <input
                type="tel"
                id="emergencyContactPhone"
                name="emergencyContactPhone"
                value={formData.emergencyContactPhone}
                onChange={handleChange}
                placeholder="+91 XXXXX XXXXX"
              />
            </div>
          </div>

          <div className="form-section">
            <h2>Medical Information (Optional)</h2>
            
            <div className="form-group">
              <label htmlFor="medicalInfo">
                Medical Conditions, Allergies, Blood Type, etc.
              </label>
              <textarea
                id="medicalInfo"
                name="medicalInfo"
                value={formData.medicalInfo}
                onChange={handleChange}
                placeholder="Any medical information that might be important in an emergency"
                rows={4}
              />
              <small className="form-help">This information will be kept confidential and used only in emergencies</small>
            </div>
          </div>

          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Completing Registration...' : 'Complete Registration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegistrationForm;
