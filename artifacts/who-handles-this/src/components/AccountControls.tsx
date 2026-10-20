import { useClerk, useUser } from "@clerk/react";
import { useGetAccessStatus } from "@workspace/api-client-react";
import { Link } from "wouter";

export function AccountControls() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { data } = useGetAccessStatus({
    query: {
      queryKey: ["/api/access/status", user?.id],
      enabled: Boolean(user),
      staleTime: 0,
      refetchOnWindowFocus: true,
    },
  });
  return <div className="flex flex-wrap items-center gap-3 text-xs">
    {data?.staff && <Link href="/staff" className="underline" data-testid="link-staff">Staff review</Link>}
    {data?.demo ? <span data-testid="demo-account-label">Shared demo account</span> : <details>
      <summary className="cursor-pointer" data-testid="account-summary">My account</summary>
      <p className="break-all" data-testid="account-id">{user?.id}</p>
      <p>Share this account ID with the app owner if you need staff approval.</p>
    </details>}
    <button type="button" className="underline" data-testid="button-sign-out"
      onClick={() => signOut({ redirectUrl: import.meta.env.BASE_URL })}>Sign out</button>
  </div>;
}
