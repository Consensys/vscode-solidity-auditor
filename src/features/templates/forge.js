const generateForgeTemplate = (contract) => {
  const contractTypeName = contract.name;
  const contractInstanceName = contractTypeName.toLowerCase();
  const contractPath = contract.path;
  return `
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console2} from "forge-std/Test.sol";
import ${contractTypeName} from "${contractPath}";

contract CounterTest is Test {
     
    ${contractTypeName} public ${contractInstanceName};
    address immutable deployer = 0xaA96b71DA3E88aF887779056d0cc4A91C12BaAAA;
    address immutable firstOwnerAddress = 0xaA96B71da3e88AF887779056D0CC4A91c12bbBBb;
    address immutable secondOwnerAddress = 0xAA96b71DA3E88af887779056D0Cc4a91C12bCccc;
    address immutable externalAddress = 0xAA96b71Da3e88af887779056d0CC4A91C12BDDdd;

    // https://book.getfoundry.sh/forge/writing-tests
    function setUp() public {
        ${contractInstanceName} = new ${contractTypeName}();
    }

    function testCallFromDeployer() public {
        ${contractInstanceName}.myFunction();
    }

    function testCallFromExternalAddress() public {
        vm.prank(externalAddress);
        counter.myFunction();
    }

    // https://book.getfoundry.sh/cheatcodes/expect-revert
    function testRevertFromExternalAddress() public {
        vm.prank(firstOwnerAddress);
        counter.myPrivilegedFunction();
        vm.prank(externalAddress);
        vm.expectRevert("revertMsg");
        counter.myPrivilegedFunction();
    }

    // https://book.getfoundry.sh/forge/fuzz-testing
    function testFuzzTest(uint256 x) public {
        vm.prank(externalAddress);
        x = bound(x, 100, 1e36);
        counter.storeMagicNumber(x);
        assertEq(counter.magicNumber(), x);
    }
}
`;
};

module.exports = {
    generateForgeTemplate
}