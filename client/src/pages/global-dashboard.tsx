import { useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sparkles, Users, LogOut, ArrowLeft, ExternalLink, Globe, MessageCircle, Crown, Code, Copy, Check, Link2, TrendingUp, Clock, Eye, Pencil, Loader2, Shield, MessageSquare, Lightbulb, Zap, FileText, PlugZap, Phone, BarChart3, User, CreditCard, CheckCircle2, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import AryaWidget from "@/components/arya-widget";
import OwnerAssistant from "@/components/owner-assistant";
import type { Profile } from "@shared/schema";
import {
  type GlobalLanguage, GLOBAL_LANGUAGES, gt,
  getStoredGlobalLanguage, setStoredGlobalLanguage
} from "@/lib/global-i18n";

interface SmartProfileData {
  id: string;
  slug: string;
  businessName: string;
  profession: string;
  knowledgeBase: string | null;
  profileImageUrl: string | null;
  onboardingComplete: boolean;
  isActive: boolean;
  isPro: boolean;
  proExpiresAt: string | null;
}

interface LeadSession {
  session_id: string;
  message_count: string;
  first_message: string;
  last_message: string;
  user_messages: string;
  first_user_message: string;
  first_content_type: string;
}

function DashLanguageSelector({ lang, setLang }: { lang: GlobalLanguage; setLang: (l: GlobalLanguage) => void }) {
  const current = GLOBAL_LANGUAGES.find(l => l.code === lang);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5" data-testid="button-dash-language-selector">
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
            data-testid={`button-dash-lang-${l.code}`}
          >
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface AnalyticsData {
  totalMessages: number;
  totalConversations: number;
  userMessages: number;
  assistantMessages: number;
  daily: { date: string; messages: number; sessions: number }[];
}

interface LeadMessage {
  id: string;
  role: string;
  content: string;
  content_type: string;
  created_at: string;
}

function AnalyticsSummary({ profileId, t }: { profileId: string; t: (key: any) => string }) {
  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/smart-profile/analytics"],
    enabled: !!profileId,
  });

  if (isLoading || !data || data.totalMessages === 0) return null;

  const stats = [
    { label: t("dashAnalyticsMessages"), value: data.totalMessages, icon: MessageCircle },
    { label: t("dashAnalyticsConversations"), value: data.totalConversations, icon: Users },
    { label: t("dashAnalyticsAvgResponse"), value: data.totalConversations > 0 ? Math.round(data.assistantMessages / data.totalConversations) : 0, icon: Clock },
    { label: t("dashAnalyticsConversion"), value: `${data.totalMessages > 0 ? Math.round((data.userMessages / data.totalMessages) * 100) : 0}%`, icon: TrendingUp },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4" data-testid="container-analytics-summary">
      {stats.map((stat, i) => (
        <Card key={i} className="p-3" data-testid={`card-stat-${i}`}>
          <div className="flex items-center gap-1.5 mb-1">
            <stat.icon className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground truncate">{stat.label}</span>
          </div>
          <div className="text-lg font-bold" data-testid={`text-stat-value-${i}`}>{stat.value}</div>
        </Card>
      ))}
    </div>
  );
}

function LeadsPanel({ profileId, t }: { profileId: string; t: (key: any) => string }) {
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  const { data: leads = [], isLoading } = useQuery<LeadSession[]>({
    queryKey: ["/api/smart-profile/leads"],
    enabled: !!profileId,
  });

  const { data: messages = [] } = useQuery<LeadMessage[]>({
    queryKey: ["/api/smart-profile/leads", selectedSession],
    enabled: !!selectedSession,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-pulse text-muted-foreground text-sm">{t("dashLeadsLoading")}</div>
      </div>
    );
  }

  if (selectedSession) {
    return (
      <div className="space-y-3">
        <Button variant="ghost" size="sm" onClick={() => setSelectedSession(null)} data-testid="button-leads-back">
          <ArrowLeft className="w-4 h-4 mr-1" />
          {t("dashLeadsBack")}
        </Button>
        {messages.length === 0 ? (
          <Card className="p-8">
            <div className="text-center text-muted-foreground text-sm">{t("dashLeadsNoMessages")}</div>
          </Card>
        ) : (
          <div className="space-y-2">
            {messages.map((msg, i) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}
                data-testid={`msg-${i}`}
              >
                <Card className={`p-3 max-w-[80%] ${msg.role === "user" ? "bg-muted" : "bg-primary/10"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px]">
                      {msg.role === "user" ? "Visitor" : "AI"}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm">{msg.content}</p>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <Card className="p-8">
        <div className="flex flex-col items-center justify-center text-center text-muted-foreground">
          <Users className="w-12 h-12 mb-4 opacity-30" />
          <h3 className="text-lg font-medium mb-2" data-testid="text-leads-empty-title">{t("dashLeadsEmpty")}</h3>
          <p className="text-sm max-w-md" data-testid="text-leads-empty-desc">
            {t("dashLeadsEmptyDesc")}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-lg font-semibold" data-testid="text-leads-title">{t("dashLeadsTitle")}</h3>
        <Badge variant="secondary" data-testid="badge-leads-count">{leads.length} {t("dashLeadsConversations")}</Badge>
      </div>
      {leads.map((lead, i) => (
        <Card key={lead.session_id} className="p-4 hover-elevate cursor-pointer" onClick={() => setSelectedSession(lead.session_id)} data-testid={`card-lead-${i}`}>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <MessageCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium truncate" data-testid={`text-lead-session-${i}`}>
                  {lead.first_user_message || `${t("dashLeadsSession")} ${lead.session_id.slice(0, 8)}`}
                </span>
                <Badge variant="outline" className="text-xs" data-testid={`badge-lead-messages-${i}`}>
                  {lead.message_count} {t("dashLeadsMessages")}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap" data-testid={`text-lead-time-${i}`}>
                {new Date(lead.last_message).toLocaleDateString()}
              </span>
              <Eye className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function EmbedCodeSection({ slug, t }: { slug: string; t: (key: any) => string }) {
  const [copied, setCopied] = useState<string | null>(null);
  const [editingSlug, setEditingSlug] = useState(false);
  const [newSlug, setNewSlug] = useState(slug);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const embedCode = `<script src="${origin}/widget.js" data-slug="${slug}" data-color="#2563EB"></script>`;
  const profileUrl = `${origin}/u/${slug}`;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const saveSlug = async () => {
    const cleaned = newSlug.toLowerCase().replace(/[^a-z0-9._-]/g, "").replace(/--+/g, "-").replace(/^-|-$/g, "");
    if (!cleaned || cleaned.length < 2) {
      toast({ title: "Name must be at least 2 characters (letters, numbers, hyphens)", variant: "destructive" });
      return;
    }
    if (cleaned === slug) {
      setEditingSlug(false);
      return;
    }
    setSaving(true);
    try {
      await apiRequest("PATCH", "/api/smart-profile", { slug: cleaned });
      queryClient.invalidateQueries({ queryKey: ["/api/smart-profile"] });
      toast({ title: "Profile link updated successfully" });
      setEditingSlug(false);
    } catch (err: any) {
      const msg = err?.message || "";
      toast({ title: msg.includes("taken") ? "This name is already taken. Try a different one." : "Failed to update. Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 mt-6 pt-6 border-t" data-testid="container-embed-section">
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Link2 className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm" data-testid="text-profile-link-title">{t("dashProfileLink")}</h3>
        </div>
        {editingSlug ? (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground shrink-0">{origin}/u/</span>
              <Input
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/\s/g, "-"))}
                className="text-sm"
                placeholder="your-name"
                disabled={saving}
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") saveSlug(); if (e.key === "Escape") { setEditingSlug(false); setNewSlug(slug); } }}
                data-testid="input-edit-slug"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">Use lowercase letters, numbers, hyphens, dots, or underscores</p>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={saveSlug} disabled={saving} data-testid="button-save-slug">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditingSlug(false); setNewSlug(slug); }} disabled={saving} data-testid="button-cancel-slug">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-muted px-3 py-2 rounded-md truncate" data-testid="text-profile-url">
              {profileUrl}
            </code>
            <Button
              size="icon"
              variant="outline"
              onClick={() => { setNewSlug(slug); setEditingSlug(true); }}
              data-testid="button-edit-slug"
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={() => copyToClipboard(profileUrl, "link")}
              data-testid="button-copy-profile-link"
            >
              {copied === "link" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={() => window.open(`/u/${slug}`, "_blank")}
              data-testid="button-open-profile"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        )}
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Code className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm" data-testid="text-embed-code-title">{t("dashEmbedWidget")}</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3" data-testid="text-embed-desc">
          {t("dashEmbedDesc")}
        </p>
        <div className="relative">
          <pre className="text-[11px] bg-muted p-3 rounded-md overflow-x-auto" data-testid="text-embed-code">
            {embedCode}
          </pre>
          <Button
            size="sm"
            variant="outline"
            className="absolute top-2 right-2"
            onClick={() => copyToClipboard(embedCode, "embed")}
            data-testid="button-copy-embed-code"
          >
            {copied === "embed" ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
            {copied === "embed" ? t("dashCopied") : t("dashCopy")}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function BillingPanel({ profile, t }: { profile: SmartProfileData | null | undefined; t: (key: any) => string }) {
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const currentPlan = profile?.isPro ? "pro" : "free";
  const proExpiry = profile?.proExpiresAt ? new Date(profile.proExpiresAt) : null;
  const isExpired = proExpiry && proExpiry < new Date();

  const handleCheckout = async (plan: "pro" | "agency") => {
    if (!profile) {
      toast({ title: t("dashBillingNeedProfile"), variant: "destructive" });
      return;
    }
    setLoading(plan);
    try {
      const res = await apiRequest("POST", "/api/subscription/checkout", {
        plan,
        interval: billingInterval,
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast({ title: t("dashBillingCheckoutFailed"), variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const handleFounderCheckout = async () => {
    if (!profile) {
      toast({ title: t("dashBillingNeedProfile"), variant: "destructive" });
      return;
    }
    setLoading("founder");
    try {
      const res = await apiRequest("POST", "/api/founding-member/checkout", {});
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast({ title: t("dashBillingCheckoutFailed"), variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const plans = [
    {
      key: "free",
      name: t("dashBillingFree"),
      monthlyPrice: "$0",
      yearlyPrice: "$0",
      desc: t("dashBillingFreeDesc"),
      features: t("dashBillingFreeFeats"),
      isCurrent: currentPlan === "free" && !isExpired,
    },
    {
      key: "pro",
      name: t("dashBillingPro"),
      monthlyPrice: "$29",
      yearlyPrice: "$19",
      desc: t("dashBillingProDesc"),
      features: t("dashBillingProFeats"),
      isCurrent: currentPlan === "pro" && !isExpired,
      popular: true,
    },
    {
      key: "agency",
      name: t("dashBillingAgency"),
      monthlyPrice: "$199",
      yearlyPrice: "$149",
      desc: t("dashBillingAgencyDesc"),
      features: t("dashBillingAgencyFeats"),
      isCurrent: false,
    },
  ];

  if (!profile) {
    return (
      <Card className="p-8" data-testid="card-billing-need-profile">
        <div className="flex flex-col items-center justify-center text-center text-muted-foreground">
          <CreditCard className="w-12 h-12 mb-4 opacity-30" />
          <h3 className="text-lg font-medium mb-2" data-testid="text-billing-need-profile">{t("dashBillingNeedProfile")}</h3>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="container-billing">
      <h2 className="font-semibold text-lg" data-testid="text-billing-title">{t("dashBillingTitle")}</h2>

      <Card className="p-4" data-testid="card-current-plan">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
              {currentPlan === "pro" && !isExpired ? <Crown className="w-5 h-5 text-primary" /> : <User className="w-5 h-5 text-muted-foreground" />}
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{t("dashBillingCurrentPlan")}</div>
              <div className="font-semibold text-lg flex items-center gap-2">
                {currentPlan === "pro" && !isExpired ? t("dashBillingPro") : t("dashBillingFree")}
                {currentPlan === "pro" && !isExpired && (
                  <Badge variant="default" className="text-xs" data-testid="badge-plan-active">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    {t("dashBillingActive")}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {proExpiry && !isExpired && (
            <div className="text-xs text-muted-foreground" data-testid="text-plan-expiry">
              {t("dashBillingExpires")}: {proExpiry.toLocaleDateString()}
            </div>
          )}
        </div>
      </Card>

      <div className="flex items-center justify-center gap-2" data-testid="container-billing-interval">
        <Button
          size="sm"
          variant={billingInterval === "month" ? "default" : "outline"}
          onClick={() => setBillingInterval("month")}
          data-testid="button-billing-monthly"
        >
          {t("dashBillingMonthly")}
        </Button>
        <Button
          size="sm"
          variant={billingInterval === "year" ? "default" : "outline"}
          onClick={() => setBillingInterval("year")}
          className="gap-1.5"
          data-testid="button-billing-yearly"
        >
          {t("dashBillingYearly")}
          <Badge variant="secondary" className="text-[10px]">{t("dashBillingSave")}</Badge>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3" data-testid="container-plan-cards">
        {plans.map((plan) => (
          <Card
            key={plan.key}
            className={`p-5 relative flex flex-col ${plan.popular ? "border-primary ring-1 ring-primary/20" : ""} ${plan.isCurrent ? "bg-primary/5" : ""}`}
            data-testid={`card-plan-${plan.key}`}
          >
            {plan.popular && (
              <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px]" data-testid="badge-popular">
                <Star className="w-3 h-3 mr-1" />
                {t("dashBillingPopular")}
              </Badge>
            )}
            <div className="mb-3">
              <h3 className="font-semibold text-base" data-testid={`text-plan-name-${plan.key}`}>{plan.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{plan.desc}</p>
            </div>
            <div className="mb-3">
              <span className="text-2xl font-bold" data-testid={`text-plan-price-${plan.key}`}>
                {billingInterval === "month" ? plan.monthlyPrice : plan.yearlyPrice}
              </span>
              {plan.key !== "free" && (
                <span className="text-sm text-muted-foreground">{billingInterval === "month" ? t("dashBillingPerMonth") : t("dashBillingPerYear")}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-4 flex-1">{plan.features}</p>
            {plan.isCurrent ? (
              <Button variant="outline" size="sm" disabled className="w-full" data-testid={`button-plan-current-${plan.key}`}>
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                {t("dashBillingCurrentLabel")}
              </Button>
            ) : plan.key === "free" ? (
              <Button variant="outline" size="sm" disabled className="w-full" data-testid={`button-plan-free`}>
                {t("dashBillingFree")}
              </Button>
            ) : (
              <Button
                size="sm"
                className="w-full"
                variant={plan.popular ? "default" : "outline"}
                onClick={() => handleCheckout(plan.key as "pro" | "agency")}
                disabled={!!loading}
                data-testid={`button-plan-upgrade-${plan.key}`}
              >
                {loading === plan.key ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />{t("dashBillingProcessing")}</>
                ) : (
                  <><Crown className="w-3.5 h-3.5 mr-1.5" />{t("dashBillingUpgrade")}</>
                )}
              </Button>
            )}
          </Card>
        ))}
      </div>

      <Card className="p-5 border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-orange-500/5" data-testid="card-founder-pass">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-md bg-amber-500/10 flex items-center justify-center shrink-0">
              <Crown className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-base" data-testid="text-founder-title">{t("dashBillingFounder")}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{t("dashBillingFounderDesc")}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <span className="text-2xl font-bold" data-testid="text-founder-price">{t("dashBillingFounderPrice")}</span>
              <span className="text-xs text-muted-foreground ml-1">{t("dashBillingOneTime")}</span>
            </div>
            <Button
              onClick={handleFounderCheckout}
              disabled={!!loading}
              className="bg-amber-600 hover:bg-amber-700 text-white"
              data-testid="button-founder-checkout"
            >
              {loading === "founder" ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />{t("dashBillingProcessing")}</>
              ) : (
                t("dashBillingFounderCta")
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function GlobalDashboard({ onBack, isAdmin, onAdminClick }: { onBack: () => void; isAdmin?: boolean; onAdminClick?: () => void }) {
  const { user: authUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("setup");
  const [lang, setLangState] = useState<GlobalLanguage>(getStoredGlobalLanguage());

  const setLang = useCallback((l: GlobalLanguage) => {
    setLangState(l);
    setStoredGlobalLanguage(l);
  }, []);

  const t = useCallback((key: any) => gt(lang, key), [lang]);

  const { data: profile } = useQuery<SmartProfileData>({
    queryKey: ["/api/smart-profile"],
  });

  const { data: userProfile } = useQuery<Profile>({
    queryKey: ["/api/user"],
  });

  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    if (checkout?.includes("success")) {
      const planKey = checkout.replace("-success", "");
      const planLabel = planKey === "founder" ? t("dashBillingFounder") : planKey === "pro" ? t("dashBillingPro") : planKey === "agency" ? t("dashBillingAgency") : planKey;
      toast({ title: `${planLabel} ${t("dashBillingActivated")}` });
      queryClient.invalidateQueries({ queryKey: ["/api/smart-profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      window.history.replaceState({}, "", window.location.pathname);
      setActiveTab("billing");
    }
  }, []);

  const hasProfile = profile && profile.onboardingComplete;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={onBack}
              data-testid="button-back-to-home"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-1.5">
              <Globe className="w-5 h-5" />
              <span className="font-semibold text-base" data-testid="text-dashboard-logo">Arya</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && onAdminClick && (
              <Button
                size="icon"
                variant="ghost"
                onClick={onAdminClick}
                data-testid="button-admin-panel"
              >
                <Shield className="w-4 h-4" />
              </Button>
            )}
            <DashLanguageSelector lang={lang} setLang={setLang} />
            {profile?.isPro && (
              <Badge variant="default" data-testid="badge-pro-status">
                <Crown className="w-3 h-3 mr-1" />
                PRO
              </Badge>
            )}
            {authUser && (
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-muted-foreground hidden sm:inline" data-testid="text-dashboard-user">
                  {authUser.firstName || authUser.email || ""}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => logout()}
                  data-testid="button-dashboard-logout"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto -mx-3 sm:-mx-4 px-3 sm:px-4 mb-4 sm:mb-6">
            <TabsList className="inline-flex w-auto min-w-full gap-0">
              <TabsTrigger value="setup" className="flex-1 gap-1 text-xs sm:text-sm px-2 sm:px-3" data-testid="tab-setup">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">{t("dashTabSetup")}</span>
                <span className="sm:hidden truncate">{t("dashTabSetupShort")}</span>
              </TabsTrigger>
              <TabsTrigger value="profile" className="flex-1 gap-1 text-xs sm:text-sm px-2 sm:px-3" disabled={!hasProfile} data-testid="tab-profile">
                <User className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{t("dashTabProfile")}</span>
              </TabsTrigger>
              <TabsTrigger value="leads" className="flex-1 gap-1 text-xs sm:text-sm px-2 sm:px-3" data-testid="tab-leads">
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{t("dashTabLeadsShort")}</span>
              </TabsTrigger>
              <TabsTrigger value="crm" className="flex-1 gap-1 text-xs sm:text-sm px-2 sm:px-3" disabled={!hasProfile} data-testid="tab-crm">
                <PlugZap className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">CRM</span>
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className="flex-1 gap-1 text-xs sm:text-sm px-2 sm:px-3" disabled={!hasProfile} data-testid="tab-whatsapp">
                <Phone className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">WhatsApp</span>
              </TabsTrigger>
              <TabsTrigger value="widget" className="flex-1 gap-1 text-xs sm:text-sm px-2 sm:px-3" disabled={!hasProfile} data-testid="tab-widget">
                <Code className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{t("dashTabWidget")}</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex-1 gap-1 text-xs sm:text-sm px-2 sm:px-3" disabled={!hasProfile} data-testid="tab-analytics">
                <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">{t("dashTabAnalytics")}</span>
                <span className="sm:hidden truncate">{t("dashTabAnalyticsShort")}</span>
              </TabsTrigger>
              <TabsTrigger value="billing" className="flex-1 gap-1 text-xs sm:text-sm px-2 sm:px-3" data-testid="tab-billing">
                <CreditCard className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{t("dashTabBilling")}</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="setup">
            {!hasProfile && (
              <Card className="p-5 mb-4 border-primary/20 bg-primary/5" data-testid="card-welcome-guidance">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 text-primary shrink-0">
                    <Lightbulb className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm mb-1.5" data-testid="text-welcome-title">{t("dashWelcomeTitle")}</h3>
                    <p className="text-sm text-muted-foreground mb-3" data-testid="text-welcome-desc">{t("dashWelcomeDesc")}</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MessageSquare className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{t("dashWelcomeStep1")}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{t("dashWelcomeStep2")}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{t("dashWelcomeStep3")}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}
            <OwnerAssistant inline autoOpen={!hasProfile} />
            <div className="mt-4">
              <AryaWidget profileId={userProfile?.id ?? ""} defaultLang={lang} />
            </div>
            {hasProfile && <EmbedCodeSection slug={profile.slug} t={t} />}
          </TabsContent>

          <TabsContent value="profile">
            {hasProfile && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h2 className="font-semibold text-lg" data-testid="text-profile-heading">{t("dashProfileView")}</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/u/${profile.slug}`, "_blank")}
                    data-testid="button-view-profile-external"
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                    {t("dashOpenProfile")}
                  </Button>
                </div>
                <AryaWidget profileId={userProfile?.id ?? ""} defaultLang={lang} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="leads">
            {hasProfile && <AnalyticsSummary profileId={profile.id} t={t} />}
            <LeadsPanel profileId={profile?.id ?? ""} t={t} />
          </TabsContent>

          <TabsContent value="crm">
            {hasProfile && (
              <div className="space-y-4">
                <h2 className="font-semibold text-lg" data-testid="text-crm-heading">{t("dashCrmTitle")}</h2>
                <p className="text-sm text-muted-foreground" data-testid="text-crm-desc">{t("dashCrmDesc")}</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card
                    className="p-4 cursor-pointer hover-elevate"
                    onClick={() => { setActiveTab("crm-altegio"); }}
                    data-testid="card-crm-altegio"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md bg-violet-500/10 flex items-center justify-center shrink-0">
                        <PlugZap className="w-5 h-5 text-violet-600" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-medium block">Altegio CRM</span>
                        <span className="text-xs text-muted-foreground">YCLIENTS</span>
                      </div>
                    </div>
                  </Card>
                  <Card
                    className="p-4 cursor-pointer hover-elevate"
                    onClick={() => { setActiveTab("crm-webhook"); }}
                    data-testid="card-crm-webhook"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md bg-blue-500/10 flex items-center justify-center shrink-0">
                        <Globe className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-medium block">{t("dashWebhookTitle")}</span>
                        <span className="text-xs text-muted-foreground">Bitrix24, HubSpot, Zapier...</span>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="crm-altegio">
            {hasProfile && (
              <div className="space-y-4">
                <Button variant="ghost" size="sm" onClick={() => setActiveTab("crm")} className="gap-1.5 -ml-2" data-testid="button-back-crm">
                  <ArrowLeft className="w-4 h-4" />
                  CRM
                </Button>
                <AryaWidget key="altegio" profileId={userProfile?.id ?? ""} defaultLang={lang} initialView="altegio" />
              </div>
            )}
          </TabsContent>

          <TabsContent value="crm-webhook">
            {hasProfile && (
              <div className="space-y-4">
                <Button variant="ghost" size="sm" onClick={() => setActiveTab("crm")} className="gap-1.5 -ml-2" data-testid="button-back-crm-webhook">
                  <ArrowLeft className="w-4 h-4" />
                  CRM
                </Button>
                <AryaWidget key="webhook" profileId={userProfile?.id ?? ""} defaultLang={lang} initialView="webhook" />
              </div>
            )}
          </TabsContent>

          <TabsContent value="whatsapp">
            {hasProfile && (
              <AryaWidget key="whatsapp" profileId={userProfile?.id ?? ""} defaultLang={lang} initialView="whatsapp" />
            )}
          </TabsContent>

          <TabsContent value="widget">
            {hasProfile && (
              <div className="space-y-4 [&>div]:mt-0 [&>div]:pt-0 [&>div]:border-t-0">
                <EmbedCodeSection slug={profile.slug} t={t} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics">
            {hasProfile && (
              <div className="space-y-4">
                <h2 className="font-semibold text-lg" data-testid="text-analytics-heading">{t("dashTabAnalytics")}</h2>
                <AnalyticsSummary profileId={profile.id} t={t} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="billing">
            <BillingPanel profile={hasProfile ? profile : null} t={t} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
