(function(){
  'use strict';

  /* ---- Skeleton Loader ---- */
  window.showSkeleton = function showSkeleton(container) {
    if (!container) return;
    const existing = container.querySelector('.skeleton-container');
    if (existing) return;
    const el = document.createElement('div');
    el.className = 'skeleton-container';
    el.innerHTML = '<div class="skeleton-table"><div class="skeleton skeleton-table-header"></div>' +
      Array.from({length: 6}, function(){ return '<div class="skeleton skeleton-row"></div>'; }).join('') +
      '</div>';
    el.style.cssText = 'inset:0;position:absolute;z-index:5;background:var(--surface);';
    container.style.position = 'relative';
    container.appendChild(el);
  };

  window.hideSkeleton = function hideSkeleton(container) {
    if (!container) return;
    var el = container.querySelector('.skeleton-container');
    if (el) el.remove();
  };

  /* ---- Loading Spinner for Buttons ---- */
  window.showBtnLoading = function showBtnLoading(btn) {
    if (!btn) return;
    btn.classList.add('is-loading');
    btn.disabled = true;
  };

  window.hideBtnLoading = function hideBtnLoading(btn) {
    if (!btn) return;
    btn.classList.remove('is-loading');
    btn.disabled = false;
  };

  /* ---- Spinner Overlay ---- */
  window.showOverlay = function showOverlay(container) {
    if (!container) return;
    var overlay = container.querySelector('.spinner-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'spinner-overlay';
      overlay.innerHTML = '<div class="spinner spinner-lg"></div>';
      container.style.position = 'relative';
      container.appendChild(overlay);
    }
    overlay.classList.add('active');
  };

  window.hideOverlay = function hideOverlay(container) {
    if (!container) return;
    var overlay = container.querySelector('.spinner-overlay');
    if (overlay) overlay.classList.remove('active');
  };

  /* ---- Empty State ---- */
  function emptySvg(name) {
    var icons = {
      inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 12h-5l-2 3H9l-2-3H2"/><path d="M2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6"/><path d="M5.17 7.83L7 4h10l1.83 3.83"/></svg>',
      search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/></svg>',
      file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
      error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      filters: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>',
      users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>'
    };
    return icons[name] || icons.inbox;
  }

  window.showEmptyState = function showEmptyState(container, opts) {
    if (!container) return;
    opts = opts || {};
    container.innerHTML =
      '<div class="empty-state' + (opts.compact ? ' empty-state-compact' : '') + '">' +
        '<div class="empty-state-icon">' + emptySvg(opts.icon || 'inbox') + '</div>' +
        '<div class="empty-state-title">' + (opts.title || 'No data found') + '</div>' +
        '<div class="empty-state-desc">' + (opts.desc || 'There are no items to display.') + '</div>' +
        (opts.action ? '<div class="empty-state-action"><button class="btn-saas" onclick="(' + opts.action.fn.toString().replace(/"/g, '&quot;') + ')()">' + opts.action.label + '</button></div>' : '') +
      '</div>';
  };

  /* ---- Error Banner ---- */
  window.showErrorBanner = function showErrorBanner(container, opts) {
    if (!container) return;
    opts = opts || {};
    var banner = document.createElement('div');
    banner.className = 'error-banner';
    banner.innerHTML =
      '<div class="error-banner-icon">' + emptySvg('error') + '</div>' +
      '<div class="error-banner-content">' +
        '<div class="error-banner-title">' + (opts.title || 'Something went wrong') + '</div>' +
        '<div class="error-banner-desc">' + (opts.desc || opts.message || 'An unexpected error occurred. Please try again.') + '</div>' +
      '</div>' +
      (opts.retry ? '<button class="error-banner-retry">Retry</button>' : '');
    container.prepend(banner);
    if (opts.retry) {
      var retryBtn = banner.querySelector('.error-banner-retry');
      if (retryBtn) retryBtn.addEventListener('click', opts.retry.fn);
    }
  };

  /* ---- Success Banner ---- */
  window.showSuccessBanner = function showSuccessBanner(container, message) {
    if (!container) return;
    var banner = document.createElement('div');
    banner.className = 'success-banner';
    banner.innerHTML =
      '<div class="success-banner-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>' +
      '<span>' + (message || 'Success') + '</span>';
    container.prepend(banner);
    setTimeout(function(){ banner.remove(); }, 4000);
  };

  /* ---- Inline Field Validation ---- */
  window.setFieldValidation = function setFieldValidation(input, state, message) {
    if (!input) return;
    input.classList.remove('is-error', 'is-success');
    var wrapper = input.closest('.field-wrapper') || input.parentNode;
    var msgEl = wrapper.querySelector('.field-validation');
    if (state === 'error') {
      input.classList.add('is-error');
      if (msgEl) { msgEl.textContent = message || ''; msgEl.className = 'field-validation error'; msgEl.style.visibility = 'visible'; }
    } else if (state === 'success') {
      input.classList.add('is-success');
      if (msgEl) { msgEl.textContent = message || ''; msgEl.className = 'field-validation success'; msgEl.style.visibility = 'visible'; }
    } else {
      input.classList.remove('is-error', 'is-success');
      if (msgEl) { msgEl.textContent = ''; msgEl.className = 'field-validation hidden'; msgEl.style.visibility = 'hidden'; }
    }
  };

  /* ---- Field Wrapper Setup ---- */
  window.setupFieldValidation = function setupFieldValidation(inputId) {
    var input = document.getElementById(inputId);
    if (!input) return;
    var wrapper = input.closest('.field-wrapper');
    if (!wrapper) {
      wrapper = input.parentNode;
      wrapper.classList.add('field-wrapper');
    }
    if (!wrapper.querySelector('.field-validation')) {
      var msg = document.createElement('div');
      msg.className = 'field-validation hidden';
      msg.style.visibility = 'hidden';
      wrapper.appendChild(msg);
    }
  };

  /* ---- Ripple Effect ---- */
  window.addRippleEffect = function addRippleEffect(btn) {
    if (!btn || btn.classList.contains('ripple')) return;
    btn.classList.add('ripple');
    btn.addEventListener('click', function(e) {
      var rect = btn.getBoundingClientRect();
      var size = Math.max(rect.width, rect.height);
      var x = e.clientX - rect.left - size / 2;
      var y = e.clientY - rect.top - size / 2;
      var ripple = document.createElement('span');
      ripple.className = 'ripple-effect';
      ripple.style.cssText = 'width:' + size + 'px;height:' + size + 'px;left:' + x + 'px;top:' + y + 'px;';
      btn.appendChild(ripple);
      setTimeout(function() { ripple.remove(); }, 600);
    });
  };

  /* ---- Counter Animation ---- */
  window.animateCounter = function animateCounter(el, target, duration) {
    if (!el) return;
    duration = duration || 800;
    var start = parseFloat(el.textContent.replace(/[^0-9.-]/g, '')) || 0;
    var prefix = el.textContent.match(/^[^0-9.-]+/) || '';
    prefix = prefix[0] || '';
    var suffix = el.textContent.match(/[^0-9.-]+$/) || '';
    suffix = suffix[0] || '';
    var startTime = performance.now();

    function tick(now) {
      var progress = Math.min((now - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var current = start + (target - start) * eased;
      var formatted = Number.isInteger(target) ? Math.round(current).toLocaleString() : current.toFixed(2);
      el.textContent = prefix + formatted + suffix;
      el.classList.add('animate');
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  };

  /* ---- Toast Progress Bar ---- */
  window.addToastProgress = function addToastProgress(toastEl, duration) {
    if (!toastEl) return;
    duration = duration || 4000;
    var bar = document.createElement('div');
    bar.className = 'toast-progress';
    bar.style.animationDuration = duration + 'ms';
    toastEl.style.position = 'relative';
    toastEl.appendChild(bar);
  };

  /* ---- Staggered Row Reveal ---- */
  window.staggerRows = function staggerRows(container, baseDelay) {
    if (!container) return;
    baseDelay = baseDelay || 50;
    var rows = container.querySelectorAll('tr');
    rows.forEach(function(row, i) {
      row.classList.add('stagger-enter');
      setTimeout(function() {
        row.classList.add('stagger-enter-active');
      }, i * baseDelay);
    });
  };

  /* ---- Flash Updated Row ---- */
  window.flashRow = function flashRow(row) {
    if (!row) return;
    row.classList.remove('row-updated');
    void row.offsetWidth;
    row.classList.add('row-updated');
  };

  /* ---- Auto-save Indicator ---- */
  window.createAutoSaveIndicator = function createAutoSaveIndicator(container) {
    if (!container) return null;
    var el = document.createElement('span');
    el.className = 'auto-save-indicator saving';
    el.innerHTML = '<span class="spinner spinner-sm"></span> Saving...';
    container.appendChild(el);
    return el;
  };

  window.setAutoSaveState = function setAutoSaveState(indicator, state) {
    if (!indicator) return;
    indicator.className = 'auto-save-indicator visible';
    if (state === 'saving') {
      indicator.className = 'auto-save-indicator saving visible';
      indicator.innerHTML = '<span class="spinner spinner-sm"></span> Saving...';
    } else if (state === 'saved') {
      indicator.className = 'auto-save-indicator saved visible';
      indicator.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Saved';
      setTimeout(function() { indicator.classList.remove('visible'); }, 3000);
    } else if (state === 'error') {
      indicator.className = 'auto-save-indicator error visible';
      indicator.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> Save failed';
      setTimeout(function() { indicator.classList.remove('visible'); }, 4000);
    } else if (state === 'dirty') {
      indicator.className = 'auto-save-indicator visible';
      indicator.textContent = 'Unsaved changes';
    } else if (state === 'hidden') {
      indicator.className = 'auto-save-indicator';
    }
  };

  /* ---- Focus Management ---- */
  window.autoFocus = function autoFocus(inputOrId) {
    var el = typeof inputOrId === 'string' ? document.getElementById(inputOrId) : inputOrId;
    if (!el) return;
    setTimeout(function() { el.focus(); }, 100);
  };

  window.createFocusTrap = function createFocusTrap(containerEl) {
    if (!containerEl) return { activate: function(){}, deactivate: function(){} };
    var focusableSelector = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    var lastFocused = null;
    var handler = function(e) {
      if (e.key !== 'Tab') return;
      var focusable = containerEl.querySelectorAll(focusableSelector);
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    return {
      activate: function() {
        lastFocused = document.activeElement;
        var firstFocusable = containerEl.querySelector(focusableSelector);
        if (firstFocusable) firstFocusable.focus();
        containerEl.addEventListener('keydown', handler);
      },
      deactivate: function() {
        containerEl.removeEventListener('keydown', handler);
        if (lastFocused && lastFocused.focus) lastFocused.focus();
      }
    };
  };

  /* ---- Undo Support ---- */
  var undoStack = [];
  window.SATC_UNDO_LIMIT = 10;

  window.pushUndo = function pushUndo(action, data, description) {
    undoStack.push({ action: action, data: JSON.parse(JSON.stringify(data)), description: description || action, timestamp: Date.now() });
    if (undoStack.length > window.SATC_UNDO_LIMIT) undoStack.shift();
  };

  window.popUndo = function popUndo() {
    return undoStack.pop() || null;
  };

  window.showUndoToast = function showUndoToast(description, onUndo) {
    var existing = document.querySelector('.undo-toast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.className = 'undo-toast';
    toast.innerHTML =
      '<span>' + (description || 'Action completed') + '</span>' +
      '<button class="undo-toast-btn">Undo</button>' +
      '<button class="undo-toast-dismiss">&times;</button>';
    document.body.appendChild(toast);
    toast.querySelector('.undo-toast-btn').addEventListener('click', function() {
      toast.classList.add('undo-toast-removing');
      if (onUndo) onUndo();
      setTimeout(function() { toast.remove(); }, 200);
    });
    toast.querySelector('.undo-toast-dismiss').addEventListener('click', function() {
      toast.classList.add('undo-toast-removing');
      setTimeout(function() { toast.remove(); }, 200);
    });
    setTimeout(function() {
      if (toast.parentNode) {
        toast.classList.add('undo-toast-removing');
        setTimeout(function() { if (toast.parentNode) toast.remove(); }, 200);
      }
    }, 5000);
  };

  /* ---- Form Dirty State Tracker ---- */
  window.FormDirtyTracker = function FormDirtyTracker(formEl, callback) {
    if (!formEl) return { isDirty: function(){ return false; }, reset: function(){}, destroy: function(){} };
    var initialData = {};
    var dirty = false;
    function getInputs() {
      return Array.from(formEl.elements || []).filter(function(el) {
        return /^(input|select|textarea)$/i.test(el.tagName);
      });
    }
    function capture() {
      initialData = {};
      getInputs().forEach(function(inp) {
        if (inp.name || inp.id) {
          initialData[inp.name || inp.id] = inp.value;
        }
      });
      dirty = false;
    }
    function checkDirty() {
      var inputs = getInputs();
      for (var i = 0; i < inputs.length; i++) {
        var inp = inputs[i];
        var key = inp.name || inp.id;
        if (key && initialData[key] !== undefined && inp.value !== initialData[key]) {
          if (!dirty) { dirty = true; if (callback) callback(true); }
          return;
        }
      }
      if (dirty) { dirty = false; if (callback) callback(false); }
    }
    var changeHandler = function() { checkDirty(); };
    capture();
    formEl.addEventListener('change', changeHandler);
    formEl.addEventListener('input', changeHandler);
    return {
      isDirty: function() { return dirty; },
      reset: function() { capture(); dirty = false; if (callback) callback(false); },
      destroy: function() {
        formEl.removeEventListener('change', changeHandler);
        formEl.removeEventListener('input', changeHandler);
      }
    };
  };

  /* ---- Infinite Scroll (load-more sentinel) ---- */
  window.setupInfiniteScroll = function setupInfiniteScroll(container, opts) {
    if (!container) return { destroy: function(){} };
    opts = opts || {};
    var threshold = opts.threshold || 200;
    var onLoadMore = opts.onLoadMore || function(){};
    var sentinel = document.createElement('div');
    sentinel.className = 'scroll-sentinel';
    sentinel.innerHTML = '<span class="spinner"></span> Loading more...';
    container.appendChild(sentinel);
    var busy = false;
    var destroyed = false;
    var handler = function() {
      if (destroyed || busy) return;
      var rect = sentinel.getBoundingClientRect();
      var containerRect = container.getBoundingClientRect();
      if (rect.top - containerRect.bottom < threshold) {
        busy = true;
        sentinel.innerHTML = '<span class="spinner"></span> Loading more...';
        var result = onLoadMore(function() {
          busy = false;
          if (!destroyed) sentinel.innerHTML = '';
        });
        if (result && typeof result.then === 'function') {
          result.then(function() { busy = false; if (!destroyed) sentinel.innerHTML = ''; });
        }
      }
    };
    container.addEventListener('scroll', handler, { passive: true });
    setTimeout(handler, 200);
    return {
      destroy: function() {
        destroyed = true;
        container.removeEventListener('scroll', handler);
        if (sentinel.parentNode) sentinel.remove();
      },
      reset: function() { busy = false; }
    };
  };

  /* ---- Virtual Scroller (basic) ---- */
  window.VirtualScroller = function VirtualScroller(opts) {
    var self = this;
    self.viewport = opts.viewport || null;
    self.rowHeight = opts.rowHeight || 40;
    self.overscan = opts.overscan || 5;
    self.totalRows = opts.totalRows || 0;
    self.renderRow = opts.renderRow || function(i){ return '<div>' + i + '</div>'; };
    self.onVisibleRangeChange = opts.onVisibleRangeChange || null;
    self.content = null;
    self.phantom = null;

    self.init = function() {
      if (!self.viewport) return;
      self.viewport.style.position = 'relative';
      self.viewport.style.overflowY = 'auto';
      self.phantom = document.createElement('div');
      self.phantom.className = 'vscroll-phantom';
      self.viewport.appendChild(self.phantom);
      self.content = document.createElement('div');
      self.content.className = 'vscroll-content';
      self.viewport.appendChild(self.content);
      self.viewport.addEventListener('scroll', self.onScroll, { passive: true });
      self.render();
    };

    self.onScroll = function() {
      self.render();
    };

    self.render = function() {
      if (!self.viewport || !self.content) return;
      var scrollTop = self.viewport.scrollTop;
      var viewportHeight = self.viewport.clientHeight;
      var totalHeight = self.totalRows * self.rowHeight;
      self.phantom.style.height = totalHeight + 'px';
      var startIdx = Math.max(0, Math.floor(scrollTop / self.rowHeight) - self.overscan);
      var endIdx = Math.min(self.totalRows, Math.ceil((scrollTop + viewportHeight) / self.rowHeight) + self.overscan);
      if (self._lastStart === startIdx && self._lastEnd === endIdx) return;
      self._lastStart = startIdx;
      self._lastEnd = endIdx;
      var html = '';
      for (var i = startIdx; i < endIdx; i++) {
        html += '<div class="vscroll-row" style="top:' + (i * self.rowHeight) + 'px;height:' + self.rowHeight + 'px;">' + self.renderRow(i) + '</div>';
      }
      self.content.innerHTML = html;
      self.content.style.height = totalHeight + 'px';
      if (self.onVisibleRangeChange) self.onVisibleRangeChange(startIdx, endIdx);
    };

    self.update = function(newTotal) {
      self.totalRows = newTotal;
      self._lastStart = -1;
      self._lastEnd = -1;
      self.render();
    };

    self.destroy = function() {
      if (self.viewport) self.viewport.removeEventListener('scroll', self.onScroll);
      if (self.phantom && self.phantom.parentNode) self.phantom.remove();
      if (self.content && self.content.parentNode) self.content.remove();
    };

    return self;
  };

  /* ---- Batch Selection Manager ---- */
  window.BatchSelection = function BatchSelection(opts) {
    opts = opts || {};
    var items = [];
    var selectedIds = {};
    var onChange = opts.onChange || function(){};
    var toolbarEl = opts.toolbarEl || null;
    var countEl = opts.countEl || null;

    function updateUI() {
      var count = Object.keys(selectedIds).length;
      if (countEl) countEl.textContent = count;
      if (toolbarEl) toolbarEl.style.display = count > 0 ? '' : 'none';
      onChange(Object.keys(selectedIds));
    }

    return {
      setItems: function(newItems, idKey) {
        idKey = idKey || 'id';
        items = newItems;
      },
      toggle: function(id) {
        if (selectedIds[id]) { delete selectedIds[id]; }
        else { selectedIds[id] = true; }
        updateUI();
      },
      selectAll: function(ids) {
        selectedIds = {};
        ids.forEach(function(id) { selectedIds[id] = true; });
        updateUI();
      },
      selectNone: function() {
        selectedIds = {};
        updateUI();
      },
      isSelected: function(id) {
        return !!selectedIds[id];
      },
      getSelected: function() {
        return Object.keys(selectedIds);
      },
      getCount: function() {
        return Object.keys(selectedIds).length;
      },
      destroy: function() {
        selectedIds = {};
      }
    };
  };

  /* ---- Saved Filters (localStorage-based) ---- */
  window.SavedFilters = function SavedFilters(storageKey) {
    storageKey = storageKey || 'satc-saved-filters';
    var filters = [];
    try {
      var stored = localStorage.getItem(storageKey);
      if (stored) filters = JSON.parse(stored);
    } catch(e) {}

    function persist() {
      try { localStorage.setItem(storageKey, JSON.stringify(filters)); } catch(e) {}
    }

    return {
      getAll: function() { return filters.slice(); },
      save: function(name, filterState) {
        filters.push({ name: name, state: JSON.parse(JSON.stringify(filterState)), savedAt: new Date().toISOString() });
        persist();
      },
      remove: function(index) {
        if (index >= 0 && index < filters.length) { filters.splice(index, 1); persist(); }
      },
      load: function(index) {
        if (index >= 0 && index < filters.length) return JSON.parse(JSON.stringify(filters[index].state));
        return null;
      },
      clear: function() { filters = []; persist(); },
      count: function() { return filters.length; }
    };
  };

  /* ---- Filter State Serialization ---- */
  window.serializeFilterState = function serializeFilterState(elementIds) {
    var state = {};
    elementIds.forEach(function(id) {
      var el = document.getElementById(id);
      if (!el) return;
      if (el.type === 'checkbox') state[id] = el.checked;
      else if (el.tagName === 'SELECT') state[id] = el.value;
      else state[id] = el.value;
    });
    return state;
  };

  window.deserializeFilterState = function deserializeFilterState(state, elementIds) {
    if (!state) return;
    elementIds.forEach(function(id) {
      var el = document.getElementById(id);
      if (!el || state[id] === undefined) return;
      if (el.type === 'checkbox') el.checked = state[id];
      else el.value = state[id];
    });
  };

  /* ---- Filter Saver UI ---- */
  window.createFilterSaver = function createFilterSaver(container, savedFilters, opts) {
    if (!container || !savedFilters) return { destroy: function(){} };
    opts = opts || {};
    var getFilterState = opts.getFilterState || function(){ return {}; };
    var applyFilterState = opts.applyFilterState || function(){};
    var elementIds = opts.elementIds || [];
    var bar = document.createElement('div');
    bar.className = 'saved-filters-bar';
    container.appendChild(bar);

    function renderChips() {
      bar.innerHTML = '<span class="saved-filters-label">Saved:</span>';
      var all = savedFilters.getAll();
      if (!all.length) { bar.innerHTML = ''; return; }
      all.forEach(function(f, i) {
        var chip = document.createElement('button');
        chip.className = 'saved-filter-chip';
        chip.innerHTML = '<span class="chip-label">' + f.name + '</span><span class="chip-remove" data-index="' + i + '">&times;</span>';
        chip.addEventListener('click', function(e) {
          if (e.target.classList.contains('chip-remove')) {
            savedFilters.remove(parseInt(e.target.dataset.index));
            renderChips();
            return;
          }
          var state = savedFilters.load(i);
          if (state) {
            deserializeFilterState(state, elementIds);
            if (applyFilterState) applyFilterState(state);
          }
        });
        bar.appendChild(chip);
      });
    }

    var saveBtn = document.createElement('button');
    saveBtn.className = 'batch-btn';
    saveBtn.textContent = 'Save Filters';
    saveBtn.addEventListener('click', function() {
      var name = prompt('Name this filter preset:');
      if (name && name.trim()) {
        savedFilters.save(name.trim(), getFilterState());
        renderChips();
      }
    });
    container.insertBefore(saveBtn, bar);

    renderChips();
    return { destroy: function() { bar.remove(); saveBtn.remove(); } };
  };

  /* ---- Batch Checkbox Column ---- */
  window.addBatchCheckboxColumn = function addBatchCheckboxColumn(table, batchSelection, idKey) {
    if (!table || !batchSelection) return;
    idKey = idKey || 'id';
    var thead = table.querySelector('thead');
    var tbody = table.querySelector('tbody');
    if (!thead || !tbody) return;

    var headerRow = thead.querySelector('tr');
    if (!headerRow) return;
    var th = document.createElement('th');
    th.className = 'batch-col';
    var selectAllCheckbox = document.createElement('input');
    selectAllCheckbox.type = 'checkbox';
    selectAllCheckbox.className = 'batch-checkbox';
    selectAllCheckbox.addEventListener('change', function() {
      var allIds = Array.from(tbody.querySelectorAll('tr')).map(function(row) {
        return row.dataset[idKey] || '';
      }).filter(Boolean);
      if (selectAllCheckbox.checked) batchSelection.selectAll(allIds);
      else batchSelection.selectNone();
      updateRows();
    });
    th.appendChild(selectAllCheckbox);
    headerRow.insertBefore(th, headerRow.firstChild);

    function updateRows() {
      var rows = tbody.querySelectorAll('tr');
      rows.forEach(function(row) {
        var id = row.dataset[idKey];
        var cb = row.querySelector('.batch-checkbox');
        if (cb) cb.checked = batchSelection.isSelected(id);
        row.classList.toggle('batch-selected', batchSelection.isSelected(id));
      });
    }

    var observer = new MutationObserver(function() {
      var rows = tbody.querySelectorAll('tr');
      rows.forEach(function(row) {
        if (row.querySelector('.batch-col')) return;
        var id = row.dataset[idKey];
        var td = document.createElement('td');
        td.className = 'batch-col';
        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'batch-checkbox';
        cb.checked = batchSelection.isSelected(id);
        cb.addEventListener('change', function() {
          batchSelection.toggle(id);
          updateRows();
        });
        td.appendChild(cb);
        row.insertBefore(td, row.firstChild);
      });
    });
    observer.observe(tbody, { childList: true, subtree: false });
    observer.takeRecords();
    observer.disconnect();
    var rows = tbody.querySelectorAll('tr');
    rows.forEach(function(row) {
      var id = row.dataset[idKey];
      var td = document.createElement('td');
      td.className = 'batch-col';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'batch-checkbox';
      cb.checked = batchSelection.isSelected(id);
      cb.addEventListener('change', function() {
        batchSelection.toggle(id);
        updateRows();
      });
      td.appendChild(cb);
      row.insertBefore(td, row.firstChild);
    });
  };

  /* ---- Enhanced CSV Export ---- */
  window.exportToCSV = function exportToCSV(filename, rows, columns) {
    if (!rows || !rows.length) { alert('No data to export.'); return; }
    var BOM = '\uFEFF';
    var header = columns.map(function(c) {
      var val = c.label || c;
      return '"' + String(val).replace(/"/g, '""') + '"';
    }).join(',');
    var body = rows.map(function(row) {
      return columns.map(function(c) {
        var key = c.key || c;
        var val = row[key] !== undefined && row[key] !== null ? row[key] : '';
        return '"' + String(val).replace(/"/g, '""') + '"';
      }).join(',');
    }).join('\n');
    var blob = new Blob([BOM + header + '\n' + body], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename || 'export.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  /* ---- Table to CSV Export ---- */
  window.exportTableToCSV = function exportTableToCSV(tableId, filename) {
    var table = document.getElementById(tableId);
    if (!table) return;
    var rows = [];
    var headers = [];
    var thead = table.querySelector('thead');
    if (thead) {
      var headerCells = thead.querySelectorAll('tr:first-child th, tr:first-child td');
      headerCells.forEach(function(cell) {
        if (cell.classList.contains('batch-col')) return;
        headers.push(cell.textContent.trim());
      });
    }
    var tbody = table.querySelector('tbody') || table;
    var dataRows = tbody.querySelectorAll('tr');
    dataRows.forEach(function(row) {
      if (row.closest('.scroll-sentinel')) return;
      var cells = row.querySelectorAll('td');
      var rowData = {};
      var ci = 0;
      cells.forEach(function(cell, i) {
        if (cell.classList.contains('batch-col')) return;
        var key = headers[ci] || 'col' + ci;
        rowData[key] = cell.textContent.trim();
        ci++;
      });
      if (Object.keys(rowData).length) rows.push(rowData);
    });
    var cols = headers.map(function(h) { return { key: h, label: h }; });
    window.exportToCSV(filename || tableId + '.csv', rows, cols);
  };

  /* ---- XLSX Export (requires SheetJS) ---- */
  window.exportToXLSX = function exportToXLSX(filename, rows, columns) {
    if (!rows || !rows.length) { alert('No data to export.'); return; }
    if (typeof XLSX === 'undefined') { alert('XLSX library not loaded.'); return; }
    var wsData = [columns.map(function(c) { return c.label || c; })];
    rows.forEach(function(row) {
      wsData.push(columns.map(function(c) {
        var key = c.key || c;
        return row[key] !== undefined && row[key] !== null ? row[key] : '';
      }));
    });
    var ws = XLSX.utils.aoa_to_sheet(wsData);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, filename || 'export.xlsx');
  };

  /* ---- Export Progress Indicator ---- */
  window.withExportProgress = function withExportProgress(btn, fn) {
    if (!btn) return fn();
    var originalText = btn.textContent || btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner spinner-sm"></span> Exporting...';
    var result = fn();
    if (result && typeof result.then === 'function') {
      return result.then(function(val) {
        btn.disabled = false;
        btn.innerHTML = originalText;
        return val;
      }).catch(function(err) {
        btn.disabled = false;
        btn.innerHTML = originalText;
        throw err;
      });
    } else {
      btn.disabled = false;
      btn.innerHTML = originalText;
      return result;
    }
  };

  /* ---- Swipe-to-Reveal Actions ---- */
  window.addSwipeActions = function addSwipeActions(row, actions) {
    if (!row || !actions || !actions.length) return;
    var container = document.createElement('div');
    container.className = 'swipe-container';
    var content = document.createElement('div');
    content.className = 'swipe-content';
    while (row.firstChild) content.appendChild(row.firstChild);
    container.appendChild(content);
    var actionsEl = document.createElement('div');
    actionsEl.className = 'swipe-actions';
    actions.forEach(function(action) {
      var btn = document.createElement('button');
      btn.className = 'swipe-action-btn ' + (action.className || '');
      btn.innerHTML = (action.icon || '') + (action.label || '');
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (action.onClick) action.onClick(row);
        content.style.transform = 'translateX(0)';
        actionsEl.classList.remove('revealed');
      });
      actionsEl.appendChild(btn);
    });
    container.appendChild(actionsEl);
    row.appendChild(container);
    var startX = 0, currentX = 0, moved = false;
    var threshold = 60;
    row.addEventListener('touchstart', function(e) {
      startX = e.touches[0].clientX;
      currentX = startX;
      moved = false;
    }, { passive: true });
    row.addEventListener('touchmove', function(e) {
      currentX = e.touches[0].clientX;
      var diff = startX - currentX;
      if (diff > 10) moved = true;
      if (moved) {
        var translate = Math.max(0, Math.min(diff, actions.length * 80));
        content.style.transform = 'translateX(-' + translate + 'px)';
        actionsEl.style.transform = 'translateX(' + (translate - threshold) + 'px)';
      }
    }, { passive: true });
    row.addEventListener('touchend', function() {
      var diff = startX - currentX;
      if (diff > threshold) {
        content.style.transform = 'translateX(-' + (actions.length * 80) + 'px)';
        actionsEl.classList.add('revealed');
      } else {
        content.style.transform = 'translateX(0)';
        actionsEl.classList.remove('revealed');
      }
    }, { passive: true });
  };

  /* ---- Pull-to-Refresh ---- */
  window.setupPullToRefresh = function setupPullToRefresh(container, onRefresh) {
    if (!container || !onRefresh) return { destroy: function(){} };
    var indicator = document.createElement('div');
    indicator.className = 'ptr-indicator';
    indicator.innerHTML = '<span class="ptr-icon pull">&#x2193;</span><span>Pull to refresh</span>';
    container.style.position = 'relative';
    container.insertBefore(indicator, container.firstChild);
    var startY = 0, pulling = false, refreshing = false;
    var threshold = 80;
    container.addEventListener('touchstart', function(e) {
      if (container.scrollTop <= 0 && !refreshing) {
        startY = e.touches[0].clientY;
        pulling = true;
      }
    }, { passive: true });
    container.addEventListener('touchmove', function(e) {
      if (!pulling || refreshing) return;
      var diff = e.touches[0].clientY - startY;
      if (diff > 0) {
        var pull = Math.min(diff, threshold + 40);
        indicator.style.transform = 'translateY(' + (pull) + 'px)';
        indicator.classList.add('visible');
        indicator.querySelector('.ptr-icon').className = 'ptr-icon ' + (pull > threshold ? 'release' : 'pull');
        indicator.innerHTML = (pull > threshold ? '&#x21E1;' : '&#x2193;') + ' ' + (pull > threshold ? 'Release to refresh' : 'Pull to refresh');
      }
    }, { passive: true });
    container.addEventListener('touchend', function() {
      if (!pulling || refreshing) return;
      pulling = false;
      if (indicator.getBoundingClientRect().top > threshold - 20) {
        refreshing = true;
        indicator.innerHTML = '<span class="spinner"></span> Refreshing...';
        indicator.querySelector('.ptr-icon') && indicator.querySelector('.ptr-icon').remove();
        indicator.style.transform = 'translateY(0)';
        var result = onRefresh();
        if (result && typeof result.then === 'function') {
          result.then(function() {
            refreshing = false;
            indicator.style.transform = '';
            indicator.classList.remove('visible');
            indicator.innerHTML = '<span class="ptr-icon pull">&#x2193;</span><span>Pull to refresh</span>';
          });
        } else {
          refreshing = false;
          indicator.style.transform = '';
          indicator.classList.remove('visible');
          indicator.innerHTML = '<span class="ptr-icon pull">&#x2193;</span><span>Pull to refresh</span>';
        }
      } else {
        indicator.style.transform = '';
        indicator.classList.remove('visible');
        indicator.innerHTML = '<span class="ptr-icon pull">&#x2193;</span><span>Pull to refresh</span>';
      }
    }, { passive: true });
    return { destroy: function() { indicator.remove(); } };
  };

  /* ---- Offline Detection & Banner ---- */
  window.offlineManager = (function() {
    var banner = null;
    var listeners = [];
    function createBanner() {
      banner = document.createElement('div');
      banner.className = 'offline-banner';
      banner.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 1l22 22"/><path d="M16.72 11.06A10.94 10.94 0 0119 12.55"/><path d="M5 12.55a10.94 10.94 0 015.17-2.39"/><path d="M10.71 5.05A16 16 0 0122.56 9"/><path d="M1.42 9a15.91 15.91 0 014.7-2.88"/><path d="M8.53 16.11a6 6 0 016.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg> You are offline. Changes will be saved locally.';
      var dismiss = document.createElement('button');
      dismiss.className = 'offline-dismiss';
      dismiss.innerHTML = '&times;';
      dismiss.addEventListener('click', function() { banner.classList.remove('visible'); });
      banner.appendChild(dismiss);
      document.body.appendChild(banner);
    }
    function updateOnlineStatus() {
      var online = navigator.onLine;
      if (!banner) createBanner();
      banner.classList.toggle('visible', !online);
      listeners.forEach(function(fn) { fn(online); });
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('online', updateOnlineStatus);
      window.addEventListener('offline', updateOnlineStatus);
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { if (!navigator.onLine) updateOnlineStatus(); });
      } else if (!navigator.onLine) {
        setTimeout(updateOnlineStatus, 500);
      }
    }
    return {
      isOnline: function() { return navigator.onLine; },
      onStatusChange: function(fn) { listeners.push(fn); },
      showBanner: function() { if (banner) banner.classList.add('visible'); },
      hideBanner: function() { if (banner) banner.classList.remove('visible'); }
    };
  })();

  /* ---- Offline Action Queue ---- */
  window.offlineActionQueue = (function() {
    var QUEUE_KEY = 'satc-offline-queue';
    function load() {
      try { return JSON.parse(localStorage.getItem(QUEUE_KEY)) || []; } catch(e) { return []; }
    }
    function save(queue) {
      try { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue)); } catch(e) {}
    }
    return {
      enqueue: function(action, payload) {
        var queue = load();
        queue.push({ action: action, payload: JSON.parse(JSON.stringify(payload)), timestamp: Date.now(), id: Date.now() + '-' + Math.random().toString(36).slice(2, 6) });
        save(queue);
      },
      dequeue: function() {
        var queue = load();
        if (!queue.length) return null;
        var item = queue.shift();
        save(queue);
        return item;
      },
      peek: function() {
        var queue = load();
        return queue.length ? queue[0] : null;
      },
      getAll: function() { return load(); },
      remove: function(id) {
        var queue = load().filter(function(item) { return item.id !== id; });
        save(queue);
      },
      clear: function() { save([]); },
      count: function() {
        try { return JSON.parse(localStorage.getItem(QUEUE_KEY)).length; } catch(e) { return 0; }
      },
      processAll: function(processor) {
        var queue = load();
        while (queue.length) {
          var item = queue.shift();
          try { processor(item); } catch(e) { console.warn('Failed to process offline action:', item, e); }
        }
        save(queue);
      }
    };
  })();

  /* ---- ARIA Announcement Region ---- */
  window.announce = function announce(message, priority) {
    priority = priority || 'polite';
    var region = document.getElementById('aria-announcements');
    if (!region) {
      region = document.createElement('div');
      region.id = 'aria-announcements';
      region.setAttribute('aria-live', priority);
      region.setAttribute('aria-atomic', 'true');
      region.className = 'sr-only';
      document.body.appendChild(region);
    }
    region.textContent = '';
    setTimeout(function() { region.textContent = message; }, 50);
  };

  /* ---- Keyboard Shortcuts Manager ---- */
  window.KeyboardShortcuts = function KeyboardShortcuts() {
    var bindings = {};
    var enabled = true;

    function normalize(e) {
      var parts = [];
      if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');
      var key = e.key === ' ' ? 'Space' : e.key;
      if (key.length === 1) key = key.toUpperCase();
      parts.push(key);
      return parts.join('+');
    }

    var handler = function(e) {
      if (!enabled) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        if (e.key === 'Escape') {
          e.target.blur();
          return;
        }
        if (e.ctrlKey || e.metaKey) { /* allow Ctrl shortcuts in inputs */ }
        else return;
      }
      var combo = normalize(e);
      if (bindings[combo]) {
        e.preventDefault();
        bindings[combo](e);
      }
    };

    document.addEventListener('keydown', handler);

    return {
      on: function(combo, fn) {
        bindings[combo] = fn;
      },
      off: function(combo) {
        delete bindings[combo];
      },
      disable: function() { enabled = false; },
      enable: function() { enabled = true; },
      destroy: function() {
        document.removeEventListener('keydown', handler);
        bindings = {};
      }
    };
  };

  /* ---- Simple i18n / Translation Support ---- */
  window.I18n = function I18n(defaultLocale) {
    defaultLocale = defaultLocale || 'en';
    var locale = defaultLocale;
    var store = {};
    var listeners = [];

    function resolveFrom(lang, key) {
      var dict = store[lang];
      if (!dict) return null;
      var keys = key.split('.');
      var obj = dict;
      for (var i = 0; i < keys.length; i++) {
        if (obj && typeof obj === 'object' && keys[i] in obj) obj = obj[keys[i]];
        else return null;
      }
      return typeof obj === 'string' ? obj : null;
    }

    return {
      setLocale: function(loc) {
        locale = loc;
        listeners.forEach(function(fn) { fn(loc); });
      },
      getLocale: function() { return locale; },
      load: function(loc, data) {
        store[loc] = data;
      },
      t: function(key, params) {
        var msg = resolveFrom(locale, key) || resolveFrom(defaultLocale, key) || key;
        if (params && msg) {
          Object.keys(params).forEach(function(k) {
            msg = msg.replace(new RegExp('\\{' + k + '\\}', 'g'), params[k]);
          });
        }
        return msg;
      },
      onChange: function(fn) { listeners.push(fn); },
      hasTranslation: function(key) {
        return !!resolveFrom(locale, key);
      }
    };
  };

  /* ---- Number/Currency formatting with i18n ---- */
  window.formatCurrency = function formatCurrency(amount, locale, currency) {
    locale = locale || 'en-PH';
    currency = currency || 'PHP';
    try {
      return new Intl.NumberFormat(locale, { style: 'currency', currency: currency }).format(amount);
    } catch(e) {
      return '₱' + Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  };

  window.formatDate = function formatDate(dateStr, locale, options) {
    locale = locale || 'en-PH';
    options = options || { year: 'numeric', month: 'short', day: 'numeric' };
    try {
      return new Date(dateStr).toLocaleDateString(locale, options);
    } catch(e) {
      return dateStr;
    }
  };

  window.formatNumber = function formatNumber(num, locale, options) {
    locale = locale || 'en-PH';
    options = options || {};
    try {
      return new Intl.NumberFormat(locale, options).format(num);
    } catch(e) {
      return Number(num).toLocaleString();
    }
  };

  /* ---- Style Guide Launcher ---- */
  window.openStyleGuide = function openStyleGuide() {
    var w = window.open('docs/style-guide.html', 'sg', 'width=1200,height=800,scrollbars=yes');
    if (!w) { window.location.href = 'docs/style-guide.html'; }
  };

})();
