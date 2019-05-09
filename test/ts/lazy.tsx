import {
	createElement, Component,
} from "../../src/";

export interface LazyProps {
        isProp: boolean;
}
// class IsLazy extends Component<LazyProps> {
//         render ({ isProp }: LazyProps) {
//                 return (
//                         <div>{
//                                 isProp ?
//                                 'Super Lazy TRUE' :
//                                 'Super Lazy FALSE'
//                         }</div>
//                 )
//         }
// }

export const IsLazyComponent = (props: LazyProps) =>
        <div>{
                props.isProp ?
                'Super Lazy TRUE' :
                'Super Lazy FALSE'
        }</div>
