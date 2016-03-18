/* Interop testing using apprtc.appspot.com using selenium 
 * Copyright (c) 2016, Philipp Hancke
 * This work has been sponsored by the International Multimedia
 * Teleconferencing Consortium in preparation for the 
 * SuperOp! 2016 event.
 */

var test = require('tape');
var webdriver = require('selenium-webdriver');
var chrome = require('selenium-webdriver/chrome');
var firefox = require('selenium-webdriver/firefox');

// how long to wait after both browsers went to the URL.
var sleep = 5000;

function buildDriver(browser, version, platform) {
  // Firefox options.
  var profile = new firefox.Profile();
  profile.setPreference('media.navigator.streams.fake', true);
  profile.setPreference('media.navigator.permission.disabled', true);
  //profile.setPreference('media.peerconnection.video.vp9_enabled', true);
  profile.setPreference('xpinstall.signatures.required', false);

  var firefoxOptions = new firefox.Options()
      .setProfile(profile);

  // Chrome options.
  var chromeOptions = new chrome.Options()
      .addArguments('allow-file-access-from-files')
      .addArguments('use-fake-device-for-media-stream')
      .addArguments('use-fake-ui-for-media-stream')
      .addArguments('disable-translate')
      .addArguments('no-process-singleton-dialog')
      //.addArguments('mute-audio'); // might be harmful for this test

  var driver = new webdriver.Builder()
      .usingServer('http://localhost:4444/wd/hub')
      .setFirefoxOptions(firefoxOptions)
      .setChromeOptions(chromeOptions)
      .forBrowser(browser, version, platform)
      .build();
  // Set global executeAsyncScript() timeout (default is 0) to allow async
  // callbacks to be caught in tests.
  driver.manage().timeouts().setScriptTimeout(2 * 1000);

  return driver;
}
// Helper function for basic interop test.
// see https://apprtc.appspot.com/params.html for queryString options (outdated...)
function interop(t, browserA, browserB, queryString) {
  var driverA = buildDriver(browserA);
  var driverB;

  //var baseURL = 'https://10.apprtc.appspot.com/';
  var baseURL = 'https://apprtc.appspot.com/';
  //var qs = '?audio=true&video=false';
  //var qs = '?it=relay';

  var info;
  return driverA.get(baseURL + (queryString || ''))
  .then(function() {
    t.pass('page loaded');
    return driverA.findElement(webdriver.By.id('join-button')).click();
  })
  .then(function() {
    // wait for URL to change to /r/some-id
    return driverA.wait(function() {
      return driverA.getCurrentUrl()
          .then(function(url) {
            return url.indexOf(baseURL + 'r/') === 0;
          });
    }, 10000, 'Did not join room for 10s');
  })
  .then(function() {
    t.pass('joined room');
    return driverA.getCurrentUrl()
  })
  .then(function(url) {
    //
    driverB = buildDriver(browserB);
    return driverB.get(url);
  })
  .then(function() {
    return driverB.findElement(webdriver.By.id('confirm-join-button')).click();
  })
  .then(function() {
    t.pass('second browser joined');
    // Show the info box.
    return driverA.executeScript('appController.infoBox_.showInfoDiv();');
  })
  .then(function() {
    driverA.sleep(5000);
    // Get the info box text.
    return driverA.findElement(webdriver.By.id('info-div')).getText();
  })
  .then(function(infotext) {
    driverA.quit();
    // return a new promise so the test can .then and inspect
    // depending on the querystring.
    return driverB.quit()
    .then(function() {
      return Promise.resolve(infotext);
    });
  });
}

test('Chrome-Chrome', function (t) {
  //interop(t, 'chrome', 'MicrosoftEdge');
  interop(t, 'chrome', 'chrome')
  .then(function(info) {
    t.end();
  });
});

test('Chrome-Firefox', function (t) {
  interop(t, 'chrome', 'firefox')
  .then(function(info) {
    t.end();
  });
});

test('Firefox-Chrome', function (t) {
  interop(t, 'firefox', 'chrome')
  .then(function(info) {
    t.end();
  });
});

test('Firefox-Firefox', function (t) {
  interop(t, 'firefox', 'firefox')
  .then(function(info) {
    t.end();
  });
});

test('Chrome-Chrome, audio-only', function (t) {
  interop(t, 'chrome', 'chrome', '?audio=true&video=false')
  .then(function(info) {
    t.end();
  });
});

test('Chrome-Chrome, icetransports=relay', function (t) {
  interop(t, 'chrome', 'chrome', '?it=relay')
  .then(function(info) {
    t.end();
  });
});

test('Firefox-Firefox, H264', function (t) {
  interop(t, 'firefox', 'firefox', '?vsc=H264&vrc=H264')
  .then(function(info) {
    t.end();
  });
});

test('Chrome-Chrome, VP8', function (t) {
  interop(t, 'chrome', 'chrome', '?vsc=VP8&vrc=VP8')
  .then(function(info) {
    t.pass(info.indexOf('VP8') !== -1, 'VP8 is used');
    t.end();
  });
});

test('Chrome-Chrome, VP9', function (t) {
  interop(t, 'chrome', 'chrome', '?vsc=VP9&vrc=VP9')
  .then(function(info) {
    t.end();
  });
});

test('Firefox-Firefox, VP9', function (t) {
  interop(t, 'firefox', 'firefox', '?vsc=VP9&vrc=VP9')
  .then(function(info) {
    t.end();
  });
});