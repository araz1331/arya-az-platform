import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Send, Loader2, ExternalLink, Sparkles, Camera, Languages, ArrowLeft, Upload, MapPin, Crown, Pencil, Eye, Globe, Users, MessageCircle, Clock, ChevronRight, Mic, Code, Copy, Check, Link2, Smartphone, QrCode, Megaphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "assistant";
  text: string;
  type?: "text" | "templates" | "ocr-option" | "location-result";
  data?: any;
}

interface SmartProfileData {
  id: string;
  slug: string;
  businessName: string;
  profession: string;
  knowledgeBase: string | null;
  knowledgeBaseRu: string | null;
  knowledgeBaseEn: string | null;
  profileImageUrl: string | null;
  onboardingComplete: boolean;
  isActive: boolean;
  themeColor: string | null;
}

interface OnboardingState {
  step: number;
  businessName: string;
  profession: string;
  services: string;
  pricing: string;
  location: string;
  workHours: string;
  faq: string;
  slug: string;
  templateId?: string;
  locationData?: any;
}

type Lang = "az" | "ru" | "en";

const ONBOARDING_QUESTIONS: Record<Lang, string[]> = {
  az: [
    "Salam! Mən Arya. Sizin Sİ köməkçinizi qurmaq üçün bir neçə sual verəcəm. Hazırsınız?\n\nBiznesinizin və ya xidmətinizin adı nədir?",
    "Əla! Peşəniz və ya fəaliyyət sahəniz nədir? (Məsələn: Kombi ustası, Müəllim, Restoran, Hüquqşünas...)",
    "Hansı xidmətləri təklif edirsiniz? Qiymətləri də qeyd edin. (Məsələn: Kombi təmiri - 30 AZN, Filtr dəyişmə - 15 AZN)",
    "Qiymət siyasətiniz necədir? Xüsusi təklifləriniz varmı? (Məsələn: İlk müştəriyə 10% endirim, 2-ci ziyarət pulsuz...)",
    "Hansı ərazidə xidmət göstərirsiniz? Ünvanınız varmı? (Məsələn: Bütün Bakı ərazisi, Nəsimi rayonu...)",
    "İş saatlarınız necədir? (Məsələn: Hər gün 09:00-18:00, Həftə sonu istirahət...)",
    "Müştərilərin ən çox verdiyi suallar hansılardır? Cavabları ilə yazın. (Məsələn: S: Evə gəlirsiniz? C: Bəli, bütün Bakı ərazisində...)",
    "Son addım! Profiliniz üçün link seçin. Bu /u/SİZİN-LİNK şəklində olacaq. (Yalnız kiçik hərf, rəqəm və tire istifadə edin. Məsələn: samir-usta, aysel-english)",
  ],
  ru: [
    "Здравствуйте! Я Arya. Задам несколько вопросов, чтобы создать вашего ИИ-ассистента. Готовы?\n\nКак называется ваш бизнес или услуга?",
    "Отлично! Какая у вас профессия или сфера деятельности? (Например: Мастер по котлам, Учитель, Ресторан, Юрист...)",
    "Какие услуги вы предлагаете? Укажите цены. (Например: Ремонт котла - 30 AZN, Замена фильтра - 15 AZN)",
    "Какова ваша ценовая политика? Есть специальные предложения? (Например: Скидка 10% новым клиентам, 2-й визит бесплатно...)",
    "В каком районе вы работаете? Есть адрес? (Например: Весь Баку, Насиминский район...)",
    "Какой у вас график работы? (Например: Ежедневно 09:00-18:00, Выходные — отдых...)",
    "Какие вопросы чаще всего задают клиенты? Напишите с ответами. (Например: В: Приезжаете на дом? О: Да, по всему Баку...)",
    "Последний шаг! Выберите ссылку для профиля. Она будет в формате /u/ВАША-ССЫЛКА. (Только строчные буквы, цифры и дефис. Например: samir-usta, aysel-english)",
  ],
  en: [
    "Hello! I'm Arya. I'll ask a few questions to build your AI assistant. Ready?\n\nWhat is your business or service name?",
    "Great! What is your profession or field? (e.g., Plumber, Teacher, Restaurant, Lawyer...)",
    "What services do you offer? Include prices. (e.g., Boiler repair - 30 AZN, Filter change - 15 AZN)",
    "What is your pricing policy? Any special offers? (e.g., 10% off for new customers, 2nd visit free...)",
    "What area do you serve? Do you have an address? (e.g., All of Baku, Nasimi district...)",
    "What are your working hours? (e.g., Daily 09:00-18:00, Weekends off...)",
    "What questions do customers ask most? Write with answers. (e.g., Q: Do you come to homes? A: Yes, all of Baku...)",
    "Last step! Choose a link for your profile. It will be /u/YOUR-LINK. (Only lowercase letters, numbers and hyphens. e.g., samir-usta, aysel-english)",
  ],
};

const EDIT_QUESTIONS: Record<Lang, string[]> = {
  az: [
    "Biznesinizin yeni adını yazın (və ya dəyişməmək üçün keçin):",
    "Peşənizi yeniləyin:",
    "Xidmətlərinizi yeniləyin (qiymətlərlə):",
    "Qiymət siyasətinizi yeniləyin:",
    "Ərazini/ünvanı yeniləyin:",
    "İş saatlarını yeniləyin:",
    "Tez-tez verilən sualları yeniləyin:",
  ],
  ru: [
    "Введите новое название бизнеса (или пропустите):",
    "Обновите профессию:",
    "Обновите услуги (с ценами):",
    "Обновите ценовую политику:",
    "Обновите район/адрес:",
    "Обновите график работы:",
    "Обновите частые вопросы:",
  ],
  en: [
    "Enter new business name (or skip):",
    "Update your profession:",
    "Update your services (with prices):",
    "Update your pricing policy:",
    "Update your area/address:",
    "Update your working hours:",
    "Update your FAQ:",
  ],
};

const UI_TEXT: Record<Lang, {
  profileReady: (name: string, slug: string) => string;
  creating: string;
  typing: string;
  congrats: (name: string, slug: string) => string;
  slugError: string;
  slugTaken: string;
  genericError: string;
  alreadyDone: string;
  placeholder: string;
  placeholderChat: string;
  loading: string;
  emptyState: string;
  viewProfile: string;
  editProfile: string;
  uploadPhoto: string;
  translateKb: string;
  translating: string;
  translated: string;
  translateFail: string;
  photoUploaded: string;
  photoFail: string;
  editMode: string;
  editSaved: string;
  editSkip: string;
  backToProfile: string;
  selectTemplate: string;
  templateSelected: (name: string) => string;
  ocrOption: string;
  ocrUploading: string;
  ocrSuccess: (text: string) => string;
  ocrFail: string;
  locationSearch: string;
  locationFound: (name: string, address: string) => string;
  locationNotFound: string;
  useThis: string;
  orManual: string;
  scanPriceList: string;
  dashboardTitle: string;
  knowledgeBaseTitle: string;
  knowledgeBaseEmpty: string;
  upgradePro: string;
  upgradeProDesc: string;
  freeTrial: string;
  manageTitle: string;
  viewProfileDesc: string;
  editProfileDesc: string;
  uploadPhotoDesc: string;
  translateKbDesc: string;
  leadsTitle: string;
  leadsEmpty: string;
  leadsCount: (n: number) => string;
  leadsMessages: string;
  leadsViewAll: string;
  leadsBack: string;
  leadsVoice: string;
  embedTitle: string;
  embedDesc: string;
  embedCopy: string;
  embedCopied: string;
  widgetGuideTitle: string;
  widgetGuideSubtitle: string;
  widgetGuideIntro: string;
  widgetStep1Title: string;
  widgetStep1Desc: string;
  widgetStep2Title: string;
  widgetStep2Custom: string;
  widgetStep2CustomDesc: string;
  widgetStep2Cms: string;
  widgetStep2CmsSteps: string[];
  widgetColorTitle: string;
  widgetColorDesc: string;
  widgetColorDefault: string;
  widgetColorRed: string;
  widgetColorGreen: string;
  widgetColorPurple: string;
  smartLinkTitle: string;
  smartLinkDesc: string;
  smartLinkCopy: string;
  smartLinkCopied: string;
  smartLinkSocial: string;
  smartLinkSocialWhere: string;
  smartLinkSocialUse: string;
  smartLinkSocialWhy: string;
  smartLinkMessenger: string;
  smartLinkMessengerWhere: string;
  smartLinkMessengerUse: string;
  smartLinkMessengerWhy: string;
  smartLinkPhysical: string;
  smartLinkPhysicalWhere: string[];
  smartLinkPhysicalWhy: string;
  smartLinkAds: string;
  smartLinkAdsWhere: string;
  smartLinkAdsUse: string;
  smartLinkAdsWhy: string;
}> = {
  az: {
    profileReady: (name, slug) => `Sizin Sİ köməkçiniz hazırdır! "${name}" profili aktivdir.\n\nMüştəriləriniz bu linkdən sizinlə əlaqə saxlaya bilər:\n/u/${slug}`,
    creating: "Profiliniz yaradılır...",
    typing: "Arya yazır...",
    congrats: (name, slug) => `Təbriklər! "${name}" Sİ köməkçiniz hazırdır!\n\nMüştəriləriniz bu linkdən sizinlə əlaqə saxlaya bilər:\n/u/${slug}\n\nSİ köməkçiniz sizin biznesiniz haqqında bütün məlumatları bilir və müştərilərə 7/24 cavab verəcək.`,
    slugError: "Link düzgün deyil. Yalnız kiçik hərf, rəqəm və tire istifadə edin. Məsələn: samir-usta",
    slugTaken: "Bu link artıq istifadə olunur. Başqa bir link seçin:",
    genericError: "Xəta baş verdi. Bir daha cəhd edin.",
    alreadyDone: "Profiliniz artıq qurulub. Aşağıdakı linkdən müştəriləriniz sizinlə əlaqə saxlaya bilər.",
    placeholder: "Cavabınızı yazın...",
    placeholderChat: "Mesaj yazın...",
    loading: "Profil yüklənir...",
    emptyState: "Sİ köməkçinizi qurmaq üçün hazırıq",
    viewProfile: "Profilimi Gör",
    editProfile: "Məlumatları Redaktə Et",
    uploadPhoto: "Şəkil Yüklə",
    translateKb: "Rus/İngilis Tərcümə",
    translating: "Tərcümə edilir...",
    translated: "Tərcümə tamamlandı! Profiliniz indi Azərbaycan, Rus və İngilis dillərində işləyir.",
    translateFail: "Tərcümə zamanı xəta baş verdi. Yenidən cəhd edin.",
    photoUploaded: "Şəkil uğurla yükləndi!",
    photoFail: "Şəkil yükləmə xətası. Yenidən cəhd edin.",
    editMode: "Redaktə rejimi. Hər suala cavab yazın və ya keçmək üçün \"-\" göndərin.",
    editSaved: "Dəyişikliklər saxlanıldı! Profiliniz yeniləndi.",
    editSkip: "-",
    backToProfile: "Geri",
    selectTemplate: "Sahənizi seçin və ya aşağıda əl ilə yazın:",
    templateSelected: (name: string) => `"${name}" şablonu seçildi! Xidmətlər və qiymətlər avtomatik dolduruldu.`,
    ocrOption: "Qiymət siyahınızın şəklini yükləyə bilərsiniz, mən avtomatik oxuyacam",
    ocrUploading: "Qiymət siyahınız oxunur...",
    ocrSuccess: (text: string) => `Bu qiymətləri tapdım:\n${text}\n\nBunu istifadə etmək istəyirsiniz? "bəli" yazın və ya öz qiymətlərinizi daxil edin.`,
    ocrFail: "Şəkli oxuya bilmədim. Xidmətlərinizi əl ilə yazın.",
    locationSearch: "Biznesinizi xəritədə tapa bilərəm. Axtarmaq üçün biznes adını yazın, və ya ünvanınızı əl ilə daxil edin.",
    locationFound: (name: string, address: string) => `Tapıldı: ${name}\n${address}`,
    locationNotFound: "Biznesinizi tapa bilmədim. Ünvanınızı əl ilə yazın.",
    useThis: "Bunu istifadə et",
    orManual: "Əl ilə yazın",
    scanPriceList: "Qiymət Siyahısı Yüklə",
    dashboardTitle: "Sİ Köməkçi Paneli",
    knowledgeBaseTitle: "Bilik Bazası",
    knowledgeBaseEmpty: "Bilik bazası hələ boşdur",
    upgradePro: "PRO-ya Keç",
    upgradeProDesc: "Səsli cavab, Stripe ödəniş və daha çox",
    freeTrial: "3 Gün Pulsuz",
    manageTitle: "İdarə et",
    viewProfileDesc: "Müştərilərin görəcəyi səhifə",
    editProfileDesc: "Xidmət, qiymət, ünvan dəyiş",
    uploadPhotoDesc: "Profil şəkli əlavə et",
    translateKbDesc: "Rus və İngilis dilinə tərcümə",
    leadsTitle: "Müraciətlər",
    leadsEmpty: "Hələ müraciət yoxdur",
    leadsCount: (n: number) => `${n} mesaj`,
    leadsMessages: "mesaj",
    leadsViewAll: "Hamısını Gör",
    leadsBack: "Geri",
    leadsVoice: "Səsli",
    embedTitle: "Sayta Quraşdır",
    embedDesc: "Bu kodu saytınıza əlavə edin",
    embedCopy: "Kopyala",
    embedCopied: "Kopyalandı!",
    widgetGuideTitle: "Arya-nı Saytınıza Əlavə Edin",
    widgetGuideSubtitle: "Saytınızı Sİ gücü ilə təchiz edin",
    widgetGuideIntro: "Arya-nı öz biznes saytınıza 2 dəqiqəyə əlavə edin. Widget saytınızın sağ alt küncündə görünəcək, müştəri suallarına Azərbaycan, Rus və İngilis dillərində — hətta səslə cavab verməyə hazır olacaq!",
    widgetStep1Title: "Addım 1: Şəxsi Kodunuzu Kopyalayın",
    widgetStep1Desc: "Bu kod sizin unikal Chat ID-nizi və rəng temanızı ehtiva edir.",
    widgetStep2Title: "Addım 2: Saytınıza Yapışdırın",
    widgetStep2Custom: "HTML / Developer üçün:",
    widgetStep2CustomDesc: "Kodu birbaşa hər səhifədə </body> bağlanma teqindən əvvəl yapışdırın.",
    widgetStep2Cms: "WordPress / Wix / Squarespace:",
    widgetStep2CmsSteps: [
      "Saytınızın Tənzimləmələr və ya Plaginlər bölməsinə keçin",
      "\"Insert Headers and Footers\" və ya \"Custom Code\" tapın",
      "Kodu Footer bölməsinə yapışdırın",
      "Yadda saxla düyməsini basın",
    ],
    widgetColorTitle: "Görünüşü Fərdiləşdirin",
    widgetColorDesc: "Chat düyməsinin rəngini brendinizə uyğunlaşdırın:",
    widgetColorDefault: "Mavi (Defolt)",
    widgetColorRed: "Qırmızı",
    widgetColorGreen: "Yaşıl",
    widgetColorPurple: "Bənövşəyi",
    smartLinkTitle: "Smart Link — Hər Yerdə Paylaşın",
    smartLinkDesc: "Sizin şəxsi Sİ səhifəniz hər yerdə işləyir. Linki kopyalayın və istədiyiniz yerdə paylaşın.",
    smartLinkCopy: "Linki Kopyala",
    smartLinkCopied: "Link kopyalandı!",
    smartLinkSocial: "Sosial Media Bio",
    smartLinkSocialWhere: "Instagram Bio, TikTok Bio, Facebook Haqqında",
    smartLinkSocialUse: "\"Qiymətlər və randevu üçün Smart Səhifəmə daxil olun.\"",
    smartLinkSocialWhy: "Statik Linktree-dən fərqli olaraq, bu link 3 dildə dərhal cavab verən aktiv Sİ agentini açır.",
    smartLinkMessenger: "WhatsApp və Messencerlər",
    smartLinkMessengerWhere: "WhatsApp Business Profili, WhatsApp Status, Telegram Bio",
    smartLinkMessengerUse: "\"Qiymət üçün bura yazın\" — müştərilər klikləyir, \"Neçəyədir?\" soruşur, cavab alır və randevu alır.",
    smartLinkMessengerWhy: "Müştərilər nömrənizi yaddaşa almaq və zəng etmək məcburiyyətində deyil.",
    smartLinkPhysical: "Fiziki Dünya — QR Kod & NFC",
    smartLinkPhysicalWhere: [
      "Restoranlar: Masada QR kod (\"Menyu və sifariş üçün skan edin\")",
      "Daşınmaz əmlak: \"Satılır\" lövhəsində QR kod",
      "Ustalar: NFC Vizit Kartı — telefonu yaxınlaşdırın",
    ],
    smartLinkPhysicalWhy: "Oflayn dünyadan onlayn Sİ-yə dərhal keçid. Heç bir tətbiq yükləmə tələb olunmur.",
    smartLinkAds: "Rəqəmsal Reklamlar",
    smartLinkAdsWhere: "Instagram Reklamları, Google Axtarış Reklamları",
    smartLinkAdsUse: "Reklam trafikini yavaş sayta deyil, Smart Linkə göndərin — Sİ dərhal cavab verir.",
    smartLinkAdsWhy: "Sİ ziyarətçini dərhal cəlb edir, statik formaya nisbətən konversiyanı artırır.",
  },
  ru: {
    profileReady: (name, slug) => `Ваш ИИ-ассистент готов! Профиль "${name}" активен.\n\nВаши клиенты могут связаться с вами по ссылке:\n/u/${slug}`,
    creating: "Профиль создаётся...",
    typing: "Arya печатает...",
    congrats: (name, slug) => `Поздравляем! ИИ-ассистент "${name}" готов!\n\nВаши клиенты могут связаться по ссылке:\n/u/${slug}\n\nВаш ИИ-ассистент знает всё о вашем бизнесе и будет отвечать клиентам 24/7.`,
    slugError: "Ссылка неверна. Используйте только строчные буквы, цифры и дефис. Например: samir-usta",
    slugTaken: "Эта ссылка уже занята. Выберите другую:",
    genericError: "Произошла ошибка. Попробуйте снова.",
    alreadyDone: "Ваш профиль уже создан. Клиенты могут связаться с вами по ссылке ниже.",
    placeholder: "Напишите ответ...",
    placeholderChat: "Напишите сообщение...",
    loading: "Профиль загружается...",
    emptyState: "Готовы создать вашего ИИ-ассистента",
    viewProfile: "Мой профиль",
    editProfile: "Редактировать",
    uploadPhoto: "Загрузить фото",
    translateKb: "Перевод Рус/Англ",
    translating: "Переводится...",
    translated: "Перевод завершён! Ваш профиль теперь работает на азербайджанском, русском и английском языках.",
    translateFail: "Ошибка при переводе. Попробуйте снова.",
    photoUploaded: "Фото успешно загружено!",
    photoFail: "Ошибка загрузки фото. Попробуйте снова.",
    editMode: "Режим редактирования. Отвечайте на вопросы или отправьте \"-\" чтобы пропустить.",
    editSaved: "Изменения сохранены! Профиль обновлён.",
    editSkip: "-",
    backToProfile: "Назад",
    selectTemplate: "Выберите вашу отрасль или введите вручную ниже:",
    templateSelected: (name: string) => `Шаблон "${name}" выбран! Услуги и цены заполнены автоматически.`,
    ocrOption: "Вы можете загрузить фото прайс-листа, и я прочитаю его автоматически",
    ocrUploading: "Читаю ваш прайс-лист...",
    ocrSuccess: (text: string) => `Нашёл эти цены:\n${text}\n\nХотите использовать? Напишите "да" или введите свои цены.`,
    ocrFail: "Не удалось прочитать изображение. Введите услуги вручную.",
    locationSearch: "Могу найти ваш бизнес на карте. Введите название для поиска или напишите адрес вручную.",
    locationFound: (name: string, address: string) => `Найдено: ${name}\n${address}`,
    locationNotFound: "Не удалось найти ваш бизнес. Введите адрес вручную.",
    useThis: "Использовать",
    orManual: "Ввести вручную",
    scanPriceList: "Загрузить прайс-лист",
    dashboardTitle: "Панель ИИ-ассистента",
    knowledgeBaseTitle: "База знаний",
    knowledgeBaseEmpty: "База знаний пока пуста",
    upgradePro: "Перейти на PRO",
    upgradeProDesc: "Голосовые ответы, Stripe оплата и больше",
    freeTrial: "3 Дня Бесплатно",
    manageTitle: "Управление",
    viewProfileDesc: "Страница для ваших клиентов",
    editProfileDesc: "Изменить услуги, цены, адрес",
    uploadPhotoDesc: "Добавить фото профиля",
    translateKbDesc: "Перевод на русский и английский",
    leadsTitle: "Обращения",
    leadsEmpty: "Обращений пока нет",
    leadsCount: (n: number) => `${n} сообщ.`,
    leadsMessages: "сообщ.",
    leadsViewAll: "Посмотреть все",
    leadsBack: "Назад",
    leadsVoice: "Голос",
    embedTitle: "Установить на сайт",
    embedDesc: "Добавьте этот код на ваш сайт",
    embedCopy: "Копировать",
    embedCopied: "Скопировано!",
    widgetGuideTitle: "Добавьте Arya на Ваш Сайт",
    widgetGuideSubtitle: "Превратите ваш сайт в ИИ-помощника",
    widgetGuideIntro: "Добавьте Arya на ваш бизнес-сайт за 2 минуты. Виджет появится в правом нижнем углу, готовый отвечать клиентам на азербайджанском, русском и английском — даже голосом!",
    widgetStep1Title: "Шаг 1: Скопируйте Ваш Личный Код",
    widgetStep1Desc: "Этот код содержит ваш уникальный Chat ID и цвет темы.",
    widgetStep2Title: "Шаг 2: Вставьте на Ваш Сайт",
    widgetStep2Custom: "Для HTML / Разработчиков:",
    widgetStep2CustomDesc: "Вставьте код перед закрывающим тегом </body> на каждой странице.",
    widgetStep2Cms: "WordPress / Wix / Squarespace:",
    widgetStep2CmsSteps: [
      "Откройте Настройки или Плагины вашего сайта",
      "Найдите «Insert Headers and Footers» или «Custom Code»",
      "Вставьте код в раздел Footer",
      "Нажмите Сохранить",
    ],
    widgetColorTitle: "Настройте Внешний Вид",
    widgetColorDesc: "Подберите цвет кнопки чата под ваш бренд:",
    widgetColorDefault: "Синий (По умолч.)",
    widgetColorRed: "Красный",
    widgetColorGreen: "Зелёный",
    widgetColorPurple: "Фиолетовый",
    smartLinkTitle: "Smart Link — Делитесь Везде",
    smartLinkDesc: "Ваша персональная ИИ-страница работает везде. Скопируйте ссылку и делитесь где угодно.",
    smartLinkCopy: "Скопировать ссылку",
    smartLinkCopied: "Ссылка скопирована!",
    smartLinkSocial: "Соцсети (Bio)",
    smartLinkSocialWhere: "Instagram Bio, TikTok Bio, Facebook «О себе»",
    smartLinkSocialUse: "\"Перейдите на мою Smart-страницу для цен и записи на приём.\"",
    smartLinkSocialWhy: "В отличие от статичного Linktree, эта ссылка открывает активного ИИ-агента, отвечающего на 3 языках мгновенно.",
    smartLinkMessenger: "WhatsApp и Мессенджеры",
    smartLinkMessengerWhere: "Профиль WhatsApp Business, Статус WhatsApp, Bio Telegram",
    smartLinkMessengerUse: "\"Напишите сюда для цены\" — клиенты нажимают, спрашивают \"Сколько?\", получают ответ и записываются.",
    smartLinkMessengerWhy: "Клиентам не нужно сохранять ваш номер и звонить.",
    smartLinkPhysical: "Физический мир — QR-код & NFC",
    smartLinkPhysicalWhere: [
      "Рестораны: QR-код на столе (\"Сканируйте для меню и заказа\")",
      "Недвижимость: QR-код на табличке «Продаётся»",
      "Мастера: NFC визитка — поднесите телефон",
    ],
    smartLinkPhysicalWhy: "Мгновенный переход из офлайна в онлайн-ИИ. Не нужно скачивать приложение.",
    smartLinkAds: "Цифровая Реклама",
    smartLinkAdsWhere: "Реклама в Instagram, Google Поиск",
    smartLinkAdsUse: "Направляйте рекламный трафик на Smart Link вместо медленного сайта — ИИ отвечает мгновенно.",
    smartLinkAdsWhy: "ИИ вовлекает посетителя сразу, увеличивая конверсию по сравнению со статичными формами.",
  },
  en: {
    profileReady: (name, slug) => `Your AI assistant is ready! "${name}" profile is active.\n\nYour customers can reach you at:\n/u/${slug}`,
    creating: "Creating your profile...",
    typing: "Arya is typing...",
    congrats: (name, slug) => `Congratulations! Your AI assistant "${name}" is ready!\n\nYour customers can reach you at:\n/u/${slug}\n\nYour AI assistant knows everything about your business and will respond to customers 24/7.`,
    slugError: "Invalid link. Use only lowercase letters, numbers and hyphens. Example: samir-usta",
    slugTaken: "This link is already taken. Choose a different one:",
    genericError: "An error occurred. Please try again.",
    alreadyDone: "Your profile is already set up. Customers can reach you via the link below.",
    placeholder: "Type your answer...",
    placeholderChat: "Type a message...",
    loading: "Loading profile...",
    emptyState: "Ready to build your AI assistant",
    viewProfile: "View My Profile",
    editProfile: "Edit Info",
    uploadPhoto: "Upload Photo",
    translateKb: "Translate Ru/En",
    translating: "Translating...",
    translated: "Translation complete! Your profile now works in Azerbaijani, Russian and English.",
    translateFail: "Translation error. Please try again.",
    photoUploaded: "Photo uploaded successfully!",
    photoFail: "Photo upload error. Please try again.",
    editMode: "Edit mode. Answer each question or send \"-\" to skip.",
    editSaved: "Changes saved! Your profile has been updated.",
    editSkip: "-",
    backToProfile: "Back",
    selectTemplate: "Choose your industry or type manually below:",
    templateSelected: (name: string) => `Template "${name}" selected! Services and prices auto-filled.`,
    ocrOption: "You can also upload a photo of your price list and I'll read it automatically",
    ocrUploading: "Reading your price list...",
    ocrSuccess: (text: string) => `I found these prices:\n${text}\n\nWant to use this? Type "yes" or enter your own prices.`,
    ocrFail: "Couldn't read the image. Please type your services manually.",
    locationSearch: "I can find your business on the map. Enter your business name to search, or type your address manually.",
    locationFound: (name: string, address: string) => `Found: ${name}\n${address}`,
    locationNotFound: "Couldn't find your business. Please type your address manually.",
    useThis: "Use this",
    orManual: "Or type manually",
    scanPriceList: "Upload Price List",
    dashboardTitle: "AI Assistant Dashboard",
    knowledgeBaseTitle: "Knowledge Base",
    knowledgeBaseEmpty: "Knowledge base is empty",
    upgradePro: "Upgrade to PRO",
    upgradeProDesc: "Voice replies, Stripe payments & more",
    freeTrial: "3 Days Free",
    manageTitle: "Manage",
    viewProfileDesc: "The page your customers see",
    editProfileDesc: "Change services, prices, address",
    uploadPhotoDesc: "Add a profile photo",
    translateKbDesc: "Translate to Russian & English",
    leadsTitle: "Leads",
    leadsEmpty: "No leads yet",
    leadsCount: (n: number) => `${n} msgs`,
    leadsMessages: "msgs",
    leadsViewAll: "View All",
    leadsBack: "Back",
    leadsVoice: "Voice",
    embedTitle: "Install on Website",
    embedDesc: "Add this code to your website",
    embedCopy: "Copy",
    embedCopied: "Copied!",
    widgetGuideTitle: "Add Arya to Your Website",
    widgetGuideSubtitle: "Turn your website into an AI powerhouse",
    widgetGuideIntro: "Add Arya to your business website in 2 minutes. The widget will appear in the bottom-right corner, ready to answer customer questions in Azerbaijani, Russian, and English — even via voice!",
    widgetStep1Title: "Step 1: Copy Your Personal Code",
    widgetStep1Desc: "This single line of code contains your unique Chat ID and theme color.",
    widgetStep2Title: "Step 2: Paste It Into Your Website",
    widgetStep2Custom: "For Custom HTML / Developers:",
    widgetStep2CustomDesc: "Paste the code directly before the closing </body> tag on every page.",
    widgetStep2Cms: "WordPress / Wix / Squarespace:",
    widgetStep2CmsSteps: [
      "Go to your website's Settings or Plugins",
      "Look for \"Insert Headers and Footers\" or \"Custom Code\"",
      "Paste the code into the Footer section",
      "Click Save",
    ],
    widgetColorTitle: "Customize the Look",
    widgetColorDesc: "Match the chat button to your brand:",
    widgetColorDefault: "Blue (Default)",
    widgetColorRed: "Red",
    widgetColorGreen: "Green",
    widgetColorPurple: "Purple",
    smartLinkTitle: "Smart Link — Share Everywhere",
    smartLinkDesc: "Your personal AI page works everywhere. Copy the link and share it anywhere you want.",
    smartLinkCopy: "Copy Link",
    smartLinkCopied: "Link copied!",
    smartLinkSocial: "Social Media Bios",
    smartLinkSocialWhere: "Instagram Bio, TikTok Bio, Facebook Intro",
    smartLinkSocialUse: "\"Visit my Smart Page to see prices and book an appointment.\"",
    smartLinkSocialWhy: "Instead of a static Linktree, this link opens an active AI agent that answers in 3 languages immediately.",
    smartLinkMessenger: "WhatsApp & Messengers",
    smartLinkMessengerWhere: "WhatsApp Business Profile, WhatsApp Status, Telegram Bio",
    smartLinkMessengerUse: "\"Write here for prices\" — customers click, ask \"How much?\", get the answer, and book.",
    smartLinkMessengerWhy: "Customers don't have to save your number and call. They click, ask, and book.",
    smartLinkPhysical: "Physical World — QR Codes & NFC",
    smartLinkPhysicalWhere: [
      "Restaurants: QR code on the table (\"Scan to see menu & order\")",
      "Real Estate: QR code on the \"For Sale\" sign",
      "Handymen: NFC Business Card — tap phone to open",
    ],
    smartLinkPhysicalWhy: "Bridges the offline world to online AI instantly. No app download required.",
    smartLinkAds: "Digital Ads",
    smartLinkAdsWhere: "Instagram Ads, Google Search Ads",
    smartLinkAdsUse: "Send ad traffic to your Smart Link instead of a slow website — the AI engages visitors immediately.",
    smartLinkAdsWhy: "The AI engages the visitor right away, increasing conversion rates compared to static forms.",
  },
};

const STEP_FIELDS: (keyof OnboardingState)[] = [
  "businessName", "profession", "services", "pricing", "location", "workHours", "faq", "slug"
];

const EDIT_FIELDS: (keyof OnboardingState)[] = [
  "businessName", "profession", "services", "pricing", "location", "workHours", "faq"
];

const LANG_LABELS: { key: Lang; label: string }[] = [
  { key: "az", label: "Az" },
  { key: "ru", label: "Ru" },
  { key: "en", label: "En" },
];

export default function AryaWidget({ profileId }: { profileId: string }) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [language, setLanguage] = useState<Lang>("az");
  const [editMode, setEditMode] = useState<{ step: number; data: Partial<OnboardingState> } | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [ocrPendingConfirm, setOcrPendingConfirm] = useState<string | null>(null);
  const [locationPendingSearch, setLocationPendingSearch] = useState(false);
  const [showDashboard, setShowDashboard] = useState(true);
  const [showLeads, setShowLeads] = useState(false);
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [embedCopied, setEmbedCopied] = useState(false);
  const [showWidgetGuide, setShowWidgetGuide] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [smartLinkCopied, setSmartLinkCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const ocrInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();

  const { data: smartProfile, refetch: refetchProfile } = useQuery<SmartProfileData | null>({
    queryKey: ["/api/smart-profile"],
    enabled: !!profileId,
  });

  const { data: proStatus } = useQuery<{ isPro: boolean; proExpiresAt: string | null }>({
    queryKey: ["/api/smart-profile/pro-status"],
    enabled: !!smartProfile?.id,
  });

  const isPro = proStatus?.isPro || false;

  const { data: leadsData } = useQuery<any[]>({
    queryKey: ["/api/smart-profile/leads"],
    enabled: !!smartProfile?.id,
  });

  const { data: hirearyaLeads } = useQuery<any[]>({
    queryKey: ["/api/proxy/leads", smartProfile?.slug],
    queryFn: async () => {
      const res = await fetch(`/api/proxy/leads/${smartProfile?.slug}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!smartProfile?.slug && isPro,
  });

  const { data: leadMessages, isLoading: isLeadLoading } = useQuery<any[]>({
    queryKey: ["/api/smart-profile/leads", selectedLead],
    queryFn: async () => {
      const res = await fetch(`/api/smart-profile/leads/${selectedLead}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch lead");
      return res.json();
    },
    enabled: !!selectedLead,
  });

  const t = UI_TEXT[language];
  const questions = ONBOARDING_QUESTIONS[language];
  const editQuestions = EDIT_QUESTIONS[language];

  useEffect(() => {
    fetch("/api/proxy/templates/list")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        if (Array.isArray(data)) setTemplates(data);
        else if (data?.templates && Array.isArray(data.templates)) setTemplates(data.templates);
      })
      .catch(() => setTemplates([]));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (smartProfile === undefined) return;
    if (editMode) return;
    if (smartProfile && smartProfile.onboardingComplete) {
      setMessages([{
        role: "assistant",
        text: t.profileReady(smartProfile.businessName, smartProfile.slug),
      }]);
      setOnboarding(null);
    } else if (!smartProfile) {
      setMessages([{ role: "assistant", text: questions[0] }]);
      setOnboarding({
        step: 0,
        businessName: "",
        profession: "",
        services: "",
        pricing: "",
        location: "",
        workHours: "",
        faq: "",
        slug: "",
      });
    }
  }, [smartProfile, language]);

  const handleTemplateSelect = (template: any) => {
    if (!onboarding) return;
    const services = template.services || template.default_services || "";
    const pricing = template.pricing || template.default_pricing || "";
    const templateId = template.id || template.template_id || "";
    const templateName = template.name || template.title || "Template";

    const newState = {
      ...onboarding,
      services,
      pricing,
      templateId,
      step: 4,
    };
    setOnboarding(newState);
    setMessages(prev => [
      ...prev,
      { role: "user", text: templateName },
      { role: "assistant", text: t.templateSelected(templateName) },
      { role: "assistant", text: questions[4] },
      { role: "assistant", text: t.locationSearch, type: "text" as const },
    ]);
    setLocationPendingSearch(true);
  };

  const handleOcrUpload = async (file: File) => {
    if (!onboarding) return;
    setIsLoading(true);
    setMessages(prev => [...prev, { role: "assistant", text: t.ocrUploading }]);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/proxy/scan", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("OCR failed");
      const data = await res.json();
      const ocrText = data.text || data.result || data.content || "";

      if (ocrText) {
        setMessages(prev => [
          ...prev.slice(0, -1),
          { role: "assistant", text: t.ocrSuccess(ocrText) },
        ]);
        setOcrPendingConfirm(ocrText);
      } else {
        setMessages(prev => [
          ...prev.slice(0, -1),
          { role: "assistant", text: t.ocrFail },
        ]);
      }
    } catch {
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: "assistant", text: t.ocrFail },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationSearch = async (query: string) => {
    setIsLoading(true);
    setMessages(prev => [...prev, { role: "assistant", text: t.typing }]);

    try {
      const res = await fetch("/api/proxy/location/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Location search failed");
      const data = await res.json();

      const firstItem = data.items?.[0] || data.result || data.location || data;
      const name = firstItem.name || firstItem.title || query;
      const address = firstItem.address || firstItem.address_name || firstItem.full_address || "";
      const phone = firstItem.phone || "";
      const hours = firstItem.working_hours || firstItem.schedule?.comment || firstItem.hours || firstItem.workHours || "";

      if (address) {
        setMessages(prev => [
          ...prev.slice(0, -1),
          {
            role: "assistant",
            text: t.locationFound(name, address),
            type: "location-result" as const,
            data: { name, address, phone, hours },
          },
        ]);
      } else {
        const newState = { ...onboarding!, location: query, step: 5 };
        setOnboarding(newState);
        setLocationPendingSearch(false);
        setMessages(prev => [
          ...prev.slice(0, -1),
          { role: "assistant", text: t.locationNotFound },
          { role: "assistant", text: questions[5] },
        ]);
      }
    } catch {
      const newState = { ...onboarding!, location: query, step: 5 };
      setOnboarding(newState);
      setLocationPendingSearch(false);
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: "assistant", text: t.locationNotFound },
        { role: "assistant", text: questions[5] },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationUse = (locationData: any) => {
    if (!onboarding) return;
    const locationStr = [locationData.name, locationData.address, locationData.phone].filter(Boolean).join(", ");
    const hours = locationData.hours || "";

    const newState = {
      ...onboarding,
      location: locationStr,
      workHours: hours || onboarding.workHours,
      locationData,
      step: hours ? 6 : 5,
    };
    setOnboarding(newState);

    if (hours) {
      setMessages(prev => [
        ...prev,
        { role: "assistant", text: questions[6] },
      ]);
    } else {
      setMessages(prev => [
        ...prev,
        { role: "assistant", text: questions[5] },
      ]);
    }
  };

  const handleOnboardingAnswer = async (answer: string) => {
    if (!onboarding) return;
    const currentStep = onboarding.step;

    if (ocrPendingConfirm) {
      const isYes = ["yes", "bəli", "beli", "да", "hə", "he"].includes(answer.toLowerCase().trim());
      if (isYes) {
        const newState = { ...onboarding, services: ocrPendingConfirm, step: 3 };
        setOnboarding(newState);
        setOcrPendingConfirm(null);
        setMessages(prev => [...prev, { role: "assistant", text: questions[3] }]);
      } else {
        const newState = { ...onboarding, services: answer, step: 3 };
        setOnboarding(newState);
        setOcrPendingConfirm(null);
        setMessages(prev => [...prev, { role: "assistant", text: questions[3] }]);
      }
      return;
    }

    if (currentStep === 4 && locationPendingSearch) {
      await handleLocationSearch(answer);
      return;
    }

    const field = STEP_FIELDS[currentStep];
    const newState = { ...onboarding, [field]: answer, step: currentStep + 1 };
    setOnboarding(newState);

    if (currentStep === 1 && templates.length > 0) {
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          text: t.selectTemplate,
          type: "templates" as const,
          data: templates,
        },
        { role: "assistant", text: questions[2] },
        {
          role: "assistant",
          text: t.ocrOption,
          type: "ocr-option" as const,
        },
      ]);
      return;
    }

    if (currentStep === 1 && templates.length === 0) {
      setMessages(prev => [
        ...prev,
        { role: "assistant", text: questions[2] },
        {
          role: "assistant",
          text: t.ocrOption,
          type: "ocr-option" as const,
        },
      ]);
      return;
    }

    if (currentStep === 3) {
      setMessages(prev => [
        ...prev,
        { role: "assistant", text: questions[4] },
        { role: "assistant", text: t.locationSearch, type: "text" as const },
      ]);
      setLocationPendingSearch(true);
      return;
    }

    if (currentStep + 1 < questions.length) {
      setMessages(prev => [...prev, {
        role: "assistant",
        text: questions[currentStep + 1],
      }]);
    } else {
      const slugClean = answer.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/--+/g, "-").replace(/^-|-$/g, "");
      if (!slugClean) {
        setMessages(prev => [...prev, {
          role: "assistant",
          text: t.slugError,
        }]);
        setOnboarding({ ...onboarding, step: currentStep });
        return;
      }

      setIsCreating(true);
      setMessages(prev => [...prev, {
        role: "assistant",
        text: t.creating,
      }]);

      const knowledgeBase = buildKnowledgeBase(newState);

      try {
        await apiRequest("POST", "/api/smart-profile", {
          slug: slugClean,
          businessName: newState.businessName,
          profession: newState.profession,
          themeColor: "#2563EB",
          knowledgeBase,
        });

        try {
          await fetch("/api/proxy/profiles/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              slug: slugClean,
              businessName: newState.businessName,
              profession: newState.profession,
              services: newState.services,
              pricing: newState.pricing,
              location: newState.location,
              workHours: newState.workHours,
              faq: newState.faq,
              templateId: newState.templateId || null,
              locationData: newState.locationData || null,
            }),
          });
        } catch {
        }

        setMessages(prev => [
          ...prev.slice(0, -1),
          {
            role: "assistant",
            text: t.congrats(newState.businessName, slugClean),
          },
        ]);
        setOnboarding(null);
        refetchProfile();
      } catch (err: any) {
        const errMsg = err?.message || "";
        const displayMsg = errMsg.includes("already taken") ? t.slugTaken : t.genericError;
        setMessages(prev => [
          ...prev.slice(0, -1),
          { role: "assistant", text: displayMsg },
        ]);
        setOnboarding({ ...onboarding, step: currentStep });
      } finally {
        setIsCreating(false);
      }
    }
  };

  const handleEditAnswer = async (answer: string) => {
    if (!editMode || !smartProfile) return;
    const currentStep = editMode.step;
    const field = EDIT_FIELDS[currentStep];
    const isSkip = answer.trim() === "-";

    const newData = isSkip ? { ...editMode.data } : { ...editMode.data, [field]: answer };
    const nextStep = currentStep + 1;

    if (nextStep < editQuestions.length) {
      setEditMode({ step: nextStep, data: newData });
      setMessages(prev => [...prev, { role: "assistant", text: editQuestions[nextStep] }]);
    } else {
      setIsCreating(true);
      setMessages(prev => [...prev, { role: "assistant", text: t.creating }]);

      const updatedName = (newData.businessName as string) || smartProfile.businessName;
      const updatedProfession = (newData.profession as string) || smartProfile.profession;

      const kbParts: Record<string, string> = {};
      if (smartProfile.knowledgeBase) {
        const lines = smartProfile.knowledgeBase.split("\n\n");
        for (const line of lines) {
          const colonIdx = line.indexOf(":");
          if (colonIdx > 0) {
            kbParts[line.substring(0, colonIdx).trim()] = line.substring(colonIdx + 1).trim();
          }
        }
      }

      if (newData.businessName) kbParts["Biznes adı"] = newData.businessName as string;
      if (newData.profession) kbParts["Peşə"] = newData.profession as string;
      if (newData.services) kbParts["Xidmətlər və qiymətlər"] = newData.services as string;
      if (newData.pricing) kbParts["Qiymət siyasəti"] = newData.pricing as string;
      if (newData.location) kbParts["Ərazi/Ünvan"] = newData.location as string;
      if (newData.workHours) kbParts["İş saatları"] = newData.workHours as string;
      if (newData.faq) kbParts["Tez-tez verilən suallar"] = newData.faq as string;

      const newKb = Object.entries(kbParts).map(([k, v]) => `${k}: ${v}`).join("\n\n");

      try {
        await apiRequest("PATCH", "/api/smart-profile", {
          businessName: updatedName,
          profession: updatedProfession,
          knowledgeBase: newKb,
        });

        setMessages(prev => [
          ...prev.slice(0, -1),
          { role: "assistant", text: t.editSaved },
        ]);
        setEditMode(null);
        queryClient.invalidateQueries({ queryKey: ["/api/smart-profile"] });
      } catch {
        setMessages(prev => [
          ...prev.slice(0, -1),
          { role: "assistant", text: t.genericError },
        ]);
      } finally {
        setIsCreating(false);
      }
    }
  };

  const buildKnowledgeBase = (state: OnboardingState): string => {
    const sections = [];
    sections.push(`Biznes adı: ${state.businessName}`);
    sections.push(`Peşə: ${state.profession}`);
    if (state.services) sections.push(`Xidmətlər və qiymətlər: ${state.services}`);
    if (state.pricing) sections.push(`Qiymət siyasəti: ${state.pricing}`);
    if (state.location) sections.push(`Ərazi/Ünvan: ${state.location}`);
    if (state.workHours) sections.push(`İş saatları: ${state.workHours}`);
    if (state.faq) sections.push(`Tez-tez verilən suallar: ${state.faq}`);
    return sections.join("\n\n");
  };

  const startEditMode = () => {
    setEditMode({ step: 0, data: {} });
    setMessages([
      { role: "assistant", text: t.editMode },
      { role: "assistant", text: editQuestions[0] },
    ]);
  };

  const exitEditMode = () => {
    setEditMode(null);
    if (smartProfile) {
      setMessages([{
        role: "assistant",
        text: t.profileReady(smartProfile.businessName, smartProfile.slug),
      }]);
    }
  };

  const handlePhotoUpload = async (file: File) => {
    setIsLoading(true);
    setMessages(prev => [...prev, { role: "assistant", text: "..." }]);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch("/api/smart-profile/upload-image", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Upload failed");

      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: "assistant", text: t.photoUploaded },
      ]);
      queryClient.invalidateQueries({ queryKey: ["/api/smart-profile"] });
    } catch {
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: "assistant", text: t.photoFail },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTranslate = async () => {
    setIsTranslating(true);
    setMessages(prev => [...prev, { role: "assistant", text: t.translating }]);

    try {
      const res = await fetch("/api/smart-profile/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Translation failed");

      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: "assistant", text: t.translated },
      ]);
      queryClient.invalidateQueries({ queryKey: ["/api/smart-profile"] });
    } catch {
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: "assistant", text: t.translateFail },
      ]);
    } finally {
      setIsTranslating(false);
    }
  };

  const sendText = async () => {
    if (!input.trim()) return;
    const text = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", text }]);

    if (editMode) {
      await handleEditAnswer(text);
    } else if (onboarding) {
      await handleOnboardingAnswer(text);
    } else {
      setMessages(prev => [...prev, {
        role: "assistant",
        text: t.alreadyDone,
      }]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendText();
    }
  };

  const [isUpgrading, setIsUpgrading] = useState(false);

  const handleCheckout = async () => {
    if (!smartProfile) return;
    setIsUpgrading(true);
    try {
      const res = await fetch("/api/proxy/payment/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: smartProfile.slug, profileId: smartProfile.id }),
        credentials: "include",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "API error");
      }
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank");
      } else {
        toast({ title: t.genericError, variant: "destructive" });
      }
    } catch (err: any) {
      const msg = err?.message?.includes("unavailable")
        ? (language === "az" ? "Xidmət müvəqqəti əlçatmazdır. Sonra yenidən cəhd edin."
          : language === "ru" ? "Сервис временно недоступен. Попробуйте позже."
          : "Service temporarily unavailable. Please try again later.")
        : t.genericError;
      toast({ title: msg, variant: "destructive" });
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleLanguageChange = (lang: Lang) => {
    setLanguage(lang);
    if (onboarding && onboarding.step === 0 && messages.length <= 1) {
      setMessages([{ role: "assistant", text: ONBOARDING_QUESTIONS[lang][0] }]);
    }
  };

  const renderMessage = (m: Message, i: number) => {
    const baseClass = `p-3 rounded-md max-w-[80%] text-sm whitespace-pre-line ${
      m.role === "user"
        ? "bg-primary text-primary-foreground ml-auto"
        : "bg-muted text-foreground"
    }`;

    if (m.type === "templates" && m.data && Array.isArray(m.data)) {
      return (
        <div key={i} className="bg-muted text-foreground p-3 rounded-md max-w-[90%] text-sm" data-testid={`message-templates-${i}`}>
          <p className="mb-2">{m.text}</p>
          <div className="grid grid-cols-2 gap-2">
            {m.data.map((tmpl: any, idx: number) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                className="text-xs justify-start gap-1.5 overflow-visible"
                onClick={() => handleTemplateSelect(tmpl)}
                data-testid={`button-template-${tmpl.id || idx}`}
              >
                <Sparkles className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{tmpl.name || tmpl.title || `Template ${idx + 1}`}</span>
              </Button>
            ))}
          </div>
        </div>
      );
    }

    if (m.type === "ocr-option") {
      return (
        <div key={i} className="bg-muted text-foreground p-3 rounded-md max-w-[80%] text-sm" data-testid={`message-ocr-option-${i}`}>
          <p className="mb-2">{m.text}</p>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => ocrInputRef.current?.click()}
            disabled={isLoading}
            data-testid="button-ocr-upload"
          >
            <Upload className="w-3 h-3" />
            {t.scanPriceList}
          </Button>
        </div>
      );
    }

    if (m.type === "location-result" && m.data) {
      return (
        <div key={i} className="bg-muted text-foreground p-3 rounded-md max-w-[80%] text-sm" data-testid={`message-location-result-${i}`}>
          <div className="flex items-start gap-2 mb-2">
            <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5 text-muted-foreground" />
            <div className="whitespace-pre-line">{m.text}</div>
          </div>
          {m.data.phone && (
            <p className="text-xs text-muted-foreground mb-1">Tel: {m.data.phone}</p>
          )}
          {m.data.hours && (
            <p className="text-xs text-muted-foreground mb-2">Hours: {m.data.hours}</p>
          )}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="default"
              size="sm"
              className="text-xs gap-1"
              onClick={() => handleLocationUse(m.data)}
              data-testid="button-location-use"
            >
              {t.useThis}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => {
                setLocationPendingSearch(false);
                setMessages(prev => [...prev, { role: "assistant", text: questions[4] }]);
              }}
              data-testid="button-location-manual"
            >
              {t.orManual}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div
        key={i}
        className={baseClass}
        data-testid={`message-${m.role}-${i}`}
      >
        {m.text}
      </div>
    );
  };

  if (!profileId) {
    return (
      <Card className="flex flex-col h-[500px] overflow-visible items-center justify-center p-6 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">{t.loading}</p>
      </Card>
    );
  }

  const profileReady = smartProfile && smartProfile.onboardingComplete;

  const kbPreview = smartProfile?.knowledgeBase
    ? smartProfile.knowledgeBase.split("\n\n").map(line => {
        const colonIdx = line.indexOf(":");
        if (colonIdx > 0) {
          return { label: line.substring(0, colonIdx).trim(), value: line.substring(colonIdx + 1).trim() };
        }
        return { label: "", value: line };
      }).filter(item => item.value)
    : [];

  const hasTranslations = !!(smartProfile?.knowledgeBaseRu || smartProfile?.knowledgeBaseEn);

  if (profileReady && showWidgetGuide && smartProfile) {
    const COLOR_PRESETS = [
      { hex: "#2563EB", label: t.widgetColorDefault },
      { hex: "#DC2626", label: t.widgetColorRed },
      { hex: "#16A34A", label: t.widgetColorGreen },
      { hex: "#9333EA", label: t.widgetColorPurple },
    ];
    const activeColor = selectedColor || smartProfile.themeColor || "#2563EB";
    const widgetVersion = "1";
    const prodDomain = "https://arya.az";
    const embedCode = `<script src="${prodDomain}/widget.js?v=${widgetVersion}" data-slug="${smartProfile.slug}" data-color="${activeColor}"></script>`;

    const handleCopyCode = () => {
      navigator.clipboard.writeText(embedCode).then(() => {
        setEmbedCopied(true);
        setTimeout(() => setEmbedCopied(false), 2000);
        toast({ title: t.embedCopied });
      }).catch(() => {
        toast({ title: language === "az" ? "Kopyalama uğursuz oldu" : language === "ru" ? "Не удалось скопировать" : "Copy failed", variant: "destructive" });
      });
    };

    const handleColorSelect = async (hex: string) => {
      setSelectedColor(hex);
      try {
        await apiRequest("PATCH", "/api/smart-profile", { themeColor: hex });
        queryClient.invalidateQueries({ queryKey: ["/api/smart-profile"] });
      } catch {}
    };

    return (
      <Card className="flex flex-col h-[calc(100svh-12rem)] sm:h-[500px] min-h-[350px] max-h-[600px] overflow-visible">
        <div className="flex items-center gap-2 px-3 sm:px-4 pt-3 pb-2 border-b">
          <Button size="icon" variant="ghost" onClick={() => setShowWidgetGuide(false)} data-testid="button-widget-guide-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h3 className="font-semibold text-sm" data-testid="text-widget-guide-title">{t.widgetGuideTitle}</h3>
        </div>

        <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-4" data-testid="widget-guide-content">
          <div className="bg-blue-500/10 rounded-md p-3 border border-blue-500/20">
            <p className="text-xs leading-relaxed text-foreground" data-testid="text-widget-guide-intro">{t.widgetGuideIntro}</p>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold" data-testid="text-step1-title">{t.widgetStep1Title}</h4>
            <p className="text-[11px] text-muted-foreground" data-testid="text-step1-desc">{t.widgetStep1Desc}</p>
            <div className="relative" data-testid="embed-code-section">
              <pre className="text-[10px] bg-muted rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all font-mono leading-relaxed border pr-10" data-testid="embed-code-snippet">
{embedCode}
              </pre>
              <Button
                size="icon"
                variant="ghost"
                className="absolute top-1.5 right-1.5"
                onClick={handleCopyCode}
                data-testid="button-copy-embed"
              >
                {embedCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>
            <Button onClick={handleCopyCode} className="w-full gap-2" data-testid="button-copy-embed-main">
              {embedCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {embedCopied ? t.embedCopied : t.embedCopy}
            </Button>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold" data-testid="text-step2-title">{t.widgetStep2Title}</h4>
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-foreground" data-testid="text-step2-custom">{t.widgetStep2Custom}</p>
              <p className="text-[11px] text-muted-foreground" data-testid="text-step2-custom-desc">{t.widgetStep2CustomDesc}</p>
            </div>
            <div className="space-y-1.5 mt-2">
              <p className="text-[11px] font-medium text-foreground" data-testid="text-step2-cms">{t.widgetStep2Cms}</p>
              <ol className="list-decimal list-inside space-y-1">
                {t.widgetStep2CmsSteps.map((step, i) => (
                  <li key={i} className="text-[11px] text-muted-foreground">{step}</li>
                ))}
              </ol>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold">{t.widgetColorTitle}</h4>
            <p className="text-[11px] text-muted-foreground">{t.widgetColorDesc}</p>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((c) => (
                <Button
                  key={c.hex}
                  size="sm"
                  variant={activeColor === c.hex ? "secondary" : "outline"}
                  onClick={() => handleColorSelect(c.hex)}
                  className="gap-1.5 text-[11px] toggle-elevate"
                  data-testid={`button-color-${c.hex.slice(1).toLowerCase()}`}
                >
                  <span className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: c.hex }} data-testid={`color-swatch-${c.hex.slice(1).toLowerCase()}`} />
                  {c.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-foreground" />
              <h4 className="text-xs font-semibold" data-testid="text-smartlink-title">{t.smartLinkTitle}</h4>
            </div>
            <p className="text-[11px] text-muted-foreground" data-testid="text-smartlink-desc">{t.smartLinkDesc}</p>

            <div className="bg-muted rounded-md p-2.5 flex items-center gap-2 border">
              <code className="text-[11px] font-mono flex-1 truncate" data-testid="text-smartlink-url">{prodDomain}/u/{smartProfile.slug}</code>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 shrink-0"
                onClick={() => {
                  const url = `${prodDomain}/u/${smartProfile.slug}`;
                  navigator.clipboard.writeText(url).then(() => {
                    setSmartLinkCopied(true);
                    setTimeout(() => setSmartLinkCopied(false), 2000);
                    toast({ title: t.smartLinkCopied });
                  }).catch(() => {
                    toast({ title: language === "az" ? "Kopyalama uğursuz oldu" : language === "ru" ? "Не удалось скопировать" : "Copy failed", variant: "destructive" });
                  });
                }}
                data-testid="button-copy-smartlink"
              >
                {smartLinkCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {smartLinkCopied ? t.smartLinkCopied : t.smartLinkCopy}
              </Button>
            </div>

            <div className="space-y-2.5">
              {[
                {
                  icon: <Globe className="w-4 h-4 text-muted-foreground" />,
                  title: t.smartLinkSocial,
                  where: t.smartLinkSocialWhere,
                  use: t.smartLinkSocialUse,
                  why: t.smartLinkSocialWhy,
                  testId: "social",
                },
                {
                  icon: <Smartphone className="w-4 h-4 text-muted-foreground" />,
                  title: t.smartLinkMessenger,
                  where: t.smartLinkMessengerWhere,
                  use: t.smartLinkMessengerUse,
                  why: t.smartLinkMessengerWhy,
                  testId: "messenger",
                },
                {
                  icon: <QrCode className="w-4 h-4 text-muted-foreground" />,
                  title: t.smartLinkPhysical,
                  where: null,
                  whereList: t.smartLinkPhysicalWhere,
                  use: null,
                  why: t.smartLinkPhysicalWhy,
                  testId: "physical",
                },
                {
                  icon: <Megaphone className="w-4 h-4 text-muted-foreground" />,
                  title: t.smartLinkAds,
                  where: t.smartLinkAdsWhere,
                  use: t.smartLinkAdsUse,
                  why: t.smartLinkAdsWhy,
                  testId: "ads",
                },
              ].map((item) => (
                <div key={item.testId} className="rounded-md p-3 border bg-muted/50" data-testid={`smartlink-card-${item.testId}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    {item.icon}
                    <span className="text-[11px] font-semibold text-foreground" data-testid={`text-smartlink-${item.testId}-title`}>{item.title}</span>
                  </div>
                  <div className="space-y-1 pl-6">
                    {item.where && (
                      <p className="text-[10px] text-muted-foreground">
                        <span className="font-medium text-foreground">{language === "az" ? "Harada:" : language === "ru" ? "Где:" : "Where:"}</span> {item.where}
                      </p>
                    )}
                    {(item as any).whereList && (
                      <ul className="space-y-0.5">
                        {(item as any).whereList.map((w: string, i: number) => (
                          <li key={i} className="text-[10px] text-muted-foreground flex items-start gap-1">
                            <span className="mt-1.5 w-1 h-1 rounded-full bg-foreground/30 dark:bg-foreground/40 shrink-0" />
                            {w}
                          </li>
                        ))}
                      </ul>
                    )}
                    {item.use && (
                      <p className="text-[10px] text-muted-foreground italic">{item.use}</p>
                    )}
                    <p className="text-[10px] text-foreground/80 font-medium">{item.why}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-muted/50 rounded-md p-3 border">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <span className="text-[11px] font-medium text-foreground" data-testid="text-widget-guide-note">
                {language === "az" ? "Nəzərə alın" : language === "ru" ? "На заметку" : "Good to know"}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed" data-testid="text-widget-guide-note-body">
              {language === "az"
                ? "Widget avtomatik olaraq saytınızla birlikdə işləyir. Heç bir əlavə tənzimləmə tələb olunmur — sadəcə kodu yapışdırın və müştəriləriniz dərhal yazışmağa başlasınlar!"
                : language === "ru"
                ? "Виджет работает автоматически. Никакой дополнительной настройки — просто вставьте код, и ваши клиенты смогут сразу начать общение!"
                : "The widget works automatically. No extra setup needed — just paste the code and your customers can start chatting right away!"}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (profileReady && showLeads) {
    const formatTime = (ts: string) => {
      const d = new Date(ts);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 60) return `${diffMins}m`;
      const diffHrs = Math.floor(diffMins / 60);
      if (diffHrs < 24) return `${diffHrs}h`;
      return d.toLocaleDateString();
    };

    if (selectedLead) {
      if (isLeadLoading || !leadMessages) {
        return (
          <Card className="flex flex-col h-[calc(100svh-12rem)] sm:h-[500px] min-h-[350px] max-h-[600px] overflow-visible">
            <div className="flex items-center gap-2 px-3 sm:px-4 pt-3 pb-2 border-b">
              <Button size="icon" variant="ghost" onClick={() => setSelectedLead(null)} data-testid="button-leads-back-loading">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h3 className="font-semibold text-sm">{t.leadsTitle}</h3>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          </Card>
        );
      }
      return (
        <Card className="flex flex-col h-[calc(100svh-12rem)] sm:h-[500px] min-h-[350px] max-h-[600px] overflow-visible">
          <div className="flex items-center gap-2 px-3 sm:px-4 pt-3 pb-2 border-b">
            <Button size="icon" variant="ghost" onClick={() => setSelectedLead(null)} data-testid="button-leads-back-detail">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h3 className="font-semibold text-sm">{t.leadsTitle}</h3>
          </div>
          <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-2 space-y-2" data-testid="leads-detail">
            {leadMessages.map((msg: any, i: number) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-md px-3 py-2 text-xs ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {msg.content_type === "voice" ? (
                    <span className="flex items-center gap-1"><Mic className="w-3 h-3" /> {t.leadsVoice}</span>
                  ) : (
                    <span className="break-words">{msg.content || "..."}</span>
                  )}
                  <span className="block text-[10px] opacity-60 mt-0.5">{formatTime(msg.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      );
    }

    return (
      <Card className="flex flex-col h-[calc(100svh-12rem)] sm:h-[500px] min-h-[350px] max-h-[600px] overflow-visible">
        <div className="flex items-center gap-2 px-3 sm:px-4 pt-3 pb-2 border-b">
          <Button size="icon" variant="ghost" onClick={() => setShowLeads(false)} data-testid="button-leads-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h3 className="font-semibold text-sm flex items-center gap-1.5">
            <Users className="w-4 h-4 text-primary" />
            {t.leadsTitle}
          </h3>
          {(() => {
            const localCount = leadsData?.length || 0;
            const hirearyaCount = isPro && hirearyaLeads?.length ? hirearyaLeads.length : 0;
            const total = localCount + hirearyaCount;
            return total > 0 ? <Badge variant="secondary" className="ml-auto text-[10px]">{total}</Badge> : null;
          })()}
        </div>
        <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-2 space-y-1.5" data-testid="leads-list">
          {(() => {
            const allLeads = [
              ...(leadsData || []).map((l: any) => ({ ...l, source: "local" })),
              ...(isPro && hirearyaLeads ? hirearyaLeads.map((l: any) => ({ ...l, source: "hirearya", session_id: l.session_id || l.id })) : []),
            ];
            if (allLeads.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Users className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">{t.leadsEmpty}</p>
                </div>
              );
            }
            return allLeads.map((lead: any, i: number) => (
              <Button
                key={lead.session_id || i}
                variant="ghost"
                className="w-full h-auto p-2.5 justify-start font-normal bg-muted/30"
                onClick={() => lead.source === "local" ? setSelectedLead(lead.session_id) : null}
                data-testid={`lead-item-${i}`}
              >
                <div className="flex items-center gap-2.5 w-full min-w-0">
                  <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <MessageCircle className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-xs font-medium truncate">{lead.first_user_message || lead.message || "..."}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{formatTime(lead.last_message || lead.created_at)}</span>
                      {lead.user_messages && <span>{t.leadsCount(Number(lead.user_messages))}</span>}
                    </div>
                  </div>
                  {lead.source === "hirearya" && <Badge variant="outline" className="text-[10px] shrink-0 border-emerald-500/30 text-emerald-600">PRO</Badge>}
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                </div>
              </Button>
            ));
          })()}
        </div>
      </Card>
    );
  }

  if (profileReady && showDashboard && !editMode) {
    return (
      <Card className="flex flex-col h-[calc(100svh-12rem)] sm:h-[500px] min-h-[350px] max-h-[600px] overflow-visible">
        <div className="flex items-center justify-between gap-1 px-3 sm:px-4 pt-3 pb-1">
          <h3 className="font-semibold text-sm sm:text-base flex items-center gap-1.5" data-testid="text-dashboard-title">
            <Sparkles className="w-4 h-4 text-primary" />
            {t.dashboardTitle}
          </h3>
          <div className="flex items-center gap-1">
            {LANG_LABELS.map(({ key, label }) => (
              <Button
                key={key}
                size="sm"
                variant={language === key ? "default" : "ghost"}
                onClick={() => handleLanguageChange(key)}
                className="px-2 sm:px-3 text-xs font-medium"
                data-testid={`button-lang-${key}`}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 sm:px-4 pb-3 space-y-3" data-testid="dashboard-content">
          <a
            href={`/u/${smartProfile.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <div className="flex items-center gap-3 p-3 rounded-md bg-primary/10 border border-primary/20 hover-elevate" data-testid="link-view-profile">
              <div className="w-10 h-10 rounded-md bg-primary/20 flex items-center justify-center shrink-0">
                <Eye className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{t.viewProfile}</p>
                <p className="text-xs text-muted-foreground truncate">/u/{smartProfile.slug} — {t.viewProfileDesc}</p>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
            </div>
          </a>

          {isPro ? (
            <div className="flex items-center gap-3 p-3 rounded-md bg-emerald-500/10 border border-emerald-500/20 w-full" data-testid="pro-status-active">
              <div className="w-10 h-10 rounded-md bg-emerald-500/20 flex items-center justify-center shrink-0">
                <Crown className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <span className="text-sm font-medium flex items-center gap-1.5 flex-wrap">
                  {language === "ru" ? "PRO Активен" : language === "en" ? "PRO Active" : "PRO Aktiv"}
                  <Badge className="bg-emerald-500 text-white border-transparent text-[10px]">PRO</Badge>
                </span>
                <span className="text-xs text-muted-foreground block">
                  {proStatus?.proExpiresAt
                    ? `${language === "ru" ? "До" : language === "en" ? "Until" : "Müddət"}: ${new Date(proStatus.proExpiresAt).toLocaleDateString()}`
                    : ""}
                </span>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              onClick={handleCheckout}
              disabled={isUpgrading}
              className="w-full h-auto p-0 justify-start font-normal"
              data-testid="button-upgrade-pro"
            >
              <div className="flex items-center gap-3 p-3 rounded-md bg-emerald-500/10 border border-emerald-500/20 w-full">
                <div className="w-10 h-10 rounded-md bg-emerald-500/20 flex items-center justify-center shrink-0">
                  {isUpgrading ? <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" /> : <Crown className="w-5 h-5 text-emerald-600" />}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <span className="text-sm font-medium flex items-center gap-1.5 flex-wrap">
                    {t.upgradePro}
                    <Badge className="bg-emerald-500 text-white border-transparent text-[10px]">PRO</Badge>
                  </span>
                  <span className="text-xs text-muted-foreground block">{t.upgradeProDesc}</span>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0 border-emerald-500/30 text-emerald-600">{t.freeTrial}</Badge>
              </div>
            </Button>
          )}

          <Button
            variant="ghost"
            onClick={() => { setShowLeads(true); setSelectedLead(null); }}
            className="w-full h-auto p-0 justify-start font-normal"
            data-testid="button-view-leads"
          >
            <div className="flex items-center gap-3 p-3 rounded-md bg-amber-500/10 border border-amber-500/20 w-full">
              <div className="w-10 h-10 rounded-md bg-amber-500/20 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <span className="text-sm font-medium">{t.leadsTitle}</span>
                <span className="text-xs text-muted-foreground block">
                  {(() => {
                    const localCount = leadsData?.length || 0;
                    const hirearyaCount = isPro && hirearyaLeads?.length ? hirearyaLeads.length : 0;
                    const total = localCount + hirearyaCount;
                    return total > 0 ? t.leadsCount(total) : t.leadsEmpty;
                  })()}
                </span>
              </div>
              {(() => {
                const localCount = leadsData?.length || 0;
                const hirearyaCount = isPro && hirearyaLeads?.length ? hirearyaLeads.length : 0;
                const total = localCount + hirearyaCount;
                return total > 0 ? <Badge variant="secondary" className="text-[10px] shrink-0">{total}</Badge> : null;
              })()}
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </div>
          </Button>

          <Button
            variant="ghost"
            onClick={() => { setShowWidgetGuide(true); setSelectedColor(smartProfile.themeColor || "#2563EB"); }}
            className="w-full h-auto p-0 justify-start font-normal"
            data-testid="button-widget-guide"
          >
            <div className="flex items-center gap-3 p-3 rounded-md bg-blue-500/10 border border-blue-500/20 w-full">
              <div className="w-10 h-10 rounded-md bg-blue-500/20 flex items-center justify-center shrink-0">
                <Code className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <span className="text-sm font-medium">{t.embedTitle}</span>
                <span className="text-xs text-muted-foreground block">{t.widgetGuideSubtitle}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </div>
          </Button>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t.knowledgeBaseTitle}</h4>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs gap-1 h-7"
                onClick={() => { startEditMode(); setShowDashboard(false); }}
                data-testid="button-edit-kb"
              >
                <Pencil className="w-3 h-3" />
                {t.editProfile}
              </Button>
            </div>
            {kbPreview.length > 0 ? (
              <div className="space-y-1.5 bg-muted/50 rounded-md p-2.5 text-xs max-h-40 overflow-y-auto" data-testid="kb-preview">
                {kbPreview.map((item, i) => (
                  <div key={i}>
                    {item.label && <span className="font-medium text-muted-foreground">{item.label}:</span>}
                    <span className="break-words ml-1">{item.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">{t.knowledgeBaseEmpty}</p>
            )}
            {hasTranslations && (
              <div className="flex items-center gap-1 mt-1.5">
                <Globe className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">
                  {smartProfile.knowledgeBaseRu ? "Ru" : ""}{smartProfile.knowledgeBaseRu && smartProfile.knowledgeBaseEn ? " + " : ""}{smartProfile.knowledgeBaseEn ? "En" : ""}
                </span>
              </div>
            )}
          </div>

          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t.manageTitle}</h4>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="h-auto p-2.5 justify-start font-normal bg-muted/50"
                data-testid="button-upload-photo"
              >
                <div className="flex items-center gap-2 w-full">
                  <Camera className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0 text-left">
                    <p className="text-xs font-medium truncate">{t.uploadPhoto}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{t.uploadPhotoDesc}</p>
                  </div>
                </div>
              </Button>
              <Button
                variant="ghost"
                onClick={handleTranslate}
                disabled={isTranslating}
                className="h-auto p-2.5 justify-start font-normal bg-muted/50"
                data-testid="button-translate-kb"
              >
                <div className="flex items-center gap-2 w-full">
                  <Languages className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0 text-left">
                    <p className="text-xs font-medium truncate">{t.translateKb}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{t.translateKbDesc}</p>
                  </div>
                </div>
              </Button>
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handlePhotoUpload(file);
            e.target.value = "";
          }}
          data-testid="input-file-upload"
        />

        <div className="p-3 border-t">
          <Button
            variant="outline"
            className="w-full gap-1.5 text-xs sm:text-sm"
            onClick={() => setShowDashboard(false)}
            data-testid="button-open-chat"
          >
            <Send className="w-3.5 h-3.5" />
            {t.placeholderChat}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-[calc(100svh-12rem)] sm:h-[500px] min-h-[350px] max-h-[600px] overflow-visible">
      <div className="flex items-center justify-between gap-1 px-3 sm:px-4 pt-3 pb-1">
        {(editMode || (profileReady && !showDashboard)) && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (editMode) exitEditMode();
              setShowDashboard(true);
            }}
            className="text-xs gap-1"
            data-testid="button-back-to-dashboard"
          >
            <ArrowLeft className="w-3 h-3" />
            {t.backToProfile}
          </Button>
        )}
        <div className="flex items-center gap-1 ml-auto">
          {LANG_LABELS.map(({ key, label }) => (
            <Button
              key={key}
              size="sm"
              variant={language === key ? "default" : "ghost"}
              onClick={() => handleLanguageChange(key)}
              className="px-2 sm:px-3 text-xs font-medium"
              data-testid={`button-lang-${key}`}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-3 space-y-3" data-testid="widget-messages">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Sparkles className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm">{t.emptyState}</p>
          </div>
        )}
        {messages.map((m, i) => renderMessage(m, i))}
        {(isLoading || isCreating || isTranslating) && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs p-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            {isCreating ? t.creating : isTranslating ? t.translating : t.typing}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handlePhotoUpload(file);
          e.target.value = "";
        }}
        data-testid="input-file-upload"
      />

      <input
        ref={ocrInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleOcrUpload(file);
          e.target.value = "";
        }}
        data-testid="input-ocr-upload"
      />

      <div className="p-3 border-t flex gap-2 items-center">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={onboarding || editMode ? t.placeholder : t.placeholderChat}
          disabled={isLoading || isCreating || isTranslating}
          data-testid="input-chat-message"
        />
        <Button
          size="icon"
          onClick={sendText}
          disabled={isLoading || isCreating || isTranslating || !input.trim()}
          data-testid="button-send-message"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
