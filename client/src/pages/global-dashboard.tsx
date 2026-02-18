import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Sparkles, Users, LogOut, ArrowLeft, ExternalLink, Globe, MessageCircle, Crown, Code, Copy, Check, Link2, TrendingUp, Clock, Eye } from "lucide-react";
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
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const embedCode = `<script src="${origin}/widget.js" data-slug="${slug}" data-color="#2563EB"></script>`;
  const profileUrl = `${origin}/u/${slug}`;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-4 mt-6 pt-6 border-t" data-testid="container-embed-section">
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Link2 className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm" data-testid="text-profile-link-title">{t("dashProfileLink")}</h3>
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-muted px-3 py-2 rounded-md truncate" data-testid="text-profile-url">
            {profileUrl}
          </code>
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

export default function GlobalDashboard({ onBack }: { onBack: () => void }) {
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
          <TabsList className="w-full mb-4 sm:mb-6">
            <TabsTrigger value="setup" className="flex-1 gap-1.5 text-sm" data-testid="tab-setup">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{t("dashTabSetup")}</span>
              <span className="sm:hidden truncate">{t("dashTabSetupShort")}</span>
            </TabsTrigger>
            <TabsTrigger value="leads" className="flex-1 gap-1.5 text-sm" data-testid="tab-leads">
              <Users className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{t("dashTabLeads")}</span>
              <span className="sm:hidden truncate">{t("dashTabLeadsShort")}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="setup">
            <AryaWidget profileId={userProfile?.id ?? ""} defaultLang={lang} />
            {hasProfile && <EmbedCodeSection slug={profile.slug} t={t} />}
          </TabsContent>

          <TabsContent value="leads">
            {hasProfile && <AnalyticsSummary profileId={profile.id} t={t} />}
            <LeadsPanel profileId={profile?.id ?? ""} t={t} />
          </TabsContent>
        </Tabs>
      </main>
      <OwnerAssistant />
    </div>
  );
}
