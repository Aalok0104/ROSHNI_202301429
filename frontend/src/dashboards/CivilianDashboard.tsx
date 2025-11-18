import { type FC, useState, useRef } from 'react';
import type { SessionUser } from '../types';
import SOSModal from '../components/civilian/modals/SOSModal';
import ReportsList from '../components/civilian/lists/ReportsList';
import NotificationPanel from '../components/civilian/panels/NotificationPanel';
import ProfileModal from '../components/civilian/modals/ProfileModal';
import '../components/civilian/styles/civilian-portal.css';

type Props = {
  user: SessionUser;
};

const CivilianDashboard: FC<Props> = ({ user: initialUser }) => {
  const [user, setUser] = useState(initialUser);
  const [sosOpen, setSosOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [refresh, setRefresh] = useState(0);
  
  const homeRef = useRef<HTMLDivElement>(null);
  const guidelinesRef = useRef<HTMLDivElement>(null);
  const reportsRef = useRef<HTMLDivElement>(null);

  const handleSosSuccess = () => {
    setRefresh((prev) => prev + 1);
  };

  const handleProfileUpdate = (updatedUser: SessionUser) => {
    setUser(updatedUser);
  };

  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    // You can implement actual theme switching logic here
  };

  return (
    <div className="civilian-portal min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/40 px-8 py-3">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-600 rounded flex items-center justify-center text-white font-bold text-sm">
              R
            </div>
            <div>
              <div className="font-bold text-base">ROSHNI</div>
              <div className="text-xs text-gray-400">Citizen Emergency Portal</div>
            </div>
          </div>
          <nav className="flex items-center gap-6">
            <button onClick={() => scrollToSection(homeRef)} className="text-sm text-gray-300 hover:text-white transition-colors">Home</button>
            <button onClick={() => scrollToSection(reportsRef)} className="text-sm text-gray-300 hover:text-white transition-colors">Portal</button>
            <button onClick={() => scrollToSection(guidelinesRef)} className="text-sm text-gray-300 hover:text-white transition-colors">Guidelines</button>
            <button onClick={() => setNotifOpen(true)} className="p-1.5 hover:bg-gray-800 rounded transition-colors text-lg" aria-label="Notifications">🔔</button>
            <button onClick={toggleTheme} className="p-1.5 hover:bg-gray-800 rounded transition-colors text-lg" aria-label="Toggle Theme">🌙</button>
            <button 
              onClick={() => setProfileOpen(true)}
              className="text-sm text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              {user.name?.trim() || user.email}
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1400px] mx-auto px-8 py-6">
        {/* Hero Section */}
        <section ref={homeRef} className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Citizen Emergency Portal</h1>
              <p className="text-gray-400 text-base">Report emergencies and get guidance.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setSosOpen(true)}
                id="sosBtn"
                className="relative px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded text-sm transition-colors"
              >
                SOS Emergency SOS
              </button>
              <button className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded text-sm transition-colors">
                Quick Report
              </button>
            </div>
          </div>
        </section>

        {/* Active Alert */}
        <div className="mb-6 bg-red-900/20 border border-red-800/50 rounded-lg p-3.5 flex items-center gap-3">
          <span className="text-red-500 text-lg">⚠️</span>
          <div className="text-sm">
            <span className="font-semibold text-red-400">Active Alert:</span>
            <span className="text-gray-300 ml-2">Wildfires reported in Northern Districts - Evacuate if instructed.</span>
          </div>
        </div>

        {/* Three Column Layout */}
        <div ref={guidelinesRef} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left Column - Quick Navigation */}
          <div className="bg-gray-900/40 border border-gray-800 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-blue-400 text-lg">📋</span>
              <h2 className="text-lg font-semibold">Quick Navigation</h2>
            </div>
            <nav className="space-y-1">
              <button onClick={() => scrollToSection(guidelinesRef)} className="w-full text-left px-3 py-2 rounded hover:bg-gray-800 transition-colors text-gray-300 text-sm">Before a Disaster</button>
              <button onClick={() => scrollToSection(guidelinesRef)} className="w-full text-left px-3 py-2 rounded hover:bg-gray-800 transition-colors text-gray-300 text-sm">During an Emergency</button>
              <button onClick={() => scrollToSection(guidelinesRef)} className="w-full text-left px-3 py-2 rounded hover:bg-gray-800 transition-colors text-gray-300 text-sm">After a Disaster</button>
              <button onClick={() => scrollToSection(reportsRef)} className="w-full text-left px-3 py-2 rounded hover:bg-gray-800 transition-colors text-gray-300 text-sm">My Reports</button>
              <button onClick={() => scrollToSection(guidelinesRef)} className="w-full text-left px-3 py-2 rounded hover:bg-gray-800 transition-colors text-gray-300 text-sm">Emergency Contacts</button>
            </nav>
          </div>

          {/* Middle Column - Guidelines */}
          <div className="bg-gray-900/40 border border-gray-800 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-blue-400 text-lg">🛡️</span>
              <h2 className="text-lg font-semibold">Disaster Preparedness Guidelines</h2>
            </div>
            
            <div className="space-y-5">
              <div>
                <h3 className="font-semibold mb-2.5 text-gray-200 text-sm">BEFORE A DISASTER</h3>
                <ul className="space-y-2 text-xs">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5 text-sm">✓</span>
                    <span className="text-gray-300">Prepare an emergency kit with essential supplies (water, food, first aid).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5 text-sm">✓</span>
                    <span className="text-gray-300">Know your evacuation routes and assembly points.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5 text-sm">✓</span>
                    <span className="text-gray-300">Keep important documents in waterproof containers.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5 text-sm">✓</span>
                    <span className="text-gray-300">Maintain a list of emergency contacts.</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2.5 text-gray-200 text-sm">DURING AN EMERGENCY</h3>
                <ul className="space-y-2 text-xs">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5 text-sm">✓</span>
                    <span className="text-gray-300">Stay calm and assess the situation.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5 text-sm">✓</span>
                    <span className="text-gray-300">Follow instructions from local authorities.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5 text-sm">✓</span>
                    <span className="text-gray-300">Use the SOS button above to report your response (immediate).</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2.5 text-gray-200 text-sm">AFTER A DISASTER</h3>
                <ul className="space-y-2 text-xs">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5 text-sm">✓</span>
                    <span className="text-gray-300">Check for injuries and provide first aid if trained.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Right Column - Emergency Contacts */}
          <div className="bg-gray-900/40 border border-gray-800 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-blue-400 text-lg">📞</span>
              <h2 className="text-lg font-semibold">Emergency Contacts</h2>
            </div>
            <div className="space-y-2.5">
              <div className="flex justify-between items-center p-2.5 bg-gray-800/40 rounded hover-card">
                <span className="text-gray-300 text-sm">National Emergency</span>
                <a href="tel:112" className="text-blue-400 font-semibold hover:text-blue-300 text-sm">112</a>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-gray-800/40 rounded hover-card">
                <span className="text-gray-300 text-sm">Police</span>
                <a href="tel:100" className="text-blue-400 font-semibold hover:text-blue-300 text-sm">100</a>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-gray-800/40 rounded hover-card">
                <span className="text-gray-300 text-sm">Fire</span>
                <a href="tel:101" className="text-blue-400 font-semibold hover:text-blue-300 text-sm">101</a>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-gray-800/40 rounded hover-card">
                <span className="text-gray-300 text-sm">Ambulance</span>
                <a href="tel:102" className="text-blue-400 font-semibold hover:text-blue-300 text-sm">102</a>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-gray-800/40 rounded hover-card">
                <span className="text-gray-300 text-sm">Disaster Helpline</span>
                <a href="tel:1070" className="text-blue-400 font-semibold hover:text-blue-300 text-sm">1070</a>
              </div>
            </div>
          </div>
        </div>

        {/* My Reports Section */}
        <section ref={reportsRef} className="mt-6 bg-gray-900/40 border border-gray-800 rounded-lg p-5">
          <h2 className="text-lg font-semibold mb-4">📋 Your Emergency Reports</h2>
          <ReportsList refresh={refresh} />
        </section>
      </main>

      <SOSModal
        isOpen={sosOpen}
        onClose={() => setSosOpen(false)}
        onSuccess={handleSosSuccess}
      />

      <NotificationPanel
        isOpen={notifOpen}
        onClose={() => setNotifOpen(false)}
        refresh={refresh}
      />

      <ProfileModal
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        user={user}
        onUpdate={handleProfileUpdate}
      />
    </div>
  );
};

export default CivilianDashboard;
