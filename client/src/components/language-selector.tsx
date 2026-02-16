import { useLanguage } from "@/hooks/use-language";
import { LANGUAGES, type Language } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";

export function LanguageSelector({ variant = "default" }: { variant?: "default" | "hero" }) {
  const { language, setLanguage } = useLanguage();
  const current = LANGUAGES.find(l => l.code === language);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant === "hero" ? "ghost" : "outline"}
          size="sm"
          className={variant === "hero" ? "text-white border-white/30 bg-white/10 gap-1.5" : "gap-1.5"}
          data-testid="button-language-selector"
        >
          <Globe className="w-3.5 h-3.5" />
          <span className="text-xs uppercase">{current?.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={language === lang.code ? "bg-accent" : ""}
            data-testid={`button-lang-${lang.code}`}
          >
            <span className="font-medium">{lang.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
