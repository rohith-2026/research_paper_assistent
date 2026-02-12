const IST_TIME_ZONE = "Asia/Kolkata";
const IST_OFFSET = "+05:30";
const DEFAULT_LOCALE = "en-IN";

const mergeTimeZone = (options?: Intl.DateTimeFormatOptions) => ({
  timeZone: IST_TIME_ZONE,
  ...options,
});

const originalToLocaleString = Date.prototype.toLocaleString;
Date.prototype.toLocaleString = function (locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
  return originalToLocaleString.call(this, locales ?? DEFAULT_LOCALE, mergeTimeZone(options));
};

const originalToLocaleDateString = Date.prototype.toLocaleDateString;
Date.prototype.toLocaleDateString = function (locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
  return originalToLocaleDateString.call(this, locales ?? DEFAULT_LOCALE, mergeTimeZone(options));
};

const originalToLocaleTimeString = Date.prototype.toLocaleTimeString;
Date.prototype.toLocaleTimeString = function (locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
  return originalToLocaleTimeString.call(this, locales ?? DEFAULT_LOCALE, mergeTimeZone(options));
};

const istParts = (date: Date) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const lookup: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") lookup[part.type] = part.value;
  }
  return {
    year: lookup.year,
    month: lookup.month,
    day: lookup.day,
    hour: lookup.hour,
    minute: lookup.minute,
    second: lookup.second,
  };
};

export const toIstIsoString = (date: Date = new Date()) => {
  const p = istParts(date);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}${IST_OFFSET}`;
};

export const toIstDateKey = (date: Date = new Date()) => {
  const p = istParts(date);
  return `${p.year}-${p.month}-${p.day}`;
};

export const startOfIstDay = (date: Date = new Date()) => {
  return new Date(`${toIstDateKey(date)}T00:00:00${IST_OFFSET}`);
};

export const toIstInputValue = (value: string | Date | null | undefined) => {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const p = istParts(d);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
};

export const parseIstInputValue = (value: string) => {
  if (!value) return null;
  const d = new Date(`${value}${IST_OFFSET}`);
  if (Number.isNaN(d.getTime())) return null;
  return toIstIsoString(d);
};

export const getIstYear = (date: Date = new Date()) => Number(istParts(date).year);
export const getIstHour = (date: Date = new Date()) => Number(istParts(date).hour);

export { IST_TIME_ZONE, IST_OFFSET, DEFAULT_LOCALE };
