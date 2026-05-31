export function getDropdownPos(event: MouseEvent, width = 224): { top: number; left: number } {
  const r = (event.currentTarget as HTMLElement).getBoundingClientRect();
  return { top: r.bottom + 4, left: r.right - width };
}
