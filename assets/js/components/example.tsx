import { useState } from "react";

export default function ExampleComponent() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>
    </div>
  );
}
