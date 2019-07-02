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
    keystoreDir = '~/Library/Ethereum/keystore';
    configDir = '~/.clef';
    break;
  }
  default: {
  }
}

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
  if (data.includes('endpoint opened')) {
    emit('connected');
    emit('newState', 'connected');
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
  if (payload.text || payload.method) {
    notify(payload, Notification);
  }
};

const removeQueue = index => {
  queue.splice(index, 1);
};

module.exports = {
  type: 'signer',
  order: 4,
  displayName: 'Clef',
  name: 'clef',
  repository: 'https://gethstore.blob.core.windows.net',
  filter: {
    version: '>=1.9.0' // only included in alltool package after (>=) 1.9.0
  },
  prefix: `geth-alltools-${platform}`,
  binaryName: process.platform === 'win32' ? 'clef.exe' : 'clef',
  handleData: (data, emit, Notification) =>
    handleData(data, emit, Notification),
  api: {
    getQueue: () => queue,
    removeQueue
  },
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
    // {
    //   id: 'keystoreDir',
    //   default: keystoreDir,
    //   label: 'Keystore Directory',
    //   flag: '--keystore %s',
    //   type: 'directory'
    // },
    {
      id: 'chainId',
      default: '1',
      label: 'Chain ID',
      flag: '--chainid %s'
    },
    {
      id: 'api',
      default: 'rpc',
      label: 'API',
      options: [
        {
          value: 'rpc',
          label: 'RPC HTTP',
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
  ]
};
