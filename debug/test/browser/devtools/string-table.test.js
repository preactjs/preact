import { getStringId, getAllStrLengths } from '../../../src/devtools/string-table';

describe('devtools', () => {
	describe('string-table', () => {
		describe('getStringId', () => {
			it('should return 0 for null string', () => {
				expect(getStringId(new Map(), null)).to.equal(0);
			});

			it('should set string id if not present', () => {
				const table = new Map();
				expect(getStringId(table, 'foo')).to.equal(1);
				expect(table.size).to.equal(1);
			});

			it('should not add string if already present', () => {
				const table = new Map();
				getStringId(table, 'foo');
				getStringId(table, 'foo');
				expect(table.size).to.equal(1);
			});
		});

		describe('getAllStrLengths', () => {
			it('should get the total length of all strings', () => {
				expect(getAllStrLengths(new Map())).to.equal(0);
				expect(getAllStrLengths(new Map([['foo', 1]]))).to.equal(4);
				expect(getAllStrLengths(new Map([['foo', 1], ['bar', 2]]))).to.equal(8);
			});
		});
	});
});
