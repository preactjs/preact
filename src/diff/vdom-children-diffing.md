# Virtual DOM Children diffing

## Introduction

One problem all virtual dom implementations must solve is diffing children: Given the list of the current children, and the list of the new children, which children moved? To do this, there are generally 3 steps:

1. Match up nodes between current and new children
2. Determine which nodes are added, removed, or changed positions
3. Apply changes to the DOM

For the first step, virtual dom libraries need a way to match the current children to the new children. When children are a dynamically generated array, this matching is typically done using user-provided keys on the each child. If a user doesn't provide keys on children, then the key is typically the index of the child. Our discussion today will focus on the algorithms to determine which children moved when each child is identified using a key.

For example, you may have a virtual tree such as:

```jsx
<ul>
	<li key="0">a</li>
	<li key="1">b</li>
	<li key="2">c</li>
	<li key="3">d</li>
</ul>
```

And a next render might produce this tree instead:

```jsx
<ul>
	<li key="3">d</li>
	<li key="0">a</li>
	<li key="1">b</li>
	<li key="2">c</li>
</ul>
```

Determining how to morph the original children of the `ul` element into the newly rendered children is the job your virtual DOM library.

For here one out, will will simplify our discussion of virtual dom children and just refer to the list of keys. So we would represent the first JSX example as `0 1 2 3` and the new rendered output as `3 0 1 2`.

## Determining movement

Given a list of current children: `0 1 2 3` and new children `3 0 1 2`, what nodes would you move to make the current children match the new children? One approach could be to append `0` after `3` (`1 2 3 0`), append `1` after `0` (`2 3 0 1`), and then append `2` after `1` (`3 0 1 2`). However, a simpler approach would be to just insert `3` before `0` (`3 0 1 2`).

When determining which nodes to move, our goal is minimize the number of nodes that move. Compared to other operations virtual dom libraries do, moving DOM nodes is an expensive operation, so reducing DOM node moves increases performance.

How do we determine the fewest number of movements? Looking at our previous example (`0 1 2 3` -> `3 0 1 2`), the key to seeing that we can just move the `3` is noticing that `0 1 2` doesn't change between the old and new children. Only the `3` changes! `0 1 2` is the _longest common substring_ between the children (here, "substring" refers to contiguous sequence of items in our children array, i.e. a subset of items that are next to each other). Holding the longest common substring constant and moving elements around it helped us identify smaller number of movements to morph `0 1 2 3` into `3 0 1 2`.

But let's look at another example: `0 1 2 3 4 5` -> `0 3 1 4 2 5`. Here, there are no common substrings! But if you look closely we can morph the old children into the new children in just 2 moves: insert `3` before `1` and insert `4` before `2`. How did we determine that?

While there aren't any common substrings between the children arrays, there are common _subsequences_. A subsequence is set of elements from an array that are in the same order as the original sequence, but aren't necessarily next to each other. So while in a _substring_ the items must be next to each other, in a _subsequence_ they do not. For example, `0 3 5`, `0 1 5`, and `2 4` are a subsequences of `0 1 2 3 4 5`. `0 2 1` is not a subsequence of `0 1 2 3 4 5` because the `2` does not occur after `0` and before `1` in the original sequence.

In our example above (`0 1 2 3 4 5` -> `0 3 1 4 2 5`), let's use our understanding of subsequences to examine the differences between the two children arrays. If we remove the two nodes that moved (`3` and `4`) from the arrays, we are left a common subsequence between the two arrays: `0 1 2 5`. This subsequence is actually the _longest common subsequence_ between the two arrays!

If we can identify _longest common subsequence_ between two arrays, we have identified the most nodes that we can hold in place (i.e. **not move**). Every other node has changed positions and can move around these nodes. This approach leads to the minimal number of moves because we have found the most nodes that we don't have to move. Said another way, we have found the longest sequence of _relatively_ in place nodes, i.e. nodes that are in the same order with relationship to other nodes in the array.

The longest common subsequence algorithm is a well-known algorithm in computer science. You can read more about [the longest common subsequence algorithm on Wikipedia](https://en.wikipedia.org/wiki/Longest_common_subsequence). The best time complexity for determining the longest common subsequence is $O(n^2)$. This time complexity is acceptable, but can we do better for our specific use case of diffing virtual DOM children?

## Longest increasing subsequence

Typically, virtual dom keys are strings. A more realistic example might look something like trying to morph `a c b e d f` -> `a b c d e f`. Let's map this to numbers using the indices of each key in the original array. Let's assign to each key its index in the original array: `{a: 0, c: 1, b: 2, e: 3, d: 4, f: 5}`. Now, let's replace each key with this number in both arrays. So the original array becomes `0 1 2 3 4 5` and the new array becomes `0 2 1 4 3 5`.

```text
Original array
           key: a c b e d f
original index: 0 1 2 3 4 5

New array
           key: a b c d e f
original index: 0 2 1 4 3 5
```

Two interesting properties emerge from doing this:

1. The original array will always be an array of numbers from `0` to `array.length - 1`, and will always be numbers sorted in increasing order.
2. The new array is a mapping of an item's new index to it's old index in the original array. Said another way, the item at index `0` in `0 2 1 4 3 5` (`a`) was at index `0` in the original way, the item at index `1` in the new array (`b`) was at index `2` in the original array, and so on.

We can use these properties to simplify the problem we are trying to solve. Remember, we are searching for items that are in the relatively same order between the two arrays (in the same order relative to each other). Since the original array will always be in increasing sorted order, any subsequence of the original array that is present in the new array will also be in increasing order.

This insight is big! We can simplify what we need to search for now. Instead of solving the general _longest common subsequence_ problem, we now only need to look for the longest subsequence of increasing numbers in the new array. Again, any subsequence of the new array that is in increasing order is also a subsequence of the original array which was in increasing sorted order.

Finding the longest increasing subsequence is an easier algorithm because we are only looking at one array (the new array with the mapped indices) and has a better time complexity: $O(n\log(n))$. Let's take a look at the algorithm to do this.

### Algorithm

TODO: Talk about `insertBefore` and how DOM objects such as Document and DocumentFragment only support `insertBefore` and not newer methods such as `after` or `before` since they are only containers. You can't place a node after the document which is the root container. This limitation motivates using `prev` pointers in our algorithm.

For understanding this algorithm, we are going to use a linked list to represent our array of children. Here is the structure of the linked list node we will use:

```ts
interface Node {
	originalIndex: number;
	next: Node | null;
}
```

The list we are searching through is the list of

## Adding new nodes and deletions

TODO: fill out

## Acknowledgements

- @localvoid and his work in `ivi`
- Domenic and his work in inferno
- leetcode editors for the great descriptions of these algorithms on their website
