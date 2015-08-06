var req = {
    "begin": 1417132800,
    "end": 1417219200,
    "user": "josh"
};

var res = {"activities": [{"netcode": "92781631 0020", "endtime": 1417182300, "user": "josh", "starttime": 1417161600, "title": "Delivery"}, {"netcode": "92781631 0030", "endtime": 1417188600, "user": "josh", "starttime": 1417187700, "title": "Support"}, {"netcode": "92781631 0030", "endtime": 1417191300, "user": "josh", "starttime": 1417190400, "title": "Support"}, {"netcode": "92781631 0030", "endtime": 1417194900, "user": "josh", "starttime": 1417194000, "title": "Support"}, {"netcode": "92781631 0040", "endtime": 1417191300, "user": "josh", "starttime": 1417186800, "title": "FOC"}, {"netcode": "92781631 0040", "endtime": 1417194900, "user": "josh", "starttime": 1417193100, "title": "FOC"}, {"netcode": "92781631 0050", "endtime": 1417180500, "user": "josh", "starttime": 1417179600, "title": "Internal"}, {"netcode": "92781631 0050", "endtime": 1417183200, "user": "josh", "starttime": 1417182300, "title": "Internal"}, {"netcode": "92781631 0050", "endtime": 1417186800, "user": "josh", "starttime": 1417185900, "title": "Internal"}, {"netcode": "92781631 0050", "endtime": 1417188600, "user": "josh", "starttime": 1417187700, "title": "Internal"}, {"netcode": "92781631 0050", "endtime": 1417193100, "user": "josh", "starttime": 1417190400, "title": "Internal"}, {"netcode": "92781631 0050", "endtime": 1417196700, "user": "josh", "starttime": 1417194900, "title": "Internal"}], "success": true};

var res1 = {
    "activities": [
        {
            "endtime": 1417171500,
            "netcode": "92781631 0030",
            "starttime": 1417168800,
            "title": "Support",
            "user": "josh"
        },
        {
            "endtime": 1417176900,
            "netcode": "92781631 0030",
            "starttime": 1417175100,
            "title": "Support",
            "user": "josh"
        },
        {
            "endtime": 1417172400,
            "netcode": "92781631 0040",
            "starttime": 1417169700,
            "title": "FOC",
            "user": "josh"
        },
        {
            "endtime": 1417175100,
            "netcode": "92781631 0040",
            "starttime": 1417173300,
            "title": "FOC",
            "user": "josh"
        },
        {
            "endtime": 1417173300,
            "netcode": "92781631 0050",
            "starttime": 1417170600,
            "title": "Internal",
            "user": "josh"
        },
        {
            "endtime": 1417176900,
            "netcode": "92781631 0050",
            "starttime": 1417176000,
            "title": "Internal",
            "user": "josh"
        }
    ],
    "success": true
};

var cur = [];
var netcodes = {};

var t1 = new Date();
for (var i = req.begin; i <= req.end; i++) {
    for (var j = 0; j < res.activities.length; j++) {
        if (res.activities[j].starttime === i) {
            cur.push(res.activities[j]);
            if (netcodes[res.activities[j].netcode] === undefined) {
                netcodes[res.activities[j].netcode] = 0;
            }
        }
    }
    for (var k = 0; k < cur.length; k++) {
        if (cur[k].endtime === i) {
            cur.splice(cur.indexOf(cur[k]), 1);
            k--;
        } else {
            netcodes[cur[k].netcode] += 1 / cur.length;
        }
    }
}
var t2 = new Date();

console.log(t2 - t1);
console.log("leftovers: ", cur);
console.log(netcodes);
