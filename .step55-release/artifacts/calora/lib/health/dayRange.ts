export type HealthDayRange = {
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime: string;
};

/** Returns the device-local calendar day, preserving daylight-saving boundaries. */
export function currentLocalDayRange(now = new Date()): HealthDayRange {
  const startDate = new Date(now);
  startDate.setHours(0, 0, 0, 0);
  return {
    startDate,
    endDate: now,
    startTime: startDate.toISOString(),
    endTime: now.toISOString(),
  };
}