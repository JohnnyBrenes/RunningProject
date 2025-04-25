import React, { useState, useEffect } from 'react';
import Api from '../utils/Api';

const VerData = () => {
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroTenis, setFiltroTenis] = useState('');
  const [datos, setDatos] = useState([]);
  const [sortColumn, setSortColumn] = useState('');
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' o 'desc'
  const [currentPage, setCurrentPage] = useState(1); // Página actual
  const recordsPerPage = 15; // Registros por página

  useEffect(() => {
    const fetchData = async () => {
      try {
        const username = localStorage.getItem('username');
        const response = await Api.get(`/api/Trainnings/user/${username}`);
        
        setDatos(response.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  // Lista de meses en español
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Extraemos el mes de la fecha basado en índices
  const getMonthFromDate = (date) => {
    const monthIndex = new Date(date).getMonth();
    return meses[monthIndex];
  };

  // Formatear la fecha en dd/mm/yyyy
  const formatDate = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0'); // Asegurar dos dígitos para el día
    const month = String(d.getMonth() + 1).padStart(2, '0'); // Asegurar dos dígitos para el mes
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Filtramos los datos basados en los filtros
  const filteredData = datos.filter(item => {
    const monthMatches = filtroMes === "" || getMonthFromDate(item.date).toLowerCase() === filtroMes.toLowerCase();
    const shoesMatches = filtroTenis === "" || item.shoes.toLowerCase() === filtroTenis.toLowerCase();
    return monthMatches && shoesMatches;
  });

  // Ordenar los datos según la columna seleccionada
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortColumn) return 0; // Si no hay columna seleccionada, no ordenar

    let valueA = a[sortColumn];
    let valueB = b[sortColumn];

    // Si la columna es 'date', convertir las fechas a objetos Date para ordenarlas correctamente
    if (sortColumn === 'date') {
      valueA = new Date(valueA.split('/').reverse().join('-')); // Convertir dd/mm/yyyy a yyyy-mm-dd
      valueB = new Date(valueB.split('/').reverse().join('-'));
    }

    if (typeof valueA === 'string' && typeof valueB === 'string') {
      return sortOrder === 'asc'
        ? valueA.localeCompare(valueB)
        : valueB.localeCompare(valueA);
    } else if (typeof valueA === 'number' && typeof valueB === 'number') {
      return sortOrder === 'asc' ? valueA - valueB : valueB - valueA;
    } else if (valueA instanceof Date && valueB instanceof Date) {
      return sortOrder === 'asc' ? valueA - valueB : valueB - valueA;
    }

    return 0;
  });

  // Calcular los datos de la página actual
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentData = sortedData.slice(indexOfFirstRecord, indexOfLastRecord);

  // Calcular el número total de páginas
  const totalPages = Math.ceil(sortedData.length / recordsPerPage);

  // Manejar el cambio de página
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Manejar la eliminación de un registro
  const handleDelete = async (id) => {
    if (window.confirm('¿Está seguro de que desea borrar este registro?')) {
      try {
        await Api.delete(`/api/trainnings/${id}`);
        setDatos(prevDatos => prevDatos.filter(item => item.id !== id));
        console.log(`Registro con ID ${id} eliminado.`);
      } catch (error) {
        console.error('Error al eliminar el registro:', error);
      }
    }
  };

  // Calcular totales
  const totalKilometers = filteredData.reduce((sum, item) => sum + item.kilometers, 0);

  const totalTime = filteredData.reduce((sum, item) => {
    const [minutes, seconds] = item.time.split(':').map(Number);
    return sum + minutes * 60 + seconds; // Convertir todo a segundos
  }, 0);

  const formattedTotalTime = () => {
    const hours = Math.floor(totalTime / 3600);
    const minutes = Math.floor((totalTime % 3600) / 60);
    const seconds = totalTime % 60;
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const averagePace = () => {
    if (totalKilometers === 0) return '0:00';
    const paceSeconds = totalTime / totalKilometers;
    const paceMinutes = Math.floor(paceSeconds / 60);
    const paceRemainderSeconds = Math.round(paceSeconds % 60);
    return `${paceMinutes}:${String(paceRemainderSeconds).padStart(2, '0')} min/km`;
  };

  // Renderizamos el componente
  return (
    <div className="p-5">
      <h2 className="text-2xl mb-4">Ver Datos</h2>

      {/* Filtros y Totales */}
      <div className="flex flex-wrap gap-4 mb-6">
        {/* Filtros */}
        <div>
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

          <div className="mb-4">
            <label className="mr-2">Filtrar por tenis:</label>
            <select
              value={filtroTenis}
              onChange={e => setFiltroTenis(e.target.value)}
              className="p-2 border rounded"
            >
              <option value="">Todos los tenis</option>
              {[...new Set(datos.map(item => item.shoes))].map(tenis => (
                <option key={tenis} value={tenis}>
                  {tenis}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Totales */}
        <div className="p-4 bg-gray-100 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-2">Totales</h3>
          <p><strong>Kilómetros Totales:</strong> {totalKilometers.toFixed(2)} km</p>
          <p><strong>Tiempo Total:</strong> {formattedTotalTime()}</p>
          <p><strong>Ritmo Promedio:</strong> {averagePace()}</p>
        </div>
      </div>

      {/* Tabla de datos filtrados */}
      <div className="overflow-x-auto rounded-lg shadow-lg">
        <table className="table-auto w-full">
          <thead className="bg-blue-900 text-white">
            <tr>
              <th
                className={`border p-2 cursor-pointer ${sortColumn === 'date' ? 'bg-blue-700' : ''}`}
                onClick={() => {
                  if (sortColumn === 'date') {
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortColumn('date');
                    setSortOrder('desc'); // Orden descendente por defecto
                  }
                }}
              >
                Fecha {sortColumn === 'date' && (sortOrder === 'asc' ? '▼' : '▲')}
              </th>
              <th
                className={`border p-2 cursor-pointer ${sortColumn === 'kilometers' ? 'bg-blue-700' : ''}`}
                onClick={() => {
                  if (sortColumn === 'kilometers') {
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortColumn('kilometers');
                    setSortOrder('desc'); // Orden descendente por defecto
                  }
                }}
              >
                Kilómetros {sortColumn === 'kilometers' && (sortOrder === 'asc' ? '▼' : '▲')}
              </th>
              <th
                className={`border p-2 cursor-pointer ${sortColumn === 'time' ? 'bg-blue-700' : ''}`}
                onClick={() => {
                  if (sortColumn === 'time') {
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortColumn('time');
                    setSortOrder('desc'); // Orden descendente por defecto
                  }
                }}
              >
                Tiempo {sortColumn === 'time' && (sortOrder === 'asc' ? '▼' : '▲')}
              </th>
              <th
                className={`border p-2 cursor-pointer ${sortColumn === 'pace' ? 'bg-blue-700' : ''}`}
                onClick={() => {
                  if (sortColumn === 'pace') {
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortColumn('pace');
                    setSortOrder('desc'); // Orden descendente por defecto
                  }
                }}
              >
                Ritmo Promedio {sortColumn === 'pace' && (sortOrder === 'asc' ? '▼' : '▲')}
              </th>
              <th
                className={`border p-2 cursor-pointer ${sortColumn === 'shoes' ? 'bg-blue-700' : ''}`}
                onClick={() => {
                  if (sortColumn === 'shoes') {
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortColumn('shoes');
                    setSortOrder('desc'); // Orden descendente por defecto
                  }
                }}
              >
                Tenis {sortColumn === 'shoes' && (sortOrder === 'asc' ? '▼' : '▲')}
              </th>
              <th className="border p-2">Acciones</th>
            </tr>
          </thead>
          
          {/* Datos de la tabla */}
          <tbody>
            {currentData.length > 0 ? (
              currentData.map((item, index) => (
                <tr key={item.id} className={index % 2 === 0 ? 'bg-gray-100' : ''}>
                  <td className="border p-2">{formatDate(item.date)}</td>
                  <td className="border p-2">{item.kilometers}</td>
                  <td className="border p-2">{item.time}</td>
                  <td className="border p-2">{item.pace}</td>
                  <td className="border p-2">{item.shoes}</td>
                  <td className="border p-2 text-center">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="bg-red-500 text-white px-3 py-1 rounded"
                    >
                      Borrar
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="border p-2 text-center">No hay datos disponibles</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Controles de paginación */}
      <div className="flex justify-center mt-4">
        {Array.from({ length: totalPages }, (_, index) => (
          <button
            key={index + 1}
            onClick={() => handlePageChange(index + 1)}
            className={`px-3 py-1 mx-1 rounded ${currentPage === index + 1 ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            {index + 1}
          </button>
        ))}
      </div>
    </div>
  );
};

export default VerData;