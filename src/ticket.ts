let counter = 0;

export function nextTicketId(): string {
  counter++;
  return `NGL-${String(counter).padStart(5, "0")}`;
}

export function resetCounter(): void {
  counter = 0;
}
