// 4. Execute Transactions
// We use 'execute' which should exist on the client
// We pass the transactions array which should contain the User's signature in the 'signatures' field
const response = await client.execute(transactions, metadata);

console.log('[Relayer Proxy] Transaction submitted. Waiting for confirmation...');
const result = await response.wait();

console.log('[Relayer Proxy] Transaction confirmed:', result);

return NextResponse.json({
    transactionHash: result?.transactionHash,
    state: result?.state,
    result: result
});

    } catch (error: any) {
    console.error('[Relayer Proxy] Error:', error);
    return NextResponse.json(
        { error: error.message || 'Relayer request failed' },
        { status: 500 }
    );
}
}
