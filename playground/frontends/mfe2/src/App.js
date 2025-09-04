import React, { useEffect } from "react";
import { logSampleMessage, getCurrentTimestamp } from "common-utils";
import "./App.css";

function App() {
  useEffect(() => {
    logSampleMessage();
    console.log("Current timestamp:", getCurrentTimestamp());
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Micro Frontend 2 (MFE2)</h1>
        <p>This is the second React micro frontend for testing.</p>
        <p>Check the console for messages from common-utils!</p>
        <div className="timestamp">Loaded at: {getCurrentTimestamp()}</div>
      </header>
    </div>
  );
}

export default App;
