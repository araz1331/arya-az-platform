import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Globe, Mail, Lock, User, ArrowLeft, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { getSupaClient } from "@/lib/supabase";
import {
  type GlobalLanguage, GLOBAL_LANGUAGES, gt,
  getStoredGlobalLanguage, setStoredGlobalLanguage
} from "@/lib/global-i18n";

type AuthMode = "login" | "register" | "forgot";

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

function AuthLanguageSelector({ lang, setLang }: { lang: GlobalLanguage; setLang: (l: GlobalLanguage) => void }) {
  const current = GLOBAL_LANGUAGES.find(l => l.code === lang);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-white/70 border-white/20 bg-white/10 gap-1.5"
          data-testid="button-auth-language-selector"
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
            data-testid={`button-auth-lang-${l.code}`}
          >
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function GlobalAuthPage({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [lang, setLangState] = useState<GlobalLanguage>(getStoredGlobalLanguage());
  const queryClient = useQueryClient();

  const setLang = useCallback((l: GlobalLanguage) => {
    setLangState(l);
    setStoredGlobalLanguage(l);
  }, []);

  const t = useCallback((key: any) => gt(lang, key), [lang]);

  const loginMutation = useMutation({
    mutationFn: async () => {
      const supaClient = await getSupaClient();
      const { data, error: sbError } = await supaClient.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (sbError) throw new Error(sbError.message);
      if (!data.session?.access_token) throw new Error("No session returned");

      const res = await apiRequest("POST", "/api/auth/supabase-login", {
        access_token: data.session.access_token,
      });
      return res.json();
    },
    onSuccess: (userData) => {
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== "/api/auth/user",
      });
      queryClient.setQueryData(["/api/auth/user"], userData);
    },
    onError: (err: any) => {
      const msg = extractErrorMessage(err);
      setError(msg || t("authLoginFailed"));
    },
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      const supaClient = await getSupaClient();
      const { data, error: sbError } = await supaClient.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            first_name: firstName || undefined,
            last_name: lastName || undefined,
          },
        },
      });
      if (sbError) throw new Error(sbError.message);
      if (!data.session?.access_token) throw new Error("Check your email to confirm your account");

      const res = await apiRequest("POST", "/api/auth/supabase-signup", {
        access_token: data.session.access_token,
      });
      return res.json();
    },
    onSuccess: (userData) => {
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== "/api/auth/user",
      });
      queryClient.setQueryData(["/api/auth/user"], userData);
    },
    onError: (err: any) => {
      const msg = extractErrorMessage(err);
      setError(msg || t("authRegisterFailed"));
    },
  });

  const forgotMutation = useMutation({
    mutationFn: async () => {
      const supaClient = await getSupaClient();
      const redirectUrl = `${window.location.origin}/reset-password`;
      const { error: sbError } = await supaClient.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });
      if (sbError) throw new Error(sbError.message);
    },
    onSuccess: () => {
      setSuccessMsg(t("authResetSent"));
    },
    onError: (err: any) => {
      const msg = extractErrorMessage(err);
      setError(msg || "Failed to send reset email");
    },
  });

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setFieldErrors({});
    const schema = z.object({
      email: z.string().email(t("authValidEmail")),
      password: z.string().min(1, t("authPasswordRequired")),
    });
    const result = schema.safeParse({ email, password });
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.errors.forEach((e) => {
        if (e.path[0]) errs[e.path[0] as string] = e.message;
      });
      setFieldErrors(errs);
      return;
    }
    loginMutation.mutate();
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setFieldErrors({});
    const schema = z.object({
      email: z.string().email(t("authValidEmail")),
      password: z.string().min(6, t("authPasswordMin")),
    });
    const result = schema.safeParse({ email, password });
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.errors.forEach((e) => {
        if (e.path[0]) errs[e.path[0] as string] = e.message;
      });
      setFieldErrors(errs);
      return;
    }
    registerMutation.mutate();
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setFieldErrors({});
    const schema = z.object({
      email: z.string().email(t("authValidEmail")),
    });
    const result = schema.safeParse({ email });
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.errors.forEach((e) => {
        if (e.path[0]) errs[e.path[0] as string] = e.message;
      });
      setFieldErrors(errs);
      return;
    }
    forgotMutation.mutate();
  };

  const isPending = loginMutation.isPending || registerMutation.isPending || forgotMutation.isPending;

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(240,40%,12%)] via-[hsl(260,35%,15%)] to-[hsl(220,40%,10%)]" />
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-[hsl(260,85%,50%)] blur-[120px]" />
        <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-[hsl(220,85%,50%)] blur-[150px]" />
      </div>

      <div className="absolute top-4 right-4 z-20">
        <AuthLanguageSelector lang={lang} setLang={setLang} />
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
          <p className="text-white/60 text-sm">
            {t("authSubtitle")}
          </p>
        </div>

        <Card className="p-6">
          {mode !== "forgot" && (
            <div className="flex gap-2 mb-6">
              <Button
                variant={mode === "login" ? "default" : "outline"}
                className="flex-1"
                onClick={() => { setMode("login"); setError(""); setSuccessMsg(""); setFieldErrors({}); }}
                data-testid="button-global-tab-login"
              >
                {t("authSignIn")}
              </Button>
              <Button
                variant={mode === "register" ? "default" : "outline"}
                className="flex-1"
                onClick={() => { setMode("register"); setError(""); setSuccessMsg(""); setFieldErrors({}); }}
                data-testid="button-global-tab-register"
              >
                {t("authSignUp")}
              </Button>
            </div>
          )}

          {mode === "forgot" ? (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div className="text-center mb-2">
                <h3 className="font-semibold text-lg">{t("authForgotTitle")}</h3>
                <p className="text-sm text-muted-foreground mt-1">{t("authForgotDesc")}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="forgot-email">{t("authEmail")}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder={t("authEmailPlaceholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    data-testid="input-forgot-email"
                  />
                </div>
                {fieldErrors.email && (
                  <p className="text-sm text-destructive">{fieldErrors.email}</p>
                )}
              </div>

              {successMsg && (
                <div className="text-sm text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-400 p-3 rounded-md flex items-center gap-2" data-testid="text-reset-success">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {successMsg}
                </div>
              )}

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md" data-testid="text-global-auth-error">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isPending}
                data-testid="button-forgot-submit"
              >
                {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("authPleaseWait")}</> : t("authSendReset")}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setMode("login"); setError(""); setSuccessMsg(""); setFieldErrors({}); }}
                  className="text-sm text-muted-foreground underline underline-offset-2"
                  data-testid="button-back-to-login"
                >
                  {t("authBackToLogin")}
                </button>
              </div>
            </form>
          ) : mode === "login" ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">{t("authEmail")}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder={t("authEmailPlaceholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    data-testid="input-login-email"
                  />
                </div>
                {fieldErrors.email && (
                  <p className="text-sm text-destructive">{fieldErrors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">{t("authPassword")}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t("authPasswordPlaceholder")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    data-testid="input-login-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    tabIndex={-1}
                    data-testid="button-toggle-login-password"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-sm text-destructive">{fieldErrors.password}</p>
                )}
              </div>

              <div className="text-right">
                <button
                  type="button"
                  onClick={() => { setMode("forgot"); setError(""); setSuccessMsg(""); setFieldErrors({}); }}
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                  data-testid="button-forgot-password"
                >
                  {t("authForgotPassword")}
                </button>
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md" data-testid="text-global-auth-error">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isPending}
                data-testid="button-global-auth-submit"
              >
                {isPending ? t("authPleaseWait") : t("authSignIn")}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="register-firstname">{t("authFirstName")}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="register-firstname"
                      placeholder={t("authFirstNamePlaceholder")}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="pl-10"
                      data-testid="input-register-firstname"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-lastname">{t("authLastName")}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="register-lastname"
                      placeholder={t("authLastNamePlaceholder")}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="pl-10"
                      data-testid="input-register-lastname"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-email">{t("authEmail")}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="register-email"
                    type="email"
                    placeholder={t("authEmailPlaceholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    data-testid="input-register-email"
                  />
                </div>
                {fieldErrors.email && (
                  <p className="text-sm text-destructive">{fieldErrors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-password">{t("authPassword")}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="register-password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t("authPasswordMinPlaceholder")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    data-testid="input-register-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    tabIndex={-1}
                    data-testid="button-toggle-register-password"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-sm text-destructive">{fieldErrors.password}</p>
                )}
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md" data-testid="text-global-auth-error">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isPending}
                data-testid="button-global-auth-submit"
              >
                {isPending ? t("authPleaseWait") : t("authCreateAccount")}
              </Button>
            </form>
          )}

          {mode !== "forgot" && (
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                {mode === "login" ? t("authNoAccount") + " " : t("authHaveAccount") + " "}
                <button
                  type="button"
                  onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setSuccessMsg(""); setFieldErrors({}); }}
                  className="text-foreground font-medium underline underline-offset-2"
                  data-testid="button-global-switch-mode"
                >
                  {mode === "login" ? t("authSignUp") : t("authSignIn")}
                </button>
              </p>
            </div>
          )}
        </Card>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onBack}
            className="text-white/50 text-sm flex items-center justify-center gap-1 mx-auto"
            data-testid="button-global-back-to-home"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t("authBackToHome")}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
