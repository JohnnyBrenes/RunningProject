import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import Api from "../utils/Api";
import useAppTranslation from "../utils/useAppTranslation";
import ConfirmModal from "./ConfirmModal";

const ViewData = () => {
  const { t, i18n } = useAppTranslation();
  const [filtroMes, setFiltroMes] = useState("");
  const [filtroTenis, setFiltroTenis] = useState("");
  const [filtroLocation, setFiltroLocation] = useState("");
  const [filtroYear, setFiltroYear] = useState(
    new Date().getFullYear().toString(),
  );
  const [availableYears, setAvailableYears] = useState([]);
  const [datos, setDatos] = useState([]);
  const [sortColumn, setSortColumn] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const recordsPerPage = 15;

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
      setIsLoading(true);
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
        setDatos(response.data);
      } catch {
        console.error("Error fetching data");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [filtroYear]);

  // Lista de meses traducidos
  const meses = Array.from({ length: 12 }, (_, i) =>
    new Date(2000, i, 1).toLocaleString(i18n.language, { month: "long" }),
  );

  const getMonthFromDate = (date) => {
    const monthIndex = new Date(date).getMonth();
    return meses[monthIndex];
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const filteredData = datos.filter((item) => {
    const monthMatches =
      filtroMes === "" ||
      getMonthFromDate(item.date).toLowerCase() === filtroMes.toLowerCase();
    const shoesMatches =
      filtroTenis === "" ||
      item.shoes.toLowerCase() === filtroTenis.toLowerCase();
    const locationMatches =
      filtroLocation === "" ||
      item.location.toLowerCase() === filtroLocation.toLowerCase();
    return monthMatches && shoesMatches && locationMatches;
  });

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortColumn) return 0;
    let valueA = a[sortColumn];
    let valueB = b[sortColumn];
    if (sortColumn === "date") {
      valueA = new Date(valueA.split("/").reverse().join("-"));
      valueB = new Date(valueB.split("/").reverse().join("-"));
    }
    if (typeof valueA === "string" && typeof valueB === "string") {
      return sortOrder === "asc"
        ? valueA.localeCompare(valueB)
        : valueB.localeCompare(valueA);
    } else if (typeof valueA === "number" && typeof valueB === "number") {
      return sortOrder === "asc" ? valueA - valueB : valueB - valueA;
    } else if (valueA instanceof Date && valueB instanceof Date) {
      return sortOrder === "asc" ? valueA - valueB : valueB - valueA;
    }
    return 0;
  });

  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentData = sortedData.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(sortedData.length / recordsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleDelete = async () => {
    try {
      await Api.delete(`/api/trainnings/${pendingDeleteId}`);
      setDatos((prevDatos) => prevDatos.filter((item) => item.id !== pendingDeleteId));
    } catch {
      console.error("Error al eliminar el registro");
    } finally {
      setPendingDeleteId(null);
    }
  };

  const totalKilometers = filteredData.reduce(
    (sum, item) => sum + item.kilometers,
    0,
  );
  const totalTime = filteredData.reduce((sum, item) => {
    const [minutes, seconds] = item.time.split(":").map(Number);
    return sum + minutes * 60 + seconds;
  }, 0);

  const formattedTotalTime = () => {
    const hours = Math.floor(totalTime / 3600);
    const minutes = Math.floor((totalTime % 3600) / 60);
    const seconds = totalTime % 60;
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(
      seconds,
    ).padStart(2, "0")}`;
  };

  const averagePace = () => {
    if (totalKilometers === 0) return "0:00";
    const paceSeconds = totalTime / totalKilometers;
    const paceMinutes = Math.floor(paceSeconds / 60);
    const paceRemainderSeconds = Math.round(paceSeconds % 60);
    return `${paceMinutes}:${String(paceRemainderSeconds).padStart(
      2,
      "0",
    )} min/km`;
  };

  const handleExport = () => {
    const rows = filteredData.map((item) => ({
      [t("date_col")]: formatDate(item.date),
      [t("kilometers_col")]: item.kilometers,
      [t("time_col")]: item.time,
      [t("pace_col")]: item.pace,
      [t("shoes_col")]: item.shoes,
      [t("location_col")]: item.location
        ? ["treadmill", "outdoor"].includes(item.location.toLowerCase())
          ? t(item.location.toLowerCase())
          : item.location
        : "-",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = Object.keys(rows[0] || {}).map((key) => ({
      wch: Math.max(key.length, ...rows.map((r) => String(r[key] ?? "").length)),
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Trainings");
    XLSX.writeFile(wb, `running_${filtroYear}_${Date.now()}.xlsx`);
  };

  return (
    <div className="p-3 md:p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">
          {t("verData")}
        </h2>
        <button
          onClick={handleExport}
          disabled={filteredData.length === 0}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {t("export_excel")}
        </button>
      </div>
      {/* Filters: 2-col grid on mobile, auto-flow on desktop */}
      <div className="grid grid-cols-2 md:flex md:flex-wrap gap-3 mb-6">
        <div className="mb-0">
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            {t("filter_by_year")}
          </label>
          <select
            value={filtroYear}
            onChange={(e) => {
              setFiltroYear(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          >
            <option value="all">{t("all_years")}</option>
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-0">
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            {t("filter_by_month")}
          </label>
          <select
            value={filtroMes}
            onChange={(e) => setFiltroMes(e.target.value)}
            className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          >
            <option value="">{t("all_months")}</option>
            {meses.map((mes) => (
              <option key={mes} value={mes}>
                {mes}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-0">
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            {t("filter_by_shoes")}
          </label>
          <select
            value={filtroTenis}
            onChange={(e) => setFiltroTenis(e.target.value)}
            className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          >
            <option value="">{t("all_shoes")}</option>
            {[...new Set(datos.map((item) => item.shoes))].map((tenis) => (
              <option key={tenis} value={tenis}>
                {tenis}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-0">
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            {t("filter_by_location")}
          </label>
          <select
            value={filtroLocation}
            onChange={(e) => setFiltroLocation(e.target.value)}
            className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          >
            <option value="">{t("all_locations")}</option>
            {[
              ...new Set(datos.map((item) => item.location).filter(Boolean)),
            ].map((location) => (
              <option key={location} value={location}>
                {t(location.toLowerCase())}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2 md:col-span-1 p-4 bg-gray-100 rounded-xl shadow-md">
          <h3 className="text-lg font-bold mb-2">{t("totals")}</h3>
          <p>
            <strong>{t("total_kilometers")}</strong>{" "}
            {totalKilometers.toFixed(2)} km
          </p>
          <p>
            <strong>{t("total_time")}</strong> {formattedTotalTime()}
          </p>
          <p>
            <strong>{t("average_pace")}</strong> {averagePace()}
          </p>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg shadow-lg">
        <table className="table-auto w-full text-sm">
          <thead className="bg-gray-700 text-white">
            <tr>
              <th
                className={`border p-1.5 md:p-2 cursor-pointer ${
                  sortColumn === "date" ? "bg-gray-500" : ""
                }`}
                onClick={() => {
                  if (sortColumn === "date") {
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  } else {
                    setSortColumn("date");
                    setSortOrder("desc");
                  }
                }}
              >
                {t("date_col")}{" "}
                {sortColumn === "date" && (sortOrder === "asc" ? "▼" : "▲")}
              </th>
              <th
                className={`border p-1.5 md:p-2 cursor-pointer ${
                  sortColumn === "kilometers" ? "bg-gray-500" : ""
                }`}
                onClick={() => {
                  if (sortColumn === "kilometers") {
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  } else {
                    setSortColumn("kilometers");
                    setSortOrder("desc");
                  }
                }}
              >
                {t("kilometers_col")}{" "}
                {sortColumn === "kilometers" &&
                  (sortOrder === "asc" ? "▼" : "▲")}
              </th>
              <th
                className={`border p-1.5 md:p-2 cursor-pointer ${
                  sortColumn === "time" ? "bg-gray-500" : ""
                }`}
                onClick={() => {
                  if (sortColumn === "time") {
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  } else {
                    setSortColumn("time");
                    setSortOrder("desc");
                  }
                }}
              >
                {t("time_col")}{" "}
                {sortColumn === "time" && (sortOrder === "asc" ? "▼" : "▲")}
              </th>
              <th
                className={`border p-1.5 md:p-2 cursor-pointer ${
                  sortColumn === "pace" ? "bg-gray-500" : ""
                }`}
                onClick={() => {
                  if (sortColumn === "pace") {
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  } else {
                    setSortColumn("pace");
                    setSortOrder("desc");
                  }
                }}
              >
                {t("pace_col")}{" "}
                {sortColumn === "pace" && (sortOrder === "asc" ? "▼" : "▲")}
              </th>
              <th
                className={`border p-1.5 md:p-2 cursor-pointer ${
                  sortColumn === "shoes" ? "bg-gray-500" : ""
                }`}
                onClick={() => {
                  if (sortColumn === "shoes") {
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  } else {
                    setSortColumn("shoes");
                    setSortOrder("desc");
                  }
                }}
              >
                {t("shoes_col")}{" "}
                {sortColumn === "shoes" && (sortOrder === "asc" ? "▼" : "▲")}
              </th>
              <th
                className={`border p-1.5 md:p-2 cursor-pointer ${
                  sortColumn === "location" ? "bg-gray-500" : ""
                }`}
                onClick={() => {
                  if (sortColumn === "location") {
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  } else {
                    setSortColumn("location");
                    setSortOrder("desc");
                  }
                }}
              >
                {t("location_col")}{" "}
                {sortColumn === "location" && (sortOrder === "asc" ? "▼" : "▲")}
              </th>
              <th className="border p-1.5 md:p-2">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-gray-100" : ""}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="border p-2">
                      <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : currentData.length > 0 ? (
              currentData.map((item, index) => (
                <tr
                  key={item.id}
                  className={index % 2 === 0 ? "bg-gray-100" : ""}
                >
                  <td className="border p-1.5 md:p-2">
                    {formatDate(item.date)}
                  </td>
                  <td className="border p-1.5 md:p-2">{item.kilometers}</td>
                  <td className="border p-1.5 md:p-2">{item.time}</td>
                  <td className="border p-1.5 md:p-2">{item.pace}</td>
                  <td className="border p-1.5 md:p-2">{item.shoes}</td>
                  <td className="border p-1.5 md:p-2">
                    {item.location
                      ? ["treadmill", "outdoor"].includes(
                          item.location.toLowerCase(),
                        )
                        ? t(item.location.toLowerCase())
                        : item.location
                      : "-"}
                  </td>
                  <td className="border p-1.5 md:p-2 text-center">
                    <button
                      onClick={() => setPendingDeleteId(item.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded"
                      title={t("delete")}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="7"
                  className="border p-2 text-center text-gray-500"
                >
                  {t("no_data")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex justify-center mt-4">
        {Array.from({ length: totalPages }, (_, index) => (
          <button
            key={index + 1}
            onClick={() => handlePageChange(index + 1)}
            className={`px-3 py-1 mx-1 rounded ${
              currentPage === index + 1
                ? "bg-indigo-500 text-white font-semibold"
                : "bg-gray-200 hover:bg-gray-300 transition-colors"
            }`}
          >
            {index + 1}
          </button>
        ))}
      </div>
    {pendingDeleteId && (
        <ConfirmModal
          message={t("confirm_delete")}
          confirmLabel={t("delete")}
          cancelLabel={t("cancel")}
          onConfirm={handleDelete}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}
    </div>
  );
};

export default ViewData;
