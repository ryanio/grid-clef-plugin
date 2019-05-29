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

const pendingRequests = [];
const pendingNotifications = [];
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

const handleData = (data, emit) => {
  if (data.charAt(0) !== '{') {
    // Not JSON
    return;
  }

  let payload;
  try {
    payload = JSON.parse(data);
  } catch (error) {
    console.error('Error parsing incoming data to JSON: ', error);
  }

  if (!payload) {
    return;
  }

  const { method } = payload;
  if (method && requestMethods.includes(method)) {
    pendingRequests.push(payload);
    emit('pluginRequest', payload);
    console.log('pluginRequest', payload);
  } else if (method && notificationMethods.includes(method)) {
    pendingNotifications.push(payload);
    emit('pluginNotification', payload);
    console.log('pluginNotification', payload);
  }
};

const removePendingRequest = id => {
  pendingRequests.splice(
    pendingRequests.findIndex(pendingRequests, item => item.id === id),
    1
  );
};

const removePendingNotification = index => {
  pendingNotifications.splice(index, 1);
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
  handleData: (data, emit) => handleData(data, emit),
  getPendingRequests: () => pendingRequests,
  getPendingNotifications: () => pendingNotifications,
  removePendingRequest: id => removePendingRequest(id),
  removePendingNotification: index => removePendingNotification(index),
  requestMethods,
  notificationMethods,
  settings: [
    {
      id: 'configDir',
      default: configDir,
      label: 'Config Directory',
      flag: '--configdir %s',
      type: 'path'
    },
    // {
    //   id: 'keystoreDir',
    //   default: keystoreDir,
    //   label: 'Keystore Directory',
    //   flag: '--keystore %s',
    //   type: 'path'
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
          flag: '--rpc --ipcdisable --stdio-ui --stdio-ui-test'
        },
        { value: 'ipc', label: 'IPC', flag: '' }
      ]
    }
  ]
};
