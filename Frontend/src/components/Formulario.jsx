import React, { useState } from 'react';
import Api from '../utils/Api';

const Formulario = () => {
  const [formData, setFormData] = useState({
    date: '',
    kilometers: '',
    time: '',
    pace: '',
    shoes: '',
  });
  const [dayOfWeek, setDayOfWeek] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (name === 'time' || name === 'kilometers') {
      calculateAveragePace({ ...formData, [name]: value });
    }

    if (name === 'date') {
      const date = new Date(value);
      const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
      setDayOfWeek(days[date.getDay()]);
    }
  };

  const calculateAveragePace = ({ time, kilometers }) => {
    if (time && kilometers) {
      const [minutes, seconds] = time.split(':').map(Number);
      const totalSeconds = minutes * 60 + seconds;
      const paceSeconds = totalSeconds / parseFloat(kilometers);
      const paceMinutes = Math.floor(paceSeconds / 60);
      const paceRemainderSeconds = Math.round(paceSeconds % 60);
      const calculatedPace = `${paceMinutes}:${paceRemainderSeconds.toString().padStart(2, '0')}`;

      // Actualizar el campo "pace" en formData
      setFormData((prevFormData) => ({
        ...prevFormData,
        pace: calculatedPace, // Solo almacena el valor en formato mm:ss
      }));
    } else {
      setFormData((prevFormData) => ({
        ...prevFormData,
        pace: '',
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const username = localStorage.getItem('username');
      const dataToSend = {
        ...formData, userId: username
      };

      const response = await Api.post('/api/trainnings', dataToSend);
      setSuccessMessage('Datos registrados exitosamente');
      setFormData({
        date: '',
        kilometers: '',
        time: '',
        pace: '',
        shoes: '',
      });
      setDayOfWeek('');
    } catch (error) {
      console.error('Error enviando información:', error);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-5 rounded-md shadow-md">
      <h2 className="text-2xl font-bold text-center mb-5">Ingresar Datos</h2>
      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 border border-green-400 rounded">
          {successMessage}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="date" className="block text-sm font-medium text-gray-700">Fecha</label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className="mt-1 p-3 w-full border border-gray-300 rounded-md"
          />
        </div>
        {dayOfWeek && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Día de la semana</label>
            <p className="mt-1 p-3 w-full border border-gray-300 rounded-md bg-gray-100">{dayOfWeek}</p>
          </div>
        )}
        <div className="mb-4">
          <label htmlFor="kilometers" className="block text-sm font-medium text-gray-700">Kilómetros recorridos</label>
          <input
            type="number"
            id="kilometers"
            name="kilometers"
            value={formData.kilometers}
            onChange={handleChange}
            className="mt-1 p-3 w-full border border-gray-300 rounded-md"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="time" className="block text-sm font-medium text-gray-700">Tiempo</label>
          <input
            type="text"
            id="time"
            name="time"
            value={formData.time}
            onChange={handleChange}
            className="mt-1 p-3 w-full border border-gray-300 rounded-md"
            placeholder="Ej. 50:03"
          />
        </div>
        {formData.pace && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Ritmo promedio</label>
            <p className="mt-1 p-3 w-full border border-gray-300 rounded-md bg-gray-100">
              {formData.pace} <span className="text-gray-500">min/km</span>
            </p>
          </div>
        )}
        <div className="mb-4">
          <label htmlFor="shoes" className="block text-sm font-medium text-gray-700">Tenis usados</label>
          <input
            type="text"
            id="shoes"
            name="shoes"
            value={formData.shoes}
            onChange={handleChange}
            className="mt-1 p-3 w-full border border-gray-300 rounded-md"
          />
        </div>
        <button type="submit" className="w-full bg-blue-500 text-white p-3 rounded-md hover:bg-blue-600">
          Registrar
        </button>
      </form>
    </div>
  );
};

export default Formulario;