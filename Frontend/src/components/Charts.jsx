import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, registerables } from 'chart.js';

// Registrar todos los elementos de Chart.js
ChartJS.register(...registerables);

const Charts = () => {
  const [chartType, setChartType] = useState('kms'); // Controla el tipo de gráfica
  const [period, setPeriod] = useState('mes'); // Controla el periodo de comparación

  // Datos de Ejemplo
  const dataKms = {
    labels: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo'],
    datasets: [
      {
        label: 'Kilómetros recorridos',
        data: [10, 20, 30, 40, 50],
        fill: 'origin',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        tension: 0.1,
      },
    ],
  };

  const dataVelocities = {
    labels: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo'],
    datasets: [
      {
        label: 'Velocidades promedio',
        data: [8, 9, 10, 11, 12],
        fill: 'origin',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderColor: 'rgba(255, 99, 132, 1)',
        tension: 0.1,
      },
    ],
  };

  const dataTenis = {
    labels: ['Tenis A', 'Tenis B', 'Tenis C'],
    datasets: [
      {
        label: 'Kilómetros recorridos por tenis',
        data: [100, 200, 150],
        fill: 'origin',
        backgroundColor: 'rgba(153, 102, 255, 0.2)',
        borderColor: 'rgba(153, 102, 255, 1)',
        tension: 0.1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
    },
  };

  // Seleccionar los datos según el tipo de gráfica
  const chartData =
    chartType === 'kms'
      ? dataKms
      : chartType === 'velocities'
      ? dataVelocities
      : dataTenis;

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
          <option value="tenis">Comparativo por Tenis</option>
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
          <option value="mes">Mes</option>
          <option value="trimestre">Trimestre</option>
          <option value="semestre">Semestre</option>
          <option value="año">Año</option>
        </select>
      </div>

      <Line data={chartData} options={options} />
    </div>
  );
};

export default Charts;