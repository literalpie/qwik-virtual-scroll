import { component$, useStylesScoped$ } from "@builder.io/qwik";
import styles from "./header.css?inline";

export default component$(() => {
  useStylesScoped$(styles);

  return (
    <header>
      <div style={{ padding: "8px" }}>
        <h1>Qwik Virtual Scroll</h1>
      </div>
    </header>
  );
});
