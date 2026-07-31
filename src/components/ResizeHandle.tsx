import { useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

interface ResizeHandleProps {
  orientation: "vertical" | "horizontal";
  /**
   * Called with the pixel delta since the previous move.
   * For a vertical handle the delta is horizontal (dx); for a horizontal
   * handle it is vertical (dy).
   */
  onDelta: (delta: number) => void;
  /** Nudge distance in px for keyboard arrow keys. Defaults to 16. */
  keyboardStep?: number;
  /** Optional reset action, invoked on double-click and Home key. */
  onReset?: () => void;
  ariaLabel: string;
}

export function ResizeHandle({
  orientation,
  onDelta,
  keyboardStep = 16,
  onReset,
  ariaLabel,
}: ResizeHandleProps) {
  const isVertical = orientation === "vertical";
  const lastPos = useRef<number | null>(null);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (lastPos.current === null) return;
      const pos = isVertical ? event.clientX : event.clientY;
      const delta = pos - lastPos.current;
      lastPos.current = pos;
      if (delta !== 0) onDelta(delta);
    },
    [isVertical, onDelta],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      lastPos.current = isVertical ? event.clientX : event.clientY;
      event.currentTarget.setPointerCapture(event.pointerId);
      document.body.style.userSelect = "none";
      document.body.style.cursor = isVertical ? "col-resize" : "row-resize";
    },
    [isVertical],
  );

  const endDrag = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (lastPos.current === null) return;
    lastPos.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const decrease = isVertical ? "ArrowLeft" : "ArrowUp";
      const increase = isVertical ? "ArrowRight" : "ArrowDown";
      if (event.key === decrease) {
        event.preventDefault();
        onDelta(-keyboardStep);
      } else if (event.key === increase) {
        event.preventDefault();
        onDelta(keyboardStep);
      } else if (event.key === "Home" && onReset) {
        event.preventDefault();
        onReset();
      }
    },
    [isVertical, keyboardStep, onDelta, onReset],
  );

  return (
    <div
      role="separator"
      aria-orientation={isVertical ? "vertical" : "horizontal"}
      aria-label={ariaLabel}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={onReset}
      onKeyDown={handleKeyDown}
      className={cn(
        "group relative shrink-0 touch-none bg-border transition-colors hover:bg-primary/40 focus-visible:bg-primary/50 focus-visible:outline-none",
        isVertical
          ? "w-px cursor-col-resize self-stretch"
          : "h-px cursor-row-resize",
      )}
    >
      {/* Invisible enlarged hit area for easier grabbing. */}
      <span
        aria-hidden
        className={cn(
          "absolute",
          isVertical
            ? "inset-y-0 -left-1 -right-1"
            : "inset-x-0 -top-1 -bottom-1",
        )}
      />
    </div>
  );
}
