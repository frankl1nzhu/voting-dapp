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
const contractAddress = "0xa7b0147b77f877D169740E048Ef95A5a19159a6D"; 

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
  const [votersList, setVotersList] = useState([]);
  const [showVoters, setShowVoters] = useState(false);

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
      setSuccess(''); // 清除之前的成功消息
      
      // 重置voter状态
      setIsRegistered(false);
      setHasVoted(false);
      
      console.log("Loading contract data for account:", account);
      
      // 检查当前账户是否已注册为选民
      if (account) {
        try {
          const voterInfo = await contract.getVoter(account);
          setIsRegistered(voterInfo.isRegistered);
          setHasVoted(voterInfo.hasVoted);
          console.log("Voter info for current account:", voterInfo);
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
      
      // For admin only: load voter addresses
      if (isAdmin) {
        try {
          let votersData = [];
          let i = 0;
          let addressesFound = true;
          
          // Since we don't have a direct way to get array length on contracts, try to read elements
          // until we get an error (out of bounds)
          while (addressesFound) {
            try {
              const address = await contract.voterAddresses(i);
              const voterInfo = await contract.getVoter(address);
              votersData.push({
                address,
                isRegistered: voterInfo.isRegistered,
                hasVoted: voterInfo.hasVoted,
                votedProposalId: Number(voterInfo.votedProposalId)
              });
              i++;
            } catch (e) {
              // We've reached the end of the array
              addressesFound = false;
              console.log(`Found ${i} voter addresses`);
            }
          }
          
          setVotersList(votersData);
          console.log("Voters loaded:", votersData);
        } catch (e) {
          console.error("Error loading voters:", e);
          // Non-critical error - don't affect UI
        }
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
      
      // Immediately update the local state to show that the user has voted
      setHasVoted(true);
      
      // Find the proposal and update its vote count locally
      const updatedProposals = [...proposals];
      const proposalIndex = updatedProposals.findIndex(p => p.id === proposalId);
      if (proposalIndex !== -1) {
        updatedProposals[proposalIndex].voteCount += 1;
        setProposals(updatedProposals);
      }
      
      setSuccess(`Your vote for "${proposals[proposalId].description}" has been recorded successfully!`);
      
      // Refresh contract data to get latest state
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
      // 再次检查用户是否有资格投票
      try {
        const voterInfo = await contract.getVoter(account);
        if (!voterInfo.isRegistered) {
          setError("You are not registered as a voter");
          setOpenDialog(false);
          return;
        }
        
        if (voterInfo.hasVoted) {
          setError("You have already voted");
          setOpenDialog(false);
          return;
        }
        
        // 继续执行投票
        await vote(selectedProposal.id);
        setOpenDialog(false);
        setSelectedProposal(null);
      } catch (error) {
        setError("Error checking voter status: " + error.message);
        setOpenDialog(false);
      }
    }
  };

  useEffect(() => {
    if (contract) {
      loadContractData(contract);
    }
  }, [contract]);

  // 添加账户变更监听
  useEffect(() => {
    if (window.ethereum) {
      // 监听账户变更事件
      const handleAccountsChanged = async (accounts) => {
        console.log("Account changed to:", accounts[0]);
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          
          // 重新连接合约
          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          const votingContract = new ethers.Contract(contractAddress, Voting.abi, signer);
          setContract(votingContract);
          
          // 检查新账户是否是管理员
          const owner = await votingContract.owner();
          setIsAdmin(owner.toLowerCase() === accounts[0].toLowerCase());
          
          // 重新加载合约数据
          await loadContractData(votingContract);
        } else {
          // 如果用户断开连接，清除状态
          setAccount('');
          setContract(null);
          setIsAdmin(false);
          setIsRegistered(false);
          setHasVoted(false);
        }
      };

      // 监听链ID变更事件
      const handleChainChanged = () => {
        // 刷新页面以确保一切都是最新的
        window.location.reload();
      };

      // 添加事件监听器
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      // 清理函数：移除事件监听器
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, []);

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
            
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              p: 2, 
              mb: 2, 
              border: '1px solid', 
              borderColor: 'divider',
              borderRadius: 1,
              bgcolor: 'background.paper'
            }}>
              <Typography variant="h6" gutterBottom color={isAdmin ? "primary" : "text.secondary"}>
                {isAdmin ? "👑 ADMIN ACCOUNT" : "👤 VOTER ACCOUNT"}
              </Typography>
              
              <Typography variant="body2">
                Address: <Box component="span" sx={{ fontFamily: 'monospace' }}>{account}</Box>
              </Typography>
              
              {isRegistered && (
                <Typography variant="body2" color="success.main">
                  ✅ Registered Voter {hasVoted && " • Already Voted"}
                </Typography>
              )}
              
              {!isRegistered && !isAdmin && (
                <Typography variant="body2" color="error">
                  ❌ Not Registered as Voter
                </Typography>
              )}
            </Box>

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

                        {isAdmin && (
                          <Box sx={{ mt: 2 }}>
                            <Button
                              variant="outlined"
                              onClick={() => setShowVoters(!showVoters)}
                              fullWidth
                            >
                              {showVoters ? "Hide Voters Status" : "Show Voters Status"}
                            </Button>
                            
                            {showVoters && (
                              <Card sx={{ mt: 2, maxHeight: 300, overflow: 'auto' }}>
                                <CardContent>
                                  <Typography variant="h6" gutterBottom>
                                    Voters Status
                                  </Typography>
                                  {votersList.length === 0 ? (
                                    <Typography variant="body2">No voters registered</Typography>
                                  ) : (
                                    <List dense>
                                      {votersList.map((voter, index) => (
                                        <ListItem key={index}>
                                          <ListItemText
                                            primary={`${voter.address.substring(0, 8)}...${voter.address.substring(36)}`}
                                            secondary={
                                              <>
                                                <Typography variant="caption" component="span" color={voter.isRegistered ? "success.main" : "error"}>
                                                  {voter.isRegistered ? "Registered" : "Not Registered"}
                                                </Typography>
                                                {" • "}
                                                <Typography variant="caption" component="span" color={voter.hasVoted ? "info.main" : "text.secondary"}>
                                                  {voter.hasVoted ? "Has Voted" : "Has Not Voted"}
                                                </Typography>
                                                {voter.hasVoted && (
                                                  <>
                                                    {" • "}
                                                    <Typography variant="caption" component="span">
                                                      Voted for Proposal {voter.votedProposalId}
                                                    </Typography>
                                                  </>
                                                )}
                                              </>
                                            }
                                          />
                                        </ListItem>
                                      ))}
                                    </List>
                                  )}
                                </CardContent>
                              </Card>
                            )}
                          </Box>
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
                        
                        {workflowStatus === 3 && hasVoted && (
                          <Alert severity="info" sx={{ mb: 2 }}>
                            You have already voted. You cannot vote again in this session.
                          </Alert>
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
                              ? "Your vote has been recorded. Thank you for participating!"
                              : "Select a proposal from the list below to vote"}
                          </Typography>
                        )}
                      </>
                    ) : (
                      <Typography variant="body1" color="text.secondary">
                        You are not registered as a voter.
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
                              opacity: workflowStatus === 3 && isRegistered && !hasVoted ? 1 : 0.7,
                            }}
                          >
                            <ListItemText
                              primary={proposal.description || "Abstention"}
                              secondary={
                                <>
                                  {`Votes: ${proposal.voteCount}`}
                                  {workflowStatus === 3 && isRegistered && hasVoted && 
                                    <Typography variant="caption" component="div" color="error">
                                      You have already voted
                                    </Typography>
                                  }
                                </>
                              }
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
                      <Typography variant="body1" gutterBottom>
                        Vote Count: {winner.voteCount}
                      </Typography>
                      
                      {isRegistered && (
                        <Alert severity={hasVoted ? "success" : "info"} sx={{ mt: 2 }}>
                          {hasVoted 
                            ? "Thank you for participating in this vote!" 
                            : "You did not participate in this vote."}
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>

            {/* Vote Confirmation Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
              <DialogTitle>Confirm Vote</DialogTitle>
              <DialogContent>
                <Typography gutterBottom>
                  Are you sure you want to vote for "{selectedProposal?.description || "Abstention"}"?
                </Typography>
                <Typography variant="body2" color="error">
                  Note: You can only vote once during this voting session. This action cannot be undone.
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