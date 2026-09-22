const MODULE_ID = "lipatos-item-charges-lock";
const HINT = "Количество изменяет только ГМ";

function isRestrictedPlayer() {
  return !!game.user && !game.user.isGM;
}

function getRoot(app, html) {
  if (html instanceof HTMLElement) return html;
  if (html?.[0] instanceof HTMLElement) return html[0];
  if (app?.element instanceof HTMLElement) return app.element;
  if (app?.element?.[0] instanceof HTMLElement) return app.element[0];
  return null;
}

const FIELD_SELECTORS = [
  'input[name="system.uses.value"]',
  'input[name="system.uses.spent"]',
  'input[name="system.uses.max"]',
  'select[name="system.uses.value"]',
  'select[name="system.uses.spent"]',
  'select[name="system.uses.max"]',
  '[data-path="system.uses.value"]',
  '[data-path="system.uses.spent"]',
  '[data-path="system.uses.max"]',
  '[data-property="system.uses.value"]',
  '[data-property="system.uses.spent"]',
  '[data-property="system.uses.max"]',
  '[data-target="system.uses.value"]',
  '[data-target="system.uses.spent"]',
  '[data-target="system.uses.max"]'
].join(',');

function markHint(el) {
  if (!(el instanceof HTMLElement)) return;
  el.setAttribute('title', HINT);
  el.setAttribute('data-tooltip', HINT);
  el.setAttribute('aria-label', HINT);
}

function stop(event) {
  if (!isRestrictedPlayer()) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
  return false;
}

function findChargeContext(el) {
  if (!(el instanceof HTMLElement)) return null;

  const directField = el.matches?.(FIELD_SELECTORS) ? el : el.closest?.(FIELD_SELECTORS);
  if (directField) return directField;

  const chargeClass = el.closest?.(
    '.item-uses, .uses-value, .uses, .charges, [data-column="uses"], [data-column="charges"], [data-field="uses"]'
  );
  if (chargeClass) return chargeClass;

  const row = el.closest?.('[data-item-id], .item');
  if (!row) return null;

  let node = el;
  for (let i = 0; node && node !== row && i < 4; i++, node = node.parentElement) {
    const text = (node.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (/^\d+\s*\/\s*\d+$/.test(text)) return node;
  }

  return null;
}

function protectFields(root) {
  if (!isRestrictedPlayer() || !root) return;

  for (const el of root.querySelectorAll(FIELD_SELECTORS)) {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      el.readOnly = true;
      el.tabIndex = -1;
    }
    if ('disabled' in el) el.disabled = false;
    el.setAttribute('aria-disabled', 'true');
    markHint(el);
  }

  for (const cell of root.querySelectorAll('.item-uses, .uses-value, .uses, .charges, [data-column="uses"], [data-column="charges"], [data-field="uses"]')) {
    markHint(cell);
  }

  for (const row of root.querySelectorAll('[data-item-id], .item')) {
    for (const node of row.querySelectorAll('*')) {
      const text = (node.textContent ?? '').replace(/\s+/g, ' ').trim();
      if (/^\d+\s*\/\s*\d+$/.test(text)) {
        markHint(node);
      }
    }
  }

  if (root.dataset?.lipatosChargesGuard === '1') return;
  if (root.dataset) root.dataset.lipatosChargesGuard = '1';

  const handler = (event) => {
    if (!isRestrictedPlayer()) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const ctx = findChargeContext(target);
    if (!ctx) return;
    markHint(ctx);
    stop(event);
  };

  for (const type of ['pointerdown', 'mousedown', 'click', 'dblclick', 'contextmenu', 'change', 'input']) {
    root.addEventListener(type, handler, true);
  }

  root.addEventListener('keydown', (event) => {
    if (!['Enter', ' ', 'ArrowUp', 'ArrowDown', '+', '-'].includes(event.key)) return;
    handler(event);
  }, true);
}

function patch(app, html) {
  if (!isRestrictedPlayer()) return;
  const root = getRoot(app, html);
  if (!root) return;

  const run = () => protectFields(root);
  run();

  if (!root._lipatosChargesObserver) {
    const observer = new MutationObserver(() => queueMicrotask(run));
    observer.observe(root, { childList: true, subtree: true });
    root._lipatosChargesObserver = observer;
  }
}

Hooks.on('renderActorSheet', patch);
Hooks.on('renderActorSheetV2', patch);
Hooks.on('renderItemSheet', patch);
Hooks.on('renderItemSheetV2', patch);
Hooks.on('renderApplicationV2', patch);

Hooks.once('ready', () => {
  console.log(`${MODULE_ID} | 1.0.1 ready`);
});
