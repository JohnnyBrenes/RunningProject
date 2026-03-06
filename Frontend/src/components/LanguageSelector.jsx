import useAppTranslation from "../utils/useAppTranslation";

const LanguageSelector = ({
  className = "",
  id = "language-selector",
  compact = false,
}) => {
  const { t, i18n } = useAppTranslation();
  if (compact) {
    return (
      <select
        id={id}
        value={i18n.language}
        onChange={(e) => {
          i18n.changeLanguage(e.target.value);
          localStorage.setItem("language", e.target.value);
        }}
        className="p-1.5 rounded-lg bg-gray-700 text-white border border-gray-600 text-sm"
      >
        <option value="es">ES</option>
        <option value="en">EN</option>
      </select>
    );
  }
  return (
    <div className={`mb-4 flex items-center justify-end ${className}`}>
      <label htmlFor={id} className="mr-2">
        {t("language")}:
      </label>
      <select
        id={id}
        value={i18n.language}
        onChange={(e) => {
          i18n.changeLanguage(e.target.value);
          localStorage.setItem("language", e.target.value);
        }}
        className="p-1 border rounded text-black"
      >
        <option value="es">Español</option>
        <option value="en">English</option>
      </select>
    </div>
  );
};

export default LanguageSelector;
