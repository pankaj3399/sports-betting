import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Header from './Components/Header';
import Home from './Components/Home';
import AddPlayer from './Components/AddPlayer';
import Matches from './Components/Matches';
import PlayersPage from './Components/PlayersPage';
import AddMatch from './Components/AddMatch';
import EditMatchPage from './Components/EditMatchPage';
import PredictMatchPage from './Components/PredictMatchPage';
import NationalTeamsPage from './Components/NationalTeamsPage';
import NationalTeamPlayersPage from './Components/NationalTeamPlayersPage';
import Players from './Components/Players';
import FixturesPage from './Components/FixturesPage';
import AddFixture from './Components/AddFixture';

function App() {
  return (
    <Router>
      <div className='flex flex-col'>
        <Header />
        <Routes>
          <Route path='/' element={<Home/>} />
          <Route path='/national-teams' element={<NationalTeamsPage/>} />
          <Route path='/addplayer' element={<AddPlayer/>} />
          <Route path='/players' element={<Players/>} />
          <Route path='/matches' element={<Matches/>} />
          <Route path='/fixtures' element={<FixturesPage/>} />
          <Route path='/clubs/:clubId/players' element={<PlayersPage/>} />
          <Route path='/national-teams/:teamId/players' element={<NationalTeamPlayersPage/>} /> 
          <Route path='/matches/add' element={<AddMatch/>} />
          <Route path='/fixtures/add' element={<AddFixture/>} />
          <Route path='/match/edit/:matchId' element={<EditMatchPage />} />
          <Route path='/predict-match' element={<PredictMatchPage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App