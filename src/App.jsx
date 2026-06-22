import React, { useState } from 'react';
import { useGame } from './context/GameContext';
import AuthScreen from './components/Shared/AuthScreen';
import Header from './components/Dashboard/Header';
import Sidebar from './components/Dashboard/Sidebar';

// We will implement these components next:
import Overview from './components/Dashboard/Overview';
import InventoryGrid from './components/Inventory/InventoryGrid';
import WholesaleMarket from './components/Wholesale/WholesaleMarket';
import MarketplaceBoard from './components/Marketplace/MarketplaceBoard';
import UpgradesPanel from './components/Dashboard/UpgradesPanel';
import LeaderboardList from './components/Leaderboard/LeaderboardList';

export default function App() {
  const { currentUser, loading, toast } = useGame();
  const [activeTab, setActiveTab] = useState('overview');

  if (loading) {
    return (
      <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-secondary)'}}>
        <h3>Loading Simulation Data...</h3>
      </div>
    );
  }

  // Toast Notification Overlay
  const ToastOverlay = () => {
    if (!toast) return null;
    const bg = toast.type === 'error' ? 'var(--accent-red)' : toast.type === 'success' ? 'var(--accent-green)' : 'var(--accent-blue)';
    return (
      <div style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: bg,
        color: toast.type === 'error' ? '#fff' : '#000',
        padding: '0.8rem 1.5rem',
        borderRadius: 'var(--radius-md)',
        fontWeight: '600',
        zIndex: 9999,
        boxShadow: `0 4px 15px ${bg}60`,
        animation: 'fadeIn 0.3s ease forwards'
      }}>
        {toast.message}
      </div>
    );
  };

  if (!currentUser) {
    return (
      <>
        <ToastOverlay />
        <AuthScreen />
      </>
    );
  }

  const renderContent = () => {
    switch(activeTab) {
      case 'overview': return <Overview setActiveTab={setActiveTab} />;
      case 'inventory': return <InventoryGrid />;
      case 'wholesale': return <WholesaleMarket />;
      case 'marketplace': return <MarketplaceBoard />;
      case 'upgrades': return <UpgradesPanel />;
      case 'leaderboard': return <LeaderboardList />;
      default: return <Overview setActiveTab={setActiveTab} />;
    }
  };

  return (
    <>
      <ToastOverlay />
      <div className="dashboard-layout">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <div style={{display: 'flex', flexDirection: 'column', width: '100%', overflow: 'hidden'}}>
          <Header />
          <main style={{flex: 1, padding: '2rem', overflowY: 'auto', backgroundColor: 'var(--bg-primary)'}}>
            {renderContent()}
          </main>
        </div>
      </div>
    </>
  );
}
