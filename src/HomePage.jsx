import React, { useState } from 'react';
import { useOkto } from "okto-sdk-react";
import { Loader2, Send, CheckCircle2, XCircle } from "lucide-react";

const HomePage = ({ authToken, handleLogout }) => {
  const [userInput, setUserInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const [transferStatus, setTransferStatus] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const { transferTokens, orderHistory } = useOkto();

  const SUPPORTED_NETWORKS = {
    "APTOS": ["aptos", "apt"],
    "APTOS_TESTNET": ["aptos testnet", "aptos test", "aptostestnet", "aptos-testnet"],
    "BASE": ["base"],
    "POLYGON": ["polygon", "matic"],
    "POLYGON_TESTNET_AMOY": ["polygon testnet", "polygon test", "polygon-testnet"],
    "SOLANA": ["solana", "sol"],
    "SOLANA_DEVNET": ["solana devnet", "solana dev", "solana-devnet"]
  };

  const processNaturalLanguage = async (input) => {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{
            role: "system",
            content: `Extract transfer details from user input using these exact rules:

1. Format: "transfer {quantity} {token} to {address} on {network}"

2. Extract these fields:
   - quantity: number before the token symbol
   - token_address: always use " " (single space)
   - recipient_address: the address after "to"
   - network_name: map to one of these exact values:
     * "APTOS" for: aptos, apt (if no testnet mentioned)
     * "APTOS_TESTNET" for: aptos testnet, aptos test
     * "BASE" for: base
     * "POLYGON" for: polygon, matic
     * "POLYGON_TESTNET_AMOY" for: polygon testnet, polygon test
     * "SOLANA" for: solana, sol
     * "SOLANA_DEVNET" for: solana devnet, solana dev

3. Always return this exact JSON structure:
{
  "network_name": "<EXACT_NETWORK_NAME>",
  "token_address": " ",
  "quantity": <number>,
  "recipient_address": "<full_address>"
}

Example input: "transfer 2 apt to 0xc3df44663b7541bc5ce2793c12814dad216cdf05855c66381a8cb797e6bf9656 on aptos testnet"
Example output:
{
  "network_name": "APTOS_TESTNET",
  "token_address": " ",
  "quantity": 2,
  "recipient_address": "0xc3df44663b7541bc5ce2793c12814dad216cdf05855c66381a8cb797e6bf9656"
}`
          }, {
            role: "user",
            content: input
          }],
          temperature: 0.1
        })
      });

      const data = await response.json();
      const parsedDetails = JSON.parse(data.choices[0].message.content);
      
      // Validate network name
      if (!Object.keys(SUPPORTED_NETWORKS).includes(parsedDetails.network_name)) {
        throw new Error(`Unsupported network: ${parsedDetails.network_name}`);
      }

      return parsedDetails;
    } catch (error) {
      throw new Error("Failed to process natural language input: " + error.message);
    }
  };

  const executeTransfer = async (input) => {
    setIsProcessing(true);
    setTransferStatus({ status: "PROCESSING", message: "Initiating transfer..." });
    setShowStatusModal(true);

    try {
      const transferDetails = await processNaturalLanguage(input);
      const result = await executeAiTokenTransfer(transferDetails);
      
      if (result.success && result.data?.orderId) {
        setCurrentOrderId(result.data.orderId);
        await monitorTransferStatus(result.data.orderId);
      } else {
        throw new Error(result.error || "Transfer failed to initiate");
      }
    } catch (error) {
      setTransferStatus({
        status: "FAILED",
        error: error.message
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const monitorTransferStatus = async (orderId) => {
    let attempts = 0;
    const maxAttempts = 20; // Maximum number of attempts (1 minute with 3s intervals)
    
    const checkStatus = async () => {
      try {
        const response = await orderHistory({ order_id: orderId });
        console.log("Status check response:", response);

        if (response?.jobs && response.jobs.length > 0) {
          const job = response.jobs[0];
          const status = job.status;

          setTransferStatus({
            status,
            hash: job.transaction_hash,
            timestamp: job.updated_at,
            message: status === "SUCCESS" ? "Transaction completed successfully" :
                     status === "FAILED" ? "Transaction failed" :
                     "Processing transaction..."
          });

          return status === "SUCCESS" || status === "FAILED";
        }

        attempts++;
        setTransferStatus({
          status: "PROCESSING",
          message: `Checking transaction status (attempt ${attempts}/${maxAttempts})...`
        });

        return false;
      } catch (error) {
        console.error("Status check error:", error);
        attempts++;
        
        if (attempts >= maxAttempts) {
          setTransferStatus({
            status: "FAILED",
            error: "Failed to get transaction status after multiple attempts"
          });
          return true;
        }
        
        return false;
      }
    };

    while (!(await checkStatus()) && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  };

  const executeAiTokenTransfer = async ({
    network_name,
    token_address,
    quantity,
    recipient_address,
  }) => {
    try {
      console.log("Transfer details:", network_name, quantity, recipient_address ,token_address);
      if (!network_name || !quantity || !recipient_address) {
        throw new Error("Network, quantity, and recipient address are required");
      }

      quantity = String(quantity);

      const response = await transferTokens({
        network_name,
        token_address,
        quantity,
        recipient_address,
      });

      return {
        success: true,
        data: {
          orderId: response.orderId
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || "Transfer failed"
      };
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
            Token Transfer Assistant
          </h1>
          
          <div className="space-y-4">
            <p className="text-gray-600 text-sm">
              Describe your transfer in natural language. For example:
              <span className="block mt-1 text-gray-800 italic">
                "Transfer 2 APT to 0xc3df44663b7541bc5ce2793c12814dad216cdf05855c66381a8cb797e6bf9656 on Aptos Testnet"
              </span>
            </p>
            
            <div className="flex gap-2">
              <input
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Describe your transfer..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isProcessing}
              />
              <button 
                onClick={() => executeTransfer(userInput)}
                disabled={isProcessing || !userInput}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[44px]"
              >
                {isProcessing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="text-lg font-semibold mb-4 flex items-center gap-2">
              {transferStatus?.status === "SUCCESS" ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>Transfer Successful</span>
                </div>
              ) : transferStatus?.status === "FAILED" ? (
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="h-5 w-5" />
                  <span>Transfer Failed</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-600">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>{transferStatus?.message || "Processing Transfer..."}</span>
                </div>
              )}
            </div>

            <div className="mt-4">
              {transferStatus?.status === "SUCCESS" ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Transaction Hash:</p>
                  <div className="bg-gray-50 rounded-md p-3 font-mono text-sm break-all">
                    {transferStatus.hash}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Completed at: {new Date(transferStatus.timestamp).toLocaleString()}
                  </p>
                </div>
              ) : transferStatus?.status === "FAILED" ? (
                <p className="text-red-600">{transferStatus.error}</p>
              ) : (
                <p className="text-gray-600">{transferStatus?.message || "Please wait while we process your transfer..."}</p>
              )}
            </div>

            {(transferStatus?.status === "SUCCESS" || transferStatus?.status === "FAILED") && (
              <button
                onClick={() => {
                  setShowStatusModal(false);
                  setTransferStatus(null);
                  setCurrentOrderId(null);
                }}
                className="mt-6 w-full px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;