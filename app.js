// Module Imports
var express = require("express"),
    session = require("express-session"),
    expressNunjucks = require("express-nunjucks"),
    nunjucks = require("nunjucks"),
    nunjucksEnv = new nunjucks.Environment(),
    mongodb = require("express-mongo-db"),
    bodyParser = require("body-parser"),
    cookieParser = require("cookie-parser"),
    sendmail = require('sendmail')({ silent: true }),
    excel = require("excel4node"),
    config = require("./config.json"),
    package = require("./package.json");

// Setup Express App
var app = express();

// Configure Templating Engine
var njk = expressNunjucks(app, {
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

// Add Additional Date Filter for Emails
nunjucksEnv.addFilter("toDate", function(t) {
    var d = new Date(t);
    return ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear();
});

// Configure Express App
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

// Gonfigure Database
app.use(mongodb("mongodb://localhost/" + config.app.db));

// App Local Variables
app.locals = {
    version: package.version
};

// Session Local Variables
app.get("*", function(req, res, next) {
    res.locals = req.session;
    next();
});

// Get Main Page
app.get("/", function(req, res) {
    // Render Main Template
    res.render("template");
});

// Get Partial - Shifts
app.get("/partial/shifts/", function(req, res) {
    // Check User is Logged In
    if (req.session.loggedin) {
        // Get Current Date Timestamp
        var d = Date.now();
        // Get & Sort User's Shifts from Database
        req.db.collection("shifts").find({
            staffNumber: req.session.loggedin,
            provisional: false,
            start: {
                $gt: d
            }
        }, {
            sort: [["start", "ascending"]],
            limit: 5
        }, function(err, resp) {
            // Handle Database Connection Failures
            if (err) {
                res.render("partials/error", {
                    code: 500,
                    message: "The system could not contact the server. Please try again later."
                });
                return;
            } 
            // Convert Cursor to Array
            resp.toArray().then(function(shifts) {
                // Extract Week Numbers from Shifts
                var weekNumbers = shifts.map(function(x) { return x.weekNumber; }),
                    query = {};
                // Build Database Query
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
                // Get Week Data from Database
                req.db.collection("weeks").find(query, {
                    sort: [["weekNumber", "ascending"]]
                }, function(err, resp) {
                    // Handle Database Connection Failures
                    if (err) {
                        res.render("partials/error", {
                            code: 500,
                            message: "The system could not contact the server. Please try again later."
                        });
                        return;
                    } 
                    // Convert Cursor to Array
                    resp.toArray().then(function(weeks) {
                        // Get Event Data from Database
                        req.db.collection("events").find({
                            staffNumber: req.session.loggedin,
                            $and: [
                                {
                                    status: {
                                        $not: {
                                            $eq: "pending"
                                        }
                                    }
                                },
                                {
                                    status: {
                                        $not: {
                                            $eq: "rejected"
                                        }
                                    }
                                }
                            ],
                            to: {
                                $gt: d
                            }
                        }, {
                            limit: 5
                        }, function(err, resp) {
                            // Handle Database Connection Failures
                            if (err) {
                                res.render("partials/error", {
                                    code: 500,
                                    message: "The system could not contact the server. Please try again later."
                                });
                                return;
                            } 
                            // Convert Cursor to Array
                            resp.toArray().then(function(events) {
                                // Generate List of Keys
                                var days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
                                // Loop Through Shifts
                                for (var shift of shifts) {
                                    // Get Data about Shift
                                    var week = weeks[weeks.map(function(x) { return x.weekNumber; }).indexOf(shift.weekNumber)],
                                        d = new Date(shift.start),
                                        e = new Date(shift.end);
                                        day = week[days[d.getDay()]],
                                        done = false;
                                    day.openCustomers.setUTCFullYear(d.getFullYear(), d.getMonth(), d.getDate());
                                    day.closedCustomers.setUTCFullYear(d.getFullYear(), d.getMonth(), d.getDate());
                                    // Check if Shift is within Event
                                    for (var event of events) {
                                        if (d.getTime() >= event.from && e.getTime() <= (event.to + 86399999)  && (event.type == "interviewing" || event.type == "course")) {
                                            shift.type = event.type;
                                            done = true;
                                            break;
                                        }
                                    }
                                    // Determine Shift Type
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
                                // Loop Through Events
                                for (var event of events) {
                                    if (event.type != "interviewing" && event.type != "course" && event.type != "suspension") {
                                        event.start = event.from;
                                        shifts.push(event);
                                    }
                                }
                                // Sort Shifts and Events in Time Order
                                shifts.sort(function(a, b) {
                                    if (a.start < b.start) {
                                        return -1;
                                    }
                                    if (a.start > b.start) {
                                        return 1;
                                    }
                                    return 0;
                                });
                                // Limit Number of Shifts and Events Shown
                                shifts = shifts.slice(0, 5);
                                // Send Partial
                                res.render("partials/shifts", {
                                    shifts: shifts
                                });
                            });
                        });
                    });
                });
            });
        });
    }
    else {
        // Send Error Partial
        res.render("partials/error", {
            code: 403,
            message: "You are not authorised to view this page."
        });
    }
});

// Get Partial - Rota Search
app.get("/partial/rota/", function(req, res) {
    // Check User is Logged In
    if (req.session.loggedin) {
        // Send Partial
        res.render("partials/rota_search");
    }
    else {
        // Send Error Partial
        res.render("partials/error", {
            code: 403,
            message: "You are not authorised to view this page."
        });
    }
});

// Get Partial - Rota View
app.get("/partial/rota_view/", function(req, res) {
    // Check User is Logged In
    if (req.session.loggedin) {
        // Check Request Parameters are Valid
        if (req.query.week && req.query.year && !isNaN(parseInt(req.query.week)) && !isNaN(parseInt(req.query.year))) {
            // Convert Parameters to Integers
            req.query.week = parseInt(req.query.week);
            req.query.year = parseInt(req.query.year);
            // Check Request Parameters are Valid
            if (req.query.year >= 2000 && req.query.week >= 1 && req.query.week <= 53) {
                // Get User's Data from Database
                req.db.collection("users").findOne({
                    staffNumber: req.session.loggedin
                }, function(err, resp) {
                    // Handle Database Connection Failures
                    if (err) {
                        res.render("partials/error", {
                            code: 500,
                            message: "The system could not contact the server. Please try again later."
                        });
                        return;
                    } 
                    // Get and Sort Staff from Same Team as User
                    req.db.collection("users").find({
                        team: resp.team
                    }, {
                        sort: [["firstName", "ascending"]]
                    }, function(err, resp) {
                        // Handle Database Connection Failures
                        if (err) {
                            res.render("partials/error", {
                                code: 500,
                                message: "The system could not contact the server. Please try again later."
                            });
                            return;
                        } 
                        // Convert Cursor to Array
                        resp.toArray().then(function(team) {
                            // Get Week Data from Database
                            req.db.collection("weeks").findOne({
                                weekNumber: req.query.week,
                                year: req.query.year
                            }, function(err, week) {
                                // Handle Database Connection Failures
                                if (err) {
                                    res.render("partials/error", {
                                        code: 500,
                                        message: "The system could not contact the server. Please try again later."
                                    });
                                    return;
                                } 
                                // Check if Week is Published
                                if (week && week.published.indexOf(req.session.team) > -1) {
                                    // Define Limit of When a Week is in the Past
                                    var limit = new Date(1547942400000 + (parseInt((req.query.week + 1) * 604800000))).getTime() + ((parseInt(req.query.year) - 2019) * 31536000000);
                                    // Check if Week is in the Past
                                    if (limit < Date.now()) {
                                        // Prepare Array of Users
                                        var users = [];
                                        // Get Week's Shift Data from Database
                                        req.db.collection("shifts").find({
                                            weekNumber: req.query.week,
                                            year: req.query.year,
                                            team: req.session.team
                                        }, function(err, resp) {
                                            // Handle Database Connection Failures
                                            if (err) {
                                                res.render("partials/error", {
                                                    code: 500,
                                                    message: "The system could not contact the server. Please try again later."
                                                });
                                                return;
                                            } 
                                            // Convert Cursor to Array
                                            resp.toArray().then(function(shifts) {
                                                // Define Start and End Timestamps of Week
                                                var start = new Date(1547942400000 + (parseInt(req.query.week * 604800000))).getTime() + ((parseInt(req.query.year) - 2019) * 31536000000),
                                                    end = new Date(1547942400000 + (parseInt(req.query.week * 604800000) + (6 * 86400000))).getTime() + ((parseInt(req.query.year) - 2019) * 31536000000);
                                                // Get Week's Event Data from Database
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
                                                    ],
                                                    team: req.session.team
                                                }, function(err, resp) {
                                                    // Handle Database Connection Failures
                                                    if (err) {
                                                        res.render("partials/error", {
                                                            code: 500,
                                                            message: "The system could not contact the server. Please try again later."
                                                        });
                                                        return;
                                                    } 
                                                    // Convert Cursor to Array
                                                    resp.toArray().then(function(events) {
                                                        // Loop Through Shifts
                                                        for (var shift of shifts) {
                                                            // Determine if Shift's Staff Member is in User Array
                                                            if (users.map(function(x) { return x.staffNumber; }).indexOf(shift.staffNumber) === -1) {
                                                                // Add Shift's Staff Member to User Array
                                                                users.push({
                                                                    firstName: shift.fullName.split(" ")[0],
                                                                    lastName: shift.fullName.split(" ")[1],
                                                                    staffNumber: shift.staffNumber
                                                                });
                                                            }
                                                        }
                                                        // Loop Through Events
                                                        for (var event of events) {
                                                            // Determine if Event's Staff Member is in User Array
                                                            if (users.map(function(x) { return x.staffNumber; }).indexOf(event.staffNumber) === -1) {
                                                                // Add Event's Staff Member to User Array
                                                                users.push({
                                                                    firstName: event.fullName.split(" ")[0],
                                                                    lastName: event.fullName.split(" ")[1],
                                                                    staffNumber: event.staffNumber
                                                                });
                                                            }
                                                        }
                                                        // Sort Users Array Alphabetically
                                                        users.sort(function(a, b) {
                                                            if (a.firstName < b.firstName) {
                                                                return -1;
                                                            }
                                                            if (a.firstName > b.firstName) {
                                                                return 1;
                                                            }
                                                            return 0;
                                                        });
                                                        // Send Partial
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
                                        // Send Error Partial
                                        res.render("partials/rota_view", {
                                            team: team,
                                            week: week
                                        });
                                    }
                                }
                                else {
                                    // Send Error Partial
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
                // Send Error Partial
                res.render("partials/error", {
                    code: 400,
                    message: "The week number or year was invalid."
                });
            }
        }
        else {
            // Send Error Partial
            res.render("partials/error", {
                code: 400,
                message: "The week number or year was invalid."
            });
        }
    }
    else {
        // Send Error Partial
        res.render("partials/error", {
            code: 403,
            message: "Authentication with the server failed. Please try again later."
        });
    }
});

// Get Partial - View Details
app.get("/partial/details/", function(req, res) {
    // Check User is Logged In
    if (req.session.loggedin) {
        // Get User's Data from Database
        req.db.collection("users").findOne({
            staffNumber: req.session.loggedin
        }, function(err, resp) {
            // Handle Database Connection Failures
            if (err) {
                res.render("partials/error", {
                    code: 500,
                    message: "The system could not contact the server. Please try again later."
                });
                return;
            } 
            // Send Partial
            res.render("partials/details", { user: resp });
        });
    }
    else {
        // Send Error Partial
        res.render("partials/error", {
            code: 403,
            message: "You are not authorised to view this page."
        });
    }
});

// Get Partial - Leave Requests
app.get("/partial/requests/", function(req, res) {
    // Check User is Logged In
    if (req.session.loggedin) {
        // Get Current Date Timestamp
        var d = Date.now();
        // Get and Sort All Event Data from Database
        req.db.collection("events").find({
            staffNumber: req.session.loggedin,
            type: "leave",
            to: {
                $gt: d
            }
        }, {
            sort: [["firstName", "ascending"]]
        }, function(err, resp) {
            // Handle Database Connection Failures
            if (err) {
                res.render("partials/error", {
                    code: 500,
                    message: "The system could not contact the server. Please try again later."
                });
                return;
            } 
            // Convert Cursor to Array
            resp.toArray().then(function(requests) {
                res.render("partials/requests", { requests: requests });
            });
        });
    }
    else {
        // Send Error Partial
        res.render("partials/error", {
            code: 403,
            message: "You are not authorised to view this page."
        });
    }
});

// Get Partial - New Leave Request
app.get("/partial/requests_new/", function(req, res) {
    // Check User is Logged In
    if (req.session.loggedin) {
        // Send Partial
        res.render("partials/requests_new");
    }
    else {
        // Send Error Partial
        res.render("partials/error", {
            code: 403,
            message: "You are not authorised to view this page."
        });
    }
});

// Get Week Data
app.get("/week/", function(req, res) {
    // Check User is Logged In
    if (req.session.loggedin) {
        // Check Request Parameters are Valid
        if (req.query.week && req.query.year) {
            // Convert Parameters to Integers
            req.query.week = parseInt(req.query.week);
            req.query.year = parseInt(req.query.year);
            // Get Week Data from Database
            req.db.collection("weeks").findOne({
                weekNumber: req.query.week,
                year: req.query.year
            }, function(err, week) {
                // Handle Database Connection Failures
                if (err) {
                    res.send({
                        status: 500,
                        message: "The system could not contact the server. Please try again later."
                    });
                    return;
                } 
                // Send Data
                res.send({
                    status: 200,
                    week: week
                });
            });
        }
        else {
            // Send Error
            res.send({
                status: 400,
                message: "Invalid Parameters Sent"
            });
        }
    }
    else {
        // Send Error
        res.send({
            status: 403,
            message: "Authentication Failed"
        });
    }
});

// Get Rota Data
app.get("/rota/", function(req, res) {
    // Check User is Logged In
    if (req.session.loggedin) {
        // Check Request Parameters are Valid
        if (req.query.week && req.query.year) {
            // Convert Parameters to Integers
            req.query.week = parseInt(req.query.week);
            req.query.year = parseInt(req.query.year);
            // Get Shift Data from Database
            req.db.collection("shifts").find({
                weekNumber: req.query.week,
                year: req.query.year,
                team: req.session.team
            }, function(err, shifts) {
                // Handle Database Connection Failures
                if (err) {
                    res.send({
                        status: 500,
                        message: "The system could not contact the server. Please try again later."
                    });
                    return;
                } 
                // Convert Cursor to Array
                shifts.toArray().then(function(rota) {
                    // Send Data
                    res.send({
                        status: 200,
                        rota: rota
                    });
                });
            });
        }
        else {
            // Send Error
            res.send({
                status: 400,
                message: "Invalid Parameters Sent"
            });
        }
    }
    else {
        // Send Error
        res.send({
            status: 403,
            message: "Authentication Failed"
        });
    }
});

// Get Event Data
app.get("/events/", function(req, res) {
    // Check User is Logged In
    if (req.session.loggedin) {
        // Check Request Parameters are Valid
        if (req.query.week && req.query.year) {
            // Define Start and End Timestamps of Week
            var start = new Date(1547942400000 + (parseInt(req.query.week * 604800000))).getTime() + ((parseInt(req.query.year) - 2019) * 31536000000),
                end = new Date(1547942400000 + (parseInt(req.query.week * 604800000) + (6 * 86400000))).getTime() + ((parseInt(req.query.year) - 2019) * 31536000000);
            // Get Event Data from Database
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
                ],
                team: req.session.team
            }, function(err, resp) {
                // Handle Database Connection Failures
                if (err) {
                    res.send({
                        status: 500,
                        message: "The system could not contact the server. Please try again later."
                    });
                    return;
                } 
                // Convert Cursor to Array
                resp.toArray().then(function(events) {
                    // Send Data
                    res.send({
                        status: 200,
                        events: events
                    });
                });
            });
        }
        else {
            // Send Error
            res.send({
                status: 400,
                message: "Invalid Parameters Sent"
            });
        }
    }
    else {
        // Send Error
        res.send({
            status: 403,
            message: "Authentication Failed"
        });
    }
});

// Accept Rota Export Requests
app.get("/rota/export/", function(req, res) {
    // Check User is Logged In
    if (req.session.loggedin) {
        // Check Request Parameters are Valid
        if (req.query.from_week && req.query.from_year && req.query.to_week && req.query.to_year) {
            // Convert Parameters to Integers
            req.query.from_week = parseInt(req.query.from_week);
            req.query.from_year = parseInt(req.query.from_year);
            req.query.to_week = parseInt(req.query.to_week);
            req.query.to_year = parseInt(req.query.to_year);
            // Check Request Parameters are Valid
            if (!isNaN(req.query.from_week) && !isNaN(req.query.from_year) && !isNaN(req.query.to_week) && !isNaN(req.query.to_year) && req.query.from_week >= 1 && req.query.from_week <= 52 && req.query.from_year >= 2019 && req.query.to_week >= 1 && req.query.to_week <= 52 && req.query.to_year >= 2019) {
                var from = req.query.from_week + ((req.query.from_year - 2019) * 52),
                    to = req.query.to_week + ((req.query.to_year - 2019) * 52);
                // Check Request Parameters are Valid
                if (from <= to) {
                    req.db.collection("users").findOne({
                        staffNumber: req.session.loggedin
                    }, function(err, resp) {
                        // Handle Database Connection Failures
                        if (err) {
                            res.render("partials/error", {
                                code: 500,
                                message: "The system could not contact the server. Please try again later."
                            });
                            return;
                        } 
                        // Define Variables for Use in Loops
                        var users = [],
                            query = [],
                            i = req.query.from_week,
                            j = req.query.from_year;
                        // Build Database Query
                        while (i <= req.query.to_week || j < req.query.to_year) {
                            query.push({
                                weekNumber: i,
                                year: j
                            });
                            i++;
                            // Proceed to Next Year if No More Weeks
                            if (i > 52) {
                                i = 1;
                                j++;
                            }
                        }
                        // Get Week Data from Database
                        req.db.collection("weeks").find({
                            $or: query
                        }, function(err, resp) {
                            // Convert Cursor to Array
                            resp.toArray().then(function(weeks) {
                                // Get Shift Data from Database
                                req.db.collection("shifts").find({
                                    $or: query,
                                    team: req.session.team,
                                    provisional: false
                                }, function(err, resp) {
                                    // Handle Database Connection Failures
                                    if (err) {
                                        res.render("partials/error", {
                                            code: 500,
                                            message: "The system could not contact the server. Please try again later."
                                        });
                                        return;
                                    }
                                    // Convert Cursor to Array 
                                    resp.toArray().then(function(shifts) {
                                        // Define Start and End Timestamps of Week
                                        var start = new Date(1547942400000 + (parseInt(req.query.from_week * 604800000))).getTime() + ((parseInt(req.query.from_year) - 2019) * 31536000000),
                                            end = new Date(1547942400000 + (parseInt(req.query.to_week * 604800000) + (6 * 86400000))).getTime() + ((parseInt(req.query.to_year) - 2019) * 31536000000);
                                        // Get Event Data from Database
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
                                            ],
                                            team: req.session.team
                                        }, function(err, resp) {
                                            // Handle Database Connection Failures
                                            if (err) {
                                                res.render("partials/error", {
                                                    code: 500,
                                                    message: "The system could not contact the server. Please try again later."
                                                });
                                                return;
                                            }
                                            // Convert Cursor to Array
                                            resp.toArray().then(function(events) {
                                                // Loop Through Shifts
                                                for (var shift of shifts) {
                                                    // Determine if Shift's Staff Member is in User Array
                                                    if (users.map(function(x) { return x.staffNumber; }).indexOf(shift.staffNumber) === -1) {
                                                        // Add Shift's Staff Member to User Array
                                                        users.push({
                                                            firstName: shift.fullName.split(" ")[0],
                                                            lastName: shift.fullName.split(" ")[1],
                                                            staffNumber: shift.staffNumber
                                                        });
                                                    }
                                                }
                                                // Loop Through Events
                                                for (var event of events) {
                                                    // Determine if Event's Staff Member is in User Array
                                                    if (users.map(function(x) { return x.staffNumber; }).indexOf(event.staffNumber) === -1) {
                                                        // Add Event's Staff Member to User Array
                                                        users.push({
                                                            firstName: event.fullName.split(" ")[0],
                                                            lastName: event.fullName.split(" ")[1],
                                                            staffNumber: event.staffNumber
                                                        });
                                                    }
                                                }
                                                // Sort Users Array Alphabetically
                                                users.sort(function(a, b) {
                                                    if (a.firstName < b.firstName) {
                                                        return -1;
                                                    }
                                                    if (a.firstName > b.firstName) {
                                                        return 1;
                                                    }
                                                    return 0;
                                                });
                                                // Build Excel Workbook Data
                                                var workbook = new excel.Workbook({
                                                  defaultFont: {
                                                    size: 11
                                                  },
                                                  dateFormat: "dd/mm/yyyy hh:mm:ss",
                                                  workbookView: {
                                                    showSheetTabs: false
                                                  },
                                                  author: req.session.name
                                                }),
                                                    spreadsheet = workbook.addWorksheet("Rota", {
                                                        printOptions: {
                                                            centerHorizontal: true,
                                                            centerVertical: true
                                                        },
                                                        pageSetup: {
                                                            blackAndWhite: false,
                                                            fitToHeight: 1,
                                                            fitToWidth: 1,
                                                            orientation: "landscape"
                                                        },
                                                        sheetFormat: {
                                                            defaultColWidth: 9
                                                        }
                                                    }),
                                                    row = 1,
                                                    i = req.query.from_week,
                                                    j = req.query.from_year,
                                                    days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"],
                                                    styles = {
                                                        header: {
                                                            alignment: {
                                                                horizontal: "center",
                                                                vertical: "center"
                                                            },
                                                            fill: {
                                                                type: "pattern",
                                                                patternType: "solid",
                                                                fgColor: "F2F2F2"
                                                            }
                                                        },
                                                        user: {
                                                            fill: {
                                                                type: "pattern",
                                                                patternType: "solid",
                                                                fgColor: "F2F2F2"
                                                            }
                                                        },
                                                        early: {
                                                            alignment: {
                                                                horizontal: "center"
                                                            },
                                                            fill: {
                                                                type: "pattern",
                                                                patternType: "solid",
                                                                fgColor: "FFFF97"
                                                            }
                                                        },
                                                        middle: {
                                                            alignment: {
                                                                horizontal: "center"
                                                            },
                                                            fill: {
                                                                type: "pattern",
                                                                patternType: "solid",
                                                                fgColor: "FFD797"
                                                            }
                                                        },
                                                        late: {
                                                            alignment: {
                                                                horizontal: "center"
                                                            },
                                                            fill: {
                                                                type: "pattern",
                                                                patternType: "solid",
                                                                fgColor: "F8BACC"
                                                            }
                                                        },
                                                        leave: {
                                                            alignment: {
                                                                horizontal: "center"
                                                            },
                                                            fill: {
                                                                type: "pattern",
                                                                patternType: "solid",
                                                                fgColor: "BBDEFB"
                                                            }
                                                        },
                                                        medical: {
                                                            alignment: {
                                                                horizontal: "center"
                                                            },
                                                            fill: {
                                                                type: "pattern",
                                                                patternType: "solid",
                                                                fgColor: "D29DDB"
                                                            }
                                                        },
                                                        suspension: {
                                                            alignment: {
                                                                horizontal: "center"
                                                            },
                                                            fill: {
                                                                type: "pattern",
                                                                patternType: "solid",
                                                                fgColor: "F44336"
                                                            }
                                                        },
                                                        admin: {
                                                            alignment: {
                                                                horizontal: "center"
                                                            },
                                                            fill: {
                                                                type: "pattern",
                                                                patternType: "solid",
                                                                fgColor: "A9D08E"
                                                            }
                                                        },
                                                        elsewhere: {
                                                            alignment: {
                                                                horizontal: "center"
                                                            },
                                                            fill: {
                                                                type: "pattern",
                                                                patternType: "solid",
                                                                fgColor: "808080"
                                                            }
                                                        }
                                                    };

                                                spreadsheet.column(1).setWidth(18);
                                                // Loop Through Each Week in Selection
                                                while (i <= req.query.to_week || j < req.query.to_year) {
                                                    // Store Where Headers for Week End
                                                    var first = row;
                                                    // Define First Row Headers (Week Number & Days)
                                                    spreadsheet.cell(row, 1, row, 16).style({ border: { top: { style: "thick" } } });
                                                    spreadsheet.cell(row, 1, row, 2, true).string("Week " + i).style(styles.header).style({ border: { right: { style: "thick" }, bottom: { style: "thin" }, left: { style: "thick" } } });
                                                    spreadsheet.cell(row, 3, row, 4, true).string("Sunday").style(styles.header).style({ border: { right: { style: "thick" }, bottom: { style: "thin" } } });
                                                    spreadsheet.cell(row, 5, row, 6, true).string("Monday").style(styles.header).style({ border: { right: { style: "thick" }, bottom: { style: "thin" } } });
                                                    spreadsheet.cell(row, 7, row, 8, true).string("Tuesday").style(styles.header).style({ border: { right: { style: "thick" }, bottom: { style: "thin" } } });
                                                    spreadsheet.cell(row, 9, row, 10, true).string("Wednesday").style(styles.header).style({ border: { right: { style: "thick" }, bottom: { style: "thin" } } });
                                                    spreadsheet.cell(row, 11, row, 12, true).string("Thursday").style(styles.header).style({ border: { right: { style: "thick" }, bottom: { style: "thin" } } });
                                                    spreadsheet.cell(row, 13, row, 14, true).string("Friday").style(styles.header).style({ border: { right: { style: "thick" }, bottom: { style: "thin" } } });
                                                    spreadsheet.cell(row, 15, row, 16, true).string("Saturday").style(styles.header).style({ border: { right: { style: "thick" }, bottom: { style: "thin" } } });
                                                    row++;
                                                    // Define Second Row Headers (Name, Staff Number & Dates)
                                                    var d = new Date(new Date(1547942400000 + (parseInt(i * 604800000))).getTime() + ((parseInt(j) - 2019) * 31536000000));
                                                    spreadsheet.cell(row, 1, row + 1, 1, true).string("Name").style(styles.header).style({ border: { bottom: { style: "thick" }, right: { style: "thin" }, left: { style: "thick" } } });
                                                    spreadsheet.cell(row, 2, row + 1, 2, true).string("Staff No.").style(styles.header).style({ border: { bottom: { style: "thick" }, right: { style: "thick" } } });
                                                    for (var n = 2; n <= 14; n += 2) {
                                                        spreadsheet.cell(row, n + 1, row, n + 2, true).string(("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear()).style(styles.header).style({ border: { right: { style: "thick" }, bottom: { style: "thin" } } });
                                                        d.setDate(d.getDate() + 1);
                                                    }
                                                    row++;
                                                    // Define Third Row Headers (In & Out)
                                                    for (var n = 2; n <= 14; n += 2) {
                                                        spreadsheet.cell(row, n + 1).string("In").style(styles.header).style({ border: { bottom: { style: "thick" }, left: { style: "thick" }, right: { style: "thin" } } });
                                                        spreadsheet.cell(row, n + 2).string("Out").style(styles.header).style({ border: { bottom: { style: "thick" }, right: { style: "thick" } } });
                                                    }
                                                    row++;
                                                    // Define Variables for Use in Loops
                                                    var m = 0,
                                                        border = "thin",
                                                        changed;
                                                    // Loop Through Each Staff Member
                                                    for (var user of users) {
                                                        // Set Flag if Any Data is Shown for User
                                                        changed = false;
                                                        // Generate Thick Border Every 4 Staff Members
                                                        if (m === 3) {
                                                            border = "thick";
                                                        }
                                                        else {
                                                            border = "thin";
                                                        }
                                                        // Show Full Name
                                                        spreadsheet.cell(row, 1).string(user.firstName + " " + user.lastName).style(styles.user).style({ border: { bottom: { style: border }, right: { style: "thin" }, left: { style: "thick" } } });
                                                        // Show Staff Number
                                                        spreadsheet.cell(row, 2).string(user.staffNumber).style(styles.user).style({ border: { bottom: { style: border }, right: { style: "thick" } } });
                                                        // Loop Through Each Day (2 Columns)
                                                        var col = 1;
                                                        for (var n = 0; n < 7; n++) {
                                                            col = col + 2;
                                                            // Define Key Date Information
                                                            var start = new Date(new Date(1547942400000 + (parseInt(i * 604800000))).getTime() + (n * 86400000) + ((parseInt(j) - 2019) * 31536000000)),
                                                                end = new Date(start),
                                                                week = weeks[weeks.map(function(x) { return x.weekNumber; }).indexOf(i)],
                                                                values = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                                                            end.setUTCHours(23, 59, 59);
                                                            // Set Thin Border Between In & Out Boxes, and Thick Border between Days
                                                            spreadsheet.cell(row, col).style({ border: { bottom: { style: border }, right: { style: "thin" } } });
                                                            spreadsheet.cell(row, col + 1).style({ border: { bottom: { style: border }, right: { style: "thick" } } });
                                                            // Handle Days Where Store is Closed
                                                            if (week[days[n]].closed === true) {
                                                                // Show (C) in Header
                                                                spreadsheet.cell(first, col, first, col + 1, true).string(values[n] + " (C)");
                                                                // Show Hashed Background in Cells
                                                                spreadsheet.cell(row, col).style({ 
                                                                    fill: {
                                                                        type: "pattern",
                                                                        patternType: "darkUp"
                                                                    } 
                                                                });
                                                                spreadsheet.cell(row, col + 1).style({ 
                                                                    fill: {
                                                                        type: "pattern",
                                                                        patternType: "darkUp"
                                                                    } 
                                                                });
                                                                // Proceed to Next Day
                                                                continue;
                                                            }
                                                            if (week[days[n]].bankHoliday === true) {
                                                                // Show (BH) in Header
                                                                spreadsheet.cell(first, col, first, col + 1, true).string(values[n] + " (BH)");
                                                            }
                                                            // Loop Through Shifts
                                                            for (var shift of shifts) {
                                                                // Determine if Shift is Within Current Day
                                                                if (shift.start > start.getTime() && shift.end < end.getTime() && shift.staffNumber == user.staffNumber) {
                                                                    // Define Key Date Information
                                                                    var s = new Date(shift.start),
                                                                        e = new Date(shift.end),
                                                                        style;
                                                                    s.setUTCFullYear(1970, 0, 1);
                                                                    e.setUTCFullYear(1970, 0, 1);
                                                                    // Set Cell Style Based on Shift Type
                                                                    if (n === 0) {
                                                                        style = styles.middle;
                                                                    }
                                                                    else if (s.getTime() <= week[days[n]].openCustomers.getTime()) {
                                                                        style = styles.early;
                                                                    }
                                                                    else if (e.getTime() >= week[days[n]].closedCustomers.getTime()) {
                                                                        style = styles.late;
                                                                    }
                                                                    else {
                                                                        style = styles.middle;
                                                                    }
                                                                    // Set Cell Values to Times
                                                                    spreadsheet.cell(row, col).string(("0" + s.getUTCHours()).slice(-2) + ":" + ("0" + (s.getUTCMinutes())).slice(-2)).style(style);
                                                                    spreadsheet.cell(row, col + 1).string(("0" + e.getUTCHours()).slice(-2) + ":" + ("0" + (e.getUTCMinutes())).slice(-2)).style(style);
                                                                    // Set Flag to Show Data Displayed for User
                                                                    changed = true;
                                                                }
                                                            }
                                                            // Loop Through Events
                                                            for (var event of events) {
                                                                // Determine if Event is Within Current Day
                                                                if (start.getTime() >= event.from && start.getTime() <= event.to && event.staffNumber == user.staffNumber) {
                                                                    var style;
                                                                    // Set Cell Style Based on Event Type
                                                                    if (event.type == "interviewing" || event.type == "course") {
                                                                        style = styles.admin;
                                                                    }
                                                                    if (event.type == "sickness" || event.type == "maternity" || event.type == "paternity") {
                                                                        style = styles.medical;
                                                                    }
                                                                    if (event.type == "leave" && (event.status == "approved" || event.status == "fixed")) {
                                                                        style = styles.leave;
                                                                    }
                                                                    if (event.type == "suspension") {
                                                                        style = styles.suspension;
                                                                    }
                                                                    if (event.type == "elsewhere") {
                                                                        style = styles.elsewhere;
                                                                    }
                                                                    spreadsheet.cell(row, col).style(style);
                                                                    spreadsheet.cell(row, col + 1).style(style);
                                                                    // Set Flag to Show Data Displayed for User
                                                                    changed = true;
                                                                }
                                                            }
                                                        }
                                                        // Check if Data is Displayed for User
                                                        if (changed) {
                                                            // Increment Counter to Manage Thick Borders
                                                            m++;
                                                            if (m > 3) {
                                                                m = 0;
                                                            }
                                                        }
                                                        else {
                                                            // Hide Row
                                                            spreadsheet.row(row).hide();
                                                        }
                                                        row++;
                                                    }
                                                    // Add Thick Border to Bottom of Week
                                                    spreadsheet.cell(row, 1, row, 16).style({ border: { top: { style: "thick" } } });
                                                    i++;
                                                    // Proceed to Next Year if No More Weeks
                                                    if (i > 52) {
                                                        i = 1;
                                                        j++;
                                                    }
                                                    row++;
                                                }
                                                // Set Worksheet Print Area
                                                spreadsheet.setPrintArea(1, 1, row, 16);
                                                // Export Excel Spreadsheet
                                                workbook.write("Rota.xlsx", res);
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                }
                else {
                    // Send Error
                    res.send({
                        status: 400,
                        message: "Invalid Parameters Sent"
                    });
                }
            }
            else {
                // Send Error
                res.send({
                    status: 400,
                    message: "Invalid Parameters Sent"
                });
            }
        }
        else {
            // Send Error
            res.send({
                status: 400,
                message: "Invalid Parameters Sent"
            });
        }
    }
    else {
        // Send Error
        res.send({
            status: 403,
            message: "Authentication Failed"
        });
    }
});

// Handle 404 Errors
app.get("*", function(req, res) {
    // Redirect Back to Root Page
    res.redirect("/");
});

// Accept New Leave Requests
app.post("/requests/", function(req, res) {
    // Check User is Logged In
    if (req.session.loggedin) {
        // Check Request Parameters are Valid
        if (req.body.from && req.body.to) {
            // Convert Parameters to Integers
            req.body.from = parseInt(req.body.from);
            req.body.to = parseInt(req.body.to);
            // Handle Missing Comments
            if (!req.body.comment) {
                req.body.comment = "";
            }
            // Check Request Parameters are Valid
            if (!isNaN(req.body.from) && !isNaN(req.body.to) && req.body.from <= req.body.to) {
                // Add Event Data Object to Database 
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
                    // Handle Database Connection Failures
                    if (err) {
                        res.send({
                            status: 500,
                            message: "The system could not contact the server. Please try again later."
                        });
                        return;
                    } 
                    // Get User's Data from Database
                    req.db.collection("users").findOne({
                        staffNumber: req.session.loggedin
                    }, function(err, user) {
                        // Handle Database Connection Failures
                        if (err) {
                            res.send({
                                status: 500,
                                message: "The system could not contact the server. Please try again later."
                            });
                            return;
                        } 
                        // Get Team Data from Database
                        req.db.collection("users").find({
                            team: user.team
                        }, function(err, resp) {
                            // Handle Database Connection Failures
                            if (err) {
                                res.send({
                                    status: 500,
                                    message: "The system could not contact the server. Please try again later."
                                });
                                return;
                            }
                            // Convert Cursor to Array
                            resp.toArray().then(function(team) {
                                // Loop Through Team
                                for (var member of team) {
                                    // Check if Staff Member is a Manager
                                    if (member.manager === true) {
                                        // Check if Emails are Enabled
                                        if (config.app.emails === true) {
                                            // Send Email to Manager
                                            sendmail({
                                                from: "RotaIt Notifier <no-reply@rotait.xyz>",
                                                to: member.email,
                                                subject: "New annual leave request from " + req.session.name + ".",
                                                html: nunjucksEnv.render("./emails/request.html", { firstName: member.firstName, user: req.session.name, from: req.body.from, to: req.body.to, new: true })
                                            });
                                        }
                                    }
                                }
                                // Send Success Response
                                res.send({
                                    status: 200,
                                    message: "Leave Request Submitted"
                                });
                            });
                        });
                    });
                });
            }
            else {
                // Send Error
                res.send({
                    status: 400,
                    message: "Invalid Parameters Sent"
                });
            }
        }
        else {
            // Send Error
            res.send({
                status: 400,
                message: "Invalid Parameters Sent"
            });
        }
    }
    else {
        // Send Error
        res.send({
            status: 403,
            message: "Authentication Failed"
        });
    }
});

// Accept Login Details
app.post("/login/", function(req, res) {
    // Search for Given Login Details in Database
    req.db.collection("users").findOne({
        staffNumber: req.body.staffNumber,
        password: req.body.password
    }, function(err, resp) {
        // Handle Database Connection Failures
        if (err) {
            res.send({
                status: 500,
                message: "The system could not contact the server. Please try again later."
            });
            return;
        } 
        // Check if Results Found
        if (resp) {
            // Set Session Headers
            req.session.loggedin = resp.staffNumber;
            req.session.team = resp.team;
            req.session.name = resp.firstName + " " + resp.lastName;
            // Send Success Response
            res.send({
                status: 200,
                message: "Login Successful"
            });
        }
        else {
            // Send Error
            res.send({
                status: 404,
                message: "User Account Not Found"
            });
        }
    });
});

// Accept Logout Requests
app.post("/logout/", function(req, res) {
    // Destroy Session Data
    req.session.destroy();
    // Send Success Response
    res.sendStatus(200);
});

// Accept Leave Request Deletion Requests
app.delete("/request/", function(req, res) {
    // Check User is Logged In
    if (req.session.loggedin) {
        // Check Request Parameters are Valid
        if (req.body && req.body.staffNumber && req.body.from && !isNaN(parseInt(req.body.from)) && req.body.to && !isNaN(parseInt(req.body.to))) {
            // Convert Parameters to Integers
            req.body.from = parseInt(req.body.from);
            req.body.to = parseInt(req.body.to);
            // Delete Event Data from Database
            req.db.collection("events").deleteOne({
                staffNumber: req.body.staffNumber,
                type: "leave",
                from: req.body.from,
                to: req.body.to
            }, function(err, done) {
                // Handle Database Connection Failures
                if (err) {
                    res.send({
                        status: 500,
                        message: "The system could not contact the server. Please try again later."
                    });
                    return;
                }
                // Get User's Data from Database
                req.db.collection("users").findOne({
                    staffNumber: req.session.loggedin
                }, function(err, user) {
                    // Handle Database Connection Failures
                    if (err) {
                        res.send({
                            status: 500,
                            message: "The system could not contact the server. Please try again later."
                        });
                        return;
                    } 
                    // Get Team Data from Database
                    req.db.collection("users").find({
                        team: user.team
                    }, function(err, resp) {
                        // Handle Database Connection Failures
                        if (err) {
                            res.send({
                                status: 500,
                                message: "The system could not contact the server. Please try again later."
                            });
                            return;
                        }
                        // Convert Cursor to Array
                        resp.toArray().then(function(team) {
                            // Loop Through Team
                            for (var member of team) {
                                // Check if Staff Member is a Manager
                                if (member.manager === true) {
                                    // Check if Emails are Enabled
                                    if (config.app.emails === true) {
                                        // Send Email to Manager
                                        sendmail({
                                            from: "RotaIt Notifier <no-reply@rotait.xyz>",
                                            to: member.email,
                                            subject: "Withdrawn annual leave request from " + req.session.name + ".",
                                            html: nunjucksEnv.render("./emails/request.html", { firstName: member.firstName, user: req.session.name, from: req.body.from, to: req.body.to, new: false })
                                        });
                                    }
                                }
                            }
                            // Send Success Response
                            res.send({
                                status: 200,
                                message: "Leave Request Deleted Successfully"
                            });
                        });
                    });
                }); 
            });
        }
        else {
            // Send Error
            res.send({
                status: 400,
                message: "Missing Fields"
            });
        }
    }
    else {
        // Send Error
        res.send({
            status: 403,
            message: "Authentication Failed"
        });
    }
});

// Run Server
var server = app.listen(config.app.port, function() {
    // Send Startup Message to Console
    console.log("RotaIt Client Running - Port " + config.app.port);
});