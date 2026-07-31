/**
 * Matches an ISO 8601 UTC timestamp (must end in `Z`), e.g.
 * `2025-04-30T17:00:00Z` or `2025-04-30T17:00:00.123Z`.
 */
export const UTC_DATE_REGEX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

/** True when `value` is a UTC ISO date string this module can localise. */
export function isUtcDateString(value: string): boolean {
  return UTC_DATE_REGEX.test(value);
}

/**
 * Convert a UTC ISO string to a humanised local time in the given IANA time zone,
 * e.g. `"April 30, 2025 5:00 PM AWST"`. Returns `null` when the input is not a
 * valid UTC date or the time zone is not recognised.
 */
export function formatUtcInTimeZone(
  iso: string,
  timeZone: string,
): string | null {
  if (!isUtcDateString(iso)) return null;

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZoneName: "short",
    }).formatToParts(date);

    const get = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((p) => p.type === type)?.value ?? "";

    const month = get("month");
    const day = get("day");
    const year = get("year");
    const hour = get("hour");
    const minute = get("minute");
    const dayPeriod = get("dayPeriod");
    const tzName = get("timeZoneName");

    return `${month} ${day}, ${year} ${hour}:${minute} ${dayPeriod} ${tzName}`.trim();
  } catch {
    // Invalid IANA time zone -> caller shows nothing.
    return null;
  }
}
