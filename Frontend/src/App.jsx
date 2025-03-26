import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import Formulario from "./components/Formulario";
import Charts from "./components/Charts";
import VerData from "./components/VerData";

const App = () => {
  const [selectedOption, setSelectedOption] = useState("charts");

  // Cambiar entre opciones
  const handleOptionChange = (event) => {
    setSelectedOption(event.target.value);
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar en pantallas grandes */}
      <div className="hidden md:block md:w-64 bg-gray-800 text-white p-5">
        <Sidebar onSelectOption={setSelectedOption} />
      </div>

      {/* Contenido principal */}
      <div className="flex-1 p-5 overflow-auto">
        {/* Select de opciones en pantallas pequeñas */}
        <div className="md:hidden mb-4">
          <select
            value={selectedOption}
            onChange={handleOptionChange}
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