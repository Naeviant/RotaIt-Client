function login() {
    var staffNumber = $("#staffnumber").val(),
        password = $("#password").val();

    if (staffNumber && password) {
        $.post("/login/", {
            staffNumber: staffNumber,
            password: password
        }, function(res) {
            switch (res.status) {
                case 200:
                    M.toast({
                        html: "Logging In..."
                    });
                    window.location = "/";
                    break;
                case 401:
                    M.toast({
                        html: "You are not authorised to use this system."
                    });
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
        M.toast({
            html: "Please enter a staff number and password."
        });
    }
}

$("#login").click(function() {
    login();
});

$(document).on("keypress", function(e) {
    if (e.which == 13) {
        login();
    }
});