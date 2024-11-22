// add more from https://hackernoon.com/the-big-o-notation-in-javascript

// O(log n)
export const binarySearch = (array: number[], value: number) => {
  let start = 0;
  let end = array.length - 1;
  let middle = Math.floor((start + end) / 2);

  const middleValue = array[middle];

  if (!middleValue) return -1;

  while (middleValue !== value && start <= end) {
    if (value < middleValue) {
      end = middle - 1;
    } else {
      start = middle + 1;
    }
    middle = Math.floor((start + end) / 2);
  }

  if (middle === value) {
    return array[middle];
  }

  return -1;
};
