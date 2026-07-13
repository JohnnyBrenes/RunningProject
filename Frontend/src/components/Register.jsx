import { useState } from "react";
import Api from "../utils/Api";
import useAppTranslation from "../utils/useAppTranslation";

const Register = ({ onRegisterSuccess, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { t } = useAppTranslation();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (formData.password.length < 6) {
      setErrorMessage(t("password_min_length"));
      return;
    }

    setIsLoading(true);
    try {
      await Api.post("/api/auth/register", formData);
      setSuccessMessage(t("success_register"));
      setErrorMessage("");
      setFormData({ username: "", email: "", password: "" });

      // Notificar al componente padre que el registro fue exitoso
      onRegisterSuccess();
    } catch (error) {
      if (error.response?.status === 409) {
        setErrorMessage(t("user_or_email_taken"));
      } else if (error.response?.status === 400 && error.response.data?.errors) {
        setErrorMessage(Object.values(error.response.data.errors).flat().join(" "));
      } else {
        setErrorMessage(t("error_register"));
      }
      setSuccessMessage("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header band */}
        <div className="bg-gray-800 text-white px-8 py-6 text-center">
          <img
            src="/icon.svg"
            alt="Running Tracker"
            className="w-10 h-10 mx-auto mb-2"
          />
          <h1 className="text-xl font-bold tracking-tight">Running Tracker</h1>
        </div>
        {/* Form area */}
        <div className="p-5 sm:p-8">
          <h2 className="text-xl font-bold text-center mb-6 text-gray-800">
            {t("register_account")}
          </h2>
          {successMessage && (
            <div className="mb-4 p-3 bg-green-100 text-green-700 border border-green-400 rounded">
              {successMessage}
            </div>
          )}
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
                autoComplete="username"
                className="mt-1 p-3 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                disabled={isLoading}
              />
            </div>
            <div className="mb-4">
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-gray-700 mb-1"
              >
                {t("email")}
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                className="mt-1 p-3 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                disabled={isLoading}
              />
            </div>
            <div className="mb-5">
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
                autoComplete="new-password"
                className="mt-1 p-3 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
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
              {isLoading ? t("processing") : t("register_button")}
            </button>
            {isLoading && (
              <div className="flex justify-center mt-4">
                <div className="loader border-t-4 border-indigo-500 rounded-full w-6 h-6 animate-spin"></div>
              </div>
            )}
          </form>
          <p className="text-center text-sm text-gray-500 mt-6">
            {t("has_account")}{" "}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-indigo-600 font-semibold hover:underline"
            >
              {t("login")}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
