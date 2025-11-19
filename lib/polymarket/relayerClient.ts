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

