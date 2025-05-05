/**
 * Type declaration file to fix the events module errors
 */

declare module 'events' {
	export class EventEmitter {
		// Methods
		addListener(
			event: string | symbol,
			listener: (...args: any[]) => void
		): this;
		on(event: string | symbol, listener: (...args: any[]) => void): this;
		once(event: string | symbol, listener: (...args: any[]) => void): this;
		removeListener(
			event: string | symbol,
			listener: (...args: any[]) => void
		): this;
		off(event: string | symbol, listener: (...args: any[]) => void): this;
		removeAllListeners(event?: string | symbol): this;
		setMaxListeners(n: number): this;
		getMaxListeners(): number;
		listeners(event: string | symbol): Function[];
		rawListeners(event: string | symbol): Function[];
		emit(event: string | symbol, ...args: any[]): boolean;
		listenerCount(event: string | symbol): number;
		prependListener(
			event: string | symbol,
			listener: (...args: any[]) => void
		): this;
		prependOnceListener(
			event: string | symbol,
			listener: (...args: any[]) => void
		): this;
		eventNames(): (string | symbol)[];

		// For TypeScript errors in events module
		static listenerCount(emitter: EventEmitter, event: string | symbol): number;
		static defaultMaxListeners: number;
	}

	// Extended Error type to include properties used in events.js
	interface ErrorWithEventProperties extends Error {
		context?: any;
		emitter?: any;
		type?: string | symbol;
		count?: number;
	}

	// For onceWrapper
	interface OnceWrapper extends Function {
		listener?: Function;
		target?: any;
		type?: string | symbol;
		wrapFn?: Function;
	}

	export default EventEmitter;
}
