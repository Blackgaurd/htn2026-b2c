/**
 * App shell. Keeps the demo chrome (phone bezel) separate from the screens, so
 * screens stay plain components and the frame can be dropped at any time.
 */

import "./index.css";
import { ItemsScreen } from "./components/ItemsScreen";
import { PhoneFrame } from "./components/PhoneFrame";

export function App() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center p-6">
      <div className="phone-stage">
        <PhoneFrame>
          <ItemsScreen />
        </PhoneFrame>
      </div>
    </main>
  );
}

export default App;
