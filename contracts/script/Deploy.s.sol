// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/IdentityRegistry.sol";
import "../src/ReputationRegistry.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy IdentityRegistry
        IdentityRegistry identityRegistry = new IdentityRegistry();
        console.log("IdentityRegistry deployed at:", address(identityRegistry));

        // Deploy ReputationRegistry with IdentityRegistry reference
        ReputationRegistry reputationRegistry = new ReputationRegistry(address(identityRegistry));
        console.log("ReputationRegistry deployed at:", address(reputationRegistry));

        // Grant REGISTRAR_ROLE on IdentityRegistry to deployer (server wallet)
        // Already granted in constructor, but log for clarity
        console.log("REGISTRAR_ROLE holder:", deployer);

        // Grant EVALUATOR_ROLE on ReputationRegistry to deployer (server wallet)
        // Already granted in constructor, but log for clarity
        console.log("EVALUATOR_ROLE holder:", deployer);

        console.log("DEPLOYMENT_BLOCK:", block.number);

        vm.stopBroadcast();
    }
}
