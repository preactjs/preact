# Virtual DOM Children diffing

One problem all virtual dom implementations must solve is diffing children: Given the list of the current children, and the list of the new children, which children moved? To do this, there are generally 3 steps:

1. Match up nodes between current and new children
2. Determine which nodes are added, removed, or changed positions
3. Apply changes to the DOM

For the first step, virtual dom libraries need a way to match the current children to the new children. When children are a dynamically generated array, this matching is typically done using user-provided keys on the each child. If a user doesn't provide keys on children, then the key is typically the index of the child. Our discussion today will focus on the algorithms to determine which children moved when each child is identified using a key.

## Determining movement

Given a list of current children: `0 1 2 3` and new children `3 0 1 2`, what nodes would you move to make the current children match the new children? One approach could be to append `0` after `3` (`1 2 3 0`), append `1` after `0` (`2 3 0 1`), and then append `2` after `1` (`3 0 1 2`). However, a simpler approach would be to just insert `3` before `0` (`3 0 1 2`).

When determining which nodes to move, our goal is minimize the number of nodes that move. Compared to other operations virtual dom libraries do, moving DOM nodes is an expensive operation, so reducing DOM node moves increases performance.

How do we determine the fewest number of movements? Looking at our previous example (`0 1 2 3` -> `3 0 1 2`), the key to seeing that moving

TODO: mention we want find the longest sequence of _relatively_ in place nodes, i.e. nodes that are in the same order with relationship to each other. So we compare the existing

### Longest common subsequence

`0123` -> `3012`

`012345` -> `024135`

Time Complexity: `O(n^2)`
Space Complexity: `O(min(m,n))`

### Longest increasing subsequence

Time Complexity: `O(n*log(n))`
Space Complexity: `O(n)`

TODO: Why longest increasing subsequence (only looking at one array?) and not longest common subsequence (comparing the two arrays)? Numbers that are increasing are in in the correct order (`2 4 5 8`), perhaps? We are looking for the longest subsequence of nodes whose new positions are in the same relative old position ("relative old position" meaning "position relative to other nodes"). The relative old position is marked by the values in the array.

### Adding new nodes and deletions

TODO: fill out
