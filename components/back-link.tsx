import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function BackLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ChevronLeft className="size-4" /> Back
    </Link>
  );
}
