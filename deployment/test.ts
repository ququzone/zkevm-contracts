import { ethers } from 'hardhat';
import { create2Deployment } from './helpers/deployment-helpers';
import { PolygonZkEVMDeployer, Create2Deployer } from '../typechain-types';

async function main() {
    // const bridgeV2 = await ethers.deployContract('PolygonZkEVMBridgeV2');
    // await bridgeV2.waitForDeployment();

    // console.log(`deployed contract: ${bridgeV2.target}`);
    const [deployer] = await ethers.getSigners();

    const salt = "0x0000000000000000000000000000000000000000000000000000000000000000";

    // const Create2Factory = await ethers.getContractFactory("Create2Deployer", deployer);
    // const create2 = await ethers.deployContract("Create2Deployer");
    // await create2.waitForDeployment();
    // console.log(`create2: ${create2.target}`);
    // const create2Contract = Create2Factory.attach(create2.target) as Create2Deployer;

    // const polygonZkEVMBridgeFactory = await ethers.getContractFactory("PolygonZkEVMBridgeV2", deployer);
    // const deployTransactionBridge = (await polygonZkEVMBridgeFactory.getDeployTransaction()).data;

    // const tx = await create2Contract.deploy2(0, salt, deployTransactionBridge);
    // await tx.wait();
    // console.log(tx.hash);




    const PolgonZKEVMDeployerFactory = await ethers.getContractFactory("PolygonZkEVMDeployer", deployer);

    const deployTxZKEVMDeployer = await ethers.deployContract("PolygonZkEVMDeployer", [deployer.address]);
    await deployTxZKEVMDeployer.waitForDeployment();
    const zkEVMDeployerContract = PolgonZKEVMDeployerFactory.attach(deployTxZKEVMDeployer.target) as PolygonZkEVMDeployer;

    console.log(`deployTxZKEVMDeployer: ${deployTxZKEVMDeployer.target}`);

    // Deploy implementation PolygonZkEVMBridge
    const polygonZkEVMBridgeFactory = await ethers.getContractFactory("PolygonZkEVMBridgeV2", deployer);
    const deployTransactionBridge = (await polygonZkEVMBridgeFactory.getDeployTransaction()).data;
    const dataCallNull = null;
    // Mandatory to override the gasLimit since the estimation with create are mess up D:
    const overrideGasLimit = 5500000n;
    const [bridgeImplementationAddress, isBridgeImplDeployed] = await create2Deployment(
        zkEVMDeployerContract,
        salt,
        deployTransactionBridge,
        dataCallNull,
        deployer,
        null
    );

    console.log(`bridgeImplementationAddress: ${bridgeImplementationAddress}`);
    console.log(`isBridgeImplDeployed: ${isBridgeImplDeployed}`);

    // const dataCallProxy = polygonZkEVMBridgeContract.interface.encodeFunctionData("initialize", [
    //     networkIDMainnet,
    //     gasTokenAddressMainnet,
    //     gasTokenNetworkMainnet,
    //     precalculateGlobalExitRootAddress,
    //     precalculateRollupManager,
    //     gasTokenMetadata,
    // ]);

    // console.log(`deployer: ${deployer.address}`)
    // const [proxyBridgeAddress, isBridgeProxyDeployed] = await create2Deployment(
    //     zkEVMDeployerContract,
    //     salt,
    //     deployTransactionProxy,
    //     dataCallProxy,
    //     deployer
    // );
    // const polygonZkEVMBridgeContract = polygonZkEVMBridgeFactory.attach(proxyBridgeAddress) as PolygonZkEVMBridgeV2;

}

main().catch(err => {
    console.error(err);
    process.exitCode = 1;
});
