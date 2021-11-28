const { ethers, timeAndMine } = require('hardhat')
const { expect } = require('chai')
const { BigNumber } = require('@ethersproject/bignumber')
const { formatUnits, formatEther } = require('@ethersproject/units')

describe('Bonding', () => {
  // Large number for approval for DAI
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
    deployer,
    // Used as the default user for deposits and trade. Intended to be the default regular user.
    depositor,
    clam,
    dai,
    daiBond,
    firstEpochTime

  beforeEach(async () => {
    ;[deployer, depositor] = await ethers.getSigners()

    firstEpochTime = (await deployer.provider.getBlock()).timestamp - 100

    const clam = await ethers.getContractAt(
      'OtterClamERC20',
      '0x580a84c73811e1839f75d86d75d88cca0c241ff4'
    );

    const dai = await ethers.getContractAt(
      'OtterClamERC20',
      '0x9A8b2601760814019B7E6eE0052E25f1C623D1E6'
    );// but actually qi/matic lp

    console.log("clam.address: ", clam.address);

    const BondingCalcContract = await ethers.getContractFactory(
      'BondingCalculator'
    )

    const bondingCalc = await BondingCalcContract.deploy(
      clam.address
    )

    const treasury = "0xD4FfFD3814D09c583D79Ee501D17F6F146aeFAC2";

    const DAIBond = await ethers.getContractFactory('BondDepository')

    console.log(
      "DAIBond.deploy(",
        clam.address,",",
        dai.address,",",
        treasury,",",
        bondingCalc.address,
      ")"
    );

    daiBond = await DAIBond.deploy(
      clam.address,
      dai.address,
      treasury,
      zeroAddress // change this to bondingCalc only if u need it!
    )

    await daiBond.setMaxPayout("8000000000000000");
    console.log("b4 approval");

    await dai.approve(daiBond.address, largeApproval)
  })

  describe('adjust', () => {
    it('should able to adjust with bcv <= 40', async () => {
      const bcv = 38
      const bondVestingLength = 10
      const minBondPrice = 400 // bond price = $4
      const maxBondPayout = 1000 // 1000 = 1% of CLAM total supply
      const maxBondDebt = '8000000000000000'
      const initialBondDebt = 0
      await daiBond.initializeBondTerms(
        bcv,
        bondVestingLength,
        minBondPrice,
        maxBondPayout, // Max bond payout,
        maxBondDebt,
        initialBondDebt
      )

      await daiBond.setAdjustment(true, 1, 50, 0)
      const adjustment = await daiBond.adjustment()
      expect(adjustment[0]).to.be.true
      expect(adjustment[1]).to.eq(1)
      expect(adjustment[2]).to.eq(50)
      expect(adjustment[3]).to.eq(0)
    })

    it('should failed to adjust with too large increment', async () => {
      const bcv = 100
      const bondVestingLength = 10
      const minBondPrice = 400 // bond price = $4
      const maxBondPayout = 1000 // 1000 = 1% of CLAM total supply
      const maxBondDebt = '8000000000000000'
      const initialBondDebt = 0
      await daiBond.initializeBondTerms(
        bcv,
        bondVestingLength,
        minBondPrice,
        maxBondPayout, // Max bond payout,
        maxBondDebt,
        initialBondDebt
      )

      await expect(daiBond.setAdjustment(true, 3, 50, 0)).to.be.revertedWith(
        'Increment too large'
      )
    })

    it('should be able to adjust with normal increment', async () => {
      const bcv = 100
      const bondVestingLength = 10
      const minBondPrice = 400 // bond price = $4
      const maxBondPayout = 1000 // 1000 = 1% of CLAM total supply
      const maxBondDebt = '8000000000000000'
      const initialBondDebt = 0
      await daiBond.initializeBondTerms(
        bcv,
        bondVestingLength,
        minBondPrice,
        maxBondPayout, // Max bond payout,
        maxBondDebt,
        initialBondDebt
      )

      await daiBond.setAdjustment(false, 2, 80, 3)
      const adjustment = await daiBond.adjustment()
      expect(adjustment[0]).to.be.false
      expect(adjustment[1]).to.eq(2)
      expect(adjustment[2]).to.eq(80)
      expect(adjustment[3]).to.eq(3)
    })
  })

  describe('deposit', () => {
    it('should get vested fully', async () => {

      const bcv = 300
      const bondVestingLength = 10
      const minBondPrice = 400 // bond price = $4
      const maxBondPayout = 1000 // 1000 = 1% of CLAM total supply
      const maxBondDebt = '8000000000000000'
      const initialBondDebt = 0
      await daiBond.initializeBondTerms(
        bcv,
        bondVestingLength,
        minBondPrice,
        maxBondPayout, // Max bond payout,
        maxBondDebt,
        initialBondDebt
      )

      let bondPrice = await daiBond.bondPriceInUSD()
      console.log('bond price: ' + formatEther(bondPrice))

      let depositAmount = BigNumber.from(100).mul(BigNumber.from(10).pow(18))
      await daiBond.deposit(depositAmount, largeApproval, deployer.address)

      await timeAndMine.setTimeIncrease(2)

      await expect(() =>
        daiBond.redeem(deployer.address)
      ).to.changeTokenBalance(
        clam,
        deployer,
        BigNumber.from(5).mul(BigNumber.from(10).pow(9))
      )

      // bond 2nd times
      bondPrice = await daiBond.bondPriceInUSD()
      console.log('bond price: ' + formatEther(bondPrice))

      depositAmount = BigNumber.from(100).mul(BigNumber.from(10).pow(18))

      await daiBond.deposit(depositAmount, largeApproval, deployer.address)

      await timeAndMine.setTimeIncrease(20)
      await expect(() =>
        daiBond.redeem(deployer.address)
      ).to.changeTokenBalance(clam, deployer, '30834236186')
    })

    it('should get vested partially', async () => {

      const bcv = 300
      const bondVestingLength = 10
      const minBondPrice = 400 // bond price = $4
      const maxBondPayout = 1000 // 1000 = 1% of CLAM total supply
      const maxBondDebt = '8000000000000000'
      const initialBondDebt = 0
      await daiBond.initializeBondTerms(
        bcv,
        bondVestingLength,
        minBondPrice,
        maxBondPayout, // Max bond payout,
        maxBondDebt,
        initialBondDebt
      )

      const bondPrice = await daiBond.bondPriceInUSD()

      const depositAmount = BigNumber.from(100).mul(BigNumber.from(10).pow(18))
      const totalClam = depositAmount
        .div(bondPrice)
        .mul(BigNumber.from(10).pow(9))
      await daiBond.deposit(depositAmount, largeApproval, deployer.address)

      // vested 20%
      await timeAndMine.setTimeIncrease(2)
      await expect(() =>
        daiBond.redeem(deployer.address)
      ).to.changeTokenBalance(clam, deployer, totalClam.div(5))

      // fully vested, get rest 80%
      await timeAndMine.setTimeIncrease(10)
      await expect(() =>
        daiBond.redeem(deployer.address)
      ).to.changeTokenBalance(clam, deployer, totalClam - totalClam.div(5))
    })

    it('should staked directly', async () => {

      const bcv = 300
      const bondVestingLength = 10
      const minBondPrice = 400 // bond price = $4
      const maxBondPayout = 1000 // 1000 = 1% of CLAM total supply
      const maxBondDebt = '8000000000000000'
      const initialBondDebt = 0
      await daiBond.initializeBondTerms(
        bcv,
        bondVestingLength,
        minBondPrice,
        maxBondPayout, // Max bond payout,
        maxBondDebt,
        initialBondDebt
      )

      let bondPrice = await daiBond.bondPriceInUSD()
      console.log('bond price: ' + formatEther(bondPrice))

      let depositAmount = BigNumber.from(100).mul(BigNumber.from(10).pow(18))
      await daiBond.deposit(depositAmount, largeApproval, deployer.address)

      await timeAndMine.setTimeIncrease(2)

      await daiBond.redeem(deployer.address)
    })
  })
})
