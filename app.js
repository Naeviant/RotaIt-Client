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

// Get Partial - Shifts
app.get("/partial/shifts/", function(req, res) {
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
            if (err) {
                res.render("partials/error", {
                    code: 500,
                    message: "The system could not contact the server. Please try again later."
                });
                return;
            } 
            resp.toArray().then(function(shifts) {
                var weekNumbers = shifts.map(function(x) { return x.weekNumber }),
                    query = {};
                for (var week of weekNumbers) {
                    if (!query["$or"]) {
                        query["$or"] = [];
                    }
                    if (query["$or"].map(function(x) { return x.weekNumber; }).indexOf(week) === -1) {
                        query["$or"].push({
                            weekNumber: week
                        });
                    }
                }
                req.db.collection("weeks").find(query, {
                    sort: [["weekNumber", "ascending"]]
                }, function(err, resp) {
                    if (err) {
                        res.render("partials/error", {
                            code: 500,
                            message: "The system could not contact the server. Please try again later."
                        });
                        return;
                    } 
                    resp.toArray().then(function(weeks) {
                        req.db.collection("events").find({
                            staffNumber: req.session.loggedin,
                            to: {
                                $gt: d
                            }
                        }, {
                            limit: 5
                        }, function(err, resp) {
                            if (err) {
                                res.render("partials/error", {
                                    code: 500,
                                    message: "The system could not contact the server. Please try again later."
                                });
                                return;
                            } 
                            resp.toArray().then(function(events) {
                                var days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
                                for (var shift of shifts) {
                                    var week = weeks[weeks.map(function(x) { return x.weekNumber; }).indexOf(shift.weekNumber)],
                                        d = new Date(shift.start),
                                        e = new Date(shift.end);
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
                                res.render("partials/shifts", {
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

// Get Partial - Rota Search
app.get("/partial/rota/", function(req, res) {
    if (req.session.loggedin) {
        res.render("partials/rota_search");
    }
    else {
        res.render("partials/error", {
            code: 403,
            message: "You are not authorised to view this page."
        });
    }
});

// Get Partial - Rota View
app.get("/partial/rota_view/", function(req, res) {
    if (req.session.loggedin) {
        if (req.query.week && req.query.year && !isNaN(parseInt(req.query.week)) && !isNaN(parseInt(req.query.year))) {
            req.query.week = parseInt(req.query.week);
            req.query.year = parseInt(req.query.year);
            if (req.query.year >= 2000 && req.query.week >= 1 && req.query.week <= 53) {
                req.db.collection("users").findOne({
                    staffNumber: req.session.loggedin
                }, function(err, resp) {
                    if (err) {
                        res.render("partials/error", {
                            code: 500,
                            message: "The system could not contact the server. Please try again later."
                        });
                        return;
                    } 
                    req.db.collection("users").find({
                        team: resp.team
                    }, {
                        sort: [["firstName", "ascending"]]
                    }, function(err, resp) {
                        if (err) {
                            res.render("partials/error", {
                                code: 500,
                                message: "The system could not contact the server. Please try again later."
                            });
                            return;
                        } 
                        resp.toArray().then(function(team) {
                            req.db.collection("weeks").findOne({
                                weekNumber: req.query.week,
                                year: req.query.year
                            }, function(err, week) {
                                if (err) {
                                    res.render("partials/error", {
                                        code: 500,
                                        message: "The system could not contact the server. Please try again later."
                                    });
                                    return;
                                } 
                                if (week && week.published === true) {
                                    var limit = new Date(1547942400000 + (parseInt((req.query.week + 1) * 604800000))).getTime();
                                    if (limit < Date.now()) {
                                        var users = [];
                                        req.db.collection("shifts").find({
                                            weekNumber: req.query.week,
                                            year: req.query.year
                                        }, function(err, resp) {
                                            if (err) {
                                                res.render("partials/error", {
                                                    code: 500,
                                                    message: "The system could not contact the server. Please try again later."
                                                });
                                                return;
                                            } 
                                            resp.toArray().then(function(shifts) {
                                                var start = new Date(1547942400000 + (parseInt(req.query.week * 604800000))).getTime(),
                                                    end = new Date(1547942400000 + (parseInt(req.query.week * 604800000) + (6 * 86400000))).getTime();
                                                req.db.collection("events").find({
                                                    $or: [
                                                        { $and: [
                                                                {
                                                                    from: {
                                                                        $lte: start
                                                                    }
                                                                },
                                                                {
                                                                    to: {
                                                                        $gte: start
                                                                    }
                                                                }
                                                            ] 
                                                        },
                                                        {
                                                            $and: [
                                                                {
                                                                    from: {
                                                                        $gte: start
                                                                    }
                                                                },
                                                                {
                                                                    from: {
                                                                        $lte: end
                                                                    }
                                                                }
                                                            ]
                                                        }
                                                    ]
                                                }, function(err, resp) {
                                                    if (err) {
                                                        res.render("partials/error", {
                                                            code: 500,
                                                            message: "The system could not contact the server. Please try again later."
                                                        });
                                                        return;
                                                    } 
                                                    resp.toArray().then(function(events) {
                                                        for (var shift of shifts) {
                                                            if (users.map(function(x) { return x.staffNumber }).indexOf(shift.staffNumber) === -1) {
                                                                users.push({
                                                                    firstName: shift.fullName.split(" ")[0],
                                                                    lastName: shift.fullName.split(" ")[1],
                                                                    staffNumber: shift.staffNumber
                                                                });
                                                            }
                                                        }
                                                        for (var event of events) {
                                                            if (users.map(function(x) { return x.staffNumber }).indexOf(event.staffNumber) === -1) {
                                                                users.push({
                                                                    firstName: event.fullName.split(" ")[0],
                                                                    lastName: event.fullName.split(" ")[1],
                                                                    staffNumber: event.staffNumber
                                                                });
                                                            }
                                                        }
                                                        users.sort(function(a, b) {
                                                            if (a.firstName < b.firstName) {
                                                                return -1;
                                                            }
                                                            if (a.firstName > b.firstName) {
                                                                return 1;
                                                            }
                                                            return 0;
                                                        });
                                                        res.render("partials/rota_view", {
                                                            team: users,
                                                            week: week
                                                        });
                                                    });
                                                });
                                            });
                                        });
                                    }
                                    else {
                                        res.render("partials/rota_view", {
                                            team: team,
                                            week: week
                                        });
                                    }
                                }
                                else {
                                    res.render("partials/error", {
                                        code: 400,
                                        message: "The rota for this week is not yet available."
                                    });
                                }
                            });
                        });
                    });
                });
            }
            else {
                res.render("partials/error", {
                    code: 400,
                    message: "The week number or year was invalid."
                });
            }
        }
        else {
            res.render("partials/error", {
                code: 400,
                message: "The week number or year was invalid."
            });
        }
    }
    else {
        res.render("partials/error", {
            code: 403,
            message: "Authentication with the server failed. Please try again later."
        });
    }
});

// Get Partial - View Details
app.get("/partial/details/", function(req, res) {
    if (req.session.loggedin) {
        req.db.collection("users").findOne({
            staffNumber: req.session.loggedin
        }, function(err, resp) {
            if (err) {
                res.render("partials/error", {
                    code: 500,
                    message: "The system could not contact the server. Please try again later."
                });
                return;
            } 
            res.render("partials/details", { user: resp });
        });
    }
    else {
        res.render("partials/error", {
            code: 403,
            message: "You are not authorised to view this page."
        });
    }
});

// Get Partial - Leave Requests
app.get("/partial/requests/", function(req, res) {
    if (req.session.loggedin) {
        var d = Date.now();
        req.db.collection("events").find({
            staffNumber: req.session.loggedin,
            type: "leave",
            to: {
                $gt: d
            }
        }, {
            sort: [["firstName", "ascending"]]
        }, function(err, resp) {
            if (err) {
                res.render("partials/error", {
                    code: 500,
                    message: "The system could not contact the server. Please try again later."
                });
                return;
            } 
            resp.toArray().then(function(requests) {
                res.render("partials/requests", { requests: requests });
            });
        });
    }
    else {
        res.render("partials/error", {
            code: 403,
            message: "You are not authorised to view this page."
        });
    }
});

// Get Partial - New Leave Request
app.get("/partial/requests_new/", function(req, res) {
    if (req.session.loggedin) {
        res.render("partials/requests_new");
    }
    else {
        res.render("partials/error", {
            code: 403,
            message: "You are not authorised to view this page."
        });
    }
});

// Get Week Data
app.get("/week/", function(req, res) {
if (req.session.loggedin) {
        if (req.query.week && req.query.year) {
            req.query.week = parseInt(req.query.week);
            req.query.year = parseInt(req.query.year);
            req.db.collection("weeks").findOne({
                weekNumber: req.query.week,
                year: req.query.year
            }, function(err, week) {
                if (err) {
                    res.send({
                        status: 500,
                        message: "The system could not contact the server. Please try again later."
                    });
                    return;
                } 
                res.send({
                    status: 200,
                    week: week
                });
            });
        }
        else {
            res.send({
                status: 400,
                message: "Invalid Parameters Sent"
            });
        }
    }
    else {
        res.send({
            status: 403,
            message: "Authentication Failed"
        });
    }
});

// Get Rota Data
app.get("/rota/", function(req, res) {
    if (req.session.loggedin) {
        if (req.query.week && req.query.year) {
            req.query.week = parseInt(req.query.week);
            req.query.year = parseInt(req.query.year);
            req.db.collection("shifts").find({
                weekNumber: req.query.week,
                year: req.query.year
            }, function(err, shifts) {
                if (err) {
                    res.send({
                        status: 500,
                        message: "The system could not contact the server. Please try again later."
                    });
                    return;
                } 
                shifts.toArray().then(function(rota) {
                    res.send({
                        status: 200,
                        rota: rota
                    });
                });
            });
        }
        else {
            res.send({
                status: 400,
                message: "Invalid Parameters Sent"
            });
        }
    }
    else {
        res.send({
            status: 403,
            message: "Authentication Failed"
        });
    }
});

// Get Event Data
app.get("/events/", function(req, res) {
    if (req.session.loggedin) {
        if (req.query.week && req.query.year) {
            var start = new Date(1547942400000 + (parseInt(req.query.week * 604800000))).getTime(),
                end = new Date(1547942400000 + (parseInt(req.query.week * 604800000) + (6 * 86400000))).getTime();
            req.db.collection("events").find({
                $or: [
                    { $and: [
                            {
                                from: {
                                    $lte: start
                                }
                            },
                            {
                                to: {
                                    $gte: start
                                }
                            }
                        ] 
                    },
                    {
                        $and: [
                            {
                                from: {
                                    $gte: start
                                }
                            },
                            {
                                from: {
                                    $lte: end
                                }
                            }
                        ]
                    }
                ]
            }, function(err, resp) {
                if (err) {
                    res.send({
                        status: 500,
                        message: "The system could not contact the server. Please try again later."
                    });
                    return;
                } 
                resp.toArray().then(function(events) {
                    res.send({
                        status: 200,
                        events: events
                    });
                });
            });
        }
        else {
            res.send({
                status: 400,
                message: "Invalid Parameters Sent"
            });
        }
    }
    else {
        res.send({
            status: 403,
            message: "Authentication Failed"
        });
    }
});

// Accept New Leave Requests
app.post("/requests/", function(req, res) {
    if (req.body.from && req.body.to) {
        req.body.from = parseInt(req.body.from);
        req.body.to = parseInt(req.body.to);
        if (!req.body.comment) {
            req.body.comment = "";
        }
        if (!isNaN(req.body.from) && !isNaN(req.body.to) && req.body.from <= req.body.to) {
            req.db.collection("events").insertOne({
                staffNumber: req.session.loggedin,
                fullName: req.session.name,
                team: req.session.team,
                type: "leave",
                from: req.body.from,
                to: req.body.to,
                status: "pending",
                user_comment: req.body.comment,
                manager_comment: "" 
            }, function(err, done) {
                if (err) {
                    res.send({
                        status: 500,
                        message: "The system could not contact the server. Please try again later."
                    });
                    return;
                } 
                res.send({
                    status: 200,
                    message: "Leave Request Submitted"
                });
            });
        }
        else {
            res.send({
                status: 400,
                message: "Invalid Parameters Sent"
            });
        }
    }
    else {
        res.send({
            status: 400,
            message: "Invalid Parameters Sent"
        });
    }
});

// Accept Login Details
app.post("/login/", function(req, res) {
    req.db.collection("users").findOne({
        staffNumber: req.body.staffNumber,
        password: req.body.password
    }, function(err, resp) {
        if (err) {
            res.send({
                status: 500,
                message: "The system could not contact the server. Please try again later."
            });
            return;
        } 
        if (resp) {
            req.session.loggedin = resp.staffNumber;
            req.session.team = resp.team;
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
    });
});

// Accept Logout Requests
app.post("/logout/", function(req, res) {
    req.session.destroy();
    res.sendStatus(200);
});

// Accept Leave Request Deletion Requests
app.delete("/request/", function(req, res) {
    if (req.session.loggedin) {
        if (req.body && req.body.staffNumber && req.body.from && !isNaN(parseInt(req.body.from)) && req.body.to && !isNaN(parseInt(req.body.to))) {
            req.body.from = parseInt(req.body.from);
            req.body.to = parseInt(req.body.to);
            req.db.collection("events").deleteOne({
                staffNumber: req.body.staffNumber,
                type: "leave",
                from: req.body.from,
                to: req.body.to
            }, function(err, done) {
                if (err) {
                    res.send({
                        status: 500,
                        message: "The system could not contact the server. Please try again later."
                    });
                    return;
                } 
                res.send({
                    status: 200,
                    message: "Leave Request Deleted Successfully"
                });
            });
        }
        else {
            res.send({
                status: 400,
                message: "Missing Fields"
            });
        }
    }
    else {
        res.send({
            status: 403,
            message: "Authentication Failed"
        });
    }
});

// Run Server
var server = app.listen(config.app.port, function() {
    console.log("RotaIt Client Running - Port " + config.app.port);
});