// Handle Login Button
$("#login").click(function() {
    // Get Data from User Inputs
    var staffNumber = $("#staffnumber").val(),
        password = $("#password").val();

    // Check Parameters are Valid
    if (staffNumber && password) {
        // Send Login Data to Server
        $.post("/login/", {
            staffNumber: staffNumber,
            password: password
        }, function(res) {
            // Produce Result Message in Toast
            switch (res.status) {
                case 200:
                    M.toast({
                        html: "Logging In..."
                    });
                    // Send User to Root Page
                    window.location = "/";
                    break;
                case 404:
                    M.toast({
                        html: "Your staff number or password was incorrect."
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
        // Produce Error Message in Toast
        M.toast({
            html: "Please enter a staff number and password."
        });
    }
});

// Allow User to Press Enter Key Instead of Login Button
$(document).on("keypress", function(e) {
    if (e.which == 13) {
        $("#login").click();
    }
});