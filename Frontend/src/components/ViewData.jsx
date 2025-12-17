import React, { useState, useEffect } from "react";
import Api from "../utils/Api";
import useAppTranslation from "../utils/useAppTranslation";

const ViewData = () => {
  const { t, i18n } = useAppTranslation();
  const [filtroMes, setFiltroMes] = useState("");
  const [filtroTenis, setFiltroTenis] = useState("");
  const [filtroYear, setFiltroYear] = useState(
    new Date().getFullYear().toString()
  );
  const [availableYears, setAvailableYears] = useState([]);
  const [datos, setDatos] = useState([]);
  const [sortColumn, setSortColumn] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 15;

  useEffect(() => {
    const fetchYears = async () => {
      try {
        const username = localStorage.getItem("username");
        const response = await Api.get(
          `/api/Trainnings/user/${username}/years`
        );
        setAvailableYears(response.data);
      } catch (error) {
        console.error("Error fetching years:", error);
      }
    };
    fetchYears();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const username = localStorage.getItem("username");
        let url = `/api/Trainnings/user/${username}`;

        // If a specific year is selected, use year filter
        if (filtroYear !== "all") {
          url = `/api/Trainnings/user/${username}/year/${filtroYear}`;
        } else {
          url = `/api/Trainnings/user/${username}`;
        }

        const response = await Api.get(url);
        setDatos(response.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, [filtroYear]);

  // Lista de meses traducidos
  const meses = Array.from({ length: 12 }, (_, i) =>
    new Date(2000, i, 1).toLocaleString(i18n.language, { month: "long" })
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
    return monthMatches && shoesMatches;
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

  const handleDelete = async (id) => {
    if (window.confirm(t("confirm_delete"))) {
      try {
        await Api.delete(`/api/trainnings/${id}`);
        setDatos((prevDatos) => prevDatos.filter((item) => item.id !== id));
      } catch (error) {
        console.error("Error al eliminar el registro:", error);
      }
    }
  };

  const totalKilometers = filteredData.reduce(
    (sum, item) => sum + item.kilometers,
    0
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
      seconds
    ).padStart(2, "0")}`;
  };

  const averagePace = () => {
    if (totalKilometers === 0) return "0:00";
    const paceSeconds = totalTime / totalKilometers;
    const paceMinutes = Math.floor(paceSeconds / 60);
    const paceRemainderSeconds = Math.round(paceSeconds % 60);
    return `${paceMinutes}:${String(paceRemainderSeconds).padStart(
      2,
      "0"
    )} min/km`;
  };

  return (
    <div className="p-5">
      <h2 className="text-2xl mb-4">{t("verData")}</h2>
      <div className="flex flex-wrap gap-4 mb-6">
        <div>
          <div className="mb-4">
            <label className="mr-2">{t("filter_by_year")}</label>
            <select
              value={filtroYear}
              onChange={(e) => {
                setFiltroYear(e.target.value);
                setCurrentPage(1);
              }}
              className="p-2 border rounded"
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
            <label className="mr-2">{t("filter_by_month")}</label>
            <select
              value={filtroMes}
              onChange={(e) => setFiltroMes(e.target.value)}
              className="p-2 border rounded"
            >
              <option value="">{t("all_months")}</option>
              {meses.map((mes) => (
                <option key={mes} value={mes}>
                  {mes}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label className="mr-2">{t("filter_by_shoes")}</label>
            <select
              value={filtroTenis}
              onChange={(e) => setFiltroTenis(e.target.value)}
              className="p-2 border rounded"
            >
              <option value="">{t("all_shoes")}</option>
              {[...new Set(datos.map((item) => item.shoes))].map((tenis) => (
                <option key={tenis} value={tenis}>
                  {tenis}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="p-4 bg-gray-100 rounded-lg shadow">
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
        <table className="table-auto w-full">
          <thead className="bg-blue-900 text-white">
            <tr>
              <th
                className={`border p-2 cursor-pointer ${
                  sortColumn === "date" ? "bg-blue-700" : ""
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
                className={`border p-2 cursor-pointer ${
                  sortColumn === "kilometers" ? "bg-blue-700" : ""
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
                className={`border p-2 cursor-pointer ${
                  sortColumn === "time" ? "bg-blue-700" : ""
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
                className={`border p-2 cursor-pointer ${
                  sortColumn === "pace" ? "bg-blue-700" : ""
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
                className={`border p-2 cursor-pointer ${
                  sortColumn === "shoes" ? "bg-blue-700" : ""
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
              <th className="border p-2">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {currentData.length > 0 ? (
              currentData.map((item, index) => (
                <tr
                  key={item.id}
                  className={index % 2 === 0 ? "bg-gray-100" : ""}
                >
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
                      {t("delete")}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="border p-2 text-center">
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
                ? "bg-blue-500 text-white"
                : "bg-gray-200"
            }`}
          >
            {index + 1}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ViewData;
