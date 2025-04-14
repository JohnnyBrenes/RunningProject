import React, { useState, useEffect } from "react";
import Login from "./components/Login";
import Register from "./components/Register";
import Sidebar from "./components/Sidebar";
import Formulario from "./components/Formulario";
import Charts from "./components/Charts";
import VerData from "./components/VerData";

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Estado de autenticación
  const [isRegistering, setIsRegistering] = useState(false); // Controla si está en la pantalla de registro
  const [selectedOption, setSelectedOption] = useState("charts"); // Controla la vista actual

  // Verificar si el usuario ya está autenticado al cargar la app
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  // Manejar el cierre de sesión
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    setIsAuthenticated(false);
  };

  // Si no está autenticado, mostrar Login o Register
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

  // Si está autenticado, mostrar el contenido principal
  return (
    <div className="flex h-screen">
      {/* Sidebar en pantallas grandes */}
      <div className="hidden md:block md:w-64 bg-gray-800 text-white p-5">
        <Sidebar onSelectOption={setSelectedOption} />
        <button
          onClick={handleLogout}
          className="mt-4 w-full bg-red-500 text-white p-2 rounded"
        >
          Cerrar Sesión
        </button>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 p-5 overflow-auto">
        {/* Botón Cerrar Sesión y Select de opciones en pantallas pequeñas */}
        <div className="md:hidden mb-4 flex flex-col gap-4">
          <button
            onClick={handleLogout}
            className="w-full bg-red-500 text-white p-2 rounded"
          >
            Cerrar Sesión
          </button>
          <select
            value={selectedOption}
            onChange={(e) => setSelectedOption(e.target.value)}
            className="p-2 border rounded w-full"
          >
            <option value="charts">Ver Gráficas</option>
            <option value="form">Ingresar Datos</option>
            <option value="verData">Ver Datos</option>
          </select>
        </div>

        {/* Contenido según la opción seleccionada */}
        {selectedOption === "charts" && <Charts />}
        {selectedOption === "form" && <Formulario />}
        {selectedOption === "verData" && <VerData />}
      </div>
    </div>
  );
};

export default App;
