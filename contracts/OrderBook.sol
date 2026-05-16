// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {InvoiceShares} from "./InvoiceShares.sol";
import {InsurancePool} from "./InsurancePool.sol";

/// @notice On-chain settlement of matches produced by the off-chain order book.
/// Trade flow per match:
///  - buyer pays buyer-side USDC (qty * pricePerShare); must have approved this contract
///  - seller transfers ERC-1155 shares to buyer; must have approved this contract as operator
///  - protocol fees taken from buyer payment, routed to insurance pool + fee recipient
contract OrderBook is AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant MATCHER_ROLE = keccak256("MATCHER_ROLE");

    // Fees in basis points (1 bp = 0.01%)
    uint16 public constant PRIMARY_FEE_BPS = 150; // 1.50%
    uint16 public constant SECONDARY_FEE_BPS = 25; // 0.25%
    uint16 public constant INSURANCE_FEE_BPS = 50; // 0.50%
    uint16 public constant BPS_DENOM = 10_000;

    IERC20 public immutable usdc;
    InvoiceShares public immutable shares;
    InsurancePool public immutable insurance;
    address public feeRecipient;

    event Matched(
        uint256 indexed invoiceId,
        address indexed seller,
        address indexed buyer,
        uint256 qty,
        uint256 pricePerShare,
        uint256 grossUsdc,
        uint256 platformFee,
        uint256 insuranceFee,
        bool primary
    );
    event FeeRecipientUpdated(address recipient);

    constructor(
        address admin,
        IERC20 _usdc,
        InvoiceShares _shares,
        InsurancePool _insurance,
        address _feeRecipient
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        usdc = _usdc;
        shares = _shares;
        insurance = _insurance;
        feeRecipient = _feeRecipient;
    }

    function setFeeRecipient(address recipient) external onlyRole(DEFAULT_ADMIN_ROLE) {
        feeRecipient = recipient;
        emit FeeRecipientUpdated(recipient);
    }

    /// @param invoiceId      ERC-1155 token id
    /// @param seller         current holder of shares
    /// @param buyer          recipient of shares; must have approved USDC
    /// @param qty            number of shares to transfer
    /// @param pricePerShare  USDC (6 dp) per share
    function executeMatch(
        uint256 invoiceId,
        address seller,
        address buyer,
        uint256 qty,
        uint256 pricePerShare
    ) external onlyRole(MATCHER_ROLE) {
        require(qty > 0 && pricePerShare > 0, "bad params");

        InvoiceShares.Invoice memory inv = shares.getInvoice(invoiceId);
        require(inv.status == InvoiceShares.Status.Listed, "not tradable");

        uint256 gross = qty * pricePerShare;
        bool primary = seller == inv.originalSeller;
        uint16 platformBps = primary ? PRIMARY_FEE_BPS : SECONDARY_FEE_BPS;
        uint256 platformFee = (gross * platformBps) / BPS_DENOM;
        uint256 insuranceFee = (gross * INSURANCE_FEE_BPS) / BPS_DENOM;
        uint256 sellerNet = gross - platformFee - insuranceFee;

        // Pull buyer's USDC
        usdc.safeTransferFrom(buyer, address(this), gross);

        // Distribute
        if (platformFee > 0) usdc.safeTransfer(feeRecipient, platformFee);
        if (insuranceFee > 0) usdc.safeTransfer(address(insurance), insuranceFee);
        if (sellerNet > 0) usdc.safeTransfer(seller, sellerNet);

        // Move shares
        shares.safeTransferFrom(seller, buyer, invoiceId, qty, "");

        emit Matched(invoiceId, seller, buyer, qty, pricePerShare, gross, platformFee, insuranceFee, primary);
    }
}
