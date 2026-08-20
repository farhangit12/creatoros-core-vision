import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/** Click-to-open full-size preview for a generated image/thumbnail --
 * deliberately separate from any card's own "select this option" click
 * handler (callers stopPropagation before opening this). */
export function ImageLightbox({
  url,
  onOpenChange,
  alt = "",
}: {
  url: string | null;
  onOpenChange: (open: boolean) => void;
  alt?: string;
}) {
  return (
    <Dialog open={url !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl border-none bg-transparent p-0 shadow-none">
        <DialogTitle className="sr-only">Full-size preview</DialogTitle>
        {url ? (
          <img
            src={url}
            alt={alt}
            className="max-h-[85vh] w-full rounded-lg border border-border object-contain"
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
