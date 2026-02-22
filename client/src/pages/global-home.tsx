import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, Wrench, GraduationCap, UtensilsCrossed, Camera, Paintbrush, Link2,
  ChevronDown, ArrowRight, Check, Waves, MessageSquare, Zap, Star, Quote,
  Settings, Languages, UserPlus, Code, Mic, BarChart3, Volume2, VolumeX,
  Flame, ShieldCheck, Crown, AlertTriangle, Lock, PlugZap, Smartphone, X, Send
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  type GlobalLanguage, GLOBAL_LANGUAGES, gt,
  getStoredGlobalLanguage, setStoredGlobalLanguage
} from "@/lib/global-i18n";
import aryaAvatarImg from "@assets/Arya_avatar_1771538275062.png";

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
};

const stagger = {
  animate: { transition: { staggerChildren: 0.15 } }
};

function GlobalLanguageSelector({ lang, setLang }: { lang: GlobalLanguage; setLang: (l: GlobalLanguage) => void }) {
  const current = GLOBAL_LANGUAGES.find(l => l.code === lang);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-white border-white/30 bg-white/10 gap-1.5"
          data-testid="button-global-language-selector"
        >
          <Globe className="w-3.5 h-3.5" />
          <span className="text-xs uppercase">{current?.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {GLOBAL_LANGUAGES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => setLang(l.code)}
            className={lang === l.code ? "bg-accent" : ""}
            data-testid={`button-global-lang-${l.code}`}
          >
            <span className="font-medium">{l.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FloatingAryaChat({ lang: pageLang }: { lang: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const widgetLang = pageLang || "en";

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-50" data-testid="floating-arya-chat">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.25 }}
            className="mb-3 rounded-xl overflow-hidden shadow-2xl border border-border w-[calc(100vw-2rem)] sm:w-[380px] h-[70vh] sm:h-[520px] max-h-[600px]"
          >
            <div className="relative w-full h-full bg-background">
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/30 text-white flex items-center justify-center"
                data-testid="button-close-arya-chat"
              >
                <X className="w-4 h-4" />
              </button>
              <iframe
                src={`/embed/aryaai?lang=${widgetLang}&open=true`}
                className="w-full h-full border-0"
                title="Chat with Arya AI"
                allow="microphone"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        onClick={() => setIsOpen(prev => !prev)}
        className="relative w-16 h-16 rounded-full shadow-lg ml-auto group"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        data-testid="button-open-arya-chat"
      >
        {isOpen ? (
          <div className="w-full h-full rounded-full bg-foreground/80 flex items-center justify-center">
            <X className="w-6 h-6 text-background" />
          </div>
        ) : (
          <>
            <img
              src={aryaAvatarImg}
              alt="Arya AI"
              className="w-full h-full rounded-full object-cover border-2 border-white/80 dark:border-white/40"
            />
            <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-md border-2 border-background">
              <MessageSquare className="w-3 h-3" />
            </span>
          </>
        )}
      </motion.button>
    </div>
  );
}

const GREETINGS = ["Hello", "Hola", "Salam", "Bonjour", "Привет", "Merhaba", "Hallo", "Ciao"];

function LanguageAnimation() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setIdx(prev => (prev + 1) % GREETINGS.length), 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center justify-center gap-3">
      <AnimatePresence mode="wait">
        <motion.span
          key={idx}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className="text-4xl sm:text-6xl font-bold bg-gradient-to-r from-[hsl(260,85%,65%)] to-[hsl(220,90%,65%)] bg-clip-text text-transparent"
          data-testid="text-language-greeting"
        >
          {GREETINGS[idx]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

export default function GlobalHome() {
  const [lang, setLangState] = useState<GlobalLanguage>(getStoredGlobalLanguage);
  const [yearly, setYearly] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const hasStored = localStorage.getItem("arya_global_lang");
    if (hasStored) return;
    const geoMap: Record<string, GlobalLanguage> = { AZ: "az", UZ: "uz", KZ: "kk" };
    fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(3000) })
      .then(r => r.json())
      .then(data => {
        const mapped = geoMap[data?.country_code?.toUpperCase()];
        if (mapped) {
          setLangState(mapped);
          setStoredGlobalLanguage(mapped);
        }
      })
      .catch(() => {});
  }, []);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  }, []);

  useEffect(() => {
    setIsMuted(true);
  }, [lang]);

  const setLang = useCallback((l: GlobalLanguage) => {
    setLangState(l);
    setStoredGlobalLanguage(l);
  }, []);

  const t = useCallback((key: Parameters<typeof gt>[1]) => gt(lang, key), [lang]);

  const handleGetStarted = () => {
    window.location.href = "/dashboard";
  };

  const handlePlanCheckout = async (tier: "free" | "pro" | "agency") => {
    if (tier === "free") {
      window.location.href = "/dashboard";
      return;
    }
    try {
      const authCheck = await fetch("/api/auth/user", { credentials: "include" });
      if (!authCheck.ok) {
        window.location.href = `/dashboard?plan=${tier}`;
        return;
      }
      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan: tier, interval: yearly ? "year" : "month" }),
      });
      if (!res.ok) {
        window.location.href = `/dashboard?plan=${tier}`;
        return;
      }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      window.location.href = `/dashboard?plan=${tier}`;
    }
  };

  const handleFounderCheckout = async () => {
    try {
      const authCheck = await fetch("/api/auth/user", { credentials: "include" });
      if (!authCheck.ok) {
        window.location.href = "/dashboard?plan=founder";
        return;
      }
      const res = await fetch("/api/founding-member/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) {
        window.location.href = "/dashboard?plan=founder";
        return;
      }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      window.location.href = "/dashboard?plan=founder";
    }
  };

  const handleDemoClick = (slug: string) => {
    window.location.href = `/u/${slug}?lang=${lang}`;
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const useCases = [
    {
      icon: Wrench,
      name: t("card1Name"),
      role: t("card1Role"),
      bubble: t("card1Bubble"),
      color: "from-blue-500 to-blue-700",
      slug: "samir-usta",
    },
    {
      icon: GraduationCap,
      name: t("card2Name"),
      role: t("card2Role"),
      bubble: t("card2Bubble"),
      color: "from-purple-500 to-purple-700",
      slug: "aysel-teacher",
    },
    {
      icon: UtensilsCrossed,
      name: t("card3Name"),
      role: t("card3Role"),
      bubble: t("card3Bubble"),
      color: "from-orange-500 to-orange-700",
      slug: "kebab-house",
    },
  ];

  const steps = [
    { icon: Camera, title: t("howStep1Title"), desc: t("howStep1Desc") },
    { icon: Paintbrush, title: t("howStep2Title"), desc: t("howStep2Desc") },
    { icon: Link2, title: t("howStep3Title"), desc: t("howStep3Desc") },
  ];

  const plans = [
    {
      name: t("pricingFree"),
      price: t("pricingFreePrice"),
      priceYearly: t("pricingFreePrice"),
      desc: t("pricingFreeDesc"),
      features: [t("pricingFreeFeat1"), t("pricingFreeFeat2"), t("pricingFreeFeat3")],
      cta: t("pricingFreeCta"),
      popular: false,
      tier: "free" as const,
    },
    {
      name: t("pricingPro"),
      price: t("pricingProPrice"),
      priceYearly: t("pricingProPriceYearly"),
      desc: t("pricingProDesc"),
      features: [t("pricingProFeat1"), t("pricingProFeat2"), t("pricingProFeat3"), t("pricingProFeat4")],
      cta: t("pricingProCta"),
      popular: true,
      tier: "pro" as const,
    },
    {
      name: t("pricingAgency"),
      price: t("pricingAgencyPrice"),
      priceYearly: t("pricingAgencyPriceYearly"),
      desc: t("pricingAgencyDesc"),
      features: [t("pricingAgencyFeat1"), t("pricingAgencyFeat2"), t("pricingAgencyFeat3"), t("pricingAgencyFeat4")],
      cta: t("pricingAgencyCta"),
      popular: false,
      tier: "agency" as const,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[hsl(240,30%,10%)]/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 px-4 sm:px-6 py-3">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-white">
              <Waves className="w-5 h-5" />
              <span className="font-bold text-base tracking-wide" data-testid="text-global-logo">Arya</span>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => scrollTo("features")} className="text-white/70" data-testid="link-features">
                {t("navFeatures")}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => scrollTo("pricing")} className="text-white/70" data-testid="link-pricing">
                {t("navPricing")}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => scrollTo("use-cases")} className="text-white/70" data-testid="link-agencies">
                {t("navAgencies")}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { window.location.href = "/about"; }} className="text-white/70" data-testid="link-our-story">
                {t("navOurStory")}
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <GlobalLanguageSelector lang={lang} setLang={setLang} />
            <Button
              onClick={handleGetStarted}
              className="bg-white text-[hsl(240,30%,10%)] font-semibold text-xs sm:text-sm whitespace-nowrap"
              data-testid="button-nav-get-started"
            >
              <span className="hidden sm:inline">{t("navGetStarted")}</span>
              <span className="sm:hidden">{t("navGetStartedShort")}</span>
            </Button>
          </div>
        </div>
      </nav>

      <section className="relative min-h-[100svh] flex items-center justify-center overflow-hidden pt-16 pb-24 sm:pb-32">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(240,40%,12%)] via-[hsl(260,35%,15%)] to-[hsl(220,40%,10%)]" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-[hsl(260,85%,50%)] blur-[120px]" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-[hsl(220,85%,50%)] blur-[150px]" />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full bg-[hsl(200,85%,50%)] blur-[100px]" />
        </div>
        <div className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}
        />

        <motion.div
          className="relative z-10 text-center px-4 max-w-5xl mx-auto"
          initial="initial"
          animate="animate"
          variants={stagger}
        >
          <motion.div variants={fadeInUp}>
            <Badge variant="secondary" className="mb-6 bg-white/10 text-white border-white/20 text-sm px-4 py-1.5">
              <Zap className="w-3.5 h-3.5 mr-1.5" />
              Intercom for the Real World
            </Badge>
          </motion.div>

          <motion.h1
            variants={fadeInUp}
            className="text-4xl sm:text-6xl md:text-7xl font-bold text-white leading-tight tracking-tight mb-4 sm:mb-6"
            data-testid="text-hero-title"
          >
            {t("heroTitle")}{" "}
            <span className="bg-gradient-to-r from-[hsl(260,90%,70%)] to-[hsl(220,90%,75%)] bg-clip-text text-transparent">
              {t("heroTitleAccent")}
            </span>
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            className="text-base sm:text-xl text-white/60 max-w-2xl mx-auto mb-8 sm:mb-12 leading-relaxed"
            data-testid="text-hero-subtitle"
          >
            {t("heroSubtitle")}
          </motion.p>

          <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full px-2">
            <Button
              size="lg"
              onClick={handleGetStarted}
              className="bg-white text-[hsl(240,30%,10%)] border-white/80 font-semibold w-full sm:w-auto"
              data-testid="button-hero-get-started"
            >
              {t("heroCta")}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/30 text-white bg-white/5 backdrop-blur-sm w-full sm:w-auto"
              onClick={() => scrollTo("use-cases")}
              data-testid="button-hero-demo"
            >
              {t("heroCtaDemo")}
            </Button>
          </motion.div>

          <motion.div variants={fadeInUp} className="mt-10 sm:mt-16 w-full max-w-sm sm:max-w-md mx-auto">
            <div className="relative rounded-md overflow-hidden shadow-2xl shadow-black/40 border border-white/10">
              <video
                ref={videoRef}
                key={lang}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-auto"
                data-testid="video-hero-demo"
              >
                <source src={lang === "es" ? "/videos/arya-demo-es.mp4" : lang === "ru" ? "/videos/arya-demo-ru.mp4" : lang === "fr" ? "/videos/arya-demo-fr.mp4" : lang === "tr" ? "/videos/arya-demo-tr.mp4" : "/videos/arya-demo.mp4"} type="video/mp4" />
              </video>
              <button
                type="button"
                onClick={toggleMute}
                className="absolute top-2 right-2 z-30 w-9 h-9 flex items-center justify-center rounded-md bg-black/60 text-white backdrop-blur-sm border border-white/20 cursor-pointer"
                data-testid="button-toggle-mute"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <div className="absolute inset-0 rounded-md ring-1 ring-inset ring-white/10 pointer-events-none" />
            </div>
          </motion.div>

          <motion.div variants={fadeInUp} className="mt-10 sm:mt-14 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-16">
            <div className="flex items-center justify-center gap-8 sm:gap-16 text-white/40">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-white" data-testid="text-global-stat-languages">50+</div>
                <div className="text-xs sm:text-sm">{t("statsLanguages")}</div>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-white" data-testid="text-global-stat-setup">30s</div>
                <div className="text-xs sm:text-sm">{t("statsSetup")}</div>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-white" data-testid="text-global-stat-uptime">24/7</div>
                <div className="text-xs sm:text-sm">{t("statsUptime")}</div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        <div className="absolute -bottom-px left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full block">
            <path d="M0 120V60C360 10 720 90 1080 50C1260 30 1380 60 1440 70V120H0Z" fill="hsl(var(--background))" />
          </svg>
        </div>
      </section>

      <section className="pt-20 sm:pt-28 pb-16 sm:pb-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background pointer-events-none" />
        <motion.div
          className="max-w-4xl mx-auto relative z-10"
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div variants={fadeInUp} className="text-center mb-6">
            <Badge variant="secondary" className="mb-8 text-sm px-4 py-1.5 bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20">
              <Flame className="w-3.5 h-3.5 mr-1.5" />
              {t("founderBadge")}
            </Badge>
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold leading-tight tracking-tight mb-2" data-testid="text-founder-title">
              {t("founderTitle1")}
              <br />
              <span className="bg-gradient-to-r from-[hsl(260,90%,70%)] to-[hsl(220,90%,75%)] bg-clip-text text-transparent">
                {t("founderTitle2")}
              </span>
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mt-4 leading-relaxed" data-testid="text-founder-subtitle">
              {t("founderSubtitle")}
            </p>
          </motion.div>

          <motion.div variants={fadeInUp}>
            <Card className="max-w-lg mx-auto p-6 sm:p-8 border-primary/20 shadow-lg shadow-primary/5" data-testid="card-founder-offer">
              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Crown className="w-5 h-5 text-primary" />
                  <h3 className="text-xl font-bold" data-testid="text-founder-pass-title">{t("founderPassTitle")}</h3>
                </div>
                <div className="flex items-baseline justify-center gap-2 mt-3">
                  <span className="text-5xl sm:text-6xl font-bold" data-testid="text-founder-price">{t("founderPrice")}</span>
                  <span className="text-muted-foreground text-lg">/ {t("founderPriceLabel")}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1 line-through" data-testid="text-founder-normally">({t("founderNormally")})</p>
              </div>

              <ul className="space-y-3 mb-8">
                {[
                  { icon: ShieldCheck, text: t("founderFeat1") },
                  { icon: Zap, text: t("founderFeat2") },
                  { icon: Mic, text: t("founderFeat3") },
                  { icon: MessageSquare, text: t("founderFeat4") },
                  { icon: Crown, text: t("founderFeat5") },
                  { icon: ShieldCheck, text: t("founderFeat6") },
                ].map((feat, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm" data-testid={`text-founder-feat-${i}`}>
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                    <span>{feat.text}</span>
                  </li>
                ))}
              </ul>

              <Button
                size="lg"
                onClick={handleFounderCheckout}
                className="w-full"
                data-testid="button-founder-cta"
              >
                <Lock className="w-4 h-4 mr-1.5 shrink-0" />
                <span className="hidden md:inline">{t("founderCta")}</span>
                <span className="md:hidden">{t("founderCtaShort")}</span>
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-3" data-testid="text-founder-cta-sub">
                {t("founderCtaSub")}
              </p>
            </Card>
          </motion.div>

          <motion.div variants={fadeInUp} className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-md px-4 py-2.5" data-testid="text-founder-scarcity">
              <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
              <span className="text-sm font-medium">
                {t("founderStatus")}: <span className="font-bold text-orange-600 dark:text-orange-400">842 / 1,000</span> {t("founderSpotsLeft")}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{t("founderExpires")}</p>
          </motion.div>
        </motion.div>
      </section>

      <section id="use-cases" className="py-16 sm:py-24 px-4">
        <motion.div
          className="max-w-6xl mx-auto"
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div variants={fadeInUp} className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" data-testid="text-use-cases-title">{t("useCasesTitle")}</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{t("useCasesSubtitle")}</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {useCases.map((uc, i) => (
              <motion.div key={i} variants={fadeInUp}>
                <Card className="p-6 h-full flex flex-col hover-elevate" data-testid={`card-usecase-${i}`}>
                  <div className={`h-1.5 rounded-md bg-gradient-to-r ${uc.color} -mx-6 -mt-6 mb-6 rounded-b-none`} />
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <uc.icon className="w-5 h-5 text-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold" data-testid={`text-usecase-name-${i}`}>{uc.name}</h3>
                      <p className="text-xs text-muted-foreground">{uc.role}</p>
                    </div>
                  </div>

                  <div className="bg-muted rounded-md p-4 mb-6 flex-1">
                    <div className="flex gap-2 items-start">
                      <MessageSquare className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                      <p className="text-sm text-muted-foreground italic" data-testid={`text-usecase-bubble-${i}`}>"{uc.bubble}"</p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleDemoClick(uc.slug)}
                    data-testid={`button-usecase-demo-${i}`}
                  >
                    {t("liveDemo")}
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="py-16 sm:py-24 px-4 bg-card">
        <motion.div
          className="max-w-6xl mx-auto"
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div variants={fadeInUp} className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" data-testid="text-testimonials-title">{t("testimonialsTitle")}</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{t("testimonialsSubtitle")}</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: t("testimonial1Name"), role: t("testimonial1Role"), quote: t("testimonial1Quote") },
              { name: t("testimonial2Name"), role: t("testimonial2Role"), quote: t("testimonial2Quote") },
              { name: t("testimonial3Name"), role: t("testimonial3Role"), quote: t("testimonial3Quote") },
            ].map((item, i) => (
              <motion.div key={i} variants={fadeInUp}>
                <Card className="p-6 h-full flex flex-col" data-testid={`card-testimonial-${i}`}>
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, si) => (
                      <Star key={si} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <div className="flex-1 mb-4">
                    <Quote className="w-5 h-5 text-muted-foreground/30 mb-2" />
                    <p className="text-sm leading-relaxed" data-testid={`text-testimonial-quote-${i}`}>
                      {item.quote}
                    </p>
                  </div>
                  <div className="pt-4 border-t">
                    <p className="font-semibold text-sm" data-testid={`text-testimonial-name-${i}`}>{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.role}</p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <section id="features" className="py-16 sm:py-24 px-4">
        <motion.div
          className="max-w-6xl mx-auto"
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div variants={fadeInUp} className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" data-testid="text-feat-grid-title">{t("featGridTitle")}</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{t("featGridSubtitle")}</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Settings, title: t("featGrid1Title"), desc: t("featGrid1Desc") },
              { icon: Languages, title: t("featGrid2Title"), desc: t("featGrid2Desc") },
              { icon: UserPlus, title: t("featGrid3Title"), desc: t("featGrid3Desc") },
              { icon: Code, title: t("featGrid4Title"), desc: t("featGrid4Desc") },
              { icon: PlugZap, title: t("featGrid5Title"), desc: t("featGrid5Desc") },
              { icon: Smartphone, title: t("featGrid6Title"), desc: t("featGrid6Desc") },
              { icon: Send, title: t("featGrid7Title"), desc: t("featGrid7Desc") },
            ].map((feat, i) => (
              <motion.div key={i} variants={fadeInUp}>
                <Card className="p-6 h-full hover-elevate" data-testid={`card-feat-${i}`}>
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
                    <feat.icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold mb-2" data-testid={`text-feat-title-${i}`}>{feat.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="py-16 sm:py-24 px-4 bg-[hsl(220,40%,8%)] relative overflow-hidden">
        <div className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
            backgroundSize: '30px 30px'
          }}
        />
        <motion.div
          className="max-w-6xl mx-auto relative z-10"
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div variants={fadeInUp} className="text-center mb-10 sm:mb-14">
            <Badge variant="secondary" className="mb-6 text-sm px-4 py-1.5 bg-green-500/10 text-green-400 border-green-500/20">
              <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
              Fortress AI
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3" data-testid="text-security-title">{t("securityTitle")}</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">{t("securitySubtitle")}</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
            {[
              { icon: ShieldCheck, title: t("secCard1Title"), desc: t("secCard1Desc") },
              { icon: Globe, title: t("secCard2Title"), desc: t("secCard2Desc") },
              { icon: Lock, title: t("secCard3Title"), desc: t("secCard3Desc") },
              { icon: Zap, title: t("secCard4Title"), desc: t("secCard4Desc") },
            ].map((card, i) => (
              <motion.div key={i} variants={fadeInUp}>
                <div className="p-6 rounded-md bg-white/5 border border-white/10 backdrop-blur-lg hover:border-green-500/40 transition-all duration-300 h-full" data-testid={`card-security-${i}`}>
                  <div className="flex items-center justify-center w-10 h-10 rounded-md bg-green-500/10 text-green-400 mb-3">
                    <card.icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-white font-bold text-lg mb-1">{card.title}</h3>
                  <p className="text-slate-400 text-sm">{card.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div variants={fadeInUp} className="text-center mb-8">
            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2" data-testid="text-battle-title">{t("battleTitle")}</h3>
            <p className="text-slate-400">{t("battleSubtitle")}</p>
          </motion.div>

          <motion.div variants={fadeInUp} className="flex flex-col items-center">
            <div className="w-full max-w-2xl rounded-lg overflow-hidden shadow-2xl border border-slate-700" style={{ fontFamily: "'Courier New', Courier, monospace" }} data-testid="card-battle-logs">
              <div className="bg-slate-800 px-4 py-2.5 flex items-center justify-between">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="text-slate-400 text-xs">arya_fortress_logs.sh</div>
              </div>
              <div className="bg-black p-5 sm:p-6 space-y-4 text-sm">
                <div className="flex gap-2">
                  <span className="text-red-400 shrink-0">[ATTACK]</span>
                  <span className="text-slate-300">"{t("battleAttack1")}"</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-green-400 shrink-0">[ARYA]</span>
                  <span className="text-white">"{t("battleReply1")}"</span>
                </div>
                <div className="border-t border-slate-800 my-2" />
                <div className="flex gap-2">
                  <span className="text-red-400 shrink-0">[ATTACK]</span>
                  <span className="text-slate-300">"{t("battleAttack2")}"</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-blue-400 font-bold shrink-0">[SHIELD ACTIVE]</span>
                  <span className="text-yellow-400">{t("battleShield")}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-green-400 shrink-0">[ARYA]</span>
                  <span className="text-white">"{t("battleReply2")}"</span>
                </div>
                <div className="animate-pulse text-green-400 mt-4">_</div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      <section className="py-16 sm:py-24 px-4 bg-card">
        <motion.div
          className="max-w-4xl mx-auto text-center"
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div variants={fadeInUp}>
            <h2 className="text-3xl sm:text-5xl font-bold mb-4" data-testid="text-lang-title">{t("langTitle")}</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-12">{t("langSubtitle")}</p>
          </motion.div>

          <motion.div variants={fadeInUp} className="mb-12">
            <LanguageAnimation />
          </motion.div>

          <motion.div variants={fadeInUp} className="flex flex-wrap items-center justify-center gap-3">
            {[t("langHello"), t("langHola"), t("langSalam"), t("langBonjour"), t("langPriyet"), "Merhaba", "Hallo", "Ciao"].map((word, i) => (
              <Badge key={i} variant="secondary" className="text-sm px-3 py-1.5" data-testid={`badge-lang-${i}`}>
                {word}
              </Badge>
            ))}
          </motion.div>
        </motion.div>
      </section>

      <section className="py-16 sm:py-24 px-4">
        <motion.div
          className="max-w-6xl mx-auto"
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div variants={fadeInUp} className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" data-testid="text-how-title">{t("howTitle")}</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{t("howSubtitle")}</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <motion.div key={i} variants={fadeInUp}>
                <Card className="p-6 h-full text-center hover-elevate" data-testid={`card-step-${i}`}>
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mx-auto mb-4">
                    <step.icon className="w-7 h-7" />
                  </div>
                  <span className="text-6xl font-bold text-muted-foreground/15 block mb-2">0{i + 1}</span>
                  <h3 className="text-lg font-semibold mb-2" data-testid={`text-step-title-${i}`}>{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">{step.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <section id="pricing" className="py-16 sm:py-24 px-4 bg-card">
        <motion.div
          className="max-w-6xl mx-auto"
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div variants={fadeInUp} className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" data-testid="text-pricing-title">{t("pricingTitle")}</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">{t("pricingSubtitle")}</p>

            <div className="inline-flex items-center gap-1 bg-muted rounded-md p-1">
              <button
                type="button"
                onClick={() => setYearly(false)}
                className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${!yearly ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                data-testid="button-pricing-monthly"
              >
                {t("pricingMonthly")}
              </button>
              <button
                type="button"
                onClick={() => setYearly(true)}
                className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 ${yearly ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                data-testid="button-pricing-yearly"
              >
                {t("pricingYearly")}
                <Badge variant="secondary" className="text-[10px] sm:text-xs">{t("pricingSave")}</Badge>
              </button>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan, i) => (
              <motion.div key={i} variants={fadeInUp}>
                <Card className={`p-6 h-full flex flex-col relative ${plan.popular ? "border-primary shadow-lg ring-1 ring-primary/20" : ""}`} data-testid={`card-plan-${i}`}>
                  {plan.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2" data-testid="badge-popular">
                      {t("pricingPopular")}
                    </Badge>
                  )}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-1" data-testid={`text-plan-name-${i}`}>{plan.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{plan.desc}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold" data-testid={`text-plan-price-${i}`}>
                        {yearly ? plan.priceYearly : plan.price}
                      </span>
                      {plan.price !== "$0" && (
                        <span className="text-muted-foreground text-sm">{t("pricingPerMonth")}</span>
                      )}
                    </div>
                  </div>

                  <ul className="space-y-3 mb-6 flex-1">
                    {plan.features.map((feat, fi) => (
                      <li key={fi} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={plan.popular ? "default" : "outline"}
                    className="w-full"
                    onClick={() => handlePlanCheckout(plan.tier)}
                    data-testid={`button-plan-cta-${i}`}
                  >
                    {plan.cta}
                  </Button>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="py-16 sm:py-24 px-4">
        <motion.div
          className="max-w-3xl mx-auto text-center"
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={stagger}
        >
          <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-bold mb-6" data-testid="text-cta-title">
            {t("heroCta")}
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto">
            {t("heroSubtitle")}
          </motion.p>
          <motion.div variants={fadeInUp}>
            <Button
              size="lg"
              onClick={handleGetStarted}
              className=""
              data-testid="button-bottom-get-started"
            >
              {t("heroCta")}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        </motion.div>
      </section>

      <footer className="border-t py-10 px-4 bg-card">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Waves className="w-5 h-5 text-primary" />
                <span className="font-bold text-base">Arya</span>
              </div>
              <p className="text-sm text-muted-foreground max-w-xs">{t("footerTagline")}</p>
            </div>
            <div className="flex flex-wrap gap-6 text-sm">
              <a href="/about" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-about">{t("navOurStory")}</a>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t">
            <p className="text-xs text-muted-foreground">
              &copy; 2026 {t("footerCopyright")}
            </p>
            <p className="text-sm text-muted-foreground flex items-center gap-2" data-testid="text-footer-based">
              Arya AI. Based in <span className="inline-flex items-center gap-1"><span>🇺🇸</span> USA</span> & <span className="inline-flex items-center gap-1"><span>🇦🇿</span> Azerbaijan</span>.
            </p>
          </div>
        </div>
      </footer>

      <FloatingAryaChat lang={lang} />
    </div>
  );
}
