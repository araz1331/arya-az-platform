import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { CheckCircle2, ArrowRight, Crown, Sparkles, Building2 } from "lucide-react";
import {
  type GlobalLanguage,
  gt,
  getStoredGlobalLanguage,
} from "@/lib/global-i18n";

type PlanType = "founder" | "pro" | "agency";

function getPlanFromUrl(): PlanType {
  const params = new URLSearchParams(window.location.search);
  const plan = params.get("plan");
  if (plan === "pro") return "pro";
  if (plan === "agency") return "agency";
  return "founder";
}

function Sparkle({ delay, x, y }: { delay: number; x: number; y: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: [0, 1, 0],
        scale: [0, 1, 0],
        y: [0, -60 - Math.random() * 40],
        x: [0, (Math.random() - 0.5) * 80],
      }}
      transition={{ delay, duration: 1.5, ease: "easeOut" }}
      className="absolute w-2 h-2 rounded-full bg-amber-400"
      style={{ left: `${x}%`, top: `${y}%` }}
    />
  );
}

export default function CheckoutSuccess() {
  const [lang] = useState<GlobalLanguage>(getStoredGlobalLanguage);
  const t = (key: Parameters<typeof gt>[1]) => gt(lang, key);
  const plan = getPlanFromUrl();

  const planConfig: Record<PlanType, { icon: typeof Crown; label: string; msg: string; gradient: string }> = {
    founder: {
      icon: Crown,
      label: t("checkoutSuccessFounder"),
      msg: t("checkoutSuccessFounderMsg"),
      gradient: "from-amber-500 to-orange-600",
    },
    pro: {
      icon: Sparkles,
      label: t("checkoutSuccessPro"),
      msg: t("checkoutSuccessProMsg"),
      gradient: "from-blue-500 to-indigo-600",
    },
    agency: {
      icon: Building2,
      label: t("checkoutSuccessAgency"),
      msg: t("checkoutSuccessAgencyMsg"),
      gradient: "from-purple-500 to-violet-600",
    },
  };

  const config = planConfig[plan];
  const Icon = config.icon;

  const sparkles = Array.from({ length: 12 }, (_, i) => ({
    delay: 0.1 + i * 0.15,
    x: 10 + Math.random() * 80,
    y: 20 + Math.random() * 60,
  }));

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-[hsl(240,30%,8%)] via-[hsl(240,25%,12%)] to-[hsl(240,20%,10%)] flex items-center justify-center p-4"
      data-testid="checkout-success-page"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <Card className="bg-white/5 backdrop-blur-xl border-white/10 p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

          {sparkles.map((s, i) => (
            <Sparkle key={i} delay={s.delay} x={s.x} y={s.y} />
          ))}

          <div className="relative z-10">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className={`w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg`}
              data-testid="icon-checkout-plan"
            >
              <Icon className="w-10 h-10 text-white" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-2"
            >
              <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-3" />
              <p
                className="text-emerald-400 text-sm font-medium tracking-wide uppercase"
                data-testid="text-checkout-activated"
              >
                {t("checkoutSuccessActivated")}
              </p>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-3xl font-bold text-white mt-4 mb-2"
              data-testid="text-checkout-success-title"
            >
              {t("checkoutSuccessTitle")}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-white/60 text-sm mb-6"
              data-testid="text-checkout-subtitle"
            >
              {t("checkoutSuccessSubtitle")}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className={`inline-block px-4 py-1.5 rounded-full bg-gradient-to-r ${config.gradient} text-white text-sm font-semibold mb-4`}
              data-testid="text-checkout-plan-label"
            >
              {config.label}
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="text-white/70 text-sm leading-relaxed mb-8"
              data-testid="text-checkout-plan-msg"
            >
              {config.msg}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="flex flex-col gap-3"
            >
              <Button
                size="lg"
                onClick={() => { window.location.href = "/dashboard"; }}
                className="w-full bg-white text-[hsl(240,30%,10%)] font-semibold"
                data-testid="button-checkout-go-dashboard"
              >
                {t("checkoutSuccessGoToDashboard")}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                variant="ghost"
                onClick={() => { window.location.href = "/"; }}
                className="w-full text-white/60"
                data-testid="button-checkout-back-home"
              >
                {t("checkoutSuccessViewProfile")}
              </Button>
            </motion.div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
