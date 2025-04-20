import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './App.css';
import ExpenseTrackerABI from './ExpenseTrackerABI.json';

function App() {
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [name, setName] = useState('');
  const [expenses, setExpenses] = useState([]);
  const [people, setPeople] = useState([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [expenseLabel, setExpenseLabel] = useState('');
  const [participants, setParticipants] = useState([{ address: '', amountPaid: 0, amountOwed: 0 }]);
  const [showAddExpense, setShowAddExpense] = useState(false);

  const contractAddress = '0xB1c424AE1a4b8c8B5a2Ee6D59B1Af25B8d83DA53';

  // Initial connection to wallet and contract
  useEffect(() => {
    const init = async () => {
      if (window.ethereum) {
        try {
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          const providerInstance = new ethers.providers.Web3Provider(window.ethereum);
          setProvider(providerInstance);

          const network = await providerInstance.getNetwork();
          if (network.chainId !== 11155111) {
            alert("Please connect to Sepolia testnet.");
            return;
          }

          const signer = providerInstance.getSigner();
          const address = await signer.getAddress();
          setAccount(address);
          setIsConnected(true);

          const contractInstance = new ethers.Contract(contractAddress, ExpenseTrackerABI, signer);
          setContract(contractInstance);

          window.ethereum.on('accountsChanged', (accounts) => {
            setAccount(accounts[0] || '');
            setIsConnected(accounts.length > 0);
          });

        } catch (err) {
          console.error("Error connecting:", err);
          alert("Failed to connect: " + err.message);
        }
      } else {
        alert("Install MetaMask.");
      }
    };

    init();

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
      }
    };
  }, []);

  // Check registration and load data
  useEffect(() => {
    const checkRegistration = async () => {
      if (!contract || !account) return;

      try {
        // Check if the user is registered
        const person = await contract.getPerson(account);
        const registered = person.walletAddress !== ethers.constants.AddressZero;
        setIsRegistered(registered);

        if (registered) {
          setName(person.name);
          await loadExpenses();
          await loadPeople();
        }
      } catch (err) {
        console.error("Registration check failed:", err);
      }
    };
    checkRegistration();
  }, [contract, account]);

  // 🔁 Updated to use new smart contract functions
  const loadExpenses = async () => {
    if (!contract || !isRegistered) return;
    setLoadingExpenses(true);
    try {
      const count = await contract.getExpenseCount();
      const loaded = [];

      for (let i = 0; i < count; i++) {
        const [label, timestamp, participantsAddresses] = await contract.getExpenseMetadata(i);

        const participantsData = await Promise.all(
          participantsAddresses.map(async (address) => {
            const amountPaid = await contract.getAmountPaid(i, address);
            const amountOwed = await contract.getAmountOwed(i, address);
            return {
              address,
              amountPaid: ethers.utils.formatEther(amountPaid),
              amountOwed: ethers.utils.formatEther(amountOwed),
            };
          })
        );

        loaded.push({
          id: i,
          label,
          timestamp: new Date(timestamp.toNumber() * 1000).toLocaleString(),
          participants: participantsData,
        });
      }

      setExpenses(loaded);
    } catch (error) {
      console.error("Error loading expenses:", error);
      alert("Could not load expenses.");
    } finally {
      setLoadingExpenses(false);
    }
  };

  const loadPeople = async () => {
    if (!contract) return;
    try {
      const addresses = await contract.getAllRegisteredPeople();
      console.log('Registered addresses:', addresses); // Log to check addresses

      const peopleData = await Promise.all(
        addresses.map(async (address) => {
          const person = await contract.getPerson(address);
          const netBalance = await contract.getNetBalance(address);
          return {
            address,
            name: person.name,
            netBalance: ethers.utils.formatEther(netBalance),
          };
        })
      );

      console.log('People data:', peopleData); // Log the people data

      setPeople(peopleData);
    } catch (err) {
      console.error("Error loading people:", err);
    }
  };

  const registerPerson = async () => {
    if (!name.trim()) {
      alert("Enter your name.");
      return;
    }

    try {
      const tx = await contract.registerPerson(name.trim());
      await tx.wait();
      setIsRegistered(true);
      alert("Registration successful!");
      await loadPeople();
      await loadExpenses();
    } catch (err) {
      console.error("Registration failed:", err);
      alert("Registration failed: " + err.message);
    }
  };

  const addExpense = async () => {
    if (!expenseLabel.trim()) {
      alert("Label required.");
      return;
    }
    if (participants.length === 0) {
      alert("Add at least one participant.");
      return;
    }

    for (const participant of participants) {
      if (!ethers.utils.isAddress(participant.address)) {
        alert("Invalid address.");
        return;
      }
      if (participant.amountPaid < 0 || participant.amountOwed < 0) {
        alert("Negative amounts not allowed.");
        return;
      }
    }

    try {
      const addresses = participants.map(p => p.address.trim());
      const paidAmounts = participants.map(p => ethers.utils.parseEther(p.amountPaid.toString()));
      const owedAmounts = participants.map(p => ethers.utils.parseEther(p.amountOwed.toString()));

      const tx = await contract.addExpense(expenseLabel, addresses, paidAmounts, owedAmounts);
      await tx.wait();

      setExpenseLabel('');
      setParticipants([{ address: '', amountPaid: 0, amountOwed: 0 }]);
      setShowAddExpense(false);
      await loadExpenses();
      await loadPeople();
    } catch (err) {
      console.error("Add expense error:", err);
      alert("Add expense failed: " + err.message);
    }
  };

  const addParticipant = () => {
    setParticipants([...participants, { address: '', amountPaid: 0, amountOwed: 0 }]);
  };

  const updateParticipant = (index, field, value) => {
    const updated = [...participants];
    updated[index][field] = value;
    setParticipants(updated);
  };

  const removeParticipant = (index) => {
    if (participants.length > 1) {
      setParticipants(participants.filter((_, i) => i !== index));
    }
  };

  const handleRefresh = async () => {
    setLoadingExpenses(true);
    await loadExpenses();
    await loadPeople();
    setLoadingExpenses(false);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>On-Chain Expense Tracker</h1>

        {!isConnected ? (
          <button onClick={() => window.ethereum.request({ method: 'eth_requestAccounts' })}>
            Connect Wallet
          </button>
        ) : !isRegistered ? (
          <div>
            <h2>Register</h2>
            <input
              type="text"
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button onClick={registerPerson}>Register</button>
          </div>
        ) : (
          <div>
            <h2>Welcome, {name}</h2>
            <p>Account: {account}</p>
            <button onClick={() => setShowAddExpense(!showAddExpense)}>
              {showAddExpense ? "Cancel" : "Add Expense"}
            </button>
            <button onClick={handleRefresh}>Refresh Expenses</button>

            {showAddExpense && (
              <div>
                <h3>New Expense</h3>
                <input
                  type="text"
                  placeholder="Expense Label"
                  value={expenseLabel}
                  onChange={(e) => setExpenseLabel(e.target.value)}
                />
                {participants.map((p, idx) => (
                  <div key={idx}>
                    <input
                      placeholder="Address"
                      value={p.address}
                      onChange={(e) => updateParticipant(idx, 'address', e.target.value)}
                    />
                    <input
                      type="number"
                      placeholder="Paid"
                      value={p.amountPaid}
                      onChange={(e) => updateParticipant(idx, 'amountPaid', e.target.value)}
                    />
                    <input
                      type="number"
                      placeholder="Owed"
                      value={p.amountOwed}
                      onChange={(e) => updateParticipant(idx, 'amountOwed', e.target.value)}
                    />
                    <button onClick={() => removeParticipant(idx)}>Remove</button>
                  </div>
                ))}
                <button onClick={addParticipant}>Add Participant</button>
                <button onClick={addExpense}>Save Expense</button>
              </div>
            )}

            <h3>People</h3>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Address</th>
                  <th>Net Balance</th>
                </tr>
              </thead>
              <tbody>
                {people.length > 0 ? (
                  people.map((person, idx) => (
                    <tr key={idx}>
                      <td>{person.name}</td>
                      <td>{person.address.slice(0, 8)}...</td>
                      <td style={{ color: parseFloat(person.netBalance) < 0 ? 'red' : 'green' }}>
                        {parseFloat(person.netBalance).toFixed(5)} ETH
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="3">No people registered.</td></tr>
                )}
              </tbody>
            </table>

            <h3>Expense History</h3>
            {loadingExpenses ? (
              <p>Loading...</p>
            ) : (
              expenses.map((expense) => (
                <div key={expense.id} style={{ border: '1px solid #ccc', margin: '10px 0', padding: '10px' }}>
                  <h4>{expense.label}</h4>
                  <p>{expense.timestamp}</p>
                  <table>
                    <thead>
                      <tr>
                        <th>Participant</th>
                        <th>Paid</th>
                        <th>Owes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expense.participants.map((p, idx) => (
                        <tr key={idx}>
                          <td>{people.find(per => per.address === p.address)?.name || p.address.slice(0, 8)}...</td>
                          <td>{p.amountPaid} ETH</td>
                          <td>{p.amountOwed} ETH</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))
            )}
          </div>
        )}
      </header>
    </div>
  );
}

export default App;