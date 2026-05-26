# Security Specification: Monopoly Bank (大富翁電子銀行)

This document outlines the security architecture and validation constraints protecting the Monopoly Electronic Banking Firestore database, establishing structural invariants for the game play data.

## 1. Data Invariants

1. **Room Invariant**: A user cannot join, update, or read a room ledger unless they have the matching 6-digit `roomId`.
2. **Banker Monopoly**: Admin commands (such as reset, universal bank give/take) require the actor's `playerId` to match the room's `bankerPlayerId`.
3. **Transaction Immutability**: All transaction entries (logs of transfers) are append-only. They cannot be modified or deleted.
4. **Local Identity Coupling**: A player can only write to or update their own player metadata (`/rooms/{roomId}/players/{playerId}`) where `playerId` matches their Firebase authenticated UID.
5. **Atomic Balance Security**: Transactions should correctly audit trace balance shifts. Since clients can execute atomic transactions (batch of multiple writes), updates to balance must follow standard validation ranges.

---

## 2. The "Dirty Dozen" Malicious Payloads

The following malicious operations are prohibited and must yield a `PERMISSION_DENIED` error:

1. **Spoofed Room Banker**: A non-host user tries to change the room's `bankerPlayerId` to themselves.
2. **Infinite Initial Balance**: A player sets the room's `initialBalance` to `999,999,999,999` during room creation.
3. **Ghost Player Injection**: An unauthenticated or spoofed client attempts to inject a player document using a mismatching `playerId`.
4. **Rogue Balance Inflation**: A player tries to write directly to their `balance` field, adding `$5,000,000` from thin air without an accompanying bank transaction.
5. **Identity Hijacking**: User B tries to update User A's `name` or `avatar` emoji.
6. **Transaction Deletion**: A player attempts to delete or clear the audit log `transactions` subcollection.
7. **Negative Money Transfer**: A player initiates a transfer to another player with a negative quantity, effectively stealing money from the recipient.
8. **Malicious ID Poisoning**: A user requests creation of an extremely large custom document ID (e.g. 1MB size) or containing dangerous characters to trigger denial-of-service/billing inflation.
9. **Double-Spend/Speed Racing**: Modifying `updatedAt` to historical timestamps instead of `request.time`.
10. **Bank Ledger Override**: Changing structural fields in existing transaction entries.
11. **Orphaned Room Join**: Trying to join a player document to a roomId that does not exist in the system.
12. **Unauthorized Metadata Wipe**: Overwriting a Room's properties with arbitrary schema properties.

---

## 3. Test Cases (Aesthetic Verification)

Our security rule suite is validated using the formal firestore test parameters verifying block conditions across `create`, `update`, and `delete` operations.
