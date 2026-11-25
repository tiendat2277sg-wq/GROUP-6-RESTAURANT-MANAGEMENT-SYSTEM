import test from 'node:test';
import assert from 'node:assert/strict';
import { shiftClock, attendanceWindow } from '../src/utils/shiftWindow.js';
import { getSchedules, assignSchedule, updateScheduleAttendance } from '../src/controllers/scheduleController.js';

test('shiftWindow exports valid SQL fragments for lunch (10-14) and dinner (17-21) shifts', () => {
  assert.match(shiftClock, /SYSDATETIME\(\)/);
  assert.match(attendanceWindow, /BETWEEN 10 AND 14 THEN 10/);
  assert.match(attendanceWindow, /BETWEEN 17 AND 21 THEN 17/);
});

test('scheduleController exports expected handlers', () => {
  assert.equal(typeof getSchedules, 'function');
  assert.equal(typeof assignSchedule, 'function');
  assert.equal(typeof updateScheduleAttendance, 'function');
});
