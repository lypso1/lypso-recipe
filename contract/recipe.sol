// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.9.0;

interface IERC20Token {
  function transfer(address, uint256) external returns (bool);
  function approve(address, uint256) external returns (bool);
  function transferFrom(address, address, uint256) external returns (bool);
  function totalSupply() external view returns (uint256);
  function balanceOf(address) external view returns (uint256);
  function allowance(address, address) external view returns (uint256);

  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract Recipes {

    uint internal recipeLength = 0;
    address internal cUsdTokenAddress = 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1;
    address internal owner;

    mapping(uint => Recipe) internal recipes;

    struct Recipe {
      address payable owner;
      string recipe_name;
      string recipe_contents;
      string recipe_author;
      string recipe_imageURL;
      uint recipe_price;
      uint recipe_sold;
      bool recipe_deleted;
    }

    modifier onlyOwner {
      require(msg.sender == owner);
      _;
    }

    constructor() {
      owner = msg.sender;
    }

    function uploadRecipe(
      string memory _recipe_name,
      string memory _recipe_contents,
      string memory _recipe_author,
      string memory _recipe_imageURL,
      uint _recipe_price
    ) public {

        require(_recipe_price > 0, "Enter a valid price");
      uint _recipe_sold = 0;
      bool _recipe_deleted = false;
      recipes[recipeLength] = Recipe(
        payable(msg.sender),
        _recipe_name,
        _recipe_contents,
        _recipe_author,
        _recipe_imageURL,
        _recipe_price,
        _recipe_sold,
        _recipe_deleted
      );
      recipeLength ++;
    }

    function readRecipe(uint _index) public view returns(
      address payable,
      string memory,
      string memory,
      string memory,
      string memory,
      uint,
      uint
    ) {
      return(
        recipes[_index].owner,
        recipes[_index].recipe_name,
        recipes[_index].recipe_contents,
        recipes[_index].recipe_author,
        recipes[_index].recipe_imageURL,
        recipes[_index].recipe_price,
        recipes[_index].recipe_sold
      );
    }

    function buyRecipe(uint _index) public payable  {
        require(
          IERC20Token(cUsdTokenAddress).transferFrom(
            msg.sender,
            recipes[_index].owner,
            recipes[_index].recipe_price
          ),
          "Transfer failed."
        );
        recipes[_index].recipe_sold++;
    }

    function getRecipeLength() public view returns (uint) {
      return (recipeLength);
    }

    function deleteRecipe(uint _index) public onlyOwner {
      recipes[_index].recipe_deleted = true;
    }

    function deletedRecipe(uint _index) public view returns (bool) {
      return (recipes[_index].recipe_deleted);
    }
    
    function contractOwner() public view returns (address) {
      return (msg.sender);
    }


}
