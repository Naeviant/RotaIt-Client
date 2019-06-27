// Unbind Events Later in Script
$(document).undelegate("#new-request", "click");
$(document).undelegate("#view-request", "click");
$(document).undelegate("#delete-request", "click");

// Handle New Request Button
$(document).delegate("#new-request", "click", function() {
    // Get Partial HTML from Server
    $.get("/partial/requests_new", function(res) {
        // Fade Out Page Content
        $("#content").fadeOut("fast", function() {
            // Change Page Content HTML
            $("#content").html(res);
            // Destroy All Tooltips on Page
            $('.material-tooltip').remove();
            // Initialise Materialize Elements
            M.AutoInit();
            // Format Date Pickers
            $('.datepicker').datepicker({
                format: "ddd dd mmm yyyy"
            });
            // Update All Text Fields
            M.updateTextFields();
            // Fade in Page Content
            $("#content").fadeIn("fast", function() {
                // Prevent Page Overflow
                stopOverflow();
            });
        });
    });
});

// Handle View Request Button
$(document).delegate("#view-request", "click", function() {
    // Set Metadata of Delete Request Button
    $("#delete-request").data("user", $(this).data("user"));
    $("#delete-request").data("from", $(this).data("from"));
    $("#delete-request").data("to", $(this).data("to"));
    // Show User's Comments in Popup
    if ($(this).data("mycomments")) {
        $("#my-comments").html($(this).data("mycomments"));
    }
    else {
        $("#my-comments").html("<em>None</em>");
    }
    // Show Manager's Comments in Popup 
    if ($(this).data("managercomments")) {
        $("#manager-comments").html($(this).data("managercomments"));
    }
    else {
        $("#manager-comments").html("<em>None</em>");
    }
    // Open Popup
    $("#modal-request").modal("open");
});

// Handle Delete Request Button
$(document).delegate("#delete-request", "click", function() {
    // Get Data from HTML
    var from = $(this).data("from"),
        to = $(this).data("to");

    // Send Event Data to Server
    $.ajax({
        url: "/request/",
        type: "DELETE",
        data: {
            staffNumber: $(this).data("user"),
            from: from,
            to: to
        },
        success: function(res) {
            // Produce Result Message in Toast
            switch (res.status) {
                case 200:
                    M.toast({
                        html: "The request has been deleted."
                    });
                    // Remove Processed Entry from Table
                    $("[data-from=" + from + "][data-to=" + to + "]").parent().parent().fadeOut(function() {
                        $("[data-from=" + from + "][data-to=" + to + "]").parent().parent().remove();
                        // Check if Any Entries are Remaining
                        if ($("#requests tr").length === 0) {
                            // Display No Results Found Message
                            $("#requests").append("<tr id=\"none\" style=\"display: none;\"><td colspan=\"6\" class=\"center\"><em>No results found.</em></td></tr>");
                            $("#none").fadeIn();
                        }
                    });
                    break;
                case 400:
                    M.toast({
                        html: "An unknown error occured. Please try again later."
                    });
                    break;
                case 403:
                    M.toast({
                        html: "Your session has expired. Please log in again to continue."
                    });
                    break;
                case 500:
                    M.toast({
                        html: "The system could not contact the server. Please try again later."
                    });
                    break;
            }
        }
    });
});