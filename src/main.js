import Web3 from "web3";
import { newKitFromWeb3 } from "@celo/contractkit";
import BigNumber from "bignumber.js";
import erc20Abi from "../contract/erc20.abi.json";
import recipeAbi from "../contract/recipe.abi.json";

const ERC20_DECIMALS = 18;
const recipeContractAddress = "0x3AC5fB5c51F8b0D60A2446d36e56b672EB705e4e";
const cUSDContractAddress = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1";

const headerLoginBtn = document.querySelector("#login_btn");
const header = document.querySelector("header");
const headerUploadRecipeBtn = document.querySelector(
  "#header_upload_recipe_btn"
);
const headerBuyRecipeBtn = document.querySelector("#header_buy_recipe_btn");

let kit;
let contract;
let recipes = [];

// NOTIFCATION
function notify(notice) {
  const notificationText = document.querySelector(".notification h1");
  const notificationContainer = document.querySelector(".notification");
  notificationContainer.classList.remove("hide");

  notificationText.textContent = notice;
}
function notifyOff() {
  const notificationContainer = document.querySelector(".notification");
  notificationContainer.classList.add("hide");
}

// HEADER BUTTONS
headerLoginBtn.addEventListener("click", async function () {
  notify("Loading your details, please wait");

  await connectToWallet();
  headerUploadRecipeBtn.classList.remove("hide");
  headerBuyRecipeBtn.classList.remove("hide");
  document.querySelector("#recipes").classList.remove("hide");
  notifyOff();
});

// UPLOAD RECIPE
const uploadRecipeContainer = document.querySelector(
  "#upload_recipe_container"
);

headerUploadRecipeBtn.addEventListener("click", function () {
  header.classList.add("hide");
  recipeContainer.classList.add("hide");
  document.querySelector(".balance").classList.add("hide");
  uploadRecipeContainer.classList.add("d-flex");
  uploadRecipeContainer.classList.remove("hide");

});

document.querySelector(".cancel").addEventListener("click", async function () {
  document.querySelector(".recipe_name input").value = "";
  document.querySelector(".recipe_author input").value = "";
  document.querySelector(".recipe_ingredients textarea").value = "";
  document.querySelector(".recipe_procedure textarea").value = "";
  document.querySelector(".recipe_imgURL input").value = "";
  document.querySelector(".recipe_price input").value = "";
  uploadRecipeContainer.classList.remove("d-flex");
  uploadRecipeContainer.classList.add("hide");
  if(recipes.length  === 0){
    await storedRecipes();
    await userBalance();
  }
  recipeContainer.classList.remove("hide");
  document.querySelector(".balance").classList.remove("hide");
});

// uploading the recipe
const uploadRecipe = document.querySelector(".upload");
uploadRecipe.addEventListener("click", async function (e) {
  e.preventDefault();

  const recipeName = document.querySelector(".recipe_name input").value;
  const recipeAuthor = document.querySelector(".recipe_author input").value;
  const recipeIngredients = document.querySelector(
    ".recipe_ingredients textarea"
  ).value;
  const recipeProcedure = document.querySelector(
    ".recipe_procedure textarea"
  ).value;
  const recipeImageURL = document.querySelector(".recipe_imgURL input").value;
  const recipePrice = document.querySelector(".recipe_price input").value;

  if (
    recipeName &&
    recipeAuthor &&
    recipeIngredients &&
    recipeProcedure &&
    recipePrice
  ) {
    const content = `ingredients: ${recipeIngredients},
                      procedure: ${recipeProcedure}`;

    const recipe = [
      recipeName,
      content,
      recipeAuthor,
      recipeImageURL,
      new BigNumber(recipePrice).shiftedBy(ERC20_DECIMALS).toString(),
    ];

    uploadRecipeContainer.classList.remove("d-flex");
    uploadRecipeContainer.classList.add("hide");
    notify(`Adding ${recipe[0]} recipe`);

    // connecting to the smart contract to access the ipload property function
    try {
      const result = await contract.methods
        .uploadRecipe(...recipe)
        .send({ from: kit.defaultAccount });

      notify(`Successfully added ${recipe[0]} recipe`);

    } catch (error) {
      notify(`Oops, sorry but we couldn't upload your recipe`);
    }
  }
  
  await storedRecipes();
  await userBalance();
  notifyOff();
  recipeContainer.classList.remove("hide");
});


document.querySelector("#show-recipes").addEventListener("click", async function (){
  header.classList.add("hide");
  uploadRecipeContainer.classList.remove("d-flex");
  uploadRecipeContainer.classList.add("hide");
  await storedRecipes();
  await userBalance();
  recipeContainer.classList.remove("hide");
})

// VIEW UPLOADED RECIPES
function uploadedRecipes() {
  const recipeContainer = document.querySelector("#recipes");
  recipeContainer.innerHTML = "";

  recipes.forEach((recipe) => {
    if (!recipe.isDeleted) {
      const newRecipe = document.createElement("div");
      newRecipe.className = "recipe";
      newRecipe.innerHTML = recipeTemplate(recipe);

      recipeContainer.appendChild(newRecipe);
    }
  });
}

// BUY UPLOADED RECIPE & DELETE UPLOADED RECIPE
const recipeContainer = document.querySelector("#recipes");

headerBuyRecipeBtn.addEventListener("click", async function () {
  header.classList.add("hide");
  await storedRecipes();
  await userBalance();
  recipeContainer.classList.remove("hide");
  document.querySelector(".balance").classList.remove("hide");
});

// Buy Recipe
recipeContainer.addEventListener("click", async function (e) {
  if (e.target.parentNode.id && e.target.className.includes("buy")) {
    const recipeIndex = e.target.parentNode.id;

    notify("Transaction in progress,please wait");
    try {
      await recipePurchaseApproval(recipes[recipeIndex].price);
    } catch (error) {
      notify("Error: " + error);
    }

    try {
      const result = await contract.methods
        .buyRecipe(recipeIndex)
        .send({ from: kit.defaultAccount });

      notify("Successfully bought " + recipes[recipeIndex].name);

      storedRecipes();
      userBalance();
      notifyOff();
    } catch (error) {
      notify("Error " + error);
    }
  }

  // Delete Recipe
  else if (e.target.parentNode.id && e.target.className.includes("delete")) {
    const recipeIndex = e.target.parentNode.id;
    const contractInitiator = await contract.methods.contractOwner().call();

    if (recipes[recipeIndex].owner === contractInitiator) {
      deleteRecipe(recipeIndex);
    } else {
      setTimeout(
        notify(
          "You can't delete this recipe. Please wait a few seconds to be redirected to the recipe page"
        ),
        3000
      );
      notifyOff();
    }
  }
});

// Asynchronous function to delete recipe
async function deleteRecipe(index) {
  try {
    notify("Deleting recipe");
    const deleteRecipe = await contract.methods
      .deleteRecipe(index)
      .send({ from: kit.defaultAccount });
    const isDeleted = await contract.methods.deletedRecipe(index).call();

    notify("Recipe successfully deleted");

    storedRecipes();

    notifyOff();
  } catch (err) {
    console.log(err);
  }
}

// RECIPE TEMPLATE
function recipeTemplate(recipe) {
  let recipeImage;
  if (recipe.image.includes("https")) {
    recipeImage = recipe.image;
  } else {
    recipeImage =
      "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?cs=srgb&dl=pexels-ella-olsson-1640777.jpg&fm=jpg";
  }
  return `
    <div class="recipe_img">
      <img
        src=${recipeImage}
        alt="Recipe image"
      />
    </div>

    <div class="icon">
    ${identiconTemplate(recipe.owner)}
    </div>

    <div class="recipe_info">
      <h3>Name: ${recipe.name}</h3>
      <p>Author: ${recipe.author}</p>
      <p>Price: ${recipe.price.shiftedBy(-ERC20_DECIMALS).toFixed(2)} cUSD </p>
      <p class="sold">Sold: ${recipe.sold}</p>
    </div>

    <div id="${recipe.index}" class="buy_recipe_btn">
      ${kit.defaultAccount === recipe.owner? "" : '<button class="buy_recipe">Buy</button>'}
      ${kit.defaultAccount === recipe.owner? '<button class="delete_recipe">Delete</button>' : ""}
    </div>
  `;
}

// IDENTICON TEMPLATE
function identiconTemplate(address) {
  const icon = blockies
    .create({
      seed: address,
      size: 8,
      scale: 16,
    })
    .toDataURL();

  return `
    <a href="https://alfajores-blockscout.celo-testnet.org/address/${address}/transactions"
        target="_blank">
        <img src="${icon}" width="48" alt="${address}">
    </a>
  `;
}

// GET AND DISPLAY STORED UPLOADED RECIPES
async function storedRecipes() {
  const recipesLength = await contract.methods.getRecipeLength().call();
  const recipeArray = [];
  let isDeleted;

  for (let i = 0; i < recipesLength; i++) {
    let newRecipe = new Promise(async function (resolve, reject) {
      let recipeData = await contract.methods.readRecipe(i).call();
      isDeleted = await contract.methods.deletedRecipe(i).call();

      resolve({
        index: i,
        owner: recipeData[0],
        name: recipeData[1],
        content: recipeData[2],
        author: recipeData[3],
        image: recipeData[4],
        price: new BigNumber(recipeData[5]),
        sold: recipeData[6],
        isDeleted,
      });
      reject((err) => {
        notify("Error: " + err);
      });
    });
    recipeArray.push(newRecipe);
  }

  recipes = await Promise.all(recipeArray);
  uploadedRecipes();
}

// CELO BALANCE
async function userBalance() {
  const balanceContainer = document.querySelector(".balance");

  const balance = await kit.getTotalBalance(kit.defaultAccount);
  const cUSDBalance = balance.cUSD.shiftedBy(-ERC20_DECIMALS).toFixed(2);

  const userCeloBalance = `
    <p>Celo balance: <span>${cUSDBalance} cUSD</span></p>
  `;
  balanceContainer.innerHTML = userCeloBalance;
  balanceContainer.classList.remove("hide");
}

// RECIPE PURCHASE TRANSACTION APPROVAL
async function recipePurchaseApproval(recipePrice) {
  notify("Verifying and approving the transaction");
  const cUSDContract = new kit.web3.eth.Contract(erc20Abi, cUSDContractAddress);

  const result = await cUSDContract.methods
    .approve(recipeContractAddress, recipePrice)
    .send({ from: kit.defaultAccount });

  notify("Transaction verified and approved");
  return result;
}

// CONNECT TO THE CELO WALLET
async function connectToWallet() {
  if (window.celo) {
    notify("Connecting to wallet...");

    try {
      await window.celo.enable();
      notify("Connected!!!");

      const web3 = new Web3(window.celo);
      kit = newKitFromWeb3(web3);

      const accounts = await kit.web3.eth.getAccounts();

      kit.defaultAccount = accounts[0];

      contract = new kit.web3.eth.Contract(recipeAbi, recipeContractAddress);
      notifyOff();
      headerLoginBtn.classList.add("hide");
    } catch (error) {
      notify(error);
    }
  } else {
    notify("Please install the CeloExtensionWallet...");
  }
  notifyOff();
}
