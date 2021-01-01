export const takeTicket = (() => {
  let count = 0;
  return () => count++;
})();
