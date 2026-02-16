import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

const resources = {
  en: {
    translation: {
      welcome: "Welcome",
      heroTitle: "Your AI Receptionist",
      heroTitleAccent: "in 30+ Languages",
      heroSubtitle: "Turn your website visitors into customers with an AI assistant that speaks your clients' language.",
      heroCta: "Get Started",
      heroCtaDemo: "Watch Demo",
    },
  },
  az: {
    translation: {
      welcome: "Xoş gəldiniz",
      heroTitle: "AI Resepsiyonistiniz",
      heroTitleAccent: "30+ Dildə",
      heroSubtitle: "Veb-sayt ziyarətçilərinizi müştərilərə çevirin — müştərilərinizin dilində danışan AI köməkçi ilə.",
      heroCta: "Başla",
      heroCtaDemo: "Demoya Bax",
    },
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });

export default i18n;
