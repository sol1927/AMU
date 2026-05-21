export const APP_TIMEZONE = "Africa/Addis_Ababa";
export const APP_TIMEZONE_OFFSET = "+03:00";

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const dateTimePartsFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

export const getAppDateTimeParts = (date = new Date()) => {
  const parts = Object.fromEntries(
    dateTimePartsFormatter.formatToParts(date).map((part) => [part.type, part.value]),
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
};

export const getAppDayString = (date = new Date()) => dayFormatter.format(date);

export const getAppMinutesFromDate = (date = new Date()) => {
  const { hour, minute } = getAppDateTimeParts(date);
  return hour * 60 + minute;
};

export const getAppMonth = (date = new Date()) => getAppDateTimeParts(date).month;

export const getAppYear = (date = new Date()) => getAppDateTimeParts(date).year;

export const getDateFromAppDayString = (dayString, timeValue = "00:00:00") =>
  new Date(`${dayString}T${timeValue}${APP_TIMEZONE_OFFSET}`);

export const getDateFromAppDayAndTime = (dayString, timeValue) => {
  if (!dayString || typeof timeValue !== "string") {
    return null;
  }

  const date = getDateFromAppDayString(dayString, `${timeValue}:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};
