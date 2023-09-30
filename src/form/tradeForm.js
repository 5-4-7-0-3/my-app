import React, { useState, useEffect } from 'react';
import '../styles.css';
import useWebSocket from 'react-use-websocket';

function TradeForm() {
  const initialBalance = 100;
  const leverage = 50; // Плечо x50
  const [balance, setBalance] = useState(initialBalance);
  const [btcPrice, setBtcPrice] = useState(0);
  const [inputAmount, setInputAmount] = useState('');
  const [showBalance, setShowBalance] = useState(true);
  const [trades, setTrades] = useState([]);

  const socketUrl = 'wss://stream.binance.com:9443/ws/btcusdt@trade';
  const {
    lastMessage,
  } = useWebSocket(socketUrl, {
    onOpen: () => console.log('WebSocket Connected'),
    shouldReconnect: (closeEvent) => true,
  });

  useEffect(() => {
    if (lastMessage !== null && lastMessage.data) {
      const messageData = JSON.parse(lastMessage.data);
      setBtcPrice(parseFloat(messageData.p));
    }
  }, [lastMessage]);

  // Добавляем useEffect для обновления прибыли/убытка при изменении цены BTC
  useEffect(() => {
  // Функция для обновления прибыли/убытка в каждой сделке
    const updateProfitForTrades = () => {
      setTrades((prevTrades) => {
        return prevTrades.map((trade) => {

          if (trade.close) {
            return trade;
          }

          if (trade.amount + parseInt(trade.profit) <= 0) {
            trade.close = true;
            trade.status = 'Закрыто';
            const newBalance = balance + trade.profit + trade.amount;
            setBalance(newBalance)
            return trade;
          }

          if (trade.type === 'LONG') {
            // Прибыль для длинной позиции
            trade.profit = ((((btcPrice - trade.openingPrice) * trade.amount / trade.openingPrice) * trade.leverage) * trade.leverage).toFixed(2);
          } else {
            // Прибыль для короткой позиции
            trade.profit = ((((trade.openingPrice - btcPrice) * trade.amount / trade.openingPrice) * trade.leverage) * trade.leverage).toFixed(2);
          }
          trade.btcPrice = btcPrice;

          return trade;
        });
      });
    };

    updateProfitForTrades();
  }, [btcPrice]);

  const handleTrade = (type) => {
    const amount = parseFloat(inputAmount);
    if (isNaN(amount) || amount <= 0 || amount > balance) {
      alert('Введите корректную сумму для покупки.');
      return;
    }

    const tradeValue = amount * leverage; // Сумма сделки в USDT с учетом плеча x50
    const btcValue = tradeValue / btcPrice; // Количество BTC, купленных на сумму USDT
    const newBalance = balance - amount; // Уменьшаем баланс при открытии сделки
    setBalance(newBalance);
    const newTrade = {
      type: type,
      amount, // Сумма сделки в USDT
      amountCredit: tradeValue,
      btcAmount: btcValue.toFixed(6), // Количество BTC
      status: 'Открыто',
      close: false,
      profit: '0.00', // Начальное значение прибыли
      leverage: leverage,
      openingPrice: btcPrice,
      btcPrice
    };
    setTrades([...trades, newTrade]);
    setInputAmount('');
  };

  const handleClose = (index) => {
    const closedTrade = trades[index];
  
    // Если тип сделки LONG (покупка)
    if (closedTrade.type === 'LONG') {
      closedTrade.profit = (((btcPrice - closedTrade.openingPrice) * closedTrade.amount / closedTrade.openingPrice) * closedTrade.leverage) * closedTrade.leverage;
    } else {
      closedTrade.profit = (((closedTrade.openingPrice - btcPrice) * closedTrade.amount / closedTrade.openingPrice) * closedTrade.leverage) * closedTrade.leverage;
    }
  
    // Рассчитываем новый баланс
    const newBalance = balance + closedTrade.profit + closedTrade.amount;
    // Обновляем баланс и статус сделки
    setBalance(newBalance);
    const profit = closedTrade.profit.toFixed(2)
    const updatedTrades = trades.map((trade, i) =>
      i === index ? { ...trade, status: 'Закрыто', close: true, profit } : trade
    );
    setTrades(updatedTrades);
  };
  

  const formatBalance = () => {
    const btcValue = (balance / btcPrice).toFixed(6);
    return `(${balance.toFixed(2)}$ ≈ ${btcValue} BTC)`;
  };

  return (
    <div className="trade-form">
      <h2>Фьючерсные контракты на BTC/USDT</h2>
      <p>
        Плечо: x{leverage}
      </p>
      Цена BTC: {btcPrice.toFixed(2)}$
      <div>
        <input
          className='input-field'
          type="number"
          placeholder="Введите сумму в USDT"
          value={inputAmount}
          onChange={(e) => setInputAmount(e.target.value)}
        />
      </div>
      <div className="buttons-container">
        <button className="long-button" onClick={() => handleTrade('LONG')}>
          LONG
        </button>
        <button className="short-button" onClick={() => handleTrade('SHORT')}>
          SHORT
        </button>
      </div>
      <p>
        <br />
        Баланс: {showBalance ? <span className="visible">{formatBalance()}</span> : '***'}
        <span className="toggle-eye" onClick={() => setShowBalance(!showBalance)}>
          {showBalance ? '👁️' : '👁️'}
        </span>
      </p>
      <table className="trade-table">
        <thead>
          <tr>
            <th>Тип</th>
            <th>Сумма (USDT)</th>
            <th>Сумма (USDT)x50</th>
            <th>Цена открытия</th>
            <th>Количество BTC</th>
            <th>Статус</th>
            <th>Прибыль/Убыток (USDT)</th>
            <th>BCT при закрытии(USDT)</th>
            <th>Закрыть</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade, index) => (
            <tr key={index}>
              <td>{trade.type}</td>
              <td>{trade.amount}</td>
              <td>{trade.amountCredit}</td>
              <td>{trade.openingPrice.toFixed(2)}</td> 
              <td>{trade.btcAmount}</td>
              <td>{trade.status}</td>
              <td>{trade.profit}</td> {/* Отображаем прибыль/убыток из состояния сделки */}
              <td>{trade.btcPrice}</td>
              <td>{!trade.close && <button onClick={() => handleClose(index)}>Закрыть</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TradeForm;
