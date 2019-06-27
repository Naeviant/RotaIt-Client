// Unbind Events Later in Script
$(document).undelegate("#cancel-request", "click");
$(document).undelegate("#save-request", "click");

// Handle Cancel Button
$(document).delegate("#cancel-request", "click", function() {
    // Click Requests Button in Sidebar (Trigger Partial Change)
    $(".sidenav a[data-page='requests']").click();
});

// Handle Save Button
$(document).delegate("#save-request", "click", function() {
    // Generate List of Months and Get Data from User Inputs
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        from = Date.UTC(parseInt($("#from").val().split(" ")[3]), months.indexOf($("#from").val().split(" ")[2]), parseInt($("#from").val().split(" ")[1])),
        to = Date.UTC(parseInt($("#to").val().split(" ")[3]), months.indexOf($("#to").val().split(" ")[2]), parseInt($("#to").val().split(" ")[1])),
        comment = $("#comment").val();

    // Check Parameters are Valid
    if (from && !isNaN(from) && to && !isNaN(to) && from <= to) {
        // Send Request Data to Server
        $.post("/requests/", {
            from: from,
            to: to,
            comment: comment
        }, function(res) {
            // Produce Result Message in Toast
            switch (res.status) {
                case 200:
                    // Click Requests Button in Sidebar (Trigger Partial Change)
                    $(".sidenav a[data-page='requests']").click();
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
        });
    }
    else {
        M.toast({
            html: "Please fill out all fields with valid values."
        });
    }
});