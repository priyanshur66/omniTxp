import React, { useState, useEffect } from "react";
import { useOkto } from "okto-sdk-react";
import {
  Loader2,
  Send,
  CheckCircle2,
  XCircle,
  Copy,
  X,
  User,
  UserCircle,
  Plus,
  Trash2,
} from "lucide-react";

const HomePage = ({ authToken, handleLogout }) => {
  const [userInput, setUserInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const [transferStatus, setTransferStatus] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userData, setUserData] = useState(null);
  const [portfolioData, setPortfolioData] = useState(null);
  const [walletData, setWalletData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const [contacts, setContacts] = useState([]);
  const [newContact, setNewContact] = useState({ name: "", address: "" });
  const [storedNumber, setStoredNumber] = useState(null);

  const {
    transferTokens,
    orderHistory,
    getUserDetails,
    getPortfolio,
    createWallet,
  } = useOkto();

  // Load contacts from localStorage on component mount
  useEffect(() => {
    localStorage.setItem("contacts", JSON.stringify(contacts));
  }, [contacts]);

  const handleRetrieveNumber = async () => {
    try {
      const response = await fetch(
        "http://localhost:3000/api/contract/execute",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contractAddress: "0xdAaA57d9Ee79aC8856CF6C117531cD1FB2c44f73",
            abi: [
              {
                inputs: [
                  {
                    internalType: "uint256",
                    name: "num",
                    type: "uint256",
                  },
                ],
                name: "store",
                outputs: [],
                stateMutability: "nonpayable",
                type: "function",
              },
              {
                inputs: [],
                name: "retrieve",
                outputs: [
                  {
                    internalType: "uint256",
                    name: "",
                    type: "uint256",
                  },
                ],
                stateMutability: "view",
                type: "function",
              },
            ],
            functionName: "retrieve",
            params: [],
            chainId: "baseSepolia",
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setStoredNumber(data.result);
        console.log("Retrieved number:", data.result);
      } else {
        console.error("Failed to retrieve number:", data.error);
      }
    } catch (error) {
      console.error("Error retrieving number:", error);
    }
  };

  // Save contacts to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("contacts", JSON.stringify(contacts));
  }, [contacts]);

  const addContact = () => {
    if (newContact.name && newContact.address) {
      setContacts([...contacts, newContact]);
      setNewContact({ name: "", address: "" });
    }
  };

  const removeContact = (index) => {
    const updatedContacts = contacts.filter((_, i) => i !== index);
    setContacts(updatedContacts);
  };

  const fetchUserData = async () => {
    setIsLoading(true);
    try {
      const [details, portfolio, wallets] = await Promise.all([
        getUserDetails(),
        getPortfolio(),
        createWallet(),
      ]);
      setUserData(details);
      setPortfolioData(portfolio);
      setWalletData(wallets);
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
    setIsLoading(false);
  };

  const handleCopyAddress = async (address) => {
    await navigator.clipboard.writeText(address);
    setCopyStatus(address);
    setTimeout(() => setCopyStatus(""), 2000);
  };
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

  const findClosestContactMatch = (inputText) => {
    console.log("Finding contact match for input:", inputText);
    console.log("Available contacts:", contacts);

    // Extract potential recipient name using various payment phrases
    const paymentPatterns = [
      /(?:pay|send|transfer|give)\s+([^0-9][^\s]+(?:\s+[^\s]+)*?)(?:\s+\d+|\s+on\s|$)/i, // Matches: pay NAME amount/on
      /(?:to|for)\s+([^0-9][^\s]+(?:\s+[^\s]+)*?)(?:\s+on\s|$)/i, // Matches: to NAME on
    ];

    let potentialName = null;
    for (const pattern of paymentPatterns) {
      const match = inputText.match(pattern);
      if (match) {
        potentialName = match[1].trim().toLowerCase();
        console.log(
          "Found potential name using pattern:",
          pattern,
          "Name:",
          potentialName
        );
        break;
      }
    }

    if (!potentialName) {
      console.log("No recipient found in input");
      return null;
    }

    console.log("Potential recipient name:", potentialName);

    // Find the most similar contact name
    let bestMatch = null;
    let highestSimilarity = 0;

    contacts.forEach((contact) => {
      const similarity = stringSimilarity(
        contact.name.toLowerCase(),
        potentialName
      );
      console.log(`Similarity for ${contact.name}:`, similarity);

      if (similarity > highestSimilarity && similarity > 0.5) {
        // Threshold of 0.5
        highestSimilarity = similarity;
        bestMatch = contact;
      }
    });

    console.log("Best matching contact:", bestMatch);
    return bestMatch;
  };

  const stringSimilarity = (str1, str2) => {
    // If one string contains the other, consider it a high match
    if (str1.includes(str2) || str2.includes(str1)) {
      return 0.9;
    }

    // Simple word match - if all words in one string appear in the other
    const words1 = str1.split(" ");
    const words2 = str2.split(" ");
    const matchingWords = words1.filter((word) => words2.includes(word));
    if (matchingWords.length > 0) {
      return matchingWords.length / Math.max(words1.length, words2.length);
    }

    return 0;
  };

  const processNaturalLanguage = async (input) => {
    console.log("Processing input:", input);
    const inputLower = input.toLowerCase();

    // Handle Base Sepolia requests
    if (inputLower.includes("base sepolia")) {
      await handleRetrieveNumber();
      return null;
    }

    try {
      // 1. Find Contact Match
      const matchedContact = findClosestContactMatch(input);
      console.log("Matched contact:", matchedContact);

      // 2. Process Input Text
      let processedInput = input;

      // Common token symbols and their variations
      const tokenPatterns = {
        apt: ["apt", "aptos"],
        sol: ["sol", "solana"],
        matic: ["matic", "polygon"],
        eth: ["eth", "ethereum"],
        usdc: ["usdc", "usd coin"],
        usdt: ["usdt", "tether"],
      };

      // Network variations mapping
      const networkVariations = {
        "aptos mainnet": "APTOS",
        "apt mainnet": "APTOS",
        "aptos main": "APTOS",
        "aptos test": "APTOS_TESTNET",
        "aptos testnet": "APTOS_TESTNET",
        "apt test": "APTOS_TESTNET",
        "polygon main": "POLYGON",
        "matic main": "POLYGON",
        "polygon mainnet": "POLYGON",
        "matic mainnet": "POLYGON",
        "polygon test": "POLYGON_TESTNET_AMOY",
        "polygon testnet": "POLYGON_TESTNET_AMOY",
        "matic test": "POLYGON_TESTNET_AMOY",
        "matic testnet": "POLYGON_TESTNET_AMOY",
        "solana main": "SOLANA",
        "sol main": "SOLANA",
        "solana mainnet": "SOLANA",
        "sol mainnet": "SOLANA",
        "solana test": "SOLANA_DEVNET",
        "solana testnet": "SOLANA_DEVNET",
        "sol test": "SOLANA_DEVNET",
        "sol testnet": "SOLANA_DEVNET",
        "base mainnet": "BASE",
        "base main": "BASE",
      };

      // 3. Extract transfer details using regex patterns
      const patterns = {
        // Matches: send/transfer/pay 100 APT to address
        standard:
          /(?:send|transfer|pay)\s+(\d+(?:\.\d+)?)\s*([a-zA-Z]+)\s+(?:to\s+)?([a-zA-Z0-9]+)/i,
        // Matches: give address 100 APT
        reversed:
          /(?:give|send|transfer|pay)\s+([a-zA-Z0-9]+)\s+(\d+(?:\.\d+)?)\s*([a-zA-Z]+)/i,
        // Matches: address 100 APT
        simple: /([a-zA-Z0-9]+)\s+(\d+(?:\.\d+)?)\s*([a-zA-Z]+)/i,
        // Matches: on network/chain variations
        network:
          /(?:on|in|using|via)\s+([a-zA-Z]+(?:\s+(?:mainnet|testnet|main|test))?)/i,
      };

      let quantity, token, address, network;

      // Try each pattern until we find a match
      for (const [patternName, pattern] of Object.entries(patterns)) {
        if (patternName === "network") continue;

        const match = inputLower.match(pattern);
        if (match) {
          if (patternName === "standard") {
            [, quantity, token, address] = match;
          } else if (patternName === "reversed") {
            [, address, quantity, token] = match;
          } else if (patternName === "simple") {
            [, address, quantity, token] = match;
          }
          break;
        }
      }

      // Extract network information
      const networkMatch = inputLower.match(patterns.network);
      if (networkMatch) {
        const networkPhrase = networkMatch[1].toLowerCase();
        network =
          networkVariations[networkPhrase] || networkPhrase.toUpperCase();
      } else {
        // Default networks based on token
        const tokenLower = token?.toLowerCase();
        if (tokenLower) {
          if (tokenPatterns.apt.includes(tokenLower)) network = "APTOS";
          else if (tokenPatterns.sol.includes(tokenLower)) network = "SOLANA";
          else if (tokenPatterns.matic.includes(tokenLower))
            network = "POLYGON";
          else network = "APTOS"; // Default to APTOS if no network specified
        }
      }

      // 4. Use matched contact if available
      if (matchedContact) {
        address = matchedContact.address;
        // Verify network compatibility
        if (matchedContact.network !== network) {
          throw new Error(
            `Network mismatch: Transfer is on ${network} but contact ${matchedContact.name} is on ${matchedContact.network}`
          );
        }
      }

      // 5. Validate extracted data
      if (!quantity || !token || !address || !network) {
        throw new Error(
          "Could not extract complete transfer details from input"
        );
      }

      // 6. Format response
      const transferDetails = {
        network_name: network,
        token_address: " ", // As per requirement
        quantity: parseFloat(quantity),
        recipient_address: address,
      };

      // 7. Validate network support
      if (
        !Object.keys(SUPPORTED_NETWORKS).includes(transferDetails.network_name)
      ) {
        throw new Error(`Unsupported network: ${transferDetails.network_name}`);
      }

      console.log("Parsed transfer details:", transferDetails);
      return transferDetails;
    } catch (error) {
      console.error("Error in processNaturalLanguage:", error);
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
    <div className="min-h-screen bg-black text-white flex flex-col justify-between">
      {/* Main Content */}
      <div className="flex-grow flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-lg space-y-12 flex flex-col items-center">
          {/* Header with Profile Button */}
          <div className="absolute top-4 right-4">
            <button
              onClick={() => {
                setShowProfileModal(true);
                fetchUserData();
              }}
              className="p-3 bg-purple-600 rounded-full hover:bg-purple-700 focus:outline-none"
            >
              <User className="w-6 h-6" />
            </button>
          </div>

          {/* Main Content */}
          <div className="text-center space-y-2">
            <h1 className="text-6xl font-bold text-purple-500 mb-24">Omnify</h1>
            <p className="text-gray-200 text-2xl mb-8">
              Pay on aptos with any token
            </p>
          </div>

          {/* Input and Execute Button */}
          <div className="w-full space-y-6">
            <input
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Your prompt"
              className="w-full px-8 py-6 bg-gray-900 rounded-full text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-2xl"
              disabled={isProcessing}
            />

            <button
              onClick={() => executeTransfer(userInput)}
              disabled={isProcessing || !userInput}
              className="w-full py-6 bg-purple-600 text-white rounded-full hover:bg-purple-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed text-2xl font-medium"
            >
              Execute
            </button>
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50">
          <div className="max-w-2xl w-full bg-gray-900 rounded-2xl relative max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-purple-500">Profile</h2>
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="mt-4">
                <p className="text-xl text-gray-200">
                  {userData?.name || "User"}
                </p>
                <p className="text-gray-400">
                  {userData?.email || "Email not available"}
                </p>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Contacts Section */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-gray-200">
                      Contacts
                    </h3>

                    {/* Add New Contact Form */}
                    <div className="bg-gray-800 p-4 rounded-xl space-y-4">
                      <input
                        type="text"
                        placeholder="Contact Name"
                        value={newContact.name}
                        onChange={(e) =>
                          setNewContact({ ...newContact, name: e.target.value })
                        }
                        className="w-full px-4 py-2 bg-gray-700 rounded-lg text-white placeholder-gray-400"
                      />
                      <input
                        type="text"
                        placeholder="Wallet Address"
                        value={newContact.address}
                        onChange={(e) =>
                          setNewContact({
                            ...newContact,
                            address: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 bg-gray-700 rounded-lg text-white placeholder-gray-400"
                      />
                      <select
                        value={newContact.network}
                        onChange={(e) =>
                          setNewContact({
                            ...newContact,
                            network: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 bg-gray-700 rounded-lg text-white"
                      >
                        {Object.keys(SUPPORTED_NETWORKS).map((network) => (
                          <option key={network} value={network}>
                            {network}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={addContact}
                        disabled={!newContact.name || !newContact.address}
                        className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                      >
                        <Plus className="w-4 h-4 inline mr-2" />
                        Add Contact
                      </button>
                    </div>

                    {/* Contacts List */}
                    <div className="space-y-2">
                      {contacts.map((contact, index) => (
                        <div
                          key={index}
                          className="bg-gray-800 p-4 rounded-xl flex justify-between items-center"
                        >
                          <div className="space-y-1">
                            <p className="text-purple-400 font-medium">
                              {contact.name}
                            </p>
                            <p className="text-sm text-gray-400">
                              {contact.network}
                            </p>
                            <p className="text-sm text-gray-400 font-mono break-all">
                              {contact.address}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleCopyAddress(contact.address)}
                              className="text-gray-400 hover:text-white p-2"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => removeContact(index)}
                              className="text-gray-400 hover:text-red-500 p-2"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Wallets Section */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-gray-200">
                      Your Wallets
                    </h3>
                    {walletData?.wallets?.map((wallet, index) => (
                      <div
                        key={index}
                        className="bg-gray-800 p-4 rounded-xl space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-purple-400 font-medium">
                            {wallet.network}
                          </span>
                          <button
                            onClick={() => handleCopyAddress(wallet.address)}
                            className="flex items-center space-x-2 text-gray-400 hover:text-white"
                          >
                            <Copy className="w-4 h-4" />
                            {copyStatus === wallet.address && (
                              <span className="text-green-400 text-sm">
                                Copied!
                              </span>
                            )}
                          </button>
                        </div>
                        <p className="text-sm text-gray-400 font-mono break-all">
                          {wallet.address}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Portfolio Section */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-gray-200">
                      Your Funds
                    </h3>
                    {portfolioData?.balances?.map((balance, index) => (
                      <div
                        key={index}
                        className="bg-gray-800 p-4 rounded-xl flex justify-between items-center"
                      >
                        <div>
                          <p className="text-purple-400 font-medium">
                            {balance.token_symbol}
                          </p>
                          <p className="text-sm text-gray-400">
                            {balance.network}
                          </p>
                        </div>
                        <p className="text-xl font-medium">
                          {parseFloat(balance.balance).toFixed(4)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status Modal - keeping the existing one */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50">
          <div className="max-w-md w-full bg-gray-900 p-8 rounded-2xl space-y-6">
            <div className="text-center">
              {transferStatus?.status === "SUCCESS" ? (
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
              ) : transferStatus?.status === "FAILED" ? (
                <XCircle className="w-12 h-12 text-red-500 mx-auto" />
              ) : (
                <Loader2 className="w-12 h-12 animate-spin text-purple-500 mx-auto" />
              )}
              <h3 className="text-xl font-semibold mt-4">
                {transferStatus?.message || "Processing transaction..."}
              </h3>
              {transferStatus?.hash && (
                <a
                  href={`https://explorer.aptoslabs.com/txn/${transferStatus.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300 mt-2 inline-block"
                >
                  View on Explorer
                </a>
              )}
            </div>
            <button
              onClick={() => setShowStatusModal(false)}
              className="w-full py-2 bg-gray-800 text-white rounded-xl hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <footer className="text-center mb-12 py-4">
        <p className="text-gray-500 text-lg">Powered by octo</p>
      </footer>
    </div>
  );
};

export default HomePage;