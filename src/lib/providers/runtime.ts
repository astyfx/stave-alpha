import { NormalizedProviderEventSchema, type ParsedNormalizedProviderEvent } from "@/lib/providers/schemas";

export function parseNormalizedEvent(args: { payload: unknown }): ParsedNormalizedProviderEvent | null {
  const parsed = NormalizedProviderEventSchema.safeParse(args.payload);
  if (parsed.success) {
    return parsed.data;
  }

  console.error("[provider-runtime] dropped invalid event", parsed.error.flatten());
  return null;
}
