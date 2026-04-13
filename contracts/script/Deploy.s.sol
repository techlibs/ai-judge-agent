// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IdentityRegistry} from "../src/IdentityRegistry.sol";
import {ReputationRegistry} from "../src/ReputationRegistry.sol";
import {MilestoneManager} from "../src/MilestoneManager.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy IdentityRegistry
        IdentityRegistry identity = new IdentityRegistry(
            "IPE City Identity",
            "IPEID"
        );
        console.log("IdentityRegistry:", address(identity));

        // 2. Deploy ReputationRegistry and link to IdentityRegistry
        ReputationRegistry reputation = new ReputationRegistry();
        reputation.initialize(address(identity));
        console.log("ReputationRegistry:", address(reputation));

        // 3. Deploy MilestoneManager linked to both
        MilestoneManager milestoneManager = new MilestoneManager(
            address(identity),
            address(reputation)
        );
        console.log("MilestoneManager:", address(milestoneManager));

        vm.stopBroadcast();

        // Log deployment summary
        console.log("---");
        console.log("Deployment complete on chain:", block.chainid);
        console.log("IdentityRegistry:", address(identity));
        console.log("ReputationRegistry:", address(reputation));
        console.log("MilestoneManager:", address(milestoneManager));
    }
}
