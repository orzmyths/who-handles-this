import { useEffect, useMemo } from "react";
import { ClerkProvider, SignIn, SignUp, useAuth } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, Switch, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "./language-context";
import { AuthGuard } from "./components/AuthGuard";
import { DemoSessionNotice } from "./components/DemoSessionNotice";
import { ResidentHome } from "./pages/ResidentHome";
import { RoutingHistory } from "./pages/RoutingHistory";
import { PublicHome } from "./pages/PasscodeGate";
import { StaffLayout } from "./components/StaffLayout";
import { StaffQueue } from "./pages/StaffQueue";
import { StaffCaseDetail } from "./pages/StaffCaseDetail";
import NotFound from "@/pages/not-found";
import { ErrorBoundary } from "@/components/error-boundary";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path;
}
const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#2d7075", colorForeground: "#1d3540", colorMutedForeground: "#566b75",
    colorBackground: "#fcfaf6", colorInput: "#ffffff", colorInputForeground: "#1d3540",
    colorDanger: "#a5433b", colorNeutral: "#566b75", fontFamily: "'DM Sans', sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#fcfaf6] rounded-2xl w-[440px] max-w-full overflow-hidden",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[#1d3540]", headerSubtitle: "text-[#566b75]",
    socialButtonsBlockButtonText: "text-[#1d3540]", formFieldLabel: "text-[#1d3540]",
    footerActionLink: "text-[#2d7075]", footerActionText: "text-[#566b75]",
    dividerText: "text-[#566b75]", identityPreviewEditButton: "text-[#2d7075]",
    formFieldSuccessText: "text-[#2d7075]", alertText: "text-[#a5433b]",
  },
};

function SessionRoutes() {
  const { userId, isLoaded, isSignedIn } = useAuth();
  // Replacing the cache synchronously on identity change prevents even a
  // one-frame flash of another resident's reports. Keyed UI clears form state.
  const queryClient = useMemo(() => new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
  }), [userId]);
  useEffect(() => () => { void queryClient.cancelQueries(); queryClient.clear(); }, [queryClient]);
  return <QueryClientProvider client={queryClient}>
    <LanguageProvider key={userId ?? "signed-out"}>
      <TooltipProvider>
        <DemoSessionNotice />
        <Switch>
          <Route path="/">{!isLoaded ? <p className="p-8">Loading your account…</p> : isSignedIn ? <Redirect to="/reports" /> : <PublicHome />}</Route>
          <Route path="/sign-in/*?"><div className="min-h-screen flex items-center justify-center p-6">
            <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
          </div></Route>
          <Route path="/sign-up/*?"><div className="min-h-screen flex items-center justify-center p-6">
            <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
          </div></Route>
          <Route path="/reports"><AuthGuard><ResidentHome /></AuthGuard></Route>
          <Route path="/history"><AuthGuard><RoutingHistory /></AuthGuard></Route>
          <Route path="/staff"><AuthGuard staff><StaffLayout><StaffQueue /></StaffLayout></AuthGuard></Route>
          <Route path="/staff/:id">{params => <AuthGuard staff><StaffLayout><StaffCaseDetail id={params.id!} /></StaffLayout></AuthGuard>}</Route>
          <Route component={NotFound} />
        </Switch>
        <Toaster />
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return <ClerkProvider
    publishableKey={clerkPubKey}
    proxyUrl={clerkProxyUrl}
    appearance={clerkAppearance}
    signInUrl={`${basePath}/sign-in`}
    signUpUrl={`${basePath}/sign-up`}
    signInFallbackRedirectUrl={`${basePath}/reports`}
    signUpFallbackRedirectUrl={`${basePath}/reports`}
    localization={{
      signIn: { start: { title: "Welcome back", subtitle: "Sign in to Who Handles This?" } },
      signUp: { start: { title: "Create your account", subtitle: "Keep your report history separate from other residents" } },
    }}
    routerPush={to => setLocation(stripBase(to))}
    routerReplace={to => setLocation(stripBase(to), { replace: true })}
  ><SessionRoutes /></ClerkProvider>;
}

export default function App() {
  return <ErrorBoundary><WouterRouter base={basePath}><ClerkProviderWithRoutes /></WouterRouter></ErrorBoundary>;
}
