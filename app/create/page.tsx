import type { Metadata } from "next";
import { Suspense } from "react";
import { CreateExperience } from "@/components/create-experience";
import { PublicSiteHeader } from "@/components/public-site-header";
import { TrafficLogger } from "@/components/traffic-logger";

export const metadata: Metadata = {
  title: "Create your Yalemoji",
  description: "One avatar. All your Yale apps. Create a Yalemoji that feels like you."
};

export default function CreatePage() {
  return (
    <>
      <PublicSiteHeader activePage="home" />
      <Suspense fallback={null}><TrafficLogger /></Suspense>
      <CreateExperience />
    </>
  );
}
