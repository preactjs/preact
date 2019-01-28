import update from '../../../../compat/lib/update';

describe('update', () => {
	it('should export an function', () => {
		expect(update).to.be.a('function');
	});

	it('should update arrays', () => {
		const initialArray = [1, 2, 3];
		const newArray = update(initialArray, {$push: [4]});
		expect(newArray).to.eql([1, 2, 3, 4]);
	});
});
