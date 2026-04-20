const Urls = {
  cliendId: {
    dev: '',
    test: '2dhaejqvph6m5bi5hu7mse2nu6',
    staging: '',
    prod: '',
  },
  rcpApi: {
    dev: 'https://dev-rcpapi.roland.com',
    test: 'https://test-rcpapi.roland.com',
    staging: '',
    prod: '',
  },
  rcpSvc: {
    dev: 'https://dev-rcpsvc.roland.com',
    test: 'https://test-rcpsvc.roland.com',
    staging: '',
    prod: '',
  },
  rcpIot: {
    dev: 'https://dev-rcpiot-api.roland.com',
    test: 'https://test-rcpiot-api.roland.com',
    staging: '',
    prod: '',
  },
  iotHost: {
    dev: 'a1qu6pphm1h73t-ats.iot.us-west-2.amazonaws.com',
    test: 'aff3w59h75yuq-ats.iot.us-west-2.amazonaws.com',
    staging: '',
    prod: '',
  },
} as const;

enum Stage {
  Dev = 'dev',
  Test = 'test',
  Staging = 'staging',
  Prod = 'prod',
}

export class StageUrls {
  private static stage: Stage = Stage.Test; // デフォルトの stage を設定

  static setStage(stage: Stage) {
    this.stage = stage;
  }

  static get cliendId() {
    return Urls.cliendId[this.stage];
  }

  static get rcpApiEndpoint() {
    return Urls.rcpApi[this.stage];
  }

  static get rcpSvcEndpoint() {
    return Urls.rcpSvc[this.stage];
  }

  static get rcpIotEndpoint() {
    return Urls.rcpIot[this.stage];
  }

  static get iotHost() {
    return Urls.iotHost[this.stage];
  }
}
