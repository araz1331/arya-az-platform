import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Mic, HardDrive, Clock, ArrowLeft, Waves, Download } from "lucide-react";

interface AdminStats {
  totalUsers: number;
  totalRecordings: number;
  totalDurationSeconds: number;
  totalFileSize: number;
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
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

const DURATION_UNITS: Record<string, { h: string; m: string; s: string }> = {
  az: { h: "s", m: "d", s: "sn" },
  en: { h: "h", m: "m", s: "s" },
  fr: { h: "h", m: "m", s: "s" },
  es: { h: "h", m: "m", s: "s" },
  ru: { h: "ч", m: "м", s: "с" },
};

function formatDuration(seconds: number, lang: string = "az"): string {
  const u = DURATION_UNITS[lang] || DURATION_UNITS.az;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}${u.h} ${m}${u.m} ${s}${u.s}`;
  if (m > 0) return `${m}${u.m} ${s}${u.s}`;
  return `${s}${u.s}`;
}

export default function AdminPage({ onBack }: { onBack: () => void }) {
  const { t, language } = useLanguage();
  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button size="icon" variant="ghost" onClick={onBack} data-testid="button-admin-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Waves className="w-5 h-5 text-primary" />
              <span className="font-semibold">{t("adminPanel")}</span>
            </div>
          </div>
          <a href="/api/export/metadata.csv" download>
            <Button variant="outline" className="gap-2" data-testid="button-export-csv">
              <Download className="w-4 h-4" />
              {t("csvExport")}
            </Button>
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 text-primary">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("users")}</p>
                <p className="text-xl font-bold" data-testid="text-admin-total-users">
                  {statsLoading ? "..." : stats?.totalUsers ?? 0}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 text-primary">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("recordings")}</p>
                <p className="text-xl font-bold" data-testid="text-admin-total-recordings">
                  {statsLoading ? "..." : stats?.totalRecordings ?? 0}
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
                <p className="text-xs text-muted-foreground">{t("totalDuration")}</p>
                <p className="text-xl font-bold" data-testid="text-admin-total-duration">
                  {statsLoading ? "..." : formatDuration(stats?.totalDurationSeconds ?? 0, language)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 text-primary">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("totalSize")}</p>
                <p className="text-xl font-bold" data-testid="text-admin-total-size">
                  {statsLoading ? "..." : formatBytes(stats?.totalFileSize ?? 0)}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <h3 className="font-semibold mb-4">{t("users")} ({users.length})</h3>
          {usersLoading ? (
            <p className="text-muted-foreground text-sm">{t("loading")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">{t("user")}</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">{t("email")}</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground text-right">{t("writingsCol")}</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground text-right">{t("durationCol")}</th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground text-right">{t("sizeCol")}</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">{t("token")}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b last:border-b-0" data-testid={`row-user-${u.id}`}>
                      <td className="py-3 pr-4">
                        <div className="font-medium">
                          {u.firstName || u.lastName
                            ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()
                            : "\u2014"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString("az-AZ") : ""}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">{u.email}</td>
                      <td className="py-3 pr-4 text-right tabular-nums">
                        {u.recordingsCount > 0 ? (
                          <Badge variant="secondary">{u.recordingsCount}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums text-muted-foreground">
                        {formatDuration(u.totalDuration, language)}
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums text-muted-foreground">
                        {formatBytes(u.totalFileSize)}
                      </td>
                      <td className="py-3 text-right tabular-nums font-medium">
                        {u.tokens.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
