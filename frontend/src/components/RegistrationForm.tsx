import { useState } from 'react';
import './RegistrationForm.css';

export interface RegistrationData {
  fullName?: string;
  phoneNumber: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  dateOfBirth: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  bloodGroup?: string;
  knownAllergies?: string;
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
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    dateOfBirth: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    bloodGroup: '',
    knownAllergies: '',
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

      // --- Normalize phone numbers to E.164 ---
      const normalizePhone = (phone: string) => {
        // Remove everything except digits and +
        let cleaned = phone.replace(/[^0-9+]/g, '');

        // Ensure it starts with +
        if (!cleaned.startsWith('+')) {
          cleaned = '+' + cleaned;
        }

        return cleaned;
      };

      const normalizedData: RegistrationData = {
        ...formData,
        phoneNumber: normalizePhone(formData.phoneNumber),
        emergencyContactPhone: formData.emergencyContactPhone
          ? normalizePhone(formData.emergencyContactPhone)
          : undefined
      };

      await onSubmit(normalizedData);
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
              <label htmlFor="addressLine1">
                Address Line 1
              </label>
              <input
                type="text"
                id="addressLine1"
                name="addressLine1"
                value={formData.addressLine1}
                onChange={handleChange}
                placeholder="House/Flat No., Building Name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="addressLine2">
                Address Line 2
              </label>
              <input
                type="text"
                id="addressLine2"
                name="addressLine2"
                value={formData.addressLine2}
                onChange={handleChange}
                placeholder="Street, Area, Locality"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="city">
                  City
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="City"
                />
              </div>

              <div className="form-group">
                <label htmlFor="state">
                  State
                </label>
                <input
                  type="text"
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="State"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="pincode">
                Pincode
              </label>
              <input
                type="text"
                id="pincode"
                name="pincode"
                value={formData.pincode}
                onChange={handleChange}
                placeholder="6-digit pincode"
                pattern="[0-9]{6}"
                maxLength={6}
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

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="bloodGroup">
                  Blood Group
                </label>
                <select
                  id="bloodGroup"
                  name="bloodGroup"
                  value={formData.bloodGroup}
                  onChange={handleChange}
                  className="form-select"
                >
                  <option value="">Select Blood Group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="knownAllergies">
                  Known Allergies
                </label>
                <input
                  type="text"
                  id="knownAllergies"
                  name="knownAllergies"
                  value={formData.knownAllergies}
                  onChange={handleChange}
                  placeholder="e.g., Penicillin, Peanuts"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="medicalInfo">
                Additional Medical Information
              </label>
              <textarea
                id="medicalInfo"
                name="medicalInfo"
                value={formData.medicalInfo}
                onChange={handleChange}
                placeholder="Chronic conditions, current medications, or other important medical details"
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
