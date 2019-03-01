pragma solidity 1;
/** 
 * TODO: we do not like todos in production code
 * HACK: nope. don't release hacks
 * fixme: aehm, yeah.
 * 
 * @dev lala lala
 * @author some author
 */
/// @title this is some title

contract SimpleDAO {
    mapping (address => uint) private credit;

    /// @param to dont know
    function donate(address to) payable public{
        credit[to] += msg.value;
    }

    function withdraw(uint amount) public{
        if (credit[msg.sender] >= amount) {
            msg.sender.call.value(amount)("");
            credit[msg.sender] -= amount;
        }
    }

    function queryCredit(address to) view public returns(uint){
        return credit[to];
    }

    constructor() public payable { /* constructor */ }
    function() external payable { /* fallback */ }
}