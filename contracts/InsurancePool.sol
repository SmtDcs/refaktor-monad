// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract InsurancePool is AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant ESCROW_ROLE = keccak256("ESCROW_ROLE");
    bytes32 public constant FEEDER_ROLE = keccak256("FEEDER_ROLE");

    IERC20 public immutable usdc;

    event Deposited(address indexed from, uint256 amount);
    event PaidOut(address indexed to, uint256 amount, uint256 indexed invoiceId);

    constructor(address admin, IERC20 _usdc) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        usdc = _usdc;
    }

    function deposit(uint256 amount) external onlyRole(FEEDER_ROLE) {
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        emit Deposited(msg.sender, amount);
    }

    function payout(address to, uint256 amount, uint256 invoiceId) external onlyRole(ESCROW_ROLE) returns (uint256 paid) {
        uint256 bal = usdc.balanceOf(address(this));
        paid = amount > bal ? bal : amount;
        if (paid > 0) {
            usdc.safeTransfer(to, paid);
        }
        emit PaidOut(to, paid, invoiceId);
    }

    function balance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }
}
