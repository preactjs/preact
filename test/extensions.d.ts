declare global {
	namespace Chai {
		interface Assertion {
			equalNode(node: Node | null, message?: string): void;
			called: Assertion;
			calledOnce: Assertion;
			calledTwice: Assertion;
			calledWith(...args: any[]): Assertion;
			calledWithMatch(...args: Record<string, unknown>[]): Assertion;
		}
	}
	var expect: Chai.ExpectStatic;
	var sinon: Sinon;
}

export {};
