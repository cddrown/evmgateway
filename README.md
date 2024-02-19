# EVM CCIP-Read Gateway
This repository implements a generic CCIP-Read gateway framework for fetching state proofs of data on other EVM chains. This allows L1 smart contracts to fetch and verify state from L2s. The library is built to be as modular and interchangeable as possible. This means:

 - Anyone can operate their own gateway, but...
 - Only one gateway needs to be operated for each chain, regardless of the applications requesting data from it.
 - Gateways do not need to be trusted; their responses are fully verified on L1.
 - Contracts can fetch L2 state using a simple builder interface and callbacks.
 - Contracts can change targets (eg, a different L2) just by swapping out the address of a verifier contract for another.

While this functionality is written primarily with read calls in mind, it also functions for transactions; using a compliant
library like Ethers, a transaction that includes relevant L2 proofs can be generated and signed.



## Usage

 1. Have your contract extend `EVMFetcher`.
 2. In a view/pure context, use `EVMFetcher` to fetch the value of slots from another contract (potentially on another chain). Calling `EVMFetcher.fetch()` terminates execution and generates a callback to the same contract on a function you specify.
 3. In the callback function, use the information from the relevant slots as you see fit.

## Example

The example below fetches another contract's storage value `testUint`.

```
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import { EVMFetcher } from '@ensdomains/evm-verifier/contracts/EVMFetcher.sol';
import { EVMFetchTarget } from '@ensdomains/evm-verifier/contracts/EVMFetchTarget.sol';
import { IEVMVerifier } from '@ensdomains/evm-verifier/contracts/IEVMVerifier.sol';

contract TestL2 {
    uint256 testUint; // Slot 0
    
    constructor() {
        testUint = 42;
    }
}

contract TestL1 is EVMFetchTarget {
    using EVMFetcher for EVMFetcher.EVMFetchRequest;

    IEVMVerifier verifier;
    address target;

    constructor(IEVMVerifier _verifier, address _target) {
        verifier = _verifier;
        target = _target;
    }

    function getTestUint() public view returns(uint256) {
        EVMFetcher.newFetchRequest(verifier, target)
            .getStatic(0)
            .fetch(this.getSingleStorageSlotCallback.selector, "");
    }

    function getSingleStorageSlotCallback(bytes[] memory values, bytes memory) public pure returns(uint256) {
        return uint256(bytes32(values[0]));
    }
}
```

## Packages

This is a monorepo divided up into several packages:

### [evm-gateway](/evm-gateway/)
A framework for constructing generic CCIP-Read gateways targeting different EVM-compatible chains. This repository
implements all the functionality required to fetch and verify multiple storage slots from an EVM-compatible chain,
omitting only the L2-specific logic of determining a block to target, and verifying the root of the generated proof.

### [l1-gateway](/l1-gateway/)
An instantiation of `evm-gateway` that targets Ethereum L1 - that is, it implements a CCIP-Read gateway that generates
proofs of contract state on L1.

This may at first seem useless, but as the simplest possible practical EVM gateway implementation, it acts as an excellent
target for testing the entire framework end-to-end.

It may also prove useful for contracts that wish to trustlessly establish the content of storage variables of other contracts,
or historic values for storage variables of any contract.

### [evm-verifier](/evm-verifier/)
A Solidity library that verifies state proofs generated by an `evm-gateway` instance. This library implements all the
functionality required make CCIP-Read calls to an EVM gateway and verify the responses, except for verifying the root of the
proof. This library is intended to be used by libraries for specific EVM-compatible chains that implement the missing 
functionality.

### [l1-verifier](/l1-verifier/)
A complete Solidity library that facilitates sending CCIP-Read requests for L1 state, and verifying the responses.

This repository also contains the end-to-end tests for the entire stack.

### [op-gateway](/op-gateway/)
An instantiation of `evm-gateway` that targets Optimism. Combined with `op-verifier`, makes it possible for L1 contracts to fetch contract state data from Optimism.

### [op-verifier](/op-verifier/)
A complete Solidity library that facilitates sending CCIP-Read requests for Optimism state, and verifying the responses.


## How to setup locally

```
gh repo clone ensdomains/evmgateway
bun install # `@ensdomains/@ensdomains` not found error will be thrown
bun run workspace evm-gateway build
bun install
bun run test
```

## Troubleshooting

### Error HH12: Trying to use a non-local installation of Hardhat, which is not supported.

`yarn test` spawns `hardhat test` in the forked process. When `hardhat` command is installed under the node_modules of under each workspace, it complains that it's using locally installed hardhat. Remove hardhat from local node_modules and make sure it's only installed under the root `node_modules`

```
rm -rf *-*/node_modules/hardhat
```