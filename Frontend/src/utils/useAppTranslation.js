import { useTranslation } from 'react-i18next';

// Hook personalizado para centralizar el uso de traducción en la app
export default function useAppTranslation() {
  return useTranslation();
}
