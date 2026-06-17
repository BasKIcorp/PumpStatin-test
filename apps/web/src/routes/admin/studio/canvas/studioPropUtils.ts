export function getNested(props: Record<string, unknown>, key: string): unknown {
  const parts = key.split(".");
  let val: unknown = props;
  for (const p of parts) {
    if (val === null || val === undefined) return undefined;
    val = (val as Record<string, unknown>)[p];
  }
  return val;
}

export function setNested(
  props: Record<string, unknown>,
  key: string,
  value: unknown,
): Record<string, unknown> {
  const parts = key.split(".");
  if (parts.length === 1) {
    return { ...props, [key]: value };
  }
  const result = { ...props };
  let current = result;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    const next = (current[part] as Record<string, unknown> | undefined) ?? {};
    current[part] = { ...next };
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
  return result;
}
