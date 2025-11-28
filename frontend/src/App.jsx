import { Route, Routes, useLocation } from "react-router";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import CreatorLandingPage from "./pages/CreatorLandingPage";
import AnalyzePage from "./pages/AnalyzePage";
import ResultsPage from "./pages/ResultsPage";
import useAuthStore from "./store/authStore";

const App = () => {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);

  // Use Kiwi landing page for all visitors on root
  const isCreatorLanding = location.pathname === "/" || location.pathname === "/analyze" || location.pathname === "/results";

  return (
    <div className="relative h-full w-full">
      {/* Background color based on route */}
      <div className={`fixed inset-0 -z-10 transition-colors duration-500 ${
        isCreatorLanding ? 'bg-gradient-to-br from-emerald-50 via-lime-50 to-yellow-50' : 'bg-base-100'
      }`} />
      
      {/* Content wrapper with page transitions */}
      <div className="relative z-10">
        <Routes location={location}>
          {/* Kiwi Routes */}
          <Route path="/" element={<CreatorLandingPage />} />
          <Route path="/analyze" element={<AnalyzePage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Routes>
      </div>
    </div>
  );
};
export default App;
