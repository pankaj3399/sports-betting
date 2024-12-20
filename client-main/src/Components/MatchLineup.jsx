import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../Components/ui/card';

const PlayerList = ({ players }) => {
  if (!players || players.length === 0) {
    return <div className="text-gray-500">No players available</div>;
  }

  return (
    <div className="space-y-2">
      {players
        .filter(p => p.player)
        .map(player => (
          <div 
            key={player.player._id} 
            className="flex items-center gap-3 p-2 bg-gray-50 rounded"
          >
            <span className="font-medium">{player.player.name}</span>
          </div>
        ))}
    </div>
  );
};

const MatchLineup = ({ match }) => {
  if (!match?.homeTeam?.players && !match?.awayTeam?.players) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 text-center text-gray-500">
          No lineup data available
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl flex items-center justify-between">
          <span>{match?.homeTeam?.teamName || 'Home Team'}</span>
          <span className="text-sm text-gray-500">vs</span>
          <span>{match?.awayTeam?.teamName || 'Away Team'}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-8">
          <div>
            <h3 className="font-medium text-lg mb-4">Home Team</h3>
            <PlayerList players={match?.homeTeam?.players || []} />
          </div>
          <div>
            <h3 className="font-medium text-lg mb-4">Away Team</h3>
            <PlayerList players={match?.awayTeam?.players || []} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MatchLineup;