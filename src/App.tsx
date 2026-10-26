import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { LangProvider } from './lib/i18n';
import TopBar from './components/TopBar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Planner from './pages/Planner';
import LandingSites from './pages/LandingSites';
import Missions from './pages/Missions';
import About from './pages/About';

function ScrollToTop() {
  const loc = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);
  return null;
}



export default function App() {
  return (
    <LangProvider>
      <HashRouter>
        <ScrollToTop />
        <TopBar />
        <main className="min-h-[calc(100dvh-3.5rem)]">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/planner" element={<Planner />} />
            <Route path="/landing-sites" element={<LandingSites />} />
            <Route path="/missions" element={<Missions />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </main>
        <Footer />
      </HashRouter>
    </LangProvider>
  );
}
