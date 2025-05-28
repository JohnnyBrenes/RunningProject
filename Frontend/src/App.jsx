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
    <div className="flex h-screen">
      {/* Sidebar en pantallas grandes */}
      <div className="hidden md:block md:w-64 bg-gray-800 text-white p-5">
        {/* Selector de idioma reutilizable */}
        <LanguageSelector />
        <Sidebar onSelectOption={setSelectedOption} />
        <button
          onClick={handleLogout}
          className="mt-4 w-full bg-red-500 text-white p-2 rounded"
        >
          {t("logout")}
        </button>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 p-5 overflow-auto">
        {/* Selector de idioma en pantallas pequeñas */}
        <div className="md:hidden mb-4 flex flex-col gap-4">
          <LanguageSelector id="language-mobile" />
          <button
            onClick={handleLogout}
            className="w-full bg-red-500 text-white p-2 rounded"
          >
            {t("logout")}
          </button>
          <select
            value={selectedOption}
            onChange={(e) => setSelectedOption(e.target.value)}
            className="p-2 border rounded w-full"
          >
            <option value="charts">{t("charts")}</option>
            <option value="form">{t("form")}</option>
            <option value="verData">{t("verData")}</option>
          </select>
        </div>

        {/* Contenido según la opción seleccionada */}
        {selectedOption === "charts" && <Charts />}
        {selectedOption === "form" && <InsertData />}
        {selectedOption === "verData" && <ViewData />}
      </div>
    </div>
  );
};

export default App;
