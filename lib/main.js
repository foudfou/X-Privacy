"use strict";

const {Cc,Ci,components} = require("chrome");
const observer = require("observer-service");
const privateBrowsing = require("private-browsing");
const notifications = require("notifications");
const winUtils = require("window-utils");
const tabBrowser = require("tab-browser");

exports.main = function(options, callbacks) {
  console.log(options.loadReason);

  function dumpObj(obj) {
    var str = "";
    for(i in obj) {
      try {
        str += "obj["+i+"]: " + obj[i] + "\n";
      } catch(e) {
        str += "obj["+i+"]: Unavailable\n";
      }
    }
    console.log(str);
  }

  function httpResponseObsCb(subject, data) {
    let httpChannel = subject.QueryInterface(Ci.nsIHttpChannel);

    let xprivate;
    try {
      xprivate = httpChannel.getResponseHeader("X-Hello");
      console.log("X-Private encountered");
    } catch (x) {
      // "If called before the response has been received (before
      // onStartRequest()) or if the header is not set in the response."
      if (x.name !== "NS_ERROR_NOT_AVAILABLE")
        console.log(x);
    }

    console.log("xprivate="+xprivate);
    console.log("pb.active="+privateBrowsing.isActive);
    if (xprivate && !privateBrowsing.isActive) {

      notifications.notify
      ({
         title: "X-Private",
         text: "The site asked you to go private",
         data: "hi",
         onClick: function (data) {
           console.log(data);
           // console.log(this.data) would produce the same result.
         }
       });

      // we need to prevent history record, so we don't loop when quiting
      // private browsing
      // http://stackoverflow.com/questions/6506078/javascript-delete-the-last-item-in-history-firefox-addon
      // https://groups.google.com/group/mozilla-labs-jetpack/browse_thread/thread/f9feac68a4afa3a8
      // see also undocumented  tabBrowser.whenContentLoaded(
      let tab = tabBrowser.activeTab;
      let win = tab.ownerDocument.defaultView.content;
      win.stop(); // prevent history log
      win.content.location.replace = httpChannel.referrer;

      privateBrowsing.activate();
      tab = tabBrowser.activeTab;
      win = tab.ownerDocument.defaultView.content;
      win.content.location.href = httpChannel.URI.spec;

    } else if (privateBrowsing.isActive) {
      privateBrowsing.deactivate();
    }

  };

  observer.add("http-on-examine-response", httpResponseObsCb);

};

exports.onUnload = function (reason) {
  console.log(reason);
  observer.remove("http-on-examine-response", httpResponseObsCb);
};
