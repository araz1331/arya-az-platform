import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/hooks/use-language";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Coins, TrendingUp, Mic, Clock, Volume2, VolumeX } from "lucide-react";
import { motion } from "framer-motion";
import type { Profile, Transaction } from "@shared/schema";

interface TokenDashboardProps {
  user: Profile | null;
  transactions: Transaction[];
}

export default function TokenDashboard({ user, transactions }: TokenDashboardProps) {
  const { t } = useLanguage();
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

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

  if (!user) return null;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{t("balance")}</p>
              <div className="flex items-center gap-2">
                <Coins className="w-8 h-8 text-primary" />
                <span className="text-4xl font-bold" data-testid="text-token-balance">
                  {user.tokens.toLocaleString()}
                </span>
                <span className="text-lg text-muted-foreground">A-Coin</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold" data-testid="text-recordings-count">
                  {user.recordingsCount}
                </div>
                <p className="text-xs text-muted-foreground">{t("voiceRecording")}</p>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="overflow-visible p-4 relative">
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleMute}
            className="absolute top-2 right-2 z-10"
            data-testid="button-toggle-audio"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
          <div className="flex justify-center">
            <video
              ref={videoRef}
              autoPlay
              loop
              muted
              playsInline
              className="w-1/2 rounded-md"
              data-testid="video-wallet"
            >
              <source src="/wallet.mp4" type="video/mp4" />
            </video>
          </div>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 text-primary">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("goal1")}</p>
              <p className="font-semibold">
                {Math.min(user.recordingsCount, 5)}/5
                {user.milestone1Claimed && (
                  <Badge variant="secondary" className="ml-2 text-xs">{t("completed")}</Badge>
                )}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 text-primary">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("goal2")}</p>
              <p className="font-semibold">
                {Math.min(user.recordingsCount, 20)}/20
                {user.milestone2Claimed && (
                  <Badge variant="secondary" className="ml-2 text-xs">{t("completed")}</Badge>
                )}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 text-primary">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("status")}</p>
              <p className="font-semibold">
                {user.recordingsCount >= 20 ? t("fullVolunteer") :
                 user.recordingsCount >= 5 ? t("activeVolunteer") :
                 t("beginner")}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {transactions.length > 0 && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4">{t("recentTransactions")}</h3>
          <div className="space-y-3">
            {transactions.slice(0, 10).map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between py-2 border-b last:border-b-0"
                data-testid={`transaction-row-${tx.id}`}
              >
                <div>
                  <p className="text-sm font-medium">{tx.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('az-AZ') : ''}
                  </p>
                </div>
                <span className={`font-semibold tabular-nums ${tx.amount > 0 ? 'text-[hsl(140,60%,40%)]' : 'text-destructive'}`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
