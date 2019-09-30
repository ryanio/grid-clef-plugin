const userDataPath = require('electron').app.getPath('userData');
const auditLog = `${userDataPath}/client_plugins/clef/audit.log`;

let keystoreDir = `${process.env.APPDATA}/Ethereum/keystore`;
let configDir = `${process.env.APPDATA}/.clef`;
let platform = 'windows';

// Platform specific initialization
switch (process.platform) {
  case 'win32': {
    platform = 'windows';
    keystoreDir = `${process.env.APPDATA}/Ethereum/keystore`;
    configDir = `${process.env.APPDATA}/.clef`;
    break;
  }
  case 'linux': {
    platform = 'linux';
    keystoreDir = '~/.ethereum/keystore';
    configDir = '~/.clef';
    break;
  }
  case 'darwin': {
    platform = 'darwin';
    const homedir = require('os').homedir();
    keystoreDir = `${homedir}/Library/Ethereum/keystore`;
    configDir = `${homedir}/.clef`;
    break;
  }
  default: {
  }
}

const findIpcPathInLogs = logs => {
  let ipcPath;
  for (const logPart of logs) {
    const found = logPart.includes('IPC endpoint opened');
    if (found) {
      ipcPath = logPart.split('=')[1].trim();
      // fix double escaping
      if (ipcPath.includes('\\\\')) {
        ipcPath = ipcPath.replace(/\\\\/g, '\\');
      }
      console.log('Found IPC path: ', ipcPath);
      return ipcPath;
    }
  }
  console.log('IPC path not found in logs', logs);
  return null;
};

const requestMethods = [
  'ui_approveTx',
  'ui_approveSignData',
  'ui_approveListing',
  'ui_approveNewAccount',
  'ui_onInputRequired'
];
const notificationMethods = [
  'ui_showInfo',
  'ui_showError',
  'ui_onApprovedTx',
  'ui_onSignerStartup'
];
let queue = [];
let pluginEmit;

const notify = (payload, Notification) => {
  const title = 'Grid: Clef';
  let body = payload.text ? payload.text : 'New Request';
  switch (payload.method) {
    case 'ui_onSignerStartup':
      const http = payload.params[0].info.extapi_http;
      const ipc = payload.params[0].info.extapi_ipc;
      let location;
      if (http !== 'n/a') {
        location = http;
      } else if (ipc !== 'n/a') {
        location = ipc;
      }
      if (location) {
        body = `Signer started on ${location}`;
      } else {
        body = `Signer started`;
      }
      break;
    case 'ui_showInfo': {
      body = payload.params[0].text;
      break;
    }
    case 'ui_onInputRequired': {
      const { title: payloadTitle, prompt: payloadPrompt } = payload.params[0];
      body = `${payloadTitle}: ${payloadPrompt}`;
      break;
    }
    case 'ui_approveTx':
      body = 'New Transaction Request';
      break;
    case 'ui_approveSignData':
      body = 'New Sign Data Request';
      break;
    case 'ui_approveNewAccount':
      body = 'New Account Request';
      break;
    case 'ui_approveListing':
      body = 'New Account Listing Request';
      break;
    default:
      break;
  }
  const notification = new Notification({ title, body });
  notification.show();
};

const handleData = (data, emit, Notification) => {
  // Set pluginEmit for use elsewhere
  if (!this.pluginEmit) {
    pluginEmit = emit;
  }

  if (data.includes('endpoint opened')) {
    emit('newState', 'connected');
    // Clear queue in case of any requests from a previous run
    queue = [];
  }

  if (data.charAt(0) !== '{') {
    // Not JSON
    return;
  }

  let payload;
  try {
    payload = JSON.parse(data);
  } catch (error) {}

  if (!payload) {
    return;
  }

  queue.push(payload);
  emit('pluginData', payload);
  emit('setAppBadge', { appId: 'grid-clef-app', count: queue.length });
  if (payload.text || payload.method) {
    notify(payload, Notification);
  }
};

const removeQueue = index => {
  queue.splice(index, 1);
  if (pluginEmit) {
    pluginEmit('setAppBadge', { appId: 'grid-clef-app', count: queue.length });
  }
};

const getAppBadges = () => {
  return {
    'grid-clef-app': queue.length
  };
};

const beforeStop = () => {
  queue = [];
  pluginEmit('setAppBadge', { appId: 'grid-clef-app', count: 0 });
};

module.exports = {
  type: 'signer',
  order: 4,
  displayName: 'Clef',
  name: 'clef',
  repository: 'https://gethstore.blob.core.windows.net',
  filter: {
    version: '>=1.9.0', // only included in alltool package after (>=) 1.9.0
    name: {
      excludes: ['unstable', 'swarm']
    }
  },
  prefix: `geth-alltools-${platform}`,
  binaryName: process.platform === 'win32' ? 'clef.exe' : 'clef',
  resolveIpc: logs => findIpcPathInLogs(logs),
  handleData,
  api: {
    getQueue: () => queue,
    removeQueue,
    getAppBadges
  },
  beforeStop,
  requestMethods,
  notificationMethods,
  settings: [
    {
      id: 'configDir',
      default: configDir,
      label: 'Config Directory',
      flag: '--configdir %s',
      type: 'directory'
    },
    {
      id: 'keystoreDir',
      default: keystoreDir,
      label: 'Keystore Directory',
      flag: '--keystore %s',
      type: 'directory'
    },
    {
      id: 'auditLog',
      default: auditLog,
      label: 'Audit Log File',
      flag: '--auditlog %s',
      type: 'file'
    },
    {
      id: 'chainId',
      default: '1',
      label: 'Chain ID',
      flag: '--chainid %s'
    },
    {
      id: 'api',
      default: 'http',
      label: 'RPC External API',
      options: [
        {
          value: 'http',
          label: 'HTTP',
          flag: '--rpc --ipcdisable --stdio-ui'
        },
        { value: 'ipc', label: 'IPC', flag: '--stdio-ui' }
      ]
    },
    {
      id: 'testMode',
      default: 'disabled',
      label: 'Interactive Test Mode',
      options: [
        { value: 'disabled', label: 'Disabled', flag: '' },
        { value: 'enabled', label: 'Enabled', flag: '--stdio-ui-test' }
      ]
    }
  ],
  about: {
    description:
      'Clef is an independent Ethereum signer created by the Geth team with security as its highest priority.',
    apps: [
      {
        name: 'Grid Client',
        url: 'package://github.com/ryanio/grid-clef-app'
      },
      {
        name: 'RPC Tester App',
        url: 'package://github.com/ryanio/grid-rpc-app'
      }
    ],
    links: [
      {
        name: 'GitHub Repository',
        url: 'https://github.com/ethereum/go-ethereum/tree/master/cmd/clef'
      }
    ],
    docs: [
      {
        name: 'Clef Docs',
        url: 'https://geth.ethereum.org/clef/Overview'
      },
      {
        name: 'Changelog: Internal API',
        url:
          'https://github.com/ethereum/go-ethereum/blob/master/cmd/clef/intapi_changelog.md'
      },
      {
        name: 'Changelog: External API',
        url:
          'https://github.com/ethereum/go-ethereum/blob/master/cmd/clef/extapi_changelog.md'
      }
    ],
    community: [
      {
        name: 'Discord Chat',
        url: 'https://discordapp.com/invite/nthXNEv'
      }
    ]
  }
};
