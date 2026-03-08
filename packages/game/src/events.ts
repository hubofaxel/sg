// ---------------------------------------------------------------------------
// Typed event emitter — bridges Phaser internals to the Svelte shell
// ---------------------------------------------------------------------------

import type { GameEventMap } from './types';

type Handler<Args extends unknown[]> = (...args: Args) => void;

export class GameEventBus {
	private listeners = new Map<string, Set<Handler<never[]>>>();

	on<K extends keyof GameEventMap>(event: K, handler: Handler<GameEventMap[K]>): void {
		let set = this.listeners.get(event as string);
		if (!set) {
			set = new Set();
			this.listeners.set(event as string, set);
		}
		set.add(handler as Handler<never[]>);
	}

	off<K extends keyof GameEventMap>(event: K, handler: Handler<GameEventMap[K]>): void {
		this.listeners.get(event as string)?.delete(handler as Handler<never[]>);
	}

	emit<K extends keyof GameEventMap>(event: K, ...args: GameEventMap[K]): void {
		const set = this.listeners.get(event as string);
		if (!set) return;
		for (const handler of set) {
			(handler as Handler<GameEventMap[K]>)(...args);
		}
	}

	removeAll(): void {
		this.listeners.clear();
	}
}
