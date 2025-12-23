import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import LeaderboardPage from './pages/LeaderboardPage.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/leaderboard/:inviteCode" element={<LeaderboardPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
