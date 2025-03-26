import React, { useState } from 'react';

const VerData = () => {
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroTenis, setFiltroTenis] = useState('');

  // Datos de ejemplo
  const datos = [
    { id: 1, fecha: '2025-03-01', kilometros: 10, tiempo: '50:03', tenis: 'Nike' },
    { id: 2, fecha: '2025-03-02', kilometros: 12, tiempo: '55:00', tenis: 'Adidas' },
    { id: 3, fecha: '2025-02-15', kilometros: 8, tiempo: '40:30', tenis: 'Nike' },
    { id: 4, fecha: '2025-01-20', kilometros: 15, tiempo: '60:00', tenis: 'Adidas' },
    // Agrega más datos si es necesario
  ];

  // Extraemos el mes de la fecha para facilitar la comparación
  const getMonthFromDate = (date) => new Date(date).toLocaleString('default', { month: 'long' });

  // Filtramos los datos basados en los filtros
  const filteredData = datos.filter(item => {
    return (
      (filtroMes ? getMonthFromDate(item.fecha).toLowerCase().includes(filtroMes.toLowerCase()) : true) &&
      (filtroTenis ? item.tenis.toLowerCase().includes(filtroTenis.toLowerCase()) : true)
    );
  });

  // Lista de meses para el filtro
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Opciones de tenis para el filtro
  const tenisOptions = ['Nike', 'Adidas'];

  return (
    <div className="p-5">
      <h2 className="text-2xl mb-4">Ver Datos</h2>

      {/* Filtro por mes */}
      <div className="mb-4">
        <label className="mr-2">Filtrar por mes:</label>
        <select
          value={filtroMes}
          onChange={e => setFiltroMes(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="">Todos los meses</option>
          {meses.map(mes => (
            <option key={mes} value={mes}>
              {mes}
            </option>
          ))}
        </select>
      </div>

      {/* Filtro por tenis */}
      <div className="mb-4">
        <label className="mr-2">Filtrar por tenis:</label>
        <select
          value={filtroTenis}
          onChange={e => setFiltroTenis(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="">Todos los tenis</option>
          {tenisOptions.map(tenis => (
            <option key={tenis} value={tenis}>
              {tenis}
            </option>
          ))}
        </select>
      </div>

      {/* Tabla de datos filtrados */}
      <table className="table-auto w-full">
        <thead>
          <tr>
            <th className="border p-2">Fecha</th>
            <th className="border p-2">Kilómetros</th>
            <th className="border p-2">Tiempo</th>
            <th className="border p-2">Tenis</th>
          </tr>
        </thead>
        <tbody>
          {filteredData.length > 0 ? (
            filteredData.map(item => (
              <tr key={item.id}>
                <td className="border p-2">{item.fecha}</td>
                <td className="border p-2">{item.kilometros}</td>
                <td className="border p-2">{item.tiempo}</td>
                <td className="border p-2">{item.tenis}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" className="border p-2 text-center">No hay datos disponibles</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default VerData;