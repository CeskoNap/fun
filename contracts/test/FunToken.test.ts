import { expect } from "chai";
import { ethers } from "hardhat";
import { FunToken } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("FunToken", function () {
  let funToken: FunToken;
  let owner: SignerWithAddress;
  let minter: SignerWithAddress;
  let user: SignerWithAddress;

  const INITIAL_SUPPLY = ethers.parseUnits("1000000000", 8); // 1 billion FUN

  beforeEach(async function () {
    [owner, minter, user] = await ethers.getSigners();

    const FunTokenFactory = await ethers.getContractFactory("FunToken");
    funToken = await FunTokenFactory.deploy(owner.address);
    await funToken.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should have correct name and symbol", async function () {
      expect(await funToken.name()).to.equal("Fun");
      expect(await funToken.symbol()).to.equal("FUN");
    });

    it("Should have 8 decimals", async function () {
      expect(await funToken.decimals()).to.equal(8);
    });

    it("Should mint initial supply to owner", async function () {
      expect(await funToken.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY);
      expect(await funToken.totalSupply()).to.equal(INITIAL_SUPPLY);
    });

    it("Should set owner as admin, minter, and burner", async function () {
      expect(await funToken.hasRole(await funToken.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
      expect(await funToken.hasRole(await funToken.MINTER_ROLE(), owner.address)).to.be.true;
      expect(await funToken.hasRole(await funToken.BURNER_ROLE(), owner.address)).to.be.true;
    });
  });

  describe("Minting", function () {
    it("Should allow owner to mint tokens", async function () {
      const amount = ethers.parseUnits("1000", 8);
      await funToken.connect(owner).mint(user.address, amount);
      expect(await funToken.balanceOf(user.address)).to.equal(amount);
    });

    it("Should allow minter role to mint tokens", async function () {
      await funToken.connect(owner).grantMinterRole(minter.address);
      const amount = ethers.parseUnits("500", 8);
      await funToken.connect(minter).mint(user.address, amount);
      expect(await funToken.balanceOf(user.address)).to.equal(amount);
    });

    it("Should not allow non-minter to mint", async function () {
      const amount = ethers.parseUnits("1000", 8);
      await expect(
        funToken.connect(user).mint(user.address, amount)
      ).to.be.revertedWithCustomError(funToken, "AccessControlUnauthorizedAccount");
    });

    it("Should allow batch minting", async function () {
      const recipients = [user.address, minter.address];
      const amounts = [
        ethers.parseUnits("1000", 8),
        ethers.parseUnits("2000", 8),
      ];
      
      await funToken.connect(owner).batchMint(recipients, amounts);
      expect(await funToken.balanceOf(user.address)).to.equal(amounts[0]);
      expect(await funToken.balanceOf(minter.address)).to.equal(amounts[1]);
    });
  });

  describe("Burning", function () {
    it("Should allow owner to burn tokens", async function () {
      const burnAmount = ethers.parseUnits("1000", 8);
      const initialBalance = await funToken.balanceOf(owner.address);
      
      await funToken.connect(owner).burn(burnAmount);
      expect(await funToken.balanceOf(owner.address)).to.equal(initialBalance - burnAmount);
    });

    it("Should allow any user to burn their own tokens", async function () {
      const mintAmount = ethers.parseUnits("1000", 8);
      await funToken.connect(owner).mint(user.address, mintAmount);
      
      const burnAmount = ethers.parseUnits("500", 8);
      await funToken.connect(user).burn(burnAmount);
      expect(await funToken.balanceOf(user.address)).to.equal(mintAmount - burnAmount);
    });
  });

  describe("Role Management", function () {
    it("Should allow admin to grant minter role", async function () {
      await funToken.connect(owner).grantMinterRole(minter.address);
      expect(await funToken.hasRole(await funToken.MINTER_ROLE(), minter.address)).to.be.true;
    });

    it("Should allow admin to revoke minter role", async function () {
      await funToken.connect(owner).grantMinterRole(minter.address);
      await funToken.connect(owner).revokeMinterRole(minter.address);
      expect(await funToken.hasRole(await funToken.MINTER_ROLE(), minter.address)).to.be.false;
    });
  });

  describe("Transfers", function () {
    it("Should allow standard ERC-20 transfers", async function () {
      const transferAmount = ethers.parseUnits("1000", 8);
      await funToken.connect(owner).transfer(user.address, transferAmount);
      expect(await funToken.balanceOf(user.address)).to.equal(transferAmount);
    });
  });
});

