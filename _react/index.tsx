import React, { useState } from "react";
import { hello } from "npm-lib-name/core";

export const Hello = (): JSX.Element => {
  const [name, setName] = useState("");

  return (
    <div>
      <input
        value={name}
        onChange={(ev) => {
          setName(ev.target.value);
        }}
      />
      <pre>
        <code>{hello(name)}</code>
      </pre>
    </div>
  );
};
