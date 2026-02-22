import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Mic, Send, Loader2, MapPin, ArrowLeft, Square, Sparkles, MessageSquare, ChevronDown, Pencil, Check, X, Volume2, Shield } from "lucide-react";
import samirUstaImg from "@assets/samir-usta_1771161226793.png";
import ayselTutorImg from "@assets/Aysel-tutor_1771162249994.png";
import kebabHouseImg from "@assets/kebab_1771162691604.png";

const API_URL = "https://hirearya.replit.app";

const PROFILE_AVATARS: Record<string, string> = {
  "samir-usta": samirUstaImg,
  "aysel-teacher": ayselTutorImg,
  "kebab-house": kebabHouseImg,
};

const DEMO_PROFILES: Record<string, { display_name: string; profession: string; profession_ru: string; profession_en: string; theme_color: string }> = {
  "samir-usta": { display_name: "Samir Usta", profession: "Kombi və Kondisioner Ustası", profession_ru: "Мастер по котлам и кондиционерам", profession_en: "Boiler & AC Technician", theme_color: "#2563EB" },
  "aysel-teacher": { display_name: "Aysel English", profession: "İngilis Dili Müəllimi", profession_ru: "Преподаватель английского языка", profession_en: "English Language Teacher", theme_color: "#9333EA" },
  "kebab-house": { display_name: "Kebab House", profession: "Milli Mətbəx", profession_ru: "Национальная кухня", profession_en: "National Cuisine", theme_color: "#EA580C" },
  "new-user": { display_name: "Demo İstifadəçi", profession: "Sİ Köməkçi", profession_ru: "ИИ-Ассистент", profession_en: "AI Assistant", theme_color: "#2563EB" },
};

const DEMO_REPLIES: Record<string, Record<string, string[]>> = {
  "samir-usta": {
    az: [
      "Salam! Kombi təmiri 20 AZN-dən başlayır. Kondisioner quraşdırma isə 50 AZN-dir. Hansı xidmət lazımdır?",
      "Bəli, bütün Bakı ərazisində xidmət göstərirəm. Ən tez 2 saat ərzində gələ bilərəm.",
      "Kombi təmizliyi 30 AZN, filtr dəyişdirilməsi 15 AZN-dir. Zəmanət verilir.",
      "Hə, həftə sonu da işləyirəm. Zəng edin, razılaşaq.",
    ],
    ru: [
      "Здравствуйте! Ремонт котла от 20 AZN. Установка кондиционера — 50 AZN. Какая услуга нужна?",
      "Да, обслуживаю весь Баку. Могу приехать в течение 2 часов.",
      "Чистка котла 30 AZN, замена фильтра 15 AZN. Гарантия предоставляется.",
      "Да, работаю и по выходным. Звоните, договоримся.",
    ],
    en: [
      "Hello! Boiler repair starts from 20 AZN. AC installation is 50 AZN. What service do you need?",
      "Yes, I serve all of Baku. I can arrive within 2 hours.",
      "Boiler cleaning 30 AZN, filter replacement 15 AZN. Warranty included.",
      "Yes, I work weekends too. Call me and we'll arrange it.",
    ],
  },
  "aysel-teacher": {
    az: [
      "Salam! Fərdi İngilis dili dərsləri hər gün mümkündür. Hər dərs 45 dəqiqədir.",
      "Dərslər onlayn və ya üzbəüz ola bilər. Qiymət 15 AZN-dən başlayır.",
      "IELTS hazırlığı da var. 2 aylıq intensiv kurs 400 AZN-dir.",
      "İlk dərs pulsuzdur! Səviyyənizi yoxlayaq və plan quraq.",
    ],
    ru: [
      "Здравствуйте! Индивидуальные уроки английского доступны каждый день. Каждый урок — 45 минут.",
      "Уроки онлайн или очно. Цена от 15 AZN.",
      "Подготовка к IELTS тоже есть. 2-месячный интенсив — 400 AZN.",
      "Первый урок бесплатно! Проверим ваш уровень и составим план.",
    ],
    en: [
      "Hello! Private English lessons are available every day. Each lesson is 45 minutes.",
      "Lessons can be online or in-person. Prices start from 15 AZN.",
      "IELTS preparation is also available. 2-month intensive course is 400 AZN.",
      "First lesson is free! Let's check your level and create a plan.",
    ],
  },
  "kebab-house": {
    az: [
      "Xoş gəlmisiniz! Lülə kebab, Tike kebab, Adana kebab — hamısı var. Nə istərdiniz?",
      "Bəli, çatdırılma var! 30 dəqiqəyə qapınızda olacaq. Minimum sifariş 10 AZN.",
      "Bu günkü xüsusi təklif: 2 porsiya lülə kebab + içki cəmi 12 AZN!",
      "İş saatları: hər gün 10:00-dan 23:00-dək. Həftə sonu da açığıq.",
    ],
    ru: [
      "Добро пожаловать! Люля-кебаб, тике-кебаб, адана-кебаб — всё есть. Что желаете?",
      "Да, доставка есть! Через 30 минут будет у вашей двери. Минимальный заказ 10 AZN.",
      "Специальное предложение дня: 2 порции люля-кебаб + напиток всего 12 AZN!",
      "Часы работы: ежедневно с 10:00 до 23:00. По выходным тоже открыты.",
    ],
    en: [
      "Welcome! Lula kebab, Tike kebab, Adana kebab — we have it all. What would you like?",
      "Yes, we deliver! At your door in 30 minutes. Minimum order 10 AZN.",
      "Today's special: 2 portions of lula kebab + drink for only 12 AZN!",
      "Working hours: daily from 10:00 to 23:00. Open on weekends too.",
    ],
  },
  "new-user": {
    az: [
      "Bu bir demo hesabdır. Mən zəngləri cavablandırmaq, sifarişləri qəbul etmək və potensial müştəriləri avtomatik süzgəcdən keçirmək üçün buradayam. Öz profilinizi yaratmaq üçün \"3 Gün Pulsuz\" düyməsini basın!",
      "Mən 7/24 işləyirəm, heç bir fasilə olmadan. Suallarınızı yazın və ya səslə danışın.",
      "Arya ilə biznesinizi gücləndirin. İlk 3 gün tamamilə pulsuzdur!",
    ],
    ru: [
      "Это демо-аккаунт. Я здесь, чтобы отвечать на звонки, принимать заказы и автоматически фильтровать потенциальных клиентов. Нажмите \"3 дня бесплатно\", чтобы создать свой профиль!",
      "Я работаю 24/7 без перерывов. Пишите вопросы или говорите голосом.",
      "Усильте свой бизнес с Arya. Первые 3 дня совершенно бесплатно!",
    ],
    en: [
      "This is a demo account. I'm here to answer calls, take orders, and automatically filter potential customers. Click \"3 Days Free\" to create your own profile!",
      "I work 24/7 without breaks. Type your questions or speak by voice.",
      "Power up your business with Arya. First 3 days completely free!",
    ],
    es: [
      "Esta es una cuenta demo. Estoy aquí para responder llamadas, tomar pedidos y filtrar clientes potenciales automáticamente. ¡Haz clic en \"3 Días Gratis\" para crear tu propio perfil!",
      "Trabajo 24/7 sin descanso. Escribe tus preguntas o habla por voz.",
      "Potencia tu negocio con Arya. ¡Los primeros 3 días son completamente gratis!",
    ],
    fr: [
      "Ceci est un compte démo. Je suis là pour répondre aux appels, prendre les commandes et filtrer automatiquement les clients potentiels. Cliquez sur \"3 Jours Gratuits\" pour créer votre propre profil !",
      "Je travaille 24h/24, 7j/7 sans pause. Tapez vos questions ou parlez par la voix.",
      "Boostez votre entreprise avec Arya. Les 3 premiers jours sont entièrement gratuits !",
    ],
    tr: [
      "Bu bir demo hesaptır. Aramaları yanıtlamak, sipariş almak ve potansiyel müşterileri otomatik filtrelemek için buradayım. Kendi profilinizi oluşturmak için \"3 Gün Ücretsiz\" düğmesine tıklayın!",
      "7/24 aralıksız çalışıyorum. Sorularınızı yazın veya sesle konuşun.",
      "Arya ile işinizi güçlendirin. İlk 3 gün tamamen ücretsiz!",
    ],
  },
};

const GREETINGS: Record<string, Record<string, (name: string, profession: string) => string>> = {
  known: {
    az: (name, _prof) => `Salam! Mən Arya, ${name}-nin Sİ köməkçisiyəm. Sizə necə kömək edə bilərəm?`,
    ru: (name, _prof) => `Здравствуйте! Я Arya, ИИ-ассистент ${name}. Чем могу помочь?`,
    en: (name, _prof) => `Hi! I'm Arya, ${name}'s AI assistant. How can I help you?`,
    es: (name, _prof) => `¡Hola! Soy Arya, el asistente de IA de ${name}. ¿En qué puedo ayudarte?`,
    fr: (name, _prof) => `Bonjour ! Je suis Arya, l'assistant IA de ${name}. Comment puis-je vous aider ?`,
    tr: (name, _prof) => `Merhaba! Ben Arya, ${name}'in yapay zeka asistanıyım. Size nasıl yardımcı olabilirim?`,
    uz: (name, _prof) => `Salom! Men Arya, ${name}ning sun'iy intellekt yordamchisiman. Sizga qanday yordam bera olaman?`,
    kk: (name, _prof) => `Сәлем! Мен Arya, ${name} жасанды интеллект көмекшісімін. Сізге қалай көмектесе аламын?`,
  },
  fallback: {
    az: (name, _prof) => `Salam! Mən Arya, ${name}-nin Sİ köməkçisiyəm. Sizə necə kömək edə bilərəm?`,
    ru: (name, _prof) => `Здравствуйте! Я Arya, ИИ-ассистент ${name}. Чем могу помочь?`,
    en: (name, _prof) => `Hi! I'm Arya, ${name}'s AI assistant. How can I help you?`,
    es: (name, _prof) => `¡Hola! Soy Arya, el asistente de IA de ${name}. ¿En qué puedo ayudarte?`,
    fr: (name, _prof) => `Bonjour ! Je suis Arya, l'assistant IA de ${name}. Comment puis-je vous aider ?`,
    tr: (name, _prof) => `Merhaba! Ben Arya, ${name}'in yapay zeka asistanıyım. Size nasıl yardımcı olabilirim?`,
    uz: (name, _prof) => `Salom! Men Arya, ${name}ning sun'iy intellekt yordamchisiman. Sizga qanday yordam bera olaman?`,
    kk: (name, _prof) => `Сәлем! Мен Arya, ${name} жасанды интеллект көмекшісімін. Сізге қалай көмектесе аламын?`,
  },
  newUser: {
    az: (_n, _p) => "Salam! Mən Arya, sizin Sİ köməkçinizəm. Sizə necə kömək edə bilərəm?",
    ru: (_n, _p) => "Здравствуйте! Я Arya, ваш ИИ-ассистент. Чем могу помочь?",
    en: (_n, _p) => "Hi! I'm Arya, your AI assistant. How can I help you?",
    es: (_n, _p) => "¡Hola! Soy Arya, tu asistente de IA. ¿En qué puedo ayudarte?",
    fr: (_n, _p) => "Bonjour ! Je suis Arya, votre assistant IA. Comment puis-je vous aider ?",
    tr: (_n, _p) => "Merhaba! Ben Arya, yapay zeka asistanınızım. Size nasıl yardımcı olabilirim?",
    uz: (_n, _p) => "Salom! Men Arya, sizning sun'iy intellekt yordamchingizman. Sizga qanday yordam bera olaman?",
    kk: (_n, _p) => "Сәлем! Мен Arya, сіздің жасанды интеллект көмекшіңізмін. Сізге қалай көмектесе аламын?",
  },
};

interface ProfileData {
  id: string;
  display_name: string;
  profession: string;
  profession_ru?: string | null;
  profession_en?: string | null;
  theme_color: string;
  avatar_url: string;
  profile_image_url?: string | null;
  knowledge_base_ru?: string | null;
  knowledge_base_en?: string | null;
  user_id?: string;
  is_pro?: boolean;
  pro_expires_at?: string | null;
}

interface Message {
  role: "user" | "assistant";
  text: string;
  audioUrl?: string;
}

function getSessionId(): string {
  const key = "arya-smart-session-id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = `browser-${crypto.randomUUID?.() || Date.now()}`;
    sessionStorage.setItem(key, id);
  }
  return id;
}

export default function SmartProfile({ slug, onBack, allowOwnerMode = false }: { slug: string; onBack: () => void; allowOwnerMode?: boolean }) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [showTutorial, setShowTutorial] = useState(() => slug === "new-user");
  const [language, setLanguage] = useState<"az" | "ru" | "en" | "es" | "fr" | "tr" | "uz" | "kk">(() => {
    const supported = ["az", "ru", "en", "es", "fr", "tr", "uz", "kk"] as const;
    const params = new URLSearchParams(window.location.search);
    const urlLang = params.get("lang");
    if (urlLang && (supported as readonly string[]).includes(urlLang)) return urlLang as typeof supported[number];
    const browserLang = (navigator.language || "").toLowerCase().slice(0, 2);
    if ((supported as readonly string[]).includes(browserLang)) return browserLang as typeof supported[number];
    return "en";
  });
  const [pendingVoiceText, setPendingVoiceText] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const sessionIdRef = useRef(getSessionId());
  const demoReplyIndexRef = useRef(0);
  const apiAvailableRef = useRef(true);
  const mediaCleanupRef = useRef<(() => void) | null>(null);

  const localKnowledgeRef = useRef<string | null>(null);
  const localKnowledgeRuRef = useRef<string | null>(null);
  const localKnowledgeEnRef = useRef<string | null>(null);
  const profileImageRef = useRef<string | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const isOwnerChat = allowOwnerMode && !!(currentUserId && profile?.user_id && String(currentUserId) === String(profile.user_id));

  useEffect(() => {
    fetch("/api/user", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.id) setCurrentUserId(String(data.id)); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      window.history.replaceState({}, "", `/u/${slug}`);
      fetch("/api/smart-profile/activate-pro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })
        .then(r => r.json())
        .then(() => {
          setMessages(prev => [...prev, {
            role: "assistant",
            text: ({ az: "PRO abunəlik aktivləşdirildi! 3 gün pulsuz sınaq.", ru: "PRO подписка активирована! 3 дня бесплатно.", en: "PRO subscription activated! 3 days free trial.", es: "¡Suscripción PRO activada! 3 días de prueba gratis.", fr: "Abonnement PRO activé ! 3 jours d'essai gratuit.", tr: "PRO abonelik aktifleştirildi! 3 gün ücretsiz deneme.", uz: "PRO obuna faollashtirildi! 3 kun bepul sinov.", kk: "PRO жазылым белсендірілді! 3 күн тегін сынақ." } as Record<string, string>)[language] || "PRO subscription activated! 3 days free trial."
          }]);
        })
        .catch(() => {});
    }
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    setProfileLoading(true);
    demoReplyIndexRef.current = 0;
    localKnowledgeRef.current = null;
    localKnowledgeRuRef.current = null;
    localKnowledgeEnRef.current = null;
    profileImageRef.current = null;

    const demoInfo = DEMO_PROFILES[slug];

    fetch(`/api/smart-profile/by-slug/${slug}`)
      .then(res => {
        if (!res.ok) throw new Error("Not local");
        return res.json();
      })
      .then(data => {
        apiAvailableRef.current = false;
        localKnowledgeRef.current = data.knowledge_base || null;
        localKnowledgeRuRef.current = data.knowledge_base_ru || null;
        localKnowledgeEnRef.current = data.knowledge_base_en || null;
        profileImageRef.current = data.profile_image_url || null;
        setProfile({
          id: data.id,
          display_name: data.display_name,
          profession: data.profession,
          profession_ru: data.profession_ru,
          profession_en: data.profession_en,
          theme_color: data.theme_color,
          avatar_url: data.profile_image_url || "",
          profile_image_url: data.profile_image_url,
          knowledge_base_ru: data.knowledge_base_ru,
          knowledge_base_en: data.knowledge_base_en,
          user_id: data.user_id,
          is_pro: data.is_pro || false,
          pro_expires_at: data.pro_expires_at || null,
        });
        const greetFn = GREETINGS.known[language] || GREETINGS.known.en;
        setMessages([{ role: "assistant", text: greetFn(data.display_name, data.profession) }]);
        setProfileLoading(false);
      })
      .catch(() => {
        fetch(`/api/proxy/widget/profile/${slug}`)
          .then(res => {
            if (!res.ok) throw new Error("API error");
            return res.json();
          })
          .then(data => {
            apiAvailableRef.current = true;
            const demoTrans = DEMO_PROFILES[slug];
            setProfile({
              ...data,
              profession_ru: data.profession_ru || demoTrans?.profession_ru || null,
              profession_en: data.profession_en || demoTrans?.profession_en || null,
            });
            const greetFn = slug === "new-user"
              ? (GREETINGS.newUser[language] || GREETINGS.newUser.en)
              : (GREETINGS.known[language] || GREETINGS.known.en);
            setMessages([{ role: "assistant", text: greetFn(data.display_name, data.profession) }]);
          })
          .catch(() => {
            apiAvailableRef.current = false;
            const fallback = demoInfo || { display_name: slug, profession: "AI Assistant", profession_ru: "ИИ-Ассистент", profession_en: "AI Assistant", theme_color: "#2563EB" };
            setProfile({
              id: "demo-id",
              display_name: fallback.display_name,
              profession: fallback.profession,
              profession_ru: fallback.profession_ru,
              profession_en: fallback.profession_en,
              theme_color: fallback.theme_color,
              avatar_url: ""
            });
            const greetFn = slug === "new-user"
              ? (GREETINGS.newUser[language] || GREETINGS.newUser.en)
              : (GREETINGS.fallback[language] || GREETINGS.fallback.en);
            setMessages([{ role: "assistant", text: greetFn(fallback.display_name, fallback.profession) }]);
          })
          .finally(() => setProfileLoading(false));
      });
  }, [slug]);

  const getOwnerGreeting = (ownerName: string): Record<string, string> => ({
    az: `Salam! Mən ${ownerName}-nin Executive Assistant-ıyam. Biznesi idarə etməkdə, məlumatları yeniləməkdə kömək edə bilərəm.`,
    ru: `Здравствуйте! Я Executive Assistant ${ownerName}. Могу обновить информацию о бизнесе, помочь со стратегией и управлением.`,
    en: `Hello! I'm the Executive Assistant of ${ownerName}. I can update your business info, help with strategy, and manage your AI receptionist.`,
    es: `¡Hola! Soy el Asistente Ejecutivo de ${ownerName}. Puedo actualizar tu información, ayudar con estrategia y gestionar tu recepcionista IA.`,
    fr: `Bonjour ! Je suis l'Assistant Exécutif de ${ownerName}. Je peux mettre à jour vos informations et gérer votre réceptionniste IA.`,
    tr: `Merhaba! Ben ${ownerName}'in Yönetici Asistanıyım. İş bilgilerinizi güncelleyebilir, strateji ve yönetimde yardımcı olabilirim.`,
    uz: `Salom! Men ${ownerName}ning Ijrochi Yordamchisiman. Biznes ma'lumotlaringizni yangilashim, strategiya va boshqaruvda yordam berishim mumkin.`,
    kk: `Сәлем! Мен ${ownerName} атқарушы көмекшісімін. Бизнес ақпаратыңызды жаңартып, стратегия мен басқаруға көмектесе аламын.`,
  });

  useEffect(() => {
    if (!profile) return;
    const name = profile.display_name;
    const prof = profile.profession;
    const isDemo = profile.id === "demo-id";

    if (isOwnerChat) {
      const greetings = getOwnerGreeting(name);
      const greeting = greetings[language] || greetings.en;
      setMessages(prev => {
        if (prev.length <= 1) return [{ role: "assistant", text: greeting }];
        return [{ role: "assistant", text: greeting }, ...prev.slice(1)];
      });
    } else {
      const greetFn = slug === "new-user"
        ? (GREETINGS.newUser[language] || GREETINGS.newUser.en)
        : isDemo
          ? (GREETINGS.fallback[language] || GREETINGS.fallback.en)
          : (GREETINGS.known[language] || GREETINGS.known.en);
      const newGreeting = greetFn(name, prof);
      setMessages(prev => {
        if (prev.length <= 1) return [{ role: "assistant", text: newGreeting }];
        return [{ role: "assistant", text: newGreeting }, ...prev.slice(1)];
      });
    }
    demoReplyIndexRef.current = 0;
  }, [language, isOwnerChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    return () => {
      if (mediaCleanupRef.current) mediaCleanupRef.current();
    };
  }, []);

  const micErrorMessages: Record<string, string> = {
    az: "Mikrofona icazə verin və yenidən cəhd edin.",
    ru: "Разрешите доступ к микрофону и попробуйте снова.",
    en: "Please allow microphone access and try again.",
    es: "Permita el acceso al micrófono e inténtelo de nuevo.",
    fr: "Veuillez autoriser l'accès au microphone et réessayer.",
    tr: "Mikrofon erişimine izin verin ve tekrar deneyin.",
  };

  const micMetaBrowserMessages: Record<string, string> = {
    az: "Instagram/Facebook brauzeri mikrofona icazə vermir. Linki Safari və ya Chrome-da açın — orada mikrofon işləyəcək.",
    ru: "Браузер Instagram/Facebook не разрешает доступ к микрофону. Откройте ссылку в Safari или Chrome — там микрофон будет работать.",
    en: "Instagram/Facebook browser blocks microphone access. Open this link in Safari or Chrome — the mic will work there.",
    es: "El navegador de Instagram/Facebook bloquea el micrófono. Abra este enlace en Safari o Chrome — allí funcionará.",
    fr: "Le navigateur Instagram/Facebook bloque l'accès au micro. Ouvrez ce lien dans Safari ou Chrome — le micro y fonctionnera.",
    tr: "Instagram/Facebook tarayıcısı mikrofona izin vermiyor. Bu linki Safari veya Chrome'da açın — mikrofon orada çalışacak.",
  };

  const micNotRecognizedMessages: Record<string, string> = {
    az: "Səs tanınmadı. Yenidən cəhd edin.",
    ru: "Речь не распознана. Попробуйте снова.",
    en: "Speech not recognized. Please try again.",
    es: "No se reconoció el habla. Inténtelo de nuevo.",
    fr: "Voix non reconnue. Veuillez réessayer.",
    tr: "Ses tanınmadı. Tekrar deneyin.",
  };

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const toggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      return;
    }

    if (!profile) return;

    const ua = navigator.userAgent || "";
    const isMetaBrowser = /FBAN|FBAV|Instagram|FB_IAB/i.test(ua);
    if (isMetaBrowser) {
      setMessages(prev => [...prev, { role: "assistant", text: micMetaBrowserMessages[language] || micMetaBrowserMessages.en }]);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setIsRecording(false);

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioBlob.size < 1000) return;

        setIsTranscribing(true);
        try {
          const formData = new FormData();
          formData.append("audio", audioBlob, "recording.webm");

          const res = await fetch("/api/transcribe", { method: "POST", body: formData });
          if (!res.ok) throw new Error("Transcription failed");
          const data = await res.json();
          if (data.text?.trim()) {
            setPendingVoiceText(data.text.trim());
          } else {
            setMessages(prev => [...prev, { role: "assistant", text: micNotRecognizedMessages[language] || micNotRecognizedMessages.en }]);
          }
        } catch {
          setMessages(prev => [...prev, { role: "assistant", text: micErrorMessages[language] || micErrorMessages.en }]);
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", text: micErrorMessages[language] || micErrorMessages.en }]);
    }
  };

  const getDemoReply = () => {
    const profileReplies = DEMO_REPLIES[slug] || DEMO_REPLIES["new-user"];
    const langReplies = profileReplies[language] || profileReplies["en"] || profileReplies["az"];
    const idx = demoReplyIndexRef.current % langReplies.length;
    demoReplyIndexRef.current++;
    return langReplies[idx];
  };

  const getLocalKnowledgeReply = (question: string): string => {
    let kb = localKnowledgeRef.current;
    if (language === "ru" && localKnowledgeRuRef.current) {
      kb = localKnowledgeRuRef.current;
    } else if ((language === "en" || language === "es" || language === "fr" || language === "tr") && localKnowledgeEnRef.current) {
      kb = localKnowledgeEnRef.current;
    }
    const fallbackMessages: Record<string, string> = {
      az: "Mən sizə kömək etmək üçün buradayam. Nə sual vermək istərdiniz?",
      ru: "Я здесь, чтобы помочь вам. Какой у вас вопрос?",
      en: "I'm here to help you. What would you like to ask?",
      es: "Estoy aquí para ayudarte. ¿Qué te gustaría preguntar?",
      fr: "Je suis là pour vous aider. Que souhaitez-vous demander ?",
      tr: "Size yardımcı olmak için buradayım. Ne sormak istersiniz?",
    };
    if (!kb) return fallbackMessages[language] || fallbackMessages.en;
    const lines = kb.split("\n").filter(l => l.trim());
    const q = question.toLowerCase();
    const keywords = q.split(/\s+/).filter(w => w.length > 2);
    let bestLine = "";
    let bestScore = 0;
    for (const line of lines) {
      const lower = line.toLowerCase();
      let score = 0;
      for (const kw of keywords) {
        if (lower.includes(kw)) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        bestLine = line;
      }
    }
    if (bestLine && bestScore > 0) {
      const val = bestLine.includes(":") ? bestLine.split(":").slice(1).join(":").trim() : bestLine;
      return val || bestLine;
    }
    return kb.substring(0, 300) + (kb.length > 300 ? "..." : "");
  };

  const sendMessage = async (_audioBlob: Blob | null, text: string | null) => {
    if (!text) return;
    setIsLoading(true);

    try {
      if (isOwnerChat) {
        const res = await fetch("/api/owner-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ message: text }),
        });
        if (!res.ok) throw new Error("API error");
        const data = await res.json();
        const reply = data.reply || "Sorry, please try again.";
        setMessages(prev => [...prev, { role: "assistant", text: reply }]);
      } else {
        const chatHistory = messages.filter(m => m.text).slice(-6).map(m => ({
          role: m.role,
          text: m.text,
        }));

        const res = await fetch("/api/smart-profile/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug,
            message: text,
            language,
            history: chatHistory,
          }),
        });
        if (!res.ok) throw new Error("API error");
        const data = await res.json();

        const reply = data.reply || getDemoReply();
        setMessages(prev => [...prev, { role: "assistant", text: reply }]);

        const pId = profile?.id || "demo-id";
        logWidgetMessage(pId, sessionIdRef.current, "user", text, "text");
        logWidgetMessage(pId, sessionIdRef.current, "assistant", reply, "text");
      }
    } catch {
      const reply = getDemoReply();
      setMessages(prev => [...prev, { role: "assistant", text: reply }]);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmPendingVoice = async () => {
    if (!pendingVoiceText) return;
    const text = pendingVoiceText.trim();
    setPendingVoiceText(null);
    if (text) {
      setMessages(prev => [...prev, { role: "user", text }]);
      await sendMessage(null, text);
    }
  };

  const cancelPendingVoice = () => {
    setPendingVoiceText(null);
  };

  const startEditMessage = (index: number) => {
    setEditingIndex(index);
    setEditText(messages[index].text);
  };

  const confirmEditMessage = async () => {
    if (editingIndex === null || !editText.trim()) return;
    const newText = editText.trim();
    setMessages(prev => {
      const updated = [...prev];
      updated[editingIndex] = { ...updated[editingIndex], text: newText };
      const removeAfter = editingIndex + 1;
      return updated.slice(0, removeAfter);
    });
    setEditingIndex(null);
    setEditText("");
    await sendMessage(null, newText);
  };

  const cancelEditMessage = () => {
    setEditingIndex(null);
    setEditText("");
  };

  const handleBuy = async () => {
    setIsUpgrading(true);
    try {
      const res = await fetch("/api/proxy/payment/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Payment API error");
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setMessages(prev => [...prev, { role: "assistant", text: "Ödəniş xətası. Yenidən cəhd edin." }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", text: "Ödəniş servisi müvəqqəti əlçatmazdır. Yenidən cəhd edin." }]);
    } finally {
      setIsUpgrading(false);
    }
  };

  const logWidgetMessage = (pId: string, sId: string, role: string, content: string, contentType: string) => {
    fetch("/api/widget-messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId: pId, sessionId: sId, role, content, contentType }),
    }).catch(err => console.error("[widget-log]", err));
  };

  const handleSendText = () => {
    if (!input.trim()) return;
    const text = input;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text }]);
    sendMessage(null, text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  const initials = profile?.display_name
    ?.split(" ")
    .map(w => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

  const displayProfession = (language === "ru" && profile?.profession_ru)
    ? profile.profession_ru
    : ((language === "en" || language === "es" || language === "fr" || language === "tr") && profile?.profession_en)
      ? profile.profession_en
      : profile?.profession;

  const locationText: string | null = null;

  const placeholders: Record<string, string> = {
    az: "Mesaj yazın...", ru: "Напишите сообщение...", en: "Type a message...",
    es: "Escribe un mensaje...", fr: "Écrivez un message...", tr: "Mesaj yazın...",
  };
  const inputPlaceholder = placeholders[language] || placeholders.en;

  const isOwner = isOwnerChat;

  const handleSaveName = async () => {
    if (!nameInput.trim() || !profile) return;
    try {
      const res = await fetch("/api/smart-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ displayName: nameInput.trim() }),
      });
      if (res.ok) {
        setProfile({ ...profile, display_name: nameInput.trim() });
        setEditingName(false);
      }
    } catch {}
  };

  if (profileLoading) {
    return (
      <div className="flex flex-col bg-[#0F172A] items-center justify-center" style={{ height: "100dvh" }}>
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        <p className="text-blue-200 mt-3 text-sm">Yukl&#601;nir...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-background" style={{ height: "100dvh" }} data-testid="smart-profile-page">
      {showTutorial && slug === "new-user" && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
          onClick={() => setShowTutorial(false)}
          data-testid="tutorial-overlay"
        >
          <div
            className="bg-card text-card-foreground p-8 rounded-md max-w-sm text-center shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-bold mb-2">
              {{ az: "Xoş Gəldiniz!", ru: "Добро пожаловать!", en: "Welcome!", es: "¡Bienvenido!", fr: "Bienvenue !", tr: "Hoş Geldiniz!", uz: "Xush kelibsiz!", kk: "Қош келдіңіз!" }[language]}
            </h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              {({ az: <>Bu sizin <b className="text-foreground">Demo Səhifənizdir</b>. Aşağıdakı <b className="text-foreground">mikrofon düyməsin</b>i sıxın və Arya ilə danışın.</>,
                 ru: <>Это ваша <b className="text-foreground">Демо Страница</b>. Нажмите <b className="text-foreground">кнопку микрофона</b> ниже и поговорите с Arya.</>,
                 en: <>This is your <b className="text-foreground">Demo Page</b>. Press the <b className="text-foreground">microphone button</b> below and talk to Arya.</>,
                 es: <>Esta es tu <b className="text-foreground">Página Demo</b>. Pulsa el <b className="text-foreground">botón del micrófono</b> abajo y habla con Arya.</>,
                 fr: <>Ceci est votre <b className="text-foreground">Page Démo</b>. Appuyez sur le <b className="text-foreground">bouton micro</b> ci-dessous et parlez à Arya.</>,
                 tr: <>Bu sizin <b className="text-foreground">Demo Sayfanızdır</b>. Aşağıdaki <b className="text-foreground">mikrofon düğmesine</b> basın ve Arya ile konuşun.</>,
                 uz: <>Bu sizning <b className="text-foreground">Demo Sahifangiz</b>. Quyidagi <b className="text-foreground">mikrofon tugmasini</b> bosing va Arya bilan gaplashing.</>,
                 kk: <>Бұл сіздің <b className="text-foreground">Демо бетіңіз</b>. Төмендегі <b className="text-foreground">микрофон түймесін</b> басыңыз және Arya-мен сөйлесіңіз.</>,
              } as Record<string, React.ReactNode>)[language]}
            </p>

            <div className="space-y-3 text-left text-sm bg-muted p-4 rounded-md mb-6">
              <div className="flex items-center gap-3">
                <Mic className="w-4 h-4 text-primary shrink-0" />
                <span>{{ az: '"Sən nə edə bilərsən?"', ru: '"Что ты умеешь?"', en: '"What can you do?"', es: '"¿Qué puedes hacer?"', fr: '"Que peux-tu faire ?"', tr: '"Ne yapabilirsin?"', uz: '"Sen nima qila olasan?"', kk: '"Сен не істей аласың?"' }[language]}</span>
              </div>
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4 text-primary shrink-0" />
                <span>{{ az: '"Müştəriləri necə qarşılayırsan?"', ru: '"Как ты встречаешь клиентов?"', en: '"How do you greet customers?"', es: '"¿Cómo recibes a los clientes?"', fr: '"Comment accueillez-vous les clients ?"', tr: '"Müşterileri nasıl karşılıyorsun?"', uz: '"Mijozlarni qanday kutib olasan?"', kk: '"Клиенттерді қалай қарсы аласың?"' }[language]}</span>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() => setShowTutorial(false)}
              data-testid="button-tutorial-close"
            >
              {{ az: "Aydındır, Başlayaq", ru: "Понятно, начнём", en: "Got it, let's start", es: "Entendido, empecemos", fr: "Compris, commençons", tr: "Anladım, başlayalım", uz: "Tushundim, boshlaymiz", kk: "Түсіндім, бастайық" }[language]}
            </Button>
          </div>

          <div className="mt-6 animate-bounce text-white/70 hidden md:flex items-center gap-2 text-sm font-medium">
            <ChevronDown className="w-5 h-5" />
            {{ az: "Mikrofon aşağıdadır", ru: "Микрофон внизу", en: "Microphone is below", es: "El micrófono está abajo", fr: "Le micro est en bas", tr: "Mikrofon aşağıda", uz: "Mikrofon pastda", kk: "Микрофон төменде" }[language]}
          </div>
        </div>
      )}

      <div className="bg-[#0F172A] text-white px-3 pt-2 pb-3 rounded-b-[1rem] sm:rounded-b-[1.5rem] relative z-10">
        <div className="flex items-center justify-between mb-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={onBack}
            className="text-white/70"
            data-testid="button-smart-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          {isOwner && profile?.is_pro ? (
            <Badge className="bg-amber-500/20 text-amber-300 border-transparent text-xs font-bold px-2.5 py-1" data-testid="badge-pro-active">
              PRO
            </Badge>
          ) : isOwner && !profile?.is_pro ? (
            <Button
              onClick={handleBuy}
              disabled={isUpgrading}
              size="sm"
              className="bg-emerald-600 border-emerald-500 text-white text-[11px] sm:text-xs font-bold gap-1"
              data-testid="button-buy-pro"
            >
              {isUpgrading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-3 h-3" />
                  <span className="hidden sm:inline">{{ az: "3 Gün Pulsuz", ru: "3 Дня Бесплатно", en: "3 Days Free", es: "3 Días Gratis", fr: "3 Jours Gratuits", tr: "3 Gün Ücretsiz", uz: "3 kun bepul", kk: "3 күн тегін" }[language]}</span>
                  <span className="sm:hidden">{{ az: "Pulsuz", ru: "Бесплатно", en: "Free", es: "Gratis", fr: "Gratuit", tr: "Ücretsiz", uz: "Bepul", kk: "Тегін" }[language]}</span>
                  <Badge className="bg-white/20 text-white border-transparent text-[10px] px-1.5 py-0">PRO</Badge>
                </>
              )}
            </Button>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <Avatar className="w-12 h-12 border-2 border-blue-500 shrink-0">
            <AvatarImage
              src={profile?.profile_image_url || PROFILE_AVATARS[slug] || profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${slug}`}
              alt={profile?.display_name}
              className="object-cover object-top"
            />
            <AvatarFallback className="bg-blue-900 text-white text-sm font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-1.5">
                <Input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setEditingName(false); }}
                  className="text-sm font-bold bg-white/10 border-white/20 text-white h-7 w-36"
                  autoFocus
                  data-testid="input-edit-name"
                />
                <Button size="icon" variant="ghost" onClick={handleSaveName} className="text-green-400 hover:text-green-300 w-7 h-7" data-testid="button-save-name">
                  <Check className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setEditingName(false)} className="text-red-400 hover:text-red-300 w-7 h-7" data-testid="button-cancel-name">
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-bold tracking-tight truncate" data-testid="text-profile-name">
                  {profile?.display_name}
                </h1>
                {isOwner && (
                  <button
                    onClick={() => { setNameInput(profile?.display_name || ""); setEditingName(true); }}
                    className="text-blue-300/60 hover:text-blue-200 transition-colors shrink-0"
                    data-testid="button-edit-name"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
            <p className="text-blue-200 text-xs truncate" data-testid="text-profile-profession">
              {displayProfession}
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {locationText && (
                <span className="text-slate-400 text-[11px] flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5" />
                  {locationText}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {isOwnerChat && (
        <div className="mx-4 mt-1 flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-md px-3 py-1.5 text-amber-300 text-xs z-10" data-testid="banner-owner-mode">
          <Shield className="w-3.5 h-3.5 shrink-0" />
          <span className="font-medium">Owner Mode</span>
          <span className="text-amber-300/60">— You have full access. Updates you make here go to your knowledge base.</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-3 -mt-2 space-y-3 pb-36 z-0" data-testid="smart-messages">
        {slug === "arazio" && (
          <a
            href="https://www.producthunt.com/products/arya-2"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#ff6154]/10 border border-[#ff6154]/20 text-sm text-[#ff6154] hover:bg-[#ff6154]/20 transition-colors mx-auto w-fit"
            data-testid="link-ph-banner-chat"
          >
            <svg width="16" height="16" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="20" fill="#FF6154"/><path d="M22.6 13H16v14h4v-4h2.6c3.53 0 6.4-2.24 6.4-5s-2.87-5-6.4-5zm0 6H20v-2h2.6c.88 0 1.4.45 1.4 1s-.52 1-1.4 1z" fill="#fff"/></svg>
            We're on Product Hunt — upvote us!
          </a>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "user" && editingIndex === i ? (
              <div className="flex flex-col gap-1.5 max-w-[85%] w-full" data-testid={`smart-message-edit-${i}`}>
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full p-2.5 text-sm rounded-md bg-primary/10 border border-primary/30 text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  rows={2}
                  autoFocus
                  data-testid="input-edit-message"
                />
                <div className="flex gap-1.5 justify-end">
                  <Button size="icon" variant="ghost" onClick={cancelEditMessage} data-testid="button-cancel-edit">
                    <X className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" onClick={confirmEditMessage} disabled={!editText.trim()} data-testid="button-confirm-edit">
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="group flex items-end gap-1">
                {m.role === "user" && !isLoading && (
                  <button
                    onClick={() => startEditMessage(i)}
                    className="invisible group-hover:visible text-muted-foreground/50 hover:text-muted-foreground p-1 transition-colors"
                    data-testid={`button-edit-message-${i}`}
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
                <div
                  className={`p-3 max-w-[85%] text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-md rounded-br-none"
                      : "bg-card text-card-foreground border rounded-md rounded-bl-none"
                  }`}
                  data-testid={`smart-message-${m.role}-${i}`}
                >
                  {m.text}
                  {m.audioUrl && (
                    <button
                      onClick={() => {
                        if (currentAudioRef.current) {
                          currentAudioRef.current.pause();
                          currentAudioRef.current = null;
                        }
                        const audio = new Audio(m.audioUrl);
                        currentAudioRef.current = audio;
                        audio.play().catch(() => {});
                      }}
                      className="inline-flex items-center gap-1 mt-1.5 text-xs text-primary/70 hover:text-primary transition-colors"
                      data-testid={`button-play-audio-${i}`}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {pendingVoiceText !== null && (
          <div className="flex justify-end">
            <div className="flex flex-col gap-1.5 max-w-[85%] w-full" data-testid="pending-voice-edit">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                <Mic className="w-3 h-3" />
                Səs tanındı — düzəliş edin və ya göndərin:
              </div>
              <textarea
                value={pendingVoiceText}
                onChange={(e) => setPendingVoiceText(e.target.value)}
                className="w-full p-2.5 text-sm rounded-md bg-primary/10 border border-primary/30 text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                rows={2}
                autoFocus
                data-testid="input-pending-voice"
              />
              <div className="flex gap-1.5 justify-end">
                <Button size="icon" variant="ghost" onClick={cancelPendingVoice} data-testid="button-cancel-voice">
                  <X className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" onClick={confirmPendingVoice} disabled={!pendingVoiceText?.trim()} data-testid="button-confirm-voice">
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-card border rounded-md rounded-bl-none p-3 max-w-[85%]">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-3 pb-4 sm:pb-6 z-20 safe-bottom">
        <div className="max-w-md mx-auto">
          <div className="flex gap-2 items-center">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={inputPlaceholder}
              disabled={isLoading}
              className="flex-1"
              data-testid="input-smart-message"
            />
            {input.length > 0 && (
              <Button
                size="icon"
                onClick={handleSendText}
                disabled={isLoading}
                data-testid="button-smart-send"
              >
                <Send className="w-4 h-4" />
              </Button>
            )}
          </div>
          {input.length === 0 && (
            <div className="flex flex-col items-center mt-3 gap-2">
              {(isRecording || isTranscribing) && (
                <div className={`flex items-center gap-2 animate-pulse ${isTranscribing ? "text-primary" : "text-destructive"}`} data-testid="recording-indicator">
                  <div className={`w-2 h-2 rounded-full ${isTranscribing ? "bg-primary" : "bg-destructive"}`} />
                  <div className="flex items-end gap-[3px] h-5">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`w-[3px] rounded-full ${isTranscribing ? "bg-primary" : "bg-destructive"}`}
                        style={{
                          animation: `soundWave 0.8s ease-in-out ${i * 0.12}s infinite alternate`,
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-medium">
                    {isTranscribing
                      ? ({ az: "Emal olunur...", ru: "Обработка...", en: "Processing...", es: "Procesando...", fr: "Traitement...", tr: "İşleniyor...", uz: "Qayta ishlanmoqda...", kk: "Өңделуде..." }[language] || "Processing...")
                      : ({ az: "Dinləyirəm...", ru: "Слушаю...", en: "Listening...", es: "Escuchando...", fr: "J'écoute...", tr: "Dinliyorum...", uz: "Tinglayman...", kk: "Тыңдап тұрмын..." }[language] || "Listening...")}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={toggleRecording}
                disabled={isLoading || isTranscribing}
                data-testid="button-smart-voice"
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                  isRecording
                    ? "bg-destructive text-destructive-foreground scale-110 ring-4 ring-destructive/30"
                    : isTranscribing
                      ? "bg-primary/50 text-primary-foreground cursor-wait"
                      : "bg-primary text-primary-foreground hover:opacity-90"
                } ${(isLoading || isTranscribing) ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                {isRecording ? (
                  <Square className="w-6 h-6" />
                ) : isTranscribing ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Mic className="w-6 h-6" />
                )}
              </button>
            </div>
          )}
        </div>
        <p className="text-center mt-2 text-[10px] text-muted-foreground">
          Powered by <span className="font-bold text-primary">Arya AI</span>
        </p>
      </div>
    </div>
  );
}
