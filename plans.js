// plans.js
// Reading plans: the plan definitions and the reader's progress through them.
//
// A plan is a list of days and is not tied to the calendar. Progress is the
// set of days marked complete, so a missed day never puts the reader
// "behind": the next day to read is simply the first one not yet done.

import { db } from './db.js';

let plansCache = null;

export async function loadPlans() {
  if (!plansCache) {
    const response = await fetch('data-plans.json');
    if (!response.ok) throw new Error('The reading plans could not be loaded.');
    plansCache = (await response.json()).plans;
  }
  return plansCache;
}

export async function plan(id) {
  return (await loadPlans()).find((item) => item.id === id) || null;
}

/** Progress records for every plan the reader has started, keyed by plan id. */
export async function allProgress() {
  const rows = await db.all('plans');
  return new Map(rows.map((row) => [row.id, row]));
}

export async function progress(planId) {
  return (await db.get('plans', planId)) || null;
}

export async function startPlan(planId) {
  const record = { id: planId, started: new Date().toISOString(), done: {} };
  await db.put('plans', record);
  return record;
}

export async function stopPlan(planId) {
  await db.remove('plans', planId);
}

/** Mark a day (zero-based) complete or not. Returns the updated record. */
export async function setDayDone(planId, dayIndex, done) {
  const record = (await progress(planId)) || { id: planId, started: new Date().toISOString(), done: {} };
  if (done) record.done[dayIndex] = new Date().toISOString();
  else delete record.done[dayIndex];
  await db.put('plans', record);
  return record;
}

/** Index of the first day not yet complete, or -1 when the plan is finished. */
export function nextDay(planDefinition, record) {
  for (let index = 0; index < planDefinition.days.length; index += 1) {
    if (!record || !record.done[index]) return index;
  }
  return -1;
}

export function doneCount(record) {
  return record ? Object.keys(record.done).length : 0;
}
