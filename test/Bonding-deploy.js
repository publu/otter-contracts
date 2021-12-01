const { ethers } = require('hardhat')
const { BigNumber } = require('@ethersproject/bignumber')
const { formatUnits, formatEther, parseEther } = require('@ethersproject/units')

function options() {
  return { };
}

async function main() {
  parseEther('500');
  const largeApproval = '100000000000000000000000000000000'

  // What epoch will be first epoch
  const firstEpochNumber = '0'

  // How many seconds are in each epoch
  const epochLength = 86400 / 3

  // Ethereum 0 address, used when toggling changes in treasury
  const zeroAddress = '0x0000000000000000000000000000000000000000'

  // Initial staking index
  const initialIndex = '1000000000'

  let // Used as default deployer for contracts, asks as owner of contracts.
    // Used as the default user for deposits and trade. Intended to be the default regular user.
    daiBond;

  const qi = await ethers.getContractAt(
    'OtterClamERC20',
    '0x580a84c73811e1839f75d86d75d88cca0c241ff4'
  );

  const dai = await ethers.getContractAt(
    'OtterClamERC20',
    '0xe7519be0e2a4450815858343ca480d1939be7281'
  );// but actually qi/dai lp, decimals matter

/*
  daiBond = await ethers.getContractAt(
    'BondDepository',
    '0x55af93a17d6628b83ba7153dec60553ebbac02b0'
  );
*/
  console.log("qi.address: ", qi.address);

  const BondingCalcContract = await ethers.getContractFactory(
    'BondingCalculator'
  )

  const bondingCalc = await BondingCalcContract.deploy(
      qi.address,
      options()
    )

  await bondingCalc.deployed();

  const treasury = "0xe00eaa2787a8830a485153b7bf508bc781e4a220";

  const DAIBond = await ethers.getContractFactory('BondDepository')

  console.log(
    "DAIBond.deploy(",
      qi.address,",",
      dai.address,",",
      treasury,",",
      bondingCalc.address,
    ")"
  );

  daiBond = await DAIBond.deploy(
      qi.address,
      dai.address,
      treasury,
      bondingCalc.address, // change this to bondingCalc only if u need it!
      options()
    )

  await daiBond.deployed()

  await (await daiBond.setMaxPayout("80000000000000000000000000000", options())).wait();
  console.log("b4 approval");
  await (await qi.approve(daiBond.address, "10000000000000000000000000000000", options())).wait();

  console.log("before fund")
  const funding = await qi.balanceOf("0xe00eaa2787a8830a485153b7bf508bc781e4a220");
  
  console.log(funding.toString());

  await (await daiBond.fund("1000000000000000000", options())).wait(5);
  await (await dai.approve(daiBond.address, largeApproval, options())).wait();

  console.log("funded.")

  await (await daiBond.initializeBondTerms(
      '15', // bcv
      '10', // vesting length
      '35', // min price
      '10000', // max bond payout 
      '8000000000000000', // max bond debt
      '0', // initial debt 0 qi
      options()
    )).wait()
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });