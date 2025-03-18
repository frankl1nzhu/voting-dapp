const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Voting Contract", function () {
  let votingContract;
  let owner;
  let voter1;
  let voter2;
  let voter3;
  let nonVoter;
  
  // WorkflowStatus enum
  const WorkflowStatus = {
    RegisteringVoters: 0,
    ProposalsRegistrationStarted: 1,
    ProposalsRegistrationEnded: 2,
    VotingSessionStarted: 3,
    VotingSessionEnded: 4,
    VotesTallied: 5
  };

  beforeEach(async function () {
    // Get signers
    [owner, voter1, voter2, voter3, nonVoter] = await ethers.getSigners();
    
    // Deploy the contract
    const Voting = await ethers.getContractFactory("Voting");
    votingContract = await Voting.deploy();
    await votingContract.waitForDeployment();
  });

  describe("Initialization", function () {
    it("Should set the right owner", async function () {
      expect(await votingContract.owner()).to.equal(owner.address);
    });

    it("Should set the initial status to RegisteringVoters", async function () {
      expect(await votingContract.workflowStatus()).to.equal(WorkflowStatus.RegisteringVoters);
    });
  });

  describe("Voter Registration", function () {
    it("Should allow the owner to register a voter", async function () {
      await expect(votingContract.registerVoter(voter1.address))
        .to.emit(votingContract, "VoterRegistered")
        .withArgs(voter1.address);
      
      const voter = await votingContract.getVoter(voter1.address);
      expect(voter.isRegistered).to.be.true;
    });

    it("Should not allow non-owner to register a voter", async function () {
      await expect(votingContract.connect(voter1).registerVoter(voter2.address))
        .to.be.revertedWithCustomError(votingContract, "OwnableUnauthorizedAccount")
        .withArgs(voter1.address);
    });

    it("Should not allow registering the same voter twice", async function () {
      await votingContract.registerVoter(voter1.address);
      await expect(votingContract.registerVoter(voter1.address))
        .to.be.revertedWith("Voter is already registered");
    });

    it("Should allow the owner to register multiple voters", async function () {
      await votingContract.registerVoters([voter1.address, voter2.address, voter3.address]);
      
      const voter1Info = await votingContract.getVoter(voter1.address);
      const voter2Info = await votingContract.getVoter(voter2.address);
      const voter3Info = await votingContract.getVoter(voter3.address);
      
      expect(voter1Info.isRegistered).to.be.true;
      expect(voter2Info.isRegistered).to.be.true;
      expect(voter3Info.isRegistered).to.be.true;
    });

    it("Should allow the owner to unregister a voter", async function () {
      await votingContract.registerVoter(voter1.address);
      
      await expect(votingContract.unregisterVoter(voter1.address))
        .to.emit(votingContract, "VoterUnregistered")
        .withArgs(voter1.address);
      
      const voter = await votingContract.getVoter(voter1.address);
      expect(voter.isRegistered).to.be.false;
    });
  });

  describe("Proposal Registration", function () {
    beforeEach(async function () {
      // Register voters
      await votingContract.registerVoters([voter1.address, voter2.address]);
      
      // Start proposal registration
      await votingContract.startProposalsRegistration();
    });

    it("Should start the proposal registration phase", async function () {
      expect(await votingContract.workflowStatus()).to.equal(WorkflowStatus.ProposalsRegistrationStarted);
    });

    it("Should allow a registered voter to submit a proposal", async function () {
      await expect(votingContract.connect(voter1).registerProposal("Proposal 1"))
        .to.emit(votingContract, "ProposalRegistered")
        .withArgs(1); // Index 0 is the empty proposal for abstention
      
      const proposalCount = await votingContract.getProposalsCount();
      expect(proposalCount).to.equal(2); // Initial empty proposal + new one
      
      const proposal = await votingContract.getProposal(1);
      expect(proposal.description).to.equal("Proposal 1");
    });

    it("Should not allow a non-registered voter to submit a proposal", async function () {
      await expect(votingContract.connect(nonVoter).registerProposal("Proposal 3"))
        .to.be.revertedWith("You're not a registered voter");
    });

    it("Should not allow empty proposal", async function () {
      await expect(votingContract.connect(voter1).registerProposal(""))
        .to.be.revertedWith("Description cannot be empty");
    });

    it("Should allow ending the proposal registration phase", async function () {
      await votingContract.connect(voter1).registerProposal("Proposal 1");
      await votingContract.endProposalsRegistration();
      
      expect(await votingContract.workflowStatus()).to.equal(WorkflowStatus.ProposalsRegistrationEnded);
    });

    it("Should not allow ending the proposal registration with no proposals", async function () {
      // No proposals registered other than the initial empty one
      await expect(votingContract.endProposalsRegistration())
        .to.be.revertedWith("No proposals registered");
    });
  });

  describe("Voting Session", function () {
    beforeEach(async function () {
      // Register voters
      await votingContract.registerVoters([voter1.address, voter2.address, voter3.address]);
      
      // Start proposal registration
      await votingContract.startProposalsRegistration();
      
      // Register proposals
      await votingContract.connect(voter1).registerProposal("Proposal 1");
      await votingContract.connect(voter2).registerProposal("Proposal 2");
      
      // End proposal registration
      await votingContract.endProposalsRegistration();
      
      // Start voting session
      await votingContract.startVotingSession();
    });

    it("Should start the voting session", async function () {
      expect(await votingContract.workflowStatus()).to.equal(WorkflowStatus.VotingSessionStarted);
    });

    it("Should allow a registered voter to vote", async function () {
      await expect(votingContract.connect(voter1).vote(1))
        .to.emit(votingContract, "Voted")
        .withArgs(voter1.address, 1);
      
      const voter = await votingContract.getVoter(voter1.address);
      expect(voter.hasVoted).to.be.true;
      expect(voter.votedProposalId).to.equal(1);
      
      const proposal = await votingContract.getProposal(1);
      expect(proposal.voteCount).to.equal(1);
    });

    it("Should not allow a non-registered voter to vote", async function () {
      await expect(votingContract.connect(nonVoter).vote(1))
        .to.be.revertedWith("You're not a registered voter");
    });

    it("Should not allow a voter to vote twice", async function () {
      await votingContract.connect(voter1).vote(1);
      await expect(votingContract.connect(voter1).vote(2))
        .to.be.revertedWith("You have already voted");
    });

    it("Should not allow voting for a non-existent proposal", async function () {
      await expect(votingContract.connect(voter1).vote(10))
        .to.be.revertedWith("Proposal not found");
    });

    it("Should allow ending the voting session", async function () {
      await votingContract.endVotingSession();
      expect(await votingContract.workflowStatus()).to.equal(WorkflowStatus.VotingSessionEnded);
    });
  });

  describe("Vote Tallying", function () {
    beforeEach(async function () {
      // Register voters
      await votingContract.registerVoters([voter1.address, voter2.address, voter3.address]);
      
      // Start proposal registration
      await votingContract.startProposalsRegistration();
      
      // Register proposals
      await votingContract.connect(voter1).registerProposal("Proposal 1");
      await votingContract.connect(voter2).registerProposal("Proposal 2");
      
      // End proposal registration
      await votingContract.endProposalsRegistration();
      
      // Start voting session
      await votingContract.startVotingSession();
      
      // Cast votes
      await votingContract.connect(voter1).vote(1);
      await votingContract.connect(voter2).vote(2);
      await votingContract.connect(voter3).vote(1);
      
      // End voting session
      await votingContract.endVotingSession();
    });

    it("Should tally the votes correctly", async function () {
      await votingContract.tallyVotes();
      expect(await votingContract.workflowStatus()).to.equal(WorkflowStatus.VotesTallied);
      
      // Proposal 1 has 2 votes, Proposal 2 has 1 vote
      const winner = await votingContract.getWinner();
      expect(winner.winningProposal_).to.equal(1);
      expect(winner.description).to.equal("Proposal 1");
      expect(winner.voteCount).to.equal(2);
    });

    it("Should handle tied votes by selecting the first one with that vote count", async function () {
      // Reset the contract and create a tie scenario
      [owner, voter1, voter2, voter3, nonVoter] = await ethers.getSigners();
      const Voting = await ethers.getContractFactory("Voting");
      votingContract = await Voting.deploy();
      await votingContract.waitForDeployment();
      
      // Register voters
      await votingContract.registerVoters([voter1.address, voter2.address]);
      
      // Start proposal registration
      await votingContract.startProposalsRegistration();
      
      // Register proposals
      await votingContract.connect(voter1).registerProposal("Proposal 1");
      await votingContract.connect(voter2).registerProposal("Proposal 2");
      
      // End proposal registration
      await votingContract.endProposalsRegistration();
      
      // Start voting session
      await votingContract.startVotingSession();
      
      // Cast votes for a tie (1 vote each)
      await votingContract.connect(voter1).vote(1);
      await votingContract.connect(voter2).vote(2);
      
      // End voting session
      await votingContract.endVotingSession();
      
      // Tally votes
      await expect(votingContract.tallyVotes())
        .to.emit(votingContract, "ProposalTie");
      
      // Get the winner (in a tie, first proposal with max votes wins)
      const winner = await votingContract.getWinner();
      expect(winner.winningProposal_).to.equal(1);
      expect(winner.voteCount).to.equal(1);
    });
  });

  describe("Workflow Transitions", function () {
    beforeEach(async function () {
      await votingContract.registerVoter(voter1.address);
    });

    it("Should only allow specific workflow transitions", async function () {
      // Cannot skip RegisteringVoters -> ProposalsRegistrationStarted
      await expect(votingContract.endProposalsRegistration())
        .to.be.revertedWith("Proposals registration is not active");
      
      // Start proposals registration
      await votingContract.startProposalsRegistration();
      
      // Cannot skip ProposalsRegistrationStarted -> VotingSessionStarted
      await expect(votingContract.startVotingSession())
        .to.be.revertedWith("Proposals registration phase is not ended");
      
      // Register at least one proposal
      await votingContract.connect(voter1).registerProposal("Proposal 1");
      
      // End proposals registration
      await votingContract.endProposalsRegistration();
      
      // Cannot skip VotingSessionStarted -> VotingSessionEnded
      await expect(votingContract.endVotingSession())
        .to.be.revertedWith("Voting session is not active");
      
      // Start voting session
      await votingContract.startVotingSession();
      
      // End voting session
      await votingContract.endVotingSession();
      
      // Cannot skip VotesTallied
      await expect(votingContract.getWinner())
        .to.be.revertedWith("Votes are not tallied yet");
      
      // Tally votes
      await votingContract.tallyVotes();
      
      // Now can get the winner
      const winner = await votingContract.getWinner();
      expect(winner.winningProposal_).to.equal(0); // Empty proposal wins because no votes
    });
  });
}); 