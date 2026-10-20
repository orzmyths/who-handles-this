import { useAuth } from "@clerk/react";
import { useGetAccessStatus } from "@workspace/api-client-react";

export function DemoSessionNotice() {
  const { userId } = useAuth();
  const { data } = useGetAccessStatus({
    query: {
      queryKey: ["/api/access/status", userId],
      enabled: Boolean(userId),
      staleTime: 0,
      refetchOnWindowFocus: true,
    },
  });
  if (!data?.demo) return null;
  return <aside role="note" data-testid="shared-demo-notice"
    className="border-b border-primary/25 bg-secondary px-5 py-3 text-center text-sm">
    <strong>Shared demo account.</strong> Use made-up information only. Everyone with the demo
    passcode can see these test reports. Staff tools and other residents’ reports are not accessible.
  </aside>;
}