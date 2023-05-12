import { exclamation } from "./exclamation.ts";

test("exclamation says exclamation", () => {
  expect(exclamation("world")).toBe(`world!`);
});
