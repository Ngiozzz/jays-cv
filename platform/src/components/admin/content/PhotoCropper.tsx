"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Icon } from "@/components/icons/Icon";

type Props = {
  file: File;
  // Width ÷ height of the frame the website shows the photo in
  aspect: number;
  // Width of the finished photo in pixels
  outputWidth: number;
  onDone: (cropped: File) => void;
  onCancel: () => void;
};

const MAX_ZOOM = 4;
const FRAME_WIDTH = 300;

type View = { zoom: number; x: number; y: number };

// Drag the photo to place it in the frame and zoom with the slider; "Use this photo" cuts out exactly
// what's inside the frame. Everything happens in the browser: only the finished photo is uploaded.
export function PhotoCropper({ file, aspect, outputWidth, onDone, onCancel }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [view, setView] = useState<View>({ zoom: 1, x: 0, y: 0 });
  const drag = useRef<{ startX: number; startY: number; from: View } | null>(null);
  const frame = { w: FRAME_WIDTH, h: Math.round(FRAME_WIDTH / aspect) };

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setImage(img);
      setView(centred(img, frame, 1));
    };
    img.src = url;
    dialog.current?.showModal();
    return () => URL.revokeObjectURL(url);
    // The frame size never changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  // The scale at which the photo just covers the frame (zoom 1)
  const cover = image ? Math.max(frame.w / image.naturalWidth, frame.h / image.naturalHeight) : 1;
  const shown = image
    ? { w: image.naturalWidth * cover * view.zoom, h: image.naturalHeight * cover * view.zoom }
    : { w: 0, h: 0 };

  // The photo always fills the frame: no empty edges
  const clamp = (next: View): View => {
    if (!image) return next;
    const w = image.naturalWidth * cover * next.zoom;
    const h = image.naturalHeight * cover * next.zoom;
    return {
      zoom: next.zoom,
      x: Math.min(0, Math.max(frame.w - w, next.x)),
      y: Math.min(0, Math.max(frame.h - h, next.y)),
    };
  };

  // Zooming keeps the middle of the frame where it is
  const zoomTo = (zoom: number) =>
    setView((current) => {
      const ratio = zoom / current.zoom;
      const cx = frame.w / 2;
      const cy = frame.h / 2;
      return clamp({ zoom, x: cx - (cx - current.x) * ratio, y: cy - (cy - current.y) * ratio });
    });

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { startX: event.clientX, startY: event.clientY, from: view };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!start) return;
    setView(
      clamp({
        zoom: start.from.zoom,
        x: start.from.x + event.clientX - start.startX,
        y: start.from.y + event.clientY - start.startY,
      }),
    );
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 30 : 10;
    const move: Record<string, [number, number]> = {
      ArrowLeft: [step, 0],
      ArrowRight: [-step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    const delta = move[event.key];
    if (!delta) return;
    event.preventDefault();
    setView((current) => clamp({ ...current, x: current.x + delta[0], y: current.y + delta[1] }));
  };

  const finish = async () => {
    if (!image) return;
    const scale = cover * view.zoom;
    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = Math.round(outputWidth / aspect);
    canvas
      .getContext("2d")
      ?.drawImage(
        image,
        -view.x / scale,
        -view.y / scale,
        frame.w / scale,
        frame.h / scale,
        0,
        0,
        canvas.width,
        canvas.height,
      );
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
    if (!blob) return onCancel();
    const name = file.name.replace(/\.\w+$/, "") + ".jpg";
    dialog.current?.close();
    onDone(new File([blob], name, { type: "image/jpeg" }));
  };

  const cancel = () => {
    dialog.current?.close();
    onCancel();
  };

  return (
    <dialog
      ref={dialog}
      className="admin-dialog cropper-dialog"
      aria-labelledby="crop-title"
      onCancel={(event) => {
        event.preventDefault();
        cancel();
      }}
    >
      <div className="dialog-body">
        <h2 id="crop-title">Adjust your photo</h2>
        <p>Drag the photo to move it, and use the slider to zoom. The website shows what&apos;s inside the frame.</p>
        <div
          className="cropper-frame"
          style={{ width: frame.w, height: frame.h }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
          onKeyDown={onKeyDown}
          tabIndex={0}
          role="img"
          aria-label="Photo position. Use the arrow keys to move it."
        >
          {image ? (
            <img
              src={image.src}
              alt=""
              draggable={false}
              style={{ width: shown.w, height: shown.h, transform: `translate(${view.x}px, ${view.y}px)` }}
            />
          ) : (
            <span className="hint-sm">Loading…</span>
          )}
        </div>
        <label className="cropper-zoom">
          <Icon name="search" />
          <span className="sr-only">Zoom</span>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={view.zoom}
            onChange={(event) => zoomTo(Number(event.target.value))}
            disabled={!image}
          />
        </label>
        <div className="dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={cancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={finish} disabled={!image}>
            <Icon name="check" />
            Use this photo
          </button>
        </div>
      </div>
    </dialog>
  );
}

// The photo centred in the frame at the given zoom
function centred(img: HTMLImageElement, frame: { w: number; h: number }, zoom: number): View {
  const cover = Math.max(frame.w / img.naturalWidth, frame.h / img.naturalHeight);
  return {
    zoom,
    x: (frame.w - img.naturalWidth * cover * zoom) / 2,
    y: (frame.h - img.naturalHeight * cover * zoom) / 2,
  };
}
