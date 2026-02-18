import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { LanguageSelector } from "@/components/language-selector";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Waves, Mail, Lock, User, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";

type AuthMode = "login" | "register";

function extractErrorMessage(err: any): string {
  if (!err?.message) return "";
  try {
    const match = err.message.match(/^\d+:\s*(.+)/);
    if (match) {
      const parsed = JSON.parse(match[1]);
      return parsed.message || match[1];
    }
  } catch {}
  return err.message;
}

export default function AuthPage({ onBack }: { onBack: () => void }) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/login", { email, password });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (err: any) => {
      const msg = extractErrorMessage(err);
      setError(msg || t("loginFailed"));
    },
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/register", {
        email,
        password,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (err: any) => {
      const msg = extractErrorMessage(err);
      setError(msg || t("registerFailed"));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (mode === "login") {
      loginMutation.mutate();
    } else {
      registerMutation.mutate();
    }
  };

  const isPending = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(220,85%,20%)] via-[hsl(220,75%,15%)] to-[hsl(220,90%,10%)]" />
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-[hsl(220,85%,50%)] blur-[120px]" />
        <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-[hsl(200,85%,50%)] blur-[150px]" />
      </div>

      <div className="absolute top-3 right-3 z-20">
        <LanguageSelector variant="hero" />
      </div>

      <motion.div
        className="relative z-10 w-full max-w-md px-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 text-white mb-4">
            <Waves className="w-8 h-8" />
            <span className="text-2xl font-bold">Arya.az</span>
          </div>
          <p className="text-white/60 text-sm">
            {t("nationalVoiceAI")}
          </p>
        </div>

        <Card className="p-6">
          <div className="flex gap-2 mb-6">
            <Button
              variant={mode === "login" ? "default" : "outline"}
              className="flex-1"
              onClick={() => { setMode("login"); setError(""); }}
              data-testid="button-tab-login"
            >
              {t("login")}
            </Button>
            <Button
              variant={mode === "register" ? "default" : "outline"}
              className="flex-1"
              onClick={() => { setMode("register"); setError(""); }}
              data-testid="button-tab-register"
            >
              {t("register")}
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName">{t("firstName")}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="firstName"
                      placeholder={t("firstNamePlaceholder")}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="pl-10"
                      data-testid="input-first-name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">{t("lastName")}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="lastName"
                      placeholder={t("lastNamePlaceholder")}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="pl-10"
                      data-testid="input-last-name"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  data-testid="input-email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("password")}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={mode === "register" ? t("passwordPlaceholderRegister") : t("passwordPlaceholderLogin")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                  minLength={mode === "register" ? 6 : undefined}
                  data-testid="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  tabIndex={-1}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md" data-testid="text-auth-error">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isPending}
              data-testid="button-auth-submit"
            >
              {isPending
                ? t("pleaseWait")
                : mode === "login"
                  ? t("login")
                  : t("registerNow")
              }
            </Button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              {mode === "login"
                ? t("noAccount")
                : t("hasAccount")
              }
              <button
                type="button"
                onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
                className="text-primary underline underline-offset-2"
                data-testid="button-switch-mode"
              >
                {mode === "login" ? t("switchToRegister") : t("switchToLogin")}
              </button>
            </p>
          </div>
        </Card>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onBack}
            className="text-white/50 text-sm flex items-center justify-center gap-1 mx-auto"
            data-testid="button-back-to-landing"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t("backToHome")}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
