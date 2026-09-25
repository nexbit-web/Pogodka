import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// jsdom не вміє в ці браузерні API, а компоненти (bits-ui, mode-watcher, пошук) ними користуються

if (!window.matchMedia) {
	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		value: (query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn()
		})
	});
}

if (!Element.prototype.scrollIntoView) {
	Element.prototype.scrollIntoView = vi.fn();
}

if (!('ResizeObserver' in window)) {
	class ResizeObserverStub {
		observe() {}
		unobserve() {}
		disconnect() {}
	}
	Object.defineProperty(window, 'ResizeObserver', { writable: true, value: ResizeObserverStub });
}

// Web Animations API: Svelte анімує переходи (fade панелі дня) через element.animate
if (!Element.prototype.animate) {
	Element.prototype.animate = function () {
		const animation = {
			onfinish: null as null | (() => void),
			cancel: vi.fn(),
			finish: vi.fn(),
			play: vi.fn(),
			pause: vi.fn(),
			currentTime: 0,
			playState: 'finished',
			finished: Promise.resolve()
		};
		queueMicrotask(() => animation.onfinish?.());
		return animation as unknown as Animation;
	};
}
