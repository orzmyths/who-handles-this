import { useAuth } from "@clerk/react";
import { useGetAccessStatus } from "@workspace/api-client-react";
import { Redirect } from "wouter";
import type { ReactNode } from "react";

export function AuthGuard({ children, staff = false }: { children: ReactNode; staff?: boolean }) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const access = useGetAccessStatus({
    query: {
      enabled: Boolean(isLoaded && isSignedIn && staff),
      queryKey: ["/api/access/status", userId],
      retry: false,
      staleTime: 0,
      refetchOnWindowFocus: true,
    },
  });
  if (!isLoaded) return <p className="p-8" role="status">Loading your account…</p>;
  if (!isSignedIn) return <Redirect to="/" />;
  if (staff) {
    if (access.isLoading) return <p className="p-8" role="status">Checking staff access…</p>;
    if (access.isError) return <div className="p-8" role="alert">
      Staff access could not be checked. <button onClick={() => access.refetch()}>Retry</button>
    </div>;
    if (!access.data?.staff) return <div className="p-8" data-testid="staff-access-denied">
      <h1 className="text-xl font-semibold">Staff access is restricted</h1>
      <p className="mt-2">The app owner must explicitly approve your account before you can review reports or change contact sources.</p>
      <a className="underline" href={`${import.meta.env.BASE_URL}reports`}>Return to your reports</a>
    </div>;
  }
  return <>{children}</>;
}
