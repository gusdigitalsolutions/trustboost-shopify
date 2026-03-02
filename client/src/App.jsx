import React from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Frame, Navigation } from '@shopify/polaris';
import Dashboard from './pages/Dashboard';
import BadgeEditor from './pages/BadgeEditor';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const navMarkup = (
    <Navigation location={location.pathname}>
      <Navigation.Section items={[
        { label: 'Dashboard', url: '/', onClick: () => navigate('/') },
        { label: 'Badge Editor', url: '/badges', onClick: () => navigate('/badges') },
        { label: 'Analytics', url: '/analytics', onClick: () => navigate('/analytics') },
        { label: 'Settings', url: '/settings', onClick: () => navigate('/settings') },
      ]} />
    </Navigation>
  );
  return (
    <Frame navigation={navMarkup}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/badges" element={<BadgeEditor />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Frame>
  );
}
