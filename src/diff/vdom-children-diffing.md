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
index: 0 1 2 3 4 5

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

### Basic dynamic programming algorithm

Let's start by writing a simple loop to find and track the first increasing subsequence to get us started. In this code we'll use the acronym LIS (or `lis`) to represent "longest increasing subsequence".

```js
/**
 * Longest increasing subsequence (LIS) algorithm
 * @param {number[]} nums An array of numbers to find the longest increasing subsequence
 * @returns {number[]} The items in the longest increasing subsequence of nums
 */
function findLIS(nums) {
	// If there are no items, just return an empty array
	if (nums.length < 0) {
		return [];
	}

	// There is at least one item in the array, so let's get started by adding it to
	// start our longest increasing subsequence.
	/** @type {number[]} The indicies of the items in the longest increasing subsequence */
	const lisIndices = [0];

	for (let i = 1; i < nums.length; i++) {
		/** The next value from nums to consider */
		const nextValue = nums[i];

		/** Last index of current longest increasing subsequence */
		const lastIndex = lisIndices[lisIndices.length - 1];
		/** Last value in our current longest increasing subsequence */
		const lastValue = nums[lastIndex];

		if (lastValue < nextValue) {
			// The next value in nums is greater than the last value in our current
			// increasing subsequence. Let's tack this index at the end of the
			// sequence
			lisIndices.push(i);
		} else {
			// We'll come back to this part
		}
	}

	// Now that lisIndices has all the indices of our increasing subsequence,
	// let's add those items to an array and return the result.
	const result = [];
	for (let index of lisIndices) {
		result.push(nums[index]);
	}

	return result;
}
```

This code currently only finds the first increasing subsequence starting at the first item. To fix it to find the longest increasing subsequence, let's walk through some examples and talk about what we should change.

#### Example 1: 0 8 3 6

Let's run the array `0 8 3 6` through our algorithm:

1.  `nums.length` is `4` so we continue on
2.  We initialize `lisIndices` to `[0]` and start our loop at `1`
3.  Loop iteration `i=1`:  
    `lisIndices` is currently `[0]`
    1. We initialize some variables:  
       `nextValue = 8` (`nums[i]`)  
       `lastIndex = 0` (`lisIndices[lisIndices.length - 1]`)  
       `lastValue = 0` (`nums[lasIndex]`)
    2. `0 < 8 == true` (`lastValue < nextValue`)  
       The next value in our array is greater than the last value in our current increasing subsequence, so let's add it to the subsequence:
    3. `lisIndices.push(1)`
4.  Loop iteration `i=2`  
    `lisIndices` is currently `[0, 1]`

    1.  Initialize variables  
        `nextValue = 3` (`nums[i]`)  
        `lastIndex = 1` (`lisIndices[lisIndices.length - 1]`)  
        `lastValue = 8` (`nums[lasIndex]`)
    2.  `8 < 3 == false` (`lastValue < nextValue`)

             		TODO: Here we've reached our first

#### Example 2: 1 4 5 6 2 3

## Algorithm

Design decisions:

1. Use linked list for perf and memory reasons
2. Iterate backwards cuz `insertBefore` is the API available on `Node` in DOM. We can't use `after` or `before` cuz DocumentFragment and Document don't support it.

TODO: Talk about `insertBefore` and how DOM objects such as Document and DocumentFragment only support `insertBefore` and not newer methods such as `after` or `before` since they are only containers. You can't place a node after the document which is the root container. This limitation motivates using `prev` pointers in our algorithm.

For understanding this algorithm, we are going to use a linked list to represent our array of children. Here is the structure of the linked list node we will use:

```ts
interface Node {
	/** The position of this node in the original list of children */
	index: number;
	next: Node | null;
}
```

TODO: finish

## Adding new nodes and deletions

TODO: fill out

## Summary

Basic algorithm for diffing virtual dom children:

1. Find matches between current and new children
2. Determine which children should move
3. Unmount, mount, and move children to match the new order

When determining which children should move, we want to minimize the number of children that move (moving DOM nodes can be expensive). To do this, we need to determine longest subsequence of children that didn't move. One way to do this is to find the longest common subsequence between the current children and next children. However, the longest common subsequence runs in $O(n^2)$ time.

If we map the array of current and next children into new arrays using their indices from the current children array, we can run a more efficient algorithm. For example, given current children of `a c b e d f` and next children of `a b c d e f`, we use the current children array to create a map of item to index in that array: `{a: 0, c: 1, b: 2, e: 3, d: 4, f: 5}`. Now create arrays using this map.

```text
Current children
  key: a c b e d f
index: 0 1 2 3 4 5

New children
           key: a b c d e f
original index: 0 2 1 4 3 5
```

Because the original array will always be sorted in increasing order, any common subsequence between the current and new children will also be increasing. Said another way, any increasing subsequence of the new children array is also a subsequence in the current children. So if we find the longest increasing subsequence in the new children array, we've found the longest common subsequence between the two arrays! Looking for the longest increasing subsequence, we no longer need to compare the two arrays and can instead just look at the new children array.

To find the longest increasing subsequence, we need to keep track of two things as we traverse the array:

1. The node/index that ends the smallest (in value) subsequence of each length

   For example, the subsequence `0 1 2` is smaller than `4 5 6` since the values in the subsequence are smaller

2. The complete subsequence for each length

For #1, let's take a look at two examples, `0 8 3 6` and `4 5 3 2`. Upon traversing over the first two elements (`0 8` in the first example and `4 5` in the second), we add them to our current increasing subsequence since they are all increasing. However, when we get to `3`, we need to decide whether to throw away our existing subsequence to include `3` or not. In first example, we should use `3` because using `3` gives us a longer subsequence `0 3 6`. But in the second example, we should not because `4 5` is the longest increasing subsequence.

This decision is where #1 comes into play. After traversing the first two elements we end up with array `[0, 1]` signaling that the smallest increasing subsequence of length 1 starts at index `0`, the smallest subsequence of length 2 starts at index `2`, and so on. Upon reaching the value `3`, we search through our existing array to see if it can form start a smaller subsequence.

In the first example, `3 < 8` so we replace the `8`'s index (`1`) with `3`'s index: `[0, 2]`. When we get to `6`, the tip of our subsequence is the value at index `2` (`3`). Since `6 > 3`, we add to our subsequence.

In the second example, `3 < 4` so we replace `4`'s index (`0`) with `3`'s index: `[2, 1]`. However, we have now broken our subsequence. `3` doesn't come before `5` in the original array. Doing this is okay though because this array we are using is only keeping track of the index that starts the subsequence at that length.

And this is where #2 comes into play. Since #1 only keeps tracks of the start of an increasing subsequence, we use an additional data structure to keep track of what the actual subsequence that starts at that index is. This data structure can be an array of the index that comes before current index in its increasing subsequence, or if using a linked list, a pointer to the previous node in its increasing subsequence.

In Preact, we use linked lists to traverse the virtual DOM tree for better memory and performance. Also, to support DOM objects such as Document and DocumentFragment, we only use the `insertBefore` method to move DOM nodes around. Because `insertBefore` requires knowing the node that comes after the node to insert, we loop through children backwards, setting up a nodes next sibling before itself.

## Acknowledgements

- @localvoid and his work in `ivi`
- Domenic and his work in inferno
- leetcode editors for the great descriptions of these algorithms on their website
