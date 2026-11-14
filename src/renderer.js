// Copyright (c) dendr000. MIT License.
// 메인 프로세스에서 앱 정보를 받아 상태줄에 보여 준다.
window.runnerApi.getAppInfo().then((info) => {
  document.getElementById('app-version').textContent = info.name + ' v' + info.version
})
