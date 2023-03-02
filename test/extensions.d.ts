declare module Chai {
	export interface Assertion {
		equalNode(node: Node | null, message?: string): void;

		toBe(obj: any): void;
		toEqual(obj: any): void;
		toHaveBeenCalledWith(...args: any[]): void;
		toHaveBeenCalledTimes(times: number): void;
		toThrow(expected?: string | RegExp): void;
		toThrowError(expected?: string | RegExp): void;
		toContain(value: any): void;
	}
}
