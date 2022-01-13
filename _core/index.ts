import fs from "fs-extra";

export const hello = (world: string): string => {
  return (
    `Hello ${world}!` +
    fs
      .readdirSync(__dirname)
      .map((name) => `\n  * ${name}`)
      .join("")
  );
};
