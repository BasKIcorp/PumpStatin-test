import { PdfBuilder } from "./PdfBuilder";

export function PdfPlaceholder({ profileId }: { profileId?: string }) {
  return (
    <div className="h-full">
      <PdfBuilder profileId={profileId} />
    </div>
  );
}
