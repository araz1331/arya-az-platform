import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Crown, Lock, Rocket, MessageCircle, Phone, TrendingUp, CheckCircle2, ArrowRight } from "lucide-react";

export type BundleState = "none" | "single_chat" | "single_voice" | "single_sales" | "bundle_a" | "ultimate";

export interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  lockedProduct: "chat" | "voice" | "sales" | null;
  bundleState: BundleState;
  t: (key: any) => string;
}

const PRODUCT_INFO = {
  chat: {
    icon: MessageCircle,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  voice: {
    icon: Phone,
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  sales: {
    icon: TrendingUp,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
};

const PRICING_URL = "https://sales.hirearya.com/#pricing";

export function getBundleState(hasCh: boolean, hasVo: boolean, hasSa: boolean): BundleState {
  if (hasCh && hasVo && hasSa) return "ultimate";
  if (hasCh && hasVo) return "bundle_a";
  if (hasCh) return "single_chat";
  if (hasVo) return "single_voice";
  if (hasSa) return "single_sales";
  return "none";
}

export default function UpgradeModal({ open, onClose, lockedProduct, bundleState, t }: UpgradeModalProps) {
  if (!lockedProduct) return null;

  const product = PRODUCT_INFO[lockedProduct];
  const ProductIcon = product.icon;

  const isBundleA = bundleState === "bundle_a";

  const getTitle = () => {
    if (isBundleA && lockedProduct === "sales") {
      return t("upgradeToUltimate");
    }
    return t("upgradeUnlock");
  };

  const getDescription = () => {
    if (isBundleA && lockedProduct === "sales") {
      return t("upgradeUltimateDesc");
    }
    if (bundleState === "none") {
      return t("upgradeNoSubDesc");
    }
    return t("upgradeSingleDesc");
  };

  const getCtaText = () => {
    if (isBundleA && lockedProduct === "sales") {
      return t("upgradeAddSales");
    }
    return t("upgradeFullSuite");
  };

  const getFeatures = () => {
    const features = [];
    if (lockedProduct === "chat" || isBundleA) {
      features.push({ icon: MessageCircle, text: t("upgradeFeatureChat"), color: "text-blue-500" });
    }
    if (lockedProduct === "voice" || isBundleA) {
      features.push({ icon: Phone, text: t("upgradeFeatureVoice"), color: "text-green-500" });
    }
    if (lockedProduct === "sales") {
      features.push({ icon: TrendingUp, text: t("upgradeFeatureSales"), color: "text-purple-500" });
    }
    return features;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-upgrade-modal">
        <DialogHeader>
          <div className="flex items-center justify-center mb-3">
            <div className={`w-14 h-14 rounded-full ${product.bg} flex items-center justify-center`}>
              <Lock className={`w-6 h-6 ${product.color}`} />
            </div>
          </div>
          <DialogTitle className="text-center text-xl" data-testid="text-upgrade-title">
            {getTitle()}
          </DialogTitle>
          <DialogDescription className="text-center" data-testid="text-upgrade-desc">
            {getDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-4">
          {isBundleA && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3" data-testid="container-bundle-a-status">
              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
              <span>{t("upgradeCurrentBundleA")}</span>
            </div>
          )}

          {getFeatures().map((feat, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <div className={`w-8 h-8 rounded-md ${feat.color === "text-blue-500" ? "bg-blue-500/10" : feat.color === "text-green-500" ? "bg-green-500/10" : "bg-purple-500/10"} flex items-center justify-center shrink-0`}>
                <feat.icon className={`w-4 h-4 ${feat.color}`} />
              </div>
              <span>{feat.text}</span>
            </div>
          ))}
        </div>

        {isBundleA && (
          <div className="text-center mb-2">
            <Badge variant="secondary" className="text-xs" data-testid="badge-price-diff">
              <Crown className="w-3 h-3 mr-1" />
              {t("upgradePriceDiff")}
            </Badge>
          </div>
        )}

        {bundleState !== "none" && bundleState !== "ultimate" && !isBundleA && (
          <div className="text-center mb-2">
            <Badge variant="secondary" className="text-xs" data-testid="badge-save-30">
              <Rocket className="w-3 h-3 mr-1" />
              {t("upgradeSave30")}
            </Badge>
          </div>
        )}

        <a
          href={PRICING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full"
          data-testid="link-upgrade-pricing"
        >
          <Button className="w-full gap-2" size="lg">
            <Crown className="w-4 h-4" />
            {getCtaText()}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </a>

        <p className="text-xs text-center text-muted-foreground mt-1" data-testid="text-upgrade-footer">
          {t("upgradeFooter")}
        </p>
      </DialogContent>
    </Dialog>
  );
}
