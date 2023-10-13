//SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

interface B {
    function testCall(uint256 a) external payable;
}


contract TestFunctionOverride {

struct test1 {
    uint256 t1;
}

struct test2 {
    string t2;
}

    address test;
    function foo() public {}

    function foo(string memory bar2) public {}

    function bar(uint256 t1, uint256 t2) public {
        B(test).testCall(t1);
    }
    function bar(uint256 t2) public payable {
        B(test).testCall(t2);
    }

    function bar(test1 calldata t1) public {
    }

    function bar(test2 calldata t2) public {}

}