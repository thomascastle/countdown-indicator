export interface CountdownTimeDelta {
  readonly total: number;
  readonly days: number;
  readonly hours: number;
  readonly minutes: number;
  readonly seconds: number;
  readonly milliseconds: number;
  readonly completed: boolean;
}

export interface CountdownTimeDeltaFormatOptions {
  readonly daysInHours?: boolean;
  readonly zeroPadTime?: number;
  readonly zeroPadDays?: number;
}

export interface CountdownTimeDeltaFormatted {
  readonly days: string;
  readonly hours: string;
  readonly minutes: string;
  readonly seconds: string;
}

export interface CountdownTimeDeltaOptions {
  readonly now?: () => number;
  readonly precision?: number;
  readonly controlled?: boolean;
  readonly offsetTime?: number;
  readonly overtime?: boolean;
}

export const timeDeltaFormatOptionsDefaults: CountdownTimeDeltaFormatOptions = {
  daysInHours: false,
  zeroPadTime: 2,
};

export function calcTimeDelta(
  date: Date | string | number,
  options: CountdownTimeDeltaOptions = {}
): CountdownTimeDelta {
  const {
    now = Date.now,
    precision = 0,
    controlled,
    offsetTime = 0,
    overtime,
  } = options;
  let startTimestamp: number;

  if (typeof date === "string") {
    startTimestamp = new Date(date).getTime();
  } else if (date instanceof Date) {
    startTimestamp = date.getTime();
  } else {
    startTimestamp = date;
  }

  if (!controlled) {
    startTimestamp += offsetTime;
  }

  const timeLeft = controlled ? startTimestamp : startTimestamp - now();
  const clampedPrecision = Math.min(20, Math.max(0, precision));
  const total = Math.round(
    parseFloat(
      ((overtime ? timeLeft : Math.max(0, timeLeft)) / 1000).toFixed(
        clampedPrecision
      )
    ) * 1000
  );
  const seconds = Math.abs(total) / 1000;

  return {
    total,
    days: Math.floor(seconds / (3600 * 24)),
    hours: Math.floor((seconds / 3600) % 24),
    minutes: Math.floor((seconds / 60) % 60),
    seconds: Math.floor(seconds % 60),
    milliseconds: Number(((seconds % 1) * 1000).toFixed()),
    completed: total <= 0,
  };
}

export function formatTimeDelta(
  timeDelta: CountdownTimeDelta,
  options?: CountdownTimeDeltaFormatOptions
): CountdownTimeDeltaFormatted {
  const { days, hours, minutes, seconds } = timeDelta;
  const { daysInHours, zeroPadTime, zeroPadDays = zeroPadTime } = {
    ...timeDeltaFormatOptionsDefaults,
    ...options,
  };

  const zeroPadTimeLength = Math.min(2, zeroPadTime);
  const formattedHours = daysInHours
    ? zeroPad(hours + days * 24, zeroPadTime)
    : zeroPad(hours, zeroPadTimeLength);

  return {
    days: daysInHours ? "" : zeroPad(days, zeroPadDays),
    hours: formattedHours,
    minutes: zeroPad(minutes, zeroPadTimeLength),
    seconds: zeroPad(seconds, zeroPadTimeLength),
  };
}

export function zeroPad(value: number | string, length: number = 2): string {
  const strValue = String(value);
  if (length === 0) return strValue;

  const match = strValue.match(/(.*?)([0-9]+)(.*)/);
  const prefix = match ? match[1] : "";
  const suffix = match ? match[3] : "";
  const strNo = match ? match[2] : strValue;
  const paddedNo =
    strNo.length >= length
      ? strNo
      : ([...Array(length)].map(() => "0").join("") + strNo).slice(length * -1);

  return `${prefix}${paddedNo}${suffix}`;
}
