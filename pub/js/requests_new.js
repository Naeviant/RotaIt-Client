$(document).undelegate("#cancel-request", "click");
$(document).undelegate("#save-request", "click");

$(document).delegate("#cancel-request", "click", function() {
    $(".sidenav a[data-page='requests']").click();
});

$(document).delegate("#save-request", "click", function() {
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        from = Date.UTC(parseInt($("#from").val().split(" ")[3]), months.indexOf($("#from").val().split(" ")[2]), parseInt($("#from").val().split(" ")[1])),
        to = Date.UTC(parseInt($("#to").val().split(" ")[3]), months.indexOf($("#to").val().split(" ")[2]), parseInt($("#to").val().split(" ")[1])),
        comment = $("#comment").val();

    if (from && !isNaN(from) && to && !isNaN(to) && from <= to) {
        $.post("/requests/", {
            from: from,
            to: to,
            comment: comment
        }, function(res) {
            switch (res.status) {
                case 200:
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