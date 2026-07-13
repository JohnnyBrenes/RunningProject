import { useState, useEffect } from "react";
import Api from "../utils/Api";
import useAppTranslation from "../utils/useAppTranslation";

const StatCard = ({ label, value, sub }) => (
  <div className="bg-white rounded-xl shadow-lg p-5 flex flex-col gap-1">
    <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
      {label}
    </span>
    <span className="text-3xl font-bold text-gray-800">{value}</span>
    {sub && <span className="text-xs text-gray-400">{sub}</span>}
  </div>
);

const Dashboard = () => {
  const [allData, setAllData] = useState([]);
  const { t } = useAppTranslation();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const username = encodeURIComponent(
          localStorage.getItem("username") || "",
        );
        const response = await Api.get(`/api/Trainnings/user/${username}`);
        setAllData(response.data);
      } catch {
        setAllData([]);
      }
    };
    fetchData();
  }, []);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const thisYearData = allData.filter(
    (item) => new Date(item.date).getFullYear() === currentYear,
  );

  const thisMonthData = thisYearData.filter(
    (item) => new Date(item.date).getMonth() === currentMonth,
  );

  const kmsThisYear = thisYearData.reduce(
    (sum, item) => sum + item.kilometers,
    0,
  );
  const kmsThisMonth = thisMonthData.reduce(
    (sum, item) => sum + item.kilometers,
    0,
  );
  const sessionsThisMonth = thisMonthData.length;
  const totalKms = allData.reduce((sum, item) => sum + item.kilometers, 0);
  const totalSessions = allData.length;

  const getWeekMonday = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split("T")[0];
  };

  const weeklyKms = allData.reduce((acc, item) => {
    const key = getWeekMonday(item.date);
    acc[key] = (acc[key] || 0) + item.kilometers;
    return acc;
  }, {});
  const bestWeek = Object.values(weeklyKms).length
    ? Math.max(...Object.values(weeklyKms))
    : 0;

  const convertPaceToMinutes = (pace) => {
    const [min, sec] = (pace || "0:00").split(":").map(Number);
    return min + sec / 60;
  };

  const formatPace = (minutes) => {
    const m = Math.floor(minutes);
    const s = Math.round((minutes - m) * 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const paceEntries = allData.filter((item) => item.pace && item.pace !== "0:00");
  const avgPaceMinutes =
    paceEntries.length > 0
      ? paceEntries.reduce(
          (sum, item) => sum + convertPaceToMinutes(item.pace),
          0,
        ) / paceEntries.length
      : 0;

  return (
    <div className="w-full max-w-4xl mx-auto">
      <h2 className="text-xl font-bold text-gray-700 mb-6">{t("dashboard")}</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard
          label={t("kms_this_year")}
          value={`${kmsThisYear.toFixed(1)} km`}
          sub={currentYear}
        />
        <StatCard
          label={t("kms_this_month")}
          value={`${kmsThisMonth.toFixed(1)} km`}
          sub={`${sessionsThisMonth} ${t("sessions_this_month_sub")}`}
        />
        <StatCard
          label={t("best_week")}
          value={`${bestWeek.toFixed(1)} km`}
        />
        <StatCard
          label={t("average_pace")}
          value={avgPaceMinutes > 0 ? `${formatPace(avgPaceMinutes)} /km` : "—"}
        />
        <StatCard
          label={t("total_kms")}
          value={`${totalKms.toFixed(1)} km`}
        />
        <StatCard
          label={t("total_sessions")}
          value={totalSessions}
        />
      </div>
    </div>
  );
};

export default Dashboard;
