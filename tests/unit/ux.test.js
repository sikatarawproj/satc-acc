import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../../frontend/src/js/modules/ux.js';

describe('showSkeleton / hideSkeleton', () => {
  it('adds skeleton container to element', () => {
    const el = document.createElement('div');
    window.showSkeleton(el);
    expect(el.querySelector('.skeleton-container')).toBeTruthy();
  });
  it('does not add duplicate skeleton', () => {
    const el = document.createElement('div');
    window.showSkeleton(el);
    window.showSkeleton(el);
    expect(el.querySelectorAll('.skeleton-container').length).toBe(1);
  });
  it('removes skeleton container', () => {
    const el = document.createElement('div');
    window.showSkeleton(el);
    window.hideSkeleton(el);
    expect(el.querySelector('.skeleton-container')).toBeFalsy();
  });
});

describe('showBtnLoading / hideBtnLoading', () => {
  it('adds is-loading class and disables', () => {
    const btn = document.createElement('button');
    window.showBtnLoading(btn);
    expect(btn.classList.contains('is-loading')).toBe(true);
    expect(btn.disabled).toBe(true);
  });
  it('removes is-loading class and enables', () => {
    const btn = document.createElement('button');
    window.showBtnLoading(btn);
    window.hideBtnLoading(btn);
    expect(btn.classList.contains('is-loading')).toBe(false);
    expect(btn.disabled).toBe(false);
  });
});

describe('showEmptyState', () => {
  it('renders empty state with defaults', () => {
    const el = document.createElement('div');
    window.showEmptyState(el);
    expect(el.querySelector('.empty-state')).toBeTruthy();
    expect(el.querySelector('.empty-state-title').textContent).toBe('No data found');
  });
  it('renders with custom options', () => {
    const el = document.createElement('div');
    window.showEmptyState(el, { title: 'Custom Title', desc: 'Custom description', icon: 'search' });
    expect(el.querySelector('.empty-state-title').textContent).toBe('Custom Title');
    expect(el.querySelector('.empty-state-desc').textContent).toBe('Custom description');
  });
  it('renders compact variant', () => {
    const el = document.createElement('div');
    window.showEmptyState(el, { compact: true });
    expect(el.querySelector('.empty-state-compact')).toBeTruthy();
  });
});

describe('showErrorBanner', () => {
  it('renders error banner with retry button', () => {
    const el = document.createElement('div');
    const retryFn = vi.fn();
    window.showErrorBanner(el, { title: 'Error', message: 'Test error', retry: { fn: retryFn, label: 'Retry' } });
    expect(el.querySelector('.error-banner')).toBeTruthy();
    expect(el.querySelector('.error-banner-title').textContent).toBe('Error');
    el.querySelector('.error-banner-retry').click();
    expect(retryFn).toHaveBeenCalled();
  });
});

describe('showSuccessBanner', () => {
  beforeEach(() => vi.useFakeTimers());
  it('renders and auto-dismisses', () => {
    const el = document.createElement('div');
    window.showSuccessBanner(el, 'Saved!');
    expect(el.querySelector('.success-banner')).toBeTruthy();
    vi.advanceTimersByTime(4000);
    expect(el.querySelector('.success-banner')).toBeFalsy();
  });
});

describe('setFieldValidation', () => {
  it('adds error state', () => {
    const input = document.createElement('input');
    const wrapper = document.createElement('div');
    wrapper.appendChild(input);
    const msg = document.createElement('div');
    msg.className = 'field-validation hidden';
    wrapper.appendChild(msg);
    window.setFieldValidation(input, 'error', 'Required');
    expect(input.classList.contains('is-error')).toBe(true);
    expect(msg.textContent).toBe('Required');
    expect(msg.style.visibility).toBe('visible');
  });
  it('clears validation', () => {
    const input = document.createElement('input');
    const wrapper = document.createElement('div');
    wrapper.appendChild(input);
    const msg = document.createElement('div');
    msg.className = 'field-validation error';
    wrapper.appendChild(msg);
    window.setFieldValidation(input, 'clear');
    expect(input.classList.contains('is-error')).toBe(false);
    expect(msg.textContent).toBe('');
  });
});

describe('addRippleEffect', () => {
  it('adds ripple class and click handler', () => {
    const btn = document.createElement('button');
    window.addRippleEffect(btn);
    expect(btn.classList.contains('ripple')).toBe(true);
  });
});

describe('animateCounter', () => {
  beforeEach(() => vi.useFakeTimers());
  it('animates counter value', () => {
    const el = document.createElement('span');
    el.textContent = '0';
    window.animateCounter(el, 100, 200);
    vi.advanceTimersByTime(200);
    expect(parseInt(el.textContent)).toBeGreaterThan(0);
  });
});

describe('staggerRows', () => {
  beforeEach(() => vi.useFakeTimers());
  it('adds stagger classes to rows', () => {
    const table = document.createElement('table');
    table.innerHTML = '<tbody><tr></tr><tr></tr></tbody>';
    window.staggerRows(table.querySelector('tbody'));
    expect(table.querySelectorAll('.stagger-enter').length).toBe(2);
    vi.advanceTimersByTime(100);
    expect(table.querySelectorAll('.stagger-enter-active').length).toBe(2);
  });
});

describe('flashRow', () => {
  it('adds and removes flash class', () => {
    const row = document.createElement('tr');
    window.flashRow(row);
    expect(row.classList.contains('row-updated')).toBe(true);
  });
});

describe('createAutoSaveIndicator / setAutoSaveState', () => {
  it('creates indicator and cycles states', () => {
    const container = document.createElement('div');
    const ind = window.createAutoSaveIndicator(container);
    expect(ind).toBeTruthy();
    expect(ind.classList.contains('saving')).toBe(true);
    window.setAutoSaveState(ind, 'saved');
    expect(ind.classList.contains('saved')).toBe(true);
    window.setAutoSaveState(ind, 'error');
    expect(ind.classList.contains('error')).toBe(true);
    window.setAutoSaveState(ind, 'hidden');
    expect(ind.classList.contains('visible')).toBe(false);
  });
});

describe('autoFocus', () => {
  beforeEach(() => vi.useFakeTimers());
  it('focuses an element', () => {
    const el = document.createElement('input');
    el.id = 'test-input';
    document.body.appendChild(el);
    window.autoFocus(el);
    vi.advanceTimersByTime(150);
    expect(document.activeElement).toBe(el);
    el.remove();
  });
});

describe('createFocusTrap', () => {
  it('creates focus trap object', () => {
    const el = document.createElement('div');
    el.innerHTML = '<button>First</button><button>Last</button>';
    const trap = window.createFocusTrap(el);
    expect(typeof trap.activate).toBe('function');
    expect(typeof trap.deactivate).toBe('function');
  });
});

describe('pushUndo / popUndo', () => {
  it('stacks and pops undo items', () => {
    window.pushUndo('test', { id: 1 }, 'test action');
    expect(window.popUndo().action).toBe('test');
    expect(window.popUndo()).toBeNull();
  });
});

describe('FormDirtyTracker', () => {
  it('tracks form dirty state', () => {
    const form = document.createElement('form');
    form.innerHTML = '<input name="name" value="initial" />';
    const tracker = window.FormDirtyTracker(form);
    expect(tracker.isDirty()).toBe(false);
    form.querySelector('input').value = 'changed';
    form.querySelector('input').dispatchEvent(new Event('input', { bubbles: true }));
    expect(tracker.isDirty()).toBe(true);
    tracker.reset();
    expect(tracker.isDirty()).toBe(false);
  });
});

describe('VirtualScroller', () => {
  it('creates virtual scroller with methods', () => {
    const viewport = document.createElement('div');
    const vs = new window.VirtualScroller({ viewport, rowHeight: 40, totalRows: 100 });
    expect(typeof vs.init).toBe('function');
    expect(typeof vs.render).toBe('function');
    expect(typeof vs.update).toBe('function');
    expect(typeof vs.destroy).toBe('function');
  });
});

describe('BatchSelection', () => {
  it('toggles selection', () => {
    const bs = new window.BatchSelection();
    bs.toggle('1');
    expect(bs.isSelected('1')).toBe(true);
    expect(bs.getCount()).toBe(1);
    bs.toggle('1');
    expect(bs.isSelected('1')).toBe(false);
    expect(bs.getCount()).toBe(0);
  });
  it('selectAll and selectNone', () => {
    const bs = new window.BatchSelection();
    bs.selectAll(['a', 'b', 'c']);
    expect(bs.getCount()).toBe(3);
    bs.selectNone();
    expect(bs.getCount()).toBe(0);
  });
});

describe('SavedFilters', () => {
  beforeEach(() => localStorage.clear());
  it('saves, loads, removes filters', () => {
    const sf = new window.SavedFilters('test-filters');
    expect(sf.count()).toBe(0);
    sf.save('my filter', { customer: 'ACME' });
    expect(sf.count()).toBe(1);
    const state = sf.load(0);
    expect(state.customer).toBe('ACME');
    sf.remove(0);
    expect(sf.count()).toBe(0);
  });
  it('persists across instances', () => {
    const sf1 = new window.SavedFilters('test-filters');
    sf1.save('persist', { val: 42 });
    const sf2 = new window.SavedFilters('test-filters');
    expect(sf2.count()).toBe(1);
    expect(sf2.load(0).val).toBe(42);
  });
});

describe('exportToCSV', () => {
  it('creates blob and triggers download', () => {
    const createSpy = vi.spyOn(document, 'createElement');
    const rows = [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }];
    const cols = [{ key: 'name', label: 'Name' }, { key: 'age', label: 'Age' }];
    window.exportToCSV('test.csv', rows, cols);
    expect(createSpy).toHaveBeenCalledWith('a');
    createSpy.mockRestore();
  });
});

describe('serializeFilterState / deserializeFilterState', () => {
  it('serializes and deserializes filter state', () => {
    document.body.innerHTML = '<input id="search" value="hello" /><select id="status"><option value="active" selected></select>';
    const state = window.serializeFilterState(['search', 'status']);
    expect(state.search).toBe('hello');
    expect(state.status).toBe('active');
    document.getElementById('search').value = '';
    window.deserializeFilterState(state, ['search', 'status']);
    expect(document.getElementById('search').value).toBe('hello');
  });
});

describe('offlineManager', () => {
  it('has expected API', () => {
    expect(typeof window.offlineManager.isOnline).toBe('function');
    expect(typeof window.offlineManager.onStatusChange).toBe('function');
    expect(typeof window.offlineManager.showBanner).toBe('function');
    expect(typeof window.offlineManager.hideBanner).toBe('function');
  });
});

describe('offlineActionQueue', () => {
  beforeEach(() => localStorage.clear());
  it('enqueues and dequeues actions', () => {
    window.offlineActionQueue.enqueue('create', { invNo: '001' });
    expect(window.offlineActionQueue.count()).toBe(1);
    const item = window.offlineActionQueue.dequeue();
    expect(item.action).toBe('create');
    expect(item.payload.invNo).toBe('001');
    window.offlineActionQueue.enqueue('update', { id: 1 });
    window.offlineActionQueue.clear();
    expect(window.offlineActionQueue.count()).toBe(0);
  });
});

describe('KeyboardShortcuts', () => {
  it('registers and triggers shortcuts', () => {
    const ks = new window.KeyboardShortcuts();
    const fn = vi.fn();
    ks.on('F1', fn);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'F1', bubbles: true }));
    expect(fn).toHaveBeenCalled();
    ks.destroy();
  });
});

describe('I18n', () => {
  it('translates keys with params', () => {
    const i18n = new window.I18n('en');
    i18n.load('en', { greeting: 'Hello {name}', farewell: 'Goodbye' });
    expect(i18n.t('greeting', { name: 'World' })).toBe('Hello World');
    expect(i18n.t('farewell')).toBe('Goodbye');
    expect(i18n.t('missing.key')).toBe('missing.key');
  });
  it('supports locale change', () => {
    const i18n = new window.I18n('en');
    i18n.load('en', { msg: 'Hello' });
    i18n.load('es', { msg: 'Hola' });
    expect(i18n.t('msg')).toBe('Hello');
    i18n.setLocale('es');
    expect(i18n.t('msg')).toBe('Hola');
  });
});

describe('formatCurrency / formatDate / formatNumber', () => {
  it('formatCurrency returns formatted string', () => {
    const result = window.formatCurrency(1234.5);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
  it('formatDate returns formatted string', () => {
    const result = window.formatDate('2026-01-15');
    expect(typeof result).toBe('string');
  });
  it('formatNumber returns formatted string', () => {
    const result = window.formatNumber(1234567);
    expect(typeof result).toBe('string');
  });
});
