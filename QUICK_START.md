# Preact Quick Start Guide

This guide will help you get started with Preact quickly and understand its core concepts.

## Table of Contents

- [Installation](#installation)
- [Your First Component](#your-first-component)
- [JSX vs HTM](#jsx-vs-htm)
- [Hooks](#hooks)
- [Class Components](#class-components)
- [Props and State](#props-and-state)
- [Event Handling](#event-handling)
- [Conditional Rendering](#conditional-rendering)
- [Lists and Keys](#lists-and-keys)
- [Next Steps](#next-steps)

## Installation

### Using a Build Tool (Recommended)

```bash
npm install preact
```

### CDN (For quick prototyping)

```html
<script type="module">
  import { h, render } from 'https://esm.sh/preact';
  // Your code here
</script>
```

## Your First Component

### Functional Component with Hooks

```jsx
import { render } from 'preact';
import { useState } from 'preact/hooks';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}

render(<Counter />, document.getElementById('app'));
```

## JSX vs HTM

Preact supports both JSX and HTM (Hyperscript Tagged Markup).

### JSX (Requires build step)

```jsx
import { render } from 'preact';

function App() {
  return <h1>Hello, Preact!</h1>;
}

render(<App />, document.body);
```

### HTM (No build step required)

```javascript
import { render } from 'https://esm.sh/preact';
import { html } from 'https://esm.sh/htm/preact';

function App() {
  return html`<h1>Hello, Preact!</h1>`;
}

render(html`<${App} />`, document.body);
```

## Hooks

Preact hooks are identical to React hooks and provide a way to use state and lifecycle features in functional components.

### Common Hooks

```jsx
import { useState, useEffect, useCallback, useMemo } from 'preact/hooks';

function ExampleComponent() {
  // State hook
  const [count, setCount] = useState(0);

  // Effect hook - runs after render
  useEffect(() => {
    document.title = `Count: ${count}`;
    
    // Cleanup function (optional)
    return () => {
      console.log('Cleanup');
    };
  }, [count]); // Dependency array

  // Callback hook - memoizes functions
  const handleClick = useCallback(() => {
    setCount(c => c + 1);
  }, []);

  // Memo hook - memoizes computed values
  const expensiveValue = useMemo(() => {
    return count * 2;
  }, [count]);

  return (
    <div>
      <p>Count: {count}</p>
      <p>Double: {expensiveValue}</p>
      <button onClick={handleClick}>Increment</button>
    </div>
  );
}
```

## Class Components

While hooks are recommended, Preact still fully supports class components.

```jsx
import { Component } from 'preact';

class Counter extends Component {
  state = { count: 0 };

  increment = () => {
    this.setState(prevState => ({
      count: prevState.count + 1
    }));
  };

  componentDidMount() {
    console.log('Component mounted');
  }

  componentWillUnmount() {
    console.log('Component will unmount');
  }

  render() {
    return (
      <div>
        <p>Count: {this.state.count}</p>
        <button onClick={this.increment}>Increment</button>
      </div>
    );
  }
}
```

## Props and State

### Props (Passing Data Down)

```jsx
function Welcome({ name, age }) {
  return <h1>Hello, {name}! You are {age} years old.</h1>;
}

function App() {
  return <Welcome name="Alice" age={25} />;
}
```

### Default Props

```jsx
function Greeting({ name = 'Guest' }) {
  return <h1>Hello, {name}!</h1>;
}
```

### Children Props

```jsx
function Card({ title, children }) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <div className="content">{children}</div>
    </div>
  );
}

function App() {
  return (
    <Card title="My Card">
      <p>This is the card content</p>
    </Card>
  );
}
```

## Event Handling

```jsx
function EventExample() {
  const handleClick = (e) => {
    console.log('Button clicked', e);
  };

  const handleInput = (e) => {
    console.log('Input value:', e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted');
  };

  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="text" 
        onInput={handleInput}
        placeholder="Type something"
      />
      <button onClick={handleClick}>Click Me</button>
      <button type="submit">Submit</button>
    </form>
  );
}
```

## Conditional Rendering

### Using Ternary Operator

```jsx
function UserGreeting({ isLoggedIn, username }) {
  return (
    <div>
      {isLoggedIn ? (
        <h1>Welcome back, {username}!</h1>
      ) : (
        <h1>Please sign in.</h1>
      )}
    </div>
  );
}
```

### Using Logical AND

```jsx
function Notification({ hasUnread, count }) {
  return (
    <div>
      <h1>Notifications</h1>
      {hasUnread && <p>You have {count} unread messages</p>}
    </div>
  );
}
```

### Early Return

```jsx
function ProfilePage({ user }) {
  if (!user) {
    return <p>Loading...</p>;
  }

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.bio}</p>
    </div>
  );
}
```

## Lists and Keys

```jsx
function TodoList({ todos }) {
  return (
    <ul>
      {todos.map(todo => (
        <li key={todo.id}>
          <input 
            type="checkbox" 
            checked={todo.completed}
          />
          <span>{todo.text}</span>
        </li>
      ))}
    </ul>
  );
}

function App() {
  const todos = [
    { id: 1, text: 'Learn Preact', completed: false },
    { id: 2, text: 'Build an app', completed: false },
    { id: 3, text: 'Deploy to production', completed: false }
  ];

  return <TodoList todos={todos} />;
}
```

## Next Steps

### Learn More

- **[Official Documentation](https://preactjs.com)** - Comprehensive guide to Preact
- **[Tutorial](https://preactjs.com/tutorial)** - Interactive tutorial
- **[Preact CLI](https://github.com/preactjs/preact-cli)** - Quickly scaffold new projects
- **[Preact Signals](https://preactjs.com/guide/v10/signals)** - Reactive state management
- **[preact/compat](https://preactjs.com/guide/v10/switching-to-preact)** - React compatibility layer

### Common Patterns

- **Context API** - Share data across components without prop drilling
- **Error Boundaries** - Handle errors gracefully in your component tree
- **Portals** - Render children into a different part of the DOM
- **Server-Side Rendering (SSR)** - Improve initial load performance
- **Code Splitting** - Load code on demand to reduce bundle size

### Join the Community

- **[GitHub](https://github.com/preactjs/preact)** - Contribute to the project
- **[Slack](https://chat.preactjs.com)** - Join the community chat
- **[Twitter](https://twitter.com/preactjs)** - Follow for updates

## Example: Complete Todo App

```jsx
import { render } from 'preact';
import { useState } from 'preact/hooks';

function TodoApp() {
  const [todos, setTodos] = useState([]);
  const [input, setInput] = useState('');

  const addTodo = () => {
    if (input.trim()) {
      setTodos([...todos, { 
        id: Date.now(), 
        text: input, 
        completed: false 
      }]);
      setInput('');
    }
  };

  const toggleTodo = (id) => {
    setTodos(todos.map(todo =>
      todo.id === id 
        ? { ...todo, completed: !todo.completed }
        : todo
    ));
  };

  const deleteTodo = (id) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  return (
    <div className="todo-app">
      <h1>Todo List</h1>
      <div>
        <input
          type="text"
          value={input}
          onInput={e => setInput(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && addTodo()}
          placeholder="Add a new todo"
        />
        <button onClick={addTodo}>Add</button>
      </div>
      <ul>
        {todos.map(todo => (
          <li key={todo.id}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleTodo(todo.id)}
            />
            <span style={{ 
              textDecoration: todo.completed ? 'line-through' : 'none' 
            }}>
              {todo.text}
            </span>
            <button onClick={() => deleteTodo(todo.id)}>Delete</button>
          </li>
        ))}
      </ul>
      <p>{todos.filter(t => !t.completed).length} items remaining</p>
    </div>
  );
}

render(<TodoApp />, document.getElementById('app'));
```

---

Happy coding with Preact! 🎉
