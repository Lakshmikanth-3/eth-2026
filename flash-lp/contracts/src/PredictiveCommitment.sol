// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IZKVerifier {
    function verify(bytes calldata proof, bytes32 publicInput) external view returns (bool);
}

/**
 * @title PredictiveCommitment
 * @notice Handles ZK-proof based usage predictions with reward/penalty mechanism
 */
contract PredictiveCommitment {
    
    IZKVerifier public immutable zkVerifier;
    
    mapping(bytes32 => Commitment) public commitments;
    
    struct Commitment {
        bytes32 id;
        bytes32 rentalId;
        address committer;
        uint256 predictedAmount;
        uint256 predictedDuration;
        uint256 predictedVolume;
        uint256 commitmentTime;
        uint256 stakeAmount;
        bool isVerified;
        bool isSettled;
    }
    
    // Reward tiers
    uint256 public constant TIER_1_THRESHOLD = 5e16;   // 5% error
    uint256 public constant TIER_2_THRESHOLD = 10e16;  // 10% error
    uint256 public constant TIER_3_THRESHOLD = 15e16;  // 15% error
    uint256 public constant PENALTY_THRESHOLD = 20e16; // 20% error
    
    uint256 public constant TIER_1_REWARD = 15e16;     // 15% discount
    uint256 public constant TIER_2_REWARD = 10e16;     // 10% discount
    uint256 public constant TIER_3_REWARD = 5e16;      // 5% discount
    uint256 public constant PENALTY_RATE = 5e16;       // 5% penalty
    
    event CommitmentSubmitted(
        bytes32 indexed commitmentId,
        bytes32 indexed rentalId,
        address indexed committer,
        uint256 predictedDuration
    );
    
    event CommitmentVerified(
        bytes32 indexed commitmentId,
        uint256 predictionError,
        uint256 rewardAmount
    );
    
    constructor(address _zkVerifier) {
        zkVerifier = IZKVerifier(_zkVerifier);
    }
    
    /**
     * @notice Submit a predictive commitment with ZK proof
     */
    function submitCommitment(
        bytes32 rentalId,
        bytes32 predictedUsageHash,
        bytes calldata zkProof
    ) external payable returns (bytes32 commitmentId) {
        // Verify ZK proof
        if (address(zkVerifier) != address(0)) {
            require(
                zkVerifier.verify(zkProof, predictedUsageHash),
                "Invalid ZK proof"
            );
        }
        
        // Generate commitment ID
        commitmentId = keccak256(abi.encodePacked(
            rentalId,
            msg.sender,
            block.timestamp
        ));
        
        // Store commitment
        commitments[commitmentId] = Commitment({
            id: commitmentId,
            rentalId: rentalId,
            committer: msg.sender,
            predictedAmount: 0, // Encoded in hash
            predictedDuration: 0, // Encoded in hash
            predictedVolume: 0, // Encoded in hash
            commitmentTime: block.timestamp,
            stakeAmount: msg.value,
            isVerified: true,
            isSettled: false
        });
        
        emit CommitmentSubmitted(commitmentId, rentalId, msg.sender, 0);
        
        return commitmentId;
    }
    
    /**
     * @notice Verify commitment and distribute reward/penalty
     */
    function verifyAndReward(
        bytes32 commitmentId,
        uint256 actualDuration,
        uint256 actualAmount
    ) external returns (uint256 rewardAmount) {
        Commitment storage commitment = commitments[commitmentId];
        require(!commitment.isSettled, "Already settled");
        
        // Calculate prediction error
        uint256 durationError = _calculateError(
            commitment.predictedDuration,
            actualDuration
        );
        
        // Determine reward tier
        if (durationError <= TIER_1_THRESHOLD) {
            // 15% reward
            rewardAmount = (commitment.stakeAmount * TIER_1_REWARD) / 1e18;
        } else if (durationError <= TIER_2_THRESHOLD) {
            // 10% reward
            rewardAmount = (commitment.stakeAmount * TIER_2_REWARD) / 1e18;
        } else if (durationError <= TIER_3_THRESHOLD) {
            // 5% reward
            rewardAmount = (commitment.stakeAmount * TIER_3_REWARD) / 1e18;
        } else if (durationError > PENALTY_THRESHOLD) {
            // 5% penalty (negative reward)
            rewardAmount = 0;
            // Penalty goes to LP (handled by caller)
        } else {
            // No reward, no penalty
            rewardAmount = 0;
        }
        
        commitment.isSettled = true;
        
        emit CommitmentVerified(commitmentId, durationError, rewardAmount);
        
        return rewardAmount;
    }
    
    function _calculateError(
        uint256 predicted,
        uint256 actual
    ) internal pure returns (uint256) {
        if (predicted == 0) return 0; // Avoid division by zero
        
        uint256 diff = predicted > actual 
            ? predicted - actual 
            : actual - predicted;
            
        return (diff * 1e18) / predicted;
    }
}
