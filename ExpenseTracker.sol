// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title ExpenseTracker
 * @dev A decentralized application (DApp) for college students to track and split expenses
 * All data is stored on-chain, making it transparent and immutable
 */

contract ExpenseTracker {

    struct Person {
        string name;
        address walletAddress;
    }

    struct Expense {
        uint256 id;
        string label;
        uint256 timestamp;
        mapping(address => uint256) amountPaid;
        mapping(address => uint256) amountOwed;
        address[] participants;
    }

    mapping(uint256 => Expense) private expenses;
    mapping(address => Person) private people;
    address[] private registeredPeople;
    uint256 public expenseCount;

    event PersonRegistered(address indexed walletAddress, string name);
    event ExpenseAdded(uint256 indexed expenseId, string label);
    event DebtSettled(address indexed from, address indexed to, uint256 amount);

    // Register a person with a name
    function registerPerson(string memory _name) public {
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(bytes(people[msg.sender].name).length == 0, "Person already registered");

        people[msg.sender] = Person(_name, msg.sender);
        registeredPeople.push(msg.sender);
        emit PersonRegistered(msg.sender, _name);
    }

    // Check if a user is registered
    function isUserRegistered(address _walletAddress) public view returns (bool) {
        return bytes(people[_walletAddress].name).length > 0;
    }

    // Add an expense
    function addExpense(
        string memory _label,
        address[] memory _participants,
        uint256[] memory _amountsPaid,
        uint256[] memory _amountsOwed
    ) public {
        require(bytes(_label).length > 0, "Label cannot be empty");
        require(_participants.length > 0, "No participants");
        require(_participants.length == _amountsPaid.length, "Mismatch in amounts paid");
        require(_participants.length == _amountsOwed.length, "Mismatch in amounts owed");

        uint256 expenseId = expenseCount++;
        Expense storage newExpense = expenses[expenseId];
        newExpense.id = expenseId;
        newExpense.label = _label;
        newExpense.timestamp = block.timestamp;

        for (uint256 i = 0; i < _participants.length; i++) {
            require(_participants[i] != address(0), "Invalid participant");
            require(isUserRegistered(_participants[i]), "Participant is not registered");

            newExpense.participants.push(_participants[i]);
            newExpense.amountPaid[_participants[i]] = _amountsPaid[i];
            newExpense.amountOwed[_participants[i]] = _amountsOwed[i];
        }

        emit ExpenseAdded(expenseId, _label);
    }

    // Get person's details by wallet address
    function getPerson(
        address _addr
    ) public view returns (string memory name, address walletAddress) {
        Person storage p = people[_addr];
        return (p.name, p.walletAddress);
    }

    // Get all registered people's addresses
    function getAllRegisteredPeople() public view returns (address[] memory) {
        return registeredPeople;
    }

    // Get total number of expenses added
    function getExpenseCount() public view returns (uint256) {
        return expenseCount;
    }

    // Get metadata of a specific expense
    function getExpenseMetadata(uint256 _id) public view returns (
        string memory label,
        uint256 timestamp,
        address[] memory participants
    ) {
        Expense storage exp = expenses[_id];
        return (exp.label, exp.timestamp, exp.participants);
    }

    // Get how much a user paid in a specific expense
    function getAmountPaid(uint256 _id, address _user) public view returns (uint256) {
        return expenses[_id].amountPaid[_user];
    }

    // Get how much a user owes in a specific expense
    function getAmountOwed(uint256 _id, address _user) public view returns (uint256) {
        return expenses[_id].amountOwed[_user];
    }

    // Get the net balance of a specific user (total paid - total owed)
    function getNetBalance(address _user) public view returns (uint256) {
        uint256 netBalance = 0;

        // Loop through all expenses and calculate the net balance
        for (uint256 i = 0; i < expenseCount; i++) {
            Expense storage exp = expenses[i];
            netBalance += exp.amountPaid[_user]; // Add paid amount
            netBalance -= exp.amountOwed[_user]; // Subtract owed amount
        }

        return netBalance;
    }

    // Get full details of a specific expense (with paid and owed amounts)
    function getExpense(uint256 _id) public view returns (
        string memory label,
        uint256 timestamp,
        address[] memory participants,
        uint256[] memory amountsPaid,
        uint256[] memory amountsOwed
    ) {
        Expense storage exp = expenses[_id];
        uint256[] memory paidAmounts = new uint256[](exp.participants.length);
        uint256[] memory owedAmounts = new uint256[](exp.participants.length);

        for (uint256 i = 0; i < exp.participants.length; i++) {
            paidAmounts[i] = exp.amountPaid[exp.participants[i]];
            owedAmounts[i] = exp.amountOwed[exp.participants[i]];
        }

        return (exp.label, exp.timestamp, exp.participants, paidAmounts, owedAmounts);
    }
}
