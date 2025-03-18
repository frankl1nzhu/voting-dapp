// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Voting
 * @dev Smart contract for a voting system
 * @author Yuzhe Zhu
 * @notice This contract allows for a voting process with registration, proposal submission, and voting phases
 */
contract Voting is Ownable {
    // Structures
    struct Voter {
        bool isRegistered;
        bool hasVoted;
        uint votedProposalId;
    }

    struct Proposal {
        string description;
        uint voteCount;
    }

    // State variables
    enum WorkflowStatus {
        RegisteringVoters,
        ProposalsRegistrationStarted,
        ProposalsRegistrationEnded,
        VotingSessionStarted,
        VotingSessionEnded,
        VotesTallied
    }

    WorkflowStatus public workflowStatus;
    Proposal[] public proposals;
    mapping(address => Voter) public voters;
    uint public winningProposalId;

    // Events
    event VoterRegistered(address voterAddress);
    event WorkflowStatusChange(
        WorkflowStatus previousStatus,
        WorkflowStatus newStatus
    );
    event ProposalRegistered(uint proposalId);
    event Voted(address voter, uint proposalId);

    // Additional events for new features
    event VoterUnregistered(address voterAddress);
    event ProposalTie(uint[] proposalIds);

    /**
     * @dev Constructor initializes the contract with the deployer as the owner and sets the initial workflow status
     */
    constructor() Ownable(msg.sender) {
        workflowStatus = WorkflowStatus.RegisteringVoters;
    }

    /**
     * @dev Modifier to check if the caller is a registered voter
     */
    modifier onlyVoters() {
        require(
            voters[msg.sender].isRegistered,
            "You're not a registered voter"
        );
        _;
    }

    /**
     * @dev Register a new voter
     * @param _voter The address of the voter to register
     */
    function registerVoter(address _voter) external onlyOwner {
        require(
            workflowStatus == WorkflowStatus.RegisteringVoters,
            "Voters registration is not open"
        );
        require(!voters[_voter].isRegistered, "Voter is already registered");

        voters[_voter].isRegistered = true;

        emit VoterRegistered(_voter);
    }

    /**
     * @dev Register multiple voters at once (batch registration)
     * @param _voters Array of voter addresses to register
     */
    function registerVoters(address[] calldata _voters) external onlyOwner {
        require(
            workflowStatus == WorkflowStatus.RegisteringVoters,
            "Voters registration is not open"
        );

        for (uint i = 0; i < _voters.length; i++) {
            if (!voters[_voters[i]].isRegistered) {
                voters[_voters[i]].isRegistered = true;
                emit VoterRegistered(_voters[i]);
            }
        }
    }

    /**
     * @dev Unregister a voter (New Feature 1)
     * @param _voter The address of the voter to unregister
     */
    function unregisterVoter(address _voter) external onlyOwner {
        require(
            workflowStatus == WorkflowStatus.RegisteringVoters,
            "Voters registration is not open"
        );
        require(voters[_voter].isRegistered, "Voter is not registered");

        voters[_voter].isRegistered = false;

        emit VoterUnregistered(_voter);
    }

    /**
     * @dev Start the proposal registration phase
     */
    function startProposalsRegistration() external onlyOwner {
        require(
            workflowStatus == WorkflowStatus.RegisteringVoters,
            "Registering voters phase is not active"
        );

        workflowStatus = WorkflowStatus.ProposalsRegistrationStarted;

        // Add an empty proposal at index 0 for abstention votes
        proposals.push(Proposal("", 0));

        emit WorkflowStatusChange(
            WorkflowStatus.RegisteringVoters,
            WorkflowStatus.ProposalsRegistrationStarted
        );
    }

    /**
     * @dev Register a new proposal
     * @param _description The description of the proposal
     */
    function registerProposal(
        string calldata _description
    ) external onlyVoters {
        require(
            workflowStatus == WorkflowStatus.ProposalsRegistrationStarted,
            "Proposals registration is not open"
        );
        require(bytes(_description).length > 0, "Description cannot be empty");

        proposals.push(Proposal(_description, 0));

        emit ProposalRegistered(proposals.length - 1);
    }

    /**
     * @dev End the proposal registration phase
     */
    function endProposalsRegistration() external onlyOwner {
        require(
            workflowStatus == WorkflowStatus.ProposalsRegistrationStarted,
            "Proposals registration is not active"
        );
        require(proposals.length > 1, "No proposals registered");

        workflowStatus = WorkflowStatus.ProposalsRegistrationEnded;

        emit WorkflowStatusChange(
            WorkflowStatus.ProposalsRegistrationStarted,
            WorkflowStatus.ProposalsRegistrationEnded
        );
    }

    /**
     * @dev Start the voting session
     */
    function startVotingSession() external onlyOwner {
        require(
            workflowStatus == WorkflowStatus.ProposalsRegistrationEnded,
            "Proposals registration phase is not ended"
        );

        workflowStatus = WorkflowStatus.VotingSessionStarted;

        emit WorkflowStatusChange(
            WorkflowStatus.ProposalsRegistrationEnded,
            WorkflowStatus.VotingSessionStarted
        );
    }

    /**
     * @dev Vote for a proposal
     * @param _proposalId The ID of the proposal to vote for
     */
    function vote(uint _proposalId) external onlyVoters {
        require(
            workflowStatus == WorkflowStatus.VotingSessionStarted,
            "Voting session is not active"
        );
        require(!voters[msg.sender].hasVoted, "You have already voted");
        require(_proposalId < proposals.length, "Proposal not found");

        voters[msg.sender].hasVoted = true;
        voters[msg.sender].votedProposalId = _proposalId;

        proposals[_proposalId].voteCount++;

        emit Voted(msg.sender, _proposalId);
    }

    /**
     * @dev End the voting session
     */
    function endVotingSession() external onlyOwner {
        require(
            workflowStatus == WorkflowStatus.VotingSessionStarted,
            "Voting session is not active"
        );

        workflowStatus = WorkflowStatus.VotingSessionEnded;

        emit WorkflowStatusChange(
            WorkflowStatus.VotingSessionStarted,
            WorkflowStatus.VotingSessionEnded
        );
    }

    /**
     * @dev Tally the votes and determine the winning proposal
     */
    function tallyVotes() external onlyOwner {
        require(
            workflowStatus == WorkflowStatus.VotingSessionEnded,
            "Voting session is not ended"
        );

        uint winningVoteCount = 0;
        uint[] memory tiedProposals = new uint[](proposals.length);
        uint tieCount = 0;

        // Find the proposal with the highest vote count
        for (uint i = 0; i < proposals.length; i++) {
            if (proposals[i].voteCount > winningVoteCount) {
                winningVoteCount = proposals[i].voteCount;
                winningProposalId = i;

                // Reset tie count
                tieCount = 0;
                tiedProposals[tieCount] = i;
            } else if (
                proposals[i].voteCount == winningVoteCount &&
                proposals[i].voteCount > 0
            ) {
                // Add to tied proposals
                tieCount++;
                tiedProposals[tieCount] = i;
            }
        }

        // If there's a tie, emit a TieEvent (New Feature 2)
        if (tieCount > 0) {
            uint[] memory finalTiedProposals = new uint[](tieCount + 1);
            for (uint i = 0; i <= tieCount; i++) {
                finalTiedProposals[i] = tiedProposals[i];
            }
            emit ProposalTie(finalTiedProposals);
        }

        workflowStatus = WorkflowStatus.VotesTallied;

        emit WorkflowStatusChange(
            WorkflowStatus.VotingSessionEnded,
            WorkflowStatus.VotesTallied
        );
    }

    /**
     * @dev Get the winning proposal
     * @return winningProposal_ The ID of the winning proposal
     * @return description The description of the winning proposal
     * @return voteCount The number of votes for the winning proposal
     */
    function getWinner()
        external
        view
        returns (
            uint winningProposal_,
            string memory description,
            uint voteCount
        )
    {
        require(
            workflowStatus == WorkflowStatus.VotesTallied,
            "Votes are not tallied yet"
        );

        return (
            winningProposalId,
            proposals[winningProposalId].description,
            proposals[winningProposalId].voteCount
        );
    }

    /**
     * @dev Get the number of proposals
     * @return The total number of proposals
     */
    function getProposalsCount() external view returns (uint) {
        return proposals.length;
    }

    /**
     * @dev Get details of a specific proposal
     * @param _proposalId The ID of the proposal
     * @return description The description of the proposal
     * @return voteCount The number of votes for the proposal
     */
    function getProposal(
        uint _proposalId
    ) external view returns (string memory description, uint voteCount) {
        require(_proposalId < proposals.length, "Proposal not found");

        return (
            proposals[_proposalId].description,
            proposals[_proposalId].voteCount
        );
    }

    /**
     * @dev Get voter information
     * @param _voter The address of the voter
     * @return isRegistered Whether the voter is registered
     * @return hasVoted Whether the voter has voted
     * @return votedProposalId The ID of the proposal the voter voted for
     */
    function getVoter(
        address _voter
    )
        external
        view
        returns (bool isRegistered, bool hasVoted, uint votedProposalId)
    {
        return (
            voters[_voter].isRegistered,
            voters[_voter].hasVoted,
            voters[_voter].votedProposalId
        );
    }
}
