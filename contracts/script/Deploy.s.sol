// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IdentityRegistry} from "../src/IdentityRegistry.sol";
import {EvaluationRegistry} from "../src/EvaluationRegistry.sol";
import {ReputationRegistry} from "../src/ReputationRegistry.sol";
import {ValidationRegistry} from "../src/ValidationRegistry.sol";
import {MilestoneManager} from "../src/MilestoneManager.sol";
import {DisputeRegistry} from "../src/DisputeRegistry.sol";

contract Deploy is Script {
    function run() external {
        // For mainnet, set MATCHING_POOL to a multisig address.
        // Defaults to deployer (msg.sender) for testnet/local.
        address matchingPool = vm.envOr("MATCHING_POOL", msg.sender);

        vm.startBroadcast();

        IdentityRegistry identity = new IdentityRegistry();
        console.log("IdentityRegistry:", address(identity));

        EvaluationRegistry evaluation = new EvaluationRegistry();
        console.log("EvaluationRegistry:", address(evaluation));

        ReputationRegistry reputation = new ReputationRegistry(address(identity));
        console.log("ReputationRegistry:", address(reputation));

        ValidationRegistry validation = new ValidationRegistry(address(identity));
        console.log("ValidationRegistry:", address(validation));

        MilestoneManager milestone = new MilestoneManager(matchingPool);
        console.log("MilestoneManager:", address(milestone));
        console.log("  matchingPool:", matchingPool);

        DisputeRegistry dispute = new DisputeRegistry();
        console.log("DisputeRegistry:", address(dispute));

        vm.stopBroadcast();
    }
}
