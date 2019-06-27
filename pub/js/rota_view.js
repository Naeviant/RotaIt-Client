// Unbind Events Later in Script
$(document).off("ready");
$("#previous").off("click");
$("#next").off("click");

// Colour Rota Cells and Enable/Disable Inputs
function colour() {
    // Get Week Data from Server
    $.get("/week/", {
        week: $("#header").data("week"),
        year: $("#header").data("year")
    }, function(res) {
        // Check Request was Successful
        if (res.status === 200) {
            // Get Event Data from Server
            $.get("/events/", {
                week: $("#header").data("week"),
                year: $("#header").data("year")
            }, function(resp) {
                // Check Request was Successful
                if (resp.status === 200) {
                    // Define Keys of Week Object in Array
                    var keys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
                    // Remove All Existing Colours
                    $("#rota tbody tr td").removeClass("yellow orange pink green purple blue red grey black hashed lighten-5");
                    // Loop Through Each Day
                    for (var j = 0; j < 7; j++) {
                        // Remove Existing Header Labels
                        $("#rota thead tr:nth-of-type(1) td:nth-of-type(" + (j + 2) + ")").html($("#rota thead tr:nth-of-type(1) td:nth-of-type(" + (j + 2) + ")").html().replace("(BH)", ""));
                        $("#rota thead tr:nth-of-type(1) td:nth-of-type(" + (j + 2) + ")").html($("#rota thead tr:nth-of-type(1) td:nth-of-type(" + (j + 2) + ")").html().replace("(C)", ""));
                        // Check if Day is a Bank Holiday
                        if (res.week[keys[j]].bankHoliday === true) {
                            // Add (BH) Label to Header
                            $("#rota thead tr:nth-of-type(1) td:nth-of-type(" + (j + 2) + ")").html($("#rota thead tr:nth-of-type(1) td:nth-of-type(" + (j + 2) + ")").html() + " (BH)");
                        }
                        // Check if Store is Closed on Day
                        if (res.week[keys[j]].closed === true) {
                            // Add (C) Label to Header
                            $("#rota thead tr:nth-of-type(1) td:nth-of-type(" + (j + 2) + ")").html($("#rota thead tr:nth-of-type(1) td:nth-of-type(" + (j + 2) + ")").html() + " (C)");
                            // Maintain Cell Sizes
                            $("#rota tbody td:nth-of-type(" + ((2 * j) + 2) + ")").html("--:--");
                            $("#rota tbody td:nth-of-type(" + ((2 * j) + 3) + ")").html("--:--");
                            $("#rota tbody td:nth-of-type(" + ((2 * j) + 2) + ")").attr("style", "text-indent: 100%; white-space: nowrap; overflow: hidden;");
                            $("#rota tbody td:nth-of-type(" + ((2 * j) + 3) + ")").attr("style", "text-indent: 100%; white-space: nowrap; overflow: hidden;");
                            // Colour Cells Hashed Black for Day
                            $("#rota tbody td:nth-of-type(" + ((2 * j) + 2) + ")").addClass("hashed black");
                            $("#rota tbody td:nth-of-type(" + ((2 * j) + 3) + ")").addClass("hashed black");
                        }
                    }
                    // Loop Through Each Row of Table
                    $("#rota tbody tr").each(function(i) {
                        // Get Staff Number from Current Row
                        var staffNumber = $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(1)").html().split(" <br> ")[1];

                        // Loop Through Each Day
                        for (var event of resp.events) {
                            // Loop Through Days
                            for (var j = 1; j <= 7; j++) {
                                // Define Timestamp for Current Day
                                var boundary = new Date(Date.UTC(parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + j + ")").html().split("/")[2]), parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + j + ")").html().split("/")[1]) - 1, parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + j + ")").html().split("/")[0]))).getTime();
                                // Check if Day is Within Event Dates
                                if (boundary >= event.from && boundary <= event.to && event.staffNumber == staffNumber) {
                                    // Check if Event is Administrative
                                    if (event.type == "interviewing" || event.type == "course") {
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 2) + ")").addClass("green lighten-5");
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 2 + 1) + ")").addClass("green lighten-5");
                                    }
                                    // Check if Event is Sickess or Maternity/Paternity Leave
                                    if (event.type == "sickness" || event.type == "maternity" || event.type == "paternity") {
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 2) + ")").addClass("hashed purple");
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 2 + 1) + ")").addClass("hashed purple");
                                    }
                                    // Check if Event is Approved Annual Leave
                                    if (event.type == "leave" && (event.status == "approved" || event.status == "fixed")) {
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 2) + ")").addClass("hashed blue");
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 2 + 1) + ")").addClass("hashed blue");
                                    }
                                    // Check if Event is a Suspension
                                    if (event.type == "suspension") {
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 2) + ")").addClass("hashed red");
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 2 + 1) + ")").addClass("hashed red");
                                    }
                                    // Check if Event is Working Elsewhere
                                    if (event.type == "elsewhere") {
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 2) + ")").addClass("hashed black");
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j * 2 + 1) + ")").addClass("hashed black");
                                    }
                                }
                            }
                        }
                        var n = 0;
                        // Loop Through Each Column of Row
                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td").each(function(j) {
                            // Ignore First (Name and Staff Number)
                            if (j === 0) {
                                return true;
                            }
                            // Work Out Current Day as String
                            var today = keys[new Date(Date.UTC(parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[2]), parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[1]) - 1, parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[0]))).getDay()];
                            // Handle Sundays
                            if (today == "sun") {
                                // Focus on 2nd (Out) Cell
                                if (j % 2 === 0) {
                                    // Check for Valid Values in All Cells
                                    if ($("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j) + ")").html().trim() && $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ")").html().trim()) {
                                        // Check if Cells are Already Coloured
                                        if (!$("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j) + ")").hasClass("lighten-5") && !$("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ")").hasClass("lighten-5")) {
                                            // Colour Cells Orange for Staff Member for Day
                                            $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j) + ")").addClass("orange lighten-5");
                                            $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ")").addClass("orange lighten-5");
                                        }
                                    }
                                    // Proceed to Next Day
                                    n++;
                                }
                                // Proceed to Next Iteration
                                return true;
                            }
                            // Work Out Contents of Cell
                            if (j % 2 === 1) {
                                // Get Shift Start and Store Opening Time6 for Day
                                var start = new Date(Date.UTC(parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[2]), parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[1]) - 1, parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[0]), parseInt($("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ")").html().split(":")[0]), parseInt($("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ")").html().split(":")[1]))).getTime(),
                                    open = new Date(Date.UTC(parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[2]), parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[1]) - 1, parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[0]))).getTime() + new Date(res.week[today]["openCustomers"]).getTime();
                                // Check if the Shift Starts at or Before Store Opening
                                if (start <= open) {
                                    // Check for Valid Values in All Cells
                                    if ($("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ")").html().trim() && $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 2) + ")").html().trim()) {
                                        // Colour Cells Yellow for Staff Member for Day
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ")").addClass("yellow lighten-5");
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 2) + ")").addClass("yellow lighten-5");
                                    }
                                }
                            }
                            else if (j % 2 === 0) {
                                // Get Shift End and Store Closing Time for Day
                                var end = new Date(Date.UTC(parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[2]), parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[1]) - 1, parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[0]), parseInt($("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ")").html().split(":")[0]), parseInt($("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ")").html().split(":")[1]))).getTime(),
                                    closed = new Date(Date.UTC(parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[2]), parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[1]) - 1, parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + (n + 1) + ")").html().split("/")[0]))).getTime() + new Date(res.week[today]["closedCustomers"]).getTime();
                                // Check if the Shift Ends at or After Store Closing
                                if (end >= closed) {
                                    // Check for Valid Values in All Cells
                                    if ($("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j) + ")").html().trim() && $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ")").html().trim()) {
                                        // Colour Cells Pink for Staff Member for Day
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j) + ")").addClass("pink lighten-5");
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ")").addClass("pink lighten-5");
                                    }
                                }
                                // Check for Valid Values in All Cells
                                if ($("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j) + ")").html().trim() && $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ")").html().trim() && $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ")").html().trim()) {
                                    // Check if Cells are Already Coloured
                                    if (!$("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j) + ")").hasClass("lighten-5") && !$("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ")").hasClass("lighten-5")) {
                                        // Colour Cells Orange for Staff Member for Day
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j) + ")").addClass("orange lighten-5");
                                        $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + (j + 1) + ")").addClass("orange lighten-5");
                                    }
                                }
                                // Proceed to Next Day
                                n++;
                            }
                        });
                    });
                }
            });

        }
        else {
            // Produce Error Message in Toast
            M.toast({
                html: "An unknown error occurred. The existing rota could not be fully loaded."
            });
        }
    });
}

// Initialise Rota
$(document).ready(function() {
    // Loop Through Header Cells
    $("#rota thead tr:nth-of-type(2) td").each(function(i) {
        // Work Out Date Cell Represents
        var d = new Date(1547942400000 + (parseInt($("#header").data("week")) * 604800000) + ((parseInt($("#header").data("year")) - 2019) * 31536000000) - (Math.floor((parseInt($("#header").data("year")) - 2016) / 4) * 86400000) + (i * 86400000));
        // Show Date in Cell Header
        $(this).html(("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear());
    });
    // Get Rota Data from Server
    $.get("/rota/", {
        week: $("#header").data("week"),
        year: $("#header").data("year")
    }, function(res) {
        // Check Request was Successful
        if (res.status === 200) {
            // Loop Through Each Row of Table
            $("#rota tbody tr").each(function(i) {
                // Get Data from HTML
                var staffNumber = $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(1)").html().split(" <br> ")[1],
                    shifts = res.rota.filter(function(x) { return x.staffNumber == staffNumber; });

                // Loop Through Each Day
                for (var j = 1; j <= 7; j++) {
                    // Define Start and End Timestamps of Day
                    var lower = new Date(Date.UTC(parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + j + ")").html().split("/")[2]), parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + j + ")").html().split("/")[1]) - 1, parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + j + ")").html().split("/")[0]))).getTime();
                    var higher = new Date(Date.UTC(parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + j + ")").html().split("/")[2]), parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + j + ")").html().split("/")[1]) - 1, parseInt($("#rota thead tr:nth-of-type(2) td:nth-of-type(" + j + ")").html().split("/")[0]), 23, 59, 59)).getTime();
                    // Loop Through Shifts
                    for (var shift of shifts) {
                        // Check if Shift Falls within Day
                        if (shift.start > lower && shift.start < higher) {
                            // Populate Cells with Shift Data
                            $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + ((2 * j)) + ")").html(("0" + new Date(shift.start).getUTCHours()).slice(-2) + ":" + ("0" + new Date(shift.start).getUTCMinutes()).slice(-2));
                            $("#rota tbody tr:nth-of-type(" + (i + 1) + ") td:nth-of-type(" + ((2 * j) + 1) + ")").html(("0" + new Date(shift.end).getUTCHours()).slice(-2) + ":" + ("0" + new Date(shift.end).getUTCMinutes()).slice(-2));
                        }
                    }
                }
            });
            // Colour Rota Cells
            colour();
            // Remove Loading Circle
            $("#loading").fadeOut("fast", function() {
                // Show Rota
                $("#wrapper").fadeIn();
                // Prevent Page Overflow
                stopOverflow();
            });
        }
        else {
            // Produce Error Message in Toast
            M.toast({
                html: "An unknown error occurred. The existing rota could not be fully loaded."
            });
        }
    });
});

// Handle Previous Week Button
$("#previous").click(function() {
    // Get Data from HTML
    var week = $("#header").data("week") - 1,
        year = $("#header").data("year");

    // Check if Week Number is Too Low
    if (week < 1) {
        // Reset Week Number to 52
        week = 52;
        // Decrement Year
        year -= 1;
    }

    // Get Partial HTML from Server
    $.get("/partial/rota_view", {
        week: week,
        year: year
    }, function(res) {
        // Fade Out Page Content
        $("#content").fadeOut("fast", function() {
            // Change Page Content HTML
            $("#content").html(res);
            // Destroy All Tooltips on Page
            $('.material-tooltip').remove();
            // Initialise Materialize Elements
            M.AutoInit();
            // Fade in Page Content
            $("#content").fadeIn("fast", function() {
                // Prevent Page Overflow
                stopOverflow();
            });
        });
    });
});

// Handle Next Week Button
$("#next").click(function() {
    // Get Data from HTML
    var week = $("#header").data("week") + 1,
        year = $("#header").data("year");

    // Check if Week Number is Too High
    if (week > 52) {
        // Reset Week Number to 1
        week = 1;
        // Increment Year
        year += 1;
    }

    // Get Partial HTML from Server
    $.get("/partial/rota_view", {
        week: week,
        year: year
    }, function(res) {
        // Fade Out Page Content
        $("#content").fadeOut("fast", function() {
            // Change Page Content HTML
            $("#content").html(res);
            // Destroy All Tooltips on Page
            $('.material-tooltip').remove();
            // Initialise Materialize Elements
            M.AutoInit();
            // Fade in Page Content
            $("#content").fadeIn("fast", function() {
                // Prevent Page Overflow
                stopOverflow();
            });
        });
    });
});

// Handle Export Button
$("#export").click(function() {
    // Get Data from Input Values
    var from_week = $("#export-from-week").val(),
        from_year = $("#export-from-year").val(),
        to_week = $("#export-to-week").val(),
        to_year = $("#export-to-year").val();

    // Check Parameters are Valid
    if (from_week && from_year && to_week && to_year && !isNaN(from_week) && !isNaN(from_year) && !isNaN(to_week) && !isNaN(to_year) && from_week >= 1 && from_week <= 52 && from_year >= 2019 && to_week >= 1 && to_week <= 52 && to_year >= 2019) {
        // Open Download Popup
        window.open("/rota/export?from_week=" + from_week + "&from_year=" + from_year + "&to_week=" + to_week + "&to_year=" + to_year);
    }
    else {
        // Produce Error Message in Toast
        M.toast({
            html: "Please fill out all fields with valid values."
        });
    }
});