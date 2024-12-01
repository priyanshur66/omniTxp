import React, { useState } from "react";
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
    APTOS: ["aptos", "apt"],
    APTOS_TESTNET: [
      "aptos testnet",
      "aptos test",
      "aptostestnet",
      "aptos-testnet",
    ],
    BASE: ["base"],
    POLYGON: ["polygon", "matic"],
    POLYGON_TESTNET_AMOY: [
      "polygon testnet",
      "polygon test",
      "polygon-testnet",
    ],
    SOLANA: ["solana", "sol"],
    SOLANA_DEVNET: ["solana devnet", "solana dev", "solana-devnet"],
  };

  const processNaturalLanguage = async (input) => {
    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
              {
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
}`,
              },
              {
                role: "user",
                content: input,
              },
            ],
            temperature: 0.1,
          }),
        }
      );

      const data = await response.json();
      const parsedDetails = JSON.parse(data.choices[0].message.content);

      // Validate network name
      if (
        !Object.keys(SUPPORTED_NETWORKS).includes(parsedDetails.network_name)
      ) {
        throw new Error(`Unsupported network: ${parsedDetails.network_name}`);
      }

      return parsedDetails;
    } catch (error) {
      throw new Error(
        "Failed to process natural language input: " + error.message
      );
    }
  };

  const executeTransfer = async (input) => {
    setIsProcessing(true);
    setTransferStatus({
      status: "PROCESSING",
      message: "Initiating transfer...",
    });
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
        error: error.message,
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
            message:
              status === "SUCCESS"
                ? "Transaction completed successfully"
                : status === "FAILED"
                ? "Transaction failed"
                : "Processing transaction...",
          });

          return status === "SUCCESS" || status === "FAILED";
        }

        attempts++;
        setTransferStatus({
          status: "PROCESSING",
          message: `Checking transaction status (attempt ${attempts}/${maxAttempts})...`,
        });

        return false;
      } catch (error) {
        console.error("Status check error:", error);
        attempts++;

        if (attempts >= maxAttempts) {
          setTransferStatus({
            status: "FAILED",
            error: "Failed to get transaction status after multiple attempts",
          });
          return true;
        }

        return false;
      }
    };

    while (!(await checkStatus()) && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  };

  const executeAiTokenTransfer = async ({
    network_name,
    token_address,
    quantity,
    recipient_address,
  }) => {
    try {
      console.log(
        "Transfer details:",
        network_name,
        quantity,
        recipient_address,
        token_address
      );
      if (!network_name || !quantity || !recipient_address) {
        throw new Error(
          "Network, quantity, and recipient address are required"
        );
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
          orderId: response.orderId,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || "Transfer failed",
      };
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-sm mx-auto pt-8">
        <div className="bg-black rounded-lg overflow-hidden">
          <div className="p-4 space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-purple-500">Omnify</h1>
              <p className="text-gray-400 text-sm">
                Pay on aptos with any token
              </p>
            </div>

            <div className="space-y-4">
              <input
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Your prompt"
                className="w-full px-4 py-3 bg-gray-900 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                disabled={isProcessing}
              />

              <button
                onClick={() => executeTransfer(userInput)}
                disabled={isProcessing || !userInput}
                className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Execute
              </button>
            </div>

            <div className="text-center text-sm text-gray-500">
              Powered by octo
            </div>
          </div>
        </div>

        {/* Status Modal */}
        {showStatusModal && (
          <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4">
            <div className="max-w-sm w-full bg-black p-6 rounded-lg space-y-4">
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-purple-500">Omnify</h1>
                <p className="text-gray-400 text-sm">
                  Pay on aptos with any token
                </p>
              </div>

              <div className="flex justify-center">
                {transferStatus?.status === "SUCCESS" ? (
                  <div className="text-green-400 w-16 h-16">
                    <CheckCircle2 className="w-full h-full" />
                  </div>
                ) : transferStatus?.status === "FAILED" ? (
                  <div className="text-red-400 w-16 h-16">
                    <XCircle className="w-full h-full" />
                  </div>
                ) : (
                  <div className="text-purple-500 w-16 h-16">
                    <Loader2 className="w-full h-full animate-spin" />
                  </div>
                )}
              </div>

              <div className="text-center">
                {transferStatus?.status === "SUCCESS" ? (
                  <div className="space-y-4">
                    <p className="text-lg font-medium text-white">
                      Transaction successful!
                    </p>
                    <button
                      onClick={() => {
                        /* Add copy functionality */
                      }}
                      className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none"
                    >
                      copy hash
                    </button>
                  </div>
                ) : transferStatus?.status === "FAILED" ? (
                  <div className="space-y-4">
                    <p className="text-lg font-medium text-red-400">
                      Transaction failed
                    </p>
                    <p className="text-gray-400">{transferStatus.error}</p>
                  </div>
                ) : (
                  <p className="text-lg font-medium text-white">
                    Processing transaction...
                  </p>
                )}
              </div>

              {(transferStatus?.status === "SUCCESS" ||
                transferStatus?.status === "FAILED") && (
                <button
                  onClick={() => {
                    setShowStatusModal(false);
                    setTransferStatus(null);
                    setCurrentOrderId(null);
                  }}
                  className="w-full py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 focus:outline-none"
                >
                  Close
                </button>
              )}

              <div className="text-center text-sm text-gray-500">
                Powered by octo
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
