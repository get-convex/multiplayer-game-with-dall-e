const LETTERS = [
  "B",
  "C",
  "D",
  "F",
  "G",
  "H",
  "J",
  "K",
  "L",
  "M",
  "N",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "V",
  "W",
  "X",
  "Z",
  "2",
  "5",
  "6",
  "9",
];
export const randomSlug = (): string => {
  var acc = [];
  for (var i = 0; i < 4; i++) {
    acc.push(LETTERS[Math.floor(Math.random() * LETTERS.length)]);
  }
  return acc.join("");
};
