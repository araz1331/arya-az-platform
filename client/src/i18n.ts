import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

const resources = {
  en: {
    translation: {
      welcome: "Welcome",
      description: "Turn your website visitors into customers with an AI assistant that speaks your clients' language.",
      getStarted: "Get Started",
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
      description: "Veb-sayt ziyarətçilərinizi müştərilərə çevirin — müştərilərinizin dilində danışan AI köməkçi ilə.",
      getStarted: "Başla",
      heroTitle: "AI Resepsiyonistiniz",
      heroTitleAccent: "30+ Dildə",
      heroSubtitle: "Veb-sayt ziyarətçilərinizi müştərilərə çevirin — müştərilərinizin dilində danışan AI köməkçi ilə.",
      heroCta: "Başla",
      heroCtaDemo: "Demoya Bax",
    },
  },
  ru: {
    translation: {
      welcome: "Добро пожаловать",
      description: "Превратите посетителей вашего сайта в клиентов с помощью AI-ассистента, который говорит на языке ваших клиентов.",
      getStarted: "Начать",
      heroTitle: "Ваш AI-ресепшионист",
      heroTitleAccent: "на 30+ языках",
      heroSubtitle: "Превратите посетителей вашего сайта в клиентов с помощью AI-ассистента, который говорит на языке ваших клиентов.",
      heroCta: "Начать",
      heroCtaDemo: "Смотреть демо",
    },
  },
  tr: {
    translation: {
      welcome: "Hoş geldiniz",
      description: "Web sitenizin ziyaretçilerini, müşterilerinizin dilini konuşan bir AI asistanı ile müşteriye dönüştürün.",
      getStarted: "Başla",
      heroTitle: "AI Resepsiyonistiniz",
      heroTitleAccent: "30+ Dilde",
      heroSubtitle: "Web sitenizin ziyaretçilerini, müşterilerinizin dilini konuşan bir AI asistanı ile müşteriye dönüştürün.",
      heroCta: "Başla",
      heroCtaDemo: "Demoyu İzle",
    },
  },
  es: {
    translation: {
      welcome: "Bienvenido",
      description: "Convierte a los visitantes de tu sitio web en clientes con un asistente de IA que habla el idioma de tus clientes.",
      getStarted: "Comenzar",
      heroTitle: "Tu recepcionista de IA",
      heroTitleAccent: "en más de 30 idiomas",
      heroSubtitle: "Convierte a los visitantes de tu sitio web en clientes con un asistente de IA que habla el idioma de tus clientes.",
      heroCta: "Comenzar",
      heroCtaDemo: "Ver demostración",
    },
  },
  fr: {
    translation: {
      welcome: "Bienvenue",
      description: "Transformez les visiteurs de votre site en clients grâce à un assistant IA qui parle la langue de vos clients.",
      getStarted: "Commencer",
      heroTitle: "Votre réceptionniste IA",
      heroTitleAccent: "en plus de 30 langues",
      heroSubtitle: "Transformez les visiteurs de votre site en clients grâce à un assistant IA qui parle la langue de vos clients.",
      heroCta: "Commencer",
      heroCtaDemo: "Voir la démo",
    },
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    supportedLngs: ["en", "az", "ru", "tr", "es", "fr"],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });

export default i18n;
