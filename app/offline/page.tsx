export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="text-4xl mb-3">📡</div>
      <h1 className="text-xl font-semibold">You are offline</h1>
      <p className="text-sm text-muted-foreground mt-2 max-w-xs">
        Coach Greta needs a connection to load your data. Your marks are not
        lost, just reopen when you are back online.
      </p>
    </main>
  );
}
