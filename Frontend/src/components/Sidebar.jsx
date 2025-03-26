import React from "react";

const Sidebar = ({ onSelectOption }) => {
  return (
    <div>
      <h2 className="text-xl mb-4">Opciones</h2>
      <ul>
        <li>
          <button
            className="block w-full text-left p-2 hover:bg-gray-600"
            onClick={() => onSelectOption("charts")}
          >
            Ver Gráficas
          </button>
        </li>
        <li>
          <button
            className="block w-full text-left p-2 hover:bg-gray-600"
            onClick={() => onSelectOption("form")}
          >
            Ingresar Datos
          </button>
        </li>
        <li>
          <button
            className="block w-full text-left p-2 hover:bg-gray-600"
            onClick={() => onSelectOption("verData")}
          >
            Ver Datos
          </button>
        </li>
      </ul>
    </div>
  );
};

export default Sidebar;