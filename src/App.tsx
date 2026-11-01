import { useState } from 'react'
import { createPublicClient, http, isAddress, formatEther } from 'viem'
import { mainnet, base } from 'viem/chains'
import './App.css'

function App() {
  const [address, setAddress] = useState('')
  const [network, setNetwork] = useState('Base')
  const [result, setResult] = useState('')
  const [balance, setBalance] = useState('')
  const [checkedAddress, setCheckedAddress] = useState('')
  const [loading, setLoading] = useState(false)
const [multiBalances, setMultiBalances] = useState<{
  ethereum: string
  base: string
} | null>(null)

const [transactions, setTransactions] = useState<{
  ethereum: any[]
  base: any[]
}>({
  ethereum: [],
  base: [],
})

const [tokens, setTokens] = useState<{
  base: {
    name: string
    symbol: string
    contractAddress: string
    decimals: number
    balance: string
    network: string
  }[]
}>({
  base: [],
})
const [selectedNetwork, setSelectedNetwork] = useState('All')

const [tokenLoading, setTokenLoading] = useState(false)
const [tokenError, setTokenError] = useState('')

  const [transactionLoading,setTransactionLoading] = useState(false)
const [transactionPage, setTransactionPage] = useState(1)
const [hasMoreTransactions, setHasMoreTransactions] = useState(false)
  const [networkIds, setNetworkIds] = useState<{
  ethereum: number | null
  base: number | null
}>({
  ethereum: null,
  base: null,
})
const [transactionErrors, setTransactionErrors] = useState<{
  ethereum: string | null
  base: string | null
}>({
  ethereum: null,
  base: null,
})
const [networkStatus, setNetworkStatus] = useState<{
  ethereum: string
  base: string
}>({
  ethereum: 'Not checked',
  base: 'Not checked',
})
  async function checkWallet() {
    if (!isAddress(address)) {
      setResult('Alamat wallet tidak valid.')
      setBalance('')
      return
    }

    setLoading(true)
    setResult('Mengambil data blockchain...')
    setBalance('')

    try {
      const chain = network === 'Base' ? base : mainnet
      const client = createPublicClient({
        chain,
        transport: http(),
      })

      const value = await client.getBalance({
        address: address as `0x${string}`,
      })

      setBalance(formatEther(value))
      setCheckedAddress(address)
      setResult('Data berhasil dibaca dari blockchain.')
    } catch {
      setResult('Gagal mengambil data. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }
 async function checkBothNetworks() {
  if (!isAddress(address)) {
    setResult('Alamat wallet tidak valid.')
    return
  }

  setLoading(true)
  setResult('Checking Ethereum and Base...')

  try {
    const ethereumClient = createPublicClient({
      chain: mainnet,
      transport: http(),
    })

    const baseClient = createPublicClient({
      chain: base,
      transport: http(),
    })

    const [ethereumChainId, baseChainId] = await Promise.all([
      ethereumClient.getChainId(),
      baseClient.getChainId(),
    ])

    setNetworkIds({
      ethereum: ethereumChainId,
      base: baseChainId,
    })

    setNetworkStatus({
      ethereum: ethereumChainId === 1 ? 'Connected' : 'Error',
      base: baseChainId === 8453 ? 'Connected' : 'Error',
    })

    if (ethereumChainId !== 1 || baseChainId !== 8453) {
      throw new Error('Network verification failed')
    }

    const [ethBalance, baseBalance] = await Promise.all([
      ethereumClient.getBalance({
        address: address as `0x${string}`,
      }),
      baseClient.getBalance({
        address: address as `0x${string}`,
      }),
    ])

    setMultiBalances({
      ethereum: formatEther(ethBalance),
      base: formatEther(baseBalance),
    })

    setResult('Both networks checked successfully.')
  } catch (error) {
    console.error('Network check error:', error)
    setResult('Unable to read one or both networks.')
  } finally {
    setLoading(false)
  }
}

async function fetchTransactions(loadMore = false) {
  if (!isAddress(address)) {
    setResult('Alamat wallet tidak valid.')
    return
  }

  const page = loadMore ? transactionPage + 1 : 1

  setTransactionLoading(true)

  try {
    const response = await fetch(
      `http://localhost:3001/api/transactions?address=${encodeURIComponent(address)}&page=${page}`
    )

    const data = await response.json()
    console.log('Transaction API:', data)

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch transactions')
    }

  const ethereum = data.ethereum || []
const base = data.base || []

setTransactionErrors({
  ethereum: data.errors?.ethereum || null,
  base: data.errors?.base || null,
})
   setTransactions((previous) => ({
  ethereum: loadMore
    ? [...previous.ethereum, ...ethereum]
    : ethereum,

  base: loadMore
    ? previous.base
    : base,
}))

    setTransactionPage(page)

   setHasMoreTransactions(ethereum.length === 10)

    setResult('Transaction history loaded successfully.')
  } catch (error) {
    console.error('Transaction error:', error)
    setResult('Unable to load transaction history.')
  } finally {
    setTransactionLoading(false)
  }
}

async function fetchTokens() {
  if (!isAddress(address)) {
    setResult('Alamat wallet tidak valid.')
    return
  }

  setTokenLoading(true)
  setTokenError('')

  try {
    const response = await fetch(
      `http://localhost:3001/api/tokens?address=${encodeURIComponent(address)}`
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch tokens')
    }

    setTokens({
      base: data.tokens || [],
    })

    setResult('Token portfolio loaded successfully.')
  } catch (error) {
    console.error('Token API error:', error)

    setTokenError(
      error instanceof Error
        ? error.message
        : 'Unable to load tokens.'
    )
  } finally {
    setTokenLoading(false)
  }
}
const filteredTokens = tokens.base.filter((token) => {
  if (selectedNetwork === 'All') return true
  return token.network === selectedNetwork
})

 return (
  <main className="dashboard">
    <header className="topbar">
      <div className="brand">
        <div className="brand-icon">N</div>
        <span>NEXORA</span>
      </div>
      <span className="status">● EARLY DEVELOPMENT</span>
    </header>

<section className="hero">
  <p className="nexora-title">NEXORA</p>

  <p className="eyebrow">
    INDEPENDENT MULTI-CHAIN PROTOCOL
  </p>

  <h1>
    One Identity.<br />
    <span>Multiple Chains.</span>
  </h1>

  <p className="intro">
    A unified identity experience for an interconnected blockchain ecosystem.
  </p>
</section>

    <section className="panel wallet-panel">
      <span className="number">01 / IDENTITY LAYER</span>
      <h2>Wallet Identity</h2>
      <p>Explore public wallet information across supported networks.</p>

      <input
        className="wallet-input"
        value={address}
        onChange={(event) => setAddress(event.target.value)}
        placeholder="Enter public wallet address (0x...)"
      />

      <select
        className="wallet-input"
        value={network}
        onChange={(event) => setNetwork(event.target.value)}
      >
        <option value="Base">Base Network</option>
        <option value="Ethereum">Ethereum Mainnet</option>
      </select>

      <button className="connect" onClick={checkWallet} disabled={loading}>
        {loading ? 'Checking...' : 'Check Wallet'}
      </button>

      <button className="multi-button" onClick={checkBothNetworks} disabled={loading}>
        Check Both Networks
      </button>

      <button
        className="multi-button"
        onClick={() => fetchTransactions(false)}
        disabled={transactionLoading}
      >
        {transactionLoading ? 'Loading...' : 'Load Transactions'}
      </button>

<button
  className="multi-button"
  onClick={fetchTokens}
  disabled={tokenLoading}
>
  {tokenLoading ? 'Loading Tokens...' : 'Load Token Portfolio'}
</button>

      {result && <p className="result">{result}</p>}

      {multiBalances && (
        <div className="multi-balance-grid">
          <div className="balance-card">
            <div className="chain-name">Ethereum</div>
            <div className="chain-id">
              Chain ID: {networkIds.ethereum ?? '-'}
            </div>
            <div className="chain-symbol">ETH</div>
            <div className="chain-balance">{multiBalances.ethereum}</div>
            <div className="chain-status">{networkStatus.ethereum}</div>
          </div>

          <div className="balance-card">
            <div className="chain-name">Base</div>
            <div className="chain-id">
              Chain ID: {networkIds.base ?? '-'}
            </div>
            <div className="chain-symbol">ETH</div>
            <div className="chain-balance">{multiBalances.base}</div>
            <div className="chain-status">{networkStatus.base}</div>
            <a
              href={`https://basescan.org/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="explorer-link"
            >
              View on BaseScan ↗
            </a>
          </div>
        </div>
      )}

      {balance !== '' && (
        <div className="identity-card">
          <div className="identity-heading">
            <span>WALLET PROFILE</span>
            <span className="verified">● DATA READ</span>
          </div>
          <p className="address">{checkedAddress}</p>
          <div className="balance-row">
            <div>
              <span className="muted">NETWORK</span>
              <h3>{network}</h3>
            </div>
            <div>
              <span className="muted">NATIVE BALANCE</span>
              <h3>{Number(balance).toFixed(6)} ETH</h3>
            </div>
          </div>
        </div>
      )}

      <p className="note">
        Read-only prototype. Never enter your seed phrase or private key.
      </p>
    </section>
    


<section className="portfolio-dashboard">
  <div className="portfolio-heading">
    <div>
      <span className="portfolio-eyebrow">NEXORA / ASSETS</span>
      <h2>My Portfolio</h2>
      <p>Multi-chain digital asset overview</p>
    </div>
    <div className="portfolio-live">
      <span className="live-dot"></span>
      Wallet Connected
    </div>
  </div>

  {tokenError && (
    <p className="result">API Error: {tokenError}</p>
  )}

  <div className="portfolio-overview">
    <div className="overview-card overview-primary">
      <span>Total Assets</span>
      <strong>{tokens.base.length}</strong>
      <small>Tokens detected across networks</small>
    </div>

    <div className="overview-card">
      <span>Ethereum Assets</span>
      <strong>
        {tokens.base.filter(
          (token) => token.network === 'Ethereum'
        ).length}
      </strong>
      <small>Ethereum Mainnet</small>
    </div>

    <div className="overview-card">
      <span>Base Assets</span>
      <strong>
        {tokens.base.filter(
          (token) => token.network === 'Base'
        ).length}
      </strong>
      <small>Base Mainnet</small>
    </div>
  </div>

  <div className="network-overview">
    <div className="network-heading">
      <div>
        <h3>Network Overview</h3>
        <p>Your assets across supported chains</p>
      </div>
      <span>{new Set(tokens.base.map((token) => token.network)).size} Networks</span>
    </div>

    <div className="network-cards">
  <button
    type="button"
    className={`network-card ${selectedNetwork === 'Ethereum' ? 'active-network' : ''}`}
    onClick={() =>
      setSelectedNetwork(
        selectedNetwork === 'Ethereum' ? 'All' : 'Ethereum'
      )
    }
  >
    <div className="network-icon ethereum-icon">Ξ</div>
    <div>
      <strong>Ethereum</strong>
      <small>
        {tokens.base.filter(
          (token) => token.network === 'Ethereum'
        ).length} tokens
      </small>
    </div>
  </button>

  <button
    type="button"
    className={`network-card ${selectedNetwork === 'Base' ? 'active-network' : ''}`}
    onClick={() =>
      setSelectedNetwork(
        selectedNetwork === 'Base' ? 'All' : 'Base'
      )
    }
  >
    <div className="network-icon base-icon">B</div>
    <div>
      <strong>Base</strong>
      <small>
        {tokens.base.filter(
          (token) => token.network === 'Base'
        ).length} tokens
      </small>
    </div>
  </button>
</div>
</div>

  <div className="holdings-panel">
    <div className="holdings-heading">
      <div>
        <h3>Asset Holdings</h3>
        <p>All detected ERC-20 assets</p>
      </div>
      <span className="holdings-count">
{filteredTokens.length} Assets
      </span>
    </div>

{filteredTokens.length === 0 ? (
      <p>No assets available. Load your token portfolio.</p>
    ) : (
      <div className="portfolio-table-wrapper">
        <table className="portfolio-table">
          <thead>
            <tr>
              <th>Asset</th>
              <th>Network</th>
              <th>Balance</th>
              <th>Price</th>
              <th>Total Value</th>
              <th>Explorer</th>
            </tr>
          </thead>

          <tbody>
{filteredTokens.map((token) => (
              <tr key={`${token.network}-${token.contractAddress}`}>
                <td>
                  <strong>{token.name}</strong>
                  <small className="contract-address">
                    {token.symbol} · {token.contractAddress.slice(0, 8)}...
                  </small>
                </td>

                <td>
                  <span className={`network-badge ${
                    token.network === 'Ethereum'
                      ? 'ethereum-badge'
                      : 'base-badge'
                  }`}>
                    {token.network}
                  </span>
                </td>

                <td>
                  <strong>
                    {Number(token.balance).toLocaleString('en-US', {
                      maximumFractionDigits: 6
                    })}
                  </strong>
                </td>

                <td>—</td>
                <td>—</td>

                <td>
                  <a
                    href={
                      token.network === 'Ethereum'
                        ? `https://etherscan.io/token/${token.contractAddress}`
                        : `https://basescan.org/token/${token.contractAddress}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="explorer-link"
                  >
                    Explorer ↗
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
</section>



<section className="transactions-panel">
  <h2>Recent Transactions</h2>
  <p>Latest wallet activity across supported networks.</p>

  {(['ethereum', 'base'] as const).map((chain) => (
    <div key={chain} className="transaction-chain">
      <h3>{chain === 'ethereum' ? 'Ethereum' : 'Base'}</h3>

      {transactionErrors[chain] && (
        <p className="result">
          API Error: {transactionErrors[chain]}
        </p>
      )}

      {transactions[chain].length === 0 ? (
        <p>No transactions available.</p>
      ) : (
        transactions[chain].map((tx) => {
          const outgoing =
            tx.from.toLowerCase() === address.toLowerCase()

          const txValue = BigInt(tx.value || '0')
          const noEthTransferred = txValue === 0n

          return (
            <div className="transaction-item" key={tx.hash}>
              <div>
               <strong>
  {noEthTransferred
    ?'Contract Interaction'
    : outgoing
      ? 'Sent'
      : 'Received'}
</strong>

                <p>
                  <a
                    href={
                      chain === 'ethereum'
                        ? `https://etherscan.io/tx/${tx.hash}`
                        : `https://basescan.org/tx/${tx.hash}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="explorer-link"
                  >
                    {tx.hash.slice(0, 10)}...{tx.hash.slice(-6)} ↗
                  </a>
                </p>

                <small>
                  {new Date(
                    Number(tx.timeStamp) * 1000
                  ).toLocaleString()}
                </small>
              </div>

              <div>
                <strong>
                  {noEthTransferred
                    ? 'No ETH transferred'
                    : `${outgoing ? '-' : '+'}${Number(
                        formatEther(txValue)
                      ).toFixed(6)} ETH`}
                </strong>

                <p>
                  {tx.isError === '0' ? 'Success' : 'Failed'}
                </p>
              </div>
            </div>
          )
        })
      )}
    </div>
  ))}

  {hasMoreTransactions && (
    <button
      className="multi-button"
      onClick={() => fetchTransactions(true)}
      disabled={transactionLoading}
    >
      {transactionLoading ? 'Loading...' : 'Load More'}
    </button>
  )}
    </section>
  </main>
  )
}

export default App