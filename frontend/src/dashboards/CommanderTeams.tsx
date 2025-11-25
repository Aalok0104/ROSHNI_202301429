import React, { useState } from 'react';
import '../components/commander/TeamManagement/teamsManagementStyles.css';
import TeamsManagement from '../components/commander/TeamManagement/TeamsManagement';
import TeamRespondersManagement from '../components/commander/TeamManagement/TeamRespondersManagement';
import SelectResponders from '../components/commander/TeamManagement/SelectResponders';

type View = 'TEAMS_LIST' | 'TEAM_DETAILS' | 'ADD_RESPONDERS';

interface ActiveTeamContext {
  id: string;
  name: string;
}

const CommanderTeams: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('TEAMS_LIST');
  const [activeTeam, setActiveTeam] = useState<ActiveTeamContext | null>(null);

  const navigateToTeamDetails = (teamId: string, teamName: string) => {
    setActiveTeam({ id: teamId, name: teamName });
    setCurrentView('TEAM_DETAILS');
  };

  const navigateToAddResponders = (teamId: string, teamName: string) => {
    setActiveTeam({ id: teamId, name: teamName });
    setCurrentView('ADD_RESPONDERS');
  };

  const navigateToTeamsList = () => {
    setActiveTeam(null);
    setCurrentView('TEAMS_LIST');
  };

  const navigateBackToTeamDetails = () => {
    setCurrentView('TEAM_DETAILS');
  };

  const renderView = () => {
    if (!activeTeam && currentView !== 'TEAMS_LIST') {
      navigateToTeamsList();
      return <TeamsManagement onViewTeamDetails={navigateToTeamDetails} />;
    }

    switch (currentView) {
      case 'TEAMS_LIST':
        return <TeamsManagement onViewTeamDetails={navigateToTeamDetails} />;
      case 'TEAM_DETAILS':
        return (
          <TeamRespondersManagement
            teamId={activeTeam!.id}
            teamName={activeTeam!.name}
            onBackToTeams={navigateToTeamsList}
            onNavigateToAddResponders={navigateToAddResponders}
          />
        );
      case 'ADD_RESPONDERS':
        return (
          <SelectResponders
            teamId={activeTeam!.id}
            teamName={activeTeam!.name}
            onBackToTeamManagement={navigateBackToTeamDetails}
          />
        );
      default:
        return <TeamsManagement onViewTeamDetails={navigateToTeamDetails} />;
    }
  };

  return (
    <div className="commander-app-container">
      {renderView()}
    </div>
  );
};

export default CommanderTeams;
