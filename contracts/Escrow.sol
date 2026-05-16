// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {InvoiceShares} from "./InvoiceShares.sol";
import {InsurancePool} from "./InsurancePool.sol";

contract Escrow is AccessControl {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    InvoiceShares public immutable shares;
    InsurancePool public immutable insurance;

    uint256 public constant GRACE_PERIOD = 7 days;

    struct Pool {
        uint256 totalRepaid;
        bool insuranceTriggered;
    }

    mapping(uint256 => Pool) public pools;

    event Repaid(uint256 indexed invoiceId, address indexed from, uint256 amount, uint256 totalRepaid);
    event Claimed(uint256 indexed invoiceId, address indexed holder, uint256 sharesBurned, uint256 amount);
    event Defaulted(uint256 indexed invoiceId, uint256 insuranceTopUp);

    constructor(address admin, IERC20 _usdc, InvoiceShares _shares, InsurancePool _insurance) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        usdc = _usdc;
        shares = _shares;
        insurance = _insurance;
    }

    /// @notice Real-world buyer (or anyone simulating it) deposits USDC repayment for an invoice.
    function repayInvoice(uint256 invoiceId, uint256 amount) external {
        InvoiceShares.Invoice memory inv = shares.getInvoice(invoiceId);
        require(inv.status == InvoiceShares.Status.Listed, "not listed");
        require(amount > 0, "zero");

        usdc.safeTransferFrom(msg.sender, address(this), amount);
        pools[invoiceId].totalRepaid += amount;

        if (pools[invoiceId].totalRepaid >= inv.faceValue) {
            shares.setStatus(invoiceId, InvoiceShares.Status.Repaid);
        }

        emit Repaid(invoiceId, msg.sender, amount, pools[invoiceId].totalRepaid);
    }

    /// @notice Token holder burns their shares and pulls their pro-rata of the repayment pool.
    function claim(uint256 invoiceId) external {
        InvoiceShares.Invoice memory inv = shares.getInvoice(invoiceId);
        require(
            inv.status == InvoiceShares.Status.Repaid || inv.status == InvoiceShares.Status.Defaulted,
            "not settled"
        );

        uint256 held = shares.balanceOf(msg.sender, invoiceId);
        require(held > 0, "no shares");

        uint256 amount = (pools[invoiceId].totalRepaid * held) / inv.totalShares;
        shares.burnFrom(msg.sender, invoiceId, held);

        if (amount > 0) {
            usdc.safeTransfer(msg.sender, amount);
        }
        emit Claimed(invoiceId, msg.sender, held, amount);
    }

    /// @notice After due date + grace, mark invoice as defaulted. Pulls shortfall from insurance pool (capped).
    function triggerDefault(uint256 invoiceId) external {
        InvoiceShares.Invoice memory inv = shares.getInvoice(invoiceId);
        require(inv.status == InvoiceShares.Status.Listed, "already settled");
        require(block.timestamp > inv.dueDate + GRACE_PERIOD, "too early");
        require(!pools[invoiceId].insuranceTriggered, "already triggered");

        pools[invoiceId].insuranceTriggered = true;

        uint256 shortfall = inv.faceValue > pools[invoiceId].totalRepaid
            ? inv.faceValue - pools[invoiceId].totalRepaid
            : 0;

        uint256 paid = 0;
        if (shortfall > 0) {
            paid = insurance.payout(address(this), shortfall, invoiceId);
            pools[invoiceId].totalRepaid += paid;
        }

        shares.setStatus(invoiceId, InvoiceShares.Status.Defaulted);
        emit Defaulted(invoiceId, paid);
    }
}
