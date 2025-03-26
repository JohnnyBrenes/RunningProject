import React, { useState, useEffect } from 'react';
import axios from 'axios';

const VerData = () => {
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroTenis, setFiltroTenis] = useState('');
  const [datos, setDatos] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('http://localhost:5291/api/trainnings');
        setDatos(response.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  // Extraemos el mes de la fecha para facilitar la comparación
  const getMonthFromDate = (date) => new Date(date).toLocaleString('default', { month: 'long' });

  // Filtramos los datos basados en los filtros
  const filteredData = datos.filter(item => {
    return (
      (filtroMes ? getMonthFromDate(item.date).toLowerCase().includes(filtroMes.toLowerCase()) : true) &&
      (filtroTenis ? item.shoes.toLowerCase().includes(filtroTenis.toLowerCase()) : true)
    );
  });

  // Lista de meses para el filtro
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Opciones de tenis para el filtro
  const tenisOptions = ['Nike', 'Adidas'];

  // Formatear la fecha en dd/mm/yyyy
  const formatDate = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Calcular el ritmo promedio (pace)
  const calculatePace = (time, kilometers) => {
    const [minutes, seconds] = time.split(':').map(Number);
    const totalSeconds = minutes * 60 + seconds;
    const paceSeconds = totalSeconds / parseFloat(kilometers);
    const paceMinutes = Math.floor(paceSeconds / 60);
    const paceRemainderSeconds = Math.round(paceSeconds % 60);
    return `${paceMinutes}:${paceRemainderSeconds.toString().padStart(2, '0')} min/km`;
  };

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
      <div className="overflow-hidden rounded-lg shadow-lg">
        <table className="table-auto w-full">
          <thead className="bg-blue-900 text-white">
            <tr>
              <th className="border p-2">Fecha</th>
              <th className="border p-2">Kilómetros</th>
              <th className="border p-2">Tiempo</th>
              <th className="border p-2">Ritmo Promedio</th>
              <th className="border p-2">Tenis</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length > 0 ? (
              filteredData.map((item, index) => (
                <tr key={item.id} className={index % 2 === 0 ? 'bg-gray-100' : ''}>
                  <td className="border p-2">{formatDate(item.date)}</td>
                  <td className="border p-2">{item.kilometers}</td>
                  <td className="border p-2">{item.time}</td>
                  <td className="border p-2">{calculatePace(item.time, item.kilometers)}</td>
                  <td className="border p-2">{item.shoes}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="border p-2 text-center">No hay datos disponibles</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VerData;