import { useEffect, useState, useCallback } from "react";
import { useLanguage } from "@/hooks/use-language";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Coins, PartyPopper, ArrowRight } from "lucide-react";

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
  delay: number;
}

const COLORS = [
  "hsl(220, 85%, 50%)",
  "hsl(200, 90%, 55%)",
  "hsl(45, 90%, 55%)",
  "hsl(340, 80%, 55%)",
  "hsl(140, 70%, 50%)",
  "hsl(280, 70%, 55%)",
];

function Confetti({ show }: { show: boolean }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!show) return;
    const newParticles: Particle[] = [];
    for (let i = 0; i < 60; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: -10 - Math.random() * 30,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 6 + Math.random() * 8,
        rotation: Math.random() * 360,
        delay: Math.random() * 0.6,
      });
    }
    setParticles(newParticles);
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute"
          initial={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            rotate: 0,
            opacity: 1,
          }}
          animate={{
            top: "110%",
            rotate: p.rotation + 720,
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: 2.5 + Math.random(),
            delay: p.delay,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          style={{
            width: p.size,
            height: p.size * 0.6,
            backgroundColor: p.color,
            borderRadius: "2px",
          }}
        />
      ))}
    </div>
  );
}

interface MilestoneCelebrationProps {
  milestone: number;
  tokens: number;
  onContinue: () => void;
}

export default function MilestoneCelebration({ milestone, tokens, onContinue }: MilestoneCelebrationProps) {
  const { t } = useLanguage();
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Confetti show={showConfetti} />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8 px-4"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 text-primary mb-6"
        >
          <PartyPopper className="w-10 h-10" />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-bold mb-2"
        >
          {milestone === 1 ? t("milestone1Title") : milestone === 2 ? t("milestone2Title") : t("milestoneNewTitle")}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-muted-foreground mb-6 text-lg"
        >
          {milestone === 1
            ? t("milestone1Desc")
            : milestone === 2
            ? t("milestone2Desc")
            : t("milestoneNewDesc")
          }
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="inline-flex items-center gap-2 text-4xl font-bold text-primary mb-8"
        >
          <Coins className="w-8 h-8" />
          <span data-testid="text-milestone-tokens">+{tokens}</span>
          <span className="text-lg font-normal text-muted-foreground">A-Coin</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <Button
            size="lg"
            onClick={onContinue}
            className="text-lg px-8 py-6 gap-2"
            data-testid="button-continue-after-milestone"
          >
            {milestone === 1 ? (
              <>
                {t("continueToBonusGoal")}
                <ArrowRight className="w-5 h-5" />
              </>
            ) : milestone === 2 ? (
              <>
                {t("goToShop")}
                <ArrowRight className="w-5 h-5" />
              </>
            ) : (
              <>
                {t("continue")}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </Button>
        </motion.div>
      </motion.div>
    </>
  );
}
