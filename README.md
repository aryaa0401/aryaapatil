
# On-Chain Expense Tracker (Sepolia)

This is a decentralized expense tracker DApp built using Solidity, React, and Ethers.js, deployed on the Sepolia testnet. It allows users to register, add and track shared expenses, and view balances transparently on-chain.


##  New Feature Added: Display Connected Wallet Address on Connect

###  Description:
A new feature has been implemented that **displays the user's connected wallet address immediately upon connection**, even **before registration**. This gives users clear feedback that their MetaMask wallet has been successfully connected and adds a smoother user experience.

###  Purpose:
Previously, users had no confirmation that their wallet was connected unless they were registered. Now, the app immediately shows a wallet address after connection, making it easier to understand the current state.


##  Code Fix Summary:

###  File: `App.js`

**Changes made in the registration check condition:**

```jsx
!isRegistered ? (
  <div>
    <p>Connected as: {account.slice(0, 6)}...{account.slice(-4)}</p>
    <h2>Register</h2>
    ...
  </div>
)
```

- The line:
  ```jsx
  <p>Connected as: {account.slice(0, 6)}...{account.slice(-4)}</p>
  ```
  was added **before the registration form**, so even unregistered users can see their wallet address once connected.



##  Technologies Used

- **Solidity** – Smart Contract Development
- **React.js** – Frontend UI
- **Ethers.js** – Blockchain Interaction
- **MetaMask** – Wallet Integration
- **Sepolia Testnet** – Deployment Environment



##  Project Structure

- `App.js` – Main React component managing DApp logic and UI.
- `ExpenseTracker.sol` – Smart contract storing all expense data.
- `ExpenseTrackerABI.json` – ABI interface generated from smart contract.
- `README.md` – Documentation for setup and features.



##  Setup Instructions

1. Clone this repository.
2. Install dependencies: `npm install`
3. Start the app: `npm start`
4. Make sure MetaMask is connected to Sepolia.
5. Interact with the DApp.


