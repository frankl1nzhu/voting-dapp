import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import {
  Container,
  Box,
  Typography,
  Button,
  TextField,
  Card,
  CardContent,
  Grid,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import Voting from './artifacts/contracts/Voting.sol/Voting.json';

// For local testing: const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
// After deploying to Sepolia, replace with your deployed contract address:
const contractAddress = "0xeCEC5ce92694741Fee8924D3c3Db50E0dfcd249d"; 

function App() {
  const [account, setAccount] = useState('');
  const [contract, setContract] = useState(null);
  const [workflowStatus, setWorkflowStatus] = useState(0);
  const [proposals, setProposals] = useState([]);
  const [voters, setVoters] = useState([]);
  const [winner, setWinner] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newVoterAddress, setNewVoterAddress] = useState('');
  const [newProposal, setNewProposal] = useState('');
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [canResetVoting, setCanResetVoting] = useState(false);

  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);
        
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const votingContract = new ethers.Contract(contractAddress, Voting.abi, signer);
        setContract(votingContract);
        
        // Check if current account is admin
        const owner = await votingContract.owner();
        setIsAdmin(owner.toLowerCase() === accounts[0].toLowerCase());
        
        await loadContractData(votingContract);
      } else {
        setError('Please install MetaMask!');
      }
    } catch (error) {
      setError('Error connecting to wallet: ' + error.message);
    }
  };

  const loadContractData = async (contract) => {
    try {
      setLoading(true);
      setError(''); // 清除之前的错误
      
      console.log("Loading contract data...");
      
      // 检查当前账户是否已注册为选民
      if (account) {
        try {
          const voterInfo = await contract.getVoter(account);
          setIsRegistered(voterInfo.isRegistered);
          setHasVoted(voterInfo.hasVoted);
          console.log("Voter info:", voterInfo);
        } catch (e) {
          console.log("Error getting voter info:", e);
        }
      }
      
      // Load workflow status
      const status = await contract.workflowStatus();
      console.log("Workflow status:", status);
      setWorkflowStatus(Number(status));
      
      // Check if we can reset the voting process
      if (Number(status) === 5) { // VotesTallied
        setCanResetVoting(true);
      } else {
        setCanResetVoting(false);
      }
      
      // Load proposals
      const proposalCount = await contract.getProposalsCount();
      console.log("Proposal count:", proposalCount);
      
      const proposalsData = [];
      for (let i = 0; i < proposalCount; i++) {
        console.log("Loading proposal", i);
        const proposal = await contract.getProposal(i);
        proposalsData.push({
          id: i,
          description: proposal.description,
          voteCount: Number(proposal.voteCount)
        });
      }
      setProposals(proposalsData);
      console.log("Proposals loaded:", proposalsData);
      
      // Load winner if votes are tallied
      if (Number(status) === 5) { // VotesTallied
        console.log("Votes tallied, loading winner");
        const winnerData = await contract.getWinner();
        setWinner({
          winningProposal_: Number(winnerData.winningProposal_),
          description: winnerData.description,
          voteCount: Number(winnerData.voteCount)
        });
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error loading contract data:", error);
      setError('Error loading contract data: ' + error.message);
      setLoading(false);
    }
  };

  const registerVoter = async () => {
    try {
      setLoading(true);
      const tx = await contract.registerVoter(newVoterAddress);
      await tx.wait();
      setSuccess('Voter registered successfully!');
      setNewVoterAddress('');
      await loadContractData(contract);
    } catch (error) {
      setError('Error registering voter: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const startProposalsRegistration = async () => {
    try {
      setLoading(true);
      const tx = await contract.startProposalsRegistration();
      await tx.wait();
      setSuccess('Proposals registration started!');
      await loadContractData(contract);
    } catch (error) {
      setError('Error starting proposals registration: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const registerProposal = async () => {
    try {
      setLoading(true);
      const tx = await contract.registerProposal(newProposal);
      await tx.wait();
      setSuccess('Proposal registered successfully!');
      setNewProposal('');
      await loadContractData(contract);
    } catch (error) {
      setError('Error registering proposal: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const endProposalsRegistration = async () => {
    try {
      setLoading(true);
      const tx = await contract.endProposalsRegistration();
      await tx.wait();
      setSuccess('Proposals registration ended!');
      await loadContractData(contract);
    } catch (error) {
      setError('Error ending proposals registration: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const startVotingSession = async () => {
    try {
      setLoading(true);
      const tx = await contract.startVotingSession();
      await tx.wait();
      setSuccess('Voting session started!');
      await loadContractData(contract);
    } catch (error) {
      setError('Error starting voting session: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const vote = async (proposalId) => {
    try {
      setLoading(true);
      const tx = await contract.vote(proposalId);
      await tx.wait();
      setSuccess('Vote cast successfully!');
      await loadContractData(contract);
    } catch (error) {
      setError('Error casting vote: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const endVotingSession = async () => {
    try {
      setLoading(true);
      const tx = await contract.endVotingSession();
      await tx.wait();
      setSuccess('Voting session ended!');
      await loadContractData(contract);
    } catch (error) {
      setError('Error ending voting session: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const tallyVotes = async () => {
    try {
      setLoading(true);
      const tx = await contract.tallyVotes();
      await tx.wait();
      setSuccess('Votes tallied successfully!');
      await loadContractData(contract);
    } catch (error) {
      setError('Error tallying votes: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetVoting = async () => {
    try {
      setLoading(true);
      // Reset the contract to RegisteringVoters state
      // This requires adding a resetVoting function to the smart contract
      const tx = await contract.resetVoting();
      await tx.wait();
      setSuccess('Voting process reset successfully! Ready for a new voting session.');
      
      // Reset local state
      setProposals([]);
      setWinner(null);
      await loadContractData(contract);
    } catch (error) {
      setError('Error resetting voting process: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVoteClick = (proposal) => {
    setSelectedProposal(proposal);
    setOpenDialog(true);
  };

  const handleVoteConfirm = async () => {
    if (selectedProposal) {
      await vote(selectedProposal.id);
      setOpenDialog(false);
      setSelectedProposal(null);
    }
  };

  useEffect(() => {
    if (contract) {
      loadContractData(contract);
    }
  }, [contract]);

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom align="center">
          Voting DApp
        </Typography>

        {!account ? (
          <Button
            variant="contained"
            color="primary"
            onClick={connectWallet}
            fullWidth
            sx={{ mb: 4 }}
          >
            Connect Wallet
          </Button>
        ) : (
          <>
            <Typography variant="subtitle1" gutterBottom>
              Connected Account: {account}
            </Typography>
            
            <Typography variant="subtitle1" gutterBottom color={isAdmin ? "primary" : "text.secondary"}>
              {isAdmin ? "You are the admin" : "You are not the admin"}
            </Typography>

            <Typography variant="subtitle1" gutterBottom>
              Current Status: {
                workflowStatus === 0 ? "Registering Voters" :
                workflowStatus === 1 ? "Proposals Registration Started" :
                workflowStatus === 2 ? "Proposals Registration Ended" :
                workflowStatus === 3 ? "Voting Session Started" :
                workflowStatus === 4 ? "Voting Session Ended" :
                workflowStatus === 5 ? "Votes Tallied" :
                "Unknown"
              }
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {success}
              </Alert>
            )}

            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                <CircularProgress />
              </Box>
            )}

            <Grid container spacing={3}>
              {/* Admin Controls */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Admin Controls {!isAdmin && "(Not Available - You're not admin)"}
                    </Typography>
                    
                    {isAdmin ? (
                      <>
                        {workflowStatus === 0 && (
                          <>
                            <TextField
                              fullWidth
                              label="New Voter Address"
                              value={newVoterAddress}
                              onChange={(e) => setNewVoterAddress(e.target.value)}
                              sx={{ mb: 2 }}
                            />
                            <Button
                              variant="contained"
                              onClick={registerVoter}
                              fullWidth
                              sx={{ mb: 2 }}
                            >
                              Register Voter
                            </Button>
                            <Button
                              variant="contained"
                              onClick={startProposalsRegistration}
                              fullWidth
                            >
                              Start Proposals Registration
                            </Button>
                          </>
                        )}

                        {workflowStatus === 1 && (
                          <Button
                            variant="contained"
                            onClick={endProposalsRegistration}
                            fullWidth
                          >
                            End Proposals Registration
                          </Button>
                        )}

                        {workflowStatus === 2 && (
                          <Button
                            variant="contained"
                            onClick={startVotingSession}
                            fullWidth
                          >
                            Start Voting Session
                          </Button>
                        )}

                        {workflowStatus === 3 && (
                          <Button
                            variant="contained"
                            onClick={endVotingSession}
                            fullWidth
                          >
                            End Voting Session
                          </Button>
                        )}

                        {workflowStatus === 4 && (
                          <Button
                            variant="contained"
                            onClick={tallyVotes}
                            fullWidth
                          >
                            Tally Votes
                          </Button>
                        )}

                        {workflowStatus === 5 && canResetVoting && (
                          <Button
                            variant="contained"
                            onClick={resetVoting}
                            fullWidth
                            color="secondary"
                            sx={{ mt: 2 }}
                          >
                            Reset Voting Process
                          </Button>
                        )}
                      </>
                    ) : (
                      <Typography variant="body1" color="text.secondary">
                        Only the admin can access these controls.
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Voter Controls */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Voter Controls
                    </Typography>

                    {isRegistered ? (
                      <>
                        <Typography variant="body2" color="success.main" gutterBottom>
                          You are a registered voter
                        </Typography>
                        
                        {hasVoted && (
                          <Typography variant="body2" color="info.main" gutterBottom>
                            You have already voted
                          </Typography>
                        )}

                        {workflowStatus === 1 && (
                          <>
                            <TextField
                              fullWidth
                              label="New Proposal"
                              value={newProposal}
                              onChange={(e) => setNewProposal(e.target.value)}
                              sx={{ mb: 2 }}
                            />
                            <Button
                              variant="contained"
                              onClick={registerProposal}
                              fullWidth
                            >
                              Register Proposal
                            </Button>
                          </>
                        )}

                        {workflowStatus === 3 && (
                          <Typography variant="body1" gutterBottom>
                            {hasVoted 
                              ? "You have already voted"
                              : "Select a proposal from the list below to vote"}
                          </Typography>
                        )}
                      </>
                    ) : (
                      <Typography variant="body1" color="text.secondary">
                        You are not registered as a voter. Contact the admin to get registered.
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Proposals List */}
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Proposals
                    </Typography>
                    
                    {proposals.length > 0 ? (
                      <List>
                        {proposals.map((proposal) => (
                          <ListItem
                            key={proposal.id}
                            button={workflowStatus === 3 && isRegistered && !hasVoted}
                            onClick={() => workflowStatus === 3 && isRegistered && !hasVoted && handleVoteClick(proposal)}
                            sx={{
                              bgcolor: workflowStatus === 3 && isRegistered && !hasVoted ? 'action.hover' : 'transparent',
                              '&:hover': {
                                bgcolor: workflowStatus === 3 && isRegistered && !hasVoted ? 'action.selected' : 'transparent',
                              },
                            }}
                          >
                            <ListItemText
                              primary={proposal.description || "Abstention"}
                              secondary={`Votes: ${proposal.voteCount}`}
                            />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Typography variant="body1" color="text.secondary">
                        {workflowStatus === 0 
                          ? "Waiting for proposal registration to start" 
                          : workflowStatus === 1 
                            ? "No proposals yet. Be the first to submit!" 
                            : "No proposals available"}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Winner Display */}
              {winner && (
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Winner
                      </Typography>
                      <Typography variant="body1">
                        Proposal: {winner.description || "Abstention"}
                      </Typography>
                      <Typography variant="body1">
                        Vote Count: {winner.voteCount}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>

            {/* Vote Confirmation Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
              <DialogTitle>Confirm Vote</DialogTitle>
              <DialogContent>
                <Typography>
                  Are you sure you want to vote for "{selectedProposal?.description || "Abstention"}"?
                </Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                <Button onClick={handleVoteConfirm} variant="contained" color="primary">
                  Confirm Vote
                </Button>
              </DialogActions>
            </Dialog>
          </>
        )}
      </Box>
    </Container>
  );
}

export default App; 