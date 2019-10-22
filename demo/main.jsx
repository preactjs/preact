import {render, toChildArray,coerceToVNode, createRef, cloneElement, h, Component} from '../src'

class Root extends Component{

    render(){
        return <div>
           <span>123</span>
            345
        </div>
    }
}

render(<Root />,document.getElementById('app'));
