// src/components/EmergencyReportForm.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import * as civilianApi from '../api/civilian';
import '../styles.css';

interface EmergencyReportFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function EmergencyReportForm({ onClose, onSuccess }: EmergencyReportFormProps) {
  const { user } = useAuth();
  const [disasterType, setDisasterType] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('medium');
  const [image, setImage] = useState<File | null>(null);
  const [audio, setAudio] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setImage(e.target.files[0]);
    }
  };

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setAudio(e.target.files[0]);
    }
  };

  // generate temporary object URLs for preview and revoke when file changes
  useEffect(() => {
    let imgUrl: string | null = null;
    if (image) {
      imgUrl = URL.createObjectURL(image);
      setImagePreview(imgUrl);
    } else {
      setImagePreview(null);
    }
    return () => {
      if (imgUrl) URL.revokeObjectURL(imgUrl);
    };
  }, [image]);

  useEffect(() => {
    let audUrl: string | null = null;
    if (audio) {
      audUrl = URL.createObjectURL(audio);
      setAudioPreview(audUrl);
    } else {
      setAudioPreview(null);
    }
    return () => {
      if (audUrl) URL.revokeObjectURL(audUrl);
    };
  }, [audio]);

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
  };

  const removeAudio = () => {
    setAudio(null);
    setAudioPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!disasterType || !description) {
      setError('Disaster type and description are required');
      return;
    }

    if (!user) {
      setError('You must be logged in to submit a report');
      return;
    }

    setIsSubmitting(true);

    // Convert files to data URLs so they persist in the mock DB (json-server)
    const fileToDataUrl = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });
    };

    let imageUrl: string | null = null;
    let audioUrl: string | null = null;
    try {
      if (image) imageUrl = await fileToDataUrl(image);
      if (audio) audioUrl = await fileToDataUrl(audio);
    } catch (err) {
      console.error('Failed to read files', err);
      setError('Failed to read uploaded files');
      setIsSubmitting(false);
      return;
    }

    const report = {
      userId: user.id,
      username: user.username,
      disasterType,
      description,
      location: location || 'Not specified',
      severity,
      imageUrl,
      audioUrl,
    };

    const result = await civilianApi.submitIncidentReport(report);

    setIsSubmitting(false);

    if (result) {
      alert('Emergency report submitted successfully!');
      onSuccess();
      onClose();
    } else {
      setError('Failed to submit report. Please try again.');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content emergency-form">
        <div className="emergency-form-header">
          <h2 className="text-2xl font-bold text-white">🚨 Emergency Report</h2>
          <button onClick={onClose} className="modal-close-btn">×</button>
        </div>

        <form onSubmit={handleSubmit} className="emergency-form-body">
          <div className="form-group">
            <label className="form-label required">Type of Disaster *</label>
            <select
              value={disasterType}
              onChange={(e) => setDisasterType(e.target.value)}
              className="form-input"
              required
            >
              <option value="">-- Select Disaster Type --</option>
              <option value="Fire">Fire</option>
              <option value="Flood">Flood</option>
              <option value="Earthquake">Earthquake</option>
              <option value="Cyclone">Cyclone</option>
              <option value="Landslide">Landslide</option>
              <option value="Industrial Accident">Industrial Accident</option>
              <option value="Medical Emergency">Medical Emergency</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label required">Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-input"
              rows={4}
              placeholder="Describe the emergency situation in detail..."
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="form-input"
              placeholder="Enter location or address"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Severity Level</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as 'low' | 'medium' | 'high')}
              className="form-input"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High - Critical</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="image-input">Upload Image (Optional)</label>
            <input
              id="image-input"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="form-input file-input"
            />
            {image && (
              <div className="file-preview" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {imagePreview ? (
                  <img src={imagePreview} alt="preview" style={{ width: 120, height: 'auto', borderRadius: 6 }} />
                ) : (
                  <span>📷 {image.name}</span>
                )}
                <button type="button" className="btn btn-secondary" onClick={removeImage} style={{ alignSelf: 'flex-start' }}>Remove</button>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="audio-input">Upload Audio (Optional)</label>
            <input
              id="audio-input"
              type="file"
              accept="audio/*"
              onChange={handleAudioChange}
              className="form-input file-input"
            />
            {audio && (
              <div className="file-preview" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {audioPreview ? (
                  <audio controls src={audioPreview} style={{ width: '100%', maxWidth: 300 }}>
                    <track kind="captions" srcLang="en" label="captions" src="" />
                  </audio>
                ) : (
                  <span>🎤 {audio.name}</span>
                )}
                <button type="button" className="btn btn-secondary" onClick={removeAudio} style={{ alignSelf: 'flex-start' }}>Remove</button>
              </div>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              ← Back
            </button>
            <button
              type="submit"
              className="btn btn-danger"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : '🚨 Submit Emergency Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
