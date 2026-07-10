// Minimal DOM setup for unit tests
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
});

global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.localStorage = dom.window.localStorage;
global.sessionStorage = dom.window.sessionStorage;
global.Node = dom.window.Node;
global.MutationObserver = dom.window.MutationObserver;
global.requestAnimationFrame = dom.window.requestAnimationFrame;
global.cancelAnimationFrame = dom.window.cancelAnimationFrame;
global.PerformanceObserver = dom.window.PerformanceObserver;
global.performance = dom.window.performance;

// Mock XLSX
global.XLSX = {
  utils: {
    aoa_to_sheet: () => ({}),
    book_new: () => ({}),
    book_append_sheet: () => {},
  },
  writeFile: () => {},
};
