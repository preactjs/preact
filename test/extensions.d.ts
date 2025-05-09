declare global {
	namespace Chai {
		interface Assertion {
			equalNode(node: Node | null, message?: string): void;
			callCount(count: number): Assertion;
			called: Assertion;
			calledOnce: Assertion;
			calledOnceWith(...args: any[]): Assertion;
			calledTwice: Assertion;
			calledThrice: Assertion;
			calledWith(...args: any[]): Assertion;
			calledWithExactly(...args: any[]): Assertion;
			calledWithMatch(...args: Record<string, unknown>[]): Assertion;
			calledBefore(spy: Sinon.SinonSpy): Assertion;
			returned(value: any): Assertion;
		}
	}
	var expect: Chai.ExpectStatic;
	var sinon: Sinon;
}

export {};
