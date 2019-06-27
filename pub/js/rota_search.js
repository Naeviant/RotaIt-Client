// Unbind Events Later in Script
$("#search").off("click");
$(document).off("keypress");
$(document).off("ready");

// Handle Search Button
$("#search").click(function() {
    // Get Data from User Inputs
    var week = $("#week").val(),
        year = $("#year").val();

    // Check Parameters are Valid
    if (week && year) {
        // Get Partial HTML from Server
        $.get("/partial/rota_view", {
            week: week,
            year: year
        }, function(res) {
            // Fade Out Page Content
            $("#content").fadeOut("fast", function() {
                // Change Page Content HTML
                $("#content").html(res);
                // Initialise Materialize Elements
                M.AutoInit();
                // Update All Text Fields
                M.updateTextFields();
                // Fade in Page Content
                $("#content").fadeIn("fast", function() {
                    // Prevent Page Overflow
                    stopOverflow();
                });
            });
        });
    }
    else {
        // Produce Error Message in Toast
        M.toast({
            html: "Please enter a week number and year."
        });
    }
});

// Allow User to Press Enter Key Instead of Search Button
$(document).on("keypress", function(e) {
    if (e.which == 13) {
        $("#search").click();
    }
});

// Show Current Week Number & Year by Default
$(document).ready(function() {
    // Define Useful Variables for Loop
    var d = new Date(),
        w = 0,
        y = 0;
    d.setUTCHours(0);
    d.setUTCMinutes(0);
    d.setUTCSeconds(0);
    d.setUTCMilliseconds(0);
    // Set Upper Bound for Loop (Milliseconds Since 01/01/2019 00:00:00.000)
    var n = d.getTime() - 1547942400000;
    while (n >= 604800000) {
        // Remove One Day from Timestamp
        n -= 604800000;
        // Increment Week number
        w += 1;
        // Proceed to Next Year if No More Weeks
        if (w > 52) {
            // Reset Week Number
            w = 1;
            // Increment Year Number
            y += 1;
        }
    }
    
    // Set Values for Input Fields
    $("#week").val(w);
    $("#year").val(2019 + y);
    // Update All Text Fields
    M.updateTextFields();
});