import { useState } from "react";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, ShoppingBag, Calendar, Check, Loader2, Headphones, Languages, Bot, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import type { Profile, Voucher, ShopItem } from "@shared/schema";
import type { TranslationKey } from "@/lib/i18n";

const LOCALE_MAP: Record<string, string> = {
  az: "az-AZ",
  en: "en-US",
  fr: "fr-FR",
  es: "es-ES",
  ru: "ru-RU",
};

function formatActivationDate(dateStr: string, lang: string): string {
  const locale = LOCALE_MAP[lang] || "az-AZ";
  const d = new Date(dateStr);
  return d.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
}

const SHOP_ITEMS_KEYS: { id: string; nameKey: TranslationKey; descKey: TranslationKey; cost: number; activationDateISO: string; icon: string }[] = [
  {
    id: "secretary",
    nameKey: "shopSecretary",
    descKey: "shopSecretaryDesc",
    cost: 1000,
    activationDateISO: "2026-05-15",
    icon: "headphones",
  },
  {
    id: "translator",
    nameKey: "shopTranslator",
    descKey: "shopTranslatorDesc",
    cost: 500,
    activationDateISO: "2026-07-01",
    icon: "languages",
  },
  {
    id: "assistant",
    nameKey: "shopAssistant",
    descKey: "shopAssistantDesc",
    cost: 750,
    activationDateISO: "2026-08-15",
    icon: "bot",
  },
  {
    id: "reader",
    nameKey: "shopReader",
    descKey: "shopReaderDesc",
    cost: 300,
    activationDateISO: "2026-09-01",
    icon: "book",
  },
];

const iconMap: Record<string, typeof Headphones> = {
  headphones: Headphones,
  languages: Languages,
  bot: Bot,
  book: BookOpen,
};

interface ShopProps {
  user: Profile | null;
  vouchers: Voucher[];
  onPurchase: (itemId: string) => void;
  isPurchasing: boolean;
}

export default function Shop({ user, vouchers, onPurchase, isPurchasing }: ShopProps) {
  const { t, language } = useLanguage();
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  const handlePurchase = (itemId: string) => {
    setPurchasingId(itemId);
    onPurchase(itemId);
  };

  const hasVoucher = (itemId: string) => {
    return vouchers.some(v => v.itemName === itemId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-primary" />
            {t("shop")}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {t("shopSubtitle")}
          </p>
        </div>
        {user && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary/10">
            <Coins className="w-4 h-4 text-primary" />
            <span className="font-semibold" data-testid="text-shop-balance">{user.tokens.toLocaleString()}</span>
            <span className="text-sm text-muted-foreground">A-Coin</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SHOP_ITEMS_KEYS.map((item, i) => {
          const Icon = iconMap[item.icon] || Bot;
          const owned = hasVoucher(item.id);
          const canAfford = user ? user.tokens >= item.cost : false;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className={`p-6 h-full flex flex-col ${owned ? 'opacity-80' : 'hover-elevate'}`}>
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-md bg-primary/10 text-primary shrink-0">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg leading-tight">{t(item.nameKey)}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        <Coins className="w-3 h-3 mr-1" />
                        {item.cost.toLocaleString()} A-Coin
                      </Badge>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-4 flex-1">{t(item.descKey)}</p>

                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    {t("activation")}: {formatActivationDate(item.activationDateISO, language)}
                  </div>
                  {owned ? (
                    <Badge variant="secondary" className="gap-1">
                      <Check className="w-3 h-3" />
                      {t("ordered")}
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      disabled={!canAfford || isPurchasing}
                      onClick={() => handlePurchase(item.id)}
                      data-testid={`button-purchase-${item.id}`}
                    >
                      {isPurchasing && purchasingId === item.id ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      ) : null}
                      {canAfford ? t("order") : t("notEnough")}
                    </Button>
                  )}
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {vouchers.length > 0 && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Check className="w-5 h-5 text-primary" />
            {t("yourOrders")}
          </h3>
          <div className="space-y-3">
            {vouchers.map((v) => {
              const item = SHOP_ITEMS_KEYS.find(si => si.id === v.itemName);
              return (
                <div
                  key={v.id}
                  className="flex items-center justify-between py-2 border-b last:border-b-0"
                  data-testid={`voucher-row-${v.id}`}
                >
                  <div>
                    <p className="text-sm font-medium">{item ? t(item.nameKey) : v.itemName}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("activation")}: {v.activationDate}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {v.status === "pending" ? t("pending") : t("active")}
                  </Badge>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
