import { Button } from "@/components/ui";

interface ConfirmationCompactProps {
  toolName: string;
  description: string;
  state: "approval-requested" | "approval-responded" | "output-denied";
  onApprove?: () => void;
  onReject?: () => void;
}

export function ConfirmationCompact(args: ConfirmationCompactProps) {
  const { toolName, description, state, onApprove, onReject } = args;

  return (
    <div className="rounded-md border bg-card p-3 text-sm">
      <p className="font-semibold text-foreground">Approval required: {toolName}</p>
      <p className="mt-1 text-muted-foreground">{description}</p>
      {state === "approval-requested" ? (
        <div className="mt-2 flex items-center gap-2">
          <Button size="sm" onClick={onApprove}>Approve</Button>
          <Button size="sm" variant="outline" onClick={onReject}>Reject</Button>
        </div>
      ) : (
        <p className="mt-2 text-muted-foreground">Decision: {state}</p>
      )}
    </div>
  );
}
