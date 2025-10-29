// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title SkateBountyPool
 * @notice Manages skateboarding bounties with smart account support (ERC-4337)
 * @dev Supports gasless operations via meta-transactions and batch operations
 */
contract SkateBountyPool is ReentrancyGuard, Ownable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    struct Bounty {
        uint256 id;
        address creator;
        bytes32 spotId; // keccak256 of geolocation + spot metadata
        string trickName;
        address rewardToken; // address(0) for native CELO
        uint256 rewardAmount;
        uint256 votesRequired; // Votes needed to release reward
        bool isActive;
        uint256 createdAt;
        address winner;
    }

    struct Submission {
        uint256 id;
        uint256 bountyId;
        address skater;
        string videoIPFSHash;
        uint256 votesUp;
        uint256 votesDown;
        uint256 createdAt;
        bool rewarded;
    }

    struct Vote {
        address voter;
        uint256 submissionId;
        bool isUpvote;
        uint256 timestamp;
    }

    // State
    uint256 public nextBountyId;
    uint256 public nextSubmissionId;
    mapping(uint256 => Bounty) public bounties;
    mapping(uint256 => Submission) public submissions;
    mapping(uint256 => uint256[]) public bountySubmissions; // bountyId => submissionIds
    mapping(address => uint256) public reputation; // User reputation score
    mapping(bytes32 => bool) public usedNonces; // Prevent replay attacks for meta-txs

    // Voting
    mapping(uint256 => mapping(address => bool)) public hasVoted; // submissionId => voter => voted

    // Events
    event BountyCreated(
        uint256 indexed bountyId,
        address indexed creator,
        bytes32 indexed spotId,
        string trickName,
        uint256 rewardAmount,
        address rewardToken
    );
    
    event SubmissionCreated(
        uint256 indexed submissionId,
        uint256 indexed bountyId,
        address indexed skater,
        string videoIPFSHash
    );
    
    event VoteCast(
        uint256 indexed submissionId,
        address indexed voter,
        bool isUpvote
    );
    
    event RewardReleased(
        uint256 indexed bountyId,
        uint256 indexed submissionId,
        address indexed winner,
        uint256 amount
    );
    
    event ReputationUpdated(address indexed user, uint256 newReputation);

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Create a bounty (standard transaction)
     */
    function createBounty(
        bytes32 _spotId,
        string calldata _trickName,
        address _rewardToken,
        uint256 _rewardAmount,
        uint256 _votesRequired
    ) external payable nonReentrant returns (uint256) {
        require(_rewardAmount > 0, "Invalid reward amount");
        require(_votesRequired > 0, "Invalid votes required");

        if (_rewardToken == address(0)) {
            require(msg.value == _rewardAmount, "Incorrect CELO sent");
        } else {
            IERC20(_rewardToken).transferFrom(msg.sender, address(this), _rewardAmount);
        }

        uint256 bountyId = nextBountyId++;
        bounties[bountyId] = Bounty({
            id: bountyId,
            creator: msg.sender,
            spotId: _spotId,
            trickName: _trickName,
            rewardToken: _rewardToken,
            rewardAmount: _rewardAmount,
            votesRequired: _votesRequired,
            isActive: true,
            createdAt: block.timestamp,
            winner: address(0)
        });

        emit BountyCreated(bountyId, msg.sender, _spotId, _trickName, _rewardAmount, _rewardToken);
        return bountyId;
    }

    /**
     * @notice Create bounty via meta-transaction (gasless for smart accounts)
     */
    function createBountyMeta(
        bytes32 _spotId,
        string calldata _trickName,
        address _rewardToken,
        uint256 _rewardAmount,
        uint256 _votesRequired,
        address _creator,
        bytes32 _nonce,
        bytes calldata _signature
    ) external payable nonReentrant returns (uint256) {
        require(!usedNonces[_nonce], "Nonce already used");
        
        bytes32 messageHash = keccak256(abi.encodePacked(
            "createBounty",
            _spotId,
            _trickName,
            _rewardToken,
            _rewardAmount,
            _votesRequired,
            _creator,
            _nonce,
            address(this),
            block.chainid
        )).toEthSignedMessageHash();

        address signer = messageHash.recover(_signature);
        require(signer == _creator, "Invalid signature");

        usedNonces[_nonce] = true;

        if (_rewardToken == address(0)) {
            require(msg.value == _rewardAmount, "Incorrect CELO sent");
        } else {
            IERC20(_rewardToken).transferFrom(_creator, address(this), _rewardAmount);
        }

        uint256 bountyId = nextBountyId++;
        bounties[bountyId] = Bounty({
            id: bountyId,
            creator: _creator,
            spotId: _spotId,
            trickName: _trickName,
            rewardToken: _rewardToken,
            rewardAmount: _rewardAmount,
            votesRequired: _votesRequired,
            isActive: true,
            createdAt: block.timestamp,
            winner: address(0)
        });

        emit BountyCreated(bountyId, _creator, _spotId, _trickName, _rewardAmount, _rewardToken);
        return bountyId;
    }

    /**
     * @notice Submit trick attempt (standard)
     */
    function submitTrick(
        uint256 _bountyId,
        string calldata _videoIPFSHash
    ) external returns (uint256) {
        require(bounties[_bountyId].isActive, "Bounty not active");

        uint256 submissionId = nextSubmissionId++;
        submissions[submissionId] = Submission({
            id: submissionId,
            bountyId: _bountyId,
            skater: msg.sender,
            videoIPFSHash: _videoIPFSHash,
            votesUp: 0,
            votesDown: 0,
            createdAt: block.timestamp,
            rewarded: false
        });

        bountySubmissions[_bountyId].push(submissionId);
        
        // Boost reputation for attempting
        _updateReputation(msg.sender, 1);

        emit SubmissionCreated(submissionId, _bountyId, msg.sender, _videoIPFSHash);
        return submissionId;
    }

    /**
     * @notice Submit trick via meta-transaction (gasless)
     */
    function submitTrickMeta(
        uint256 _bountyId,
        string calldata _videoIPFSHash,
        address _skater,
        bytes32 _nonce,
        bytes calldata _signature
    ) external returns (uint256) {
        require(!usedNonces[_nonce], "Nonce already used");
        require(bounties[_bountyId].isActive, "Bounty not active");

        bytes32 messageHash = keccak256(abi.encodePacked(
            "submitTrick",
            _bountyId,
            _videoIPFSHash,
            _skater,
            _nonce,
            address(this),
            block.chainid
        )).toEthSignedMessageHash();

        address signer = messageHash.recover(_signature);
        require(signer == _skater, "Invalid signature");

        usedNonces[_nonce] = true;

        uint256 submissionId = nextSubmissionId++;
        submissions[submissionId] = Submission({
            id: submissionId,
            bountyId: _bountyId,
            skater: _skater,
            videoIPFSHash: _videoIPFSHash,
            votesUp: 0,
            votesDown: 0,
            createdAt: block.timestamp,
            rewarded: false
        });

        bountySubmissions[_bountyId].push(submissionId);
        _updateReputation(_skater, 1);

        emit SubmissionCreated(submissionId, _bountyId, _skater, _videoIPFSHash);
        return submissionId;
    }

    /**
     * @notice Vote on submission (standard)
     */
    function vote(uint256 _submissionId, bool _isUpvote) external {
        require(submissions[_submissionId].createdAt > 0, "Submission does not exist");
        require(!hasVoted[_submissionId][msg.sender], "Already voted");

        hasVoted[_submissionId][msg.sender] = true;

        if (_isUpvote) {
            submissions[_submissionId].votesUp++;
        } else {
            submissions[_submissionId].votesDown++;
        }

        emit VoteCast(_submissionId, msg.sender, _isUpvote);

        // Auto-release reward if threshold met
        _checkAndReleaseReward(_submissionId);
    }

    /**
     * @notice Vote via meta-transaction (gasless)
     */
    function voteMeta(
        uint256 _submissionId,
        bool _isUpvote,
        address _voter,
        bytes32 _nonce,
        bytes calldata _signature
    ) external {
        require(!usedNonces[_nonce], "Nonce already used");
        require(submissions[_submissionId].createdAt > 0, "Submission does not exist");
        require(!hasVoted[_submissionId][_voter], "Already voted");

        bytes32 messageHash = keccak256(abi.encodePacked(
            "vote",
            _submissionId,
            _isUpvote,
            _voter,
            _nonce,
            address(this),
            block.chainid
        )).toEthSignedMessageHash();

        address signer = messageHash.recover(_signature);
        require(signer == _voter, "Invalid signature");

        usedNonces[_nonce] = true;
        hasVoted[_submissionId][_voter] = true;

        if (_isUpvote) {
            submissions[_submissionId].votesUp++;
        } else {
            submissions[_submissionId].votesDown++;
        }

        emit VoteCast(_submissionId, _voter, _isUpvote);
        _checkAndReleaseReward(_submissionId);
    }

    /**
     * @notice Batch operations for smart accounts
     */
    function batchVote(
        uint256[] calldata _submissionIds,
        bool[] calldata _isUpvotes
    ) external {
        require(_submissionIds.length == _isUpvotes.length, "Array length mismatch");
        
        for (uint256 i = 0; i < _submissionIds.length; i++) {
            if (!hasVoted[_submissionIds[i]][msg.sender]) {
                vote(_submissionIds[i], _isUpvotes[i]);
            }
        }
    }

    /**
     * @dev Check if submission reached vote threshold and release reward
     */
    function _checkAndReleaseReward(uint256 _submissionId) internal {
        Submission storage submission = submissions[_submissionId];
        Bounty storage bounty = bounties[submission.bountyId];

        if (
            bounty.isActive &&
            !submission.rewarded &&
            submission.votesUp >= bounty.votesRequired
        ) {
            submission.rewarded = true;
            bounty.isActive = false;
            bounty.winner = submission.skater;

            // Transfer reward
            if (bounty.rewardToken == address(0)) {
                payable(submission.skater).transfer(bounty.rewardAmount);
            } else {
                IERC20(bounty.rewardToken).transfer(submission.skater, bounty.rewardAmount);
            }

            // Big reputation boost for winner
            _updateReputation(submission.skater, 10);

            emit RewardReleased(
                submission.bountyId,
                _submissionId,
                submission.skater,
                bounty.rewardAmount
            );
        }
    }

    /**
     * @dev Update user reputation
     */
    function _updateReputation(address _user, uint256 _points) internal {
        reputation[_user] += _points;
        emit ReputationUpdated(_user, reputation[_user]);
    }

    /**
     * @notice Get bounty details
     */
    function getBounty(uint256 _bountyId) external view returns (Bounty memory) {
        return bounties[_bountyId];
    }

    /**
     * @notice Get submission details
     */
    function getSubmission(uint256 _submissionId) external view returns (Submission memory) {
        return submissions[_submissionId];
    }

    /**
     * @notice Get all submissions for a bounty
     */
    function getBountySubmissions(uint256 _bountyId) external view returns (uint256[] memory) {
        return bountySubmissions[_bountyId];
    }

    /**
     * @notice Get user reputation
     */
    function getReputation(address _user) external view returns (uint256) {
        return reputation[_user];
    }

    /**
     * @notice Emergency withdrawal (owner only)
     */
    function emergencyWithdraw(address _token, uint256 _amount) external onlyOwner {
        if (_token == address(0)) {
            payable(owner()).transfer(_amount);
        } else {
            IERC20(_token).transfer(owner(), _amount);
        }
    }

    receive() external payable {}
}
