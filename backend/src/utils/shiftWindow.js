// Attendance and payment timestamps are stored in the SQL server's local clock.
export const shiftClock = `
  DECLARE @now datetime2 = SYSDATETIME();
  DECLARE @offset int = 0; -- SYSDATETIME() is rewritten to Vietnam time in db.js
`;

// The date and shift start hour together identify the shared restaurant shift.
export const attendanceWindow = `
  CROSS APPLY (SELECT DATEADD(MINUTE,@offset,w.started_at) AS vn_start) local_time
  CROSS APPLY (SELECT CASE WHEN DATEPART(HOUR,vn_start) BETWEEN 10 AND 14 THEN 10
                           WHEN DATEPART(HOUR,vn_start) BETWEEN 17 AND 21 THEN 17 END AS shift_hour) slot
  CROSS APPLY (SELECT DATEADD(MINUTE,-@offset,DATEADD(HOUR,shift_hour,
    CONVERT(datetime2,CONVERT(date,vn_start)))) AS shift_start) bounds
`;

