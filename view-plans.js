// view-plans.js
// The list of reading plans, and one plan's days.

import { formatSpan } from './bible.js';
import { go } from './context.js';
import { allProgress, doneCount, loadPlans, nextDay, plan as loadPlan, progress as loadProgress, startPlan, stopPlan } from './plans.js';
import { confirmSheet, el, icon, toast } from './ui.js';

export async function renderList(container) {
  const [plans, progress] = await Promise.all([loadPlans(), allProgress()]);
  container.append(
    el('header', { class: 'reader-bar' },
      el('button', { class: 'back-button', onclick: () => go('#/pray') }, icon('back'), el('span', { text: 'Prayer' }))),
    el('h1', { class: 'page-title', text: 'Reading plans' }));
  for (const item of plans) {
    const record = progress.get(item.id);
    const done = doneCount(record);
    const next = record ? nextDay(item, record) : 0;
    container.append(el('section', { class: 'card' },
      el('h3', { class: 'card-heading', text: item.name }),
      el('p', { class: 'muted', text: item.blurb }),
      record
        ? [
          el('div', { class: 'progress-row' },
            el('span', { text: next === -1 ? 'Finished' : `Day ${next + 1} of ${item.days.length}` }),
            el('span', { class: 'muted', text: `${done} done` })),
          el('span', { class: 'progress-track' }, el('span', { class: 'progress-fill', style: { width: `${(100 * done) / item.days.length}%` } })),
          el('div', { class: 'button-row' },
            el('button', { class: 'button quiet', onclick: () => go(`#/plans/${item.id}`) }, 'All days'),
            next >= 0 ? el('button', { class: 'button', onclick: () => go(`#/plan/${item.id}/${next + 1}`) }, `Read day ${next + 1}`) : null),
        ]
        : el('div', { class: 'button-row' },
          el('button', { class: 'button quiet', onclick: () => go(`#/plans/${item.id}`) }, `See the ${item.days.length} days`),
          el('button', { class: 'button', onclick: async () => { await startPlan(item.id); toast(`${item.name} started`); go(`#/plan/${item.id}/1`); } }, 'Start')),
    ));
  }
}

export async function renderDetail(container, { planId }) {
  const definition = await loadPlan(planId);
  if (!definition) {
    container.append(el('p', { class: 'empty', text: 'That plan does not exist.' }));
    return;
  }
  const record = await loadProgress(planId);
  const next = record ? nextDay(definition, record) : -1;
  const list = el('ol', { class: 'day-list' });
  definition.days.forEach((passages, index) => {
    const done = Boolean(record && record.done[index]);
    list.append(el('li', {},
      el('button', {
        class: `day-row${done ? ' done' : ''}${index === next ? ' next' : ''}`,
        onclick: () => go(`#/plan/${planId}/${index + 1}`),
      },
      el('span', { class: 'day-number', text: index + 1 }),
      el('span', { class: 'day-portion', text: passages.map(([bookId, ...span]) => formatSpan(bookId, span, { short: true })).join(', ') }),
      el('span', { class: 'reading-check' }, done ? icon('check', 18) : null))));
  });

  container.append(
    el('header', { class: 'reader-bar' },
      el('button', { class: 'back-button', onclick: () => go('#/plans') }, icon('back'), el('span', { text: 'Plans' }))),
    el('section', { class: 'card' },
      el('h2', { class: 'card-heading large', text: definition.name }),
      el('p', { class: 'muted', text: definition.blurb }),
      record
        ? el('div', { class: 'button-row' },
          el('button', {
            class: 'button danger quiet',
            onclick: () => confirmSheet('Stop this plan?', 'Your progress in this plan will be erased. Your notes and highlights are not affected.', 'Stop plan', async () => { await stopPlan(planId); toast('Plan stopped'); go('#/plans'); }),
          }, 'Stop plan'),
          next >= 0 ? el('button', { class: 'button', onclick: () => go(`#/plan/${planId}/${next + 1}`) }, `Read day ${next + 1}`) : null)
        : el('button', { class: 'button', onclick: async () => { await startPlan(planId); toast(`${definition.name} started`); go(`#/plan/${planId}/1`); } }, 'Start this plan')),
    list,
  );
  requestAnimationFrame(() => {
    const target = list.querySelector('.day-row.next');
    if (target && next > 4) target.scrollIntoView({ block: 'center' });
  });
}
