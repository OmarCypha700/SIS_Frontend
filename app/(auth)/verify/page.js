import { VerifyForm } from "@/components/transcripts/verify-form";

export const metadata = { title: "Verify a transcript" };

/** Public: anyone holding a transcript can check it here. No sign-in needed. */
export default function VerifyPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Verify a transcript</h1>
        <p className="text-sm text-muted-foreground">
          Enter the code printed on an official transcript to confirm it was issued by this institution and is still
          valid.
        </p>
      </div>
      <VerifyForm />
    </div>
  );
}
