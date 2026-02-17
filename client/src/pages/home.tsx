import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { LanguageSelector } from "@/components/language-selector";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mic, Coins, ShoppingBag, Waves, ArrowLeft, LogOut, Shield, User, MessageCircle } from "lucide-react";
import RecorderWidget from "@/components/recorder-widget";
import MilestoneCelebration from "@/components/milestone-celebration";
import TokenDashboard from "@/components/token-dashboard";
import Shop from "@/components/shop";
import AryaWidget from "@/components/arya-widget";
import allSentencesData from "@/data/sentences_az.json";
import type { Sentence, Profile, Transaction, Voucher } from "@shared/schema";

const allSentences: Sentence[] = allSentencesData as Sentence[];
const anchorSentences = allSentences.filter(s => s.category === "anchor");
const poolSentences = allSentences.filter(s => s.category !== "anchor");

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildSessionPhrases(recordedIds: Set<string>): Sentence[] {
  const unrecordedAnchors = anchorSentences.filter(s => !recordedIds.has(s.id));
  const unrecordedPool = poolSentences.filter(s => !recordedIds.has(s.id));
  const needed = 20 - unrecordedAnchors.length;

  let picks: Sentence[];
  if (unrecordedPool.length >= needed) {
    picks = shuffleArray(unrecordedPool).slice(0, needed);
  } else if (unrecordedPool.length > 0) {
    picks = shuffleArray(unrecordedPool);
    const extra = shuffleArray(poolSentences).slice(0, needed - picks.length);
    picks = [...picks, ...extra];
  } else {
    picks = shuffleArray(poolSentences).slice(0, needed);
  }

  return [...unrecordedAnchors, ...picks];
}

export default function Home({ onBack, isAdmin, onAdminClick }: { onBack: () => void; isAdmin?: boolean; onAdminClick?: () => void }) {
  const { toast } = useToast();
  const { user: authUser, logout } = useAuth();
  const { t, language: uiLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState("record");
  const [recordedIds, setRecordedIds] = useState<Set<string>>(new Set());
  const [sessionPhrases, setSessionPhrases] = useState<Sentence[]>([]);
  const [sessionIndex, setSessionIndex] = useState(0);
  const [showMilestone, setShowMilestone] = useState<number | null>(null);
  const [milestoneReward, setMilestoneReward] = useState(0);

  const { data: user, isLoading: userLoading } = useQuery<Profile>({
    queryKey: ["/api/user"],
  });

  const { data: serverRecordedIds = [], isLoading: recordedIdsLoading } = useQuery<string[]>({
    queryKey: ["/api/recordings/sentence-ids"],
    enabled: !!user,
  });

  useEffect(() => {
    if (serverRecordedIds.length > 0) {
      setRecordedIds(prev => {
        const merged = new Set(prev);
        serverRecordedIds.forEach(id => merged.add(id));
        return merged;
      });
    }
  }, [serverRecordedIds]);

  const [sessionInitialized, setSessionInitialized] = useState(false);

  useEffect(() => {
    if (!recordedIdsLoading && !sessionInitialized) {
      const phrases = buildSessionPhrases(recordedIds);
      setSessionPhrases(phrases);
      setSessionIndex(0);
      setSessionInitialized(true);
    }
  }, [recordedIdsLoading, recordedIds, sessionInitialized]);

  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    enabled: !!user,
  });

  const { data: vouchers = [] } = useQuery<Voucher[]>({
    queryKey: ["/api/vouchers"],
    enabled: !!user,
  });

  const currentSentence = useMemo(() => {
    if (recordedIdsLoading || sessionPhrases.length === 0) return null;
    if (sessionIndex >= sessionPhrases.length) return null;
    return { sentence: sessionPhrases[sessionIndex], index: sessionIndex };
  }, [sessionPhrases, sessionIndex, recordedIdsLoading]);

  const donateVoiceToApi = async (blob: Blob, sentence: Sentence, duration: number) => {
    try {
      const speakerName = authUser?.firstName
        ? `${authUser.firstName} ${authUser.lastName || ""}`.trim()
        : authUser?.email || "unknown";

      const donateFormData = new FormData();
      const ext = blob.type.includes("mp4") ? "mp4" : "webm";
      donateFormData.append("audio", new File([blob], `recording.${ext}`, { type: blob.type || "audio/webm" }));
      donateFormData.append("speaker_name", speakerName);
      donateFormData.append("age", user?.age || "");
      donateFormData.append("gender", user?.gender || "");
      donateFormData.append("sentenceId", sentence.id);
      donateFormData.append("sentenceText", sentence.text);
      donateFormData.append("category", sentence.category);
      donateFormData.append("duration", String(duration));
      donateFormData.append("wordCount", String(sentence.wordCount));

      const donateUrl = `${window.location.origin}/api/donate-voice`;
      console.log(`[donate-voice] Uploading to: ${donateUrl}`);

      const donateRes = await fetch(donateUrl, {
        method: "POST",
        mode: "cors",
        body: donateFormData,
      });

      const contentType = donateRes.headers.get("content-type") || "";
      let donateData: unknown;
      if (contentType.includes("application/json")) {
        donateData = await donateRes.json();
      } else {
        donateData = await donateRes.text();
      }

      console.log("[donate-voice] Status:", donateRes.status, "Response:", donateData);

      if (!donateRes.ok) {
        console.error("[donate-voice] Upload failed:", donateRes.status, donateData);
      }
    } catch (err) {
      console.error("[donate-voice] CORS or network error:", err);
    }
  };

  const recordingMutation = useMutation({
    mutationFn: async ({ blob, duration, sentence }: { blob: Blob; duration: number; sentence: Sentence }) => {
      const formData = new FormData();
      const recExt = blob.type.includes("mp4") ? "mp4" : "webm";
      formData.append("audio", new File([blob], `recording.${recExt}`, { type: blob.type || "audio/webm" }));
      formData.append("sentenceId", sentence.id);
      formData.append("sentenceText", sentence.text);
      formData.append("category", sentence.category);
      formData.append("duration", String(duration));
      formData.append("wordCount", String(sentence.wordCount));

      const res = await fetch("/api/recordings", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || t("errorOccurred"));
      }

      donateVoiceToApi(blob, sentence, duration);

      return res.json();
    },
    onSuccess: (data, variables) => {
      const newRecordedIds = new Set(recordedIds);
      newRecordedIds.add(variables.sentence.id);
      setRecordedIds(newRecordedIds);

      if (sessionIndex + 1 >= sessionPhrases.length) {
        const newPhrases = buildSessionPhrases(newRecordedIds);
        setSessionPhrases(newPhrases);
        setSessionIndex(0);
      } else {
        setSessionIndex(prev => prev + 1);
      }

      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recordings/sentence-ids"] });

      if (data.milestone) {
        setShowMilestone(data.milestone);
        setMilestoneReward(data.milestoneReward || 0);
      } else {
        toast({
          title: t("success"),
          description: t("recordingSaved"),
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: t("error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const purchaseMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await apiRequest("POST", "/api/vouchers", { itemId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vouchers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({
        title: t("orderSuccess"),
        description: t("voucherAdded"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRecordingComplete = (blob: Blob, duration: number) => {
    if (!currentSentence) return;
    recordingMutation.mutate({ blob, duration, sentence: currentSentence.sentence });
  };

  const handleSkip = () => {
    if (sessionIndex + 1 >= sessionPhrases.length) {
      const newPhrases = buildSessionPhrases(recordedIds);
      setSessionPhrases(newPhrases);
      setSessionIndex(0);
    } else {
      setSessionIndex(prev => prev + 1);
    }
  };

  const handleMilestoneContinue = () => {
    if (showMilestone === 2) {
      setActiveTab("shop");
    }
    setShowMilestone(null);
  };

  const totalRecorded = user?.recordingsCount ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-2 sm:px-4 h-12 sm:h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-3">
            <Button
              size="icon"
              variant="ghost"
              onClick={onBack}
              data-testid="button-back-to-landing"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-1.5">
              <Waves className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              <span className="font-semibold text-sm sm:text-base">Arya.az</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3">
            {user && (
              <div className="flex items-center gap-1 text-sm">
                <Coins className="w-4 h-4 text-primary" />
                <span className="font-semibold" data-testid="text-header-balance">{user.tokens.toLocaleString()}</span>
              </div>
            )}
            <LanguageSelector />
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
            {authUser && (
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground hidden sm:inline" data-testid="text-user-name">
                  {authUser.firstName || authUser.email || ''}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => logout()}
                  data-testid="button-logout"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {showMilestone ? (
          <MilestoneCelebration
            milestone={showMilestone}
            tokens={milestoneReward}
            onContinue={handleMilestoneContinue}
          />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full mb-4 sm:mb-6">
              <TabsTrigger value="record" className="flex-1 gap-1 sm:gap-1.5 text-xs sm:text-sm px-1.5 sm:px-3" data-testid="tab-record">
                <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {t("tabRecord")}
              </TabsTrigger>
              <TabsTrigger value="dashboard" className="flex-1 gap-1 sm:gap-1.5 text-xs sm:text-sm px-1.5 sm:px-3" data-testid="tab-dashboard">
                <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {t("tabDashboard")}
              </TabsTrigger>
              <TabsTrigger value="shop" className="flex-1 gap-1 sm:gap-1.5 text-xs sm:text-sm px-1.5 sm:px-3" data-testid="tab-shop">
                <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {t("tabShop")}
              </TabsTrigger>
              <TabsTrigger value="chat" className="flex-1 gap-1 sm:gap-1.5 text-xs sm:text-sm px-1.5 sm:px-3" data-testid="tab-chat">
                <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {t("tabArya")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="record">
              {(!user?.age || !user?.gender) ? (
                <ProfileInfoForm
                  onSave={async (age, gender) => {
                    await apiRequest("PATCH", "/api/user/profile", { age, gender });
                    queryClient.invalidateQueries({ queryKey: ["/api/user"] });
                  }}
                />
              ) : (
                <RecorderWidget
                  sentence={currentSentence?.sentence ?? null}
                  currentIndex={sessionIndex}
                  totalInSession={sessionPhrases.length}
                  totalRecorded={totalRecorded}
                  onRecordingComplete={handleRecordingComplete}
                  onSkip={handleSkip}
                  isSubmitting={recordingMutation.isPending}
                />
              )}
            </TabsContent>

            <TabsContent value="dashboard">
              <TokenDashboard user={user ?? null} transactions={transactions} />
            </TabsContent>

            <TabsContent value="shop">
              <Shop
                user={user ?? null}
                vouchers={vouchers}
                onPurchase={(itemId) => purchaseMutation.mutate(itemId)}
                isPurchasing={purchaseMutation.isPending}
              />
            </TabsContent>

            <TabsContent value="chat">
              <AryaWidget profileId={user?.id ?? ""} defaultLang={uiLanguage} />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}

function ProfileInfoForm({ onSave }: { onSave: (age: string, gender: string) => Promise<void> }) {
  const { t } = useLanguage();
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!age || !gender) return;
    setSaving(true);
    try {
      await onSave(age, gender);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="text-center mb-6">
        <User className="w-10 h-10 mx-auto mb-3 text-primary" />
        <h3 className="text-lg font-semibold">{t("profileInfo")}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t("profileInfoDesc")}
        </p>
      </div>
      <div className="space-y-4 max-w-sm mx-auto">
        <div className="space-y-2">
          <Label htmlFor="age">{t("age")}</Label>
          <Input
            id="age"
            type="number"
            min="10"
            max="99"
            placeholder={t("agePlaceholder")}
            value={age}
            onChange={(e) => setAge(e.target.value)}
            data-testid="input-age"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gender">{t("gender")}</Label>
          <Select value={gender} onValueChange={setGender}>
            <SelectTrigger data-testid="select-gender">
              <SelectValue placeholder={t("genderPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">{t("male")}</SelectItem>
              <SelectItem value="female">{t("female")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={!age || !gender || saving}
          data-testid="button-save-profile"
        >
          {saving ? t("saving") : t("continue")}
        </Button>
      </div>
    </Card>
  );
}
