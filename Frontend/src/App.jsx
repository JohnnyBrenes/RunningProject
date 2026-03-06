import React, { useState, useEffect } from "react";
import Login from "./components/Login";
import Register from "./components/Register";
import Sidebar from "./components/Sidebar";
import InsertData from "./components/InsertData";
import Charts from "./components/Charts";
import ViewData from "./components/ViewData";
import "./i18n"; // Importar configuración de i18n
import useAppTranslation from "./utils/useAppTranslation";
import LanguageSelector from "./components/LanguageSelector";

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [selectedOption, setSelectedOption] = useState("charts");

  const { t, i18n } = useAppTranslation();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return isRegistering ? (
      <Register onRegisterSuccess={() => setIsRegistering(false)} />
    ) : (
      <Login
        onLoginSuccess={() => setIsAuthenticated(true)}
        onSwitchToRegister={() => setIsRegistering(true)}
      />
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar — desktop only */}
      <div className="hidden md:flex md:flex-col md:w-64 bg-gray-800 text-white shadow-xl">
        <div className="p-5 border-b border-gray-700">
          <h1 className="text-lg font-bold tracking-tight">
            🏃 Running Tracker
          </h1>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <LanguageSelector />
          <Sidebar
            selectedOption={selectedOption}
            onSelectOption={setSelectedOption}
          />
        </div>
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="w-full bg-red-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-600 transition-colors"
          >
            {t("logout")}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        {/* Mobile controls */}
        <div className="md:hidden bg-gray-800 text-white">
          {/* Row 1: title + logout */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <span className="font-bold tracking-tight">🏃 Running Tracker</span>
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white text-sm px-3 py-1.5 rounded-lg font-medium hover:bg-red-600 transition-colors"
            >
              {t("logout")}
            </button>
          </div>
          {/* Row 2: nav + language */}
          <div className="flex items-center gap-2 px-4 py-2">
            <select
              value={selectedOption}
              onChange={(e) => setSelectedOption(e.target.value)}
              className="flex-1 p-2 rounded-lg bg-gray-700 text-white border border-gray-600 text-sm"
            >
              <option value="charts">{t("charts")}</option>
              <option value="form">{t("form")}</option>
              <option value="verData">{t("verData")}</option>
            </select>
            <LanguageSelector id="language-mobile" compact />
          </div>
        </div>
        <div className="p-4 md:p-8">
          {selectedOption === "charts" && <Charts />}
          {selectedOption === "form" && <InsertData />}
          {selectedOption === "verData" && <ViewData />}
        </div>
      </div>
    </div>
  );
};

export default App;
