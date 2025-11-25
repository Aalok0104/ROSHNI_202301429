import React, { useState } from 'react';
import './teamsManagementStyles.css'; // Import CSS here instead
import TeamsManagement from './TeamsManagement'; // Lists all teams
import TeamRespondersManagement from './TeamRespondersManagement'; // Lists members of one team
import SelectResponders from './SelectResponders'; // Lists available responders to add

// --- 1. Define App Views and Context ---

type View = 'TEAMS_LIST' | 'TEAM_DETAILS' | 'ADD_RESPONDERS';

interface ActiveTeamContext {
    id: string;
    name: string;
}

const TeamManagementContainer: React.FC = () => {
    // State to track the current page being displayed
    const [currentView, setCurrentView] = useState<View>('TEAMS_LIST');
    
    // State to hold the details of the team the commander is currently working on
    const [activeTeam, setActiveTeam] = useState<ActiveTeamContext | null>(null);

    // --- 2. Navigation Handler Functions ---
    
    // Handler for viewing a team's members (Triggered by clicking a team in TeamsManagement)
    const navigateToTeamDetails = (teamId: string, teamName: string) => {
        setActiveTeam({ id: teamId, name: teamName });
        setCurrentView('TEAM_DETAILS');
    };
    
    // Handler for going to the available responders page (Triggered by the button in TeamRespondersManagement)
    const navigateToAddResponders = (teamId: string, teamName: string) => {
        setActiveTeam({ id: teamId, name: teamName });
        setCurrentView('ADD_RESPONDERS'); // <--- Triggers the new page (SelectResponders)
    };
    
    // Handler for going back from the main list (Triggered by the button in TeamRespondersManagement)
    const navigateToTeamsList = () => {
        setActiveTeam(null);
        setCurrentView('TEAMS_LIST');
    };
    
    // Handler for going back to the Team Details page (Triggered by the button in SelectResponders)
    const navigateBackToTeamDetails = () => {
        setCurrentView('TEAM_DETAILS');
    };


    // --- 3. Conditional Rendering Logic ---
    const renderView = () => {
        // Safety check: if we are supposed to be on a details page but lost the active team context
        if (!activeTeam && currentView !== 'TEAMS_LIST') {
            navigateToTeamsList();
            return <TeamsManagement onViewTeamDetails={navigateToTeamDetails} />;
        }
        
        switch (currentView) {
            
            case 'TEAMS_LIST':
                // Renders the main list of all teams
                return (
                    <TeamsManagement 
                        // Note: TeamsManagement needs to be updated to use this prop when a team name is clicked
                        onViewTeamDetails={navigateToTeamDetails} 
                    />
                );

            case 'TEAM_DETAILS':
                // Renders the page showing current team members (image_af41f0.png)
                return (
                    <TeamRespondersManagement
                        teamId={activeTeam!.id}
                        teamName={activeTeam!.name}
                        onBackToTeams={navigateToTeamsList}
                        onNavigateToAddResponders={navigateToAddResponders} // Passed to the 'Add New Responder' button
                    />
                );

            case 'ADD_RESPONDERS':
                // Renders the available responder list page (image_af9b8c.png)
                return (
                    <SelectResponders
                        teamId={activeTeam!.id}
                        teamName={activeTeam!.name}
                        onBackToTeamManagement={navigateBackToTeamDetails} // Passed to the 'Back to Team' button
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

export default TeamManagementContainer;