import { useRef, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import aryaUzVideo from "@assets/Arya_UZ_1771751992292.mp4";
import aryaKkVideo from "@assets/Arya_KZ_1771752451761.mp4";
import { LanguageSelector } from "@/components/language-selector";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, Shield, Coins, Users, ChevronDown, Waves, Volume2, VolumeX, Brain, LogIn, Wrench, GraduationCap, UtensilsCrossed, Eye, MessageSquare, Rocket, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
};

const stagger = {
  animate: { transition: { staggerChildren: 0.15 } }
};

export default function Landing({ onStart, onLogin, onDemoClick }: { onStart: () => void; onLogin?: () => void; onDemoClick?: (slug: string) => void }) {
  const { t, language } = useLanguage();
  const { data: stats } = useQuery<{ totalUsers: number; totalRecordings: number; totalHours: number }>({
    queryKey: ["/api/stats"],
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleStall = () => {
      video.load();
      video.play().catch(() => {});
    };

    const handleError = () => {
      setTimeout(() => {
        video.load();
        video.play().catch(() => {});
      }, 1000);
    };

    video.addEventListener("stalled", handleStall);
    video.addEventListener("error", handleError);
    return () => {
      video.removeEventListener("stalled", handleStall);
      video.removeEventListener("error", handleError);
    };
  }, []);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const scrollToRecorder = () => {
    onStart();
  };

  const { isAuthenticated } = useAuth();

  const demos = [
    {
      name: "Samir Usta",
      role: t("demoSamirRole"),
      slug: "samir-usta",
      icon: Wrench,
      color: "bg-blue-600",
      question: t("demoSamirQ"),
      answer: t("demoSamirA")
    },
    {
      name: "Aysel English",
      role: t("demoAyselRole"),
      slug: "aysel-teacher",
      icon: GraduationCap,
      color: "bg-purple-600",
      question: t("demoAyselQ"),
      answer: t("demoAyselA")
    },
    {
      name: "Kebab House",
      role: t("demoKebabRole"),
      slug: "kebab-house",
      icon: UtensilsCrossed,
      color: "bg-orange-600",
      question: t("demoKebabQ"),
      answer: t("demoKebabA")
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <section className="relative min-h-[100svh] sm:min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(220,85%,20%)] via-[hsl(220,75%,15%)] to-[hsl(220,90%,10%)]" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-[hsl(220,85%,50%)] blur-[120px]" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-[hsl(200,85%,50%)] blur-[150px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-[hsl(240,85%,50%)] blur-[100px]" />
        </div>

        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between gap-2 px-3 sm:px-5 py-3 bg-black/20 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-white">
            <Waves className="w-5 h-5" />
            <span className="font-bold text-sm tracking-wide">Arya.az</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelector variant="hero" />
            {!isAuthenticated && onLogin && (
              <Button
                onClick={onLogin}
                className="bg-white text-[hsl(220,85%,20%)] font-semibold gap-2"
                data-testid="button-login"
              >
                <LogIn className="w-4 h-4" />
                {t("login")}
              </Button>
            )}
            {isAuthenticated && (
              <Button
                onClick={onStart}
                className="bg-white text-[hsl(220,85%,20%)] font-semibold gap-2"
                data-testid="button-enter-app"
              >
                <ArrowRight className="w-4 h-4" />
                {t("goToDashboard")}
              </Button>
            )}
          </div>
        </div>

        <div className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}
        />

        <motion.div
          className="relative z-10 text-center px-4 max-w-4xl mx-auto"
          initial="initial"
          animate="animate"
          variants={stagger}
        >
          <motion.div variants={fadeInUp}>
            <Badge variant="secondary" className="mb-6 bg-white/10 text-white border-white/20 text-sm px-4 py-1.5">
              <Waves className="w-3.5 h-3.5 mr-1.5" />
              {t("nationalProject")}
            </Badge>
          </motion.div>

          <motion.div variants={fadeInUp} className="mb-8">
            <div className="relative max-w-[12rem] mx-auto">
              <div className="rounded-md overflow-hidden shadow-2xl">
                <video
                  ref={videoRef}
                  key={language}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full block"
                  data-testid="video-hero-intro"
                >
                  <source src={language === "uz" ? aryaUzVideo : language === "kk" ? aryaKkVideo : "/intro.mp4"} type="video/mp4" />
                </video>
              </div>
              <button
                type="button"
                onClick={toggleMute}
                className="absolute top-2 right-2 z-30 w-9 h-9 flex items-center justify-center rounded-md bg-black/60 text-white backdrop-blur-sm border border-white/20 cursor-pointer"
                data-testid="button-toggle-mute"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          </motion.div>

          <motion.h1
            variants={fadeInUp}
            className="text-3xl sm:text-5xl md:text-7xl font-bold text-white leading-tight tracking-tight mb-4 sm:mb-6"
          >
            {t("heroTitle1")}{" "}
            <span className="bg-gradient-to-r from-[hsl(200,90%,65%)] to-[hsl(220,90%,75%)] bg-clip-text text-transparent">
              {t("heroTitle2")}
            </span>
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            className="text-base sm:text-xl text-white/70 max-w-2xl mx-auto mb-6 sm:mb-10 leading-relaxed"
          >
            {t("heroSubtitle")}
          </motion.p>

          <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full px-2">
            <Button
              size="lg"
              onClick={scrollToRecorder}
              className="text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 bg-white text-[hsl(220,85%,20%)] border-white/80 font-semibold w-full sm:w-auto"
              data-testid="button-start-volunteering"
            >
              <Mic className="w-5 h-5 mr-2" />
              {t("volunteerAndEarn")}
            </Button>
            <div className="flex gap-3 w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="text-sm sm:text-lg px-4 sm:px-8 py-5 sm:py-6 border-white/30 text-white bg-white/5 backdrop-blur-sm flex-1 sm:flex-initial"
                onClick={() => {
                  document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                }}
                data-testid="button-learn-more"
              >
                {t("learnMore")}
                <ChevronDown className="w-4 h-4 ml-1 sm:ml-2" />
              </Button>
              {onDemoClick && (
                <Button
                  size="lg"
                  variant="outline"
                  className="text-sm sm:text-lg px-4 sm:px-8 py-5 sm:py-6 border-white/30 text-white bg-white/5 backdrop-blur-sm flex-1 sm:flex-initial"
                  onClick={() => onDemoClick("samir-usta")}
                  data-testid="button-see-demo"
                >
                  <Eye className="w-5 h-5 mr-1 sm:mr-2" />
                  {t("demo")}
                </Button>
              )}
            </div>
          </motion.div>

          <motion.div
            variants={fadeInUp}
            className="mt-8 sm:mt-16 pb-12 sm:pb-20 flex items-center justify-center gap-6 sm:gap-12 text-white/50"
          >
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-white" data-testid="text-stat-volunteers">{stats?.totalUsers ?? 0}</div>
              <div className="text-xs sm:text-sm">{t("volunteers")}</div>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-white" data-testid="text-stat-recordings">{stats?.totalRecordings ?? 0}</div>
              <div className="text-xs sm:text-sm">{t("recordings")}</div>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-white" data-testid="text-stat-hours">{stats?.totalHours ?? 0}</div>
              <div className="text-xs sm:text-sm">{t("hours")}</div>
            </div>
          </motion.div>
        </motion.div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 80V40C360 0 720 60 1080 30C1260 15 1380 40 1440 50V80H0Z" fill="hsl(var(--background))" />
          </svg>
        </div>
      </section>

      <section id="how-it-works" className="py-12 sm:py-20 px-4">
        <motion.div
          className="max-w-6xl mx-auto"
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div variants={fadeInUp} className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t("howItWorks")}</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t("howItWorksSubtitle")}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Mic,
                step: "01",
                title: t("step1Title"),
                description: t("step1Desc")
              },
              {
                icon: Coins,
                step: "02",
                title: t("step2Title"),
                description: t("step2Desc")
              },
              {
                icon: Brain,
                step: "03",
                title: t("step3Title"),
                description: t("step3Desc")
              }
            ].map((item, i) => (
              <motion.div key={i} variants={fadeInUp}>
                <Card className="p-6 h-full hover-elevate">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-md bg-primary/10 text-primary shrink-0">
                      <item.icon className="w-6 h-6" />
                    </div>
                    <span className="text-5xl font-bold text-muted-foreground/20">{item.step}</span>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="py-12 sm:py-20 px-4 bg-card">
        <motion.div
          className="max-w-6xl mx-auto"
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div variants={fadeInUp} className="text-center mb-8 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl font-bold mb-4">{t("whyYourVoice")}</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t("whyYourVoiceSubtitle")}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              {
                icon: Volume2,
                title: t("phoneticBalance"),
                description: t("phoneticBalanceDesc")
              },
              {
                icon: Shield,
                title: t("privacy"),
                description: t("privacyDesc")
              },
              {
                icon: Users,
                title: t("communityPower"),
                description: t("communityPowerDesc")
              },
              {
                icon: Coins,
                title: t("realValue"),
                description: t("realValueDesc")
              }
            ].map((item, i) => (
              <motion.div key={i} variants={fadeInUp}>
                <Card className="p-6 h-full hover-elevate">
                  <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 text-primary mb-4">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="py-12 sm:py-20 px-4">
        <motion.div
          className="max-w-6xl mx-auto"
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div variants={fadeInUp} className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-4xl font-bold mb-4">
              {t("whoIsAryaFor")}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t("whoIsAryaForSubtitle")}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {demos.map((demo, i) => (
              <motion.div key={i} variants={fadeInUp}>
                <Card
                  className="p-6 h-full flex flex-col items-center text-center relative cursor-pointer hover-elevate"
                  onClick={() => onDemoClick?.(demo.slug)}
                  data-testid={`card-demo-${demo.slug}`}
                >
                  <div className={`absolute top-0 left-0 right-0 h-1.5 rounded-t-md ${demo.color}`} />

                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <demo.icon className="w-7 h-7 text-foreground" />
                  </div>

                  <h3 className="text-xl font-bold" data-testid={`text-demo-name-${demo.slug}`}>{demo.name}</h3>
                  <p className="text-sm text-primary font-medium mb-4">{demo.role}</p>

                  <div className="bg-muted rounded-md p-3 w-full text-xs text-left space-y-2 mb-6">
                    <div className="flex gap-2 items-start">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                      <p className="text-muted-foreground">"{demo.question}"</p>
                    </div>
                    <div className="flex gap-2 items-start justify-end">
                      <p className="text-primary bg-primary/10 p-1.5 rounded-md">"{demo.answer}"</p>
                      <span className="w-2 h-2 rounded-full bg-primary mt-1 shrink-0" />
                    </div>
                  </div>

                  <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-foreground">
                    {t("tryLive")}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div variants={fadeInUp} className="mt-12 text-center">
            <Button
              size="lg"
              onClick={() => onDemoClick?.("new-user")}
              className="text-lg px-8 py-6"
              data-testid="button-create-smart-page"
            >
              <Rocket className="w-5 h-5 mr-2" />
              {t("createSmartPage")}
            </Button>
            <p className="mt-4 text-sm text-muted-foreground">
              {t("freeTrialNote")}
            </p>
          </motion.div>
        </motion.div>
      </section>

      <section className="py-12 sm:py-20 px-4 bg-card">
        <motion.div
          className="max-w-3xl mx-auto text-center"
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={stagger}
        >
          <motion.h2 variants={fadeInUp} className="text-2xl sm:text-4xl font-bold mb-6">
            {t("beTheVoice")}
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto">
            {t("beTheVoiceSubtitle")}
          </motion.p>
          <motion.div variants={fadeInUp}>
            <Button
              size="lg"
              onClick={scrollToRecorder}
              className="text-lg px-10 py-6"
              data-testid="button-start-recording-bottom"
            >
              <Mic className="w-5 h-5 mr-2" />
              {t("startNow")}
            </Button>
          </motion.div>
        </motion.div>
      </section>

      <footer className="border-t py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Waves className="w-5 h-5 text-primary" />
            <span className="font-semibold">Arya.az</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("footerProject")} &copy; 2026
          </p>
        </div>
      </footer>
    </div>
  );
}
