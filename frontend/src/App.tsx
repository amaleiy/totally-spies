import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { Dashboard } from './pages/Dashboard';
import { Cases } from './pages/Cases';
import { Targets } from './pages/Targets';
import { Clover } from './pages/Clover';
import { CaseView } from './pages/CaseView';
import { Exposure } from './pages/Exposure';
import { Breaches } from './pages/Breaches';
import { Scans } from './pages/Scans';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/cases" element={<Cases />} />
          <Route path="/targets" element={<Targets />} />
          <Route path="/clover" element={<Clover />} />
          <Route path="/cases/:id" element={<CaseView />} />
          <Route path="/graph" element={<CaseView />} />
          <Route path="/exposure" element={<Exposure />} />
          <Route path="/breaches" element={<Breaches />} />
          <Route path="/scans" element={<Scans />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
};


