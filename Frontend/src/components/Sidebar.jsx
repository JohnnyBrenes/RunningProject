import useAppTranslation from "../utils/useAppTranslation";

const Sidebar = ({ onSelectOption, selectedOption }) => {
  const { t } = useAppTranslation();

  const items = [
    { key: "charts", label: t("charts") },
    { key: "form", label: t("form") },
    { key: "verData", label: t("verData") },
  ];

  return (
    <nav className="mt-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
        {t("sidebar_options")}
      </p>
      <ul className="space-y-1">
        {items.map(({ key, label }) => (
          <li key={key}>
            <button
              className={`block w-full text-left px-3 py-2 rounded-lg font-medium transition-colors ${
                selectedOption === key
                  ? "bg-gray-600 text-white"
                  : "text-gray-300 hover:bg-gray-700 hover:text-white"
              }`}
              onClick={() => onSelectOption(key)}
            >
              {label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Sidebar;
