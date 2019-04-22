import { FunctionalComponent } from "../../src/internal";

function EqualityFunction(currentProps: object, nextProps: object): boolean;

export function memo(component: FunctionalComponent, isEqual?: EqualityFunction): FunctionalComponent;

// TODO: PureComponent and createPortal
