import { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Waves, Globe, ArrowLeft } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  type GlobalLanguage, GLOBAL_LANGUAGES, gt,
  getStoredGlobalLanguage, setStoredGlobalLanguage
} from "@/lib/global-i18n";
import aryaDaughterImg from "@assets/Screenshot_2026-02-17_at_9.35.40_PM_1771349756194.png";

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
          data-testid="button-about-language-selector"
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
            data-testid={`about-lang-option-${l.code}`}
          >
            {l.flag} {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function AboutPage() {
  const [lang, setLangState] = useState<GlobalLanguage>(getStoredGlobalLanguage);

  const setLang = (l: GlobalLanguage) => {
    setLangState(l);
    setStoredGlobalLanguage(l);
  };

  const t = (key: string) => gt(key, lang);

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[hsl(240,30%,10%)]/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 px-4 sm:px-6 py-3">
          <div className="flex items-center gap-6">
            <a href="/" className="flex items-center gap-2 text-white" data-testid="link-about-logo">
              <Waves className="w-5 h-5" />
              <span className="font-bold text-base tracking-wide">Arya</span>
            </a>
            <div className="hidden md:flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => { window.location.href = "/"; }} className="text-white/70" data-testid="link-about-home">
                {t("navFeatures")}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { window.location.href = "/"; }} className="text-white/70" data-testid="link-about-pricing">
                {t("navPricing")}
              </Button>
              <Button variant="ghost" size="sm" className="text-white font-semibold" data-testid="link-about-story">
                {t("navOurStory")}
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <GlobalLanguageSelector lang={lang} setLang={setLang} />
            <Button
              onClick={() => { window.location.href = "/dashboard"; }}
              className="bg-white text-[hsl(240,30%,10%)] font-semibold text-xs sm:text-sm whitespace-nowrap"
              data-testid="button-about-get-started"
            >
              <span className="hidden sm:inline">{t("navGetStarted")}</span>
              <span className="sm:hidden">{t("navGetStartedShort")}</span>
            </Button>
          </div>
        </div>
      </nav>

      <section className="relative pt-28 sm:pt-36 pb-16 sm:pb-24 px-4">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(240,40%,12%)] via-[hsl(260,35%,15%)] to-[hsl(220,40%,10%)]" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-[hsl(260,85%,50%)] blur-[120px]" />
          <div className="absolute bottom-10 right-10 w-72 h-72 rounded-full bg-[hsl(220,85%,50%)] blur-[120px]" />
        </div>

        <motion.div
          className="relative max-w-3xl mx-auto"
          initial="initial"
          animate="animate"
          variants={stagger}
        >
          <motion.div variants={fadeInUp} className="mb-8">
            <a
              href="/"
              className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm"
              data-testid="link-back-home"
            >
              <ArrowLeft className="w-4 h-4" />
              {t("aboutBackHome")}
            </a>
          </motion.div>

          <motion.h1
            variants={fadeInUp}
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight mb-10"
            data-testid="text-about-headline"
          >
            {t("aboutHeadline")}
          </motion.h1>

          <motion.div variants={fadeInUp} className="mb-10">
            <img
              src={aryaDaughterImg}
              alt="Arya"
              className="w-full max-w-md mx-auto rounded-2xl shadow-2xl"
              data-testid="img-about-arya"
            />
          </motion.div>

          <motion.div variants={fadeInUp} className="space-y-6 text-white/80 text-base sm:text-lg leading-relaxed">
            <p>{t("aboutP1")}</p>
            <p>{t("aboutP2")}</p>
            <p>{t("aboutP3")}</p>
            <p>{t("aboutP4")}</p>
            <p className="font-semibold text-white italic">{t("aboutP5")}</p>
            <p>{t("aboutP6")}</p>
            <p>{t("aboutP7")}</p>
            <p className="text-xl sm:text-2xl font-bold text-white pt-4">{t("aboutSignoff")}</p>
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
              <a href="/" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-home">Home</a>
              <a href="/about" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-about">{t("navOurStory")}</a>
              <a href="/az" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-az">Arya Azərbaycan</a>
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
    </div>
  );
}
