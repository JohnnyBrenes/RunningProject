import React from "react";
import useAppTranslation from "../utils/useAppTranslation";

const Sidebar = ({ onSelectOption }) => {
  const { t, i18n } = useAppTranslation();

  return (
    <div>
      <h2 className="text-xl mb-4">{t("sidebar_options")}</h2>
      <ul>
        <li>
          <button
            className="block w-full text-left p-2 hover:bg-gray-600"
            onClick={() => onSelectOption("charts")}
          >
            {t("charts")}
          </button>
        </li>
        <li>
          <button
            className="block w-full text-left p-2 hover:bg-gray-600"
            onClick={() => onSelectOption("form")}
          >
            {t("form")}
          </button>
        </li>
        <li>
          <button
            className="block w-full text-left p-2 hover:bg-gray-600"
            onClick={() => onSelectOption("verData")}
          >
            {t("verData")}
          </button>
        </li>
      </ul>
    </div>
  );
};

export default Sidebar;
