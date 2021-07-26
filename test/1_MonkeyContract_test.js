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

  // converting BN big numbers to normal numbers
  function bigNumberToNumber(bignumber) {
    let convertedNumber = ethers.utils.formatUnits(bignumber, 0);
    return convertedNumber;
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

    // Deploy MonkeyContract to testnet
    _contractInstance = await ethers.getContractFactory('MonkeyContract');
    monkeyContract = await _contractInstance.deploy(accountToAddressArray);     
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
    const breed1answer = await monkeyContract.breed(1, 2); // tokenId 12
    const breed2answer = await monkeyContract.breed(3, 4); // tokenId 13
    const breed3answer = await monkeyContract.breed(5, 6); // tokenId 14  
    
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
    await  monkeyContract.setApprovalForAll(accounts[1].address, true);
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
        //console.log('index22B:', index22B, 'test22BFirstParentIdCounter: ', test22BFirstParentIdCounter, 'test22BSecondParentIdCounter ', test22BSecondParentIdCounter); 
      }      
      test22BFirstParentIdCounter = test22BFirstParentIdCounter +2;    
      test22BSecondParentIdCounter = test22BSecondParentIdCounter+2;
      
      //console.log('token ID', test22BFirstParentIdCounter, ' has generation:', bigNumberToNumber((await monkeyContract.getMonkeyDetails(test22BFirstParentIdCounter)).generation )) ;
      //console.log('token ID', test22BSecondParentIdCounter, ' has generation:', bigNumberToNumber((await monkeyContract.getMonkeyDetails(test22BSecondParentIdCounter)).generation )) ;
      expect(bigNumberToNumber( (await monkeyContract.getMonkeyDetails(test22BFirstParentIdCounter)).generation) ).to.equal(bigNumberToNumber(test22Bgeneration));
      expect(bigNumberToNumber( (await monkeyContract.getMonkeyDetails(test22BSecondParentIdCounter)).generation) ).to.equal(bigNumberToNumber(test22Bgeneration));   
      test22Bgeneration++;        
      
    }      

    // NFT totalSupply should be 27
    expect(await monkeyContract.totalSupply()).to.equal(27);

    // checking NFT array of accounts[2]
    expect(await monkeyContract.balanceOf(accounts[2].address)).to.equal(17);
    const test10Acc2ExpectedArr = [6,7,8,9,14,16,17,18,19,20,21,22,23,24,25,26,27];    
    await expectNFTArray(accounts[2].address, test10Acc2ExpectedArr);
    
  });
});

/*
// Market contract Hardhat test with openzeppelin, Truffle and web3
contract("MonkeyContract + MonkeyMarketplace with HH", accounts => {

// Before running the tests, deploying a new MonkeyMarketplace 
before(async()=> {
  // deploying the marketplace smart contract: MonkeyMarketplace and getting the address of the MonkeyContract for the marketplace constructor
  monkeyMarketplaceHHInstance = await MonkeyMarketplace.new(monkeyContractHHInstance.address);    
 
});

describe('Testing correct deployment', () => {
  
  it('Test 23: Market should know main contract address', async () => {        
    const mainContractAddressSavedInMarket = await monkeyMarketplaceHHInstance.returnMonkeyContract();      
    assert.equal(mainContractAddressSavedInMarket, monkeyContractHHInstance.address);
    assertionCounter++;     
  }) 

  it('Test 24: accounts[0] should be deployer of main contract', async () => {        
    const monkeyContractHHInstanceOwner = await monkeyContractHHInstance.contractOwner()      
    assert.equal(monkeyContractHHInstanceOwner, accounts[0]);
    assertionCounter++;
  }) 
  
  it('Test 25: accounts[0] should be deployer of market contract', async () => {        
    const marketContractHHInstanceOwner = await monkeyMarketplaceHHInstance.contractOwner()     
    assert.equal(marketContractHHInstanceOwner, accounts[0]);
    assertionCounter++;
  }) 

});

describe('Testing creating and deleting offers', () => {
  
  it('Test 26: accounts[2] and accounts[4] should give market contract operator status', async () => {    

    giveMarketOperatorAndAssertAndCount(accounts[2]);
    giveMarketOperatorAndAssertAndCount(accounts[4]);
  }) 

  it('Test 27: accounts[2] should create 4 offers, all gen0 (Token IDs: 1,2,3,4), prices in ETH same as Token ID', async () => {    

    for (let test27Counter = 1; test27Counter <= 4; test27Counter++) {        

      let priceInETHTest27 = test27Counter.toString(); 

      let priceInWEIForCallingTest27 = web3.utils.toWei(priceInETHTest27); 

      await monkeyMarketplaceHHInstance.setOffer(priceInWEIForCallingTest27, test27Counter, {from: accounts[2]});        

      await assertOfferDetailsForTokenID(test27Counter, true, accounts[2], priceInETHTest27 );        
    }

    const offersArray = [1, 2, 3, 4];
    await assertAmountOfActiveOffersAndCount(4, offersArray);
   
  }) 

  it('Test 28: accounts[4] should create 4 offers, 2x gen6 (Token IDs: 35, 36) and 2x gen7 (Token IDs: 37, 38)', async () => {  
    for (let test28Counter = 35; test28Counter <= 38; test28Counter++) {        
      await createOfferAndAssert (test28Counter, test28Counter, accounts[4]);         
    }     
    const offersArray = [1, 2, 3, 4, 35, 36, 37, 38];
    await assertAmountOfActiveOffersAndCount(8, offersArray);
  }) 

  it('Test 29: accounts[2] should delete 1 active offer (Token ID: 4), now 7 active offers should exist (Token IDs: 1,2,3 and 35,36,37,38) ', async () => {  
    await monkeyMarketplaceHHInstance.removeOffer(4, {from: accounts[2]});
    await expectNoActiveOfferAndCount(4); 
    const offersArray = [1, 2, 3, 35, 36, 37, 38];
    await assertAmountOfActiveOffersAndCount(7, offersArray);
  }) 

  it('Test 30: accounts[4] should delete 1 active offer (Token ID: 35), now 6 active offers should exist (Token IDs: 1,2,3 and 36,37,38)', async () => {  
    await monkeyMarketplaceHHInstance.removeOffer(35, {from: accounts[4]});
    await expectNoActiveOfferAndCount(35);    
    const offersArray = [1, 2, 3, 36, 37, 38];
    await assertAmountOfActiveOffersAndCount(6, offersArray);
  }) 
});

describe('Testing buying and full market functionality', () => { 

  it('Test 31: accounts[5] should buy 3 NFTs (Token IDs: 1,2,3) from accounts[2], now 3 active offers should exist (Token IDs: 36,37,38)', async () => {  
      for (let buyCountT31 = 1; buyCountT31 <= 3; buyCountT31++) { 

      // balance in WEI before buy
      const balanceInWEIBefore = await web3.eth.getBalance(accounts[5]);       
      //console.log('accounts[5] has', parseInt(balanceInWEIBefore), 'WEI before buying Token ID', buyCountT31) 

      // balance in ETH before buy
      //const balanceInETHBefore = web3.utils.fromWei(await web3.eth.getBalance(accounts[5]), 'ether'); 
      //console.log('accounts[5] has', parseInt(balanceInETHBefore), 'ether before buying Token ID', buyCountT31)          

      // setting Token ID to price in ETH (1=>1), calculated into WEI
      let buyCountT31asString = buyCountT31.toString();
      let t31priceToPayInWEI = web3.utils.toWei(buyCountT31asString);  
      
      console.log('loop and tokenID', buyCountT31, 'has the price in WEI:', t31priceToPayInWEI, 'and this balance:', balanceInWEIBefore);
      
      await monkeyMarketplaceHHInstance.buyMonkey(buyCountT31, {from: accounts[5], value: t31priceToPayInWEI});  
      
      const balanceBeforeInWEIasBN = new BN(balanceInWEIBefore);
      const priceInWEIasBN = new BN(t31priceToPayInWEI);
      const expectedBalanceAfterInWEIasBN = balanceBeforeInWEIasBN.sub(priceInWEIasBN);

      //console.log('loop and tokenID', buyCountT31, 'has the expectedBalanceAfterInWEI:', expectedBalanceAfterInWEI);
      //console.log('loop and tokenID', buyCountT31, 'has the balanceBeforeInWEIasBN:');
      //console.log(balanceBeforeInWEIasBN);

      //console.log('loop and tokenID', buyCountT31, 'has the priceInWEIasBN:');
      //console.log(priceInWEIasBN);        
      
      console.log('priceInWEIasBN');
      console.log(priceInWEIasBN);
      console.log('balanceBeforeInWEIasBN');
      console.log(balanceBeforeInWEIasBN);
      console.log('expectedBalanceAfterInWEIasBN');
      console.log(expectedBalanceAfterInWEIasBN);

      //console.log('parseInt of it is:');
      //const expectedBalanceAfterInWEIParsed = Number(expectedBalanceAfterInWEIasBN)
      //console.log(expectedBalanceAfterInWEIParsed);

      //const expectedBalanceAfterInWEIasString = expectedBalanceAfterInWEI.toString();       
      
      await assertBalanceAsBN(accounts[5], expectedBalanceAfterInWEIasBN);

      // balance after buy
      //const balanceInWEIAfter = await web3.eth.getBalance(accounts[5]); 
      //console.log('accounts[5] has', parseInt(balanceInWEIAfter), 'WEI after buying Token ID', buyCountT31)       
      //console.log('accounts[5] has', parseInt(balanceInETHAfter), 'ether after buying Token ID', buyCountT31)
      
    }      
    const offersArray = [36,37,38];
    await assertAmountOfActiveOffersAndCount(3, offersArray);

    const account0ArrayToAssert = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    await assertAllFourTrackersCorrect (accounts[0], 0,  account0ArrayToAssert);

    const account1ArrayToAssert = [0, 0, 8, 9, 10, 11, 12];
    await assertAllFourTrackersCorrect (accounts[1], 5,  account1ArrayToAssert);

    const account2ArrayToAssert = [0,0,0, 4, 0, 7];
    await assertAllFourTrackersCorrect (accounts[2], 2,  account2ArrayToAssert);

    const account3ArrayToAssert = [0,0,13,0,0,16,17,18,19,20,21,22,23,24,25,26];
    await assertAllFourTrackersCorrect (accounts[3], 12,  account3ArrayToAssert);
    
    const account4ArrayToAssert = [5, 6, 14, 15, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38];
    await assertAllFourTrackersCorrect (accounts[4], 16,  account4ArrayToAssert);

    const account5ArrayToAssert = [1, 2, 3];
    await assertAllFourTrackersCorrect (accounts[5], 3,  account5ArrayToAssert);


  })   

  it('Test 32: accounts[1] should buy 2 NFTs (Token IDs: 36, 37) from accounts[4], now 1 active offer should exist (Token ID: 38)', async () => {  
    for (let buyCountT32 = 36; buyCountT32 <= 37; buyCountT32++) { 
      let largeCountingNrT32 = buyCountT32.toString();
      let t32priceToPayInWEI = web3.utils.toWei(largeCountingNrT32);
      await monkeyMarketplaceHHInstance.buyMonkey(buyCountT32, {from: accounts[1], value: t32priceToPayInWEI});
    }
    const offersArray = [38];
    await assertAmountOfActiveOffersAndCount(1, offersArray);

    const account0ArrayToAssert = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    await assertAllFourTrackersCorrect (accounts[0], 0,  account0ArrayToAssert);

    const account1ArrayToAssert = [0, 0, 8, 9, 10, 11, 12, 36, 37];
    await assertAllFourTrackersCorrect (accounts[1], 7,  account1ArrayToAssert);

    const account2ArrayToAssert = [0,0,0, 4, 0, 7];
    await assertAllFourTrackersCorrect (accounts[2], 2,  account2ArrayToAssert);

    const account3ArrayToAssert = [0,0,13,0,0,16,17,18,19,20,21,22,23,24,25,26];
    await assertAllFourTrackersCorrect (accounts[3], 12,  account3ArrayToAssert);
    
    const account4ArrayToAssert = [5, 6, 14, 15, 27, 28, 29, 30, 31, 32, 33, 34, 35, 0, 0, 38];
    await assertAllFourTrackersCorrect (accounts[4], 14,  account4ArrayToAssert);

    const account5ArrayToAssert = [1, 2, 3];
    await assertAllFourTrackersCorrect (accounts[5], 3,  account5ArrayToAssert);
  }) 
  
  it('Test 33: accounts[3] should breed NFTs (IDs:25,26) creating 3 gen2 NFTs (Token IDs:39,40,41) create offers, now 4 active offers (Token ID: 38,39,40,41)', async () => {  
    // breeding NFTs with Token IDs 25 and 26 three times, creating gen2 Token IDs 39,40,41       
    for (let index22B1 = 1; index22B1 <= 3; index22B1++) {
      await monkeyContractHHInstance.breed(25, 26, {from: accounts[3]});         
    }        

    // Giving operator status 
    giveMarketOperatorAndAssertAndCount(accounts[3]);
 
    for (let test33Counter = 39; test33Counter <= 41; test33Counter++) {        
      // args: price in ETH, Token ID, account
      await createOfferAndAssert (test33Counter, test33Counter, accounts[3]);    
    }
    const offersArray = [38,39,40,41];
    await assertAmountOfActiveOffersAndCount(4, offersArray);

    const account0ArrayToAssert = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    await assertAllFourTrackersCorrect (accounts[0], 0,  account0ArrayToAssert);

    const account1ArrayToAssert = [0, 0, 8, 9, 10, 11, 12, 36, 37];
    await assertAllFourTrackersCorrect (accounts[1], 7,  account1ArrayToAssert);

    const account2ArrayToAssert = [0,0,0, 4, 0, 7];
    await assertAllFourTrackersCorrect (accounts[2], 2,  account2ArrayToAssert);

    const account3ArrayToAssert = [0,0,13,0,0,16,17,18,19,20,21,22,23,24,25,26, 39, 40, 41];
    await assertAllFourTrackersCorrect (accounts[3], 15,  account3ArrayToAssert);
    
    const account4ArrayToAssert = [5, 6, 14, 15, 27, 28, 29, 30, 31, 32, 33, 34, 35, 0, 0, 38];
    await assertAllFourTrackersCorrect (accounts[4], 14,  account4ArrayToAssert);

    const account5ArrayToAssert = [1, 2, 3];
    await assertAllFourTrackersCorrect (accounts[5], 3,  account5ArrayToAssert);
  }) 
  
  it('Test 34: accounts[1] should create 2 offers (Token IDs:36,37) and accounts[5] 2 offers (Token IDs:1,2), now 8 active offers (Token IDs: 38,39,40,41,36,37,1,2)', async () => {  
    
    // Giving operator status 
    giveMarketOperatorAndAssertAndCount(accounts[1]);
    giveMarketOperatorAndAssertAndCount(accounts[5]);
    
    // accounts[1] creating 2 offers (Token IDs:36,37)
    for (let test34Counter2 = 36; test34Counter2 <= 37; test34Counter2++) {        
      // args: price in ETH, Token ID, account
      await createOfferAndAssert (test34Counter2, test34Counter2, accounts[1]);            
    }      
    
    // accounts[5] creating 2 offers (Token IDs:1,2)
    for (let test34Counter1 = 1; test34Counter1 <= 2; test34Counter1++) {        
      // args: price in ETH, Token ID, account
      await createOfferAndAssert (test34Counter1, test34Counter1, accounts[5]); 
    }
  
    const offersArray = [38,39,40,41,36,37,1,2];
    await assertAmountOfActiveOffersAndCount(8, offersArray);
  }) 
  
  it('Test 35: accounts[4] should buy back 2 NFTs (Token IDs: 36, 37) from accounts[1], now 6 active offers should exist (Token IDs: 1,2,38,39,40,41)', async () => {  
    for (let buyCountT35 = 36; buyCountT35 <= 37; buyCountT35++) { 

      let largeCountingNrT35 = buyCountT35.toString();
      let t35priceToPayInWEI = web3.utils.toWei(largeCountingNrT35);
      await monkeyMarketplaceHHInstance.buyMonkey(buyCountT35, {from: accounts[4], value: t35priceToPayInWEI});
    }
    const offersArray = [38,39,40,41, 1,2];
    await assertAmountOfActiveOffersAndCount(6, offersArray);

    const account0ArrayToAssert = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    await assertAllFourTrackersCorrect (accounts[0], 0,  account0ArrayToAssert);

    const account1ArrayToAssert = [0, 0, 8, 9, 10, 11, 12, 0, 0];
    await assertAllFourTrackersCorrect (accounts[1], 5,  account1ArrayToAssert);

    const account2ArrayToAssert = [0, 0, 0, 4, 0, 7];
    await assertAllFourTrackersCorrect (accounts[2], 2,  account2ArrayToAssert);

    const account3ArrayToAssert = [0, 0, 13, 0, 0, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 39, 40, 41];
    await assertAllFourTrackersCorrect (accounts[3], 15,  account3ArrayToAssert);
    
    const account4ArrayToAssert = [5, 6, 14, 15, 27, 28, 29, 30, 31, 32, 33, 34, 35, 0, 0, 38, 36, 37];
    await assertAllFourTrackersCorrect (accounts[4], 16,  account4ArrayToAssert);

    const account5ArrayToAssert = [1, 2, 3];
    await assertAllFourTrackersCorrect (accounts[5], 3,  account5ArrayToAssert);
  })     
  
  it('Test 36: accounts[6] (Token IDs 1) and accounts[7] (Token ID 2) should buy from accounts[5], now 4 active offers (Token IDs: 38,39,40,41) ', async () => {  
    await monkeyMarketplaceHHInstance.buyMonkey(1, {from: accounts[6], value: web3.utils.toWei('1')});   
    await monkeyMarketplaceHHInstance.buyMonkey(2, {from: accounts[7], value: web3.utils.toWei('2')});   
    const offersArray = [38,39,40,41];
    await assertAmountOfActiveOffersAndCount(4, offersArray);
    
    const account0ArrayToAssert = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    await assertAllFourTrackersCorrect (accounts[0], 0,  account0ArrayToAssert);

    const account1ArrayToAssert = [0, 0, 8, 9, 10, 11, 12, 0, 0];
    await assertAllFourTrackersCorrect (accounts[1], 5,  account1ArrayToAssert);

    const account2ArrayToAssert = [0, 0, 0, 4, 0, 7];
    await assertAllFourTrackersCorrect (accounts[2], 2,  account2ArrayToAssert);

    const account3ArrayToAssert = [0, 0, 13, 0, 0, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 39, 40, 41];
    await assertAllFourTrackersCorrect (accounts[3], 15,  account3ArrayToAssert);
    
    const account4ArrayToAssert = [5, 6, 14, 15, 27, 28, 29, 30, 31, 32, 33, 34, 35, 0, 0, 38, 36, 37];
    await assertAllFourTrackersCorrect (accounts[4], 16,  account4ArrayToAssert);

    const account5ArrayToAssert = [0, 0, 3];
    await assertAllFourTrackersCorrect (accounts[5], 1,  account5ArrayToAssert);

    const account6ArrayToAssert = [1];
    await assertAllFourTrackersCorrect (accounts[6], 1,  account6ArrayToAssert);

    const account7ArrayToAssert = [2];
    await assertAllFourTrackersCorrect (accounts[7], 1,  account7ArrayToAssert);
  }) 
  
  it('Test 37: accounts[6] creates 1 offer with decimal amount for Token ID 1, which is then bought by accounts[8], now still 4 active offers (Token IDs: 38,39,40,41) ', async () => {  
    // Giving operator status 
    giveMarketOperatorAndAssertAndCount(accounts[6]);   
    await createOfferAndAssert(2.456, 1, accounts[6]);
    await monkeyMarketplaceHHInstance.buyMonkey(1, {from: accounts[8], value: web3.utils.toWei('2.456')});         
    const offersArray = [38,39,40,41];
    await assertAmountOfActiveOffersAndCount(4, offersArray);

    const account0ArrayToAssert = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    await assertAllFourTrackersCorrect (accounts[0], 0,  account0ArrayToAssert);

    const account1ArrayToAssert = [0, 0, 8, 9, 10, 11, 12, 0, 0];
    await assertAllFourTrackersCorrect (accounts[1], 5,  account1ArrayToAssert);

    const account2ArrayToAssert = [0, 0, 0, 4, 0, 7];
    await assertAllFourTrackersCorrect (accounts[2], 2,  account2ArrayToAssert);

    const account3ArrayToAssert = [0, 0, 13, 0, 0, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 39, 40, 41];
    await assertAllFourTrackersCorrect (accounts[3], 15,  account3ArrayToAssert);
    
    const account4ArrayToAssert = [5, 6, 14, 15, 27, 28, 29, 30, 31, 32, 33, 34, 35, 0, 0, 38, 36, 37];
    await assertAllFourTrackersCorrect (accounts[4], 16,  account4ArrayToAssert);

    const account5ArrayToAssert = [0, 0, 3];
    await assertAllFourTrackersCorrect (accounts[5], 1,  account5ArrayToAssert);

    const account6ArrayToAssert = [0];
    await assertAllFourTrackersCorrect (accounts[6], 0,  account6ArrayToAssert);

    const account7ArrayToAssert = [2];
    await assertAllFourTrackersCorrect (accounts[7], 1,  account7ArrayToAssert);

    const account8ArrayToAssert = [1];
    await assertAllFourTrackersCorrect (accounts[8], 1,  account8ArrayToAssert);


  }) 
  
  it('Test 38: accounts[7] creates 1 offer with decimal amount under 1 for Token ID 1, which is then bought by accounts[8], now still 4 active offers (Token IDs: 38,39,40,41) ', async () => {  
    // Giving operator status 
    giveMarketOperatorAndAssertAndCount(accounts[7]);   
    await createOfferAndAssert(0.21, 2, accounts[7]);
    const offersArrayBetween = [38,39,40,41,2];
    await assertAmountOfActiveOffersAndCount(5, offersArrayBetween);
    await monkeyMarketplaceHHInstance.buyMonkey(2, {from: accounts[8], value: web3.utils.toWei('0.21')});  
    // showArrayOfAccount(accounts[8]);  
    const offersArray = [38,39,40,41];
    await assertAmountOfActiveOffersAndCount(4, offersArray);

    const account0ArrayToAssert = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    await assertAllFourTrackersCorrect (accounts[0], 0,  account0ArrayToAssert);

    const account1ArrayToAssert = [0, 0, 8, 9, 10, 11, 12, 0, 0];
    await assertAllFourTrackersCorrect (accounts[1], 5,  account1ArrayToAssert);

    const account2ArrayToAssert = [0, 0, 0, 4, 0, 7];
    await assertAllFourTrackersCorrect (accounts[2], 2,  account2ArrayToAssert);

    const account3ArrayToAssert = [0, 0, 13, 0, 0, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 39, 40, 41];
    await assertAllFourTrackersCorrect (accounts[3], 15,  account3ArrayToAssert);
    
    const account4ArrayToAssert = [5, 6, 14, 15, 27, 28, 29, 30, 31, 32, 33, 34, 35, 0, 0, 38, 36, 37];
    await assertAllFourTrackersCorrect (accounts[4], 16,  account4ArrayToAssert);

    const account5ArrayToAssert = [0, 0, 3];
    await assertAllFourTrackersCorrect (accounts[5], 1,  account5ArrayToAssert);

    const account6ArrayToAssert = [0];
    await assertAllFourTrackersCorrect (accounts[6], 0,  account6ArrayToAssert);

    const account7ArrayToAssert = [0];
    await assertAllFourTrackersCorrect (accounts[7], 0,  account7ArrayToAssert);

    const account8ArrayToAssert = [1, 2];
    await assertAllFourTrackersCorrect (accounts[8], 2,  account8ArrayToAssert);
  }); 

  it('Test 39makeLast: should verify the intergrity between trackers _monkeyIdsAndTheirOwnersMapping and MonkeyIdPositionsMapping for all NFTs', async () => {  
    
    await assertPosIntegrAllNFTs();
  }); 
  

  it('Test 40: should show how many assertions in testing were done', async () => {  

    console.log('During these Hardhat tests, at least', assertionCounter , 'assertions were succesfully proven correct.')


  }); 
  
})*/