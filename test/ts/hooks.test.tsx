import { createContext } from '../../';
import { use } from '../../hooks';

const Context = createContext(1);

function UseTypes() {
	const contextValue: number = use(Context);
	const promiseValue: number = use(Promise.resolve(1));

	contextValue.toFixed();
	promiseValue.toFixed();

	return null;
}

void UseTypes;

describe('hooks types', () => {
	it('typechecks use()', () => {});
});
