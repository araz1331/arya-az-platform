import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users, Mic, HardDrive, Clock, ArrowLeft, Waves, Download,
  MessageSquare, Globe, Crown, TrendingUp, Briefcase,
  ExternalLink, Languages, CheckCircle, XCircle,
} from "lucide-react";

type Tab = "overview" | "users" | "profiles" | "leads" | "voice";

interface FullStats {
  totalUsers: number;
  totalSmartProfiles: number;
  totalProUsers: number;
  totalRecordings: number;
  totalRecordingDuration: number;
  totalRecordingSize: number;
  totalVoiceDonations: number;
  totalDonationDuration: number;
  totalDonationSize: number;
  totalWidgetMessages: number;
  totalChatSessions: number;
  totalVouchers: number;
  newUsersToday: number;
  newProfilesToday: number;
}

interface AdminUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
  tokens: number;
  recordingsCount: number;
  totalDuration: number;
  totalFileSize: number;
  hasSmartProfile: boolean;
  smartProfileSlug: string | null;
  isPro: boolean;
  proExpiresAt: string | null;
  stripeCustomerId: string | null;
}

interface AdminSmartProfile {
  id: string;
  userId: string;
  slug: string;
  businessName: string;
  displayName: string | null;
  profession: string;
  isPro: boolean;
  proExpiresAt: string | null;
  onboardingComplete: boolean;
  isActive: boolean;
  profileImageUrl: string | null;
  hasRu: boolean;
  hasEn: boolean;
  createdAt: string;
  email: string | null;
  totalMessages: number;
  totalSessions: number;
}

interface AdminLead {
  sessionId: string;
  profileId: string | null;
  profileSlug: string | null;
  profileName: string | null;
  messageCount: number;
  firstMessage: string;
  lastMessage: string;
  preview: string | null;
}

interface AdminVoiceDonation {
  id: string;
  userId: string | null;
  speakerName: string | null;
  age: string | null;
  gender: string | null;
  transcription: string | null;
  category: string | null;
  duration: number;
  fileSize: number;
  wordCount: number;
  createdAt: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateShort(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: any; label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={`flex items-center justify-center w-10 h-10 rounded-md ${color || "bg-primary/10 text-primary"}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-xl font-bold tabular-nums" data-testid={`text-stat-${label.toLowerCase().replace(/\s/g, "-")}`}>{value}</p>
          {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
        </div>
      </div>
    </Card>
  );
}

function TabButton({ active, onClick, children, count, testId }: {
  active: boolean; onClick: () => void; children: React.ReactNode; count?: number; testId: string;
}) {
  return (
    <Button
      variant={active ? "default" : "ghost"}
      size="sm"
      onClick={onClick}
      className="gap-1.5"
      data-testid={testId}
    >
      {children}
      {count !== undefined && count > 0 && (
        <Badge variant="secondary" className="text-[10px] px-1.5">{count}</Badge>
      )}
    </Button>
  );
}

function OverviewTab({ stats }: { stats: FullStats | undefined }) {
  if (!stats) return <p className="text-muted-foreground text-sm p-4">Loading...</p>;
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Platform</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Users} label="Total Users" value={stats.totalUsers} sub={stats.newUsersToday > 0 ? `+${stats.newUsersToday} today` : undefined} />
          <StatCard icon={Briefcase} label="Smart Profiles" value={stats.totalSmartProfiles} sub={stats.newProfilesToday > 0 ? `+${stats.newProfilesToday} today` : undefined} color="bg-blue-500/10 text-blue-500" />
          <StatCard icon={Crown} label="PRO Users" value={stats.totalProUsers} color="bg-amber-500/10 text-amber-500" />
          <StatCard icon={MessageSquare} label="Chat Sessions" value={stats.totalChatSessions} sub={`${stats.totalWidgetMessages} messages`} color="bg-green-500/10 text-green-500" />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Voice Data (/az)</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Mic} label="Recordings" value={stats.totalRecordings} />
          <StatCard icon={Clock} label="Rec. Duration" value={formatDuration(stats.totalRecordingDuration)} />
          <StatCard icon={Globe} label="Donations" value={stats.totalVoiceDonations} />
          <StatCard icon={HardDrive} label="Total Size" value={formatBytes(stats.totalRecordingSize + stats.totalDonationSize)} />
        </div>
      </div>
    </div>
  );
}

function UsersTab({ users, isLoading }: { users: AdminUser[]; isLoading: boolean }) {
  if (isLoading) return <p className="text-muted-foreground text-sm p-4">Loading...</p>;
  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b">
        <h3 className="font-semibold">All Users ({users.length})</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="py-2.5 px-4 text-left font-medium text-muted-foreground">User</th>
              <th className="py-2.5 px-4 text-left font-medium text-muted-foreground">Email</th>
              <th className="py-2.5 px-4 text-left font-medium text-muted-foreground">Status</th>
              <th className="py-2.5 px-4 text-left font-medium text-muted-foreground">Joined</th>
              <th className="py-2.5 px-4 text-right font-medium text-muted-foreground">Recordings</th>
              <th className="py-2.5 px-4 text-right font-medium text-muted-foreground">Tokens</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b last:border-b-0" data-testid={`row-user-${u.id}`}>
                <td className="py-2.5 px-4">
                  <div className="font-medium">
                    {u.firstName || u.lastName ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() : "—"}
                  </div>
                </td>
                <td className="py-2.5 px-4 text-muted-foreground text-xs">{u.email}</td>
                <td className="py-2.5 px-4">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {u.isPro ? (
                      <Badge className="bg-amber-500/10 text-amber-600 border-transparent text-[10px]" data-testid={`badge-pro-${u.id}`}>
                        PRO
                      </Badge>
                    ) : u.hasSmartProfile ? (
                      <Badge variant="outline" className="text-[10px]" data-testid={`badge-free-${u.id}`}>Free</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                    {u.smartProfileSlug && (
                      <a href={`/u/${u.smartProfileSlug}`} target="_blank" rel="noopener" className="text-[10px] text-blue-500 flex items-center gap-0.5" data-testid={`link-user-profile-${u.id}`}>
                        /u/{u.smartProfileSlug} <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                  {u.isPro && u.proExpiresAt && (
                    <div className="text-[10px] text-muted-foreground mt-0.5" data-testid={`text-pro-expires-${u.id}`}>
                      expires {formatDate(u.proExpiresAt)}
                    </div>
                  )}
                </td>
                <td className="py-2.5 px-4 text-muted-foreground text-xs">{formatDate(u.createdAt)}</td>
                <td className="py-2.5 px-4 text-right tabular-nums">
                  {u.recordingsCount > 0 ? <Badge variant="secondary">{u.recordingsCount}</Badge> : <span className="text-muted-foreground">0</span>}
                </td>
                <td className="py-2.5 px-4 text-right tabular-nums font-medium">{u.tokens.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ProfilesTab({ profiles, isLoading }: { profiles: AdminSmartProfile[]; isLoading: boolean }) {
  if (isLoading) return <p className="text-muted-foreground text-sm p-4">Loading...</p>;
  if (profiles.length === 0) return <p className="text-muted-foreground text-sm p-4">No smart profiles yet.</p>;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{profiles.length} profile{profiles.length !== 1 ? "s" : ""}</p>
      {profiles.map((p) => (
        <Card key={p.id} className="p-4" data-testid={`card-profile-${p.slug}`}>
          <div className="flex items-start gap-3 flex-wrap">
            <Avatar className="w-10 h-10 shrink-0">
              <AvatarImage src={p.profileImageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.slug}`} />
              <AvatarFallback className="text-xs font-bold">{(p.displayName || p.businessName).slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{p.displayName || p.businessName}</span>
                {p.isPro && <Badge className="bg-amber-500/10 text-amber-600 border-transparent text-[10px]">PRO</Badge>}
                {!p.isActive && <Badge variant="destructive" className="text-[10px]">Inactive</Badge>}
                {p.onboardingComplete ? (
                  <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">{p.profession}</p>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <a href={`/u/${p.slug}`} target="_blank" rel="noopener" className="text-xs text-blue-500 flex items-center gap-1" data-testid={`link-profile-${p.slug}`}>
                  /u/{p.slug} <ExternalLink className="w-3 h-3" />
                </a>
                {p.email && <span className="text-xs text-muted-foreground">{p.email}</span>}
                <span className="text-xs text-muted-foreground">{formatDate(p.createdAt)}</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="text-center">
                <div className="font-semibold text-foreground text-sm tabular-nums">{p.totalSessions}</div>
                <div>leads</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-foreground text-sm tabular-nums">{p.totalMessages}</div>
                <div>msgs</div>
              </div>
              <div className="flex items-center gap-1">
                <Languages className="w-3.5 h-3.5" />
                <span className="tabular-nums">
                  AZ{p.hasRu ? " RU" : ""}{p.hasEn ? " EN" : ""}
                </span>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function LeadsTab({ leads, isLoading }: { leads: AdminLead[]; isLoading: boolean }) {
  if (isLoading) return <p className="text-muted-foreground text-sm p-4">Loading...</p>;
  if (leads.length === 0) return <p className="text-muted-foreground text-sm p-4">No chat sessions yet.</p>;
  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Chat Sessions ({leads.length})</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="py-2.5 px-4 text-left font-medium text-muted-foreground">Profile</th>
              <th className="py-2.5 px-4 text-left font-medium text-muted-foreground">Preview</th>
              <th className="py-2.5 px-4 text-right font-medium text-muted-foreground">Messages</th>
              <th className="py-2.5 px-4 text-right font-medium text-muted-foreground">Last Active</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.sessionId} className="border-b last:border-b-0" data-testid={`row-lead-${lead.sessionId}`}>
                <td className="py-2.5 px-4">
                  {lead.profileSlug ? (
                    <a href={`/u/${lead.profileSlug}`} target="_blank" rel="noopener" className="text-blue-500 font-medium text-xs flex items-center gap-1" data-testid={`link-lead-profile-${lead.sessionId}`}>
                      {lead.profileName || lead.profileSlug} <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground text-xs">Unknown</span>
                  )}
                </td>
                <td className="py-2.5 px-4 text-xs text-muted-foreground max-w-[300px] truncate">{lead.preview || "—"}</td>
                <td className="py-2.5 px-4 text-right tabular-nums">
                  <Badge variant="secondary">{lead.messageCount}</Badge>
                </td>
                <td className="py-2.5 px-4 text-right text-muted-foreground text-xs">{timeAgo(lead.lastMessage)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function VoiceTab({ donations, isLoading }: { donations: AdminVoiceDonation[]; isLoading: boolean }) {
  if (isLoading) return <p className="text-muted-foreground text-sm p-4">Loading...</p>;
  if (donations.length === 0) return <p className="text-muted-foreground text-sm p-4">No voice donations yet.</p>;
  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Voice Donations ({donations.length})</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="py-2.5 px-4 text-left font-medium text-muted-foreground">Speaker</th>
              <th className="py-2.5 px-4 text-left font-medium text-muted-foreground">Text</th>
              <th className="py-2.5 px-4 text-left font-medium text-muted-foreground">Category</th>
              <th className="py-2.5 px-4 text-right font-medium text-muted-foreground">Duration</th>
              <th className="py-2.5 px-4 text-right font-medium text-muted-foreground">Words</th>
              <th className="py-2.5 px-4 text-right font-medium text-muted-foreground">Date</th>
            </tr>
          </thead>
          <tbody>
            {donations.map((d) => (
              <tr key={d.id} className="border-b last:border-b-0" data-testid={`row-donation-${d.id}`}>
                <td className="py-2.5 px-4">
                  <div className="font-medium text-xs">{d.speakerName || "—"}</div>
                  <div className="text-[10px] text-muted-foreground">{d.age ? `${d.age}y` : ""} {d.gender || ""}</div>
                </td>
                <td className="py-2.5 px-4 text-xs text-muted-foreground max-w-[250px] truncate">{d.transcription || "—"}</td>
                <td className="py-2.5 px-4">
                  {d.category && <Badge variant="outline" className="text-[10px]">{d.category}</Badge>}
                </td>
                <td className="py-2.5 px-4 text-right tabular-nums text-xs">{formatDuration(d.duration || 0)}</td>
                <td className="py-2.5 px-4 text-right tabular-nums text-xs">{d.wordCount || 0}</td>
                <td className="py-2.5 px-4 text-right text-xs text-muted-foreground">{formatDateShort(d.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default function AdminPage({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<Tab>("overview");

  const { data: stats, isLoading: statsLoading } = useQuery<FullStats>({
    queryKey: ["/api/admin/full-stats"],
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: profiles = [], isLoading: profilesLoading } = useQuery<AdminSmartProfile[]>({
    queryKey: ["/api/admin/smart-profiles"],
  });

  const { data: leads = [], isLoading: leadsLoading } = useQuery<AdminLead[]>({
    queryKey: ["/api/admin/leads"],
  });

  const { data: donations = [], isLoading: donationsLoading } = useQuery<AdminVoiceDonation[]>({
    queryKey: ["/api/admin/voice-donations"],
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button size="icon" variant="ghost" onClick={onBack} data-testid="button-admin-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Waves className="w-5 h-5 text-primary" />
              <span className="font-semibold">Admin Panel</span>
            </div>
          </div>
          <a href="/api/export/metadata.csv" download>
            <Button variant="outline" size="sm" className="gap-1.5" data-testid="button-export-csv">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
          </a>
        </div>
      </header>

      <div className="sticky top-14 z-40 border-b bg-background/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-1 overflow-x-auto">
          <TabButton active={tab === "overview"} onClick={() => setTab("overview")} testId="button-tab-overview">
            <TrendingUp className="w-4 h-4" /> Overview
          </TabButton>
          <TabButton active={tab === "users"} onClick={() => setTab("users")} count={users.length} testId="button-tab-users">
            <Users className="w-4 h-4" /> Users
          </TabButton>
          <TabButton active={tab === "profiles"} onClick={() => setTab("profiles")} count={profiles.length} testId="button-tab-profiles">
            <Briefcase className="w-4 h-4" /> Profiles
          </TabButton>
          <TabButton active={tab === "leads"} onClick={() => setTab("leads")} count={leads.length} testId="button-tab-leads">
            <MessageSquare className="w-4 h-4" /> Leads
          </TabButton>
          <TabButton active={tab === "voice"} onClick={() => setTab("voice")} count={donations.length} testId="button-tab-voice">
            <Mic className="w-4 h-4" /> Voice
          </TabButton>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {tab === "overview" && <OverviewTab stats={stats} />}
        {tab === "users" && <UsersTab users={users} isLoading={usersLoading} />}
        {tab === "profiles" && <ProfilesTab profiles={profiles} isLoading={profilesLoading} />}
        {tab === "leads" && <LeadsTab leads={leads} isLoading={leadsLoading} />}
        {tab === "voice" && <VoiceTab donations={donations} isLoading={donationsLoading} />}
      </main>
    </div>
  );
}
