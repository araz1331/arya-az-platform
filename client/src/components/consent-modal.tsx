import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/use-language";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, FileText } from "lucide-react";

interface ConsentModalProps {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export default function ConsentModal({ open, onAccept, onDecline }: ConsentModalProps) {
  const { t } = useLanguage();
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (open) setAgreed(false);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onDecline(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 text-primary shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <DialogTitle className="text-xl">
              {t("consentTitle")}
            </DialogTitle>
          </div>
          <DialogDescription>
            {t("consentDesc")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-64 pr-4">
          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <div>
              <h4 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                1. {t("consentPurpose")}
              </h4>
              <p>{t("consentPurposeText")}</p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-1">2. {t("consentVoiceData")}</h4>
              <p>{t("consentVoiceDataText")}</p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-1">3. {t("consentRights")}</h4>
              <p>{t("consentRightsText")}</p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-1">4. {t("consentTokenRewards")}</h4>
              <p>{t("consentTokenRewardsText")}</p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-1">5. {t("consentVoluntary")}</h4>
              <p>{t("consentVoluntaryText")}</p>
            </div>
          </div>
        </ScrollArea>

        <div className="flex items-start gap-3 pt-2">
          <Checkbox
            id="consent"
            checked={agreed}
            onCheckedChange={(checked) => setAgreed(checked === true)}
            data-testid="checkbox-consent"
          />
          <label htmlFor="consent" className="text-sm leading-relaxed cursor-pointer">
            {t("consentCheckbox")}
          </label>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onDecline}
            data-testid="button-consent-decline"
          >
            {t("decline")}
          </Button>
          <Button
            disabled={!agreed}
            onClick={onAccept}
            data-testid="button-consent-accept"
          >
            {t("acceptAndContinue")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
