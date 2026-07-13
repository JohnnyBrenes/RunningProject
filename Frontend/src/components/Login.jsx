import { useState } from "react";
import Api from "../utils/Api";
import useAppTranslation from "../utils/useAppTranslation";
import LanguageSelector from "./LanguageSelector";

const Login = ({ onLoginSuccess, onSwitchToRegister }) => {
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
      if (error.response?.status === 401) {
        setErrorMessage(t("invalid_credentials"));
      } else {
        setErrorMessage(t("server_starting"));
      }
    } finally {
      setIsLoading(false); // Desactiva el estado de carga
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header band */}
        <div className="bg-gray-800 text-white px-8 py-6 text-center">
          <img src="/icon.svg" alt="Running Tracker" className="w-10 h-10 mx-auto mb-2" />
          <h1 className="text-xl font-bold tracking-tight">Running Tracker</h1>
        </div>
        {/* Form area */}
        <div className="p-5 sm:p-8">
          <LanguageSelector className="justify-center" id="language-login" />
          <h2 className="text-xl font-bold text-center mt-2 mb-6 text-gray-800">
            {t("login")}
          </h2>
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-400 rounded">
              {errorMessage}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label
                htmlFor="username"
                className="block text-sm font-semibold text-gray-700 mb-1"
              >
                {t("username")}
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="mt-1 p-3 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                autoComplete="username"
                disabled={isLoading}
              />
            </div>
            <div className="mb-4">
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-gray-700 mb-1"
              >
                {t("password")}
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="mt-1 p-3 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                autoComplete="current-password"
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              className={`w-full bg-indigo-500 text-white py-3 rounded-lg font-semibold hover:bg-indigo-600 transition-colors ${
                isLoading ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={isLoading}
            >
              {isLoading ? t("processing") : t("login")}
            </button>
            {isLoading && (
              <div className="flex justify-center mt-4">
                <div className="loader border-t-4 border-indigo-500 rounded-full w-6 h-6 animate-spin"></div>
              </div>
            )}
          </form>
          <p className="text-center text-sm text-gray-500 mt-6">
            {t("no_account")}{" "}
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-indigo-600 font-semibold hover:underline"
            >
              {t("register")}
            </button>
          </p>
        </div>
      </div>
      <p className="text-gray-400 text-xs mt-6">Por: Johnny Brenes</p>
    </div>
  );
};

export default Login;
