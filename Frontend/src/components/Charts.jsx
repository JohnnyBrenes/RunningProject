import React, { useState, useEffect } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, registerables } from 'chart.js';
import Api from '../utils/Api.jsx';
import { use } from 'react';

// Registrar todos los elementos de Chart.js
ChartJS.register(...registerables);

const Charts = () => {
  const [chartType, setChartType] = useState('kms'); // Controla el tipo de gráfica
  const [period, setPeriod] = useState('mes'); // Controla el periodo de comparación
  const [data, setData] = useState([]); // Datos obtenidos del backend

  useEffect(() => {
    const fetchData = async () => {
      try {
        const username = localStorage.getItem('username');
        const response = await Api.get(`/api/Trainnings/user/${username}`);
        setData(response.data);
      } catch (error) {
        console.error('Error fetching data:', error);
        setData([]); // En caso de error, establece datos vacíos
      }
    };

    fetchData();
  }, []);

  // Filtrar los datos según el periodo seleccionado
  const filterDataByPeriod = (data, period) => {
    const now = new Date();
    let filteredData = [];

    if (period === 'mes') {
      const currentMonth = now.getMonth();
      filteredData = data.filter(item => new Date(item.date).getMonth() === currentMonth);
    } else if (period === 'trimestre') {
      const threeMonthsAgo = new Date(now.setMonth(now.getMonth() - 3));
      filteredData = data.filter(item => new Date(item.date) >= threeMonthsAgo);
    } else if (period === 'semestre') {
      const sixMonthsAgo = new Date(now.setMonth(now.getMonth() - 6));
      filteredData = data.filter(item => new Date(item.date) >= sixMonthsAgo);
    } else if (period === 'año') {
      const oneYearAgo = new Date(now.setFullYear(now.getFullYear() - 1));
      filteredData = data.filter(item => new Date(item.date) >= oneYearAgo);
    }

    return filteredData;
  };

  // Obtener los datos filtrados
  const filteredData = filterDataByPeriod(data, period);

  // Función para convertir pace (formato "mm:ss") a minutos como número decimal
  const convertPaceToMinutes = (pace) => {
    const [minutes, seconds] = pace.split(':').map(Number);
    return minutes + seconds / 60;
  };

  // Agrupar los datos por mes para kilómetros
  const groupDataByMonthForKms = (data, period) => {
    const now = new Date();
    let months = [];

    if (period === 'mes') {
      months = [now.toLocaleString('default', { month: 'long' })];
    } else if (period === 'trimestre') {
      for (let i = 0; i < 3; i++) {
        months.push(new Date(now.getFullYear(), now.getMonth() - i).toLocaleString('default', { month: 'long' }));
      }
    } else if (period === 'semestre') {
      for (let i = 0; i < 6; i++) {
        months.push(new Date(now.getFullYear(), now.getMonth() - i).toLocaleString('default', { month: 'long' }));
      }
    } else if (period === 'año') {
      for (let i = 0; i < 12; i++) {
        months.push(new Date(now.getFullYear(), now.getMonth() - i).toLocaleString('default', { month: 'long' }));
      }
    }

    const groupedData = data.reduce((acc, item) => {
      const month = new Date(item.date).toLocaleString('default', { month: 'long' });
      if (!acc[month]) {
        acc[month] = 0;
      }
      acc[month] += item.kilometers;
      return acc;
    }, {});

    const dataWithAllMonths = months.reduce((acc, month) => {
      acc[month] = groupedData[month] || 0;
      return acc;
    }, {});

    return {
      labels: Object.keys(dataWithAllMonths).reverse(),
      datasets: [
        {
          label: 'Kilómetros recorridos',
          data: Object.values(dataWithAllMonths).reverse(),
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        },
      ],
    };
  };

  // Agrupar los datos por mes para velocidades
  const groupDataByMonthForSpeed = (data, period) => {
    const now = new Date();
    let months = [];

    if (period === 'mes') {
      months = [now.toLocaleString('default', { month: 'long' })];
    } else if (period === 'trimestre') {
      for (let i = 0; i < 3; i++) {
        months.push(new Date(now.getFullYear(), now.getMonth() - i).toLocaleString('default', { month: 'long' }));
      }
    } else if (period === 'semestre') {
      for (let i = 0; i < 6; i++) {
        months.push(new Date(now.getFullYear(), now.getMonth() - i).toLocaleString('default', { month: 'long' }));
      }
    } else if (period === 'año') {
      for (let i = 0; i < 12; i++) {
        months.push(new Date(now.getFullYear(), now.getMonth() - i).toLocaleString('default', { month: 'long' }));
      }
    }

    const groupedData = data.reduce((acc, item) => {
      const month = new Date(item.date).toLocaleString('default', { month: 'long' });
      if (!acc[month]) {
        acc[month] = { totalPace: 0, count: 0 };
      }
      acc[month].totalPace += convertPaceToMinutes(item.pace || '0:00'); // Convertir pace a minutos
      acc[month].count += 1;
      return acc;
    }, {});

    const dataWithAllMonths = months.reduce((acc, month) => {
      const monthData = groupedData[month];
      acc[month] = monthData ? monthData.totalPace / monthData.count : 0; // Promedio de pace
      return acc;
    }, {});

    return {
      labels: Object.keys(dataWithAllMonths).reverse(),
      datasets: [
        {
          label: 'Ritmo Promedio (min/km)',
          data: Object.values(dataWithAllMonths).reverse(),
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1,
        },
      ],
    };
  };

  // Preparar los datos para la gráfica seleccionada
  const dataForChart =
    chartType === 'kms'
      ? groupDataByMonthForKms(filteredData, period)
      : groupDataByMonthForSpeed(filteredData, period);

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
    },
  };

  return (
    <div>
      <div className="mb-4">
        <label htmlFor="chartType" className="block text-sm font-medium text-gray-700">
          Tipo de Gráfica
        </label>
        <select
          id="chartType"
          value={chartType}
          onChange={(e) => setChartType(e.target.value)}
          className="mt-1 p-3 w-full border border-gray-300 rounded-md"
        >
          <option value="kms">Kilómetros recorridos</option>
          <option value="velocities">Comparativo de Velocidades</option>
        </select>
      </div>

      <div className="mb-4">
        <label htmlFor="period" className="block text-sm font-medium text-gray-700">
          Periodo de Comparación
        </label>
        <select
          id="period"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="mt-1 p-3 w-full border border-gray-300 rounded-md"
        >
          <option value="mes">Mes Actual</option>
          <option value="trimestre">Trimestre</option>
          <option value="semestre">Semestre</option>
          <option value="año">Año</option>
        </select>
      </div>

      {chartType === 'kms' ? (
        <Bar data={dataForChart} options={options} />
      ) : (
        <Line data={dataForChart} options={options} />
      )}
    </div>
  );
};

export default Charts;