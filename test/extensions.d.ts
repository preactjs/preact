declare module Chai {
	export interface Assertion {
		equalNode(node: Node | null, message?: string): void;
	}
}
