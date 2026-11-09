"use client";

import { Suspense, type ComponentProps } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { withPageContext } from "@/lib/page-context";

type ContextLinkProps = Omit<ComponentProps<typeof Link>, "href"> & { href: string };

function ResolvedContextLink({ href, ...props }: ContextLinkProps) {
  const searchParams = useSearchParams();
  return <Link {...props} prefetch={false} href={withPageContext(href, searchParams?.toString() ?? "")} />;
}

export function ContextLink(props: ContextLinkProps) {
  return (
    <Suspense fallback={<Link {...props} prefetch={false} />}>
      <ResolvedContextLink {...props} />
    </Suspense>
  );
}
