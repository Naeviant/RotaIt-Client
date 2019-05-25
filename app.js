// Module Imports
var express = require("express"),
    session = require("express-session"),
    nunjucks = require("express-nunjucks"),
    mongodb = require("express-mongo-db"),
    bodyParser = require("body-parser"),
    cookieParser = require("cookie-parser"),
    config = require("./config.json"),
    package = require("./package.json");

// Setup Express App
var app = express();
var njk = nunjucks(app, {
    watch: true,
    noCache: true,
    filters: {
        date: function(d) {
            return ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear();
        },
        toDate: function(t) {
            var d = new Date(t);
            return ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear();
        },
        time: function(d) {
            return ("0" + d.getUTCHours()).slice(-2) + ":" + ("0" + (d.getUTCMinutes())).slice(-2);
        },
        toTime: function(t) {
            var d = new Date(t);
            return ("0" + d.getUTCHours()).slice(-2) + ":" + ("0" + (d.getUTCMinutes())).slice(-2);
        },
        toDay: function(t) {
            var d = new Date(t),
                days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            return days[d.getDay()];
        }
    }
});
app.set("views", __dirname + "/views");
app.use(express.static(__dirname + "/pub"));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(session({
    secret: config.app.secret,
    resave: false,
    saveUninitialized: false
}));
app.use(mongodb("mongodb://localhost/rotait"));

// App Local Variables
app.locals = {
    version: package.version
}

// Session Local Variables
app.get("*", function(req, res, next) {
    res.locals = req.session;
    next();
});

// Get Main Page
app.get("/", function(req, res) {
    res.render("template");
});

// Get Partial - Dashboard
app.get("/partial/dashboard/", function(req, res) {
    if (req.session.loggedin) {
        var d = Date.now();
        req.db.collection("shifts").find({
            staffNumber: req.session.loggedin,
            provisional: false,
            start: {
                $gt: d
            }
        }, {
            limit: 5
        }, function(err, resp) {
            resp.toArray().then(function(shifts) {
                var weekNumbers = shifts.map(function(x) { return x.weekNumber }),
                    query = {};
                for (var week of weekNumbers) {
                    if (!query["$or"]) {
                        query["$or"] = [];
                    }
                    query["$or"].push({
                        weekNumber: week
                    });
                }
                req.db.collection("weeks").find(query, {
                    sort: [["weekNumber", "ascending"]]
                }, function(err, resp) {
                    resp.toArray().then(function(weeks) {
                        req.db.collection("events").find({
                            staffNumber: req.session.loggedin,
                            to: {
                                $gt: d
                            }
                        }, {
                            limit: 5
                        }, function(err, resp) {
                            resp.toArray().then(function(events) {
                                var days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
                                for (var shift of shifts) {
                                    var week = weeks[weekNumbers.indexOf(shift.weekNumber)],
                                        d = new Date(shift.start),
                                        e = new Date(shift.end)
                                        day = week[days[d.getDay()]],
                                        done = false;
                                    day.openCustomers.setUTCFullYear(d.getFullYear(), d.getMonth(), d.getDate());
                                    day.closedCustomers.setUTCFullYear(d.getFullYear(), d.getMonth(), d.getDate());
                                    for (var event of events) {
                                        if (d.getTime() >= event.from && e.getTime() <= (event.to + 86399999)  && (event.type == "interviewing" || event.type == "course")) {
                                            shift.type = event.type;
                                            done = true;
                                            break;
                                        }
                                    }
                                    if (!done) {
                                        if (d.getDay() === 0) {
                                            shift.type = "middle";
                                        }
                                        else if (d.getTime() <= day.openCustomers.getTime()) {
                                            shift.type = "early";
                                        }
                                        else if (e.getTime() >= day.closedCustomers.getTime()) {
                                            shift.type = "late";
                                        }
                                        else {
                                            shift.type = "middle";
                                        }
                                    }
                                }
                                for (var event of events) {
                                    if (event.type != "interviewing" && event.type != "course" && event.type != "suspension") {
                                        event.start = event.from;
                                        shifts.push(event);
                                    }
                                }
                                shifts.sort(function(a, b) {
                                    if (a.start < b.start) {
                                        return -1;
                                    }
                                    if (a.start > b.start) {
                                        return 1;
                                    }
                                    return 0;
                                });
                                shifts = shifts.slice(0, 5);
                                res.render("partials/dashboard", {
                                    shifts: shifts
                                });
                            })
                        });
                    })
                });
            })
        });
    }
    else {
        res.render("partials/error", {
            code: 403,
            message: "You are not authorised to view this page."
        });
    }
});

// Accept Login Details
app.post("/login/", function(req, res) {
    req.db.collection("users").findOne({
        staffNumber: req.body.staffNumber,
        password: req.body.password
    }, function(err, resp) {
        if (!err) {
            if (resp) {
                req.session.loggedin = resp.staffNumber;
                req.session.name = resp.firstName + " " + resp.lastName;
                res.send({
                    status: 200,
                    message: "Login Successful"
                });
            }
            else {
                res.send({
                    status: 404,
                    message: "User Account Not Found"
                });
            }
        }
        else {
            res.send({
                status: 500,
                message: "Database Connection Failure"
            });
        }
    });
});

// Accept Logout Requests
app.post("/logout/", function(req, res) {
    req.session.destroy();
    res.sendStatus(200);
});

// Run Server
var server = app.listen(config.app.port, function() {
    console.log("RotaIt Client Running - Port " + config.app.port);
});