import React from "react";
import useAppTranslation from "../utils/useAppTranslation";

const LanguageSelector = ({ className = "", id = "language-selector" }) => {
  const { t, i18n } = useAppTranslation();
  return (
    <div className={`mb-4 flex items-center justify-end ${className}`}>
      <label htmlFor={id} className="mr-2">
        {t("language")}:
      </label>
      <select
        id={id}
        value={i18n.language}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
        className="p-1 border rounded text-black"
      >
        <option value="es">Español</option>
        <option value="en">English</option>
      </select>
    </div>
  );
};

export default LanguageSelector;
