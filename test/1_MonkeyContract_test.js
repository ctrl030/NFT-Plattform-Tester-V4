const { expect } = require('chai');
const { BigNumber } = require("ethers");



// Main function that is executed during the test
describe("Monkey Contract, testing", () => {
  // Global variable declarations
  let _contractInstance, monkeyContract, accounts, assertionCounter;

  // this array serves as will receive the generated Hardhat addresses,
  // i.e. accountToAddressArray[0] will hold the address of accounts[0]
  // can be queried by showAllAccounts and findAccountForAddress
  let accountToAddressArray = [];

  // creating an array of NFTs from the owner's mappings: _ownedTokens 
  async function getNFTArray(owner) {
    const resultArray = await monkeyContract.findMonkeyIdsOfAddress(owner);
    const normalNumbersResultArr = [];

    for(pos = 0; pos < resultArray.length; pos++) {
      normalNumbersResultArr[pos] = bigNumberToNumber(resultArray[pos]);
    } 
    console.log("NFT Array of", findAccountForAddress(owner), ": ", normalNumbersResultArr);
    return normalNumbersResultArr;
  };
  
  // comparing an array of NFT Token IDs to the owner's mappings, see: getNFTArray()
  async function expectNFTArray(owner, expectedArray) {
    let resultArray = await getNFTArray(owner);
    for (let count = 0; count < resultArray.length; count ++) {
      expect(bigNumberToNumber(resultArray[count], 0)).to.equal(bigNumberToNumber(expectedArray[count], 0));
    };  
  }  

  async function getETHbalance(adress) {
    const bigNumBalance = await ethers.provider.getBalance(adress);
    const balanceInWEI = bigNumberToNumber(bigNumBalance);
    const balanceInETH = fromWEItoETH(balanceInWEI);
    return balanceInETH;
  }

  // converting BN big numbers to normal numbers
  function bigNumberToNumber(bignumber) {
    let convertedNumber = ethers.utils.formatUnits(bignumber, 0);
    return convertedNumber;
  }

  function fromETHtoWEI (numberInETH) {
    const numberInWEI = web3.utils.toWei(numberInETH);
    return numberInWEI;
  }
  
  function fromWEItoETH (numberInWEI) {
    const numberInETH = web3.utils.fromWei(numberInWEI);    
    return numberInETH;    
  }

  async function createMultiOffersAndVerify(seller, priceInETHArray, tokenIdArray){ 

    console.log('Will now create offers for Token IDs: ', tokenIdArray);

    for (let _index in tokenIdArray) {
      const tokenIdNow = tokenIdArray[_index];
      const priceInWEIForTokenId =  web3.utils.toWei(priceInETHArray[_index].toString()) ;

      console.log('_index: ', _index, 'tokenIdNow: ', tokenIdNow, 'price: ', priceInETHArray[_index]);

      // setting the offer
      await monkeyMarketContract.connect(seller).setOffer(priceInWEIForTokenId, tokenIdNow); 

      // querying the offer and comparing if everything went as expected
      const offerForToken =  await monkeyMarketContract.getOffer(tokenIdNow);
      const tokenSeller = offerForToken.seller;
      const tokenPrice = fromWEItoETH(bigNumberToNumber(offerForToken.price));
      const tokenIdInOffer = bigNumberToNumber(offerForToken.tokenId);
      const offerActive = offerForToken.active;
      const offerArrayIndex = bigNumberToNumber(offerForToken.index);
      expect(tokenSeller).to.equal(seller.address);  
      expect(Number(tokenPrice)).to.equal(priceInETHArray[_index]);  
      expect(Number(tokenIdInOffer)).to.equal(tokenIdNow); 
      expect(offerActive).to.equal(true);

      // querying the offersArray directly (onlyOwner is needed)
      const offerArrayDirectResult = await monkeyMarketContract.showOfferArrayEntry(offerArrayIndex);
      expect(offerArrayDirectResult.active).to.equal(true);
      expect(offerArrayDirectResult.tokenId).to.equal(tokenIdInOffer);
      
    }    
  }

  async function verifyAmountOfActiveOffers(expectedAmount) {
    const allActiveOffersArray = await monkeyMarketContract.getAllTokenOnSale();
    expect(allActiveOffersArray.length).to.equal(expectedAmount);
  } 
  
  async function checkOfferForTokenID( tokenIdToCheck ){
    const offerForToken = await monkeyMarketContract.getOffer(tokenIdToCheck);
    
    let tokenSeller = offerForToken.seller;
    let tokenPrice = fromWEItoETH(bigNumberToNumber(offerForToken.price));
    let tokenIdInOffer = bigNumberToNumber(offerForToken.tokenId);
    let offerActive = offerForToken.active;
    let offerArrayIndex = bigNumberToNumber(offerForToken.index);    

    return {
      tokenIdToCheck,
      tokenIdInOffer,
      tokenSeller,
      tokenPrice,      
      offerActive,
      offerArrayIndex
    }
  }  

  // show X - functions to console.log

  // for testing/debugging: looking up the accounts[] variable for an address
  function findAccountForAddress(addressToLookup){
    for (let findInd = 0; findInd < accountToAddressArray.length; findInd++) {
      if (accountToAddressArray[findInd] == addressToLookup) {
        return "accounts[" +`${findInd}`+ "]"
      } else if (addressToLookup== '0x0000000000000000000000000000000000000000' ) {
        return "Zero address: 0x0000000000000000000000000000000000000000 => i.e. it was burnt"      
      }   
    }  
  }; 

  async function showTokenIDsOnSale(){ 

    console.log('Tokens IDs now on sale:');
    let allOffersNow = await monkeyMarketContract.getAllTokenOnSale();
    for (_u in allOffersNow) {
     console.log(bigNumberToNumber(allOffersNow[_u]));
    }
  }


  // 12 genes0
  const genes0 = [
    1111111111111111,
    2222222222222222,
    3333333333333333,
    4444444444444444,
    5555555555555555,
    6666666666666666,
    7777777777777777,
    1214131177989271,
    4778887573779531,
    2578926622376651,
    5867697316113337,
    2577786627976651        
  ] 

  //set contracts instances
  before(async function() {
   
    //get all accounts from hardhat
    accounts = await ethers.getSigners();

    // making a copy of the account addresses to accountToAddressArray
    for (let accIndex = 0; accIndex < accounts.length ; accIndex++) {
      accountToAddressArray[accIndex] = accounts[accIndex].address;        
    }       

    // Deploy MonkeyContract to hardhat testnet
    _contractInstance = await ethers.getContractFactory('MonkeyContract');
    monkeyContract = await _contractInstance.deploy(accountToAddressArray);  
    
    // deploying the MonkeyMarketplace smart contract and sending it the address of the MonkeyContract for the marketplace constructor
    _marketContractInstance = await ethers.getContractFactory('MonkeyMarketplace');
    monkeyMarketContract = await _marketContractInstance.deploy(monkeyContract.address);     
  })  
  
  it('Test 1: State variables are as expected: owner, contract address, NFT name, NFT symbol, gen 0 limit, gen 0 total, total supply', async() => { 

    // accounts[0] should be deployer of main contract
    const monkeyContractDeployer = await monkeyContract.owner();
    expect(monkeyContractDeployer).to.equal(accounts[0].address);

    // Main contract address should be saved correctly
    const _contractAddress = await monkeyContract.getMonkeyContractAddress(); 
    expect(_contractAddress).to.equal(monkeyContract.address); 

    // NFT name should be "Crypto Monkeys"
    const _name = await monkeyContract.name();
    expect(_name).to.equal('Crypto Monkeys'); 
    
    //  NFT symbol should be "MONKEY"'
    const _symbol = await monkeyContract.symbol()
    expect(_symbol).to.equal('MONKEY');    

    // NFT gen 0 limit should be 12
    const _GEN0_Limit = await monkeyContract.GEN0_Limit();
    expect(_GEN0_Limit).to.equal(12); 

    // NFT gen 0 total should be 0 in the beginning
    const _gen0amountTotal = await monkeyContract.gen0amountTotal();
    expect(_gen0amountTotal).to.equal(0);  
    
    // NFT total supply should be 0 in the beginning
    const _totalSupply = await monkeyContract.totalSupply();
    expect(_totalSupply).to.equal(0);
    
    // Zero monkey exists in the allMonkeysArray, but burned
    // i.e. owner is zero address and it is deleted from _allTokens which is queried by totalSupply()
    const zeroDetails = await monkeyContract.allMonkeysArray(0);
    const zeroGenes = bigNumberToNumber(zeroDetails[3]); 
    expect(zeroGenes).to.equal(bigNumberToNumber(1214131177989271));  

  });


  it("Test 2: Gen 0 monkeys: Create 12 gen 0 NFTs, then expect revert above 12 (after GEN0_Limit = 12)", async () => {   

    // REVERT: create a gen 0 monkey from account[1]
    await expect(monkeyContract.connect(accounts[1]).createGen0Monkey(genes0[0])).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );

    // creating 12 gen 0 monkeys
    for(_i in genes0){
     await monkeyContract.createGen0Monkey(genes0[_i]);
    }

    // NFT totalSupply should be 12
    const _totalSupply2 = await monkeyContract.totalSupply();
    expect(_totalSupply2).to.equal(12); 

    // There should be 12 Gen 0 Monkeys
    const _GEN0Amount = await monkeyContract.gen0amountTotal();
    expect (_GEN0Amount).to.equal(12); 

    // verify monkey genes are the same from our genes0 array 
    // skipping zero monkey created by constructor, starting with Token ID 1
    for (let i = 1; i < _totalSupply2; i++) {
      let _monkeyMapping = await monkeyContract.allMonkeysArray(i);
      
      if(i > 0){
     
      // _monkeyMapping[3] shows genes attribute inside the returning CryptoMonkey object
      // comparison has to be i-1 to allow for zero monkey difference         
      expect(_monkeyMapping[3]).to.equal(genes0[i-1]);
      }
    } 

    // GEN0_Limit reached, next creation should fail
    await expect(monkeyContract.createGen0Monkey(genes0[0])).to.be.revertedWith(
      "Maximum amount of gen 0 monkeys reached"
    );    

  });

  it("Test 3: Breeding CryptoMonkey NFTs", async () => {

    // breeding 3 NFT monkeys
    await monkeyContract.breed(1, 2); // tokenId 12
    await monkeyContract.breed(3, 4); // tokenId 13
    await monkeyContract.breed(5, 6); // tokenId 14  
    
    // balanceOf accounts[0] should be 15
    expect(await monkeyContract.balanceOf(accounts[0].address)).to.equal(15);

    // NFT totalSupply should be 15
    expect(await monkeyContract.totalSupply()).to.equal(15);

    // checking NFT array of accounts[0]
    const test3Acc0ExpectedArr = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15];
    await expectNFTArray(accounts[0].address, test3Acc0ExpectedArr);
  });

  it("Test 4: Account[0] transfers 2 gen0 monkeys from itself to account[1] ", async () =>{   
     // transferring NFTs with Token IDs 2 and 3 to accounts[1]
     await monkeyContract.transfer(accounts[0].address, accounts[1].address, 2);
     expect(await monkeyContract.balanceOf(accounts[1].address)).to.equal(1);
     await monkeyContract.transfer(accounts[0].address, accounts[1].address, 3);    
     expect(await monkeyContract.balanceOf(accounts[1].address)).to.equal(2);
     let test4Acc1ExpectedArr = [2,3];
     await expectNFTArray(accounts[1].address, test4Acc1ExpectedArr);
     
     // accounts[0] should now own 13 NFTs, IDs 1-15 without 2 and 3, and 15 and 14 swapped and popped to empty places of 2 and 3
     expect(await monkeyContract.balanceOf(accounts[0].address)).to.equal(13);
     let test4Acc0ExpectedArr = [1,15,14,4,5,6,7,8,9,10,11,12,13];
     await expectNFTArray(accounts[0].address, test4Acc0ExpectedArr);     
   
  });

  it("Test 5: Reverting non-owned monkey", async () => {      

    // REVERT: transfering a non-owned monkey
    await expect(monkeyContract.transfer(accounts[1].address, accounts[2].address, 1)).to.be.revertedWith(
      "ERC721: transfer of token that is not own"
    );    
    
  }); 
  
  it('Test 6: accounts[0] should give accounts[1] operator status and transfer, incl. reverting transfer without operator', async() => {  
    
    // Giving operator status 
    await monkeyContract.setApprovalForAll(accounts[1].address, true);
    expect(await monkeyContract.isApprovedForAll(accounts[0].address, accounts[1].address)).to.equal(true);

    // Taking away operator status 
    await  monkeyContract.setApprovalForAll(accounts[1].address, false);
    expect(await monkeyContract.isApprovedForAll(accounts[0].address, accounts[1].address)).to.equal(false);

    // REVERT: without operator status, accounts[1] tries to send NFT with Token ID 4 from accounts[0] to accounts[2]     
    await expect(monkeyContract.connect(accounts[1]).transfer(accounts[0].address, accounts[2].address, 4)).to.be.revertedWith(
      "MonkeyContract: Can't transfer this NFT without being owner, approved or operator"
    );
    
    // Giving operator status again
    await monkeyContract.setApprovalForAll(accounts[1].address, true);
    expect(await monkeyContract.isApprovedForAll(accounts[0].address, accounts[1].address)).to.equal(true);
    
    // As operator, accounts[1] sends NFT with Token IDs 6-9 from accounts[0] to accounts[2]
    for (let index = 6; index <= 9; index++) {
      await monkeyContract.connect(accounts[1]).transfer(accounts[0].address, accounts[2].address,`${index}`);   
    }  

    // checking NFT array of accounts[2]
    expect(await monkeyContract.balanceOf(accounts[2].address)).to.equal(4);
    const test6Acc2ExpectedArr = [6,7,8,9];    
    await expectNFTArray(accounts[2].address, test6Acc2ExpectedArr);

    // checking NFT array of accounts[0]
    expect(await monkeyContract.balanceOf(accounts[2].address)).to.equal(4);
    const test6Acc0ExpectedArr = [1,15,14,4,5,13,12,11,10];    
    await expectNFTArray(accounts[0].address, test6Acc0ExpectedArr);
    
  });
 
  it.skip('Test 7: accounts[2] should use safeTransferFrom with sending data and without sending data', async() => {  
    
    await monkeyContract.safeTransferFrom(accounts[0].address, accounts[3].address, 10);  
    //await monkeyContract.connect(accounts[2]).safeTransferFrom(accounts[0].address, accounts[3].address, 8);
    //await monkeyContract.connect(accounts[2]).transferFrom(accounts[0].address, accounts[3].address, 8);       
    /*
    // checking NFT array of accounts[2]
    expect(await monkeyContract.balanceOf(accounts[2].address)).to.equal(3);
    const test7Acc2ExpectedArr = [6,7,9];    
    await expectNFTArray(accounts[2].address, test7Acc2ExpectedArr);

    // checking NFT array of accounts[0]
    expect(await monkeyContract.balanceOf(accounts[3].address)).to.equal(1);
    const test7Acc3ExpectedArr = [8];    
    await expectNFTArray(accounts[3].address, test7Acc3ExpectedArr);*/

    // 21 is skipped, 15A does a simpler version, via default call being from accounts[0], i.e. needing 1 less argument
    // might be due to hardhat, truffle, etc being so new
    // accepts 4 arguments (either without data or targeting an instance with predefined {from: accounts[PREDEFINED_ARRAY_INDEX]})
    // but when given 5 (i.e.  with data plus custom defined account in contract call) throws and says: "Error: Invalid number of parameters for "safeTransferFrom". Got 5 expected 3!"
    // complicating factor maybe: two functions exist under the name "safeTransferFrom", one accepting 4 arguments, the other only 3, setting the fourth to ''
    
  }); 
  
  
  it('Test 8: as operator, accounts[1] should use transferFrom to take 3 NFTs with Token IDs 13-15 from accounts[0]', async() => {  
    
    for (let index = 13; index <= 15; index++) {
      await monkeyContract.connect(accounts[1]).transfer(accounts[0].address, accounts[1].address,`${index}`);
    }

    // checking NFT array of accounts[1]
    expect(await monkeyContract.balanceOf(accounts[1].address)).to.equal(5);
    const test8Acc1ExpectedArr = [2,3,13,14,15];    
    await expectNFTArray(accounts[1].address, test8Acc1ExpectedArr);

    // checking NFT array of accounts[0]
    expect(await monkeyContract.balanceOf(accounts[0].address)).to.equal(6);
    const test8Acc0ExpectedArr = [1,12,11,4,5,10];    
    await expectNFTArray(accounts[0].address, test8Acc0ExpectedArr);
    
  });
  
  it('Test 9: accounts[1] should give exclusive allowance for the NFT with Token ID 14 to accounts[2], which then takes the NFT', async() => {  
    await monkeyContract.connect(accounts[1]).approve(accounts[2].address, 14);
    const testingMonkeyNr14 = await monkeyContract.getApproved(14); // xxxxx OUT, calls getApproved same as below
    expect(testingMonkeyNr14).to.equal(accounts[2].address);

    await monkeyContract.connect(accounts[2]).transfer(accounts[1].address, accounts[2].address, 14);

    // checking NFT array of accounts[1]
    expect(await monkeyContract.balanceOf(accounts[1].address)).to.equal(4);
    const test9Acc1ExpectedArr = [2,3,13,15];    
    await expectNFTArray(accounts[1].address, test9Acc1ExpectedArr);

    // checking NFT array of accounts[2]
    expect(await monkeyContract.balanceOf(accounts[2].address)).to.equal(5);
    const test9Acc2ExpectedArr = [6,7,8,9,14];    
    await expectNFTArray(accounts[2].address, test9Acc2ExpectedArr);
    
  }); 

  
  it('Test 10: accounts[4] should use breed to create 2 NFTs each of gen2, gen3, gen4, gen5, gen6 and gen7, i.e. should have 16 NFTs at the end (2x gen0 - 2x gen7) ' , async() => { 

    // NFT totalSupply should be 15
    expect(await monkeyContract.totalSupply()).to.equal(15);

    // checking Token ID 7 to be gen0
    expect((await monkeyContract.getMonkeyDetails(7)).generation).to.equal(0);

    // checking Token ID 14 to be gen1
    expect((await monkeyContract.getMonkeyDetails(14)).generation).to.equal(1);
    
    // accounts[2] breeds NFTs with Token IDs 7 and 14 twice, creating 2 gen2 NFTs: Token IDs 16 and 17       
    for (let index22B1 = 7; index22B1 <= 8; index22B1++) {
      await monkeyContract.connect(accounts[2]).breed(7, 14);      
    }

    // checking Token IDs 16 and 17 to be gen2
    expect((await monkeyContract.getMonkeyDetails(16)).generation).to.equal(2);
    expect((await monkeyContract.getMonkeyDetails(17)).generation).to.equal(2);
    
    // starting with gen2 for breeding NFTs with Token IDs 16 and 17 
    let test22Bgeneration = 3;
    // Token IDs are increased by 2 per loop, breeding 16 and 17, then 18 and 19, etc.
    // these are the Token IDs of the parents, not the children
    let test22BFirstParentIdCounter = 16;
    let test22BSecondParentIdCounter = test22BFirstParentIdCounter+1;
    
    // 5 loops, creating gen3-gen7
    for (let t22BigLoop = 0; t22BigLoop < 5; t22BigLoop++) {

      // creating 2 NFTs per loop
      for (let index22B = 0; index22B < 2; index22B++) {
        await monkeyContract.connect(accounts[2]).breed(test22BFirstParentIdCounter, test22BSecondParentIdCounter);        
      }      
      test22BFirstParentIdCounter = test22BFirstParentIdCounter +2;    
      test22BSecondParentIdCounter = test22BSecondParentIdCounter+2;      
      
      expect( (await monkeyContract.getMonkeyDetails(test22BFirstParentIdCounter)).generation ).to.equal(test22Bgeneration);
      expect( (await monkeyContract.getMonkeyDetails(test22BSecondParentIdCounter)).generation ).to.equal(test22Bgeneration);   
      test22Bgeneration++;        
      
    }      

    // NFT totalSupply should be 27
    expect(await monkeyContract.totalSupply()).to.equal(27);

    // checking NFT array of accounts[2]
    expect(await monkeyContract.balanceOf(accounts[2].address)).to.equal(17);
    const test10Acc2ExpectedArr = [6,7,8,9,14,16,17,18,19,20,21,22,23,24,25,26,27];    
    await expectNFTArray(accounts[2].address, test10Acc2ExpectedArr);
    
  });

  it('Test 11: Market should know main contract address', async () => {            
    const mainContractAddressSavedInMarket = await monkeyMarketContract.savedMainContractAddress();     
    expect(mainContractAddressSavedInMarket).to.equal(monkeyContract.address);       
  }) 

  it('Test 12: accounts[0] should be deployer of main contract', async () => {        
    const monkeyContractOwner = await monkeyContract.owner();      
    expect(monkeyContractOwner).to.equal(accounts[0].address);
  }) 
  
  it('Test 13: accounts[0] should be deployer of market contract', async () => {        
    const marketContractOwner = await monkeyMarketContract.owner(); 
    expect(marketContractOwner).to.equal(accounts[0].address);  
  }) 

  it('Test 14: Creating and deleting offers', async () => { 
    
    let pricesInETHTest14Acc2 = [6.5, 7.2, 0.000019, 260];
    let tokenIDsToSellT14Acc2 = [6, 7, 19, 26]; 

    // REVERT: without market having operator status, accounts[2] tries to create 4 offers
    await expect(createMultiOffersAndVerify(accounts[2], pricesInETHTest14Acc2, tokenIDsToSellT14Acc2)).to.be.revertedWith(
      "Marketplace address needs operator status from monkey owner."
    );    

    // giving operator status and verifying
    await monkeyContract.connect(accounts[1]).setApprovalForAll(monkeyMarketContract.address, true);
    await monkeyContract.connect(accounts[2]).setApprovalForAll(monkeyMarketContract.address, true);
    expect(await monkeyContract.isApprovedForAll(accounts[1].address, monkeyMarketContract.address)).to.equal(true);
    expect(await monkeyContract.isApprovedForAll(accounts[2].address, monkeyMarketContract.address)).to.equal(true);

    // after giving operator status to market, accounts[2] creates 4 offers (Token IDs: 6, 7, 19, 26), offers are then verified 
    await createMultiOffersAndVerify(accounts[2], pricesInETHTest14Acc2, tokenIDsToSellT14Acc2);      

    await verifyAmountOfActiveOffers(4);

    //accounts[1] creates 4 offers (Token IDs: 2,3,13,15), offers are then verified 
    let pricesInETHTest14Acc1 = [2, 3.5, 0.13, 150];
    let tokenIDsToSellT14Acc1 = [2, 3, 13, 15]; 
    await createMultiOffersAndVerify(accounts[1], pricesInETHTest14Acc1, tokenIDsToSellT14Acc1);  

    await verifyAmountOfActiveOffers(8);
    
    // REVERT: accounts[1] deletes the offer for Token ID 7, though not the owner
    await expect(monkeyMarketContract.connect(accounts[1]).removeOffer(7)).to.be.revertedWith(
      "You're not the owner"
    );

    // accounts[2] deletes the offer for Token ID 7
    await monkeyMarketContract.connect(accounts[2]).removeOffer(7);

    // REVERT: No active offer for Token ID 7 should exist
    await expect(monkeyMarketContract.getOffer(7)).to.be.revertedWith(
      "No active offer for this tokenId."
    );

    await verifyAmountOfActiveOffers(7);
    
    /*
    await getNFTArray(accounts[0].address);
    await getNFTArray(accounts[1].address);
    await getNFTArray(accounts[2].address);
    await getNFTArray(accounts[3].address);
    await getNFTArray(accounts[4].address);*/

  });

  it('Test 15: Buying / selling  ', async () => { 

 


    const balanceBeforeT15Acc3 = await getETHbalance(accounts[3].address); //await ethers.provider.getBalance(accounts[3].address);
    console.log('balanceBeforeT15Acc3: ', balanceBeforeT15Acc3);

    // accounts[3] should buy 3 NFTs from acc1
    await monkeyMarketContract.connect( accounts[3] ).buyMonkey( 2, {value: ethers.utils.parseEther("2")} );
    await monkeyMarketContract.connect( accounts[3] ).buyMonkey( 13, {value: ethers.utils.parseEther("0.13")} );
    await monkeyMarketContract.connect( accounts[3] ).buyMonkey( 15, {value: ethers.utils.parseEther("150")} );

    await getNFTArray(accounts[3].address);

    // accounts[4] should buy 3 NFTs from acc2

    // accounts[3] should breed 4 NFTs, create offers

    // accounts[5] should buy 2 NFTs from acc3 (1 orig from acc1 and 1 bred)

    // acc2 should buy back 2 NFTS from acc4

  })

});







/*


it('Test 39makeLast: should verify the intergrity between trackers _monkeyIdsAndTheirOwnersMapping and MonkeyIdPositionsMapping for all NFTs', async () => {  
  
  await assertPosIntegrAllNFTs();
}); 


it('Test 40: should show how many assertions in testing were done', async () => {  

  console.log('During these Hardhat tests, at least', assertionCounter , 'assertions were succesfully proven correct.')


}); */
    
    
 