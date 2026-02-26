import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle, Phone, TrendingUp, Lock, Crown, ExternalLink,
  ChevronLeft, ChevronRight, LogOut, Rocket, Globe
} from "lucide-react";
import { type BundleState } from "./upgrade-modal";
import { getSupaClient } from "@/lib/supabase";

export interface ProductSidebarProps {
  hasChat: boolean;
  hasVoice: boolean;
  hasSales: boolean;
  bundleState: BundleState;
  collapsed: boolean;
  onToggle: () => void;
  onLockedClick: (product: "chat" | "voice" | "sales") => void;
  userName?: string;
  t: (key: any) => string;
  onLogout: () => void;
}

const PRODUCT_URLS = {
  chat: "https://chat.hirearya.com/dashboard",
  voice: "https://phonecall.hirearya.com/dashboard",
  sales: "https://sales.hirearya.com/dashboard",
};

const PRICING_URL = "https://sales.hirearya.com/#pricing";

async function getTokenParam(): Promise<string> {
  try {
    const supaClient = await getSupaClient();
    const { data: { session } } = await supaClient.auth.getSession();
    if (session?.access_token) {
      return `?sso_token=${encodeURIComponent(session.access_token)}`;
    }
  } catch {}
  return "";
}

export default function ProductSidebar({
  hasChat, hasVoice, hasSales,
  bundleState, collapsed, onToggle,
  onLockedClick, userName, t, onLogout,
}: ProductSidebarProps) {
  const [navigating, setNavigating] = useState<string | null>(null);

  const products = [
    {
      key: "chat" as const,
      label: t("sidebarChat"),
      icon: MessageCircle,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      hoverBg: "hover:bg-blue-500/5",
      unlocked: hasChat,
      isCurrent: true,
    },
    {
      key: "voice" as const,
      label: t("sidebarVoice"),
      icon: Phone,
      color: "text-green-500",
      bg: "bg-green-500/10",
      hoverBg: "hover:bg-green-500/5",
      unlocked: hasVoice,
      isCurrent: false,
    },
    {
      key: "sales" as const,
      label: t("sidebarSales"),
      icon: TrendingUp,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      hoverBg: "hover:bg-purple-500/5",
      unlocked: hasSales,
      isCurrent: false,
    },
  ];

  const handleProductClick = async (product: typeof products[0]) => {
    if (!product.unlocked) {
      onLockedClick(product.key);
      return;
    }
    if (product.isCurrent) return;

    setNavigating(product.key);
    const tokenParam = await getTokenParam();
    window.location.href = PRODUCT_URLS[product.key] + tokenParam;
  };

  const getUpsellButton = () => {
    if (bundleState === "ultimate") return null;

    if (bundleState === "bundle_a") {
      return {
        text: collapsed ? "" : t("sidebarAddSales"),
        shortText: "+",
        icon: Crown,
        href: PRICING_URL,
      };
    }

    return {
      text: collapsed ? "" : t("sidebarUnlockSuite"),
      shortText: "↑",
      icon: Rocket,
      href: PRICING_URL,
    };
  };

  const upsell = getUpsellButton();

  return (
    <aside
      className={`hidden lg:flex flex-col border-r bg-muted/30 transition-all duration-200 shrink-0 ${
        collapsed ? "w-[60px]" : "w-[220px]"
      }`}
      data-testid="container-product-sidebar"
    >
      <div className="flex items-center justify-between p-3 border-b">
        {!collapsed && (
          <div className="flex items-center gap-1.5">
            <Globe className="w-5 h-5" />
            <span className="font-semibold text-sm">HireArya</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7 shrink-0"
          onClick={onToggle}
          data-testid="button-sidebar-toggle"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      <div className="flex-1 py-2">
        {!collapsed && (
          <div className="px-3 mb-1">
            <span className="text-[10px] font-medium uppercase text-muted-foreground tracking-wider">
              {t("sidebarProducts")}
            </span>
          </div>
        )}

        <nav className="space-y-0.5 px-1.5">
          {products.map((product) => {
            const Icon = product.icon;
            const isNav = navigating === product.key;

            return (
              <button
                key={product.key}
                onClick={() => handleProductClick(product)}
                className={`w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors
                  ${product.isCurrent ? "bg-primary/10 text-primary font-medium" : product.unlocked ? `${product.hoverBg} text-foreground` : "text-muted-foreground opacity-60 hover:opacity-80"}
                  ${collapsed ? "justify-center px-0" : ""}
                `}
                disabled={isNav}
                data-testid={`button-sidebar-${product.key}`}
              >
                <div className={`w-7 h-7 rounded-md ${product.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-3.5 h-3.5 ${product.color}`} />
                </div>
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left truncate">{product.label}</span>
                    {!product.unlocked && <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                    {product.unlocked && !product.isCurrent && <ExternalLink className="w-3 h-3 text-muted-foreground/50 shrink-0" />}
                    {product.isCurrent && (
                      <Badge variant="secondary" className="text-[9px] h-4 px-1.5 shrink-0">
                        {t("sidebarCurrent")}
                      </Badge>
                    )}
                  </>
                )}
                {collapsed && !product.unlocked && (
                  <Lock className="w-2.5 h-2.5 absolute -top-0.5 -right-0.5 text-muted-foreground" />
                )}
              </button>
            );
          })}
        </nav>

        {upsell && (
          <div className="px-1.5 mt-3">
            <a href={upsell.href} target="_blank" rel="noopener noreferrer" data-testid="link-sidebar-upsell">
              <Button
                variant="outline"
                size="sm"
                className={`w-full gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/5 ${collapsed ? "px-0" : ""}`}
              >
                <upsell.icon className="w-3.5 h-3.5 shrink-0" />
                {collapsed ? upsell.shortText : upsell.text}
              </Button>
            </a>
          </div>
        )}
      </div>

      <div className="border-t p-2">
        {!collapsed && userName && (
          <div className="px-1.5 mb-1.5 truncate text-xs text-muted-foreground" data-testid="text-sidebar-user">
            {userName}
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className={`w-full gap-1.5 text-xs text-muted-foreground ${collapsed ? "px-0 justify-center" : "justify-start"}`}
          onClick={onLogout}
          data-testid="button-sidebar-logout"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          {!collapsed && t("sidebarLogout")}
        </Button>
      </div>
    </aside>
  );
}
