/*global console, alert, prompt, ko, Pikaday, getUserCookie, scrollToNow, addNetcode, getReport, ReportModel, DayModel, NetcodeReport, ActivitiesModel, Netcode, GridModel, Row */

$(function () {
  var user, rdata, page = location.pathname.substring(location.pathname.lastIndexOf("/") + 1);
  while (!getUserCookie()) {
    user = prompt('Please enter your username to continue:', '');
    if (user) {
      document.cookie = 'user=' + user;
      break;
    }
  } 

  switch (page) {
  case '':
  case 'index.html':
    //do activites page
    window.model = new ActivitiesModel({});
    rdata = JSON.stringify({
        "user" : getUserCookie()
      });
    $.post('getVisibleNetcodes', rdata).done(function (data) {
      window.model.updateRows($.parseJSON(data));
      scrollToNow();
    });
    break;

  case 'netcodes.html':
    //do manage netcodes page
    window.model = new ActivitiesModel();
    rdata = JSON.stringify({
        "user" : getUserCookie()
      });
    $.post('getAllNetcodes', rdata).done(function (data) {
      window.model.updateRows($.parseJSON(data));
    });
    break;

  case 'historyedit.html':
    //do edit history page
    window.spicker = new Pikaday({
        field : $('#rstart')[0],
        firstDay: 1
    });
    //set the field to today
    window.spicker.setDate(Date());
    window.model = new GridModel(window.spicker.getDate().getTime() / 1000);
    window.model.refreshGrid();

    $('#nextday').click(function () {
      window.spicker.setDate(new Date(window.spicker.getDate().getTime() + 86400000));
      // getDayReport($('form')[0]);
    });
    $('#prevday').click(function () {
      window.spicker.setDate(new Date(window.spicker.getDate().getTime() - 86400000));
      // getDayReport($('form')[0]);
    });
    break;

  case 'reports.html':
    //do reporting page
    var d = new Date();
    window.spicker = new Pikaday({
        field : $('#rstart')[0],
        firstDay: 1
    });
    //move d to this monday
    d.setDate(d.getDate() - d.getDay() + 1);
    window.spicker.setDate(d);

    window.fpicker = new Pikaday({
        field : $('#rfinish')[0],
        firstDay: 1
    });
    //now move d to this sunday
    d.setDate(d.getDate() + 6);
    window.fpicker.setDate(d);

    $('#nextweek').click(function () {
      window.spicker.setDate(new Date(window.spicker.getDate().getTime() + 604800000));
      window.fpicker.setDate(new Date(window.fpicker.getDate().getTime() + 604800000));
      getReport($('form')[0]);

    });
    $('#prevweek').click(function () {
      window.spicker.setDate(new Date(window.spicker.getDate().getTime() - 604800000));
      window.fpicker.setDate(new Date(window.fpicker.getDate().getTime() - 604800000));
      getReport($('form')[0]);
    });

    window.model = new ReportModel();
    getReport($('form')[0]);
    break;
  default:
    //dono...
    break;
  }
  ko.applyBindings(window.model);
});

var CELL_DUR = 15;

var getUserCookie = function () {
  var ca = document.cookie.split(';');
  var user = '';
  var i;
  for (i = 0; i < ca.length; i++) {
    if (ca[i].indexOf('user') !== -1) {
      user = ca[i].substring(5, ca[i].length);
      break;
    }
  }
  return user;
};

var scrollToNow = function () {
  var w = $('.row').width();
  var d = new Date();
  var m = d.getTime() - d.setHours(0, 0, 0, 0);
  //actually 1h before
  var p = (m - 3600000) / 86400000;
  $('.grid').scrollLeft(p * w);

};

var addNetcode = function (formel) {
  var i;
  if (formel.elements.netcode.value && formel.elements.title.value) {
    for (i = 0; i < window.model.rows().length; i++) {
      if (formel.elements.netcode.value === window.model.rows()[i].netcode) {
        alert("That netcode is already in use!");
        return;
      }
    }

    var pdata = JSON.stringify({
        "user" : getUserCookie(),
        "netcode" : formel.elements.netcode.value,
        "title" : formel.elements.title.value,
        "description" : formel.elements.description.value || '---',
        "visibility" : 1
      });
    $.post('addNetcode', pdata).done(function () {
      location.reload();
    });
  } else {
    alert("Need at least a unique netcode and title, sorry!");
  }
};

var getReport = function (formel) {
  if (formel.elements.rstart.value && formel.elements.rfinish.value) {
    var begin = Math.round((window.spicker.getDate().getTime()) / 1000);
    var end   = Math.round((window.fpicker.getDate().getTime()) / 1000) + 86400;
    var i;
    if (begin > end) {
      alert("Start date must be before end date!");
      return;
    }
    window.model.clearDays();
    //send a separate request for each day
    for (i = begin; i < end; i += 86400) {
      (function (tstamp) {
        var pdata = JSON.stringify({
            "user" : getUserCookie(),
            "begin" : tstamp,
            "end" : tstamp + 86400
          });
        $.post('getReport', pdata).done(function (data) {
          data = $.parseJSON(data);
          if (data.success) {
            window.model.addDay(data.activities, tstamp);
          }
        });
      }(i));
    }
  } else {
    alert("Need a start and end date, please!");
  }
};

var ReportModel = function () {
  var self = this;

  self.days = ko.observableArray();
  self.aggNetcodes = ko.observableArray();
  self.reportType = ko.observable("day");

  self.clearDays = function () {
    self.days.removeAll();
    self.aggNetcodes.removeAll();
  };

  self.addDay = function (obj, date) {
    var temp = new DayModel(obj, date);
    self.days.push(temp);

    var newncs = ko.utils.arrayMap(temp.netcodes(), function (item) {
      return item.netcode;
    });

    ko.utils.arrayPushAll(self.aggNetcodes, newncs);

    self.aggNetcodes(ko.utils.arrayGetDistinctValues(self.aggNetcodes()));

    self.days.sort(function (l, r) {
      return l.date < r.date ? -1 : 1;
    });

    self.aggNetcodes.sort(function (l, r) {
      return l < r ? -1 : 1;
    });
  };

  self.getTime = function (dayIdx, nc) {
    var dayncs = self.days()[dayIdx].netcodes();
    var time = '---';
    var i;

    for (i = 0; i < dayncs.length; i++) {
      if (dayncs[i].netcode === nc) {
        time = dayncs[i].decdur();
      }
    }
    return time;
  };
};

var DayModel = function (obj, date) {
  var self = this;

  self.date = date;
  self.dispdate = ko.pureComputed(function () {
      return new Date(self.date * 1000).toDateString();
    });
  self.netcodes = ko.observableArray();
  var temp = {};
  var i, dur, prop;

  //make a tmp var and add up all the times
  for (i = 0; i < obj.length; i++) {
    dur = obj[i].endtime - obj[i].starttime;
    if (temp[obj[i].netcode] === undefined) {
      temp[obj[i].netcode] = new NetcodeReport(obj[i].netcode, obj[i].title);
    }
    temp[obj[i].netcode].increase(dur);
  }
  //now convert to an ob array for display
  for (prop in temp) {
    if (temp.hasOwnProperty(prop)) {
      self.netcodes.push(temp[prop]);
    }
  }

  self.dayTotal = ko.pureComputed(function () {
    var j, tot = 0;
    for (j = 0; j < self.netcodes().length; j++) {
      tot += self.netcodes()[j].duration();
    }
    return (tot / 60 / 60).toFixed(2).replace('.', ',');
  });
};

var NetcodeReport = function (netcode, title) {
  var self = this;

  self.netcode = netcode;
  self.title = title;
  self.duration = ko.observable(0);
  self.decdur = ko.pureComputed(function () {
      return (self.duration() / 60 / 60).toFixed(2).replace('.', ',');
  });

  self.increase = function (by) {
    self.duration(self.duration() + by);
  };
};

var ActivitiesModel = function () {
  var self = this;

  self.rows = ko.observableArray();
  self.grid = new GridModel();

  self.updateRows = function (obj) {
    var i, tn, temp = [];
    if (obj.success && obj.activities) {
      for (i = 0; i < obj.activities.length; i++) {
        tn = new Netcode(obj.activities[i]);
        temp.push(tn);
        self.grid.addRow(tn.title, tn.netcode);
      }
      temp.sort(function (a, b) {
        if (a.title < b.title) { return -1; }
        if (a.title > b.title) { return  1; }
        return 0;
      });
      self.rows(temp);
      return true;
    }
  };
  // self.updateRows(obj);
};

var Netcode = function (obj) {
  var self = this;
  self.user = obj.user || '---';
  self.netcode = obj.netcode || '---';
  self.title = obj.title || '---';
  self.description = obj.description || '---';
  self.visible = ko.observable(Boolean(obj.visibility));
  self.starttime = ko.observable(obj.starttime || null);
  self.endtime = ko.observable(obj.endtime || null);
  self.editing = ko.observable(false);
  self.dispstime = ko.computed({
    read: function () {
      var d, h, m;
      if (self.starttime() === null) { return '---'; }
      d = new Date(self.starttime() * 1000);
      h = (d.getHours() < 10 ? '0' : '') + d.getHours();
      m = (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
      return h + ':' + m;
    },

    write: function (value) {
      //parse value
      var reg = /^(\d{1,2}):(\d{1,2})$/;
      var arr = reg.exec(value);
      if (!arr) {
        alert(value+" is not a valid 24h time!");
        return;
      }
      var d = new Date();
      d.setHours(parseInt(arr[1], 10), parseInt(arr[2], 10), 0, 0);

      //check that time is before now
      if (d > Date.now()) {
        alert(value+" is after now... that's impossible!");
        return;
      }

      //cancel and start a new one
      var pdata = JSON.stringify({
        "user": getUserCookie(),
        "netcode": self.netcode,
        "time": (d / 1000)        
      });

      $.post('cancelTimer', pdata)
        .then(function () {
          return $.post('startTimer', pdata);
        })
        .then(function () {
          // if all went well, write to vm
          self.starttime(d / 1000);
          location.reload();
        });
    }
  });
  self.running = ko.pureComputed(function () {
      return self.starttime() === null ? false : true;
    });
  self.statetext = ko.pureComputed(function () {
      return self.running() ? 'Stop' : 'Start';
    });
  self.visibletext = ko.pureComputed(function () {
      return self.visible() ? 'Active' : 'Inactive';
    });

  self.editStartTime = function () {
    self.editing(true);
  };

  self.startOrStop = function () {
    var now = Math.round((new Date().getTime()) / 1000);
    var pdata = JSON.stringify({
        "user" : getUserCookie(),
        "netcode" : self.netcode,
        "time" : now
      });
    if (self.running()) {
      //cancel if activity was longer than 5 mins
      var endpoint = (now - self.starttime()) < 300 ? 'cancelTimer' : 'stopTimer';
      $.post(endpoint, pdata).done(function () {
        self.starttime(null);
        location.reload();
      });
    } else {
      $.post('startTimer', pdata).done(function () {
        self.starttime(now);
        location.reload();
      });
    }
  };

  self.visibility = function () {
    var pdata = JSON.stringify({
        "user" : getUserCookie(),
        "netcode" : self.netcode,
        "title" : self.title,
        "visibility" : self.visible() ? 0 : 1
    });

    $.post('setNetcodeVisibility', pdata).done(function () {
      self.visible(!self.visible());
    });
  };

  self.deleteNetcode = function () {
    var pdata = JSON.stringify({
      "user" : getUserCookie(),
      "netcode" : self.netcode,
      "title" : self.title
    });
    $.post('removeNetcode', pdata).done(function () {
      location.reload();
    });
  };
};

var GridModel = function (start, end) {
  var self = this;
  var i, d, h, m;

  self.start = start || new Date().setHours(0, 0, 0, 0) / 1000;
  //end not implemented yet
  self.end = end   || self.start + 86400;

  self.rows  = ko.observableArray();
  self.head  = ko.observableArray();
  //generate values for the header
  d = new Date(0);
  for (i = 0; i < ((24 * 60) / CELL_DUR); i++) {
    h = (d.getHours() < 10 ? '0' : '') + d.getHours();
    m = (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
    self.head.push(h + ':' + m);
    d.setMinutes(d.getMinutes() + CELL_DUR);
  }

  self.addRow = function (title, netcode, values) {
    var temp = new Row(title, netcode, values);
    self.populateRow(temp);
    self.rows.push(temp);
  };

  self.populateRow = function (row) {
    var j, soff, eoff, sidx, eidx;
    var pdata = JSON.stringify({
      "user" : getUserCookie(),
      "begin" : self.start,
      "end" : self.start + 86400
    });
    //first need to populate currentActivities
    //this relies on netcodes already being loaded!
    $.post('getVisibleNetcodes', pdata).done(function (data) {
      data = $.parseJSON(data);
      if (data.success) {
        for (i = 0; i < data.activities.length; i++) {
          if (data.activities[i].netcode === row.netcode && data.activities[i].starttime) {
            soff = data.activities[i].starttime - self.start;
            eoff = (new Date().getTime() / 1000) - self.start;
            sidx = Math.floor(soff / (60 * CELL_DUR));
            eidx = Math.ceil(eoff / (60 * CELL_DUR));
            for (j = sidx; j < eidx; j++) {
              row.setMarked(j, 3);
            }
          }
        }
      }
    }); 
    //now this does all the completedActivities
    $.post('getReport', pdata).done(function (data) {
      data = $.parseJSON(data);
      if (data.success) {
        for (i = 0; i < data.activities.length; i++) {
          if (data.activities[i].netcode === row.netcode) {
            soff = data.activities[i].starttime - self.start;
            eoff = data.activities[i].endtime - self.start;
            sidx = Math.floor(soff / (60 * CELL_DUR));
            eidx = Math.ceil(eoff / (60 * CELL_DUR));
            for (j = sidx; j < eidx; j++) {
              row.setMarked(j);
            }
          }
        }
      }
    });
  };

  self.refreshGrid = function () {
    self.rows([]);
    var rdata = JSON.stringify({
        "user" : getUserCookie(),
        "begin" : self.start,
        "end" : self.start + 86400
    });
    $.post('getVisibleNetcodes', rdata).done(function (data) {
      var tn, obj = $.parseJSON(data);
      for (i = 0; i < obj.activities.length; i++) {
        tn = new Netcode(obj.activities[i]);
        self.addRow(tn.title, tn.netcode);
      }
      scrollToNow();
    });
  };

  self.getDayReport = function () {};

  self.applyGrid = function () {
    //for each row in the grid
    //iife is needed to capture each row in closure
    //once they are all done, request a reload
    //keep track of all the promises here, and when them later
    var posts = [];
    for (i = 0; i < self.rows().length; i++) {
      (function (row) {
        var pdata = JSON.stringify({
            "user" : getUserCookie(),
            "netcode" : row.netcode,
            "begin" : self.start,
            "end" : self.start + 86400,
            "values" : row.getTimes()
          });
        posts.push($.post('applyGrid', pdata));
      }(self.rows()[i]));
    }
    //reload the grid when they are all done,
    // or report an error
    $.when(posts).done(function () {
      self.refreshGrid();
    }).fail(function () {
      alert("Could not apply grid! Please try again.");
    });
  };
};

var Row = function (title, netcode, values, start) {
  var self = this;
  var i;

  self.title = title || '---';
  self.netcode = netcode || '---';
  self.start = start || new Date().setHours(0, 0, 0, 0) / 1000;
  self.cells = ko.observableArray();

  if (values) {
    for (i = 0; i < values.length; i++) {
      self.cells.push(values[i]);
    }
  } else {
    for (i = 0; i < ((24 * 60) / CELL_DUR); i++) {
      self.cells.push(ko.observable(0));
    }
  }

  self.setMarked = function (index, data) {
    // pahaha look at this stupid expression
    // 0: unselected
    // 1: yellow
    // 2: red
    // 3: green
    // 4: red border
    data = data === undefined ? 1 
         : data === 0 ? 2
         : data === 1 ? 4 
         : data === 2 ? 0 
         : data === 4 ? 1 
         : data;
    self.cells()[index](data);
  };

  self.coalesce = function (begin, end) {
    begin = begin || 0;
    end = end || self.cells().length;
    var inrun = false;
    var curstart = null;
    var result = [];

    for (i = begin; i < end; i++) {
      if (self.cells()[i]() === 1 || self.cells()[i]() === 2) {
        //this cell already selected or newly selected
        if (!inrun) {
          //a new run started
          curstart = i;
          inrun = true;
        }
      } else {
        //this cell not selected
        if (inrun) {
          //in a run, so close it
          result.push([curstart, i]);
          inrun = false;
          curstart = null;
        }
      }
    }
    if (inrun) {
      //run up until end!
      result.push([curstart, i]);
    }
    return result;
  };

  self.getTimes = function () {
    var idxs, result, begin, end;
    idxs = self.coalesce();
    result = [];

    for (i = 0; i < idxs.length; i++) {
      begin = (self.start + (idxs[i][0] * 60 * CELL_DUR));
      end = (self.start + (idxs[i][1] * 60 * CELL_DUR));
      result.push([begin, end]);
    }
    return result;
  };
};