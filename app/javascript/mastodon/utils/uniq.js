export const uniq = array => {
  return array.filter((x, i, self) => self.indexOf(x) === i);
};

export const uniqCompact = array => {
  return array.filter((x, i, self) => x && self.indexOf(x) === i);
};

export const uniqWithoutNull = array => {
  return array.filter((x, i, self) => !x || self.indexOf(x) === i);
};
