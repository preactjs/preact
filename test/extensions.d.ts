declare module Chai {
	export interface Assertion {
		equalNode(node: Node | null, message?: string): void;
	}
}

declare module 'chai-custom' {
	export const expect: Chai.ExpectStatic;
}
