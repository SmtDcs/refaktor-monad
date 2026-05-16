// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract InvoiceShares is ERC1155, AccessControl {
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant ESCROW_ROLE = keccak256("ESCROW_ROLE");

    enum Status {
        None,
        Listed,
        Repaid,
        Defaulted
    }

    enum Rating {
        A,
        B,
        C,
        D
    }

    struct Invoice {
        uint256 faceValue; // in USDC (6 decimals)
        uint256 dueDate; // unix seconds
        uint256 totalShares; // typically 500
        address originalSeller; // SME
        string buyerName;
        string currency; // "EUR", "USD"
        Rating rating;
        Status status;
    }

    uint256 public nextInvoiceId = 1;
    mapping(uint256 => Invoice) public invoices;

    event InvoiceMinted(uint256 indexed invoiceId, address indexed seller, uint256 faceValue, uint256 totalShares);
    event InvoiceStatusChanged(uint256 indexed invoiceId, Status status);

    constructor(address admin) ERC1155("") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function mintInvoice(
        address seller,
        uint256 faceValue,
        uint256 dueDate,
        uint256 totalShares,
        string calldata buyerName,
        string calldata currency,
        Rating rating
    ) external onlyRole(VERIFIER_ROLE) returns (uint256 invoiceId) {
        require(faceValue > 0 && totalShares > 0, "bad params");
        require(dueDate > block.timestamp, "due in past");

        invoiceId = nextInvoiceId++;
        invoices[invoiceId] = Invoice({
            faceValue: faceValue,
            dueDate: dueDate,
            totalShares: totalShares,
            originalSeller: seller,
            buyerName: buyerName,
            currency: currency,
            rating: rating,
            status: Status.Listed
        });

        _mint(seller, invoiceId, totalShares, "");
        emit InvoiceMinted(invoiceId, seller, faceValue, totalShares);
    }

    function setStatus(uint256 invoiceId, Status status) external onlyRole(ESCROW_ROLE) {
        invoices[invoiceId].status = status;
        emit InvoiceStatusChanged(invoiceId, status);
    }

    function burnFrom(address from, uint256 invoiceId, uint256 amount) external onlyRole(ESCROW_ROLE) {
        _burn(from, invoiceId, amount);
    }

    function getInvoice(uint256 invoiceId) external view returns (Invoice memory) {
        return invoices[invoiceId];
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
