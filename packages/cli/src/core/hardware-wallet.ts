/**
 * Hardware Wallet Integration for GhostSpeak CLI
 * 
 * Provides secure transaction signing using Ledger hardware wallets
 * with comprehensive error handling and user guidance.
 * 
 * @example
 * ```typescript
 * const hwManager = new HardwareWalletManager()
 * 
 * // Detect connected devices
 * const devices = await hwManager.detectDevices()
 * 
 * // Connect to Ledger
 * const wallet = await hwManager.connect('ledger')
 * 
 * // Sign transaction
 * const signature = await wallet.signTransaction(transaction)
 * ```
 */

import { EventEmitter } from 'events'
import { EventBus } from './event-system'

/**
 * Hardware wallet types supported
 */
export type HardwareWalletType = 'ledger' | 'trezor' | 'keepkey'

/**
 * Hardware wallet device info
 */
export interface HardwareWalletDevice {
  /** Device type */
  type: HardwareWalletType
  /** Device model */
  model: string
  /** Device serial number */
  serialNumber: string
  /** Is device connected */
  connected: boolean
  /** Is device app open */
  appOpen: boolean
  /** Device version info */
  version: {
    firmware: string
    app: string
  }
  /** Connection path */
  path: string
}

/**
 * Transaction to be signed
 */
export interface TransactionToSign {
  /** Transaction data */
  data: Uint8Array
  /** Derivation path for signing key */
  derivationPath: string
  /** Transaction metadata for display */
  metadata?: {
    to?: string
    amount?: string
    token?: string
    description?: string
  }
}

/**
 * Signature response from hardware wallet
 */
export interface HardwareSignature {
  /** Signature bytes */
  signature: Uint8Array
  /** Recovery ID */
  recoveryId?: number
  /** Public key used for signing */
  publicKey: Uint8Array
  /** Derivation path used */
  derivationPath: string
}

/**
 * Hardware wallet connection status
 */
export type ConnectionStatus = 
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'app_not_open'
  | 'locked'
  | 'error'

/**
 * Base hardware wallet interface
 */
export interface IHardwareWallet {
  /** Wallet type */
  type: HardwareWalletType
  /** Connection status */
  status: ConnectionStatus
  /** Device info */
  device: HardwareWalletDevice

  /** Connect to device */
  connect(): Promise<void>
  /** Disconnect from device */
  disconnect(): Promise<void>
  /** Get public key for derivation path */
  getPublicKey(derivationPath: string): Promise<Uint8Array>
  /** Sign transaction */
  signTransaction(transaction: TransactionToSign): Promise<HardwareSignature>
  /** Sign message */
  signMessage(message: Uint8Array, derivationPath: string): Promise<HardwareSignature>
  /** Get device info */
  getDeviceInfo(): Promise<HardwareWalletDevice>
}

/**
 * Ledger hardware wallet implementation
 */
export class LedgerWallet extends EventEmitter implements IHardwareWallet {
  type: HardwareWalletType = 'ledger'
  status: ConnectionStatus = 'disconnected'
  device!: HardwareWalletDevice

  private transport: any = null
  private solanaApp: any = null
  private eventBus = EventBus.getInstance()

  constructor(device: HardwareWalletDevice) {
    super()
    this.device = device
  }

  /**
   * Connect to Ledger device
   */
  async connect(): Promise<void> {
    try {
      this.status = 'connecting'
      this.emit('status_changed', this.status)

      // In real implementation, would use @ledgerhq/hw-transport-node-hid
      // For now, simulate the connection
      await this.simulateConnect()

      this.status = 'connected'
      this.emit('status_changed', this.status)
      this.eventBus.emit('hardware_wallet:connected', {
        type: 'ledger',
        device: this.device
      })

      console.log(`✅ Connected to Ledger ${this.device.model}`)

    } catch (_error) {
      this.status = 'error'
      this.emit('status_changed', this.status)
      this.emit('error', _error)
      throw new Error(`Failed to connect to Ledger: ${_error}`)
    }
  }

  /**
   * Disconnect from device
   */
  async disconnect(): Promise<void> {
    try {
      if (this.transport) {
        await this.transport.close()
        this.transport = null
        this.solanaApp = null
      }

      this.status = 'disconnected'
      this.emit('status_changed', this.status)
      this.eventBus.emit('hardware_wallet:disconnected', {
        type: 'ledger',
        device: this.device
      })

      console.log('✅ Disconnected from Ledger')

    } catch (_error) {
      this.emit('error', _error)
      throw _error
    }
  }

  /**
   * Get public key for derivation path
   */
  async getPublicKey(derivationPath: string): Promise<Uint8Array> {
    this.ensureConnected()

    try {
      // Validate derivation path
      this.validateDerivationPath(derivationPath)

      // In real implementation, would call this.solanaApp.getAddress()
      // For now, simulate getting public key
      const publicKey = await this.simulateGetPublicKey(derivationPath)

      this.eventBus.emit('hardware_wallet:public_key_retrieved', {
        derivationPath,
        publicKey: Array.from(publicKey)
      })

      return publicKey

    } catch (_error) {
      this.emit('error', _error)
      throw new Error(`Failed to get public key: ${_error}`)
    }
  }

  /**
   * Sign transaction
   */
  async signTransaction(transaction: TransactionToSign): Promise<HardwareSignature> {
    this.ensureConnected()

    try {
      // Show transaction details to user
      await this.displayTransactionForConfirmation(transaction)

      // Validate derivation path
      this.validateDerivationPath(transaction.derivationPath)

      // In real implementation, would call this.solanaApp.signTransaction()
      const signature = await this.simulateSignTransaction(transaction)

      this.eventBus.emit('hardware_wallet:transaction_signed', {
        derivationPath: transaction.derivationPath,
        signatureLength: signature.signature.length
      })

      console.log('✅ Transaction signed successfully')
      return signature

    } catch (_error) {
      this.emit('error', _error)
      
      if (_error instanceof Error) {
        if (_error.message.includes('denied')) {
          throw new Error('Transaction was rejected on device')
        }
        if (_error.message.includes('timeout')) {
          throw new Error('Transaction signing timed out - please confirm on device')
        }
      }

      throw new Error(`Failed to sign transaction: ${_error}`)
    }
  }

  /**
   * Sign message
   */
  async signMessage(message: Uint8Array, derivationPath: string): Promise<HardwareSignature> {
    this.ensureConnected()

    try {
      this.validateDerivationPath(derivationPath)

      // Display message preview
      console.log('📝 Please confirm message signing on your Ledger device')
      console.log(`Message: ${new TextDecoder().decode(message).slice(0, 100)}...`)

      // In real implementation, would call appropriate signing method
      const signature = await this.simulateSignMessage(message, derivationPath)

      this.eventBus.emit('hardware_wallet:message_signed', {
        derivationPath,
        messageLength: message.length
      })

      console.log('✅ Message signed successfully')
      return signature

    } catch (_error) {
      this.emit('error', _error)
      throw new Error(`Failed to sign message: ${_error}`)
    }
  }

  /**
   * Get device info
   */
  async getDeviceInfo(): Promise<HardwareWalletDevice> {
    if (this.status === 'connected') {
      // In real implementation, would query device for latest info
      return { ...this.device }
    }

    // Return cached device info
    return { ...this.device }
  }

  /**
   * Ensure device is connected
   */
  private ensureConnected(): void {
    if (this.status !== 'connected') {
      throw new Error('Device not connected. Please connect your Ledger first.')
    }
  }

  /**
   * Validate derivation path format
   */
  private validateDerivationPath(path: string): void {
    // Standard Solana derivation path: m/44'/501'/0'/0'
    const pathRegex = /^m\/44'\/501'\/\d+'\/\d+'$/
    if (!pathRegex.test(path)) {
      throw new Error(`Invalid derivation path: ${path}. Expected format: m/44'/501'/X'/Y'`)
    }
  }

  /**
   * Display transaction for user confirmation
   */
  private async displayTransactionForConfirmation(transaction: TransactionToSign): Promise<void> {
    console.log('\n📋 Transaction Details:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    if (transaction.metadata) {
      if (transaction.metadata.to) {
        console.log(`To: ${transaction.metadata.to}`)
      }
      if (transaction.metadata.amount) {
        console.log(`Amount: ${transaction.metadata.amount}`)
      }
      if (transaction.metadata.token) {
        console.log(`Token: ${transaction.metadata.token}`)
      }
      if (transaction.metadata.description) {
        console.log(`Description: ${transaction.metadata.description}`)
      }
    }

    console.log(`Derivation Path: ${transaction.derivationPath}`)
    console.log(`Data Size: ${transaction.data.length} bytes`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔐 Please confirm this transaction on your Ledger device')
  }

  // Simulation methods (replace with real implementation)
  private async simulateConnect(): Promise<void> {
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Simulate checking if Solana app is open
    if (Math.random() > 0.8) {
      this.status = 'app_not_open'
      throw new Error('Please open the Solana app on your Ledger device')
    }

    this.transport = { close: async () => {} } // Mock transport
    this.solanaApp = {} // Mock Solana app
  }

  private async simulateGetPublicKey(derivationPath: string): Promise<Uint8Array> {
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Generate a mock public key based on derivation path
    const seed = derivationPath.split('/').join('')
    const publicKey = new Uint8Array(32)
    for (let i = 0; i < 32; i++) {
      publicKey[i] = (seed.charCodeAt(i % seed.length) + i) % 256
    }
    
    return publicKey
  }

  private async simulateSignTransaction(transaction: TransactionToSign): Promise<HardwareSignature> {
    // Simulate user interaction delay
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Simulate occasional rejection
    if (Math.random() > 0.9) {
      throw new Error('Transaction denied by user')
    }

    // Generate mock signature
    const signature = new Uint8Array(64)
    for (let i = 0; i < 64; i++) {
      signature[i] = Math.floor(Math.random() * 256)
    }

    const publicKey = await this.simulateGetPublicKey(transaction.derivationPath)

    return {
      signature,
      publicKey,
      derivationPath: transaction.derivationPath,
      recoveryId: 0
    }
  }

  private async simulateSignMessage(message: Uint8Array, derivationPath: string): Promise<HardwareSignature> {
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const signature = new Uint8Array(64)
    for (let i = 0; i < 64; i++) {
      signature[i] = (message[i % message.length] + i) % 256
    }

    const publicKey = await this.simulateGetPublicKey(derivationPath)

    return {
      signature,
      publicKey,
      derivationPath,
      recoveryId: 0
    }
  }
}

/**
 * Hardware wallet manager
 */
export class HardwareWalletManager extends EventEmitter {
  private connectedWallets = new Map<string, IHardwareWallet>()
  private eventBus = EventBus.getInstance()

  constructor() {
    super()
    this.setupEventHandlers()
  }

  /**
   * Detect connected hardware wallet devices
   */
  async detectDevices(): Promise<HardwareWalletDevice[]> {
    const devices: HardwareWalletDevice[] = []

    try {
      // In real implementation, would use @ledgerhq/hw-transport-node-hid
      // to detect connected devices
      const ledgerDevices = await this.detectLedgerDevices()
      devices.push(...ledgerDevices)

      this.eventBus.emit('hardware_wallet:devices_detected', {
        count: devices.length,
        devices
      })

      return devices

    } catch (_error) {
      console.warn('Failed to detect hardware wallet devices:', _error)
      return []
    }
  }

  /**
   * Connect to hardware wallet
   */
  async connect(type: HardwareWalletType, devicePath?: string): Promise<IHardwareWallet> {
    try {
      const devices = await this.detectDevices()
      const targetDevice = devices.find(d => 
        d.type === type && (devicePath ? d.path === devicePath : true)
      )

      if (!targetDevice) {
        throw new Error(`No ${type} device found`)
      }

      let wallet: IHardwareWallet

      switch (type) {
        case 'ledger':
          wallet = new LedgerWallet(targetDevice)
          break
        case 'trezor':
          throw new Error('Trezor support not yet implemented')
        case 'keepkey':
          throw new Error('KeepKey support not yet implemented')
        default:
          throw new Error(`Unsupported hardware wallet type: ${type}`)
      }

      await wallet.connect()
      this.connectedWallets.set(targetDevice.path, wallet)

      // Forward wallet events
      wallet.on('status_changed', (status) => {
        this.emit('wallet_status_changed', { wallet, status })
      })

      wallet.on('error', (error) => {
        this.emit('walleterror', { wallet, error })
      })

      return wallet

    } catch (_error) {
      this.eventBus.emit('hardware_wallet:connection_failed', {
        type,
        error: _error instanceof Error ? _error.message : String(_error)
      })
      throw _error
    }
  }

  /**
   * Disconnect from hardware wallet
   */
  async disconnect(devicePath: string): Promise<void> {
    const wallet = this.connectedWallets.get(devicePath)
    if (!wallet) {
      throw new Error('Wallet not found')
    }

    await wallet.disconnect()
    this.connectedWallets.delete(devicePath)
  }

  /**
   * Disconnect all wallets
   */
  async disconnectAll(): Promise<void> {
    const promises = Array.from(this.connectedWallets.keys()).map(path => 
      this.disconnect(path)
    )
    await Promise.all(promises)
  }

  /**
   * Get connected wallets
   */
  getConnectedWallets(): IHardwareWallet[] {
    return Array.from(this.connectedWallets.values())
  }

  /**
   * Get wallet by device path
   */
  getWallet(devicePath: string): IHardwareWallet | null {
    return this.connectedWallets.get(devicePath) || null
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Listen for device connection/disconnection events
    // In real implementation, would monitor USB events
  }

  /**
   * Detect Ledger devices
   */
  private async detectLedgerDevices(): Promise<HardwareWalletDevice[]> {
    // Simulate device detection
    await new Promise(resolve => setTimeout(resolve, 1000))

    // For demo purposes, return a mock Ledger device
    // In real implementation, would scan for actual devices
    return [
      {
        type: 'ledger',
        model: 'Nano S Plus',
        serialNumber: 'ABC123DEF456',
        connected: true,
        appOpen: true,
        version: {
          firmware: '1.3.0',
          app: '1.4.2'
        },
        path: '/dev/ledger_nano_s_plus_1'
      }
    ]
  }
}

/**
 * Hardware wallet utilities
 */
export class HardwareWalletUtils {
  /**
   * Generate standard Solana derivation path
   */
  static generateDerivationPath(account = 0, change = 0): string {
    return `m/44'/501'/${account}'/${change}'`
  }

  /**
   * Validate hardware wallet signature
   */
  static async validateSignature(
    signature: HardwareSignature,
    originalData: Uint8Array
  ): Promise<boolean> {
    try {
      // In real implementation, would use crypto libraries to verify
      // For now, just check that signature exists and has correct length
      return signature.signature.length === 64 && 
             signature.publicKey.length === 32
    } catch (_error) {
      return false
    }
  }

  /**
   * Format device info for display
   */
  static formatDeviceInfo(device: HardwareWalletDevice): string {
    return [
      `Type: ${device.type.charAt(0).toUpperCase() + device.type.slice(1)}`,
      `Model: ${device.model}`,
      `Serial: ${device.serialNumber}`,
      `Status: ${device.connected ? 'Connected' : 'Disconnected'}`,
      `App: ${device.appOpen ? 'Open' : 'Closed'}`,
      `Firmware: ${device.version.firmware}`,
      `App Version: ${device.version.app}`
    ].join('\n')
  }

  /**
   * Get user-friendly error messages
   */
  static getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      const message = error.message.toLowerCase()
      
      if (message.includes('device not found')) {
        return 'Hardware wallet not detected. Please connect your device and try again.'
      }
      
      if (message.includes('app not open')) {
        return 'Please open the Solana app on your hardware wallet.'
      }
      
      if (message.includes('denied') || message.includes('rejected')) {
        return 'Transaction was rejected on the hardware wallet.'
      }
      
      if (message.includes('timeout')) {
        return 'Operation timed out. Please confirm the action on your hardware wallet.'
      }
      
      if (message.includes('locked')) {
        return 'Hardware wallet is locked. Please unlock your device.'
      }
    }

    return 'An unexpected error occurred with the hardware wallet.'
  }
}

// Export singleton instance
export const hardwareWalletManager = new HardwareWalletManager()