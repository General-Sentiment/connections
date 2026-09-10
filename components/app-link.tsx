"use client";

import NextLink, { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";

function NavigationStatus() {
  const { pending } = useLinkStatus();
  return <span hidden aria-busy={pending} />;
}

export default function Link({ children, ...props }: ComponentProps<typeof NextLink>) {
  return <NextLink {...props}>{children}<NavigationStatus /></NextLink>;
}
