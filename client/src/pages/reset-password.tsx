import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Globe, Lock, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { getSupaClient } from "@/lib/supabase";
import { apiRequest } from "@/lib/queryClient";
import {
  type GlobalLanguage, gt,
  getStoredGlobalLanguage
} from "@/lib/global-i18n";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);
  const lang = getStoredGlobalLanguage();
  const t = useCallback((key: any) => gt(lang, key), [lang]);

  useEffect(() => {
    let mounted = true;
    const timeout = setTimeout(() => {
      if (mounted && !ready) setExpired(true);
    }, 8000);

    (async () => {
      try {
        const supaClient = await getSupaClient();
        const { data: { subscription } } = supaClient.auth.onAuthStateChange((event) => {
          if (event === "PASSWORD_RECOVERY" && mounted) {
            setReady(true);
          }
        });

        const { data: { session } } = await supaClient.auth.getSession();
        if (session && mounted) {
          setReady(true);
        }

        return () => {
          subscription.unsubscribe();
        };
      } catch {}
    })();
    return () => { mounted = false; clearTimeout(timeout); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError(t("authPasswordMin"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("authPasswordMismatch"));
      return;
    }

    setIsPending(true);
    try {
      const supaClient = await getSupaClient();
      const { error: updateError } = await supaClient.auth.updateUser({ password });
      if (updateError) throw updateError;

      try {
        const { data: { session } } = await supaClient.auth.getSession();
        if (session?.access_token) {
          await apiRequest("POST", "/api/auth/supabase-login", {
            access_token: session.access_token,
          });
          await apiRequest("POST", "/api/auth/sync-password", { password });
        }
      } catch {}

      setSuccess(true);
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 2000);
    } catch (err: any) {
      setError(err?.message || "Failed to reset password");
    } finally {
      setIsPending(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(240,40%,12%)] via-[hsl(260,35%,15%)] to-[hsl(220,40%,10%)]" />
        <div className="relative z-10 text-center max-w-md px-4">
          {expired ? (
            <Card className="p-6">
              <Lock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold text-lg mb-2" data-testid="text-link-expired">{t("authForgotTitle")}</h3>
              <p className="text-sm text-muted-foreground mb-4">This reset link has expired or is invalid. Please request a new one.</p>
              <Button onClick={() => { window.location.href = "/dashboard"; }} className="w-full" data-testid="button-back-to-login-expired">
                {t("authBackToLogin")}
              </Button>
            </Card>
          ) : (
            <>
              <Loader2 className="w-8 h-8 text-white/50 animate-spin mx-auto mb-4" />
              <p className="text-white/60 text-sm">{t("authPleaseWait")}</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(240,40%,12%)] via-[hsl(260,35%,15%)] to-[hsl(220,40%,10%)]" />
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-[hsl(260,85%,50%)] blur-[120px]" />
        <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-[hsl(220,85%,50%)] blur-[150px]" />
      </div>

      <motion.div
        className="relative z-10 w-full max-w-md px-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 text-white mb-4">
            <Globe className="w-8 h-8" />
            <span className="text-2xl font-bold">Arya</span>
          </div>
        </div>

        <Card className="p-6">
          {success ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h3 className="font-semibold text-lg mb-1" data-testid="text-reset-complete">{t("authResetComplete")}</h3>
              <p className="text-sm text-muted-foreground" data-testid="text-reset-redirect">{t("authRedirecting")}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="text-center mb-2">
                <h3 className="font-semibold text-lg">{t("authNewPassword")}</h3>
                <p className="text-sm text-muted-foreground mt-1">{t("authNewPasswordDesc")}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">{t("authNewPassword")}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t("authPasswordMinPlaceholder")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    data-testid="input-new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">{t("authConfirmPassword")}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t("authConfirmPasswordPlaceholder")}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    data-testid="input-confirm-password"
                  />
                </div>
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md" data-testid="text-reset-error">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isPending}
                data-testid="button-reset-submit"
              >
                {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("authPleaseWait")}</> : t("authResetPassword")}
              </Button>
            </form>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
