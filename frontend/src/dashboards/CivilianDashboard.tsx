import { type FC, useState, useRef } from 'react';
import type { SessionUser } from '../types';
import SOSModal from '../components/civilian/modals/SOSModal';
import SOSConfirmModal from '../components/civilian/modals/SOSConfirmModal';
import ReportsList from '../components/civilian/lists/ReportsList';
import '../components/civilian/styles/civilian-portal.css';

type Props = {
  user: SessionUser;
};

const CivilianDashboard: FC<Props> = () => {
  const [sosOpen, setSosOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [refresh, setRefresh] = useState(0);
  
  const homeRef = useRef<HTMLDivElement>(null);
  const guidelinesRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

  const handleSosSuccess = () => {
    setRefresh((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-[#0a0e27] text-white">
      {/* Emergency SOS Button - Below Navbar */}
      <div className="bg-[#0a0e27] border-b border-gray-800">
        <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center justify-end">
          <button
            onClick={() => setShowConfirm(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors shadow-lg"
          >
            🚨 Emergency SOS
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-[1400px] mx-auto px-6 py-8">
        {/* Home Section */}
        <div id="civilian-home" ref={homeRef} className="mb-8">
          {/* Active Alert */}
          <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-4 flex items-start gap-3 mb-8">
            <span className="text-red-500 text-xl mt-0.5">⚠️</span>
            <div>
              <span className="font-semibold text-red-400">Active Alert:</span>
              <span className="text-gray-300 ml-2">Wildfires reported in Northern Districts - Evacuate if instructed.</span>
            </div>
          </div>

          {/* Three Column Layout */}
          <div id="civilian-guidelines" ref={guidelinesRef} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Quick Navigation */}
            <div className="bg-[#1a1f3a] border border-gray-800 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-5">
                <span className="text-2xl">📋</span>
                <h2 className="text-xl font-bold">Quick Navigation</h2>
              </div>
              <nav className="space-y-2">
                <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors text-gray-300">
                  Before a Disaster
                </button>
                <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors text-gray-300">
                  During an Emergency
                </button>
                <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors text-gray-300">
                  After a Disaster
                </button>
                <button 
                  onClick={() => portalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors text-gray-300"
                >
                  My Reports
                </button>
                <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors text-gray-300">
                  Emergency Contacts
                </button>
              </nav>
            </div>

            {/* Disaster Preparedness Guidelines */}
            <div className="bg-[#1a1f3a] border border-gray-800 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-5">
                <span className="text-2xl">🛡️</span>
                <h2 className="text-xl font-bold">Disaster Preparedness Guidelines</h2>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3 text-gray-200 uppercase tracking-wide text-sm">Before a Disaster</h3>
                  <ul className="space-y-2.5">
                    <li className="flex items-start gap-2.5">
                      <span className="text-green-500 mt-1">✓</span>
                      <span className="text-gray-300 text-sm">Prepare an emergency kit with essential supplies (water, food, first aid).</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-green-500 mt-1">✓</span>
                      <span className="text-gray-300 text-sm">Know your evacuation routes and assembly points.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-green-500 mt-1">✓</span>
                      <span className="text-gray-300 text-sm">Keep important documents in waterproof containers.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-green-500 mt-1">✓</span>
                      <span className="text-gray-300 text-sm">Maintain a list of emergency contacts.</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-3 text-gray-200 uppercase tracking-wide text-sm">During an Emergency</h3>
                  <ul className="space-y-2.5">
                    <li className="flex items-start gap-2.5">
                      <span className="text-green-500 mt-1">✓</span>
                      <span className="text-gray-300 text-sm">Stay calm and assess the situation.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-green-500 mt-1">✓</span>
                      <span className="text-gray-300 text-sm">Follow instructions from local authorities.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-green-500 mt-1">✓</span>
                      <span className="text-gray-300 text-sm">Use the SOS button above to report your response (immediate).</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-3 text-gray-200 uppercase tracking-wide text-sm">After a Disaster</h3>
                  <ul className="space-y-2.5">
                    <li className="flex items-start gap-2.5">
                      <span className="text-green-500 mt-1">✓</span>
                      <span className="text-gray-300 text-sm">Check for injuries and provide first aid if trained.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Emergency Contacts */}
            <div className="bg-[#1a1f3a] border border-gray-800 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-5">
                <span className="text-2xl">📞</span>
                <h2 className="text-xl font-bold">Emergency Contacts</h2>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-800/40 rounded-lg hover:bg-gray-800/60 transition-colors">
                  <span className="text-gray-300">National Emergency</span>
                  <a href="tel:112" className="text-blue-400 font-bold text-lg hover:text-blue-300">112</a>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-800/40 rounded-lg hover:bg-gray-800/60 transition-colors">
                  <span className="text-gray-300">Police</span>
                  <a href="tel:100" className="text-blue-400 font-bold text-lg hover:text-blue-300">100</a>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-800/40 rounded-lg hover:bg-gray-800/60 transition-colors">
                  <span className="text-gray-300">Fire</span>
                  <a href="tel:101" className="text-blue-400 font-bold text-lg hover:text-blue-300">101</a>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-800/40 rounded-lg hover:bg-gray-800/60 transition-colors">
                  <span className="text-gray-300">Ambulance</span>
                  <a href="tel:102" className="text-blue-400 font-bold text-lg hover:text-blue-300">102</a>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-800/40 rounded-lg hover:bg-gray-800/60 transition-colors">
                  <span className="text-gray-300">Disaster Helpline</span>
                  <a href="tel:1070" className="text-blue-400 font-bold text-lg hover:text-blue-300">1070</a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Your Emergency Reports Section */}
        <section id="civilian-portal" ref={portalRef} className="bg-[#1a1f3a] border border-gray-800 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <span className="text-2xl">📋</span>
            <h2 className="text-2xl font-bold">Your Emergency Reports</h2>
          </div>
          <ReportsList refresh={refresh} />
        </section>
      </main>

      <SOSConfirmModal
        isOpen={showConfirm}
        onConfirm={() => {
          setShowConfirm(false);
          setSosOpen(true);
        }}
        onCancel={() => setShowConfirm(false)}
      />

      <SOSModal
        isOpen={sosOpen}
        onClose={() => setSosOpen(false)}
        onSuccess={handleSosSuccess}
      />
    </div>
  );
};

export default CivilianDashboard;
