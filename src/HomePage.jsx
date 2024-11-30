import React, { useState } from "react";
import { useOkto } from "okto-sdk-react";
import ReadData from './ReadData';

const HomePage = ({ authToken, handleLogout }) => {
  console.log("HomePage component rendered: ", authToken);
  const [transferResponse, setTransferResponse] = useState(null);
  const [orderResponse, setOrderResponse] = useState(null);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState(null);
  const {transferTokens, orderHistory } = useOkto();
  const [transferData, setTransferData] = useState({
    network_name: "",
    token_address: "",
    quantity: "",
    recipient_address: "",
  });
  const [orderData, setOrderData] = useState({
    order_id: "",
  });

  const handleTransferTokens = async (e) => {
    e.preventDefault();
    try {
      const response = await transferTokens(transferData);
      setTransferResponse(response);
      setActiveSection('transferResponse');
    } catch (error) {
      setError(`Failed to transfer tokens: ${error.message}`);
    }
  };

  const handleInputChange = (e) => {
    setTransferData({ ...transferData, [e.target.name]: e.target.value });
  };

  const handleOrderCheck = async (e) => {
    e.preventDefault();
    try {
      const response = await orderHistory(orderData);
      setOrderResponse(response);
      setActiveSection('orderResponse');
    } catch (error) {
      setError(`Failed to fetch order status: ${error.message}`);
    }
  };

  const handleInputChangeOrders = (e) => {
    setOrderData({ ...orderData, [e.target.name]: e.target.value });
  };

  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px',
    maxWidth: '800px',
    margin: '0 auto',
  };
  const buttonStyle = {
    margin: '5px',
    padding: '10px 20px',
    fontSize: '16px',
    cursor: 'pointer',
  };
  const formStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    maxWidth: '400px',
  };
  const inputStyle = {
    margin: '5px',
    padding: '10px',
    width: '100%',
    fontSize: '16px',
  };

  return (
    <div style={containerStyle}>
      <h1>Home Page</h1>
      <ReadData handleLogout={handleLogout} authToken={authToken}/>

      <h2>Transfer Tokens</h2>
      <h3>Note: When transferring the native token of any chain, please enter the token_address as a single space </h3>
      <form style={formStyle} onSubmit={handleTransferTokens}>
        <input
          style={inputStyle}
          type="text"
          name="network_name"
          placeholder="Network Name"
          value={transferData.network_name}
          onChange={handleInputChange}
          required
        />
        <input
          style={inputStyle}
          type="text"
          name="token_address"
          placeholder="Token Address"
          value={transferData.token_address}
          onChange={handleInputChange}
          required
        />
        <input
          style={inputStyle}
          type="text"
          name="quantity"
          placeholder="Quantity"
          value={transferData.quantity}
          onChange={handleInputChange}
          required
        />
        <input
          style={inputStyle}
          type="text"
          name="recipient_address"
          placeholder="Recipient Address"
          value={transferData.recipient_address}
          onChange={handleInputChange}
          required
        />
        <button style={buttonStyle} type="submit">Transfer Tokens</button>
      </form>
      {activeSection === 'transferResponse' && transferResponse && (
        <div>
          <h2>Transfer Response:</h2>
          <pre>{JSON.stringify(transferResponse, null, 2)}</pre>
        </div>
      )}
      <h2>Check Order</h2>
      <form style={formStyle} onSubmit={handleOrderCheck}>
        <input
          style={inputStyle}
          type="text"
          name="order_id"
          placeholder="Order Id"
          value={orderData.order_id}
          onChange={handleInputChangeOrders}
          required
        />
        <button style={buttonStyle} type="submit">Check Status</button>
      </form>
      {activeSection === 'orderResponse' && orderResponse && (
        <div>
          <h2>Order Status:</h2>
          <pre>{JSON.stringify(orderResponse, null, 2)}</pre>
        </div>
      )}
      {error && (
        <div style={{ color: 'red' }}>
          <h2>Error:</h2>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}

export default HomePage;