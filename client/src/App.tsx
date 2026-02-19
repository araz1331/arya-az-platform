import { useState, useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { LanguageProvider } from "@/hooks/use-language";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import AuthPage from "@/pages/auth";
import GlobalAuthPage from "@/pages/global-auth";
import GlobalDashboard from "@/pages/global-dashboard";
import AdminPage from "@/pages/admin";
import SmartProfile from "@/pages/smart-profile";
import EmbedChat from "@/pages/embed-chat";
import GlobalHome from "@/pages/global-home";
import AboutPage from "@/pages/about";
import ConsentModal from "@/components/consent-modal";

const LANG_PREFIX = "/az";

function getSlugFromPath(): string | null {
  const match = window.location.pathname.match(/^\/u\/([^/]+)/);
  return match ? match[1] : null;
}

function getEmbedSlug(): string | null {
  const match = window.location.pathname.match(/^\/embed\/([^/]+)/);
  return match ? match[1] : null;
}

function isRootPath(): boolean {
  const path = window.location.pathname;
  return path === "/" || path === "";
}

function isAboutPath(): boolean {
  const path = window.location.pathname;
  return path === "/about" || path === "/about/";
}

function isDashboardPath(): boolean {
  const path = window.location.pathname;
  return path === "/dashboard" || path.startsWith("/dashboard/");
}

function isAzPath(): boolean {
  const path = window.location.pathname;
  return path === LANG_PREFIX || path.startsWith(LANG_PREFIX + "/");
}

function getAzSubPath(): string {
  const path = window.location.pathname;
  if (path === LANG_PREFIX) return "/";
  return path.slice(LANG_PREFIX.length);
}

function getRedirectForLegacy(): string | null {
  return null;
}

function AzContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [started, setStarted] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showAdmin, setShowAdmin] = useState(() => {
    if (!isAzPath()) return false;
    const subPath = getAzSubPath();
    return subPath === "/admin";
  });
  const [smartSlug, setSmartSlug] = useState<string | null>(() => getSlugFromPath());

  useEffect(() => {
    const handlePopState = () => {
      setSmartSlug(getSlugFromPath());

      if (isAzPath()) {
        const subPath = getAzSubPath();
        if (subPath === "/admin") {
          setShowAdmin(true);
        } else if (subPath === "/") {
          setShowAdmin(false);
          setStarted(false);
        }
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const { data: adminCheck } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/check"],
    enabled: isAuthenticated,
    retry: false,
  });

  const isAdmin = adminCheck?.isAdmin === true;

  useEffect(() => {
    if (isAzPath()) {
      const subPath = getAzSubPath();
      if (subPath === "/admin" && isAuthenticated && isAdmin) {
        setShowAdmin(true);
      }
    }
  }, [isAuthenticated, isAdmin]);

  const handleStart = () => {
    if (isLoading) return;
    if (!isAuthenticated) {
      setShowAuth(true);
      return;
    }
    const hasConsented = sessionStorage.getItem("arya_consent");
    if (hasConsented === "true") {
      setStarted(true);
    } else {
      setShowConsent(true);
    }
  };

  useEffect(() => {
    if (!isLoading && isAuthenticated && showAuth) {
      setShowAuth(false);
      const hasConsented = sessionStorage.getItem("arya_consent");
      if (hasConsented === "true") {
        setStarted(true);
      } else {
        setShowConsent(true);
      }
    }
  }, [isLoading, isAuthenticated, showAuth]);

  const handleConsentAccept = () => {
    sessionStorage.setItem("arya_consent", "true");
    setShowConsent(false);
    setStarted(true);
  };

  const handleConsentDecline = () => {
    setShowConsent(false);
  };

  if (smartSlug) {
    return (
      <SmartProfile
        slug={smartSlug}
        onBack={() => {
          setSmartSlug(null);
          window.history.replaceState({}, "", LANG_PREFIX);
        }}
      />
    );
  }

  if (showAdmin && !isAuthenticated && !isLoading) {
    return <AuthPage onBack={() => { setShowAdmin(false); window.history.replaceState({}, '', LANG_PREFIX); }} />;
  }

  if (showAuth && !isAuthenticated) {
    return <AuthPage onBack={() => setShowAuth(false)} />;
  }

  if (showAdmin && isAdmin) {
    return <AdminPage onBack={() => { setShowAdmin(false); window.history.replaceState({}, '', LANG_PREFIX); }} />;
  }

  if (isAuthenticated && started) {
    return <Home onBack={() => setStarted(false)} isAdmin={isAdmin} onAdminClick={() => { setShowAdmin(true); window.history.pushState({}, '', `${LANG_PREFIX}/admin`); }} />;
  }

  const handleDemoClick = (slug: string) => {
    setSmartSlug(slug);
    window.history.pushState({}, "", `/u/${slug}`);
  };

  return (
    <>
      <Landing onStart={handleStart} onLogin={() => setShowAuth(true)} onDemoClick={handleDemoClick} />
      <ConsentModal
        open={showConsent}
        onAccept={handleConsentAccept}
        onDecline={handleConsentDecline}
      />
    </>
  );
}

function AzGeoGate() {
  const [status, setStatus] = useState<"loading" | "allowed" | "blocked">("loading");

  useEffect(() => {
    fetch("/api/geo")
      .then(res => res.json())
      .then((data: any) => {
        if (data.isAz) {
          setStatus("allowed");
        } else {
          setStatus("blocked");
        }
      })
      .catch(() => {
        setStatus("blocked");
      });
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  if (status === "blocked") {
    window.location.replace("/");
    return null;
  }

  return <AzContent />;
}

function isAdminPath(): boolean {
  const path = window.location.pathname;
  return path === "/admin" || path.startsWith("/admin/");
}

function GlobalContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [showAdmin, setShowAdmin] = useState(isAdminPath());

  const { data: adminCheck } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/check"],
    enabled: isAuthenticated,
    retry: false,
  });

  const isAdmin = adminCheck?.isAdmin === true;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <GlobalAuthPage onBack={() => { window.location.href = "/"; }} />;
  }

  if (showAdmin && isAdmin) {
    return <AdminPage onBack={() => { setShowAdmin(false); window.history.replaceState({}, '', '/dashboard'); }} />;
  }

  return <GlobalDashboard onBack={() => { window.location.href = "/"; }} isAdmin={isAdmin} onAdminClick={() => { setShowAdmin(true); window.history.pushState({}, '', '/admin'); }} />;
}

function App() {
  const embedSlug = getEmbedSlug();
  if (embedSlug) {
    return <EmbedChat slug={embedSlug} />;
  }

  const legacyRedirect = getRedirectForLegacy();
  if (legacyRedirect) {
    window.location.replace(legacyRedirect);
    return null;
  }

  if (isRootPath()) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <GlobalHome />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  if (isAboutPath()) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <AboutPage />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  if (isAdminPath() || isDashboardPath()) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <GlobalContent />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  if (getSlugFromPath()) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <LanguageProvider>
            <Toaster />
            <AzContent />
          </LanguageProvider>
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  if (isAzPath()) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <LanguageProvider>
            <Toaster />
            <AzGeoGate />
          </LanguageProvider>
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  window.location.replace("/");
  return null;
}

export default App;
