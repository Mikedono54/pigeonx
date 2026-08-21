export function encodeForm(data: Record<string, string>): string {
  return Object.keys(data)
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(data[k])}`)
    .join('&');
}

export async function submitNetlifyForm(
  formName: string,
  form: HTMLFormElement,
): Promise<boolean> {
  const entries: Record<string, string> = { 'form-name': formName };
  new FormData(form).forEach((value, key) => {
    if (typeof value === 'string') entries[key] = value;
  });
  try {
    const res = await fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: encodeForm(entries),
    });
    return res.ok;
  } catch {
    return false;
  }
}
