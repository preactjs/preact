import { getStringId, flushTable } from '../../../src/devtools/string-table';

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

		describe('flushTable', () => {
			it('should return just length with empty table', () => {
				const table = new Map();
				expect(flushTable(table)).to.deep.equal([0]);
			});

			it('should convert string tables to code points', () => {
				let table = new Map([['foo', 1]]);
				expect(flushTable(table)).to.deep.equal([
					4,
					3,
					102,
					111,
					111
				]);

				table = new Map([['foo', 1], ['bar', 2]]);
				expect(flushTable(table)).to.deep.equal([
					8,
					3,
					102,
					111,
					111,
					3,
					98,
					97,
					114
				]);
			});
		});
	});
});
