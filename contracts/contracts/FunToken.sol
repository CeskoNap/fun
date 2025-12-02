// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title FunToken
 * @dev ERC-20 token for the Fun gaming platform
 * 
 * Token Details:
 * - Name: Fun
 * - Symbol: FUN
 * - Decimals: 8
 * - Initial Supply: 1,000,000,000 FUN (1 billion)
 * 
 * Features:
 * - Standard ERC-20 functionality
 * - Mintable by owner/authorized roles (for platform rewards)
 * - Burnable (for deflationary mechanics)
 * - Access control for mint/burn operations
 * 
 * Note: For MVP, balances are managed off-chain in the platform database.
 * This contract exists for future on-chain integration.
 */
contract FunToken is ERC20, ERC20Burnable, Ownable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    uint8 private constant DECIMALS = 8;
    uint256 private constant INITIAL_SUPPLY = 1_000_000_000 * 10**DECIMALS; // 1 billion FUN

    /**
     * @dev Constructor mints initial supply to the deployer
     */
    constructor(address initialOwner) ERC20("Fun", "FUN") Ownable(initialOwner) {
        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
        _grantRole(MINTER_ROLE, initialOwner);
        _grantRole(BURNER_ROLE, initialOwner);
        
        // Mint initial supply to deployer
        _mint(initialOwner, INITIAL_SUPPLY);
    }

    /**
     * @dev Override decimals to return 8
     */
    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }

    /**
     * @dev Mint new tokens (only for authorized minters)
     * @param to Address to mint tokens to
     * @param amount Amount to mint (in base units, 8 decimals)
     */
    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    /**
     * @dev Batch mint tokens to multiple addresses
     * @param recipients Array of recipient addresses
     * @param amounts Array of amounts to mint (must match recipients length)
     */
    function batchMint(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external onlyRole(MINTER_ROLE) {
        require(
            recipients.length == amounts.length,
            "FunToken: arrays length mismatch"
        );
        
        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amounts[i]);
        }
    }

    /**
     * @dev Grant minter role to an address (admin only)
     */
    function grantMinterRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(MINTER_ROLE, account);
    }

    /**
     * @dev Grant burner role to an address (admin only)
     */
    function grantBurnerRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(BURNER_ROLE, account);
    }

    /**
     * @dev Revoke minter role from an address (admin only)
     */
    function revokeMinterRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(MINTER_ROLE, account);
    }

    /**
     * @dev Revoke burner role from an address (admin only)
     */
    function revokeBurnerRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(BURNER_ROLE, account);
    }
}

