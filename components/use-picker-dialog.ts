"use client";
import { useEffect, type RefObject } from "react";

export function usePickerDialog(dialog: RefObject<HTMLDialogElement | null>) {
  useEffect(() => {
    const modal = dialog.current;
    if (!modal) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    modal.showModal();
    modal.querySelector<HTMLInputElement>("input")?.focus();
    const viewport = modal.closest(".window-viewport");
    const center = () => {
      if (!viewport) return;
      modal.style.transform = "none";
      const bounds = viewport.getBoundingClientRect();
      const rect = modal.getBoundingClientRect();
      const scale = rect.height / modal.offsetHeight || 1;
      const offset = bounds.top + (bounds.height - rect.height) / 2 - rect.top;
      modal.style.transform = `translateY(${offset / scale}px)`;
    };
    center();
    const observer = new ResizeObserver(center);
    if (viewport) observer.observe(viewport);
    observer.observe(modal);
    window.addEventListener("resize", center);
    return () => { observer.disconnect(); window.removeEventListener("resize", center); modal.close(); requestAnimationFrame(() => { if (trigger?.isConnected) trigger.focus(); }); };
  }, [dialog]);
}
