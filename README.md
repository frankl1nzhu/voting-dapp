# Voting DApp

A decentralized voting application built with Solidity and React that allows for a transparent and secure voting process where registered voters can submit proposals and vote on them.

## Contributor

Yuzhe Zhu

## 🌟 Features

- **Secure Voter Registration**: Only the admin can register voters with a whitelist system
- **Transparent Proposal Submission**: Registered voters can submit proposals during the proposal phase
- **Secure Voting Process**: Each voter can vote only once
- **Real-time Status Updates**: The DApp shows the current state of the voting process
- **Automated Vote Tallying**: Automatic determination of the winning proposal
- **Special Features**:
  - Ability to detect tied votes
  - Batch registration of multiple voters
  - Comprehensive workflow management

## 🔧 Technology Stack

- **Smart Contract**: Solidity 0.8.20
- **Blockchain Development**: Hardhat
- **Frontend**: React with Material-UI
- **Web3 Integration**: ethers.js
- **Testing**: Hardhat test suite with Chai

## 📋 Smart Contract Workflow

The voting process follows a strict workflow:

1. **Registering Voters Phase**

   - Admin registers voters to a whitelist
   - Only registered voters can participate in subsequent phases
2. **Proposals Registration Phase**

   - Admin starts the phase
   - Registered voters submit their proposals
   - Admin ends the phase when ready
3. **Voting Phase**

   - Admin starts the voting session
   - Registered voters can vote for their preferred proposal (once)
   - Admin ends the voting session
4. **Vote Tallying**

   - Admin tallies the votes
   - The proposal with the most votes wins
   - Results are displayed to all users

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MetaMask browser extension
- Ethereum wallet with Sepolia ETH (for testing)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/frankl1nzhu/voting-dapp.git
cd voting-dapp
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory with your configuration:

```
SEPOLIA_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
PRIVATE_KEY=your_private_key_without_0x_prefix
```

4. Deploy the smart contract (for testing on Sepolia):

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

5. Update the contract address in `src/App.js`:

```javascript
const contractAddress = "YOUR_DEPLOYED_CONTRACT_ADDRESS";
```

6. Start the application:

```bash
npm start
```

## 📱 Usage

### As Administrator

1. Connect your wallet (the account that deployed the contract)
2. Register voters by entering their Ethereum addresses
3. Start the proposal registration phase
4. Wait for voters to submit proposals
5. End the proposal registration phase
6. Start the voting session
7. Wait for voters to cast their votes
8. End the voting session
9. Tally the votes to determine the winner

### As Voter

1. Connect your wallet
2. If registered, submit proposals during the proposal phase
3. Vote for your preferred proposal during the voting phase
4. View the final results after voting ends

## 🧪 Testing

The project includes a comprehensive test suite for the smart contract:

```bash
npx hardhat test
```

## 🔒 Security Considerations

- The admin has control over the voting process workflow
- All votes are transparent and can be seen by everyone
- Once a vote is cast, it cannot be changed
- The contract follows a strict state machine pattern to prevent unauthorized actions
