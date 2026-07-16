import { AvatarEditor } from "@/components/avatar-editor";
import { SiteHeader } from "@/components/site-header";

export default function EditorPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <AvatarEditor />
      </main>
    </>
  );
}
