import { BottomNav, SideNav } from "@/components/nav";
import { ServiceWorkerRegistrar } from "@/components/sw-registrar";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh w-full">
      <SideNav />
      <div className="flex-1 min-w-0">
        <main className="mx-auto w-full max-w-2xl px-4 pt-safe pb-24 md:pb-8 lg:max-w-5xl lg:px-8">
          {children}
        </main>
      </div>
      <BottomNav />
      <ServiceWorkerRegistrar />
    </div>
  );
}
