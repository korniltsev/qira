// Scripts to load after UI has been initialized.
var scripts = ["/client/compatibility/base.js", "/client/compatibility/highlight.js",
               "/client/controls.js", "/client/ida.js", "/client/idump.js", "/client/regmem.js",
               "/client/vtimeline.js", "/client/strace.js", "/client/vmmap.js", "/client/haddrline.js",
               "/client/static/static.js", "/client/static/graph.js"];

$(document).ready(function() {
  var myDocker = new wcDocker(document.body, {"theme": "qira_theme", "themePath": "", "allowContextMenu": false});

  var req = new XMLHttpRequest();
  req.open('GET', '/hasstatic', false);
  req.send()
  var has_static = req.response == "True";

  var cfgDef = $.Deferred();
  var memoryDef = $.Deferred();
  var straceDef = $.Deferred();
  var tagsDef = $.Deferred();
  var controlDef = $.Deferred();
  var dynamicDef = $.Deferred();
  var idumpDef = $.Deferred();
  var timelineDef = $.Deferred();
  var vmmapDef = $.Deferred();

  myDocker.registerPanelType('Timeline', {
    onCreate: function(myPanel, options) {
      var layout = myPanel.layout();
      layout.addItem($("<div id='vtimelinebox'></div>"));
      timelineDef.resolve();
    },
  });

  myDocker.registerPanelType('Control', {
    onCreate: function(myPanel, options) {
      myPanel.layout().addItem($($("#control-template").remove().text()));
      controlDef.resolve();
    },
  });

  myDocker.registerPanelType('Dynamic', {
    onCreate: function(myPanel, options) {
      myPanel.layout().addItem($($("#dynamic-template").remove().text()));
      dynamicDef.resolve();
    },
  });

  myDocker.registerPanelType('idump', {
    onCreate: function(myPanel, options) {
      myPanel.layout().addItem($($("#idump-template").remove().text()));
      idumpDef.resolve();
    },
  });

  myDocker.registerPanelType('strace', {
    onCreate: function(myPanel, options) {
      myPanel.layout().addItem($($("#strace-template").remove().text()));
      straceDef.resolve();
    },
  });

  myDocker.registerPanelType('Memory', {
    onCreate: function(myPanel, options) {
      myPanel.layout().addItem($($("#hexeditor-template").remove().text()));
      memoryDef.resolve();
    },
  });

  myDocker.registerPanelType('Tags', {
    onCreate: function(myPanel, options) {
      myPanel.layout().addItem($("<div class='fill' id='tags-static'><div class='tags' id='itags-static'></div><div class='tags' id='dtags-static'></div></div>"));
      tagsDef.resolve();
    },
  });

  myDocker.registerPanelType('Control Flow', {
    onCreate: function(myPanel, options) {
      myPanel.layout().addItem($("<div class='fill' id='cfg-static'></div>"));
      cfgDef.resolve();
    },
  });

  myDocker.registerPanelType('vmmap', {
    onCreate: function(myPanel, options) {
      myPanel.layout().addItem($("<div id='vmmap'></div>"));
      vmmapDef.resolve();
    },
  });

  var timelinePanel = myDocker.addPanel("Timeline", wcDocker.DOCK.LEFT, null);

  // Limit the width of the vtimeline. Scrollbar exists if it overflows.
  timelinePanel.maxSize(100, 0);

  var controlPanel = myDocker.addPanel("Control", wcDocker.DOCK.RIGHT, timelinePanel);

  controlPanel.maxSize(1000, 70);
  if (has_static) {
    var cfgPanel = myDocker.addPanel("Control Flow", wcDocker.DOCK.RIGHT, controlPanel);
    var flatPanel = myDocker.addPanel("Tags", wcDocker.DOCK.BOTTOM, cfgPanel, {h: 120});
  }
  
  var idumpPanel = myDocker.addPanel("idump", wcDocker.DOCK.BOTTOM, controlPanel);

  //dynamicPanel.maxSize(0, 82);

  var stracePanel = myDocker.addPanel("strace", wcDocker.DOCK.BOTTOM, idumpPanel, {h: 200});

  var memoryPanel = myDocker.addPanel("Memory", wcDocker.DOCK.BOTTOM, stracePanel);

  var vmmapPanel = myDocker.addPanel("vmmap", wcDocker.DOCK.RIGHT, memoryPanel);

  var dynamicPanel = myDocker.addPanel("Dynamic", wcDocker.DOCK.RIGHT, idumpPanel, {w: 300});



  // apply the panel defaults
  myDocker.findPanels().forEach(function(x) {
    x.title(false);
    x.moveable(false);
    x.closeable(false);
    // scrollable isn't working
    if (x._title != "Timeline") {
      x.scrollable(false, false)
    }
  });
  vmmapPanel.scrollable(true, true);//todo less ugly

  function is_done() {
    p("loading UI");
    $.holdReady(true);
    // UI elements now exist in the DOM.
    head.load(scripts);
    $.holdReady(false);
  }

  if (has_static) {
    $.when(timelineDef, idumpDef, memoryDef, straceDef, controlDef, dynamicDef, vmmapDef, cfgDef, tagsDef).done(is_done);
  } else {
    $.when(timelineDef, idumpDef, memoryDef, straceDef, controlDef, dynamicDef, vmmapDef).done(is_done);
  }
});

