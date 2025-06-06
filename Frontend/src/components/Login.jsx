import React, { useState } from "react";
import Api from "../utils/Api";
import useAppTranslation from "../utils/useAppTranslation";
import LanguageSelector from "./LanguageSelector";

const Login = ({ onLoginSuccess }) => {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false); // Nuevo estado para controlar el spinner y deshabilitar campos

  const { t, i18n } = useAppTranslation();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true); // Activa el estado de carga
    setErrorMessage(""); // Limpia el mensaje de error previo
    try {
      const response = await Api.post("/api/auth/login", formData);
      const { token } = response.data;

      // Guarda el token en localStorage
      localStorage.setItem("token", token);
      localStorage.setItem("username", formData.username);

      // Notifica al padre que el login fue exitoso
      onLoginSuccess();

      setErrorMessage("");
    } catch (error) {
      setErrorMessage(t("invalid_credentials"));
    } finally {
      setIsLoading(false); // Desactiva el estado de carga
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-5 rounded-md shadow-md">
      <LanguageSelector className="justify-center" id="language-login" />
      <h2 className="text-2xl font-bold text-center mb-5">{t("login")}</h2>
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-400 rounded">
          {errorMessage}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label
            htmlFor="username"
            className="block text-sm font-medium text-gray-700"
          >
            {t("username")}
          </label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            className="mt-1 p-3 w-full border border-gray-300 rounded-md"
            autoComplete="username"
            disabled={isLoading}
          />
        </div>
        <div className="mb-4">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700"
          >
            {t("password")}
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="mt-1 p-3 w-full border border-gray-300 rounded-md"
            autoComplete="current-password"
            disabled={isLoading}
          />
        </div>
        <button
          type="submit"
          className={`w-full bg-blue-500 text-white p-3 rounded-md hover:bg-blue-600 ${
            isLoading ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={isLoading}
        >
          {isLoading ? t("processing") : t("login")}
        </button>
        {isLoading && (
          <div className="flex justify-center mt-4">
            <div className="loader border-t-4 border-blue-500 rounded-full w-6 h-6 animate-spin"></div>
          </div>
        )}
      </form>
    </div>
  );
};

export default Login;
