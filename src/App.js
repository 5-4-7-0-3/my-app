import React, { useState } from 'react';
import TradeForm from './form/tradeForm.js';

function App() {
  const [balance, setBalance] = useState(100);
  const [pair, setPair] = useState('BTC/USD');
  const leverage = 50;

  return (
    <div className="App">
      <h1>Торговля на рынке</h1>
      <TradeForm balance={balance} setBalance={setBalance} pair={pair} leverage={leverage} />
    </div>
  );
}

export default App;