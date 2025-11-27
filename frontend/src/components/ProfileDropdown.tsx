import React, { useState, useRef, useEffect } from 'react';
import './ProfileDropdown.css';

interface ProfileDropdownProps {
  displayName: string;
  role: string;
  onEditProfile: () => void;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ displayName, role, onEditProfile }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="profile-dropdown" ref={dropdownRef}>
      <button
        className="profile-dropdown__trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="profile-dropdown__name">
          {displayName} <span className="profile-dropdown__role">({role})</span>
        </span>
        <svg 
          className={`profile-dropdown__arrow ${isOpen ? 'profile-dropdown__arrow--open' : ''}`}
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth={2}
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen && (
        <div className="profile-dropdown__menu">
          <button
            className="profile-dropdown__item"
            onClick={() => {
              setIsOpen(false);
              onEditProfile();
            }}
          >
            Edit Profile
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown;
