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

export const buildAppDateTime = (dayString, hour, minute, second = 0) =>
  new Date(
    `${dayString}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}${APP_TIMEZONE_OFFSET}`,
  );

export const getAppMonth = (date = new Date()) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: APP_TIMEZONE,
      month: "numeric",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );

  return Number(parts.month);
};

export const getAppYear = (date = new Date()) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: APP_TIMEZONE,
      year: "numeric",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );

  return Number(parts.year);
};
