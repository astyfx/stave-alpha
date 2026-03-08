import { MessageSquarePlus, Sparkles } from "lucide-react";
import { Button, Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle, Kbd, KbdGroup, KbdSeparator } from "@/components/ui";

interface EmptySplashProps {
  onCreateTask?: () => void;
  showCreateTaskAction?: boolean;
}

export function EmptySplash({ onCreateTask, showCreateTaskAction = false }: EmptySplashProps) {
  return (
    <section className="flex min-h-0 flex-1 items-center justify-center px-6 py-10">
      <Empty data-testid="empty-splash" className="border-none p-0">
        <EmptyHeader className="max-w-xl gap-3">
          <EmptyMedia variant="icon" className="size-14 rounded-2xl bg-primary/10 text-primary [&_svg:not([class*='size-'])]:size-7">
            <Sparkles strokeWidth={1.5} />
          </EmptyMedia>
          <div className="space-y-2">
            <EmptyTitle className="text-2xl font-semibold">Stave</EmptyTitle>
            <EmptyDescription className="text-sm">
              Select a task to continue, or create one to start a new conversation with your agent.
            </EmptyDescription>
          </div>
        </EmptyHeader>
        {showCreateTaskAction ? (
          <EmptyContent>
            <Button onClick={onCreateTask}>
              <MessageSquarePlus className="size-4" />
              New Task
              <KbdGroup className="ml-1" aria-label="Keyboard shortcut Ctrl N">
                <Kbd>Ctrl</Kbd>
                <KbdSeparator>+</KbdSeparator>
                <Kbd>N</Kbd>
              </KbdGroup>
            </Button>
          </EmptyContent>
        ) : null}
      </Empty>
    </section>
  );
}
