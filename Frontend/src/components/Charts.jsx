import { useState, useEffect } from "react";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, registerables } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import Api from "../utils/Api";
import useAppTranslation from "../utils/useAppTranslation";

// Registrar todos los elementos de Chart.js
ChartJS.register(...registerables, ChartDataLabels);

const Charts = () => {
  const [chartType, setChartType] = useState("kms"); // Controla el tipo de gráfica
  const [period, setPeriod] = useState("mes"); // Controla el periodo de comparación
  const [filtroYear, setFiltroYear] = useState(
    new Date().getFullYear().toString(),
  );
  const [availableYears, setAvailableYears] = useState([]);
  const [topShoes, setTopShoes] = useState(10);
  const [data, setData] = useState([]); // Datos obtenidos del backend
  const [isLoading, setIsLoading] = useState(true);
  const { t, i18n } = useAppTranslation();

  useEffect(() => {
    const fetchYears = async () => {
      try {
        const username = encodeURIComponent(
          localStorage.getItem("username") || "",
        );
        const response = await Api.get(
          `/api/Trainnings/user/${username}/years`,
        );
        setAvailableYears(response.data);
      } catch {
        console.error("Error fetching years");
      }
    };
    fetchYears();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const username = encodeURIComponent(
          localStorage.getItem("username") || "",
        );
        let url = `/api/Trainnings/user/${username}`;

        // If a specific year is selected, use year filter
        if (filtroYear !== "all") {
          url = `/api/Trainnings/user/${username}/year/${filtroYear}`;
        } else {
          url = `/api/Trainnings/user/${username}`;
        }

        const response = await Api.get(url);
        setData(response.data);
      } catch {
        console.error("Error fetching data");
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [filtroYear]);

  // Filtrar los datos según el periodo seleccionado
  const filterDataByPeriod = (data, period) => {
    const now = new Date();
    let filteredData = [];

    if (period === "mes") {
      const currentMonth = now.getMonth();
      filteredData = data.filter(
        (item) => new Date(item.date).getMonth() === currentMonth,
      );
    } else if (period === "trimestre") {
      const threeMonthsAgo = new Date(now.setMonth(now.getMonth() - 3));
      filteredData = data.filter(
        (item) => new Date(item.date) >= threeMonthsAgo,
      );
    } else if (period === "semestre") {
      const sixMonthsAgo = new Date(now.setMonth(now.getMonth() - 6));
      filteredData = data.filter((item) => new Date(item.date) >= sixMonthsAgo);
    } else if (period === "año") {
      const oneYearAgo = new Date(now.setFullYear(now.getFullYear() - 1));
      filteredData = data.filter((item) => new Date(item.date) >= oneYearAgo);
    }

    return filteredData;
  };

  // Obtener los datos filtrados
  const filteredData = filterDataByPeriod(data, period);

  // Función para convertir pace (formato "mm:ss") a minutos como número decimal
  const convertPaceToMinutes = (pace) => {
    const [minutes, seconds] = pace.split(":").map(Number);
    return minutes + seconds / 60;
  };

  // Agrupar los datos por mes para kilómetros
  const groupDataByMonthForKms = (data, period) => {
    const now = new Date();
    let months = [];

    if (period === "mes") {
      months = [now.toLocaleString(i18n.language, { month: "long" })];
    } else if (period === "trimestre") {
      for (let i = 0; i < 3; i++) {
        months.push(
          new Date(now.getFullYear(), now.getMonth() - i).toLocaleString(
            i18n.language,
            { month: "long" },
          ),
        );
      }
    } else if (period === "semestre") {
      for (let i = 0; i < 6; i++) {
        months.push(
          new Date(now.getFullYear(), now.getMonth() - i).toLocaleString(
            i18n.language,
            { month: "long" },
          ),
        );
      }
    } else if (period === "año") {
      for (let i = 0; i < 12; i++) {
        months.push(
          new Date(now.getFullYear(), now.getMonth() - i).toLocaleString(
            i18n.language,
            { month: "long" },
          ),
        );
      }
    }

    const groupedData = data.reduce((acc, item) => {
      const month = new Date(item.date).toLocaleString(i18n.language, {
        month: "long",
      });
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
          label: t("kms"),
          data: Object.values(dataWithAllMonths).reverse(),
          backgroundColor: "rgba(75, 192, 192, 0.85)",
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 1,
        },
      ],
    };
  };

  // Agrupar los datos por mes para velocidades
  const groupDataByMonthForSpeed = (data, period) => {
    const now = new Date();
    let months = [];

    if (period === "mes") {
      months = [now.toLocaleString(i18n.language, { month: "long" })];
    } else if (period === "trimestre") {
      for (let i = 0; i < 3; i++) {
        months.push(
          new Date(now.getFullYear(), now.getMonth() - i).toLocaleString(
            i18n.language,
            { month: "long" },
          ),
        );
      }
    } else if (period === "semestre") {
      for (let i = 0; i < 6; i++) {
        months.push(
          new Date(now.getFullYear(), now.getMonth() - i).toLocaleString(
            i18n.language,
            { month: "long" },
          ),
        );
      }
    } else if (period === "año") {
      for (let i = 0; i < 12; i++) {
        months.push(
          new Date(now.getFullYear(), now.getMonth() - i).toLocaleString(
            i18n.language,
            { month: "long" },
          ),
        );
      }
    }

    const groupedData = data.reduce((acc, item) => {
      const month = new Date(item.date).toLocaleString(i18n.language, {
        month: "long",
      });
      if (!acc[month]) {
        acc[month] = { totalPace: 0, count: 0 };
      }
      acc[month].totalPace += convertPaceToMinutes(item.pace || "0:00"); // Convertir pace a minutos
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
          label: t("average_pace_chart"),
          data: Object.values(dataWithAllMonths).reverse(),
          backgroundColor: "rgba(255, 99, 132, 0.2)",
          borderColor: "rgba(255, 99, 132, 1)",
          borderWidth: 1,
        },
      ],
    };
  };

  // Agrupar los datos por zapatilla (kilómetros acumulados)
  const groupDataByShoes = (data) => {
    const grouped = data.reduce((acc, item) => {
      const shoe = item.shoes || "Unknown";
      acc[shoe] = (acc[shoe] || 0) + item.kilometers;
      return acc;
    }, {});

    const sorted = Object.entries(grouped).sort(([, a], [, b]) => b - a);
    const limited = topShoes === "all" ? sorted : sorted.slice(0, topShoes);

    const colors = [
      "rgba(255, 159, 64, 0.7)",
      "rgba(54, 162, 235, 0.7)",
      "rgba(153, 102, 255, 0.7)",
      "rgba(75, 192, 192, 0.7)",
      "rgba(255, 205, 86, 0.7)",
      "rgba(255, 99, 132, 0.7)",
    ];
    const borderColors = colors.map((c) => c.replace("0.7", "1"));

    return {
      labels: limited.map(([shoe]) => shoe),
      datasets: [
        {
          label: t("shoes_km_chart"),
          data: limited.map(([, km]) => km),
          backgroundColor: colors.slice(0, limited.length),
          borderColor: borderColors.slice(0, limited.length),
          borderWidth: 1,
        },
      ],
    };
  };

  // Agrupar los datos por semana (kilómetros acumulados)
  const groupDataByWeek = (data, period) => {
    const now = new Date();

    const getWeekMonday = (date) => {
      const d = new Date(date);
      const day = d.getDay();
      d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
      d.setHours(0, 0, 0, 0);
      return d;
    };

    let startDate = new Date(now);
    if (period === "mes") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === "trimestre") {
      startDate.setMonth(startDate.getMonth() - 3);
    } else if (period === "semestre") {
      startDate.setMonth(startDate.getMonth() - 6);
    } else if (period === "año") {
      startDate.setFullYear(startDate.getFullYear() - 1);
    }

    const weeks = [];
    let current = getWeekMonday(startDate);
    const end = getWeekMonday(now);
    while (current <= end) {
      weeks.push(new Date(current));
      current = new Date(current);
      current.setDate(current.getDate() + 7);
    }

    const grouped = data.reduce((acc, item) => {
      const key = getWeekMonday(new Date(item.date))
        .toISOString()
        .split("T")[0];
      acc[key] = (acc[key] || 0) + item.kilometers;
      return acc;
    }, {});

    return {
      labels: weeks.map((w) =>
        w.toLocaleDateString(i18n.language, {
          month: "short",
          day: "numeric",
        }),
      ),
      datasets: [
        {
          label: t("kms_per_week"),
          data: weeks.map(
            (w) => grouped[w.toISOString().split("T")[0]] || 0,
          ),
          backgroundColor: "rgba(75, 192, 192, 0.85)",
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 2,
          fill: true,
          tension: 0.3,
        },
      ],
    };
  };

  // Agrupar los datos por ubicación (kilómetros acumulados)
  const groupDataByLocation = (data) => {
    const colorMap = {
      outdoor: { bg: "rgba(34, 197, 94, 0.8)", border: "rgba(34, 197, 94, 1)" },
      treadmill: { bg: "rgba(249, 115, 22, 0.8)", border: "rgba(249, 115, 22, 1)" },
    };
    const fallbackColors = [
      { bg: "rgba(59, 130, 246, 0.8)", border: "rgba(59, 130, 246, 1)" },
      { bg: "rgba(168, 85, 247, 0.8)", border: "rgba(168, 85, 247, 1)" },
    ];
    let fallbackIndex = 0;

    const grouped = data.reduce((acc, item) => {
      const loc = item.location || "Unknown";
      acc[loc] = (acc[loc] || 0) + item.kilometers;
      return acc;
    }, {});

    const locations = Object.keys(grouped);
    const bgColors = locations.map((loc) => {
      const key = loc.toLowerCase();
      return colorMap[key]?.bg ?? fallbackColors[fallbackIndex++ % fallbackColors.length].bg;
    });
    const borderColors = locations.map((loc) => {
      const key = loc.toLowerCase();
      return colorMap[key]?.border ?? fallbackColors[fallbackIndex++ % fallbackColors.length].border;
    });

    return {
      labels: locations.map((loc) =>
        t(loc.toLowerCase(), { defaultValue: loc }),
      ),
      datasets: [
        {
          label: t("location_km_chart"),
          data: Object.values(grouped),
          backgroundColor: bgColors,
          borderColor: borderColors,
          borderWidth: 1,
        },
      ],
    };
  };

  // Preparar los datos para la gráfica seleccionada
  const dataForChart =
    chartType === "kms"
      ? groupDataByMonthForKms(filteredData, period)
      : chartType === "velocities"
        ? groupDataByMonthForSpeed(filteredData, period)
        : chartType === "shoes"
          ? groupDataByShoes(filteredData)
          : chartType === "weekly"
            ? groupDataByWeek(filteredData, period)
            : groupDataByLocation(filteredData);

  const barOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      datalabels: {
        display: (context) => context.dataset.data[context.dataIndex] > 0,
        color: "#fff",
        font: { size: 11, weight: "bold" },
        anchor: "center",
        align: "center",
        formatter: (value) => value.toFixed(1),
      },
    },
  };

  const lineOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      datalabels: {
        display: (context) => context.dataset.data[context.dataIndex] > 0,
        color: "#374151",
        font: { size: 11 },
        anchor: "end",
        align: "top",
        formatter: (value) => value.toFixed(1),
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { position: "top" },
      datalabels: {
        color: "#fff",
        font: { weight: "bold", size: 13 },
        anchor: "center",
        align: "center",
        formatter: (value, context) => {
          const total = context.dataset.data.reduce((a, b) => a + b, 0);
          const pct = ((value / total) * 100).toFixed(1);
          return `${pct}%\n${value.toFixed(1)} km`;
        },
      },
    },
  };

  const shoesOptions = {
    indexAxis: "y",
    responsive: true,
    plugins: {
      legend: { position: "top" },
      datalabels: {
        display: (context) => context.dataset.data[context.dataIndex] > 0,
        color: "#fff",
        font: { size: 11, weight: "bold" },
        anchor: "center",
        align: "center",
        formatter: (value) => value.toFixed(1),
      },
    },
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="mb-4">
        <label
          htmlFor="year"
          className="block text-sm font-semibold text-gray-700"
        >
          {t("filter_by_year")}
        </label>
        <select
          id="year"
          value={filtroYear}
          onChange={(e) => setFiltroYear(e.target.value)}
          className="mt-1 p-3 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
        >
          <option value="all">{t("all_years")}</option>
          {availableYears.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label
          htmlFor="chartType"
          className="block text-sm font-semibold text-gray-700"
        >
          {t("chart_type")}
        </label>
        <select
          id="chartType"
          value={chartType}
          onChange={(e) => setChartType(e.target.value)}
          className="mt-1 p-3 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
        >
          <option value="kms">{t("kms")}</option>
          <option value="velocities">{t("velocities")}</option>
          <option value="shoes">{t("shoes_chart_type")}</option>
          <option value="weekly">{t("weekly_km_chart_type")}</option>
          <option value="location">{t("location_chart_type")}</option>
        </select>
      </div>

      {chartType === "shoes" && (
        <div className="mb-4">
          <label
            htmlFor="topShoes"
            className="block text-sm font-semibold text-gray-700"
          >
            {t("top_shoes")}
          </label>
          <select
            id="topShoes"
            value={topShoes}
            onChange={(e) =>
              setTopShoes(
                e.target.value === "all" ? "all" : Number(e.target.value),
              )
            }
            className="mt-1 p-3 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value="all">{t("all_shoes_top")}</option>
          </select>
        </div>
      )}

      <div className="mb-4">
        <label
          htmlFor="period"
          className="block text-sm font-semibold text-gray-700"
        >
          {t("period")}
        </label>
        <select
          id="period"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="mt-1 p-3 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
        >
          <option value="mes">{t("current_month")}</option>
          <option value="trimestre">{t("quarter")}</option>
          <option value="semestre">{t("semester")}</option>
          <option value="año">{t("year")}</option>
        </select>
      </div>

      <div
        className="bg-white rounded-xl shadow-lg p-6"
        style={{ minHeight: "350px", height: "60vh" }}
      >
        {isLoading ? (
          <div className="h-full w-full animate-pulse flex flex-col gap-3 justify-end">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="bg-gray-200 rounded w-full"
                style={{ height: `${(i + 1) * 12}%` }}
              />
            ))}
          </div>
        ) : dataForChart.labels.length === 0 ||
        dataForChart.datasets[0].data.every((v) => v === 0) ? (
          <div className="flex justify-center items-center h-full">
            <p className="text-gray-400 text-sm">{t("no_data")}</p>
          </div>
        ) : chartType === "kms" ? (
          <Bar data={dataForChart} options={barOptions} />
        ) : chartType === "velocities" ? (
          <Line data={dataForChart} options={lineOptions} />
        ) : chartType === "shoes" ? (
          <Bar data={dataForChart} options={shoesOptions} />
        ) : chartType === "weekly" ? (
          <Line data={dataForChart} options={lineOptions} />
        ) : (
          <div className="flex justify-center items-center h-full">
            <div className="w-full max-w-sm">
              <Doughnut data={dataForChart} options={doughnutOptions} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Charts;
