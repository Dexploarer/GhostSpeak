/**
 * Chinese (Simplified) translations for GhostSpeak Protocol
 */

export const zhTranslations = {
  // Common terms
  common: {
    agent: '代理',
    agents: '代理列表',
    message: '消息',
    messages: '消息列表',
    channel: '频道',
    channels: '频道列表',
    escrow: '托管',
    transaction: '交易',
    transactions: '交易记录',
    marketplace: '市场',
    service: '服务',
    services: '服务列表',
    payment: '支付',
    payments: '支付记录',
    reputation: '声誉',
    verification: '验证',
    created: '已创建',
    updated: '已更新',
    cancelled: '已取消',
    completed: '已完成',
    pending: '待处理',
    failed: '失败',
    success: '成功',
    error: '错误',
    warning: '警告',
    info: '信息',
    loading: '加载中...',
    retry: '重试',
    cancel: '取消',
    confirm: '确认',
    submit: '提交',
    save: '保存',
    delete: '删除',
    edit: '编辑',
    view: '查看',
    back: '返回',
    next: '下一步',
    previous: '上一步',
    close: '关闭'
  },

  // CLI Messages
  cli: {
    welcome: '欢迎使用 GhostSpeak 协议命令行工具',
    version: '版本 {{version}}',
    help: '使用 --help 查看命令信息',
    networkConnected: '已连接到 {{network}} 网络',
    walletConnected: '钱包已连接：{{address}}',
    configLoaded: '配置文件已加载：{{path}}',
    
    commands: {
      agent: {
        create: '正在创建新代理...',
        created: '代理创建成功，ID：{{id}}',
        verify: '正在验证代理...',
        verified: '代理验证成功',
        list: '正在列出代理...',
        found: '找到 {{count}} 个代理',
        notFound: '未找到代理'
      },
      
      channel: {
        create: '正在创建频道...',
        created: '频道已创建：{{name}}',
        join: '正在加入频道...',
        joined: '成功加入频道：{{name}}',
        leave: '正在离开频道...',
        left: '已离开频道：{{name}}',
        list: '可用频道：'
      },
      
      message: {
        send: '正在发送消息...',
        sent: '消息发送成功',
        receive: '来自 {{sender}} 的新消息：{{content}}',
        broadcast: '正在向 {{channel}} 广播消息...',
        broadcasted: '消息广播成功'
      },
      
      escrow: {
        create: '正在创建托管交易...',
        created: '托管创建成功，ID：{{id}}',
        deposit: '正在存入 {{amount}} 代币...',
        deposited: '存款成功',
        release: '正在释放托管资金...',
        released: '资金释放成功',
        dispute: '已对托管 {{id}} 提出争议'
      },
      
      marketplace: {
        list: '正在列出服务...',
        create: '正在创建服务列表...',
        created: '服务发布成功',
        purchase: '正在购买服务...',
        purchased: '服务购买成功'
      }
    },

    errors: {
      invalidCommand: '无效命令：{{command}}',
      missingArgument: '缺少必需参数：{{argument}}',
      invalidArgument: '无效参数值：{{value}}',
      networkError: '网络连接错误',
      walletError: '钱包连接错误',
      insufficientFunds: '余额不足',
      transactionFailed: '交易失败：{{reason}}',
      agentNotFound: '代理未找到：{{id}}',
      channelNotFound: '频道未找到：{{name}}',
      escrowNotFound: '托管未找到：{{id}}',
      serviceNotFound: '服务未找到：{{id}}',
      unauthorized: '未授权访问',
      rateLimited: '请求频率超限，请稍后重试',
      invalidAddress: '无效钱包地址：{{address}}',
      configError: '配置错误：{{message}}'
    }
  },

  // SDK Messages
  sdk: {
    initialization: {
      starting: '正在初始化 GhostSpeak SDK...',
      complete: 'SDK 初始化完成',
      failed: 'SDK 初始化失败：{{reason}}',
      connecting: '正在连接到 Solana 网络...',
      connected: '已连接到 {{cluster}} 集群'
    },

    agent: {
      creating: '正在创建代理...',
      created: '代理创建成功',
      verifying: '正在验证代理凭据...',
      verified: '代理验证完成',
      updating: '正在更新代理资料...',
      updated: '代理资料已更新',
      deleting: '正在删除代理...',
      deleted: '代理删除成功'
    },

    messaging: {
      sending: '正在发送消息...',
      sent: '消息已发送',
      receiving: '正在监听消息...',
      received: '收到消息',
      encrypting: '正在加密消息...',
      encrypted: '消息已加密',
      decrypting: '正在解密消息...',
      decrypted: '消息已解密'
    },

    escrow: {
      initializing: '正在初始化托管...',
      initialized: '托管已初始化',
      depositing: '正在存入资金...',
      deposited: '资金已存入',
      releasing: '正在释放资金...',
      released: '资金已释放',
      disputing: '正在提起争议...',
      disputed: '争议已提起'
    },

    marketplace: {
      listing: '正在创建服务列表...',
      listed: '服务已发布',
      purchasing: '正在处理购买...',
      purchased: '购买完成',
      searching: '正在搜索服务...',
      found: '找到 {{count}} 个服务'
    },

    errors: {
      networkUnavailable: '网络不可用',
      walletNotConnected: '钱包未连接',
      insufficientBalance: '余额不足',
      transactionTimeout: '交易超时',
      invalidSignature: '无效签名',
      accountNotFound: '账户未找到',
      programError: '智能合约错误：{{code}}',
      rpcError: 'RPC 错误：{{message}}'
    }
  },

  // Developer Experience
  devex: {
    setup: {
      welcome: '欢迎使用 GhostSpeak 开发环境',
      installing: '正在安装依赖...',
      installed: '依赖安装成功',
      configuring: '正在配置开发环境...',
      configured: '开发环境准备就绪',
      starting: '正在启动开发服务器...',
      started: '开发服务器运行在 {{url}}'
    },

    templates: {
      creating: '正在从模板创建项目...',
      created: '项目已创建：{{name}}',
      available: '可用模板：',
      basic: '基础代理 - 带消息功能的简单代理',
      marketplace: '市场服务 - 提供服务的代理',
      chat: '聊天机器人 - 对话代理',
      escrow: '托管服务 - 支付处理代理',
      custom: '自定义 - 从头开始'
    },

    debugging: {
      starting: '正在启动调试会话...',
      connected: '调试器已连接',
      breakpoint: '在 {{location}} 处命中断点',
      step: '正在单步调试...',
      inspect: '检查变量：{{name}} = {{value}}',
      stack: '调用堆栈：',
      logs: '调试日志：'
    },

    testing: {
      running: '正在运行测试...',
      passed: '{{count}} 个测试通过',
      failed: '{{count}} 个测试失败',
      coverage: '测试覆盖率：{{percentage}}%',
      performance: '性能基准：{{time}}ms'
    }
  },

  // Documentation
  docs: {
    gettingStarted: '快速入门',
    quickStart: '快速开始指南',
    apiReference: 'API 参考',
    examples: '代码示例',
    tutorials: '教程',
    troubleshooting: '故障排除',
    faq: '常见问题',
    community: '社区',
    contributing: '贡献指南',
    changelog: '变更日志',
    
    sections: {
      overview: '协议概览',
      installation: '安装',
      configuration: '配置',
      agents: '代理管理',
      messaging: '消息系统',
      escrow: '托管交易',
      marketplace: '市场服务',
      security: '安全最佳实践',
      deployment: '部署指南'
    }
  },

  // Time and dates
  time: {
    now: '刚刚',
    minutesAgo: {
      one: '{{count}} 分钟前',
      other: '{{count}} 分钟前'
    },
    hoursAgo: {
      one: '{{count}} 小时前',
      other: '{{count}} 小时前'
    },
    daysAgo: {
      one: '{{count}} 天前',
      other: '{{count}} 天前'
    },
    weeksAgo: {
      one: '{{count}} 周前',
      other: '{{count}} 周前'
    },
    monthsAgo: {
      one: '{{count}} 个月前',
      other: '{{count}} 个月前'
    },
    yearsAgo: {
      one: '{{count}} 年前',
      other: '{{count}} 年前'
    }
  },

  // Validation messages
  validation: {
    required: '此字段为必填项',
    invalid: '无效值',
    tooShort: '至少需要 {{min}} 个字符',
    tooLong: '最多 {{max}} 个字符',
    invalidEmail: '无效邮箱地址',
    invalidUrl: '无效 URL',
    invalidAddress: '无效 Solana 地址',
    invalidAmount: '无效金额',
    minimumAmount: '最小金额为 {{min}}',
    maximumAmount: '最大金额为 {{max}}'
  }
};