// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.9.0;

interface IERC20Token {
    function transfer(address, uint256) external returns (bool);

    function approve(address, uint256) external returns (bool);

    function transferFrom(
        address,
        address,
        uint256
    ) external returns (bool);

    function totalSupply() external view returns (uint256);

    function balanceOf(address) external view returns (uint256);

    function allowance(address, address) external view returns (uint256);

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );
}

contract Recipes {
    uint256 internal recipeLength = 0;
    address internal cUsdTokenAddress =
        0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1;
    address internal owner;
    uint256 editFee;

    mapping(uint256 => Recipe) internal recipes;
    mapping(uint256 => bool) private banned;
    struct Recipe {
        address payable owner;
        string recipe_name;
        string recipe_contents;
        string recipe_author;
        string recipe_imageURL;
        uint256 recipe_price;
        uint256 recipe_sold;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Unauthorized user");
        _;
    }

    modifier checkRecipeValues(
        string memory _recipe_name,
        string memory _recipe_contents,
        string memory _recipe_imageURL
    ) {
        require(bytes(_recipe_name).length > 0, "Invalid recipe name");
        require(bytes(_recipe_contents).length > 0, "Invalid recipe");
        require(bytes(_recipe_imageURL).length > 0, "Invalid image url");
        _;
    }


    modifier checkBanned(uint _index){
      require(!banned[_index], "Recipe is currently banned");
      _;
    }

    constructor() {
        owner = msg.sender;
        editFee = 1 ether;
    }

    function uploadRecipe(
        string memory _recipe_name,
        string memory _recipe_contents,
        string memory _recipe_author,
        string memory _recipe_imageURL,
        uint256 _recipe_price
    )
        public
        checkRecipeValues(_recipe_name, _recipe_contents, _recipe_imageURL)
    {
        require(_recipe_price > 0, "Enter a valid price");
        require(bytes(_recipe_author).length > 0, "Invalid author");
        uint256 _recipe_sold = 0;
        recipes[recipeLength] = Recipe(
            payable(msg.sender),
            _recipe_name,
            _recipe_contents,
            _recipe_author,
            _recipe_imageURL,
            _recipe_price,
            _recipe_sold
        );
        recipeLength++;
    }

    function editRecipe(
        uint256 _index,
        string memory _recipe_name,
        string memory _recipe_contents,
        string memory _recipe_imageURL
    )
        public
        payable
        checkBanned(_index)
        checkRecipeValues(_recipe_name, _recipe_contents, _recipe_imageURL)
    {
        require(msg.sender == recipes[_index].owner, "Unauthorized user");
        require(
            IERC20Token(cUsdTokenAddress).transferFrom(
                msg.sender,
                owner,
                editFee
            ),
            "Transfer failed."
        );
        Recipe storage currentRecipe = recipes[_index];
        currentRecipe.recipe_name = _recipe_name;
        currentRecipe.recipe_contents = _recipe_contents;
        currentRecipe.recipe_imageURL = _recipe_imageURL;
    }

    function readRecipe(uint256 _index)
        public
        view
        checkBanned(_index)
        returns (Recipe memory
        )
    {
        return recipes[_index];
    }

    function buyRecipe(uint256 _index) public payable checkBanned(_index) {
        require(
            msg.sender != recipes[_index].owner,
            "You can't buy your own recipe"
        );
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

    function getRecipeLength() public view returns (uint256) {
        return (recipeLength);
    }

    function banRecipe(uint256 _index) public onlyOwner {
        require(!banned[_index], "Recipe is already banned");
        banned[_index] = true;
    }

    function unBanRecipe(uint256 _index) public onlyOwner {
        require(banned[_index], "Recipe isn't banned");
        banned[_index] = false;
    }

    function isBanned(uint256 _index) public view returns (bool) {
        return (banned[_index]);
    }

    function contractOwner() public view returns (address) {
        return (owner);
    }
}
