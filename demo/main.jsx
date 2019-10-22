import {render, toChildArray,coerceToVNode, createRef, cloneElement, h, Component} from '../src'

class Root extends Component{
    state = {
        name:'123'
    }
    onClick = ()=>{
        this.setState({
            name:'345'
        })
    }

    render(){
        return <div onClick={this.onClick}>
            {this.state.name}
        </div>
    }
}

render(<Root />,document.getElementById('app'));
