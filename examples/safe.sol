contract Safe {
    mapping(address => uint256) ledger;
    function () external payable  {
        ledger[msg.sender] += msg.value;
    }
    function withdraw() public {
        uint256 balance = ledger[msg.sender];
        ledger[msg.sender] = 0;
        msg.sender.transfer(balance);
    }
}