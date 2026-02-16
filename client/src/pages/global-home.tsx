import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, Wrench, GraduationCap, UtensilsCrossed, Camera, Paintbrush, Link2,
  ChevronDown, ArrowRight, Check, Waves, MessageSquare, Zap, Star, Quote,
  Settings, Languages, UserPlus, Code, Mic, BarChart3
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  type GlobalLanguage, GLOBAL_LANGUAGES, gt,
  getStoredGlobalLanguage, setStoredGlobalLanguage
} from "@/lib/global-i18n";

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

  const setLang = useCallback((l: GlobalLanguage) => {
    setLangState(l);
    setStoredGlobalLanguage(l);
  }, []);

  const t = useCallback((key: Parameters<typeof gt>[1]) => gt(lang, key), [lang]);

  const handleGetStarted = () => {
    window.location.href = "/dashboard";
  };

  const handleDemoClick = (slug: string) => {
    window.location.href = `/u/${slug}`;
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
    },
    {
      name: t("pricingPro"),
      price: t("pricingProPrice"),
      priceYearly: t("pricingProPriceYearly"),
      desc: t("pricingProDesc"),
      features: [t("pricingProFeat1"), t("pricingProFeat2"), t("pricingProFeat3"), t("pricingProFeat4")],
      cta: t("pricingProCta"),
      popular: true,
    },
    {
      name: t("pricingAgency"),
      price: t("pricingAgencyPrice"),
      priceYearly: t("pricingAgencyPriceYearly"),
      desc: t("pricingAgencyDesc"),
      features: [t("pricingAgencyFeat1"), t("pricingAgencyFeat2"), t("pricingAgencyFeat3"), t("pricingAgencyFeat4")],
      cta: t("pricingAgencyCta"),
      popular: false,
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
            </div>
          </div>
          <div className="flex items-center gap-2">
            <GlobalLanguageSelector lang={lang} setLang={setLang} />
            <Button
              onClick={handleGetStarted}
              className="bg-white text-[hsl(240,30%,10%)] font-semibold text-sm"
              data-testid="button-nav-get-started"
            >
              {t("navGetStarted")}
            </Button>
          </div>
        </div>
      </nav>

      <section className="relative min-h-[100svh] flex items-center justify-center overflow-hidden pt-16">
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
              className="text-base sm:text-lg px-6 sm:px-10 py-5 sm:py-6 bg-white text-[hsl(240,30%,10%)] border-white/80 font-semibold w-full sm:w-auto"
              data-testid="button-hero-get-started"
            >
              {t("heroCta")}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base sm:text-lg px-6 sm:px-10 py-5 sm:py-6 border-white/30 text-white bg-white/5 backdrop-blur-sm w-full sm:w-auto"
              onClick={() => scrollTo("use-cases")}
              data-testid="button-hero-demo"
            >
              {t("heroCtaDemo")}
            </Button>
          </motion.div>

          <motion.div variants={fadeInUp} className="mt-10 sm:mt-16 w-full max-w-3xl mx-auto">
            <div className="relative rounded-md overflow-hidden shadow-2xl shadow-black/40 border border-white/10">
              <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-auto"
                data-testid="video-hero-demo"
              >
                <source src="/videos/arya-demo.mp4" type="video/mp4" />
              </video>
              <div className="absolute inset-0 rounded-md ring-1 ring-inset ring-white/10 pointer-events-none" />
            </div>
          </motion.div>

          <motion.div variants={fadeInUp} className="mt-10 sm:mt-14 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-16">
            <div className="flex items-center justify-center gap-8 sm:gap-16 text-white/40">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-white" data-testid="text-global-stat-languages">30+</div>
                <div className="text-xs sm:text-sm">Languages</div>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-white" data-testid="text-global-stat-setup">30s</div>
                <div className="text-xs sm:text-sm">Setup</div>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-white" data-testid="text-global-stat-uptime">24/7</div>
                <div className="text-xs sm:text-sm">Uptime</div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 80V40C360 0 720 60 1080 30C1260 15 1380 40 1440 50V80H0Z" fill="hsl(var(--background))" />
          </svg>
        </div>
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
              { icon: Mic, title: t("featGrid5Title"), desc: t("featGrid5Desc") },
              { icon: BarChart3, title: t("featGrid6Title"), desc: t("featGrid6Desc") },
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

            <div className="inline-flex items-center gap-2 bg-muted rounded-md p-1">
              <button
                type="button"
                onClick={() => setYearly(false)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${!yearly ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                data-testid="button-pricing-monthly"
              >
                {t("pricingMonthly")}
              </button>
              <button
                type="button"
                onClick={() => setYearly(true)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${yearly ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                data-testid="button-pricing-yearly"
              >
                {t("pricingYearly")}
                <Badge variant="secondary" className="ml-2 text-xs">{t("pricingSave")}</Badge>
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
                    onClick={handleGetStarted}
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
              className="text-lg px-10 py-6"
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
              <a href="/" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-usa">{t("footerAryaUSA")}</a>
              <a href="/" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-europe">{t("footerAryaEurope")}</a>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t">
            <p className="text-xs text-muted-foreground">
              &copy; 2026 {t("footerCopyright")}
            </p>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>{t("footerPrivacy")}</span>
              <span>{t("footerTerms")}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
