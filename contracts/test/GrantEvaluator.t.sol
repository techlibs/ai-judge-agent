// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {GrantEvaluator} from "../src/GrantEvaluator.sol";

contract GrantEvaluatorTest is Test {
    GrantEvaluator public evaluator;

    function setUp() public {
        evaluator = new GrantEvaluator();
    }

    function test_Version() public view {
        assertEq(evaluator.version(), 1);
    }
}
