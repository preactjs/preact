import { parseMessage } from '../../src/devtools/message';

describe('devtools message', () => {
	it('should parse simple mount', () => {
		let arr = [1, 1, 5, 4, 65, 112, 112, 51, 2, 0, 1, 1, 10, 1, 1, 1, 2, 4, 1, 0, 1, 0];
		expect(parseMessage(Uint32Array.from(arr))).to.deep.equal({
			rendererId: 1,
			rootVNodeId: 1,
			stringTable: {
				length: 5,
				items: ['App3']
			},
			unmounts: [],
			operations: [
				{
					type: 'ADD',
					kind: 'Root',
					id: 1,
					supportsProfiling: true,
					hasOwnerMetadata: true
				},
				{
					type: 'ADD',
					kind: 'FunctionalComponent',
					name: 'App3',
					id: 2,
					parentId: 1,
					owner: 0,
					key: null
				}
			]
		});
	});

	it('should parse nested mount', () => {
		let arr = [1, 1, 8, 3, 66, 97, 114, 3, 66, 111, 98, 2, 0, 1, 1, 10, 1, 1, 1, 2, 4, 1, 0, 1, 0, 1, 3, 4, 2, 2, 2, 0];
		expect(parseMessage(Uint32Array.from(arr))).to.deep.equal({
			rendererId: 1,
			rootVNodeId: 1,
			stringTable: {
				length: 8,
				items: ['Bar', 'Bob']
			},
			unmounts: [],
			operations: [
				{
					type: 'ADD',
					kind: 'Root',
					id: 1,
					supportsProfiling: true,
					hasOwnerMetadata: true
				},
				{
					type: 'ADD',
					kind: 'FunctionalComponent',
					name: 'Bar',
					id: 2,
					parentId: 1,
					owner: 0,
					key: null
				},
				{
					type: 'ADD',
					kind: 'FunctionalComponent',
					name: 'Bob',
					id: 3,
					parentId: 2,
					owner: 2,
					key: null
				}
			]
		});
	});
});
