import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { submitFeedback } from "@/lib/server/feedback";

export function FeedbackDialog() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const mutation = useMutation({
    mutationFn: () => submitFeedback({ data: { message, route: pathname } }),
    onSuccess: () => {
      toast.success("Thanks — your feedback was sent.");
      setMessage("");
      setOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Couldn't send feedback. Try again in a moment.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Send feedback"
        className="grid size-9 shrink-0 place-items-center rounded-lg text-text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
        onClick={() => setOpen(true)}
      >
        <MessageSquarePlus className="size-[18px]" />
      </Button>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Send feedback</DialogTitle>
          <DialogDescription>
            Found a bug or have an idea? This goes straight to the team.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What happened, or what would help?"
          rows={5}
          maxLength={4000}
          autoFocus
        />
        <DialogFooter>
          <Button
            type="button"
            disabled={!message.trim() || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Sending…" : "Send feedback"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
