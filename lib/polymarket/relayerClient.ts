/**
 * Polymarket Builder Relayer Client Integration
 * 
 * Per Polymarket docs: https://docs.polymarket.com/developers/builders/relayer-client
 * 
 * The Relayer Client allows builders to:
 * - Execute gasless transactions (Polymarket pays gas fees)
      RELAYER_URL,
      POLYGON_CHAIN_ID,
      signer,
      builderConfig
    );

    console.log('Relayer client initialized successfully with config:', {
      hasRemote: !!builderConfig.remoteBuilderConfig,
      remoteUrl: builderConfig.remoteBuilderConfig?.url,
      hasLocal: !!builderConfig.localBuilderCreds
    });

    return client;
  } catch (error) {
    console.error('Error initializing relayer client:', error);
    return null;
  }
}

/**
 * Deploy Safe Wallet for user via Polymarket Relayer
 * Per Polymarket docs: Polymarket pays for all gas fees
 * 
 * @param walletClient - Wagmi wallet client
 * @returns The deployed Safe Wallet address
 */
export async function deploySafeWalletViaRelayer(
  walletClient: WalletClient
): Promise<string> {
  const relayerClient = await initializeRelayerClient(walletClient);

  if (!relayerClient) {
    throw new Error('Relayer client not available. Builder credentials required.');
  }

  try {
    console.log('Deploying Safe Wallet via Polymarket Relayer...');

    // Per Polymarket docs: deploySafe() deploys a Safe wallet, Polymarket pays gas
    // https://docs.polymarket.com/developers/builders/relayer-client#deploying-safe-wallets
    const response = await relayerClient.deploySafe();
    const result = await response.wait();

    if (result && result.proxyAddress) {
      console.log('Safe Wallet deployed successfully:', {
        transactionHash: result.transactionHash,
        safeAddress: result.proxyAddress,
      });
      return result.proxyAddress;
    } else {
      throw new Error('Safe deployment failed');
    }
  } catch (error) {
    console.error('Error deploying Safe Wallet:', error);
    throw error;
  }
}

/**
 * Set token approval via Polymarket Relayer (gasless)
 * Per Polymarket docs: Execute token approvals without user paying gas
 * 
 * @param walletClient - Wagmi wallet client
 * @param tokenAddress - Token address (e.g., USDC)
 * @param spenderAddress - Address to approve (e.g., CLOB contract or CTF)
 * @param amount - Approval amount (use MaxUint256 for unlimited)
 */
export async function approveTokenViaRelayer(
  walletClient: WalletClient,
  tokenAddress: string,
  spenderAddress: string,
  amount: bigint = BigInt(ethers.constants.MaxUint256.toString())
): Promise<string> {
  const relayerClient = await initializeRelayerClient(walletClient);

  if (!relayerClient) {
    throw new Error('Relayer client not available. Builder credentials required.');
  }

  try {
    // Per Polymarket docs: Create approval transaction
    const erc20Interface = new ethers.utils.Interface([
      {
        constant: false,
        inputs: [
          { name: '_spender', type: 'address' },
          { name: '_value', type: 'uint256' },
        ],
        name: 'approve',
        outputs: [{ name: '', type: 'bool' }],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function',
      },
    ]);

    const approvalData = erc20Interface.encodeFunctionData('approve', [
      spenderAddress,
      amount.toString(),
    ]);

    // Per Polymarket docs: Execute Safe transaction via relayer
    // Using our own type definitions (per Polymarket docs interface)
    const approvalTx: SafeTransaction = {
      to: tokenAddress,
      operation: OperationType.Call, // OperationType.Call = 0
      data: approvalData,
      value: '0',
    };

    console.log('Executing token approval via relayer:', {
      token: tokenAddress,
      spender: spenderAddress,
      amount: amount.toString(),
    });

    const response = await relayerClient.executeSafeTransactions(
      [approvalTx],
      `Approve ${tokenAddress} for ${spenderAddress}`
    );

    const result = await response.wait();

    if (result && result.transactionHash) {
      console.log('Token approval completed:', result.transactionHash);
      return result.transactionHash;
    } else {
      throw new Error('Token approval failed');
    }
  } catch (error) {
    console.error('Error approving token via relayer:', error);
    throw error;
  }
}

