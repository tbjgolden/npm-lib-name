import { hello } from "./index.ts";

test("hello says hello", () => {
  expect(hello("world")).toBe(`Hello world!`);
});
